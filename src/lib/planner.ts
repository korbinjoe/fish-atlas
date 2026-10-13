import { z } from "zod";
import type { Fish } from "./model";
import rawRules from "../../content/enrichment/behavior-rules.json";
export const tankSchema = z.object({
  water: z.enum(["freshwater", "marine"]),
  length: z.number().positive().max(2000).nullable(),
  width: z.number().positive().max(2000).nullable(),
  height: z.number().positive().max(2000).nullable(),
  volume: z.number().positive().max(100000).nullable(),
  temperature: z.number().min(0).max(45).nullable(),
  ph: z.number().min(0).max(14).nullable(),
  hardness: z.number().min(0).max(100).nullable(),
  specificGravity: z.number().min(1).max(1.05).nullable(),
});
export type Tank = z.infer<typeof tankSchema>;
export type Stock = { id: string; count: number };
export type Finding = {
  code: string;
  level: "conflict" | "caution" | "unknown";
  text: string;
  sources: string[];
};
type Behavior = {
  minGroup?: number;
  solitary?: boolean;
  territorial?: boolean;
  finNipper?: boolean;
  longFins?: boolean;
  prey?: string[];
  source: string;
  note: string;
};
export const rules: Record<string, Behavior> = rawRules;
export function recommendedStockCount(f: Fish): number {
  const behavior = rules[f.id];
  return behavior?.solitary ? 1 : behavior?.minGroup ?? 1;
}
export const emptyTank: Tank = {
  water: "freshwater",
  length: null,
  width: null,
  height: null,
  volume: null,
  temperature: null,
  ph: null,
  hardness: null,
  specificGravity: null,
};
export function assessFish(f: Fish, t: Tank, count = 1): Finding[] {
  const a: Finding[] = [];
  const add = (code: string, level: Finding["level"], text: string) =>
    a.push({ code, level, text, sources: [f.sourceUrl] });
  if (f.water !== t.water) {
    add(
      "water",
      "conflict",
      `${f.name}属于${f.water === "marine" ? "海水" : "淡水"}鱼，与当前水体类型不同。`,
    );
    return a;
  }
  const checks: [string, string, number | null, number | null][] = [
    ["length", "缸长", t.length, f.tank],
    ["width", "缸宽", t.width, f.tankWidth],
    ["height", "缸高", t.height, f.tankHeight],
  ];
  if (f.minVolume !== null)
    checks.push(["volume", "有效水量（L）", t.volume, f.minVolume]);
  for (const [key, label, input, min] of checks) {
    if (min === null) {
      if (key === "length" && f.minVolume === null)
        add(key, "unknown", `${f.name}的${label}参考值缺失。`);
      continue;
    }
    if (input === null)
      add(
        key,
        "unknown",
        `未输入${label}，无法与${f.name}的来源参考 ${min} 比较。`,
      );
    else if (input < min)
      add(
        key,
        "conflict",
        `${label} ${input} 小于${f.name}的来源参考 ${min}。`,
      );
  }
  for (const [key, label, input, range] of [
    ["temperature", "水温", t.temperature, f.temperature],
    ["ph", "pH", t.ph, f.ph],
    ...(f.water === "freshwater"
      ? [["hardness", "硬度 dGH", t.hardness, f.hardness]]
      : [["specificGravity", "比重 SG", t.specificGravity, f.specificGravity]]),
  ] as [string, string, number | null, [number, number] | null][]) {
    if (range === null)
      add(key, "unknown", `${f.name}的${label}参考范围缺失。`);
    else if (input === null)
      add(key, "unknown", `未输入${label}，无法核对${f.name}。`);
    else if (input < range[0] || input > range[1])
      add(
        key,
        "conflict",
        `${label} ${input} 超出${f.name}的来源范围 ${range[0]}–${range[1]}。`,
      );
  }
  if (f.reviewStatus !== "source-checked")
    add("review", "unknown", `${f.name}的参数尚待来源核对。`);
  const b = rules[f.id];
  if (b?.minGroup && count < b.minGroup)
    add(
      "group",
      "caution",
      `${f.name}当前 ${count} 条，来源建议群体至少 ${b.minGroup} 条；增加数量也要重新评估空间。`,
    );
  if (b?.solitary && count > 1)
    add(
      "solitary",
      "conflict",
      `${f.name}通常建议单养，当前选择了 ${count} 条。`,
    );
  if (b?.territorial && count > 1 && !b.solitary)
    add("territory", "caution", `${f.name}存在同类领地风险；${b.note}`);
  if (!b)
    add(
      "behavior-coverage",
      "unknown",
      `${f.name}尚未编入结构化行为规则，请阅读详情中的相处说明。`,
    );
  return a;
}
export function assessPairs(stock: Stock[], fishes: Fish[]): Finding[] {
  const a: Finding[] = [];
  for (let i = 0; i < stock.length; i++)
    for (let j = i + 1; j < stock.length; j++) {
      const f = fishes.find((f) => f.id === stock[i].id),
        g = fishes.find((f) => f.id === stock[j].id);
      if (!f || !g) continue;
      const prefix = `${f.name} × ${g.name}：`;
      const add = (
        code: string,
        level: Finding["level"],
        text: string,
        sources = [f.sourceUrl, g.sourceUrl],
      ) =>
        a.push({
          code: `${f.id}:${g.id}:${code}`,
          level,
          text: prefix + text,
          sources: [...new Set(sources)],
        });
      if (f.water !== g.water) {
        add("water", "conflict", "淡水与海水类型不同，不能按同一水体混养。");
        continue;
      }
      for (const key of [
        "temperature",
        "ph",
        f.water === "marine" ? "specificGravity" : "hardness",
      ] as const) {
        const x = f[key],
          y = g[key];
        if (x && y && Math.max(x[0], y[0]) > Math.min(x[1], y[1]))
          add(
            key,
            "conflict",
            `${{ temperature: "水温", ph: "pH", specificGravity: "比重", hardness: "硬度" }[key]}参考范围不重叠。`,
          );
      }
      const x = rules[f.id],
        y = rules[g.id];
      if (x?.solitary || y?.solitary)
        add(
          "solitary",
          "caution",
          "其中有通常建议单养的鱼，不能因水质范围重叠就确定混养。",
        );
      if ((x?.finNipper && y?.longFins) || (y?.finNipper && x?.longFins))
        add("fins", "conflict", "咬鳍行为与延长鳍形存在冲突，需避免这一组合。");
      if (x?.prey?.includes(g.id) || y?.prey?.includes(f.id))
        add(
          "predation",
          "conflict",
          "存在大型鱼吞食小型同伴的风险；不要按幼鱼体型推断。",
        );
      if (x?.territorial || y?.territorial)
        add(
          "territory",
          "caution",
          "存在领地行为，需核对成鱼、繁殖状态、性别与遮蔽物分区。",
        );
      add(
        "coverage",
        "unknown",
        "当前仅检查已收录规则；食物竞争、疾病、实际品系与负载没有完整评估。",
      );
    }
  return a;
}
export function parsePlan(
  raw: unknown,
  fishes: Fish[],
): { tank: Tank; stock: Stock[] } | null {
  const r = z
    .object({
      version: z.literal(1),
      tank: tankSchema,
      stock: z
        .array(
          z.object({ id: z.string(), count: z.number().int().min(1).max(200) }),
        )
        .max(6),
    })
    .safeParse(raw);
  if (
    !r.success ||
    new Set(r.data.stock.map((s) => s.id)).size !== r.data.stock.length ||
    r.data.stock.some((s) => !fishes.some((f) => f.id === s.id))
  )
    return null;
  return { tank: r.data.tank, stock: r.data.stock };
}
