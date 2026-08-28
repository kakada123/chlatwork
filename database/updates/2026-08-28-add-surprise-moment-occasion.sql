-- Additive only: existing Moments and occasion values remain unchanged.
ALTER TYPE "MomentOccasion" ADD VALUE IF NOT EXISTS 'SURPRISE';
