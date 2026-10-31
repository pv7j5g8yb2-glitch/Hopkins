# Self-serve plans with Stripe

Choosing a plan in Hopkins opens Stripe Checkout for a monthly subscription. The plan starts as
soon as the payment goes through, and ends when it's cancelled in Stripe's customer portal
(Settings, Manage). More than 20 agents is by quote and doesn't go through Stripe. The code is in
`app/src/stripe.js`. Until the keys below are set, Upgrade says "Payments are not available yet."

## 1. The Stripe account

Make it at dashboard.stripe.com in the registered business's name (a parent's if Ismael is under
18). Activating payments asks for the business details and a bank account for payouts. Do
everything below in test mode first, with test keys, then again in live mode.

## 2. Render (hopkins-app, Environment)

* `STRIPE_SECRET_KEY`: Developers, API keys, Secret key.
* `STRIPE_WEBHOOK_SECRET`: Developers, Webhooks, Add endpoint, with the URL
  `https://hopkins-app.onrender.com/api/stripe/webhook` and these events:
  `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
  The signing secret it shows (whsec_...) is this value.

## 3. In Stripe

* Settings, Billing, Customer portal: turn it on, and allow cancelling and updating the card.
* The waitlist's 30% off the first year: Products, Coupons, a 30% coupon that repeats for 12
  months, with a promotion code (for example WAITLIST30) to send to people on the waitlist.
  Checkout has a box for it.

## 4. Test it

With test keys: Upgrade, pick a plan, pay with the card 4242 4242 4242 4242 (any future date, any
CVC). Back in Hopkins, Settings shows the plan. Manage opens the portal; cancelling there turns the
account back to Free.
