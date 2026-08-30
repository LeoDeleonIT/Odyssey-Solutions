# Content Security Policy report-only plan

Updated August 30, 2026. The initial report-only header below is active in Cloudflare. This document remains the rollout and review plan. The policy is not enforced.

## Purpose

A Content Security Policy can reduce the impact of injected scripts and unintended third-party content. Odyssey should begin with `Content-Security-Policy-Report-Only`, review real browser violations, correct the allow-list, and enforce the policy only after forms, analytics, fonts, navigation, scheduling, and Cloudflare features have been tested.

The current site uses inline scripts and inline styles across many static pages. The first report-only policy therefore needs `'unsafe-inline'` in `script-src` and `style-src`. Removing those allowances is a separate refactor that requires nonces or hashes generated consistently for every page.

## Observed active origins

| Capability | Required origin | Directive |
| --- | --- | --- |
| Site scripts, styles, images, and form behavior | `'self'` | Multiple |
| Google Analytics loader | `https://www.googletagmanager.com` | `script-src` |
| Google Analytics collection | `https://*.google-analytics.com` | `connect-src` |
| Self-hosted Exo 2 and Orbitron fonts | `'self'` | `font-src` |
| Contact-form submission | `https://formspree.io` | `connect-src`, `form-action` |
| Calendly if an embedded scheduler is added | `https://calendly.com` | `frame-src` |
| Cloudflare Web Analytics, if enabled | `https://static.cloudflareinsights.com`, `https://cloudflareinsights.com` | `script-src`, `connect-src` |
| Cloudflare challenge, if enabled later | `https://challenges.cloudflare.com` | `script-src`, `frame-src`, `connect-src` |

Calendly is currently opened as a normal link, which does not require a CSP source allowance. It is included in `frame-src` so a future approved embed can be tested without changing the initial policy. Normal outbound links to external sources do not need CSP allow-list entries.

## Initial report-only header

Use this as one line in a Cloudflare response-header rule:

```text
Content-Security-Policy-Report-Only: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; connect-src 'self' https://*.google-analytics.com https://formspree.io https://cloudflareinsights.com https://challenges.cloudflare.com; frame-src https://calendly.com https://challenges.cloudflare.com; form-action 'self' https://formspree.io; manifest-src 'self'; media-src 'self'; worker-src 'self' blob:
```

This header reports violations in browser developer tools without enforcing blocks. It intentionally does not include a collection endpoint because Odyssey has not approved or configured one.

For centralized reports, first choose a privacy-reviewed endpoint. Then add a `Reporting-Endpoints` header and append `report-to csp-endpoint` to the policy. Do not place an unverified placeholder endpoint in production. CSP reports can contain page URLs, blocked resource URLs, and other operational details, so retention and access need review.

## Rollout sequence

1. Completed August 30, 2026: add the initial policy as `Content-Security-Policy-Report-Only` only.
2. Visit representative mobile and desktop pages in a clean browser session:
   - Homepage
   - Contact page
   - IT support service page
   - Dental or healthcare service page
   - Resource article
   - Toolkit page and each download
   - People and compliance product page
3. Test navigation, the mobile menu, phone and email links, Calendly navigation, and a Formspree submission in a non-production test context. Do not create a fake production lead.
4. Confirm the GA4 loader runs and that privacy-safe events still arrive in DebugView or a test property.
5. Review report-only violations for at least seven representative days, including Cloudflare challenge and bot-management behavior if those products are enabled.
6. Add only origins that are required by an observed, approved feature.
7. Remove unused origins such as Cloudflare challenge or Calendly framing if those capabilities are not used.
8. Prepare a second report-only policy that replaces inline allowances with nonces or hashes.
9. Enforce only after a clean report period and a tested rollback rule are available.

## Performance guardrails

Capture Lighthouse mobile and desktop baselines before changing CSP, fonts, caching, or third-party scripts. Use the homepage, contact page, a major service page, a resource article, and the people and compliance product page.

Record:

- Largest Contentful Paint
- Interaction to Next Paint
- Cumulative Layout Shift
- Speed Index
- Total Blocking Time from Lighthouse lab runs
- Transfer size and request count by first-party and third-party origin

The site now serves the existing Exo 2 and Orbitron families from versioned first-party files. This removes the Google Fonts stylesheet request without changing the selected typefaces. The next likely safe performance work is to give versioned first-party CSS, JavaScript, and font files longer cache lifetimes, preserve explicit image dimensions, and keep third-party scripts limited. Do not remove or defer the GA4 loader without rechecking measurement.

## Enforcement decision

Enforcement remains a product and operations decision. It requires:

- Cloudflare access to add and quickly disable the response-header rule
- An approved CSP reporting destination if centralized collection is desired
- A non-production path for Formspree testing
- GA4 DebugView or a test property for measurement confirmation
- Review of any Cloudflare features that inject scripts or challenges
