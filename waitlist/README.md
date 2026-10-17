# Hopkins waitlist page

A static page for waitlist.kirmistudio.com, hosted on Netlify. Everything Netlify needs is
in `public/`: drag that folder (or a zip of it) into the site's Deploys page.

Sign ups are saved by Netlify Forms, so there is no server or database to run:

- `waitlist` holds step one: email, which form on the page it came from (top or
  bottom), and the `?ref=` or `utm_source` / `utm_campaign` from the link.
- `waitlist-details` holds the optional step two: business name, country, number of
  agents and monthly marketing spend, matched to step one by email.

See them under Forms in the Netlify site, with CSV export. Turn on an email notification
for new submissions under Site configuration, Notifications. A hidden honeypot field keeps
most bots out, and Netlify's own spam filter catches more.
