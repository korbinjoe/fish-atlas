import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FishImage } from "./FishArt";
import ImeInput from "./ImeInput";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { rangeText } from "../lib/model";
import type { Fish } from "../lib/model";
import { useI18n } from "../i18n";
import {
  assessFish,
  assessPairs,
  emptyTank,
  parsePlan,
  recommendedStockCount,
  rules,
  tankSchema,
} from "../lib/planner";
import type { Tank, Stock, Finding } from "../lib/planner";
import {
  applyTankPreset,
  applyTankScenario,
  matchesTankPreset,
  matchesTankScenario,
  tankPresets,
  tankScenarios,
} from "../lib/tankPresets";
const fields = [
  ["length", "缸长 cm"],
  ["width", "缸宽 cm"],
  ["height", "缸高 cm"],
  ["volume", "有效水量 L"],
  ["temperature", "水温 °C"],
  ["ph", "pH"],
  ["hardness", "硬度 dGH"],
  ["specificGravity", "比重 SG"],
] as const;
const fieldHelp: Partial<Record<(typeof fields)[number][0], string>> = {
  volume: "模板值是估算，布景完成后按实际水量修改。",
  temperature: "用温度计测量；不同鱼种的需求可能不同。",
  ph: "酸碱度，7 为中性；开缸后用试剂测量。",
  hardness: "淡水总硬度，表示水中矿物质含量；可用试纸测量。",
  specificGravity: "海水盐度指标；配水后用盐度计测量。",
};
function tankInputs(tank: Tank): Record<string, string> {
  return Object.fromEntries(Object.entries(tank).map(([key, value]) => [key, value === null ? "" : String(value)]));
}
function QuantityInput({ fish, count, suggested, onChange }: { fish: Fish; count: number; suggested: number; onChange: (count: number) => void }) {
  const { t, fishName } = useI18n();
  const [draft, setDraft] = useState(String(count));
  useEffect(() => setDraft(String(count)), [count]);
  return (
    <div className="stock-quantity">
      <span id={`quantity-label-${fish.id}`}>{t("数量")}</span>
      <div className="stock-quantity-control">
        <button type="button" aria-label={t("减少{name}数量", { name: fishName(fish) })} disabled={count <= 1} onClick={() => onChange(count - 1)}>−</button>
        <Input
          aria-label={t("{name}数量", { name: fishName(fish) })}
          aria-describedby={`quantity-label-${fish.id}`}
          aria-invalid={draft !== "" && (!Number.isInteger(Number(draft)) || Number(draft) < 1 || Number(draft) > 200)}
          type="number" min="1" max="200" step="1" inputMode="numeric"
          value={draft}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            const n = Number(next);
            if (next !== "" && Number.isInteger(n) && n >= 1 && n <= 200) onChange(n);
          }}
          onBlur={() => {
            const n = Number(draft);
            if (draft === "" || !Number.isInteger(n)) setDraft(String(count));
            else if (n < 1 || n > 200) {
              const clamped = Math.min(200, Math.max(1, n));
              setDraft(String(clamped));
              onChange(clamped);
            }
          }}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        />
        <button type="button" aria-label={t("增加{name}数量", { name: fishName(fish) })} disabled={count >= 200} onClick={() => onChange(count + 1)}>+</button>
      </div>
      {suggested > 1 && <small>{t("建议至少 {count} 条", { count: suggested })}</small>}
    </div>
  );
}
type I18n = ReturnType<typeof useI18n>;
function translatedValues(values: Record<string, string | number> | undefined, t: I18n["t"]) {
  return Object.fromEntries(Object.entries(values ?? {}).map(([key, value]) => [key, typeof value === "string" ? t(value) : value]));
}
function findingText(finding: Finding, i18n: I18n): string {
  const { locale, t, fishName } = i18n;
  if (locale === "zh" || !finding.i18n) return t(finding.text);
  const { key, values, fish, pair } = finding.i18n;
  const text = t(key, { ...translatedValues(values, t), ...(fish ? { name: fishName(fish) } : {}) });
  return pair ? t("{first} × {second}：{message}", { first: fishName(pair[0]), second: fishName(pair[1]), message: text }) : text;
}
function attentionSummary(f: Fish, tank: Tank, finding: Finding, count: number, i18n: I18n): string {
  const { t } = i18n;
  const dimension = {
    length: ["缸长", tank.length, f.tank],
    width: ["缸宽", tank.width, f.tankWidth],
    height: ["缸高", tank.height, f.tankHeight],
    volume: ["有效水量", tank.volume, f.minVolume],
  }[finding.code] as [string, number | null, number | null] | undefined;
  if (dimension && dimension[1] !== null && dimension[2] !== null) {
    const unit = finding.code === "volume" ? "L" : "cm";
    return t("{label}不足：当前 {current} {unit}，参考起点 {min} {unit}。", { label: t(dimension[0]), current: dimension[1], min: dimension[2], unit });
  }
  const waterValue = {
    temperature: ["水温", tank.temperature, f.temperature, "°C"],
    ph: ["pH", tank.ph, f.ph, ""],
    hardness: ["硬度", tank.hardness, f.hardness, " dGH"],
    specificGravity: ["比重", tank.specificGravity, f.specificGravity, ""],
  }[finding.code] as [string, number | null, [number, number] | null, string] | undefined;
  if (waterValue && waterValue[1] !== null && waterValue[2]) {
    return t("{label}超出范围：当前 {current}{unit}，鱼种参考 {range}。", { label: t(waterValue[0]), current: waterValue[1], unit: waterValue[3], range: rangeText(waterValue[2], waterValue[3]) });
  }
  if (finding.code === "water") return t("水体不符：这条鱼需要{water}。", { water: t(f.water === "marine" ? "海水" : "淡水") });
  if (finding.code === "group" && rules[f.id]?.minGroup) return t("建议至少 {min} 条群养；目前按 {count} 条评估。", { min: rules[f.id].minGroup!, count });
  if (finding.code === "solitary") return t("通常建议单养；目前计划 {count} 条。", { count });
  if (finding.code === "territory") return t("同类可能争夺地盘，需要规划躲避空间。");
  return findingText(finding, i18n);
}
export function Findings({ items }: { items: Finding[] }) {
  const i18n = useI18n();
  const { t } = i18n;
  return (
    <ul className="findings">
      {items.map((v, i) => (
        <li key={`${v.code}-${i}`} className={`finding ${v.level}`}>
          <strong>
            {v.level === "conflict"
              ? t("发现冲突")
              : v.level === "caution"
                ? t("需要注意")
                : t("尚待核对")}
          </strong>
          <span>{findingText(v, i18n)}</span>
          <small>
            {v.sources.map((url, j) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                {t("来源{number}", { number: v.sources.length > 1 ? j + 1 : "" })} ↗
              </a>
            ))}
          </small>
        </li>
      ))}
    </ul>
  );
}
export function PairFindings({
  stock,
  fishes,
}: {
  stock: Stock[];
  fishes: Fish[];
}) {
  return <Findings items={assessPairs(stock, fishes)} />;
}
export default function Planner({
  fishes,
  onFish,
}: {
  fishes: Fish[];
  onFish: (f: Fish, findings?: Finding[]) => void;
}) {
  const i18n = useI18n();
  const { t, fishName, fishText } = i18n;
  const [params, setParams] = useSearchParams();
  const initial = useMemo(() => {
    try {
      return parsePlan(JSON.parse(params.get("plan") ?? "null"), fishes);
    } catch {
      return null;
    }
  }, []);
  const [values, setValues] = useState<Record<string, string>>(() =>
    initial ? tankInputs(initial.tank) : applyTankScenario(tankInputs(emptyTank), tankScenarios[0]),
  );
  const [stock, setStock] = useState<Stock[]>(initial?.stock ?? []);
  const [message, setMessageValue] = useState<{ key: string; values?: Record<string, string | number>; fish?: Fish } | null>(
    params.has("plan") && !initial ? { key: "链接中的规划无效，已打开入门示例。" } : null,
  );
  function setMessage(key: string, values?: Record<string, string | number>, fish?: Fish) { setMessageValue({ key, values, fish }); }
  const [query, setQuery] = useState("");
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const activeScenario = tankScenarios.find((scenario) => matchesTankScenario(values, scenario));
  const raw = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [
      k,
      k === "water" ? v : v.trim() === "" ? null : Number(v),
    ]),
  );
  const parsed = tankSchema.safeParse(raw);
  const tank = parsed.success ? parsed.data : null;
  const geometry =
    tank?.length && tank.width && tank.height
      ? (tank.length * tank.width * tank.height) / 1000
      : null;
  const volumeInvalid = !!(geometry && tank?.volume && tank.volume > geometry);
  const valid = !!tank && !volumeInvalid;
  const scored = tank
    ? fishes
        .filter((f) =>
          [fishName(f), f.name, f.scientific, ...f.aliases].some((x) =>
            x.toLowerCase().includes(query.trim().toLowerCase()),
          ),
        )
        .map((f) => ({
          f,
          issues: assessFish(
            f,
            tank,
            stock.find((s) => s.id === f.id)?.count ?? recommendedStockCount(f),
          ),
        }))
    : [];
  const candidates = scored
    .filter(
      (x) => !onlyCompatible || !x.issues.some((i) => i.level === "conflict"),
    )
    .sort(
      (a, b) =>
        a.issues.filter((i) => i.level === "conflict").length -
        b.issues.filter((i) => i.level === "conflict").length,
    );
  const selectedFindings = valid && tank
    ? stock.flatMap((item) => {
        const fish = fishes.find((candidate) => candidate.id === item.id);
        return fish ? assessFish(fish, tank, item.count) : [];
      }).concat(assessPairs(stock, fishes))
    : [];
  const conflictCount = selectedFindings.filter((item) => item.level === "conflict").length;
  const cautionCount = selectedFindings.filter((item) => item.level === "caution").length;
  const planSummary = !valid
    ? t("先修正鱼缸参数")
    : !stock.length
      ? t("选鱼后查看风险")
      : conflictCount
        ? t("{count} 项冲突待处理", { count: conflictCount })
        : cautionCount
          ? t("{count} 项提醒待查看", { count: cautionCount })
          : t("暂无已发现的冲突");
  const selectedPreset = tankPresets.find((preset) => matchesTankPreset(values, preset));
  function showStock() {
    document.getElementById("planner-stock")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function showCandidates() {
    document.getElementById("planner-candidates")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function usePlan(value: { tank: Tank; stock: Stock[] }) {
    setValues(tankInputs(value.tank));
    setStock(value.stock);
    setMessage("已读取本机规划。");
  }
  function save() {
    if (!valid) return;
    try {
      localStorage.setItem(
        "fish-atlas:plan:v1",
        JSON.stringify({ version: 1, tank, stock }),
      );
      setMessage("规划已保存在当前浏览器。");
    } catch {
      setMessage("浏览器存储不可用，请使用分享链接保存规划。");
    }
  }
  function share() {
    if (!valid) return;
    const p = new URLSearchParams();
    p.set("plan", JSON.stringify({ version: 1, tank, stock }));
    setParams(p, { replace: true });
    setMessage("地址栏已更新为可恢复的规划链接，可以复制分享。");
  }
  return (
    <section className="planner-page">
      <div className="eyebrow">{t("PLAN WITH CONTEXT")}</div>
      <h1>{t("一起规划你的鱼缸")}</h1>
      <p className="planner-intro">
        {t("从常见方案开始，挑鱼后会提示尺寸、水质和混养上需要核对的地方。")}
      </p>
      <div className="planner-layout">
        <aside className="tank-form">
          <div className="planner-step-heading">
            <span className="planner-step-number">01</span>
            <div>
              <h2>{t("定一个起点")}</h2>
              <p>{t("不确定参数？先用默认方案，后面选鱼时再微调。")}</p>
            </div>
          </div>
          <section className="tank-scenarios" aria-label={t("入门养鱼方案")}>
            <h3>{t("想养哪一类鱼？")}</h3>
            <div className="tank-scenario-grid">
              {tankScenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  className="tank-scenario"
                  aria-pressed={matchesTankScenario(values, scenario)}
                  onClick={() => {
                    setValues(applyTankScenario(values, scenario));
                    setMessage("已套用{label}示例。水质数字是规划假设，放鱼前请实测。", { label: scenario.label });
                  }}
                >
                  <strong>{t(scenario.label)}</strong>
                  <small>{t(scenario.description)}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="tank-presets" aria-label={t("常见鱼缸规格")}>
            <h3>{t("鱼缸准备多长？")}</h3>
            <div className="tank-preset-grid">
              {tankPresets.filter((preset) => preset.water === values.water).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="tank-preset"
                  aria-pressed={matchesTankPreset(values, preset)}
                  onClick={() => {
                    setValues(applyTankPreset(values, preset));
                    setMessage("已套用 {label}；有效水量是估算值，请按实际水位和造景修改。", { label: preset.label });
                  }}
                >
                  <strong>{preset.length} cm</strong>
                  {preset.recommended && <em>{t("入门参考")}</em>}
                </button>
              ))}
            </div>
          </section>
          <div className="tank-current" aria-live="polite">
            <span>{t("当前鱼缸")}</span>
            <strong>{selectedPreset ? t(selectedPreset.label) : t("{length} cm 自定义鱼缸", { length: values.length || "?" })}</strong>
            <p>{t("{length} × {width} × {height} cm · 暂估有效水量 {volume} L", { length: values.length || "?", width: values.width || "?", height: values.height || "?", volume: values.volume || "?" })}</p>
            <p>{t(values.water === "marine" ? "海水" : "淡水")} · {values.temperature || "?"}°C · pH {values.ph || "?"} · {values.water === "marine" ? t("比重 {value}", { value: values.specificGravity || "?" }) : `${values.hardness || "?"} dGH`}</p>
            {selectedPreset && <p>{t(selectedPreset.note)}</p>}
          </div>
          <p className="planner-assumption">{t("以上为规划示例值，并非已测水质或可养鱼数量。开缸后仍要实测并建立稳定过滤。")}</p>
          <details className="planner-advanced">
            <summary>{t("我的尺寸或水质不同？修改详细参数")}</summary>
            <div className="planner-advanced-body">
              <div className="planner-water-select">
                <span id="water-type-label">{t("水体类型（可手动切换）")}</span>
                <Select
                  value={values.water}
                  onValueChange={(water) => {
                    const scenario = tankScenarios.find((item) => item.id === (water === "marine" ? "marine" : "community"))!;
                    setValues(applyTankScenario(values, scenario));
                    setMessage("已切换为{label}示例；尺寸和水质参数可继续修改。", { label: scenario.label });
                  }}
                >
                  <SelectTrigger aria-label={t("水体类型（可手动切换）")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="freshwater">{t("淡水")}</SelectItem>
                    <SelectItem value="marine">{t("海水")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="tank-fields">
                {fields.filter(([key]) => key !== (values.water === "marine" ? "hardness" : "specificGravity")).map(([key, label]) => (
                  <label key={key}>
                    {t(label)}
                    <Input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      aria-label={t(label)}
                      value={values[key]}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      placeholder={t("未知")}
                    />
                    {fieldHelp[key] && <small className="tank-field-help">{t(fieldHelp[key]!)}</small>}
                  </label>
                ))}
              </div>
              {geometry !== null && <p className="small-note">{t("几何容积约 {volume} L；暂估有效水量按约 80% 计算，请按实际水位、底砂和造景修正。", { volume: geometry.toFixed(1) })}</p>}
              <section className="tank-setup-guide" aria-label={t("基础配置建议")}>
                <h3>{t("开缸前准备")}</h3>
                {values.water === "freshwater" ? (
                  <ul>
                    <li>{t("先备过滤、缸盖与温度计；养热带鱼且室温不足时，再按目标温度选加热器。")}<a href="https://www.aquariumcoop.com/blogs/aquarium/how-to-set-up-a-fish-tank" target="_blank" rel="noreferrer">{t("依据")} ↗</a></li>
                    <li>{t("开缸后核对氨、亚硝酸盐等水质与过滤循环，再逐步添加鱼。")}<a href="https://www.aquariumcoop.com/blogs/aquarium/fish-tank-cycling" target="_blank" rel="noreferrer">{t("依据")} ↗</a></li>
                  </ul>
                ) : (
                  <ul>
                    <li>{t("先规划过滤、水流、加热和水质测试；较小海水系统需更密切监测。")}<a href="https://www.bulkreefsupply.com/content/post/saltwater-aquarium-beginners-guide-episode-1" target="_blank" rel="noreferrer">{t("依据")} ↗</a></li>
                    <li>{t("用合适水源配海盐，并以盐度计测量；不要凭尺寸预填比重。")}<a href="https://www.bulkreefsupply.com/content/post/saltwater-aquarium-beginners-guide-episode-3" target="_blank" rel="noreferrer">{t("依据")} ↗</a></li>
                  </ul>
                )}
                <p>{t("示例水温、pH、硬度和比重仅供筛选，不代表当前鱼缸已经达到这些条件。")}</p>
              </section>
              {activeScenario && <p className="scenario-sources">{t("示例参数依据：")}{activeScenario.sources.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">{t("来源{number}", { number: index + 1 })} ↗</a>)}</p>}
            </div>
          </details>
          <button className="planner-next soft-button" type="button" onClick={showCandidates}>{t("开始选鱼")} ↓</button>
          {(!parsed.success || volumeInvalid) && (
            <p role="alert" className="form-error">
              {t(volumeInvalid ? "有效水量不能大于缸体几何容积。" : "请检查数值：尺寸和水量须大于 0，pH 0–14，水温 0–45°C，硬度 0–100 dGH，比重 1–1.05。")}
            </p>
          )}
          {message && <p role="status" className="planner-message">{t(message.key, { ...translatedValues(message.values, t), ...(message.fish ? { name: fishName(message.fish) } : {}) })}</p>}
        </aside>
      <section className="candidate-section" id="planner-candidates">
        <div className="planner-step-heading">
          <span className="planner-step-number">02</span>
          <div>
            <h2>{t("挑选喜欢的鱼")}</h2>
            <p>{t("先看照片和养护重点，再加入规划；点击鱼可查看完整详情。")}</p>
          </div>
        </div>
        <div className="candidate-toolbar">
          <ImeInput
            aria-label={t("查找规划鱼种")}
            placeholder={t("鱼名、学名或别名 · 输入后自动查找")}
            value={query}
            onValueChange={setQuery}
          />
          <div className="candidate-filter">
            <Checkbox
              id="only-compatible"
              checked={onlyCompatible}
              onCheckedChange={(checked) => setOnlyCompatible(checked === true)}
            />
            <label htmlFor="only-compatible">{t("隐藏已发现参数冲突的鱼")}</label>
          </div>
        </div>
        <p className="small-note">
          {t("未知条件不会被当作符合；数量建议不代表当前鱼缸能容纳，还需核对空间和混养。")}
        </p>
        {!valid ? (
          <p>{t("修正输入后再查看条件核对。")}</p>
        ) : (
          <div className="candidate-grid">
            {candidates.slice(0, visibleCount).map(({ f, issues }) => {
              const conflicts = issues.filter(
                (x) => x.level === "conflict",
              ).length;
              const caution = issues.filter((x) => x.level === "caution").length;
              const attention = issues.find((x) => x.level === "conflict")
                ?? issues.find((x) => x.level === "caution");
              const suggested = recommendedStockCount(f);
              const count = stock.find((item) => item.id === f.id)?.count ?? suggested;
              return (
                <article className={`candidate${conflicts ? " has-conflict" : caution ? " has-caution" : ""}`} key={f.id}>
                  <button
                    className="candidate-photo"
                    type="button"
                    aria-label={t("查看{name}图鉴", { name: fishName(f) })}
                    onClick={() => onFish(f, issues)}
                  >
                    <FishImage fish={f} />
                  </button>
                  <button className="candidate-name" onClick={() => onFish(f, issues)}>
                    {fishName(f)}
                    <em>{f.scientific}</em>
                  </button>
                  <div className="candidate-care" aria-label={t("养护参考")}>
                    <span>{t("缸长 {value}", { value: f.tank ? t("{length} cm 起", { length: f.tank }) : t("待补充") })}</span>
                    <span>{t("水温 {value}", { value: t(rangeText(f.temperature, "°C")) })}</span>
                    <span>{suggested > 1 ? t("建议至少 {count} 条群养", { count: suggested }) : t(rules[f.id]?.solitary ? "建议单养" : "数量待核对")}</span>
                  </div>
                  <p className={`candidate-status ${conflicts ? "conflict" : caution ? "caution" : "pending"}`}>
                    {conflicts ? t("{count} 项与当前鱼缸冲突", { count: conflicts }) : caution ? t("{count} 项需要注意", { count: caution }) : t("未发现已知冲突 · 仍需核对")}
                  </p>
                  {attention && tank && <p className="candidate-attention">{attentionSummary(f, tank, attention, count, i18n)}</p>}
                  <button
                    className="soft-button"
                    disabled={
                      stock.some((s) => s.id === f.id) || stock.length >= 6
                    }
                    onClick={() => {
                      setStock([...stock, { id: f.id, count: suggested }]);
                      setMessage("已加入{name} {count} 条。请查看我的规划中的数量和风险提醒。", { count: suggested }, f);
                    }}
                  >
                    {stock.some((s) => s.id === f.id)
                      ? t("已加入")
                      : stock.length >= 6
                        ? t("已达 6 种上限")
                        : t("加入规划 · {count} 条", { count: suggested })}
                  </button>
                </article>
              );
            })}
          </div>
        )}
        {valid && candidates.length > visibleCount && (
          <button className="candidate-more soft-button" onClick={() => setVisibleCount(visibleCount + 12)}>
            {t("查看更多鱼种（已显示 {shown} / {total}）", { shown: visibleCount, total: candidates.length })}
          </button>
        )}
        {valid && candidates.length === 0 && (
          <p>{t("没有符合当前显示条件的鱼种，试试取消筛选。")}</p>
        )}
      </section>
        <div className="stock-panel" id="planner-stock">
          <div className="planner-step-heading planner-stock-heading">
            <span className="planner-step-number">03</span>
            <div>
              <h2>{t("我的规划")} <small>{t("{count} / 6 种", { count: stock.length })}</small></h2>
              <p>{planSummary}</p>
            </div>
          </div>
          {stock.length === 0 ? (
            <p className="empty-plan">{t("还没有选鱼。从鱼种列表加入喜欢的鱼，再查看数量与混养提醒。")}</p>
          ) : (
            stock.map((s) => {
              const f = fishes.find((f) => f.id === s.id)!;
              return (
                <article className="stock-row" key={f.id}>
                  <div className="stock-title">
                    <button onClick={() => onFish(f, valid && tank ? assessFish(f, tank, s.count) : undefined)}>{fishName(f)} ↗</button>
                    <QuantityInput
                      fish={f}
                      count={s.count}
                      suggested={recommendedStockCount(f)}
                      onChange={(count) => setStock(stock.map((item) => item.id === s.id ? { ...item, count } : item))}
                    />
                    <button
                      aria-label={t("移除{name}", { name: fishName(f) })}
                      onClick={() =>
                        setStock(stock.filter((x) => x.id !== s.id))
                      }
                    >
                      {t("移除")}
                    </button>
                  </div>
                  {valid && tank && <Findings items={assessFish(f, tank, s.count)} />}
                  <details className="stock-extra">
                    <summary>{t("查看养护说明")}</summary>
                    <p className="small-note">{fishText(f, "tankNote")} {fishText(f, "parameterNote")}</p>
                  </details>
                </article>
              );
            })
          )}
          {valid && stock.length > 1 && (
            <section className="pair-results">
              <h3>{t("组合风险核对")}</h3>
              <PairFindings stock={stock} fishes={fishes} />
            </section>
          )}
          {stock.length > 0 && valid && (
            <p className="caution">
              {t("未发现某项冲突，只表示现有规则未触发。当前不计算安全总载量，也未完整评估缸内生态、疾病及个体差异。")}
            </p>
          )}
          <details className="planner-save-tools">
            <summary>{t("保存、分享或清空规划")}</summary>
            <div className="planner-actions">
              <button className="soft-button" disabled={!valid} onClick={save}>{t("保存规划")}</button>
              <button className="soft-button" onClick={() => {
                try {
                  const plan = parsePlan(JSON.parse(localStorage.getItem("fish-atlas:plan:v1") ?? "null"), fishes);
                  plan ? usePlan(plan) : setMessage("没有可恢复的有效规划。");
                } catch {
                  setMessage("无法读取本机规划。");
                }
              }}>{t("读取规划")}</button>
              <button className="soft-button" disabled={!valid} onClick={share}>{t("生成分享链接")}</button>
              <button className="soft-button" onClick={() => {
                setValues(tankInputs(emptyTank));
                setStock([]);
                setParams(new URLSearchParams(), { replace: true });
                setMessage("已清空当前规划，已保存的版本仍保留。");
              }}>{t("清空当前")}</button>
            </div>
          </details>
          {stock.length > 0 && <button className="planner-continue" type="button" onClick={showCandidates}>{t("继续选鱼")} ↑</button>}
        </div>
      </div>
      <div className="planner-mobile-bar" aria-live="polite">
        <span><strong>{t("已选 {count} 种鱼", { count: stock.length })}</strong><small>{planSummary}</small></span>
        <button type="button" onClick={stock.length ? showStock : showCandidates}>{t(stock.length ? "查看规划" : "去选鱼")}</button>
      </div>
    </section>
  );
}
