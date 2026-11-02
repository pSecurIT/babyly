#!/usr/bin/env bash
# Post-deploy smoke test: scripts/smoke-test.sh <base-url> <expected-git-sha>
# Runs every check and exits non-zero if any failed.
set -uo pipefail

BASE="${1:?usage: smoke-test.sh <base-url> <expected-sha>}"
BASE="${BASE%/}"
EXPECTED_SHA="${2:?usage: smoke-test.sh <base-url> <expected-sha>}"
HEALTH_WAIT_SECONDS="${HEALTH_WAIT_SECONDS:-150}"

failures=0
pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; failures=$((failures + 1)); }

CURL=(curl --silent --show-error --max-time 15)

# Prints "<status>|<location>" for one request without following redirects.
probe() {
  local headers
  headers=$("${CURL[@]}" --output /dev/null --dump-header - "$1" 2>/dev/null || true)
  local code location
  code=$(printf '%s' "$headers" | head -n 1 | awk '{print $2}')
  location=$(printf '%s' "$headers" | tr -d '\r' | awk 'tolower($1) == "location:" {print $2}')
  printf '%s|%s' "${code:-000}" "$location"
}

# 1. Health: app is up, database reachable, and it is the build we just deployed.
deadline=$((SECONDS + HEALTH_WAIT_SECONDS))
health=""
while :; do
  if health=$("${CURL[@]}" --fail "$BASE/api/health" 2>/dev/null); then
    break
  fi
  health=""
  if [ "$SECONDS" -ge "$deadline" ]; then
    break
  fi
  sleep 5
done

if printf '%s' "$health" | grep -Fq '"status":"ok"'; then
  pass "health endpoint reports ok (app and database reachable)"
else
  fail "health endpoint not ok within ${HEALTH_WAIT_SECONDS}s (got: ${health:-no response})"
fi

if printf '%s' "$health" | grep -Fq "\"sha\":\"$EXPECTED_SHA\""; then
  pass "running build matches deployed commit ${EXPECTED_SHA:0:12}"
else
  fail "running build does not match ${EXPECTED_SHA:0:12} (got: ${health:-no response})"
fi

# 2. Public pages render.
for path in / /privacy /admin/login; do
  response=$("${CURL[@]}" --write-out $'\n%{http_code}' "$BASE$path" 2>/dev/null || true)
  code="${response##*$'\n'}"
  body="${response%$'\n'*}"
  if [ "$code" = "200" ] && printf '%s' "$body" | grep -qi '<html'; then
    pass "GET $path returns 200 with HTML"
  else
    fail "GET $path expected 200 with HTML, got HTTP ${code:-000}"
  fi
done

# 3. Admin pages stay behind the login, including the e-mail pages.
for path in /admin /admin/voorspellingen /admin/adressen /admin/email /admin/email/sjablonen /admin/email/nieuw; do
  result=$(probe "$BASE$path")
  code="${result%%|*}"
  location="${result#*|}"
  if [[ "$code" =~ ^30[1-8]$ ]] && [[ "$location" == *"/admin/login"* ]]; then
    pass "GET $path redirects to admin login when not signed in"
  else
    fail "GET $path expected redirect to /admin/login, got HTTP $code (location: ${location:-none})"
  fi
done

for path in /api/admin/export /api/admin/export/predictions /api/admin/export/addresses; do
  result=$(probe "$BASE$path")
  code="${result%%|*}"
  if [[ "$code" =~ ^(401|403)$ ]]; then
    pass "GET $path rejects unauthenticated access (HTTP $code)"
  else
    fail "GET $path expected 401/403, got HTTP $code"
  fi
done

# 4. Security headers on the home page.
headers=$("${CURL[@]}" --output /dev/null --dump-header - "$BASE/" 2>/dev/null | tr -d '\r' | tr 'A-Z' 'a-z' || true)
required_headers=(content-security-policy x-content-type-options referrer-policy)
if [[ "$BASE" == https://* ]]; then
  required_headers+=(strict-transport-security)
fi
for header in "${required_headers[@]}"; do
  if printf '%s' "$headers" | grep -q "^$header:"; then
    pass "response header $header present"
  else
    fail "response header $header missing"
  fi
done

# 5. HTTPS-specific: HTTP redirects to HTTPS and the certificate is not about to expire.
if [[ "$BASE" == https://* ]]; then
  host_port="${BASE#https://}"
  host_port="${host_port%%/*}"
  host="${host_port%%:*}"
  port="443"
  if [[ "$host_port" == *:* ]]; then
    port="${host_port##*:}"
  fi

  result=$(probe "http://${host}/")
  code="${result%%|*}"
  location="${result#*|}"
  if [[ "$code" =~ ^30[1-8]$ ]] && [[ "$location" == https://* ]]; then
    pass "http://$host redirects to HTTPS"
  else
    fail "http://$host expected redirect to HTTPS, got HTTP $code (location: ${location:-none})"
  fi

  if command -v openssl >/dev/null 2>&1; then
    if echo | openssl s_client -connect "${host}:${port}" -servername "$host" 2>/dev/null \
      | openssl x509 -noout -checkend 604800 >/dev/null 2>&1; then
      pass "TLS certificate valid for at least 7 more days"
    else
      fail "TLS certificate missing, invalid or expiring within 7 days"
    fi
  else
    printf 'SKIP  TLS expiry check (openssl not installed)\n'
  fi
fi

if [ "$failures" -gt 0 ]; then
  printf '\n%d smoke check(s) failed\n' "$failures"
  exit 1
fi
printf '\nAll smoke checks passed\n'
