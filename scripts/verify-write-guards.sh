#!/usr/bin/env bash
#
# verify-write-guards.sh - post-deploy probe: anonymous writes to the section, navbar-link and
# site-config APIs must be rejected with 401, while the public reads keep working.
#
# Every UNAUTHENTICATED probe is non-mutating even if the guard were missing:
#   * PUT / DELETE /api/sections/<all-zero UUID>        -> 404 (no such section) when unguarded
#   * POST /api/sections, PUT /api/navbar-links,
#     PUT + PATCH /api/site-config, each with body `{`  -> request.json() throws before any
#                                                          database access -> 500 when unguarded
# Response bodies are never printed (site-config bodies contain credential fields); only HTTP
# status codes are shown.
#
# Usage:
#   scripts/verify-write-guards.sh                       # BASE_URL defaults to production
#   BASE_URL=https://staging.example scripts/verify-write-guards.sh
#   ADMIN_USER=... ADMIN_PASS=... scripts/verify-write-guards.sh   # adds the authenticated check
#
# Authenticated section (only when BOTH ADMIN_USER and ADMIN_PASS are set): logs in with a cookie
# jar (login is rate limited to 5/min/IP - this makes one call), then repeats the zero-UUID probes
# as an admin and expects 404 (guard passed, section does not exist, nothing is written).
#
# Exit status: 0 when every probe passes, 1 otherwise.

set -u

BASE_URL="${BASE_URL:-https://backend.sonic.co.za}"
BASE_URL="${BASE_URL%/}"
ZERO_UUID="00000000-0000-0000-0000-000000000000"
PASSES=0
FAILS=0

# http_status METHOD PATH [BODY [COOKIE_JAR]] -> prints ONLY the HTTP status code
http_status() {
  local method="$1" path="$2" body="${3-}" jar="${4-}"
  local args=(-sS -o /dev/null -w '%{http_code}' --max-time 20 -X "$method")
  if [ -n "$jar" ]; then args+=(-b "$jar"); fi
  if [ -n "$body" ]; then args+=(-H 'Content-Type: application/json' --data-binary "$body"); fi
  curl "${args[@]}" "$BASE_URL$path" || true
}

# check NAME EXPECTED ACTUAL
check() {
  if [ "$3" = "$2" ]; then
    printf 'PASS  %-52s expected %s, got %s\n' "$1" "$2" "$3"
    PASSES=$((PASSES + 1))
  else
    printf 'FAIL  %-52s expected %s, got %s\n' "$1" "$2" "$3"
    FAILS=$((FAILS + 1))
  fi
}

echo "Probing $BASE_URL"
echo

echo "== Anonymous writes must be rejected (401) =="
check "PUT    /api/sections/<zero-uuid>            (body {})" 401 "$(http_status PUT "/api/sections/$ZERO_UUID" '{}')"
check "DELETE /api/sections/<zero-uuid>"                       401 "$(http_status DELETE "/api/sections/$ZERO_UUID")"
check "POST   /api/sections                        (body {)"  401 "$(http_status POST /api/sections '{')"
check "PUT    /api/navbar-links                    (body {)"  401 "$(http_status PUT /api/navbar-links '{')"
check "PUT    /api/site-config                     (body {)"  401 "$(http_status PUT /api/site-config '{')"
check "PATCH  /api/site-config                     (body {)"  401 "$(http_status PATCH /api/site-config '{')"

echo
echo "== Public reads must keep working (200) =="
check "GET    /api/sections?pageSlug=/"                        200 "$(http_status GET '/api/sections?pageSlug=/')"
check "GET    /api/site-config                     (status only)" 200 "$(http_status GET /api/site-config)"
check "GET    /admin/login"                                    200 "$(http_status GET /admin/login)"

if [ -n "${ADMIN_USER:-}" ] && [ -n "${ADMIN_PASS:-}" ]; then
  echo
  echo "== Authenticated check (ADMIN_USER / ADMIN_PASS set) =="
  JAR="$(mktemp)"
  trap 'rm -f "$JAR"' EXIT

  json_escape() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    printf '%s' "$s"
  }

  # The credentials go through stdin, never argv, so they do not show up in `ps`.
  login_code="$(
    printf '{"username":"%s","password":"%s"}' "$(json_escape "$ADMIN_USER")" "$(json_escape "$ADMIN_PASS")" |
      curl -sS -o /dev/null -w '%{http_code}' --max-time 20 -c "$JAR" -X POST \
        -H 'Content-Type: application/json' --data-binary @- "$BASE_URL/api/auth/login" || true
  )"
  check "POST   /api/auth/login" 200 "$login_code"
  if [ "$login_code" = "200" ]; then
    check "PUT    /api/sections/<zero-uuid> as admin   (body {})" 404 "$(http_status PUT "/api/sections/$ZERO_UUID" '{}' "$JAR")"
    check "DELETE /api/sections/<zero-uuid> as admin"              404 "$(http_status DELETE "/api/sections/$ZERO_UUID" '' "$JAR")"
  else
    echo "SKIP  authenticated probes (login did not return 200)"
  fi
fi

echo
echo "$PASSES passed, $FAILS failed  ($BASE_URL)"
if [ "$FAILS" -gt 0 ]; then
  exit 1
fi
exit 0
