#!/usr/bin/env bash

set -euo pipefail

odyssey_repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
odyssey_mock_curl="${odyssey_repo_root}/scripts/fixtures/mock-live-curl.sh"
odyssey_verifier="${odyssey_repo_root}/scripts/verify-live-endpoints.sh"
odyssey_test_dir="$(mktemp -d)"
trap 'rm -rf "$odyssey_test_dir"' EXIT

bash -n "$odyssey_verifier"
bash -n "$odyssey_mock_curl"

ODYSSEY_CURL_BIN="$odyssey_mock_curl" \
  bash "$odyssey_verifier" --mode strict https://example.test \
  > "${odyssey_test_dir}/strict-pass.log" 2>&1
grep -q 'All production verification checks passed.' "${odyssey_test_dir}/strict-pass.log"

MOCK_ZIP_CONTENT_TYPE='application/x-zip-compressed' ODYSSEY_CURL_BIN="$odyssey_mock_curl" \
  bash "$odyssey_verifier" --mode strict https://example.test \
  > "${odyssey_test_dir}/strict-zip-alias.log" 2>&1
grep -q 'Complete toolkit ZIP: returned 200 with application/x-zip-compressed' "${odyssey_test_dir}/strict-zip-alias.log"

if MOCK_HTTP_ROOT_STATUS=200 ODYSSEY_CURL_BIN="$odyssey_mock_curl" \
  bash "$odyssey_verifier" --mode strict https://example.test \
  > "${odyssey_test_dir}/strict-fail.log" 2>&1; then
  echo 'Expected strict mode to fail when HTTP does not redirect' >&2
  exit 1
fi
grep -q 'HTTP to HTTPS.*expected 301 or 308' "${odyssey_test_dir}/strict-fail.log"
grep -q 'Strict production verification failed.' "${odyssey_test_dir}/strict-fail.log"

MOCK_HTTP_ROOT_STATUS=200 ODYSSEY_CURL_BIN="$odyssey_mock_curl" \
  bash "$odyssey_verifier" --mode audit https://example.test \
  > "${odyssey_test_dir}/audit.log" 2>&1
grep -q 'Audit completed with findings.' "${odyssey_test_dir}/audit.log"

# /contact/ is both a critical page and a sitemap URL, so this covers both request paths.
MOCK_TRANSIENT_RESET_URL='https://example.test/contact/' ODYSSEY_CURL_BIN="$odyssey_mock_curl" \
  bash "$odyssey_verifier" --mode strict https://example.test \
  > "${odyssey_test_dir}/strict-transient-reset.log" 2>&1 || {
  echo 'Expected strict mode to retry a one-off connection reset' >&2
  cat "${odyssey_test_dir}/strict-transient-reset.log" >&2
  exit 1
}
grep -q 'All production verification checks passed.' "${odyssey_test_dir}/strict-transient-reset.log"

if MOCK_PERSISTENT_RESET_URL='https://example.test/contact/' ODYSSEY_CURL_BIN="$odyssey_mock_curl" \
  bash "$odyssey_verifier" --mode strict https://example.test \
  > "${odyssey_test_dir}/strict-persistent-reset.log" 2>&1; then
  echo 'Expected strict mode to fail when a connection reset persists through every retry' >&2
  exit 1
fi
grep -q 'Critical page: request failed for https://example.test/contact/ (curl exit 56)' "${odyssey_test_dir}/strict-persistent-reset.log"
grep -q 'Sitemap URL: https://example.test/contact/ request failed (curl exit 56: curl: (56) Recv failure: Connection reset by peer), expected 200' "${odyssey_test_dir}/strict-persistent-reset.log"
grep -q 'Strict production verification failed.' "${odyssey_test_dir}/strict-persistent-reset.log"

echo 'Live endpoint verifier tests passed'
