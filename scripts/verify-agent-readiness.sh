#!/usr/bin/env bash
set -euo pipefail

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$repo_root"

test -f 404.html
rg -q 'Page not found|sitemap\.xml|llms\.txt|resources/' 404.html
rg -q '^## When to use Odyssey$' llms.txt
rg -q '"@type": \["Organization", "ProfessionalService"\]' index.html
rg -q '"contactPoint"' index.html
rg -q 'Sitemap: https://odysseysolutions\.co/sitemap\.xml' robots.txt

node <<'NODE'
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
if (!blocks.length) throw new Error('No JSON-LD found on homepage');
const graph = blocks.map(([, body]) => JSON.parse(body));
const identity = graph.find((item) => Array.isArray(item['@type']) && item['@type'].includes('Organization'));
if (!identity) throw new Error('Homepage Organization JSON-LD missing');
if (!identity.contactPoint?.telephone || !identity.contactPoint?.contactType) throw new Error('Organization contactPoint incomplete');
console.log('Homepage Organization JSON-LD valid');
NODE

echo 'Agent-readiness static checks passed'
