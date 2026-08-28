import type { UserRole } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  type: 'access';
}

export interface GoogleLinkTicketPayload {
  sub: string;
  type: 'google-link';
}

export interface CurrentUser {
  id: string;
  role: UserRole;
}
