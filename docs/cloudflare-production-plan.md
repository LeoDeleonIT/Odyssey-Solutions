# Odyssey Cloudflare production plan

Prepared August 27, 2026. These settings were inspected but not changed.

## Current confirmed state

- The zone is active on Cloudflare's Free plan.
- Universal SSL and TLS 1.3 are active.
- The existing response-header rule adds HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a restricted `Permissions-Policy`.
- Always Use HTTPS is off. Requests to `http://odysseysolutions.co/` return 200 instead of redirecting.
- No Redirect Rules are configured.
- Markdown for Agents is unavailable on the current Free plan. Cloudflare documents this feature for Pro, Business, and Enterprise plans.
- The Cloudflare-managed `robots.txt` allows search and reference use, rejects AI training, and blocks several extended or training crawlers.

## Change 1: Require HTTPS

Action after approval:

1. Open SSL/TLS, then Edge Certificates.
2. Turn on Always Use HTTPS.
3. Verify `curl -I http://odysseysolutions.co/` returns a permanent redirect to `https://odysseysolutions.co/`.
4. Verify the HTTPS homepage, contact form, downloads, and Calendly links still work.

## Change 2: Replace legacy page redirects

Create permanent Redirect Rules that preserve query strings:

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
