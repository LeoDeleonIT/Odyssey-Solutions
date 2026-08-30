# Odyssey Cloudflare production plan

Updated August 30, 2026. This document records the live configuration and the remaining decisions.

## Current confirmed state

- The zone is active on Cloudflare's Free plan.
- Universal SSL and TLS 1.3 are active.
- The existing response-header rule adds HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a restricted `Permissions-Policy`.
- Always Use HTTPS is active. Requests to `http://odysseysolutions.co/` return a permanent redirect to HTTPS.
- The four legacy `/blog/` paths return permanent redirects to their matching resource URLs.
- The active `Cache versioned site assets` rule matches versioned CSS and JavaScript plus WOFF2 files under `/fonts/`. It uses a 30-day edge TTL and a one-year browser TTL. HTML, forms, downloads, unversioned images, and redirects remain outside the rule.
- The active `CSP report-only monitoring` rule serves the documented `Content-Security-Policy-Report-Only` header. It does not enforce or block content.
- Markdown for Agents is unavailable on the current Free plan. Cloudflare documents this feature for Pro, Business, and Enterprise plans.
- The Cloudflare-managed `robots.txt` allows search and reference use, rejects AI training, and blocks several extended or training crawlers.

## Change 1: Require HTTPS

Completed August 30, 2026. Keep this setting enabled and verify the redirect after any DNS, proxy, or hosting change.

1. Open SSL/TLS, then Edge Certificates.
2. Turn on Always Use HTTPS.
3. Verify `curl -I http://odysseysolutions.co/` returns a permanent redirect to `https://odysseysolutions.co/`.
4. Verify the HTTPS homepage, contact form, downloads, and Calendly links still work.

## Change 2: Replace legacy page redirects

Completed August 30, 2026. Keep the following permanent redirects, including query strings:

| Source path | Destination |
| --- | --- |
| `/blog/` | `https://odysseysolutions.co/resources/` |
| `/blog/hipaa-risk-analysis-texas-dental-practices.html` | `https://odysseysolutions.co/resources/hipaa-risk-analysis-texas-dental-practices.html` |
| `/blog/ransomware-readiness-healthcare.html` | `https://odysseysolutions.co/resources/ransomware-readiness-healthcare.html` |
| `/blog/secure-healthcare-employee-onboarding-offboarding.html` | `https://odysseysolutions.co/resources/secure-healthcare-employee-onboarding-offboarding.html` |

Use status 301. Keep the repository redirect files until the edge rules have been verified in production.

## Change 3: Markdown content negotiation

The safest supported path is a product decision:

1. Upgrade the zone to Pro or Business.
2. Open AI Crawl Control.
3. Enable Markdown for Agents.
4. Verify HTML and Markdown variants at the same canonical URL.

Required verification:

```sh
curl -sI -H "Accept: text/markdown" https://odysseysolutions.co/
curl -sI -H "Accept: text/html" https://odysseysolutions.co/
curl -sI -H "Accept: application/unsupported" https://odysseysolutions.co/
```

The Markdown response must use `Content-Type: text/markdown; charset=utf-8`. `Vary` must include both `Accept` and the origin's existing `Accept-Encoding` dimension. HTML requests must continue to receive HTML. Unsupported media types should receive 406 when strict negotiation is configured.

Do not attach a custom Worker to the production route until its 404 passthrough, cache behavior, q-value parsing, redirects, and HTML fallback have been tested on a preview hostname.

## Change 4: Cache versioned first-party assets

Completed August 30, 2026. The rule uses a 30-day edge TTL and a one-year browser TTL for the narrow asset set below. A live CSS request returned `Cache-Control: max-age=31536000` and produced a Cloudflare cache HIT on a repeat request.

After the HTTPS and redirect work is stable, consider one Cache Rule limited to query-versioned CSS and JavaScript plus versioned font filenames:

```text
((http.request.uri.path.extension in {"css" "js"}) and (http.request.uri.query contains "v=")) or (starts_with(http.request.uri.path, "/fonts/") and http.request.uri.path.extension eq "woff2")
```

Applied values:

- Cache eligibility: Eligible for cache
- Edge cache TTL: 30 days
- Browser cache TTL: 1 year
- Preserve the default cache key, including the query string

Keep the query string in the default cache key. Test a new asset version before changing this rule, verify that the old and new query versions do not share a cached response, and keep a rollback rule ready. Leave HTML, unversioned images, downloads, forms, and redirects outside this rule.
