# Odyssey website measurement setup

The site sends named conversion events directly to GA4 through the installed
Google tag and also writes a privacy-conscious `odyssey_conversion` entry to
`window.dataLayer` for future tag-manager use. Formspree receives first-session
landing-page and UTM attribution with each contact request. No patient
information, message content, names, email addresses, or platform fields are
sent to Analytics.

## Events currently available

- `generate_lead` after Formspree confirms a successful contact-form request
- `calendar_open`
- `click_to_call`
- `email_click`
- Named CTA events supplied through `data-conversion`, including toolkit and
  healthcare consultation and resource-to-service actions

Every custom event includes `conversion_name` and `page_path`. Links may also
include `conversion_label` and `destination`. A successful contact request
also includes the safe `form_name` and, when selected, `service_category`.

## GA4 and enhanced measurement

The site uses the direct GA4 tag `G-VPKTJC4QXJ`; it does not need a separate
Google Tag Manager container to collect these events. Keep GA4 enhanced
measurement enabled for standard `page_view`, `scroll`, outbound `click`,
`file_download`, and form-interaction events. Do not recreate those standard
events in site code.

Do not change GA4 key-event settings merely because an event appears in the
Events report. First confirm that the event is collected as defined, reconcile
it with a real business outcome or source record, and decide whether it
represents a result the business wants to optimize. The main candidates are:

- `generate_lead` for completed contact requests
- `calendar_open` for consultation intent, if Odyssey chooses to treat an
  outbound booking click as a key outcome
- `click_to_call` for phone contact intent, if Odyssey chooses to treat a phone
  link click as a key outcome

`email_click` is useful for diagnostics but should only be a key event if email
clicks are treated as qualified leads.

GA4's enhanced-measurement `form_submit` event describes form interaction. It
does not establish that Odyssey accepted a contact request. Use the custom
`generate_lead` event for that distinction because it fires only after Formspree
accepts the request.

## Custom dimensions

Create these event-scoped custom dimensions after the new events arrive:

- `conversion_label`
- `destination`
- `form_name`
- `service_category`

GA4 already provides page-path dimensions, so do not create a duplicate custom
dimension for `page_path`.

## Search and lead-source checks

- Verify both the HTTPS domain property and sitemap in Google Search Console.
- Keep UTM naming consistent for campaigns: lowercase source and medium, with a
  descriptive campaign name.
- Review Formspree's lead-source and UTM fields alongside
  GA4. This preserves useful attribution when a prospect reports an online
  recommendation.
- Test measurement after every navigation or form change. Confirm that
  `generate_lead` appears only after Formspree accepts the request. Do not
  publish fake response, satisfaction, review, or conversion statistics.
