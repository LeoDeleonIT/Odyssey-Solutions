# Search and conversion monitoring baseline

Reviewed September 5, 2026 in America/Chicago using Odyssey's signed-in Google
Search Console URL-prefix property `https://odysseysolutions.co/` and GA4
property `550792104` in account `405312022`. The website measurement ID remains
`G-VPKTJC4QXJ`.

## Decision

Keep the September 4 titles, descriptions, and published guides stable while
they collect data. Search Console currently ends September 3, before commit
`a107938`, so these results cannot establish the effect of that change. No new
guide or service-page copy change is supported by this review.

Dental IT remains the first CTR review priority because it has substantial
impressions and an average position of 8.4. Healthcare IT remains next, with
its main service queries around position 17. Existing dental software,
healthcare, remote-support, and EHR pages cover the reviewed query intents.

## Search Console evidence

Filters: Web search, three-month view, all countries and devices. The chart
covers July 20 through September 3, 2026, not three complete months. The report
was last updated 6.5 hours before inspection.

| Scope | Impressions | Clicks | CTR | Average position |
| --- | ---: | ---: | ---: | ---: |
| Entire property | 7.36K, as displayed | 20 | 0.3% | 23.4 |
| `/dental-it-support-houston/` | 1,433 | 3 | 0.2% | 8.4 |
| `/healthcare-it-support-houston/` | 459 | 0 | 0% | 25.8 |

The following queries use an exact page filter. They must not be compared
directly with the property-wide query counts in earlier handoff notes.

| Page | Query | Impressions | Clicks | CTR | Position |
| --- | --- | ---: | ---: | ---: | ---: |
| Dental IT | dental software management near me | 51 | 0 | 0% | 16.3 |
| Dental IT | dental software near me | 46 | 0 | 0% | 27.9 |
| Dental IT | dental it support 77070 | 31 | 0 | 0% | 3.3 |
| Dental IT | dental it support houston | 29 | 0 | 0% | 11.4 |
| Healthcare IT | healthcare it support houston | 118 | 0 | 0% | 17.5 |
| Healthcare IT | it support for healthcare houston | 91 | 0 | 0% | 17.3 |
| Healthcare IT | healthcare it support houston tx | 52 | 0 | 0% | 31.7 |
| Healthcare IT | ehr it support houston | 26 | 0 | 0% | 27.2 |

For reference, the property-wide query table showed 138 impressions and
position 16.7 for `healthcare it support houston`, 107 and 16.6 for
`it support for healthcare houston`, and 52 and 14.4 for
`dental software management near me`. Each had zero clicks.

## EHR guide discovery

URL Inspection initially reported that
`/resources/ehr-it-support-houston-medical-practices.html` was unknown to Google,
with no crawl or referring sitemap recorded. The live test at 8:53 PM reported
that the URL was available to Google, could be indexed, and had one valid
Breadcrumbs item.

One indexing request was accepted on September 5. Google confirmed that the
URL was added to a priority crawl queue. This is a request, not confirmation
that the page is indexed. Do not repeat the request while monitoring it.

## GA4 receipt and interpretation

The Events report for August 8 through September 4, 2026 uses 100% of available
data. It showed 930 events, 194 users, and 336 page views. All 11 event-name
rows were inspected.

| Event | Received count | Interpretation |
| --- | ---: | --- |
| `calendar_open` | 1 | Scheduling-link click; no completed-booking measurement |
| `click_to_call` | 1 | Phone-link click; no connected-call measurement |
| `email_click` | 1 | Email-link click |
| `form_start` | 1 | Form interaction; no confirmed submission |
| `generate_lead` | No row | No accepted-contact event recorded in this period |

`calendar_open` also appeared once in the last-seven-days home card. Its detail
report showed one user in the United States. These aggregate reports confirm
event receipt but do not independently establish whether the activity came
from a prospect or prior QA. Do not report these counts as qualified leads.
No synthetic production clicks or contact submissions were performed during
this review. GA4 key-event settings remain unchanged.

The Admin Events screen already marks `click_to_call` as a key event on the
`website` stream. `calendar_open` is present but unmarked. The other existing
key events are `close_convert_lead`, `purchase`, and `qualify_lead`, each with
no stream data detected. This current configuration supersedes the older
August 27 and August 30 notes about marking `click_to_call`.

The implementation sends `generate_lead` only after Formspree accepts a
submission. A missing GA4 event alone does not prove that no inquiries arrived;
reconcile accepted submissions, actual bookings, and call records separately
before claiming completed outcomes.

## Review schedule and change criteria

A task heartbeat named `Odyssey SEO and conversion review` is scheduled for
four Fridays at 10 AM America/Chicago: September 11, 18, 25, and October 2.
It should notify only on a meaningful change, failure, required user action,
or the final review.

1. September 11: check EHR discovery and event receipt. Keep the new titles.
2. At the two-week review, once all days are available, compare September 4-17
   with August 21-September 3. September 4 is the rollout day, so flag its
   partial exposure to the new titles. Record crawl dates for the changed
   pages before attributing movement to the new copy.
3. At the four-week review, once all days are available, compare September
   4-October 1 with August 7-September 3. If October 2 still has incomplete
   reporting, state the limitation and do not claim a complete comparison.
4. Use the same exact-page and query filters, search type, country, and device
   splits. Review clicks, impressions, CTR, and position together. A changing
   query mix or position can affect CTR; small counts do not establish a win.
5. Prioritize Dental IT and then Healthcare IT. Make a concise title or
   description change only when a persistent query mismatch is visible after
   the observation period. Preserve service scope, factual claims, URLs,
   contact details, design, and analytics configuration.
6. Add a guide only after recording a distinct query, its current landing
   page, and why existing content cannot answer it. Do not create ZIP-code
   variants or generic articles from the query table.
7. Confirm legitimate `calendar_open`, `click_to_call`, and `generate_lead`
   activity before any key-event decision. Keep supporting events separate
   from confirmed business outcomes.

## Regression coverage

`scripts/verify-measurement.js` now exercises actual Calendly link decoration,
one click producing one event, approved attribution parameters, blocked session
storage, and a rejected network submission followed by a successful retry.
These tests verify website behavior locally; they do not prove GA4 receipt.

Run all existing verification scripts from a temporary copy containing tracked
files plus the reviewed changes. This avoids traversing the untracked `brand/`
and `media/` folders. Review the diff, commit, push, and verify GitHub Pages,
site verification, and live production before closing the pass.
