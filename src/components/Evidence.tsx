import type { Fish } from "../lib/model";
import { geography, establishmentLabels } from "../lib/evidence";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import rawDatasets from "../../content/enrichment/datasets.json";
const datasets: Record<string,{title:string;citation:{text:string}|null}> = rawDatasets;
export function Taxonomy({ fish }: { fish: Fish }) {
  const g = geography[fish.id];
  return (
    <section className="detail-section">
      <h3>分类与分布证据</h3>
      <p>
        {g?.review === "exact-species-match"
          ? `GBIF 接受名：${g.acceptedName}。来源名称：${fish.scientific}。`
          : "分类匹配待复核。"}{" "}
        {g && (
          <a href={g.url} target="_blank" rel="noreferrer">
            分类记录 ↗
          </a>
        )}
      </p>
      <p className="small-note">
        匹配仅表示分类库中的对应关系，不代替专家鉴定。
        {g?.accessedAt && `数据快照：${g.accessedAt}。`}
      </p>
      <p>
        <a
          href={fish.distributionSource ?? fish.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          原生分布文献 ↗
        </a>{" "}
        ·{" "}
        <a
          href={fish.lengthSource ?? fish.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          体长来源 ↗
        </a>
      </p>
    </section>
  );
}
export default function Evidence({
  fish,
  onSelect,
  fishes,
  active,
  onPoint,
}: {
  fish: Fish | undefined;
  onSelect: (id: string) => void;
  fishes: Fish[];
  active: string;
  onPoint: (id: string) => void;
}) {
  const g = fish ? geography[fish.id] : null;
  return (
    <section className="evidence-panel">
      <div className="evidence-heading">
        <div>
          <div className="eyebrow">FOLLOW THE EVIDENCE</div>
          <h2>看见记录，分清含义。</h2>
        </div>
        <div className="evidence-select">
          <span>地球证据层</span>
          <Select value={fish?.id ?? "none"} onValueChange={(value) => onSelect(value === "none" ? "" : value)}>
            <SelectTrigger aria-label="选择分布证据鱼种"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">关闭观测点</SelectItem>
              {fishes.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="evidence-legend">
        <span className="native">● 来源标为原生</span>
        <span className="introduced">● 来源标为引入</span>
        <span className="unknown">● 原生性未知</span>
        <span>— 河湖地理背景</span>
      </div>
      <p className="small-note">
        地球标记是区域入口。观测点是筛选后的历史记录样本，未标明原生性的记录一律显示为未知；不会从观测点推断原生范围。河湖线为
        Natural Earth 简化地理背景，不是物种边界。
      </p>
      {fish && (
        <>
          <h3>{fish.name} · 文献分布</h3>
          <p>
            {fish.distribution}{" "}
            <a
              href={fish.distributionSource ?? fish.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              查看来源 ↗
            </a>
          </p>
          <p className="small-note">
            GBIF 接受名：{g?.acceptedName ?? "待复核"} · 快照{" "}
            {g?.accessedAt ?? "未获取"} · 展示 {g?.occurrences.length ?? 0}{" "}
            条，不代表全部观测。
          </p>
          {g?.occurrences.length ? (
            <div className="evidence-records">
              {g.occurrences.map((o) => (
                <article key={o.id} className={active === o.id ? "active" : ""}>
                  <button
                    onClick={() => onPoint(o.id)}
                    aria-label={`聚焦记录 ${o.id}`}
                  >
                    {establishmentLabels[o.establishment]} ·{" "}
                    {o.coordinates[1].toFixed(3)}°,{" "}
                    {o.coordinates[0].toFixed(3)}°
                  </button>
                  <p>
                    {o.eventDate.slice(0, 10)} · 坐标不确定度{" "}
                    {o.uncertaintyMeters} m
                  </p>
                  <p className="small-note">
                    {o.recordedBy} · {o.basis}
                  </p>
                  <p>
                    <a href={o.url} target="_blank" rel="noreferrer">
                      原始记录 ↗
                    </a>{" "}
                    ·{" "}
                    <a
                      href={`https://www.gbif.org/dataset/${o.datasetKey}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {datasets[o.datasetKey]?.title ?? "数据集"} ↗
                    </a>{" "}
                    ·{" "}
                    <a href={o.license} target="_blank" rel="noreferrer">
                      许可 ↗
                    </a>
                  </p>
                  <details className="small-note"><summary>数据集引用</summary><p>{datasets[o.datasetKey]?.citation?.text ?? o.datasetKey}</p><p>坐标按原记录展示，筛选和中文标签由本站添加；未重新确定原生性或观测鉴定。</p></details>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-plan">
              没有通过当前精度、许可与记录类型筛选的样本；这不表示该物种没有分布或观测记录。
            </p>
          )}
        </>
      )}
    </section>
  );
}
