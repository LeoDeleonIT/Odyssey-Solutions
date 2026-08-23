# Odyssey website measurement setup

The site already emits a privacy-conscious `odyssey_conversion` event to
`window.dataLayer`. It also includes first-session landing-page, referrer, and
UTM attribution with Formspree submissions. No patient information, message
content, names, email addresses, or platform fields should be sent to analytics.

## Events currently available

- `lead_form_submit`
- `calendar_open`
- `click_to_call`
- `email_click`
- `file_download`
- Named CTA events supplied through `data-conversion`, including toolkit and
  healthcare consultation actions

Every event includes `conversion_name` and `page_path`. Links may also include
`conversion_label` and `destination`.

## Connect Google Tag Manager and GA4

1. Create or select Odyssey's GA4 property and web data stream. Record the real
   measurement ID; never commit a placeholder ID to the live site.
2. Create a Google Tag Manager web container for `odysseysolutions.co` and add
   the official GTM snippets to the site's shared page template or deployment
   layer.
3. In GTM, create Data Layer Variables for `conversion_name`, `page_path`,
   `conversion_label`, and `destination`.
4. Create a Custom Event trigger named `odyssey_conversion`.
5. Create a GA4 Event tag using that trigger. Set the GA4 event name to the
   `conversion_name` Data Layer Variable and pass the other three variables as
   event parameters.
6. Preview the container and verify form, Calendly, phone, email, and download
   events without sending any form values or personal information.
7. Publish the container. In GA4, mark qualified actions such as
   `lead_form_submit` and `calendar_open` as key events.

## Search and lead-source checks

- Verify both the HTTPS domain property and sitemap in Google Search Console.
- Keep UTM naming consistent for campaigns: lowercase source and medium, with a
  descriptive campaign name.
- Review Formspree's lead-source and UTM fields alongside
  GA4. This preserves useful attribution when a prospect reports that ChatGPT or
  another assistant recommended Odyssey.
- Test measurement after every navigation or form change. Do not publish fake
  response, satisfaction, review, or conversion statistics.
