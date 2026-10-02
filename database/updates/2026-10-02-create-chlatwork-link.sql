-- Review and run manually before deploying ChlatWork Link. No existing data is changed.
BEGIN;

CREATE TABLE link_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(40) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  headline VARCHAR(160) NOT NULL DEFAULT '',
  bio VARCHAR(320) NOT NULL DEFAULT '',
  avatar_url VARCHAR(2048), background_url VARCHAR(2048),
  theme VARCHAR(20) NOT NULL DEFAULT 'minimal',
  background_mode VARCHAR(20) NOT NULL DEFAULT 'preset',
  background_color VARCHAR(7) NOT NULL DEFAULT '#f8fafc',
  gradient_color VARCHAR(7) NOT NULL DEFAULT '#e9d5ff',
  color_mode VARCHAR(10) NOT NULL DEFAULT 'preset',
  font VARCHAR(10) NOT NULL DEFAULT 'sans',
  radius VARCHAR(10) NOT NULL DEFAULT 'rounded',
  button_style VARCHAR(10) NOT NULL DEFAULT 'solid',
  show_branding BOOLEAN NOT NULL DEFAULT TRUE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  seo_title VARCHAR(100) NOT NULL DEFAULT '',
  seo_description VARCHAR(200) NOT NULL DEFAULT '',
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT link_profiles_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{1,38}[a-z0-9]$')
);

CREATE TABLE profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES link_profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'custom',
  title VARCHAR(80) NOT NULL, url VARCHAR(2048) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  click_count INTEGER NOT NULL DEFAULT 0 CHECK (click_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX profile_links_profile_id_position_idx ON profile_links(profile_id, position);

-- Personal photos are re-encoded to WebP before storage, without original filenames or EXIF.
CREATE TABLE profile_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES link_profiles(id) ON DELETE CASCADE,
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('avatar', 'background')),
  data BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(profile_id, kind)
);
COMMIT;
