import { useEffect, useMemo, useRef } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Search, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import rawCatalog from "../../content/catalog.json";
import manifest from "../../content/catalog-manifest.json";
import commonNames from "../../content/common-priority.json";
import type { Fish } from "../lib/model";
import type { PhotoProfile } from "../lib/photoProfiles";
import { FishImage } from "./FishArt";
import ImeInput from "./ImeInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useI18n, fishName as nameForLocale, locales } from "../i18n";

type CatalogEntry = {
  key: number;
  scientific: string;
  family: string;
  genus: string;
  habitats: string[];
  vernacular: string;
  curatedId?: string;
  reviewCandidate: boolean;
};
const catalog = rawCatalog as CatalogEntry[];
const commonPriority = commonNames as Record<string, { name: string; aliases: string[] }>;
const PAGE_SIZE = 48;
const families = [...new Set(catalog.map((entry) => entry.family))].sort();
const habitatName: Record<string, string> = {
  FRESHWATER: "淡水",
  MARINE: "海水",
  BRACKISH: "半咸水",
};

function BasicDetail({ entry, onClose }: { entry: CatalogEntry; onClose: () => void }) {
  const { t, fishName } = useI18n();
  const common = commonPriority[entry.scientific];
  const name = fishName({ name: common?.name ?? entry.scientific, scientific: entry.scientific });
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const before = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = old;
      before?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className="modal catalog-dialog" aria-label={t("{name} 分类记录", { name: entry.scientific })} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === ref.current) onClose(); }}>
      <button className="icon-button catalog-close" aria-label={t("关闭分类记录")} onClick={onClose}><X size={19} /></button>
      <span className="catalog-kicker">{t("GBIF 分类记录")}</span>
      <h2>{name}</h2>
      {name !== entry.scientific && <p className="catalog-latin">{entry.scientific}</p>}
      {entry.vernacular && entry.vernacular !== name && <p className="catalog-vernacular">{t("英文俗名 · {name}", { name: entry.vernacular })}</p>}
      <dl className="catalog-facts">
        <div><dt>{t("科")}</dt><dd>{entry.family}</dd></div>
        <div><dt>{t("属")}</dt><dd>{entry.genus}</dd></div>
        <div><dt>{t("GBIF 栖息环境标签")}</dt><dd>{entry.habitats.length ? entry.habitats.map((item) => t(habitatName[item] ?? item)).join(" / ") : t("未提供")}</dd></div>
        <div><dt>{t("分类键")}</dt><dd>{entry.key}</dd></div>
      </dl>
      <p className="catalog-caution">{t("这是一条分类目录记录，尚未核对是否现生、图片、自然分布、饲养条件或是否适合家养。不能据此制定鱼缸方案。")}</p>
      <a className="catalog-source" href={`https://www.gbif.org/species/${entry.key}`} target="_blank" rel="noreferrer">{t("查看 GBIF 原始分类记录")} <ExternalLink size={14} /></a>
    </dialog>
  );
}

