import { test } from "node:test";
import assert from "node:assert/strict";
import { parseListingText, parsePrice, formatPrice, shortPrice, parseDeal } from "../src/listing.js";
import { writeSet, writeVersion, houseRuleProblems, polish } from "../src/writer.js";
import { checkWording, cleanWording, audienceFor } from "../src/fairhousing.js";
import { readIntent, targetVersions } from "../src/rules.js";

const SAMPLES = [
  "Just listed: 412 Oak Street in Riverside, Austin, TX. 3 bed, 2 bath, 1,840 sq ft craftsman with a wraparound porch, renovated kitchen, fenced backyard and a home office. $649,000",
  "Condo in Midtown, 1 bed 1 bath, 720 sqft, rooftop terrace, gym, parking. Asking $389k",
  "5 bed 4.5 bath waterfront home on 2 acres with pool, dock and ocean views. $3.2M",
  "Cute bungalow. $275,000",
  "",
];
const photos = [{ id: "a", label: "exterior", position: 0 }, { id: "b", label: "kitchen", position: 1 }, { id: "c", label: "pool", position: 2 }];

test("reads the facts out of a description", () => {
  const l = parseListingText(SAMPLES[0]);
  assert.equal(l.price, 649000);
  assert.equal(l.beds, 3);
  assert.equal(l.baths, 2);
  assert.equal(l.sqft, 1840);
  assert.equal(l.address, "412 Oak Street");
  assert.equal(l.city, "Austin");
  assert.equal(l.area, "Riverside");
  assert.ok(l.features.includes("porch") && l.features.includes("kitchen"));
  assert.equal(parsePrice("Asking $389k"), 389000);
  assert.equal(parsePrice("$3.2M"), 3200000);
  assert.equal(parsePrice("$1,250,000"), 1250000);
});

test("a price keeps its currency: euros stay euros", () => {
  const madrid = parseListingText("Calle de Serrano 45, Madrid. 3 bed 2 bath flat, 140 m2, €1,250,000. Corner balcony.");
  assert.deepEqual([madrid.price, madrid.currency], [1250000, "EUR"]);
  assert.deepEqual([parsePrice("1.250.000 €"), parseListingText("Precio 1.250.000 €").currency], [1250000, "EUR"]);
  assert.equal(parseListingText("£875,000 in Hampstead, 3 bed").currency, "GBP");
  assert.equal(parseListingText("AED 3,400,000 villa in Dubai Hills, 4 bed").currency, "AED");
  assert.equal(parseListingText("$649,000, 3 bed 2 bath").currency, null);
  assert.equal(formatPrice(1250000, "EUR"), "€1,250,000");
  assert.equal(shortPrice(1250000, "EUR"), "€1.25M");
  assert.equal(formatPrice(649000), "$649,000");
  const ads = writeSet({ listing: { ...madrid, open_house: null }, photos: [], brand: {}, moment: "new" });
  for (const a of ads) assert.doesNotMatch(`${a.headline} ${a.overlay} ${a.primary_text} ${a.name}`, /\$/);
});

test("three different ideas, every time, within the house rules", () => {
  for (const text of SAMPLES) {
    for (const moment of ["new", "price", "open_house", "sold"]) {
      const listing = { ...parseListingText(text), open_house: "Sat 1 to 3pm" };
      const set = writeSet({ listing, photos, brand: {}, moment, extra: { oldPrice: 700000 } });
      assert.deepEqual(set.map((a) => a.pattern), ["life", "feature", "facts"]);
      assert.equal(new Set(set.map((a) => a.overlay)).size, 3, `distinct overlays for "${text}" ${moment}`);
      for (const ad of set) {
        for (const field of ["headline", "overlay", "kicker", "primary_text"]) {
          assert.deepEqual(houseRuleProblems(ad[field]), [], `${field}: ${ad[field]}`);
          assert.deepEqual(checkWording(ad[field]).filter((i) => i.level === "block"), [], `${field}: ${ad[field]}`);
        }
        assert.ok(ad.headline.length <= 40, ad.headline);
        assert.ok(ad.primary_text.length > 20);
      }
    }
  }
});

