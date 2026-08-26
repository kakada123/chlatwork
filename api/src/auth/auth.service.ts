import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, type User } from '@prisma/client';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { PrismaService } from '../prisma/prisma.service';
import type { TelegramCodeAuthDto } from './dto/telegram-code-auth.dto';
import type { AccessTokenPayload } from './types';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const TELEGRAM_JWKS = createRemoteJWKSet(new URL('https://oauth.telegram.org/.well-known/jwks.json'));
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_ROTATION_GRACE_MS = 10_000;

interface ProviderProfile {
  provider: AuthProvider;
  providerUserId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async google(token: string) {
    try {
      const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      });
      if (!payload.sub || payload.email_verified !== true) {
        throw new UnauthorizedException('Google account email is not verified');
      }
      return await this.authenticateProvider({
        provider: AuthProvider.GOOGLE,
        providerUserId: payload.sub,
        email: payload.email_verified === true ? this.stringClaim(payload, 'email') : null,
        name: this.stringClaim(payload, 'name'),
        avatarUrl: this.stringClaim(payload, 'picture'),
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid Google login token');
    }
  }

  async telegram(idToken: string) {
    return this.authenticateTelegramToken(idToken);
  }

  async telegramCode(dto: TelegramCodeAuthDto) {
    const expectedRedirect = `${this.config.getOrThrow<string>('FRONTEND_ORIGIN').replace(/\/$/, '')}/api/auth/telegram/callback`;
    if (dto.redirectUri !== expectedRedirect) {
      throw new UnauthorizedException('Invalid Telegram redirect URI');
    }

    const clientId = this.config.getOrThrow<string>('TELEGRAM_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('TELEGRAM_CLIENT_SECRET');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: dto.code,
      redirect_uri: dto.redirectUri,
      code_verifier: dto.codeVerifier,
    });
    const response = await fetch('https://oauth.telegram.org/token', {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!response?.ok) throw new UnauthorizedException('Invalid Telegram authorization code');

    const tokens = (await response.json()) as { id_token?: string };
    if (!tokens.id_token) throw new UnauthorizedException('Telegram did not return an ID token');
    return this.authenticateTelegramToken(tokens.id_token);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const now = new Date();
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    const rotationGraceStartedAt = new Date(now.getTime() - REFRESH_TOKEN_ROTATION_GRACE_MS);
    if (
      !stored
      || stored.expiresAt <= now
      || !stored.user.isActive
      || (stored.revokedAt && stored.revokedAt < rotationGraceStartedAt)
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!stored.revokedAt) {
      // A short overlap lets parallel browser requests finish the same rotation without ending the session.
      await this.prisma.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: now },
      });
    }

    return this.issueTokens(stored.user);
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      // Deletion distinguishes an explicit logout from rotation, which has a brief concurrency grace period.
      await this.prisma.refreshToken.deleteMany({
        where: { tokenHash: this.hashToken(refreshToken) },
      });
    }
    return { message: 'Logged out successfully' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) throw new UnauthorizedException();
    return this.safeUser(user);
  }

  private async authenticateTelegramToken(idToken: string) {
    try {
      const { payload } = await jwtVerify(idToken, TELEGRAM_JWKS, {
        issuer: 'https://oauth.telegram.org',
        audience: this.config.getOrThrow<string>('TELEGRAM_CLIENT_ID'),
      });
      if (!payload.sub) throw new UnauthorizedException('Invalid Telegram login token');
      return await this.authenticateProvider({
        provider: AuthProvider.TELEGRAM,
        providerUserId: payload.sub,
        email: payload.email_verified === true ? this.stringClaim(payload, 'email') : null,
        name: this.stringClaim(payload, 'name') ?? this.stringClaim(payload, 'preferred_username'),
        avatarUrl: this.stringClaim(payload, 'picture'),
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid Telegram login token');
    }
  }

  private async authenticateProvider(profile: ProviderProfile) {
    const account = await this.prisma.socialAccount.findUnique({
      where: { provider_providerUserId: { provider: profile.provider, providerUserId: profile.providerUserId } },
      include: { user: true },
    });
    let user = account?.user;

    if (!user) {
      user = await this.prisma.$transaction(async (tx) => {
        // Provider-verified email is the only safe automatic cross-provider linking key.
        const existing = profile.email ? await tx.user.findUnique({ where: { email: profile.email } }) : null;
        const owner = existing ?? await tx.user.create({
          data: { email: profile.email, name: profile.name, avatarUrl: profile.avatarUrl },
        });
        await tx.socialAccount.create({
          data: {
            provider: profile.provider,
            providerUserId: profile.providerUserId,
            providerEmail: profile.email,
            userId: owner.id,
          },
        });
        return owner;
      });
    }

    if (!user.isActive) throw new UnauthorizedException('User is inactive');
    return this.issueTokens(user);
  }

  private async issueTokens(user: User) {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role, type: 'access' };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
      },
    });
    return { user: this.safeUser(user), accessToken, refreshToken };
  }

  private safeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private stringClaim(payload: JWTPayload, key: string) {
    const value = payload[key];
    return typeof value === 'string' && value.length <= 2048 ? value : null;
  }
}
