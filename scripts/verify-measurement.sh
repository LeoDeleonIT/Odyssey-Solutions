#!/usr/bin/env bash
set -euo pipefail

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$repo_root"

measurement_id='G-VPKTJC4QXJ'
script_version='20260827a'

node --check site.js
node scripts/verify-measurement.js

rg -q 'window\.__odysseySiteReady' site.js
rg -q "window\.gtag\('event', conversionName, eventParameters\)" site.js
rg -q "odysseyTrackConversion\('generate_lead'" site.js
rg -q 'if \(!response\.ok\) throw new Error' site.js
! rg -q "odysseyTrackConversion\('lead_form_start'" site.js
! rg -q "conversionName = 'file_download'" site.js
rg -q "sharedSiteScript\.src = '/site\.js\?v=${script_version}'" resources/resources-nav.js

while IFS= read -r page; do
  [[ "$page" == './404.html' || "$page" == './google85ca2f8f1176404d.html' ]] && continue

  tag_count="$(rg -o "googletagmanager\.com/gtag/js\?id=${measurement_id}" "$page" | wc -l | tr -d ' ')"
  if [[ "$tag_count" != '1' ]]; then
    echo "Expected exactly one Google tag in $page, found $tag_count" >&2
    exit 1
  fi

  if rg -q 'meta http-equiv="refresh"' "$page" && rg -q 'noindex, follow' "$page"; then
    continue
  fi

  if ! rg -q "site\.js\?v=${script_version}|resources-nav\.js\?v=${script_version}" "$page"; then
    echo "Current shared measurement script missing from $page" >&2
    exit 1
  fi
done < <(find . -type f -name '*.html' -not -path './media/*' | sort)

echo 'Measurement static checks passed'
