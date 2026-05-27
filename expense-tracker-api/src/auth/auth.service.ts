import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { Repository } from "typeorm";
import { TelegramLoginDto } from "./dto/telegram-login.dto";
import { User } from "./entities/user.entity";

export type ExpenseUserProfile = {
  id: string;
  email: string | null;
  name: string | null;
  label: string;
  telegramUsername: string | null;
  telegramPhotoUrl: string | null;
};

export type ExpenseAuthPayload = {
  sub: string;
  identity: string;
  email?: string;
  telegramUserId?: string;
  iat: number;
  exp: number;
};

export type ExpenseSessionResponse = {
  accessToken: string;
  expiresAt: string;
  user: ExpenseUserProfile;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async loginWithTelegram(dto: TelegramLoginDto) {
    this.assertValidTelegramLogin(dto);

    const telegramUserId = String(dto.id);
    const name = [dto.first_name, dto.last_name].filter(Boolean).join(" ").trim();
    const existingUser = await this.users.findOne({ where: { telegramUserId } });
    const user =
      existingUser ??
      this.users.create({
        id: randomBytesId(),
        telegramUserId,
        email: null,
        passwordHash: null,
      });

    user.name = name || dto.username || `Telegram ${telegramUserId}`;
    user.telegramUsername = dto.username?.trim() || null;
    user.telegramPhotoUrl = dto.photo_url?.trim() || null;
    user.status = "ACTIVE";

    await this.users.save(user);

    return this.issueSession(user);
  }

  async getProfile(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Login is required.");
    }

    return this.toProfile(user);
  }

  verifyAccessToken(token: string) {
    const [payloadPart, signature] = token.split(".");

    if (!payloadPart || !signature) {
      throw new UnauthorizedException("Login is required.");
    }

    const expectedSignature = this.signTokenBody(payloadPart);
    if (!this.safeEquals(signature, expectedSignature)) {
      throw new UnauthorizedException("Login is required.");
    }

    const payload = this.parsePayload(payloadPart);
    const now = Math.floor(Date.now() / 1000);

    // Email/password sessions are no longer accepted; every active save session must come from Telegram login.
    if (!payload.telegramUserId) {
      throw new UnauthorizedException("Telegram login is required.");
    }

    if (payload.exp <= now) {
      throw new UnauthorizedException("Login expired. Please login again.");
    }

    return payload;
  }

  buildSessionCookie(token: string, expiresAt: string) {
    const expires = new Date(expiresAt);
    const maxAge = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000));
    const parts = [
      `${this.getCookieName()}=${encodeURIComponent(token)}`,
      "HttpOnly",
      `Path=${this.getCookiePath()}`,
      `Max-Age=${maxAge}`,
      `Expires=${expires.toUTCString()}`,
      `SameSite=${this.getCookieSameSite()}`,
    ];

    const domain = this.config.get<string>("AUTH_COOKIE_DOMAIN")?.trim();
    if (domain) {
      parts.push(`Domain=${domain}`);
    }

    if (this.shouldUseSecureCookie()) {
      parts.push("Secure");
    }

    return parts.join("; ");
  }

  buildClearSessionCookie() {
    const expired = new Date(0);
    const parts = [
      `${this.getCookieName()}=`,
      "HttpOnly",
      `Path=${this.getCookiePath()}`,
      "Max-Age=0",
      `Expires=${expired.toUTCString()}`,
      `SameSite=${this.getCookieSameSite()}`,
    ];

    const domain = this.config.get<string>("AUTH_COOKIE_DOMAIN")?.trim();
    if (domain) {
      parts.push(`Domain=${domain}`);
    }

    if (this.shouldUseSecureCookie()) {
      parts.push("Secure");
    }

    return parts.join("; ");
  }

  getCookieName() {
    return this.config.get<string>("AUTH_COOKIE_NAME")?.trim() || "chlatwork_expense_auth";
  }

  private issueSession(user: User): ExpenseSessionResponse {
    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = this.getTokenTtlSeconds();
    const identity =
      user.email ?? (user.telegramUserId ? `telegram:${user.telegramUserId}` : user.id);
    const payload: ExpenseAuthPayload = {
      sub: user.id,
      identity,
      ...(user.email ? { email: user.email } : {}),
      ...(user.telegramUserId ? { telegramUserId: user.telegramUserId } : {}),
      iat: now,
      exp: now + ttlSeconds,
    };

    return {
      accessToken: this.signPayload(payload),
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      user: this.toProfile(user),
    };
  }

  private toProfile(user: User): ExpenseUserProfile {
    const telegramLabel = user.telegramUsername
      ? `@${user.telegramUsername}`
      : user.name || "Telegram";

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      label: telegramLabel,
      telegramUsername: user.telegramUsername,
      telegramPhotoUrl: user.telegramPhotoUrl,
    };
  }

  private assertValidTelegramLogin(dto: TelegramLoginDto) {
    const botToken = this.getRequiredConfig("TELEGRAM_BOT_TOKEN");
    const maxAgeSeconds = this.getTelegramAuthMaxAgeSeconds();
    const now = Math.floor(Date.now() / 1000);

    if (now - dto.auth_date > maxAgeSeconds) {
      throw new UnauthorizedException("Telegram login expired. Please try again.");
    }

    const telegramFields: Record<string, string> = {
      auth_date: String(dto.auth_date),
      first_name: dto.first_name,
      id: String(dto.id),
    };

    if (dto.last_name) {
      telegramFields.last_name = dto.last_name;
    }

    if (dto.username) {
      telegramFields.username = dto.username;
    }

    if (dto.photo_url) {
      telegramFields.photo_url = dto.photo_url;
    }

    // Telegram signs this exact sorted field list, so rebuilding it prevents forged browser payloads.
    const dataCheckString = Object.keys(telegramFields)
      .sort()
      .map((key) => `${key}=${telegramFields[key]}`)
      .join("\n");
    const secretKey = createHash("sha256").update(botToken).digest();
    const expectedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (!this.safeEquals(dto.hash, expectedHash)) {
      throw new UnauthorizedException("Invalid Telegram login.");
    }
  }

  private signPayload(payload: ExpenseAuthPayload) {
    const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = this.signTokenBody(payloadPart);

    return `${payloadPart}.${signature}`;
  }

  private signTokenBody(payloadPart: string) {
    const secret = this.getRequiredConfig("AUTH_TOKEN_SECRET");

    return createHmac("sha256", secret).update(payloadPart).digest("base64url");
  }

  private parsePayload(payloadPart: string): ExpenseAuthPayload {
    try {
      const parsed = JSON.parse(
        Buffer.from(payloadPart, "base64url").toString("utf8"),
      ) as Partial<ExpenseAuthPayload>;

      if (
        typeof parsed.sub !== "string" ||
        typeof parsed.identity !== "string" ||
        typeof parsed.iat !== "number" ||
        typeof parsed.exp !== "number"
      ) {
        throw new Error("Invalid auth payload.");
      }

      return {
        sub: parsed.sub,
        identity: parsed.identity,
        ...(typeof parsed.email === "string" ? { email: parsed.email } : {}),
        ...(typeof parsed.telegramUserId === "string"
          ? { telegramUserId: parsed.telegramUserId }
          : {}),
        iat: parsed.iat,
        exp: parsed.exp,
      };
    } catch {
      throw new UnauthorizedException("Login is required.");
    }
  }

  private getRequiredConfig(key: string) {
    const value = this.config.get<string>(key)?.trim();

    if (!value) {
      throw new UnauthorizedException(`${key} is not configured.`);
    }

    return value;
  }

  private getTokenTtlSeconds() {
    const configured = Number(this.config.get<string>("AUTH_TOKEN_TTL_SECONDS"));

    if (Number.isFinite(configured) && configured > 0) {
      return Math.floor(configured);
    }

    return 60 * 60 * 24;
  }

  private getTelegramAuthMaxAgeSeconds() {
    const configured = Number(this.config.get<string>("TELEGRAM_AUTH_MAX_AGE_SECONDS"));

    if (Number.isFinite(configured) && configured > 0) {
      return Math.floor(configured);
    }

    return 60 * 60 * 24;
  }

  private getCookiePath() {
    return this.config.get<string>("AUTH_COOKIE_PATH")?.trim() || "/api";
  }

  private getCookieSameSite() {
    const configured = this.config
      .get<string>("AUTH_COOKIE_SAME_SITE")
      ?.trim()
      .toLowerCase();

    if (configured === "strict") return "Strict";
    if (configured === "none") return "None";

    return "Lax";
  }

  private shouldUseSecureCookie() {
    const configured = this.config.get<string>("AUTH_COOKIE_SECURE")?.trim().toLowerCase();

    if (this.getCookieSameSite() === "None") {
      return true;
    }

    if (configured === "true") return true;
    if (configured === "false") return false;

    return this.config.get<string>("NODE_ENV") === "production";
  }

  private safeEquals(left: string, right: string) {
    const leftHash = createHash("sha256").update(left).digest();
    const rightHash = createHash("sha256").update(right).digest();

    return timingSafeEqual(leftHash, rightHash);
  }
}

function randomBytesId() {
  return cryptoRandomUuid();
}

function cryptoRandomUuid() {
  return randomBytes(16).toString("hex").replace(
    /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
    "$1-$2-$3-$4-$5",
  );
}
