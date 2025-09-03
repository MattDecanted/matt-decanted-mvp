// src/lib/entitlements.ts
export type Tier = 'free'|'pro'|'vip';

export function tierAtLeast(user: Tier, needed: Tier) {
  const order: Tier[] = ['free','pro','vip'];
  return order.indexOf(user) >= order.indexOf(needed);
}

export function hasAccess(
  userTier: Tier,
  userPoints: number,
  requiredTier: Tier,
  requiredPoints: number
) {
  return tierAtLeast(userTier, requiredTier) && userPoints >= (requiredPoints || 0);
}
