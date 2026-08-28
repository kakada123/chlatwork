import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, type User } from '@prisma/client';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { PrismaService } from '../prisma/prisma.service';
import type { TelegramCodeAuthDto } from './dto/telegram-code-auth.dto';
import type { GoogleLinkCodeDto } from './dto/google-link-code.dto';
import type { AccessTokenPayload, GoogleLinkTicketPayload } from './types';
import { verifyTelegramMiniAppData } from './telegram-mini-app';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const TELEGRAM_JWKS = createRemoteJWKSet(new URL('https://oauth.telegram.org/.well-known/jwks.json'));
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_ROTATION_GRACE_MS = 10_000;
const GOOGLE_LINK_TICKET_AUDIENCE = 'chlatwork-google-link';

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
    return this.authenticateProvider(await this.verifyGoogleToken(token));
  }

  async telegramMiniApp(initData: string) {
    const profile = this.verifyTelegramInitData(initData);
    return this.authenticateProvider(profile);
  }

  async createGoogleLinkTicket(userId: string) {
    const payload: GoogleLinkTicketPayload = { sub: userId, type: 'google-link' };
    const ticket = await this.jwt.signAsync(payload, {
      expiresIn: '5m',
      audience: GOOGLE_LINK_TICKET_AUDIENCE,
    });
    return { ticket };
  }

  async googleLinkCode(dto: GoogleLinkCodeDto) {
    const expectedRedirect = `${this.config.getOrThrow<string>('FRONTEND_ORIGIN').replace(/\/$/, '')}/api/auth/google/callback`;
    if (dto.redirectUri !== expectedRedirect) {
      throw new UnauthorizedException('Invalid Google redirect URI');
    }

    let ticket: GoogleLinkTicketPayload;
    try {
      ticket = await this.jwt.verifyAsync<GoogleLinkTicketPayload>(dto.ticket, {
        issuer: 'chlatwork-auth',
        audience: GOOGLE_LINK_TICKET_AUDIENCE,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired Google link request');
    }
    if (ticket.type !== 'google-link' || !ticket.sub) {
      throw new UnauthorizedException('Invalid Google link request');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
        code: dto.code,
        code_verifier: dto.codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: dto.redirectUri,
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!response?.ok) throw new UnauthorizedException('Invalid Google authorization code');

    const tokens = (await response.json()) as { id_token?: string };
    if (!tokens.id_token) throw new UnauthorizedException('Google did not return an ID token');
    const profile = await this.verifyGoogleToken(tokens.id_token);
    return { user: await this.linkProvider(ticket.sub, profile) };
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
    return this.safeUserWithProviders(user);
  }

  private verifyTelegramInitData(initData: string): ProviderProfile {
    try {
      const profile = verifyTelegramMiniAppData(
        initData,
        this.config.getOrThrow<string>('TELEGRAM_BOT_TOKEN'),
      );
      return { provider: AuthProvider.TELEGRAM, email: null, ...profile };
    } catch {
      throw new UnauthorizedException('Invalid Telegram Mini App data');
    }
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

  private async verifyGoogleToken(token: string): Promise<ProviderProfile> {
    try {
      const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      });
      if (!payload.sub || payload.email_verified !== true) {
        throw new UnauthorizedException('Google account email is not verified');
      }
      return {
        provider: AuthProvider.GOOGLE,
        providerUserId: payload.sub,
        email: this.stringClaim(payload, 'email'),
        name: this.stringClaim(payload, 'name'),
        avatarUrl: this.stringClaim(payload, 'picture'),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid Google login token');
    }
  }

  private async linkProvider(userId: string, profile: ProviderProfile) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) throw new UnauthorizedException('User is inactive');
    const existingAccount = await this.prisma.socialAccount.findUnique({
      where: { provider_providerUserId: { provider: profile.provider, providerUserId: profile.providerUserId } },
    });
    if (existingAccount && existingAccount.userId !== userId) {
      throw new ConflictException('This Google account is already linked to another user');
    }
    const emailOwner = profile.email
      ? await this.prisma.user.findUnique({ where: { email: profile.email } })
      : null;
    if (emailOwner && emailOwner.id !== userId) {
      throw new ConflictException('This Google email belongs to another ChlatWork account');
    }

    await this.prisma.$transaction(async (tx) => {
      if (!existingAccount) {
        await tx.socialAccount.create({
          data: {
            provider: profile.provider,
            providerUserId: profile.providerUserId,
            providerEmail: profile.email,
            userId,
          },
        });
      }
      await tx.user.update({
        where: { id: userId },
        data: {
          email: user.email ?? profile.email,
          name: user.name ?? profile.name,
          avatarUrl: user.avatarUrl ?? profile.avatarUrl,
        },
      });
    });
    const updated = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.safeUserWithProviders(updated);
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
    return { user: await this.safeUserWithProviders(user), accessToken, refreshToken };
  }

  private async safeUserWithProviders(user: User) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { userId: user.id },
      select: { provider: true },
    });
    return { ...this.safeUser(user), providers: accounts.map((account) => account.provider) };
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