test("each version gets its own photo when there are enough", () => {
  const listing = parseListingText(SAMPLES[2]);
  const set = writeSet({ listing, photos, brand: {}, moment: "new" });
  assert.equal(new Set(set.map((a) => a.photo_id)).size, 3);
});

test("shorter is shorter, and another angle changes the line", () => {
  const listing = parseListingText(SAMPLES[0]);
  const ctx = { listing, photos, brand: {}, moment: "new" };
  const normal = writeVersion("life", ctx);
  assert.ok(writeVersion("life", ctx, { length: "short" }).primary_text.length < normal.primary_text.length);
  assert.notEqual(writeVersion("life", ctx, { angle: 1 }).overlay, normal.overlay);
});

test("fair housing wording is caught and cleaned", () => {
  assert.ok(checkWording("Perfect for families, close to great schools").some((i) => i.level === "block"));
  assert.ok(checkWording("Spacious master bedroom").some((i) => i.level === "caution"));
  assert.deepEqual(checkWording("Single family home a couple of blocks from the park"), []);
  const cleaned = cleanWording("Perfect for families. Adults only. Master bedroom with views.");
  assert.ok(!/famil|adults only|master/i.test(cleaned), cleaned);
  assert.equal(audienceFor({ city: "Austin" }, 5).radiusMiles, 15);
});

test("house rules: no dashes, no Realtor", () => {
  assert.equal(polish("Open house Sat 1–3pm — come by"), "Open house Sat 1 to 3pm, come by");
  assert.equal(polish("Call your Realtor"), "Call your agent");
  assert.deepEqual(houseRuleProblems("Our team will help"), ["we"]);
});

test("the fact check: details and numbers have to come from somewhere", async () => {
  const { factProblems, withoutProblems } = await import("../src/facts.js");
  const listing = { price: 649000, beds: 3, baths: 2, sqft: 1840, features: ["porch"], description: "Craftsman with a wraparound porch in Riverside." };
  const photos = [{ label: "kitchen", seen: "white cabinets, gas range, kitchen island" }];
  const ok = { overlay: "Slow mornings on the porch.", headline: "Under $650K in Riverside", primary_text: "3 beds, 2 baths, 1,840 sq ft. A kitchen island for long dinners. Book a showing.", kicker: "Just listed" };
  assert.deepEqual(factProblems(ok, { listing, photos }), []);
  const bad = { overlay: "Granite and hardwood.", headline: "Minutes from downtown", primary_text: "Renovated in 2021. The porch is lovely. Book a showing.", kicker: "Just listed" };
  const p = factProblems(bad, { listing, photos });
  assert.deepEqual([...new Set(p.map((x) => x.what))].sort(), ["2021", "downtown", "granite", "hardwood", "minutes from", "renovated"].sort());
  assert.equal(withoutProblems(bad.primary_text, p), "The porch is lovely. Book a showing.");
  // What the agent just said in the chat counts.
  assert.deepEqual(factProblems({ overlay: "Granite counters.", headline: "", primary_text: "", kicker: "" }, { listing, photos, extra: "it has granite counters" }), []);
});

