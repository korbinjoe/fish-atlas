import type { Tank } from "./planner";

export type TankPreset = {
  id: string;
  water: Tank["water"];
  label: string;
  length: number;
  width: number;
  height: number;
  note: string;
  recommended?: boolean;
};

export type TankScenario = {
  id: string;
  label: string;
  description: string;
  presetId: string;
  temperature: number;
  ph: number;
  hardness: number | null;
  specificGravity: number | null;
  sources: string[];
};

// Example outer dimensions in centimetres, not promises about a product's inner capacity.
export const tankPresets: TankPreset[] = [
  { id: "fresh-30", water: "freshwater", label: "30 cm 微缸", length: 30, width: 20, height: 25, note: "空间小，鱼种选择受限" },
  { id: "fresh-45", water: "freshwater", label: "45 cm 小缸", length: 45, width: 30, height: 30, note: "适合先筛选小型鱼" },
  { id: "fresh-60", water: "freshwater", label: "60 cm 标准缸", length: 60, width: 30, height: 36, note: "淡水入门参考", recommended: true },
  { id: "fresh-90", water: "freshwater", label: "90 cm 中缸", length: 90, width: 45, height: 45, note: "游动空间更宽裕" },
  { id: "fresh-120", water: "freshwater", label: "120 cm 大缸", length: 120, width: 50, height: 50, note: "需核对承重与维护" },
  { id: "marine-60", water: "marine", label: "60 cm 海缸", length: 60, width: 40, height: 40, note: "小系统需更密切监测" },
  { id: "marine-90", water: "marine", label: "90 cm 海缸", length: 90, width: 45, height: 40, note: "海水入门参考", recommended: true },
  { id: "marine-120", water: "marine", label: "120 cm 海缸", length: 120, width: 50, height: 50, note: "需规划设备与承重" },
];

// Planning examples within cited husbandry ranges, never measurements of the user's water.
export const tankScenarios: TankScenario[] = [
  {
    id: "community", label: "普通热带淡水", description: "新手先从这里开始；以常见社区鱼为筛选起点。",
    presetId: "fresh-60", temperature: 25, ph: 7, hardness: 6, specificGravity: null,
    sources: ["https://www.aquariumcoop.com/blogs/aquarium/how-to-set-up-a-fish-tank", "https://www.aquariumcoop.com/blogs/aquarium/aquarium-water-testing"],
  },
  {
    id: "softwater", label: "偏软水鱼", description: "适合先查看部分南美与东南亚小型鱼。",
    presetId: "fresh-60", temperature: 25, ph: 6.5, hardness: 4, specificGravity: null,
    sources: ["https://www.aquariumcoop.com/blogs/aquarium/soft-water-fish", "https://www.aquariumcoop.com/blogs/aquarium/ph-gh-kh"],
  },
  {
    id: "rift-lake", label: "东非湖慈鲷", description: "偏碱性硬水；仍要逐种核对领地和缸长。",
    presetId: "fresh-120", temperature: 26, ph: 8.2, hardness: 12, specificGravity: null,
    sources: ["https://www.seriouslyfish.com/species/labidochromis-caeruleus", "https://www.aquariumcoop.com/blogs/aquarium/top-10-cichlids"],
  },
  {
    id: "marine", label: "海水鱼缸", description: "海水入门规划起点；盐度必须配水后测量。",
    presetId: "marine-90", temperature: 25, ph: 8.2, hardness: null, specificGravity: 1.025,
    sources: ["https://www.bulkreefsupply.com/content/post/reef-tank-parameters", "https://www.bulkreefsupply.com/content/post/saltwater-aquarium-beginners-guide-episode-3"],
  },
];

export function grossLiters(preset: TankPreset): number {
  return (preset.length * preset.width * preset.height) / 1000;
}

// A deliberately rough starting value; actual water displacement must be measured.
export function estimatedEffectiveLiters(preset: TankPreset): number {
  return Math.round(grossLiters(preset) * 0.8);
}

export function applyTankPreset(values: Record<string, string>, preset: TankPreset): Record<string, string> {
  return {
    ...values,
    water: preset.water,
    length: String(preset.length),
    width: String(preset.width),
    height: String(preset.height),
    volume: String(estimatedEffectiveLiters(preset)),
  };
}

export function applyTankScenario(values: Record<string, string>, scenario: TankScenario): Record<string, string> {
  const preset = tankPresets.find((item) => item.id === scenario.presetId);
  if (!preset) throw new Error(`Unknown tank preset: ${scenario.presetId}`);
  return {
    ...applyTankPreset(values, preset),
    temperature: String(scenario.temperature),
    ph: String(scenario.ph),
    hardness: scenario.hardness === null ? "" : String(scenario.hardness),
    specificGravity: scenario.specificGravity === null ? "" : String(scenario.specificGravity),
  };
}

export function matchesTankScenario(values: Record<string, string>, scenario: TankScenario): boolean {
  const preset = tankPresets.find((item) => item.id === scenario.presetId);
  return !!preset && values.water === preset.water &&
    values.temperature === String(scenario.temperature) &&
    values.ph === String(scenario.ph) &&
    values.hardness === (scenario.hardness === null ? "" : String(scenario.hardness)) &&
    values.specificGravity === (scenario.specificGravity === null ? "" : String(scenario.specificGravity));
}

export function matchesTankPreset(values: Record<string, string>, preset: TankPreset): boolean {
  return values.water === preset.water &&
    values.length === String(preset.length) &&
    values.width === String(preset.width) &&
    values.height === String(preset.height);
}
