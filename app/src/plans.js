// The free plan and the paid plans, as decided (see CLAUDE.md, "Product decisions").
//
// Free: 3 ads in all, with no watermark, and they can be downloaded. Changes to those 3 are
// included. Any new ad after that (a new set, another ad, another listing's, even after deleting
// one) or pressing "run it" brings up the upgrade message in the chat.
// Paid plans (Ismael, 2026-10-30): priced by the agents whose names go on the ads, unlimited
// listings. Billed every month from the day they sign up (Ismael, 2026-10-27), cancel anytime, a
// flat price with no cut of ad spend. More than 20 agents is by quote.

import { get } from "./db.js";

export const FREE_AD_LIMIT = 3;
export const PLANS = [
  { id: "solo", name: "Solo", price: 99, agents: 1 },
  { id: "duo", name: "Duo", price: 149, agents: 2 },
  { id: "team", name: "Team", price: 299, agents: 5 },
  { id: "teamplus", name: "Team Plus", price: 549, agents: 10 },
  { id: "max", name: "Max", price: 799, agents: 15 },
  { id: "maxplus", name: "Max Plus", price: 999, agents: 20 },
];
export const PRICE_FROM = PLANS[0].price;
export const findPlan = (id) => PLANS.find((p) => p.id === id) || null;

export async function adsMade(workspaceId) {
  const row = await get(
    `SELECT (SELECT COUNT(*) FROM ads WHERE workspace_id = ?) + COALESCE((SELECT ads_removed FROM workspaces WHERE id = ?), 0) AS n`,
    [workspaceId, workspaceId]
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
  const short = `Plans start at $${PRICE_FROM} a month, billed monthly.`;
  if (reason === "run") return `Running ads requires an upgrade. ${short}`;
  if (reason === "plan") return `${short} Cancel anytime, and no cut of your ad spend. If you joined the waitlist, your first year is 30% off.`;
  if (reason === "saved") return `Your ${FREE_AD_LIMIT} free ads went on ${usedOn || "an earlier listing"}. This listing is saved. After upgrading, tap Create ads.`;
  return `You've used your ${FREE_AD_LIMIT} free ads. ${short}`;
}
