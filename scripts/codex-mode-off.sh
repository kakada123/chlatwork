#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_NAME="$(basename "${REPO_ROOT}")"
BACKUP_ROOT="${HOME}/.private-env-backups/${REPO_NAME}"
MANIFEST="${BACKUP_ROOT}/manifest.tsv"
DUMMY_MARKER="${BACKUP_ROOT}/dummy-env-local.active"

cd "${REPO_ROOT}"

if [[ -f "${DUMMY_MARKER}" ]]; then
  rm -f "${REPO_ROOT}/.env.local"
  rm -f "${DUMMY_MARKER}"
fi

if [[ -f "${MANIFEST}" ]]; then
  tmp_manifest="${MANIFEST}.remaining"
  : > "${tmp_manifest}"

  while IFS=$'\t' read -r backup_relative restore_relative; do
    [[ -n "${backup_relative:-}" && -n "${restore_relative:-}" ]] || continue

    backup_path="${BACKUP_ROOT}/${backup_relative}"
    restore_path="${REPO_ROOT}/${restore_relative}"

    if [[ -e "${backup_path}" || -L "${backup_path}" ]]; then
      if [[ -e "${restore_path}" || -L "${restore_path}" ]]; then
        printf '%s\t%s\n' "${backup_relative}" "${restore_relative}" >> "${tmp_manifest}"
        continue
      fi

      mkdir -p "$(dirname "${restore_path}")"
      mv "${backup_path}" "${restore_path}"
    fi
  done < "${MANIFEST}"

  mv "${tmp_manifest}" "${MANIFEST}"
fi

printf 'Codex safe mode is off. Backed-up env and secret files were restored when their original paths were available.\n'
