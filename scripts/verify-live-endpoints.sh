#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-https://odysseysolutions.co}"
measurement_id='G-VPKTJC4QXJ'

for endpoint in / /contact/ /resources/urgent-same-day-it-support-houston.html /resources/business-it/ /resources/managed-it/ /resources/cybersecurity/ /resources/dental-it/ /resources/healthcare-it/ /llms.txt /sitemap.xml /robots.txt /site.js; do
  status="$(curl -sS -o /dev/null -w '%{http_code}' "${base_url}${endpoint}")"
  if [[ "$status" != '200' ]]; then
    echo "Expected 200 from ${endpoint}, received ${status}" >&2
    exit 1
  fi
done

homepage="$(curl -sS "${base_url}/")"
tag_count="$(printf '%s' "$homepage" | rg -o "googletagmanager\.com/gtag/js\?id=${measurement_id}" | wc -l | tr -d ' ')"
if [[ "$tag_count" != '1' ]]; then
  echo "Expected one GA4 loader on the live homepage, found ${tag_count}" >&2
  exit 1
fi

not_found_path="/verification-path-that-does-not-exist-20260827"
not_found_status="$(curl -sS -o /tmp/odyssey-live-404.html -w '%{http_code}' "${base_url}${not_found_path}")"
if [[ "$not_found_status" != '404' ]]; then
  echo "Expected a real 404, received ${not_found_status}" >&2
  exit 1
fi
rg -q 'Page not found' /tmp/odyssey-live-404.html
rg -q 'sitemap\.xml' /tmp/odyssey-live-404.html
rg -q 'llms\.txt' /tmp/odyssey-live-404.html

http_status="$(curl -sS -o /dev/null -w '%{http_code}' http://odysseysolutions.co/)"
markdown_headers="$(curl -sS -I -H 'Accept: text/markdown' "${base_url}/")"

echo "Live endpoint checks passed"
echo "HTTP root status: ${http_status}"
printf '%s\n' "$markdown_headers" | rg -i '^(content-type|vary):' || true
