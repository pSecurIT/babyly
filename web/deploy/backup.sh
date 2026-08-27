#!/usr/bin/env bash
set -Eeuo pipefail

: "${BACKUP_S3_ENDPOINT:?Set BACKUP_S3_ENDPOINT}"
: "${BACKUP_S3_BUCKET:?Set BACKUP_S3_BUCKET}"
: "${BACKUP_S3_REGION:?Set BACKUP_S3_REGION}"
: "${BACKUP_S3_ACCESS_KEY:?Set BACKUP_S3_ACCESS_KEY}"
: "${BACKUP_S3_SECRET_KEY:?Set BACKUP_S3_SECRET_KEY}"
: "${BACKUP_ENCRYPTION_PASSWORD_FILE:?Set BACKUP_ENCRYPTION_PASSWORD_FILE}"

if [[ ! -r "$BACKUP_ENCRYPTION_PASSWORD_FILE" ]]; then
  echo "Backup encryption password file is missing or unreadable." >&2
  exit 1
fi

backup_id="$(date -u +%Y%m%dT%H%M%SZ)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

archive="$tmp_dir/babyly-${backup_id}.sql.gz.enc"

docker compose exec -T db \
  pg_dump --no-owner --no-privileges --clean --if-exists \
  | gzip -9 \
  | openssl enc -aes-256-cbc -salt -pbkdf2 \
      -pass "file:${BACKUP_ENCRYPTION_PASSWORD_FILE}" \
      -out "$archive"

AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY" \
AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_KEY" \
aws s3 cp "$archive" "s3://${BACKUP_S3_BUCKET}/database/${backup_id}.sql.gz.enc" \
  --endpoint-url "$BACKUP_S3_ENDPOINT" \
  --region "$BACKUP_S3_REGION" \
  --only-show-errors

echo "Uploaded encrypted backup ${backup_id}"