export default function Catalog({ fishes, photoProfiles, onFish, onPhoto }: { fishes: Fish[]; photoProfiles: PhotoProfile[]; onFish: (fish: Fish) => void; onPhoto: (profile: PhotoProfile) => void }) {
  const { locale, t, fishName, number } = useI18n();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const family = params.get("family") ?? "";
  const requestedTier = params.get("tier") ?? "all";
  const tier = ["all", "profiles", "review", "basic"].includes(requestedTier) ? requestedTier : "all";
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const selected = catalog.find((entry) => String(entry.key) === params.get("entry"));
  const curated = useMemo(() => new Map(fishes.map((fish) => [fish.id, fish])), [fishes]);
  const photographed = useMemo(() => new Map(photoProfiles.map((profile) => [profile.gbifKey, profile])), [photoProfiles]);
  const profileCount = fishes.length + photoProfiles.length;
  const basicCount = manifest.totalEntries - profileCount;
  const hasProfile = (entry: CatalogEntry) => !!entry.curatedId || photographed.has(entry.key);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase().replace(/\s+/g, " ");
    const matches = catalog.filter((entry) =>
      (!family || entry.family === family) &&
      (tier === "all" || (tier === "profiles" ? hasProfile(entry) : tier === "review" ? entry.reviewCandidate : !hasProfile(entry))) &&
      (!needle || [entry.scientific, entry.family, entry.genus, entry.vernacular, commonPriority[entry.scientific]?.name ?? "", ...(commonPriority[entry.scientific]?.aliases ?? []), entry.curatedId ? curated.get(entry.curatedId)?.name ?? "" : "", photographed.get(entry.key)?.name ?? "", ...(photographed.get(entry.key)?.aliases ?? []), entry.curatedId ? (curated.get(entry.curatedId)?.aliases ?? []).join(" ") : "", ...locales.map((language) => nameForLocale({ name: commonPriority[entry.scientific]?.name ?? entry.scientific, scientific: entry.scientific }, language))].some((field) => field.toLocaleLowerCase().includes(needle)))
    );
    if (tier === "all" || tier === "review") matches.sort((a, b) => Number(hasProfile(b)) - Number(hasProfile(a)));
    return matches;
  }, [query, family, tier, curated, photographed, locale, fishName]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const actualPage = Math.min(page, pageCount);
  const visible = filtered.slice((actualPage - 1) * PAGE_SIZE, actualPage * PAGE_SIZE);
  const update = (values: Record<string, string>) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(values)) value ? next.set(key, value) : next.delete(key);
      return next;
    }, { replace: true });
  };
  const open = (entry: CatalogEntry) => {
    const fish = entry.curatedId ? curated.get(entry.curatedId) : undefined;
    if (fish) onFish(fish);
    else if (photographed.has(entry.key)) onPhoto(photographed.get(entry.key)!);
    else update({ entry: String(entry.key) });
  };
  return (
    <section className="catalog-page">
      <div className="catalog-heading">
        <div>
          <span className="catalog-kicker">{t("物种目录 · 分类")}</span>
          <h1>{t("物种目录，持续生长。")}</h1>
          <p>{t("这里有 {total} 条分类记录；其中 {profiles} 种已有照片，进入鱼类图鉴。其余 {basic} 条来自 GBIF，尚无可核对图片，仅供分类检索，不在图鉴中展示。新增照片条目缺少核对过的养护参数，不进入鱼缸规划。", { total: number(manifest.totalEntries), profiles: number(profileCount), basic: number(basicCount) })}</p>
        </div>
        <div className="catalog-count"><strong>{number(manifest.totalEntries)}</strong><span>{t("条物种记录")}</span></div>
      </div>
      <div className="catalog-tiers" aria-label={t("资料等级筛选")}>
        {[["all", `${t("全部")} ${number(manifest.totalEntries)}`], ["profiles", `${t("已入图鉴")} ${number(profileCount)}`], ["review", `${t("重点名单")} ${number(manifest.reviewQueue)}`], ["basic", `${t("基础记录")} ${number(basicCount)}`]].map(([value, label]) => (
          <button key={value} className={tier === value ? "active" : ""} onClick={() => update({ tier: value === "all" ? "" : value, page: "" })}>{label}</button>
        ))}
      </div>
      <div className="catalog-toolbar">
        <label className="catalog-search"><Search size={17} /><span className="sr-only">{t("搜索学名、中文名或科属")}</span><ImeInput type="text" value={query} placeholder={t("搜索学名、中文名、英文俗名或科属 · 输入后自动搜索")} onValueChange={(next) => update({ q: next, page: "" })} /></label>
        <div className="catalog-family"><span>{t("科")}</span><Select value={family || "all"} onValueChange={(value) => update({ family: value === "all" ? "" : value, page: "" })}><SelectTrigger aria-label={t("科筛选")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("全部科")}</SelectItem>{families.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="catalog-result-line" role="status">{t("找到 {count} 条记录 · 第 {page} / {pages} 页", { count: number(filtered.length), page: actualPage, pages: pageCount })}</div>
      {visible.length ? <div className="catalog-grid">{visible.map((entry) => {
        const fish = entry.curatedId ? curated.get(entry.curatedId) : undefined;
        const photo = photographed.get(entry.key);
        const common = commonPriority[entry.scientific];
        const name = fishName(fish ?? photo ?? { name: common?.name ?? entry.scientific, scientific: entry.scientific });
        return <article key={entry.key} className={`catalog-card ${fish || photo ? "has-profile" : ""}`}>
          <button onClick={() => open(entry)} aria-label={t("查看{name}资料", { name })}>
            <div className="catalog-card-top">{fish ? <FishImage fish={fish} /> : photo ? <div className="fish-image"><img src={photo.photo.path} alt="" loading="lazy" /></div> : <span className="catalog-mark">{entry.genus.slice(0, 1)}</span>}<span className={`catalog-tier ${fish || photo ? "complete" : ""}`}>{t(fish || photo ? "已入图鉴" : entry.reviewCandidate ? "优先复核" : "分类记录")}</span></div>
            <h2>{name}</h2>
            {name !== entry.scientific && <p className="catalog-latin">{entry.scientific}</p>}
            {!fish && !photo && entry.vernacular && entry.vernacular !== name && <p className="catalog-latin">{entry.vernacular}</p>}
            <div className="catalog-card-bottom"><span>{entry.family}</span><ArrowRight size={16} /></div>
          </button>
        </article>;
      })}</div> : <div className="catalog-empty">{t("没有找到匹配记录。试试学名、科名，或清除筛选条件。")}</div>}
      {pageCount > 1 && <nav className="catalog-pagination" aria-label={t("物种目录分页")}><button disabled={actualPage === 1} onClick={() => update({ page: String(actualPage - 1) })}><ArrowLeft size={15} /> {t("上一页")}</button><span>{actualPage} / {pageCount}</span><button disabled={actualPage === pageCount} onClick={() => update({ page: String(actualPage + 1) })}>{t("下一页")} <ArrowRight size={15} /></button></nav>}
      <p className="catalog-credit">{t("分类数据：")}<a href={manifest.datasetUrl} target="_blank" rel="noreferrer">GBIF Backbone Taxonomy</a>, {manifest.license} · {t("抓取日期 {date}。旧 Backbone 已停止更新；目录只收录所选科的部分接受名，未逐种核对是否现生，并非观赏鱼适养名录或全部鱼类。", { date: manifest.generatedAt })}</p>
      {selected && !hasProfile(selected) && <BasicDetail key={selected.key} entry={selected} onClose={() => update({ entry: "" })} />}
    </section>
  );
}