test("reads what the agent wants", () => {
  assert.deepEqual(targetVersions("make the second one shorter", 1), [2]);
  assert.deepEqual(targetVersions("change all of them", 2, [{ version: 1 }, { version: 2 }]), [1, 2]);
  const named = [{ version: 1, name: "Wraparound porch" }, { version: 2, name: "Under $650K" }, { version: 3, name: "The big kitchen" }];
  assert.deepEqual(targetVersions("make the big kitchen one warmer", 1, named), [3]);
  assert.deepEqual(targetVersions("shorten the last one", 1, named), [3]);
  assert.equal(readIntent("delete the second one").kind, "remove");
  assert.deepEqual(readIntent("delete the second one").versions, [2]);
  assert.equal(readIntent("make another ad").kind, "add");
  assert.equal(readIntent("remove the emoji").kind === "remove", false);
  assert.deepEqual(targetVersions("make it warmer", 3), [3]);
  assert.equal(readIntent("run it").kind, "run");
  const r = readIntent("run it with $300 over 14 days");
  assert.equal(r.budget, 300);
  assert.equal(r.days, 14);
  assert.equal(readIntent("price dropped to $629,000").listingPatch.price, 629000);
  assert.equal(readIntent("Open house Saturday 1 to 3pm").listingPatch.open_house, "Saturday 1 to 3pm");
  assert.equal(readIntent("it sold!").moment, "sold");
  assert.equal(readIntent('headline: "Porch season"').changes.headline, "Porch season");
  assert.equal(readIntent("use photo 2", { photos }).changes.photoId, "b");
  assert.equal(readIntent("use the kitchen photo", { photos }).changes.photoId, "b");
  assert.equal(readIntent("use the bedroom photo", { photos }).changes.photoMissing, "bedroom");
  assert.equal(readIntent("more luxury please").changes.voice, "premium");
  assert.equal(readIntent("try another angle").changes.angle, true);
  assert.deepEqual(readIntent("it also has a pool").listingPatch.addFeatures, ["pool"]);
  assert.equal(readIntent("purple monkey dishwasher").kind, "unknown");
  // Naming a version and nothing else switches to it.
  for (const t of ["version 2", "No, I meant version 2", "I said version 2", "2", "the second one", "what about 2"]) {
    const i = readIntent(t, { selected: 1 });
    assert.equal(i.kind, "select", t);
    assert.deepEqual(i.versions, [2], t);
  }
  assert.equal(readIntent("version 2 shorter").kind, "revise");
  assert.equal(readIntent("hey").kind, "greeting");
  assert.equal(readIntent("hi, make it shorter").kind, "revise");
  assert.equal(readIntent("which one is best?").topic, "which");
  assert.equal(readIntent("how much does it cost?").topic, "plan");
  assert.equal(readIntent("make the ads").kind, "make");
});

test("chat replies keep their Markdown shape while the words get the house rules", async () => {
  const { polishChat } = await import("../src/writer.js");
  const out = polishChat("**Version 2** — my pick.\n\n* move-in ready\n- a two‑week run\n\n| Version | Angle |\n|---|---|\n| 1 | The life — porch |");
  assert.equal(out, "**Version 2**, my pick.\n\n- move in ready\n- a two week run\n\n| Version | Angle |\n|---|---|\n| 1 | The life, porch |");
});

