# Brand and product structure

Prepared August 27, 2026. No live logo, product name, or URL was changed.

## Current brand state

The live site uses a text wordmark, the existing favicon, `og-image.png` for social sharing, and that same social image as the Organization schema logo. The untracked `brand/` directory contains rejected and unfinished concepts and must not be committed as a group.

The identifiable preferred direction is the untracked moon, orange S path, and star concept in `brand/odyssey-solutions-moon-star-os-concept.png`. It is a raster concept, not an approved production master. The building mockup is synthetic and must not be used as evidence of a real office or installed sign.

## Approval needed before a live replacement

Confirm the final symbol, wordmark spelling, typography, colors, horizontal lockup, and small-size behavior. Complete a trademark and similarity review before final adoption.

## Production asset checklist

- Path-only master SVG
- Simplified O, S, and star icon
- Compact horizontal navigation lockup
- Full horizontal lockup
- Stacked lockup
- Light-background and dark-background versions
- One-color navy, black, and white versions
- Navy `#171A31`
- Orange `#F97316`
- Accessible dark orange `#C2410C` for small text and interactive states
- Transparent PNG exports
- Print-ready PDF or EPS and CMYK values
- Favicons at 16, 32, and 48 pixels
- Apple touch icon at 180 pixels
- App icons at 192 and 512 pixels
- Square schema logo at 512 pixels or larger
- Social image at 1200 by 630 pixels
- Clear-space and minimum-size rules
- Legibility tests at 16, 24, 32, and 40 pixels

After approval, update the favicon, source and JavaScript headers, social image, schema logo, print assets, and brand documentation in one release.

## Product naming audit

The Odyssey website currently uses `Odyssey HR` and `HR + HIPAA Software`. The separate product site uses `OdyHR`. The existing Odyssey URL `/people-compliance-platform/` is a two-product overview and should stay in place unless a redirect is approved.

Recommended structure:

- Company: Odyssey Solutions
- HR platform: OdyHR
- Training product: Odyssey HIPAA Training, if approved
- Website group label: Software from Odyssey, or OdyHR and HIPAA Training
- Overview URL: `/people-compliance-platform/`

Keep the HR platform and training product distinct. Preserve the analytics key `people_compliance_platform` so historical data remains continuous.

## Decisions still required

1. Approve the OdyHR name for use on the Odyssey website.
2. Choose the canonical OdyHR host. The product code uses `https://www.odyhr.app`, while its documentation uses `https://odyhr.app`.
3. Approve the Odyssey HIPAA Training name.
4. Confirm whether the overview should say Software from Odyssey or OdyHR and HIPAA Training.
5. Approve the final logo files before integration.

After those decisions, the overview can use WebPage or CollectionPage schema with separate SoftwareApplication entities. Do not rename the URL or publish an unfinished logo during that change.
