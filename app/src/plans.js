// The free plan and the paid plans, as decided (see CLAUDE.md, "Product decisions").
//
// Free (Ismael, 2026-11-01): unlimited chat (tips, advice, anything), and 1 piece of content in
// all, whatever it is (an ad, a post, a carousel, a story or a reel). Changes to it are included.
// Paid (Ismael, 2026-11-01): three plans, one agent each (a team gets a plan per agent for now).
// Billed every month from the day they sign up, cancel anytime, a flat price with no cut of ad
// spend. Checkout builds the price from this list, so Stripe needs no products set up.

import { get } from "./db.js";

// FREE_LIMIT only changes it for tests that need room to make a whole set.
export const FREE_AD_LIMIT = Number(process.env.FREE_LIMIT) || 1;
export const PLANS = [
  { id: "solo", name: "Solo", price: 99 },
  { id: "pro", name: "Pro", price: 149 },
  { id: "max", name: "Max", price: 199 },
];
export const PRICE_FROM = PLANS[0].price;
export const findPlan = (id) => PLANS.find((p) => p.id === id) || null;

export async function adsMade(workspaceId) {
  const row = await get(
    `SELECT (SELECT COUNT(*) FROM ads WHERE workspace_id = ?) + (SELECT COUNT(*) FROM creations WHERE workspace_id = ?) + COALESCE((SELECT ads_removed FROM workspaces WHERE id = ?), 0) AS n`,
    [workspaceId, workspaceId, workspaceId]
  );
  return Number(row?.n || 0);
}

export function isPaid(workspace) {
  return workspace.plan === "paid";
}

// The paid plan a workspace is on. Pilots and accounts from before the plans were named are Solo.
export function planOf(workspace) {
  return isPaid(workspace) ? findPlan(workspace.tier) || PLANS[0] : null;
}

export async function canMake(workspace, count) {
  if (isPaid(workspace)) return true;
  return (await adsMade(workspace.id)) + count <= FREE_AD_LIMIT;
}

export function upgradeText(reason, { usedOn } = {}) {
  if (reason === "run") return "Running ads requires an upgrade.";
  if (reason === "plan") return `Plans start at $${PRICE_FROM}/month. No cut of your ad spend.`;
  if (reason === "saved") return `Your free creation went on ${usedOn || "an earlier listing"}. This listing is saved. Upgrade, then tap Create ads.`;
  return "You've used your free creation. New ones require an upgrade.";
}
