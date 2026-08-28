-- Additive only: existing Moments and theme values remain unchanged.
ALTER TYPE "MomentTheme" ADD VALUE IF NOT EXISTS 'CELEBRATION';
ALTER TYPE "MomentTheme" ADD VALUE IF NOT EXISTS 'SUNSET';
ALTER TYPE "MomentTheme" ADD VALUE IF NOT EXISTS 'BOTANICAL';
ALTER TYPE "MomentTheme" ADD VALUE IF NOT EXISTS 'OCEAN';
