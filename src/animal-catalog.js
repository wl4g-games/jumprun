export const DEFAULT_ANIMAL_ID = "trex";

export const ANIMALS = Object.freeze([
  { id: "trex", name: "霸王龙", englishName: "T. rex", emoji: "🦖", tagline: "史前冲刺王", englishTagline: "Prehistoric sprinter" },
  { id: "leopard", name: "豹子", englishName: "Leopard", emoji: "🐆", tagline: "花斑闪电", englishTagline: "Spotted lightning" },
  { id: "rabbit", name: "兔子", englishName: "Rabbit", emoji: "🐇", tagline: "弹跳专家", englishTagline: "Jumping expert" },
  { id: "lion", name: "狮子", englishName: "Lion", emoji: "🦁", tagline: "草原小王者", englishTagline: "Savanna hero" },
  { id: "elephant", name: "大象", englishName: "Elephant", emoji: "🐘", tagline: "稳稳向前", englishTagline: "Steady explorer" },
  { id: "giraffe", name: "长颈鹿", englishName: "Giraffe", emoji: "🦒", tagline: "高空观察员", englishTagline: "Treetop lookout" },
  { id: "panda", name: "熊猫", englishName: "Panda", emoji: "🐼", tagline: "竹林滚滚", englishTagline: "Bamboo tumbler" },
  { id: "fox", name: "狐狸", englishName: "Fox", emoji: "🦊", tagline: "机敏探险家", englishTagline: "Clever adventurer" },
  { id: "monkey", name: "猴子", englishName: "Monkey", emoji: "🐒", tagline: "丛林飞跃者", englishTagline: "Jungle jumper" },
  { id: "penguin", name: "企鹅", englishName: "Penguin", emoji: "🐧", tagline: "冰原滑翔家", englishTagline: "Ice-field glider" }
]);

export function animalById(id) {
  return ANIMALS.find((animal) => animal.id === id) || ANIMALS[0];
}
