#!/usr/bin/env bash
set -euo pipefail

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$repo_root"

measurement_id='G-VPKTJC4QXJ'
script_version='20260827e'

node --check site.js
node scripts/verify-measurement.js
node scripts/verify-growth-pass.js

rg -q 'window\.__odysseySiteReady' site.js
rg -q "window\.gtag\('event', conversionName, eventParameters\)" site.js
rg -q "odysseyTrackConversion\('generate_lead'" site.js
rg -q 'if \(!response\.ok\) throw new Error' site.js
! rg -q "odysseyTrackConversion\('lead_form_start'" site.js
! rg -q "conversionName = 'file_download'" site.js
rg -q '<option>Urgent IT support</option>' contact/index.html
rg -q "'technology-project': 'One-time IT project'" site.js
rg -q "'ongoing-it-support': 'Managed IT services'" site.js
rg -q "'business-it-support': 'Business IT support'" site.js
rg -q "'cybersecurity': 'Cybersecurity'" site.js
rg -q "'hipaa-guidance': 'HIPAA guidance or training'" site.js
rg -q "'hipaa-training': 'HIPAA guidance or training'" site.js
rg -q "'hr-hipaa-demo': 'HR and HIPAA software demo'" site.js
rg -q 'open_dental_to_dental_it' resources/open-dental-conversion-it-checklist.html
rg -q 'hipaa_checklist_to_guidance' resources/hipaa-compliance-checklist-dental-offices-2026.html
rg -q 'cybersecurity_checklist_to_managed_it' resources/small-business-cybersecurity-checklist-2026.html
rg -q 'microsoft_365_to_managed_it' resources/microsoft-365-support-small-business-houston.html
rg -q 'urgent_it_contact' resources/urgent-same-day-it-support-houston.html
rg -q 'contact_hero' contact/index.html
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
