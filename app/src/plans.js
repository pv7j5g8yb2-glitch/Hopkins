// The free plan and Pro, as decided (see CLAUDE.md, "Product decisions").
//
// Free: 3 ads in all, with no watermark, and they can be downloaded. Changes to those 3 are
// included. Any new ad after that (a new set, another ad, another listing's, even after deleting
// one) or pressing "run it" brings up the upgrade message in the chat.
// Pro: billed every month, from the day they sign up (Ismael, 2026-10-27). Cancel anytime, a flat
// price with no cut of ad spend. From $299 a month.

import { get } from "./db.js";

export const FREE_AD_LIMIT = 3;
export const PRICE_FROM = 299;

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

export async function canMake(workspace, count) {
  if (isPaid(workspace)) return true;
  return (await adsMade(workspace.id)) + count <= FREE_AD_LIMIT;
}

export function upgradeText(reason, { usedOn } = {}) {
  const short = `Pro is from $${PRICE_FROM} a month, billed monthly.`;
  if (reason === "run") return `Running ads is on Pro. ${short}`;
  if (reason === "plan") return `${short} Cancel anytime, and no cut of your ad spend. If you joined the waitlist, your first year is 30% off.`;
  if (reason === "saved") return `Your ${FREE_AD_LIMIT} free ads went on ${usedOn || "an earlier listing"}. This listing is saved. On Pro, tap Make the ads.`;
  return `That's your ${FREE_AD_LIMIT} free ads. ${short}`;
}
