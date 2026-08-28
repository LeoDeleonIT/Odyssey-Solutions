# Search and analytics findings

Prepared August 27, 2026 from the signed-in Odyssey Search Console and GA4 properties. No account settings were changed and no test lead was submitted.

## Data limits

The Search Console property begins July 20, 2026. Its three-month view therefore contains only about five weeks of data. GA4 also has a small sample. Trend and loss conclusions are not yet reliable, so this pass prioritizes clear query and page opportunities instead of claiming sustained growth or decline.

## Search Console

### Last 28 days

- 14 clicks
- 4,072 impressions
- 0.3 percent click-through rate
- Average position 25.8
- Desktop: 13 clicks and 3,682 impressions
- Mobile: 1 click and 380 impressions
- Tablet: 0 clicks and 10 impressions

### Available three-month view

- 18 clicks
- 5,404 impressions
- 0.3 percent click-through rate
- Average position 24.5

### Highest-value page findings

1. The managed IT pricing guide had 269 impressions, no clicks, and average position 11.0 in the last 28 days. The query `how much do managed it services cost in houston` had 21 impressions at position 6.6. `per user it pricing houston` had 15 impressions at position 2.1.
2. The new dental office IT setup guide had 257 impressions, no clicks, and average position 26.3. `new dental office technology setup` had 40 impressions at position 6.8.
3. The dental IT service page had 774 impressions, 3 clicks, and average position 8.9. `dental it support houston` had 18 impressions at position 11.4. The page already has a direct title, useful first-screen explanation, and clear actions, so this pass did not force more copy into it.
4. The healthcare ransomware guide had 97 impressions, no clicks, and average position 15.7. Its visible queries were low-volume and fragmented, so the page received internal-link support but no unsupported rewrite.
5. The new dental office technology timeline had no page-level Search Console data yet. It remains separate from the full setup checklist because it answers a project-timing decision.

### Indexing and quality

- Sitemap status: Success
- Sitemap URLs discovered: 88
- Indexed pages: 64
- Not indexed: 15, all reported as Discovered, currently not indexed
- HTTPS report: 23 valid and 0 non-HTTPS URLs
- Breadcrumb enhancement: 13 valid and 0 invalid items
- Manual actions: none
- Security issues: none
- Core Web Vitals: not enough field data

The indexed and not-indexed counts do not yet cover every sitemap URL. Do not request bulk validation until the 15 affected URLs are reviewed and recent publication dates are considered.

## GA4

The last 28 days show:

- 75 views
- 31 active users
- 2.42 views per active user
- 6 seconds average engagement time per active user
- 179 events
- 0 key events

The homepage had 19 views from 13 active users. The contact page had 6 views from 2 users. The resource index had 3 views from 3 users and 30 seconds average engagement. The current sample is too small for reliable funnel percentages.

Recent event evidence has not yet shown `generate_lead`, `calendar_open`, or `click_to_call`. The website implementation and static tests are in place, but legitimate visitor activity must reach GA4 before those events can be marked as key events. Do not generate fake production activity.

## Actions supported by this evidence

- Rewrote the managed IT pricing search title and description around the exact high-position pricing intent and the article's sourced market range.
- Rewrote the new dental office setup title and description around the proven `new dental office technology setup` query.
- Added more internal paths to the relevant pricing, launch-planning, recovery, escalation, and product resources.
- Did not publish a new article. Current evidence favors strengthening existing pages.
- Preserved the dental IT service page wording because it already matches the service intent and has clear actions.

## Next measurement decisions

1. Wait for legitimate `generate_lead`, `calendar_open`, and `click_to_call` activity, then mark the three events as key events with approval.
2. Create the four documented event-scoped custom dimensions only after approval.
3. Review the 15 discovered URLs individually before requesting validation.
4. Recheck query-to-page overlap after at least eight to twelve weeks of data before consolidating content.
5. Compare the two improved snippets after enough impressions accumulate. Search result changes should be judged over weeks, not days.
