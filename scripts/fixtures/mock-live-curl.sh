#!/usr/bin/env bash

set -uo pipefail

mock_output='/dev/null'
mock_url=''

while (($# > 0)); do
  case "$1" in
    -o)
      mock_output="$2"
      shift 2
      ;;
    -w|--retry|--connect-timeout|--max-time)
      shift 2
      ;;
    -sS)
      shift
      ;;
    *)
      mock_url="$1"
      shift
      ;;
  esac
done

mock_status='200'
mock_redirect=''
mock_content_type='text/html; charset=utf-8'
mock_size='128'
mock_body='<html><body>Fixture page</body></html>'

case "$mock_url" in
  'http://example.test/')
    mock_status="${MOCK_HTTP_ROOT_STATUS:-301}"
    if [[ "$mock_status" == '301' || "$mock_status" == '308' ]]; then
      mock_redirect='https://example.test/'
    fi
    ;;
  'https://www.example.test/')
    mock_status='301'
    mock_redirect='https://example.test/'
    ;;
  'https://example.test/blog/?odyssey-monitor=1')
    mock_status='301'
    mock_redirect='https://example.test/resources/?odyssey-monitor=1'
    ;;
  'https://example.test/blog/hipaa-risk-analysis-texas-dental-practices.html?odyssey-monitor=1')
    mock_status='301'
    mock_redirect='https://example.test/resources/hipaa-risk-analysis-texas-dental-practices.html?odyssey-monitor=1'
    ;;
  'https://example.test/blog/ransomware-readiness-healthcare.html?odyssey-monitor=1')
    mock_status='301'
    mock_redirect='https://example.test/resources/ransomware-readiness-healthcare.html?odyssey-monitor=1'
    ;;
  'https://example.test/blog/secure-healthcare-employee-onboarding-offboarding.html?odyssey-monitor=1')
    mock_status='301'
    mock_redirect='https://example.test/resources/secure-healthcare-employee-onboarding-offboarding.html?odyssey-monitor=1'
    ;;
  'https://example.test/')
    mock_body='<html><script async src="https://www.googletagmanager.com/gtag/js?id=G-VPKTJC4QXJ"></script></html>'
    ;;
  'https://example.test/sitemap.xml')
    mock_content_type='application/xml'
    mock_body='<?xml version="1.0"?><urlset><url><loc>https://example.test/</loc></url><url><loc>https://example.test/contact/</loc></url></urlset>'
    ;;
  'https://example.test/robots.txt')
    mock_content_type='text/plain'
    mock_body='User-agent: *'
    ;;
  'https://example.test/llms.txt')
    mock_content_type='text/plain'
    mock_body='# Odyssey fixture'
    ;;
  'https://example.test/verification-path-that-does-not-exist-20260827')
    mock_status='404'
    mock_body='<html><h1>Page not found</h1><a href="/sitemap.xml">Sitemap</a><a href="/llms.txt">Agent guide</a></html>'
    ;;
  *.pdf)
    mock_content_type='application/pdf'
    ;;
  *.docx)
    mock_content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ;;
  *.xlsx)
    mock_content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ;;
  *.zip)
    mock_content_type="${MOCK_ZIP_CONTENT_TYPE:-application/zip}"
    ;;
esac

if [[ "$mock_output" != '/dev/null' ]]; then
  printf '%s' "$mock_body" > "$mock_output"
  mock_size="${#mock_body}"
fi

printf '%s|%s|%s|%s' "$mock_status" "$mock_redirect" "$mock_content_type" "$mock_size"