test("a listing page's own photos and facts: Zillow's page data, else JSON-LD, else og:image", async () => {
  const { photosFrom, pageFacts } = await import("../src/listing.js");
  const shot = (id) => ({ url: `https://photos.zillowstatic.com/fp/${id}-p_d.jpg`, mixedSources: { jpeg: [192, 384, 1152, 1536].map((w) => ({ url: `https://photos.zillowstatic.com/fp/${id}-cc_ft_${w}.jpg`, width: w })) } });
  const property = { streetAddress: "12 Elm St", city: "Austin", state: "TX", price: 585000, bedrooms: 3, bathrooms: 2, livingArea: 1840, yearBuilt: 1998,
    description: "Big back yard with a pecan tree.", responsivePhotos: [shot("aaa"), shot("bbb")] };
  // Zillow keeps the property as JSON text inside the page data, next to nearby homes' photos.
  const cache = JSON.stringify({ "ViewQuery{zpid}": { property, nearby: { responsivePhotos: [shot("zzz")] } } });
  const zillow = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { componentProps: { gdpClientCache: cache } } } })}</script></html>`;
  assert.deepEqual(photosFrom(zillow), [
    { url: "https://photos.zillowstatic.com/fp/aaa-cc_ft_1536.jpg", thumb: "https://photos.zillowstatic.com/fp/aaa-cc_ft_384.jpg" },
    { url: "https://photos.zillowstatic.com/fp/bbb-cc_ft_1536.jpg", thumb: "https://photos.zillowstatic.com/fp/bbb-cc_ft_384.jpg" },
  ]);
  assert.equal(pageFacts(zillow), "12 Elm St, Austin, TX. Price $585,000. 3 bed, 2 bath, 1,840 sq ft. Built in 1998. Big back yard with a pecan tree.");
  const ld = `<script type="application/ld+json">{"@type":"SingleFamilyResidence","image":["https://x.test/1.jpg",{"url":"https://x.test/2.jpg"}]}</script><meta property="og:image" content="https://x.test/og.jpg">`;
  assert.deepEqual(photosFrom(ld).map((p) => p.url), ["https://x.test/1.jpg", "https://x.test/2.jpg"]);
  assert.deepEqual(photosFrom(`<meta property="og:image" content="https://x.test/og.jpg">`).map((p) => p.url), ["https://x.test/og.jpg"]);
  assert.deepEqual(photosFrom(`<meta property="og:image" content="http://insecure.test/a.jpg">`), []);
});

test("MLS share pages: every photo at its largest, the remarks and the facts from the page's words", async () => {
  const { readPage, photosFrom, MAX_PHOTOS } = await import("../src/listing.js");
  // A Flexmls share page: a gallery on Spark's photo server, a table of facts, the remarks.
  const gallery = Array.from({ length: 30 }, (_, i) => `<img src="https://cdn.photos.sparkplatform.com/az/2026${i}-t.jpg" srcset="https://cdn.photos.sparkplatform.com/az/2026${i}-t.jpg 300w, https://cdn.photos.sparkplatform.com/az/2026${i}-o.jpg 2048w">`).join("");
  const flex = `<html><head><title>4821 E Sunrise Dr, Phoenix, AZ 85018</title><script>var x = "$999,999";</script></head><body><nav>Sign in</nav>
    <img src="https://cdn.photos.sparkplatform.com/logo.png"><img src="/img/agent-headshot.jpg">${gallery}
    <table><tr><td>List Price</td><td>$1,249,000</td></tr><tr><td>Beds</td><td>4</td></tr><tr><td>Baths</td><td>3</td></tr><tr><td>Approx SqFt</td><td>2,912 sq ft</td></tr></table>
    <h3>Public Remarks</h3><p>Mid century ranch on a corner lot with a pool &amp; mountain views.</p></body></html>`;
  const r = readPage(flex, "https://www.flexmls.com/share/abc/4821-E-Sunrise-Dr");
  assert.equal(r.photos.length, MAX_PHOTOS);
  assert.equal(r.photos[0].url, "https://cdn.photos.sparkplatform.com/az/20260-o.jpg");
  assert.ok(!r.photos.some((p) => /logo|headshot/.test(p.url)));
  assert.equal(r.thin, false);
  assert.match(r.description, /List Price: \$1,249,000\nBeds: 4/);
  assert.match(r.description, /pool & mountain views/);
  assert.doesNotMatch(r.description, /999,999|Sign in/);
  const p = parseListingText(r.description);
  assert.deepEqual([p.price, p.beds, p.baths, p.sqft], [1249000, 4, 3, 2912]);
  // Matrix's public portal: photos from its media server, linked from the page itself.
  const matrix = `<body><a href="/MediaServer/GetMedia.ashx?Key=55&TableID=9&Type=1&Number=0&Size=4"><img src="/MediaServer/GetMedia.ashx?Key=55&amp;TableID=9&amp;Type=1&amp;Number=0&amp;Size=2"></a><img src="/MediaServer/GetMedia.ashx?Key=55&amp;TableID=9&amp;Type=1&amp;Number=1&amp;Size=4"></body>`;
  assert.deepEqual(photosFrom(matrix, 25, "https://matrix.example-mls.com/Matrix/Public/Portal.aspx?ID=1").map((x) => x.url), [
    "https://matrix.example-mls.com/MediaServer/GetMedia.ashx?Key=55&TableID=9&Type=1&Number=0&Size=4",
    "https://matrix.example-mls.com/MediaServer/GetMedia.ashx?Key=55&TableID=9&Type=1&Number=1&Size=4",
  ]);
  // An app drawn in the browser says nothing about the property: thin, so Google reads it too.
  assert.equal(readPage(`<html><head><title>OneHome</title><meta property="og:image" content="https://x.test/brand.png"></head><body><app-root></app-root></body></html>`).thin, true);
  // A site that answers with an empty page gives nothing.
  assert.equal(readPage(""), null);
});

test("listing pages on other portals give their full facts, and Canada is in Canadian dollars", async () => {
  const { ldFacts } = await import("../src/listing.js");
  const html = `<script type="application/ld+json">${JSON.stringify({ "@type": ["RealEstateListing"], description: "Short.", offers: { "@type": "Offer", price: 1995000, priceCurrency: "USD" }, mainEntity: { "@type": "SingleFamilyResidence", numberOfBedrooms: 3, numberOfBathroomsTotal: 2, floorSize: { "@type": "QuantitativeValue", value: 2656, unitCode: "FTK" }, description: "Step into a slice of 1940s heaven that's been reimagined for the way we live today, with a new kitchen and a garden.", address: { "@type": "PostalAddress", streetAddress: "30 Whitwell Ave", addressLocality: "Newport", addressRegion: "RI" } } })}</script>`;
  const text = ldFacts(html);
  assert.match(text, /^30 Whitwell Ave, Newport, RI\. Price \$1,995,000\. 3 bed, 2 bath, 2,656 sq ft\. Step into a slice of 1940s heaven/);
  const p = parseListingText(text);
  assert.deepEqual([p.price, p.beds, p.baths, p.sqft, p.currency], [1995000, 3, 2, 2656, null]);
  assert.equal(parseListingText("1338 E 37th Ave, Vancouver, BC V5W 1G5. Price $1,638,000. 4 bed, 2 bath").currency, "CAD");
  assert.equal(parseListingText("215 Acton Avenue, Toronto, Ontario. $1,000,000, 3 bed").currency, "CAD");
  assert.equal(parseListingText("a 4-bed, 2-bath home, $334,999").baths, 2);
});

test("a rental is read as a rental, with its rent per month; a sale's HOA per month isn't rent", () => {
  const rent = parseListingText("2 bed condo in Midtown, Atlanta, GA. $2,400/mo, available now.");
  assert.equal(rent.deal, "rent");
  assert.equal(rent.price, 2400);
  assert.equal(formatPrice(rent.price, rent.currency, rent.deal), "$2,400/mo");
  assert.equal(shortPrice(15000, null, "rent"), "$15,000/mo");
  assert.equal(parseListingText("Downtown loft for rent, 1 bed 1 bath, $1850 a month").price, 1850);
  assert.equal(parseListingText("Rent: $3,200. 12 month lease. Pets allowed.").price, 3200);
  for (const sale of ["3 bed 2 bath craftsman, $649,000. HOA $250/mo.", "Duplex with rental income from the ADU. $899,000", "412 Oak Street, Austin, TX. $649,000"]) {
    assert.equal(parseDeal(sale), null, sale);
  }
  // The ads for it are written for renters.
  const ads = writeSet({ listing: { ...rent, city: "Atlanta", area: "Midtown", home_type: "condo" }, photos: [], brand: {} });
  const all = ads.map((a) => [a.overlay, a.kicker, a.headline, a.primary_text, a.name].join(" ")).join(" ");
  assert.match(all, /\$2,400\/mo/);
  assert.match(all, /For rent/);
  assert.doesNotMatch(all, /Just listed|\$2,400(?!\/mo)/);
  assert.ok(ads.every((a) => !houseRuleProblems(a.primary_text).length));
});

test("rental wording that excludes people is caught", () => {
  assert.deepEqual(checkWording("No Section 8. Students only.").map((f) => f.term), ["No Section 8", "Students only"]);
  assert.equal(checkWording("Mature tenants preferred")[0].level, "block");
});
