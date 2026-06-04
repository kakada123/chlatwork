#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_NAME="$(basename "${REPO_ROOT}")"
BACKUP_ROOT="${HOME}/.private-env-backups/${REPO_NAME}"
BACKUP_FILES_ROOT="${BACKUP_ROOT}/files"
MANIFEST="${BACKUP_ROOT}/manifest.tsv"
DUMMY_MARKER="${BACKUP_ROOT}/dummy-env-local.active"

mkdir -p "${BACKUP_FILES_ROOT}"
touch "${MANIFEST}"

cd "${REPO_ROOT}"

timestamp() {
  date +"%Y%m%d%H%M%S"
}

relative_path() {
  local path="$1"
  printf '%s\n' "${path#${REPO_ROOT}/}"
}

is_allowed_template() {
  local base
  base="$(basename "$1")"

  [[ "${base}" == ".env.example" ]]
}

is_dummy_env_local() {
  [[ -f "${DUMMY_MARKER}" && "$1" == "${REPO_ROOT}/.env.local" ]]
}

backup_file() {
  local source="$1"
  local relative target backup_relative

  [[ -e "${source}" || -L "${source}" ]] || return 0
  is_allowed_template "${source}" && return 0
  is_dummy_env_local "${source}" && return 0

  relative="$(relative_path "${source}")"
  target="${BACKUP_FILES_ROOT}/${relative}"
  backup_relative="files/${relative}"

  if [[ -e "${target}" || -L "${target}" ]]; then
    backup_relative="files-conflict/$(timestamp)/${relative}"
    target="${BACKUP_ROOT}/${backup_relative}"
  fi

  mkdir -p "$(dirname "${target}")"
  mv "${source}" "${target}"
  printf '%s\t%s\n' "${backup_relative}" "${relative}" >> "${MANIFEST}"
}

while IFS= read -r -d '' file_path; do
  backup_file "${file_path}"
done < <(
  find "${REPO_ROOT}" \
    -path "${REPO_ROOT}/.git" -prune -o \
    -path "${REPO_ROOT}/node_modules" -prune -o \
    -path "${REPO_ROOT}/.nuxt" -prune -o \
    -path "${REPO_ROOT}/.output" -prune -o \
    -path "${REPO_ROOT}/.vercel" -prune -o \
    -type f \( \
      -name ".env" -o \
      -name ".env.*" -o \
      -name "*.env" -o \
      -name "*.env.*" -o \
      -iname "*secret*" -o \
      -iname "*credential*" -o \
      -iname "*service-account*.json" -o \
      -iname "firebase*.json" -o \
      -name "*.pem" -o \
      -name "*.key" -o \
      -name "*.p12" -o \
      -name "*.pfx" \
    \) -print0
)

if [[ -d "${REPO_ROOT}/.vercel" ]]; then
  while IFS= read -r -d '' file_path; do
    backup_file "${file_path}"
  done < <(
    find "${REPO_ROOT}/.vercel" \
      -type f \( \
        -name ".env*.local" -o \
        -name "*.env*" \
      \) -print0
  )
fi

cat > "${REPO_ROOT}/.env.local" <<'ENVLOCAL'
# Dummy values for Codex-safe local work only.
NARAKEET_API_KEY=dummy_narakeet_api_key
KV_REST_API_URL=https://example.invalid/upstash
KV_REST_API_TOKEN=dummy_kv_rest_api_token
UPSTASH_REDIS_REST_URL=https://example.invalid/upstash
UPSTASH_REDIS_REST_TOKEN=dummy_upstash_redis_rest_token
ENVLOCAL

cat > "${REPO_ROOT}/.env.example" <<'ENVEXAMPLE'
# Dummy values only. Never put real secrets in this file.
NARAKEET_API_KEY=dummy_narakeet_api_key
KV_REST_API_URL=https://example.invalid/upstash
KV_REST_API_TOKEN=dummy_kv_rest_api_token
UPSTASH_REDIS_REST_URL=https://example.invalid/upstash
UPSTASH_REDIS_REST_TOKEN=dummy_upstash_redis_rest_token
ENVEXAMPLE

touch "${DUMMY_MARKER}"

printf 'Codex safe mode is on. Real env and secret files were moved to the private backup folder when present.\n'
