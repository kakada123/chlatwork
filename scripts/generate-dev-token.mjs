#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { SignJWT } = require('../api/node_modules/jose');

const secret = process.env.JWT_ACCESS_SECRET;
const userId = process.argv[2] || 'test-user-id';

if (!secret) {
  console.error('Error: JWT_ACCESS_SECRET environment variable is required.');
  console.error('Usage: JWT_ACCESS_SECRET="<your-secret>" node scripts/generate-dev-token.mjs [userId]');
  process.exit(1);
}

if (secret.length < 32) {
  console.error('Error: JWT_ACCESS_SECRET must be at least 32 characters long.');
  process.exit(1);
}

const token = await new SignJWT({
  sub: userId,
  role: 'USER',
  type: 'access',
})
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setIssuer('chlatwork-auth')
  .setAudience('chlatwork-web')
  .setExpirationTime('7d')
  .sign(new TextEncoder().encode(secret));

console.log(`✅ Generated ChlatWork Access Token for user: ${userId} (Valid for 7 days)`);
console.log('\nToken:');
console.log(token);
console.log('\nPaste this into Chrome Extension Options -> "ChlatWork access token" field.');
