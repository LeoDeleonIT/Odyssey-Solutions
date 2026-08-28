#!/usr/bin/env bash

set -uo pipefail

odyssey_live_mode='audit'
odyssey_base_url='https://odysseysolutions.co'
odyssey_measurement_id='G-VPKTJC4QXJ'
odyssey_curl_bin="${ODYSSEY_CURL_BIN:-curl}"

usage() {
  cat <<'USAGE'
Usage: scripts/verify-live-endpoints.sh [--mode audit|strict] [base-url]

Audit mode reports every problem and exits successfully. Strict mode reports every
problem and exits with a failure when any required production behavior is missing.
USAGE
}

while (($# > 0)); do
  case "$1" in
    --mode)
      if (($# < 2)); then
        echo 'Missing value for --mode' >&2
        usage >&2
        exit 2
      fi
      odyssey_live_mode="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      odyssey_base_url="$1"
      shift
      ;;
  esac
done

if [[ "$odyssey_live_mode" != 'audit' && "$odyssey_live_mode" != 'strict' ]]; then
  echo "Mode must be audit or strict, received: ${odyssey_live_mode}" >&2
  exit 2
fi

odyssey_base_url="${odyssey_base_url%/}"
odyssey_canonical_host="${odyssey_base_url#*://}"
odyssey_canonical_host="${odyssey_canonical_host%%/*}"
odyssey_http_origin="${ODYSSEY_HTTP_ORIGIN:-http://${odyssey_canonical_host}}"
odyssey_www_origin="${ODYSSEY_WWW_ORIGIN:-https://www.${odyssey_canonical_host}}"
odyssey_work_dir="$(mktemp -d)"
trap 'rm -rf "$odyssey_work_dir"' EXIT

odyssey_checks=0
odyssey_passes=0
odyssey_failures=0

pass_check() {
  odyssey_checks=$((odyssey_checks + 1))
  odyssey_passes=$((odyssey_passes + 1))
  printf 'PASS  %s\n' "$1"
}

fail_check() {
  odyssey_checks=$((odyssey_checks + 1))
  odyssey_failures=$((odyssey_failures + 1))
  printf 'FAIL  %s\n' "$1" >&2
}

fetch_metrics() {
  local odyssey_url="$1"
  local odyssey_output="$2"

  "$odyssey_curl_bin" \
    -sS \
    --retry 1 \
    --connect-timeout 10 \
    --max-time 20 \
    -o "$odyssey_output" \
    -w '%{http_code}|%{redirect_url}|%{content_type}|%{size_download}' \
    "$odyssey_url"
}

read_metrics() {
  local odyssey_url="$1"
  local odyssey_output="$2"
  local odyssey_metrics

  if ! odyssey_metrics="$(fetch_metrics "$odyssey_url" "$odyssey_output")"; then
    return 1
  fi

  IFS='|' read -r ODYSSEY_STATUS ODYSSEY_REDIRECT ODYSSEY_CONTENT_TYPE ODYSSEY_SIZE <<< "$odyssey_metrics"
  export ODYSSEY_STATUS ODYSSEY_REDIRECT ODYSSEY_CONTENT_TYPE ODYSSEY_SIZE
}

verify_200() {
  local odyssey_path="$1"
  local odyssey_label="$2"
  local odyssey_url="${odyssey_base_url}${odyssey_path}"

  if ! read_metrics "$odyssey_url" /dev/null; then
    fail_check "${odyssey_label}: request failed for ${odyssey_url}"
    return
  fi

  if [[ "$ODYSSEY_STATUS" == '200' ]]; then
    pass_check "${odyssey_label}: ${odyssey_path} returned 200"
  else
    fail_check "${odyssey_label}: ${odyssey_path} returned ${ODYSSEY_STATUS}, expected 200"
  fi
}

verify_permanent_redirect() {
  local odyssey_source="$1"
  local odyssey_destination="$2"
  local odyssey_label="$3"

  if ! read_metrics "$odyssey_source" /dev/null; then
    fail_check "${odyssey_label}: request failed for ${odyssey_source}"
    return
  fi

  if [[ "$ODYSSEY_STATUS" != '301' && "$ODYSSEY_STATUS" != '308' ]]; then
    fail_check "${odyssey_label}: ${odyssey_source} returned ${ODYSSEY_STATUS}, expected 301 or 308"
    return
  fi

  if [[ "$ODYSSEY_REDIRECT" != "$odyssey_destination" ]]; then
    fail_check "${odyssey_label}: redirect target was ${ODYSSEY_REDIRECT:-missing}, expected ${odyssey_destination}"
    return
  fi

  if ! read_metrics "$odyssey_destination" /dev/null; then
    fail_check "${odyssey_label}: destination request failed for ${odyssey_destination}"
    return
  fi

  if [[ "$ODYSSEY_STATUS" != '200' ]]; then
    fail_check "${odyssey_label}: destination returned ${ODYSSEY_STATUS}, expected 200"
    return
  fi

  pass_check "${odyssey_label}: one permanent redirect reaches a 200 destination"
}

verify_download() {
  local odyssey_path="$1"
  local odyssey_expected_type="$2"
  local odyssey_label="$3"
  local odyssey_actual_type
  local odyssey_type_matches=0
  local odyssey_allowed_type
  local odyssey_allowed_types

  if ! read_metrics "${odyssey_base_url}${odyssey_path}" /dev/null; then
    fail_check "${odyssey_label}: request failed"
    return
  fi

  odyssey_actual_type="$(printf '%s' "$ODYSSEY_CONTENT_TYPE" | tr '[:upper:]' '[:lower:]')"
  IFS=',' read -r -a odyssey_allowed_types <<< "$odyssey_expected_type"
  for odyssey_allowed_type in "${odyssey_allowed_types[@]}"; do
    if [[ "$odyssey_actual_type" == "$odyssey_allowed_type"* ]]; then
      odyssey_type_matches=1
      break
    fi
  done

  if [[ "$ODYSSEY_STATUS" != '200' ]]; then
    fail_check "${odyssey_label}: returned ${ODYSSEY_STATUS}, expected 200"
  elif [[ "$odyssey_type_matches" != '1' ]]; then
    fail_check "${odyssey_label}: Content-Type was ${ODYSSEY_CONTENT_TYPE:-missing}, expected one of ${odyssey_expected_type}"
  elif [[ "$ODYSSEY_SIZE" == '0' || -z "$ODYSSEY_SIZE" ]]; then
    fail_check "${odyssey_label}: response body was empty"
  else
    pass_check "${odyssey_label}: returned 200 with ${ODYSSEY_CONTENT_TYPE}"
  fi
}

printf 'Odyssey production verification\n'
printf 'Mode: %s\n' "$odyssey_live_mode"
printf 'Canonical origin: %s\n\n' "$odyssey_base_url"

critical_paths=(
  '/'
  '/contact/'
  '/it-support-houston/'
  '/managed-it-services-houston/'
  '/dental-it-support-houston/'
  '/healthcare-it-support-houston/'
  '/resources/'
  '/resources/odyssey-it-resilience-toolkit/'
)

for odyssey_path in "${critical_paths[@]}"; do
  verify_200 "$odyssey_path" 'Critical page'
done

machine_paths=(
  '/sitemap.xml'
  '/robots.txt'
  '/llms.txt'
)

for odyssey_path in "${machine_paths[@]}"; do
  verify_200 "$odyssey_path" 'Machine-readable file'
done

verify_permanent_redirect \
  "${odyssey_http_origin}/" \
  "${odyssey_base_url}/" \
  'HTTP to HTTPS'

verify_permanent_redirect \
  "${odyssey_www_origin}/" \
  "${odyssey_base_url}/" \
  'www to canonical host'

legacy_sources=(
  '/blog/'
  '/blog/hipaa-risk-analysis-texas-dental-practices.html'
  '/blog/ransomware-readiness-healthcare.html'
  '/blog/secure-healthcare-employee-onboarding-offboarding.html'
)
legacy_destinations=(
  '/resources/'
  '/resources/hipaa-risk-analysis-texas-dental-practices.html'
  '/resources/ransomware-readiness-healthcare.html'
  '/resources/secure-healthcare-employee-onboarding-offboarding.html'
)

for odyssey_index in 0 1 2 3; do
  odyssey_query='?odyssey-monitor=1'
  verify_permanent_redirect \
    "${odyssey_base_url}${legacy_sources[$odyssey_index]}${odyssey_query}" \
    "${odyssey_base_url}${legacy_destinations[$odyssey_index]}${odyssey_query}" \
    "Legacy redirect ${legacy_sources[$odyssey_index]}"
done

download_prefix='/resources/downloads/odyssey-it-resilience-toolkit'
verify_download "${download_prefix}/odyssey-dental-ai-use-policy-template.pdf" 'application/pdf' 'AI use policy PDF'
verify_download "${download_prefix}/odyssey-dental-ai-use-policy-template.docx" 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 'AI use policy DOCX'
verify_download "${download_prefix}/odyssey-dental-practice-it-downtime-plan.pdf" 'application/pdf' 'Downtime plan PDF'
verify_download "${download_prefix}/odyssey-dental-practice-it-downtime-plan.docx" 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 'Downtime plan DOCX'
verify_download "${download_prefix}/odyssey-it-resilience-tracker.xlsx" 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 'Resilience tracker XLSX'
verify_download "${download_prefix}/odyssey-it-resilience-toolkit-full.zip" 'application/zip,application/x-zip-compressed' 'Complete toolkit ZIP'

odyssey_homepage_file="${odyssey_work_dir}/homepage.html"
if read_metrics "${odyssey_base_url}/" "$odyssey_homepage_file"; then
  odyssey_tag_count="$(grep -o "googletagmanager.com/gtag/js?id=${odyssey_measurement_id}" "$odyssey_homepage_file" | wc -l | tr -d ' ')"
  if [[ "$ODYSSEY_STATUS" == '200' && "$odyssey_tag_count" == '1' ]]; then
    pass_check "GA4 loader: found one ${odyssey_measurement_id} loader on the homepage"
  else
    fail_check "GA4 loader: found ${odyssey_tag_count:-0} loaders on a homepage response with status ${ODYSSEY_STATUS}"
  fi
else
  fail_check 'GA4 loader: homepage request failed'
fi

odyssey_not_found_file="${odyssey_work_dir}/404.html"
odyssey_not_found_url="${odyssey_base_url}/verification-path-that-does-not-exist-20260827"
if read_metrics "$odyssey_not_found_url" "$odyssey_not_found_file"; then
  if [[ "$ODYSSEY_STATUS" != '404' ]]; then
    fail_check "404 recovery: nonexistent path returned ${ODYSSEY_STATUS}, expected 404"
  elif ! grep -qi 'Page not found' "$odyssey_not_found_file"; then
    fail_check '404 recovery: response did not explain that the page was not found'
  elif ! grep -q 'sitemap\.xml' "$odyssey_not_found_file" || ! grep -q 'llms\.txt' "$odyssey_not_found_file"; then
    fail_check '404 recovery: response did not link to both sitemap.xml and llms.txt'
  else
    pass_check '404 recovery: real 404 includes agent recovery links'
  fi
else
  fail_check '404 recovery: request failed'
fi

odyssey_sitemap_file="${odyssey_work_dir}/sitemap.xml"
if read_metrics "${odyssey_base_url}/sitemap.xml" "$odyssey_sitemap_file" && [[ "$ODYSSEY_STATUS" == '200' ]]; then
  odyssey_sitemap_urls_file="${odyssey_work_dir}/sitemap-urls.txt"
  odyssey_sitemap_results_file="${odyssey_work_dir}/sitemap-results.txt"
  grep -o '<loc>[^<]*</loc>' "$odyssey_sitemap_file" | sed -e 's#<loc>##' -e 's#</loc>##' > "$odyssey_sitemap_urls_file"
  odyssey_sitemap_url_count="$(grep -c . "$odyssey_sitemap_urls_file" || true)"

  if [[ "$odyssey_sitemap_url_count" == '0' ]]; then
    fail_check 'Sitemap coverage: no URLs were found in sitemap.xml'
  else
    export ODYSSEY_SITEMAP_CURL_BIN="$odyssey_curl_bin"
    while IFS= read -r odyssey_sitemap_url; do
      [[ -n "$odyssey_sitemap_url" ]] && printf '%s\0' "$odyssey_sitemap_url"
    done < "$odyssey_sitemap_urls_file" | xargs -0 -P 6 -n 1 bash -c '
      odyssey_url="$1"
      if odyssey_status="$("$ODYSSEY_SITEMAP_CURL_BIN" -sS --retry 1 --connect-timeout 10 --max-time 20 -o /dev/null -w "%{http_code}" "$odyssey_url" 2>/dev/null)"; then
        printf "%s|%s\n" "$odyssey_status" "$odyssey_url"
      else
        printf "000|%s\n" "$odyssey_url"
      fi
    ' _ > "$odyssey_sitemap_results_file"

    odyssey_sitemap_failure_count=0
    while IFS='|' read -r odyssey_sitemap_status odyssey_sitemap_url; do
      if [[ "$odyssey_sitemap_status" != '200' ]]; then
        odyssey_sitemap_failure_count=$((odyssey_sitemap_failure_count + 1))
        fail_check "Sitemap URL: ${odyssey_sitemap_url} returned ${odyssey_sitemap_status}, expected 200"
      fi
    done < "$odyssey_sitemap_results_file"

    if [[ "$odyssey_sitemap_failure_count" == '0' ]]; then
      pass_check "Sitemap coverage: ${odyssey_sitemap_url_count} canonical URLs returned 200"
    else
      printf 'INFO  Sitemap coverage: %s of %s URLs failed\n' "$odyssey_sitemap_failure_count" "$odyssey_sitemap_url_count"
    fi
  fi
else
  fail_check 'Sitemap coverage: sitemap.xml could not be read'
fi

printf '\nSummary: %s checks, %s passed, %s failed\n' "$odyssey_checks" "$odyssey_passes" "$odyssey_failures"

if ((odyssey_failures > 0)); then
  if [[ "$odyssey_live_mode" == 'strict' ]]; then
    echo 'Strict production verification failed.' >&2
    exit 1
  fi
  echo 'Audit completed with findings. Audit mode does not fail the command.'
else
  echo 'All production verification checks passed.'
fi
