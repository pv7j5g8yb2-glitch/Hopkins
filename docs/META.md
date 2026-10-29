# Connecting Hopkins to Meta (Facebook and Instagram ads)

Hopkins runs ads through Meta's Marketing API, from each agent's own ad account, under their own
Facebook Page. One connection covers Facebook and Instagram. The code is in `app/src/meta.js`;
this is what has to be set up on Meta's side, once, by Ismael.

## 1. Create the Meta app

1. Go to developers.facebook.com, log in with the Facebook account that will own Hopkins, and
   create an app. Pick the use case for creating and managing ads with the Marketing API, and add
   Facebook Login for Business.
2. Connect the app to a business portfolio (Meta Business Suite). Business Verification happens
   there later; it isn't needed to start.
3. In App settings, Basic, fill in:
   * App domains: `hopkins-app.onrender.com`
   * Privacy policy URL: `https://hopkins-app.onrender.com/privacy`
   * Data deletion callback URL: `https://hopkins-app.onrender.com/api/meta/deletion`
4. In Facebook Login for Business, Settings, add this as a valid OAuth redirect URI:
   `https://hopkins-app.onrender.com/api/meta/callback`
5. If the dashboard asks for a Login configuration, make one with these permissions:
   `ads_management`, `ads_read`, `business_management`, `pages_show_list`, `pages_manage_ads`.
   Its ID goes in `META_CONFIG_ID` below. Without a configuration Hopkins asks for the same
   permissions directly.

## 2. Tell Hopkins (Render, the hopkins-app service, Environment)

* `META_APP_ID`: the App ID from App settings, Basic
* `META_APP_SECRET`: the App Secret from the same page (keep it private)
* `META_CONFIG_ID`: only if you made a Login configuration
* `APP_URL`: `https://hopkins-app.onrender.com`

Once these are set, Settings shows a Meta section with Connect Meta.

## 3. Test it on your own account first

You need a Facebook Page and an ad account with a payment method. In Hopkins: Settings, Connect
Meta, log in, pick the ad account and the Page. Then approve a plan on a listing.

Approving sends real ads that spend real money from that ad account once Meta approves them.
Use a small budget for the first test.

What happens: Hopkins creates one campaign in the Housing special ad category, one ad set per ad
(each with an equal share of the budget, so the test is fair), aimed at a 15 mile radius around
the property with no age, gender or ZIP targeting. Each ad links to the property's page with its
own ad, so every Lead is counted against the ad that brought it. Every 30 minutes Hopkins checks
the spend and tells the chat once when ads go live or Meta rejects one, with Meta's reason.

## 4. Pilots, before App Review

People with a role on the app can use it fully before any review. In the app's dashboard, App
roles, add each pilot agent as a Tester. They accept from their own developers.facebook.com
account (a free Meta developer account). Then they connect Meta in Hopkins like you did.

## 5. App Review and Business Verification (to open it to everyone)

* Business Verification of the business portfolio the app belongs to (needs a registered business).
* App Review for advanced access to the five permissions above, with a screen recording of each
  in use in Hopkins: connecting, picking the ad account and Page, approving a plan, the ads
  appearing in Ads Manager.
* The Marketing API's standard access tier: Meta looks for a record of successful API calls
  first (500 in 15 days with under 15% errors, as of the last check).
