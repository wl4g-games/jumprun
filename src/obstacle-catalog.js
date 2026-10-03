export const OBSTACLE_SPECIES = Object.freeze([
  { id: "cactus", name: "仙人掌", tier: "plant" },
  { id: "jackal", name: "豺", tier: "wild" },
  { id: "wolf", name: "狼", tier: "wild" },
  { id: "tiger", name: "虎", tier: "wild" },
  { id: "leopard", name: "豹", tier: "wild" },
  { id: "boar", name: "野猪", tier: "wild" },
  { id: "saber", name: "剑齿虎", tier: "ancient" },
  { id: "qilin", name: "麒麟", tier: "myth" },
  { id: "pixiu", name: "貔貅", tier: "myth" },
  { id: "taotie", name: "饕餮", tier: "myth" }
]);

const BY_TIER = Object.freeze({
  wild: OBSTACLE_SPECIES.filter((item) => item.tier === "wild"),
  ancient: OBSTACLE_SPECIES.filter((item) => item.tier === "ancient"),
  myth: OBSTACLE_SPECIES.filter((item) => item.tier === "myth")
});

const pick = (items, random) => items[Math.min(items.length - 1, Math.floor(random() * items.length))].id;

export function obstacleSpecies(score, spawned, random = Math.random) {
  if (spawned < 4 || score < 5) return "cactus";
  const roll = random();
  if (score >= 20 && roll < 0.2) return pick(BY_TIER.myth, random);
  if (score >= 12 && roll < 0.38) return pick([...BY_TIER.ancient, ...BY_TIER.wild], random);
  return roll < 0.18 ? "cactus" : pick(BY_TIER.wild, random);
}

export function obstacleById(id) {
  return OBSTACLE_SPECIES.find((item) => item.id === id) || OBSTACLE_SPECIES[0];
}
