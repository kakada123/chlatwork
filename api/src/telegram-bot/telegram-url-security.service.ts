import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { readWebRiskConfig, type WebRiskConfig } from '../config/web-risk';
import {
  URL_THREAT_TYPES,
  type SecurityScanInput,
  type UrlScanResult,
  type UrlThreatType,
} from './security.types';

@Injectable()
export class TelegramUrlSecurityService {
  private readonly cache = new Map<
    string,
    { result: UrlScanResult; expires: number }
  >();
  private readonly pending = new Map<string, Promise<UrlScanResult>>();
  private active = 0;
  private windowStarted = Date.now();
  private requests = 0;

  constructor(private readonly config: ConfigService) {}

  async scan(links: SecurityScanInput['links']): Promise<UrlScanResult> {
    let settings;
    try {
      settings = readWebRiskConfig((key) => this.config.get(key));
    } catch {
      return { status: 'unavailable', reason: 'invalid_config' };
    }
    if (!settings) return { status: 'disabled' };
    const targets = [
      ...new Set(links.map((link) => this.publicUrl(link.target))),
    ];
    let incomplete: UrlScanResult | undefined = targets.includes(null)
      ? { status: 'unsupported', reason: 'invalid_or_private_url' }
      : undefined;
    const valid = targets.filter((target): target is string => target !== null);
    if (valid.length > settings.maxLinks)
      incomplete = { status: 'unsupported', reason: 'too_many_links' };
    for (const target of valid.slice(0, settings.maxLinks)) {
      const result = await this.lookup(target, settings);
      if (result.status === 'unsafe') return result;
      if (result.status !== 'not_listed') incomplete ??= result;
    }
    // An empty reputation response is not proof of safety; AI checks still run afterward.
    return (
      incomplete ??
      (valid.length
        ? { status: 'not_listed' }
        : { status: 'unsupported', reason: 'invalid_or_private_url' })
    );
  }

  private publicUrl(target: string): string | null {
    if (!target || target.length > 4096 || /[\u0000-\u0020\u007f]/.test(target))
      return null;
    try {
      const url = new URL(
        /^[a-z][a-z\d+.-]*:/i.test(target) ? target : `https://${target}`,
      );
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password
      )
        return null;
      const host = url.hostname.replace(/\.$/, '');
      // Do not disclose internal hosts, credentials, or common signed/authenticated URLs to Google.
      if (
        !host.includes('.') ||
        /(?:^|\.)(?:localhost|local|internal|invalid|test|onion)$/.test(host) ||
        host.startsWith('[')
      )
        return null;
      if (isIP(host) === 4) {
        const [a, b] = host.split('.').map(Number);
        if (
          a === 0 ||
          a === 10 ||
          a === 127 ||
          a! >= 224 ||
          (a === 100 && b! >= 64 && b! <= 127) ||
          (a === 169 && b === 254) ||
          (a === 172 && b! >= 16 && b! <= 31) ||
          (a === 192 && [0, 168].includes(b!)) ||
          (a === 198 && [18, 19].includes(b!))
        )
          return null;
      }
      for (const key of url.searchParams.keys()) {
        if (
          /(?:token|password|passwd|secret|credential|signature|api[_-]?key|authorization|^(?:auth|sig|key|code|jwt|session(?:id)?)$)/i.test(
            key,
          )
        )
          return null;
      }
      url.hash = '';
      return url.toString();
    } catch {
      return null;
    }
  }

  private lookup(
    target: string,
    settings: WebRiskConfig,
  ): Promise<UrlScanResult> {
    // Cache only target hashes and verdicts; never retain raw URLs between scans.
    const key = createHash('sha256').update(target).digest('hex');
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now())
      return Promise.resolve(cached.result);
    this.cache.delete(key);
    const pending = this.pending.get(key);
    if (pending) return pending;
    if (this.active >= settings.maxConcurrent)
      return Promise.resolve({ status: 'busy', reason: 'concurrency_limit' });
    if (Date.now() - this.windowStarted >= 60000) {
      this.windowStarted = Date.now();
      this.requests = 0;
    }
    if (this.requests >= settings.maxRequestsPerMinute)
      return Promise.resolve({ status: 'busy', reason: 'rate_limited' });
    this.requests++;
    this.active++;
    const work = this.request(target, settings, key).finally(() => {
      this.active--;
      this.pending.delete(key);
    });
    this.pending.set(key, work);
    return work;
  }

  private async request(
    target: string,
    settings: WebRiskConfig,
    key: string,
  ): Promise<UrlScanResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
    let response: Response | undefined;
    try {
      // Only query reputation data at a fixed endpoint; never visit or follow the submitted URL.
      const endpoint = new URL('https://webrisk.googleapis.com/v1/uris:search');
      endpoint.searchParams.set('uri', target);
      for (const type of URL_THREAT_TYPES)
        endpoint.searchParams.append('threatTypes', type);
      response = await fetch(endpoint.toString(), {
        headers: {
          'X-Goog-Api-Key': settings.apiKey,
          Accept: 'application/json',
        },
        redirect: 'error',
        signal: controller.signal,
      });
      if (!response.ok || !response.body)
        return { status: 'unavailable', reason: 'provider_unavailable' };
      if (Number(response.headers.get('content-length')) > 65536)
        return { status: 'unavailable', reason: 'invalid_response' };
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 65536)
            return { status: 'unavailable', reason: 'invalid_response' };
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || typeof body !== 'object' || Array.isArray(body))
        return { status: 'unavailable', reason: 'invalid_response' };
      const object = body as Record<string, unknown>;
      let result: UrlScanResult;
      let expires = Date.now() + 30000;
      if (!Object.keys(object).length) result = { status: 'not_listed' };
      else {
        const threat = object.threat as
          { threatTypes?: unknown; expireTime?: unknown } | undefined;
        const types = threat?.threatTypes;
        const expiry =
          typeof threat?.expireTime === 'string'
            ? Date.parse(threat.expireTime)
            : NaN;
        if (
          !Array.isArray(types) ||
          !types.length ||
          !types.every((type) => URL_THREAT_TYPES.includes(type)) ||
          !Number.isFinite(expiry) ||
          expiry <= Date.now()
        )
          return { status: 'unavailable', reason: 'invalid_response' };
        result = {
          status: 'unsafe',
          threatTypes: [...new Set(types)] as UrlThreatType[],
        };
        expires = Math.min(expiry, Date.now() + 10 * 60000);
      }
      for (const [entry, cached] of this.cache)
        if (cached.expires <= Date.now()) this.cache.delete(entry);
      if (this.cache.size >= 512)
        this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, { result, expires });
      return result;
    } catch {
      return { status: 'unavailable', reason: 'provider_unavailable' };
    } finally {
      clearTimeout(timeout);
      // Abort/cancel oversized and failed responses so connections and private inputs are released.
      controller.abort();
      await response?.body?.cancel().catch(() => undefined);
    }
  }
}
