import { z } from "zod";

export const regionSchema = z.enum(["amazon", "asia", "africa", "reef"]);
export type RegionId = z.infer<typeof regionSchema>;
const range = z
  .tuple([z.number(), z.number()])
  .refine(([a, b]) => a <= b, "Invalid range");
export const fishSchema = z.object({
  id: z.string(),
  name: z.string(),
  scientific: z.string(),
  aliases: z.array(z.string()),
  region: regionSchema,
  water: z.enum(["freshwater", "marine"]).default("freshwater"),
  tankWidth: z.number().positive().nullable().default(null),
  tankHeight: z.number().positive().nullable().default(null),
  minVolume: z.number().positive().nullable().default(null),
  specificGravity: range.nullable().default(null),
  tankNote: z
    .string()
    .default("缸体尺寸是来源的参考起点，混养和群体数量需要另行评估。"),
  parameterNote: z
    .string()
    .default("数值为来源参考范围，不是长期目标值；范围端点不能自动视为适宜。"),
  distributionSource: z.url().optional(),
  lengthSource: z.url().optional(),
  family: z.string(),
  habitat: z.string(),
  description: z.string(),
  distribution: z.string(),
  behavior: z.string(),
  caution: z.string(),
  color: z.string(),
  shape: z.enum(["slender", "round", "angel", "betta", "loach"]),
  length: z.number().nullable(),
  lengthType: z.string(),
  tank: z.number().nullable(),
  temperature: range.nullable(),
  ph: range.nullable(),
  hardness: range.nullable(),
  sourceUrl: z.url(),
  sourceTitle: z.string(),
  accessedAt: z.string(),
  reviewStatus: z.enum(["source-checked", "needs-review"]),
  photo: z
    .object({
      path: z.string(),
      author: z.string(),
      license: z.string(),
      licenseUrl: z.string(),
      pageUrl: z.url(),
      caption: z.string(),
    })
    .nullable(),
});
export type Fish = z.infer<typeof fishSchema>;
export const regions: {
  id: RegionId;
  name: string;
  english: string;
  subtitle: string;
  coordinates: [number, number];
  color: string;
  description: string;
}[] = [
  {
    id: "amazon",
    name: "亚马孙流域",
    english: "AMAZON BASIN",
    subtitle: "南美洲 · 热带雨林",
    coordinates: [-63, -5],
    color: "#85d5b0",
    description: "沿着雨林中的河流与支流，寻找灯鱼、短鲷和神仙鱼的故乡。",
  },
  {
    id: "asia",
    name: "东南亚水域",
    english: "SOUTHEAST ASIA",
    subtitle: "亚洲 · 季风水域",
    coordinates: [105, 6],
    color: "#e4b67d",
    description: "从林间溪流到沼泽与缓流水域，探索波鱼和迷鳃鱼的世界。",
  },
  {
    id: "africa",
    name: "东非湖区",
    english: "EAST AFRICAN LAKES",
    subtitle: "非洲 · 古老湖泊",
    coordinates: [32, -7],
    color: "#9cbde5",
    description:
      "坦噶尼喀湖与马拉维湖有着不同的鱼类群落；每张图鉴标注具体湖泊。",
  },
  {
    id: "reef",
    name: "印太珊瑚礁",
    english: "INDO-PACIFIC REEFS",
    subtitle: "海水 · 礁区与海草床",
    coordinates: [125, -5],
    color: "#e3a3a0",
    description:
      "从海葵间的小丑鱼到开阔礁区的蓝倒吊；具体分布以各物种资料为准。",
  },
];

export function filterFish(
  fish: Fish[],
  query: string,
  region: string,
  size: string,
  savedOnly: boolean,
  saved: string[],
) {
  const q = query.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  return fish.filter(
    (f) =>
      (!region || f.region === region) &&
      (!savedOnly || saved.includes(f.id)) &&
      (!q ||
        [f.name, f.scientific, ...f.aliases].some((x) =>
          x.toLocaleLowerCase().includes(q),
        )) &&
      (!size ||
        (f.length !== null &&
          (size === "small"
            ? f.length <= 5
            : size === "medium"
              ? f.length > 5 && f.length <= 12
              : f.length > 12))),
  );
}
export function rangeText(value: [number, number] | null, unit = "") {
  return value ? `${value[0]}–${value[1]}${unit}` : "资料待补充";
}
export function latLonToXYZ(
  lon: number,
  lat: number,
  r = 1,
): [number, number, number] {
  const a = (lat * Math.PI) / 180,
    b = (lon * Math.PI) / 180;
  return [
    r * Math.cos(a) * Math.cos(b),
    r * Math.sin(a),
    -r * Math.cos(a) * Math.sin(b),
  ];
}
export function readSaved(storage: Pick<Storage, "getItem"> | null): string[] {
  try {
    const data = JSON.parse(storage?.getItem("fish-atlas:v1") ?? "null");
    return data?.version === 1 && Array.isArray(data.saved)
      ? data.saved.filter((v: unknown) => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}
