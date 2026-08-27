# Odyssey GA4 conversion configuration

Prepared August 27, 2026 for property `G-VPKTJC4QXJ`. No GA4 settings were changed.

## Current evidence

- GA4 Realtime is receiving page views, sessions, first visits, engagement, and scroll events.
- Recent events currently list `click`, `first_visit`, `page_view`, `scroll`, `session_start`, and `user_engagement`.
- `generate_lead`, `calendar_open`, `click_to_call`, `email_click`, and `resource_service_cta` have not appeared in the Recent events table yet.
- Existing key events are `close_convert_lead`, `purchase`, and `qualify_lead`. GA4 reports no stream data for them.
- Do not remove the existing key events until their intended use is confirmed.

## Mark Odyssey conversion events as key events

After each event appears from legitimate visitor activity:

1. Open Admin.
2. Under Data display, open Events.
3. Select Recent events.
4. Find `generate_lead` and select its star.
5. Repeat for `calendar_open` and `click_to_call`.
6. Leave `email_click` and `resource_service_cta` as supporting events unless Odyssey decides they represent primary conversions.

Do not create a fake production lead to populate the table. GA4 may take up to 24 hours to show a newly received event outside Realtime.

## Create event-scoped custom dimensions

Open Admin, then Data display, then Custom definitions. Select Create custom dimension and create these definitions exactly:

| Dimension name | Scope | Event parameter | Purpose |
| --- | --- | --- | --- |
| Conversion label | Event | `conversion_label` | Identifies the page placement or action label |
| Destination | Event | `destination` | Groups safe destinations such as phone, email, Calendly, or an internal service URL |
| Form name | Event | `form_name` | Identifies the successful form without collecting submitted field values |
| Service category | Event | `service_category` | Groups the selected service or resource-to-service path |

The website sends normalized service categories such as `business_it_support`, `dental_it_support`, `managed_it_services`, `cybersecurity`, and `hipaa_guidance`.

## Privacy boundary

Never send names, email addresses, phone numbers, organizations, free-text messages, medical information, patient information, credentials, or form-field contents to GA4. The approved parameters describe the interaction, not the person.
