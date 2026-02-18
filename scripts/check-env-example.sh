#!/usr/bin/env bash
set -euo pipefail

ENV_EXAMPLE_FILES=()
while IFS= read -r file; do
  ENV_EXAMPLE_FILES+=("$file")
done < <(git ls-files | grep -E '(^|/)\.env\.example$' || true)

if [ "${#ENV_EXAMPLE_FILES[@]}" -eq 0 ]; then
  echo "No .env.example files found."
  exit 0
fi

SENSITIVE_KEYS=(
  "DATABASE_URL"
  "DIRECT_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "JWT_SECRET"
  "OTP_HASH_SECRET"
  "ADMIN_PASSWORD"
  "RESEND_API_KEY"
)

PLACEHOLDER_PATTERN='(replace|your-|<|example|xxxxx|change-me|changeme)'
URL_CREDENTIAL_PATTERN='://[^/"[:space:]]+:[^@"[:space:]]+@'
JWT_PATTERN='(^|[^A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}([^A-Za-z0-9_-]|$)'

FAILED=0

is_sensitive_key() {
  local key="$1"
  for candidate in "${SENSITIVE_KEYS[@]}"; do
    if [ "$candidate" = "$key" ]; then
      return 0
    fi
  done
  return 1
}

for file in "${ENV_EXAMPLE_FILES[@]}"; do
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ -z "${line//[[:space:]]/}" ]] || [[ "$line" =~ ^[[:space:]]*# ]]; then
      continue
    fi

    if [[ "$line" =~ ^[[:space:]]*([A-Z0-9_]+)[[:space:]]*=[[:space:]]*\"([^\"]*)\" ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
      if is_sensitive_key "$key"; then
        if ! [[ "$value" =~ $PLACEHOLDER_PATTERN ]]; then
          echo "Potential real secret in $file: $key should use a placeholder value."
          FAILED=1
        fi
      fi
    fi
  done < "$file"

  if matches=$(grep -En "$URL_CREDENTIAL_PATTERN" "$file" | grep -Ev '<[^>]+>'); then
    echo "Potential URL credentials found in $file:"
    echo "$matches"
    FAILED=1
  fi

  if matches=$(grep -En "$JWT_PATTERN" "$file"); then
    echo "Potential JWT-like token found in $file:"
    echo "$matches"
    FAILED=1
  fi
done

if [ "$FAILED" -ne 0 ]; then
  exit 1
fi

echo ".env.example validation passed."
