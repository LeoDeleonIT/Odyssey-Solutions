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

echo 'Live endpoint verifier tests passed'
