# Lighthouse baseline

Captured August 27, 2026 against the live production site with Lighthouse 13.0.1 and Chrome 152. The scores below are Performance, Accessibility, Best Practices, and SEO.

## Mobile

| Page | Scores | FCP | LCP | CLS | Speed Index | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Homepage | 87 / 100 / 100 / 92 | 2.3 s | 2.3 s | 0.004 | 2.9 s | 360 ms |
| Contact | 79 / 100 / 100 / 92 | 2.8 s | 4.4 s | 0 | 3.0 s | 130 ms |
| Dental IT | 75 / 100 / 100 / 92 | 3.5 s | 4.5 s | 0 | 3.5 s | 130 ms |
| Dental technology timeline | 98 / 100 / 100 / 92 | 1.8 s | 1.8 s | 0.007 | 2.7 s | 50 ms |
| People platform | 97 / 100 / 100 / 92 | 1.9 s | 1.9 s | 0.004 | 1.9 s | 150 ms |

## Desktop

| Page | Scores | FCP | LCP | CLS | Speed Index | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Homepage | 100 / 100 / 100 / 92 | 0.5 s | 0.5 s | 0.005 | 0.6 s | 0 ms |
| Contact | 99 / 100 / 100 / 92 | 0.6 s | 0.6 s | 0.005 | 1.0 s | 0 ms |
| Dental IT | 98 / 100 / 100 / 92 | 0.7 s | 0.9 s | 0.012 | 1.3 s | 80 ms |
| Dental technology timeline | 99 / 100 / 100 / 92 | 0.6 s | 0.8 s | 0.007 | 0.7 s | 10 ms |
| People platform | 99 / 100 / 100 / 92 | 0.5 s | 0.8 s | 0.018 | 0.6 s | 0 ms |

## Evidence-backed opportunities

- Google Fonts and CSS contributed estimated render-blocking savings of 1.1 seconds on Contact and 710 milliseconds on Dental IT. This release self-hosts the same Exo 2 and Orbitron files and removes the external Google Fonts stylesheet.
- Responsive image opportunities were about 105 KiB on homepage toolkit previews, 98 KiB on the people platform, and 23.5 KiB on the dental cover. These require an image-specific visual comparison before release.
- Versioned assets currently receive a four-hour cache lifetime from production. A Cloudflare cache rule could extend immutable first-party asset caching after account approval and rollback planning.
- GA4 contributed about 72 KiB of unused JavaScript in the lab reports. The loader remains unchanged because preserving measurement is more important than a speculative lab improvement.
- One timeline run recorded a slower initial response. Monitor repeated runs before treating it as a server issue.

Every live SEO score was 92 because Cloudflare adds `Content-Signal: search=yes,ai-train=no,use=reference` to `robots.txt`. Lighthouse treats this as an unknown directive. Search Console reports a successful sitemap and indexed pages, so this is a tooling and policy tradeoff rather than evidence of an indexing failure.

## Local post-change verification

The font migration was tested from the local production files with three mobile runs for Contact, three mobile runs for Dental IT, and one desktop homepage run.

- Both font files returned 200 with `font/woff2`.
- Every audited page requested the local Exo 2 and Orbitron files.
- No request reached `fonts.googleapis.com` or `fonts.gstatic.com`.
- Contact mobile median performance improved from 79 live to 84 local. Estimated render blocking fell from 1,100 milliseconds to 620 milliseconds.
- Dental IT mobile median performance improved from 75 live to 82 local. Estimated render blocking fell from 710 milliseconds to 620 milliseconds.
- The local desktop homepage scored 100 for all four categories.

Local tests use an uncompressed development server, so production transfer timings will differ. Run three production medians after deployment before treating the local score change as a final result.

## Production verification for commit 53dae8c

Three-run medians confirm that the deployed font migration materially improved the two weakest mobile pages:

| Page | Performance | FCP | LCP | Speed Index | Original performance |
| --- | ---: | ---: | ---: | ---: | ---: |
| Contact mobile | 88 | 1.75 s | 1.84 s | 1.75 s | 79 |
| Dental IT mobile | 96 | 1.95 s | 1.98 s | 1.95 s | 75 |
| Homepage desktop | 94 | 0.96 s | 0.96 s | 2.02 s | 100 |

Contact improved 9 performance points and Dental IT improved 21. Lighthouse found no remaining render-blocking savings on either mobile page. Both local WOFF2 files returned 200 in every production run, and no request reached a Google Fonts host. Accessibility and Best Practices remained 100.

Contact Total Blocking Time varied widely across runs, so JavaScript timing remains a monitoring item. The desktop homepage median remains strong, but its first production run was a cold-network outlier. Continue using medians instead of a single run.
