import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useGlobeLayoutMotion } from "./lib/useGlobeLayoutMotion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Compass,
  ExternalLink,
  Fish as FishIcon,
  Github,
  Globe2,
  Info,
  ListFilter,
  Languages,
  Maximize2,
  MessageSquarePlus,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Waves,
  X,
  GitCompareArrows,
  ZoomIn,
} from "lucide-react";
import rawFish from "../content/species.json";
import rawPhotoProfiles from "../content/photo-profiles.json";
import rawCommonNames from "../content/common-priority.json";
import catalogManifest from "../content/catalog-manifest.json";
import {
  filterFish,
  fishSchema,
  rangeText,
  readSaved,
  regions,
} from "./lib/model";
import type { Fish, RegionId } from "./lib/model";
import { photoProfileSchema } from "./lib/photoProfiles";
import type { PhotoProfile } from "./lib/photoProfiles";
import { exploreProfileRegion } from "./lib/exploreProfiles";
import type { ExploreSpecies } from "./lib/exploreProfiles";
import { basins, basinById, continentNames } from "./lib/basins";
import { basinSpeciesCount } from "./lib/basinSpecies";
import { distributions, fishLocationIds, fishLocations, locationById, locationKindNames, mappedSpeciesCount } from "./lib/distribution";
import BasinPicker from "./components/BasinPicker";
import Planner, { Findings, PairFindings } from "./components/Planner";
import type { Finding } from "./lib/planner";
import Evidence, { Taxonomy } from "./components/Evidence";
import { geography } from "./lib/evidence";
import { FishImage } from "./components/FishArt";
import ImeInput from "./components/ImeInput";
import FeedbackLink, { FeedbackNote } from "./components/FeedbackLink";
import { feedbackRepository, repositoryUrl } from "./lib/feedback";
import { translate, fishName, locationName, regionName, fishText, formatNumber, useI18n, localeInfo, locales } from "./i18n";
import type { Locale } from "./i18n";
function t(source: string, values?: Record<string, string | number | null | undefined>): string {
  return translate(source, undefined, values ? Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value ?? ""])) : undefined);
}
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
const Globe = lazy(() => import("./components/Globe"));
const Catalog = lazy(() => import("./components/Catalog"));
const fishes = fishSchema
  .array()
  .parse(rawFish)
  .map((f) => ({
    ...f,
    family: geography[f.id]?.family ?? f.family,
    aliases: [
      ...new Set([...f.aliases, geography[f.id]?.acceptedName ?? ""]),
    ].filter(Boolean),
  }));
const photoProfiles = photoProfileSchema.array().parse(rawPhotoProfiles);
const commonNames = rawCommonNames as Record<string, { name: string; aliases: string[] }>;
const allExploreSpecies: ExploreSpecies[] = [
  ...fishes.flatMap((item) => item.photo
    ? [{ id: item.id, name: item.name, scientific: item.scientific,
        region: item.region, photo: item.photo, item }]
    : []),
  ...photoProfiles.flatMap((item) => {
    const region = exploreProfileRegion(item);
    return [{ id: item.id, name: item.name, scientific: item.scientific,
      region, photo: item.photo, item }];
  }),
];
const allGlobePhotos = allExploreSpecies;
const globePhotoById = new Map(allGlobePhotos.map((fish) => [fish.id, fish]));
const basinLinkedCount = mappedSpeciesCount;
const featuredBasins = ["3203", "4219", "4238", "1209", "1229", "2433", "2434", "2437", "6242", "6202", "5309", "2421"]
  .map((id) => basinById.get(id)!);

function BasinTags({ fish }: { fish: Fish | PhotoProfile }) {
  const names = fishLocations(fish).map((place) => locationName(place)).filter(Boolean);
  return names.length ? <div className="detail-basin-tags"><span>{t("原生分布水域")}</span>{names.map((name) => <b key={name}>{name}</b>)}</div> : null;
}

function BasinSummary({ fish }: { fish: Fish | PhotoProfile }) {
  const names = fishLocations(fish).map((place) => locationName(place)).filter(Boolean);
  return names.length ? <p className="card-basin-summary" title={names.join(" · ")}><Globe2 size={12} /><span>{names.slice(0, 2).join(" · ")}{names.length > 2 ? t(" 等 {value0} 个水域", { value0: names.length }) : ""}</span></p> : null;
}

function exploreLocationLabel(fish: Fish | PhotoProfile): string {
  const linked = fishLocations(fish).map((place) => locationName(place)).filter(Boolean);
  if (linked.length) return linked.slice(0, 2).join(" · ") + (linked.length > 2 ? t(" 等 {value0} 个水域", { value0: linked.length }) : "");
  const regionId = "gbifKey" in fish ? exploreProfileRegion(fish) : fish.region;
  const area = regions.find((item) => item.id === regionId);
  return area ? t("{value0}（宽泛区域）", { value0: regionName(area) }) : t("具体水域待定位");
}

function DistributionDetails({ fish }: { fish: Fish | PhotoProfile }) {
  const distribution = distributions[fish.id];
  if (!distribution) return null;
  return <details className="source-details distribution-details">
    <summary>{t("分布资料与关联依据")}<ChevronRight size={15} /></summary>
    <p lang="en">{distribution.rangeText}</p>
    <p><a href={distribution.sourceUrl} target="_blank" rel="noreferrer">{t("FishBase 物种分布")}</a> {t("· 快照")}{distribution.snapshot} {t("· 原文参考文献 #")}{distribution.rangeRef} · <a href="https://fishbaseapi.readme.io/reference/license" target="_blank" rel="noreferrer">CC BY-NC 3.0</a></p>
    {distribution.acceptedScientific !== fish.scientific && <p>{t("FishBase 接受名：")}<i>{distribution.acceptedScientific}</i>{t("，通过学名异名匹配。")}</p>}
    {distribution.links.map((link) => <div key={link.locationId}>
      <p><strong>{locationById.get(link.locationId) ? locationName(locationById.get(link.locationId)!) : link.locationId}</strong>: <span lang={/[\u3400-\u9fff]/.test(link.evidence) ? "zh-CN" : "en"}>{link.evidence}</span> <a href={link.sourceUrl} target="_blank" rel="noreferrer">{t("物种依据")}</a> · <a href={locationById.get(link.locationId)?.sourceUrl} target="_blank" rel="noreferrer">{t("地理位置来源")}</a>{link.additionalSourceUrls?.map((url, index) => <span key={url}> · <a href={url} target="_blank" rel="noreferrer">{t("补充来源")}{index + 1}</a></span>)}</p>
      {locationById.get(link.locationId)?.anchorNote && <p lang="zh-CN">{locationById.get(link.locationId)?.anchorNote}</p>}
    </div>)}
    {distribution.reviewNotes?.map((note) => <p key={note} lang={/[\u3400-\u9fff]/.test(note) ? "zh-CN" : "en"}>{note}</p>)}
    {distribution.unlocatedReason && <p>{distribution.unlocatedReason}</p>}
    <p>{t("只关联有依据的原生水域；地图展示位不是采集点，水域边界也不是该鱼的完整分布边界。")}</p>
  </details>;
}

function Modal({
  children,
  label,
  onClose,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  onClose: () => void;
  className?: string;
}) {
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
  useEffect(() => { if (ref.current) ref.current.scrollTop = 0; }, [label]);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function SourceLink({ fish }: { fish: Fish }) {
  return (
    <a
      className="source-link"
      href={fish.sourceUrl}
      target="_blank"
      rel="noreferrer"
    >
      {fish.sourceTitle.startsWith("Seriously")
        ? "Seriously Fish"
        : fish.sourceTitle}{" "}
      · {fish.scientific}
      <ExternalLink size={12} />
    </a>
  );
}

type DetailPhotoSource = NonNullable<Fish["photo"]>;

function PhotoViewer({
  name,
  scientific,
  photo,
  close,
  index,
  count,
  onStep,
  inline = false,
  returnScroll = 0,
}: {
  name: string;
  scientific: string;
  photo: DetailPhotoSource;
  close: () => void;
  index: number;
  count: number;
  onStep: (direction: number) => void;
  inline?: boolean;
  returnScroll?: number;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ path: "", width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    if (!inline) return;
    const mobile = matchMedia("(max-width: 620px)").matches;
    if (mobile) window.scrollTo({ top: 0, behavior: "instant" });
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      if (mobile && document.querySelector(".explore-layout.reading")) {
        window.scrollTo({ top: returnScroll, behavior: "instant" });
      }
    };
  }, [inline, returnScroll]);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setStageSize({ width: element.clientWidth, height: element.clientHeight });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const fit = imageSize.path === photo.path && imageSize.width && imageSize.height && stageSize.width && stageSize.height
    ? Math.min(stageSize.width / imageSize.width, stageSize.height / imageSize.height)
    : 0;
  useEffect(() => {
    const element = stage.current;
    if (!element || !fit) return;
    const frame = requestAnimationFrame(() => {
      element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
      element.scrollTop = (element.scrollHeight - element.clientHeight) / 2;
    });
    return () => cancelAnimationFrame(frame);
  }, [fit, zoom]);
  const changeZoom = (next: number) => setZoom(Math.max(1, Math.min(3, next)));
  useEffect(() => {
    setZoom(1);
    drag.current = null;
    if (stage.current) { stage.current.scrollLeft = 0; stage.current.scrollTop = 0; }
  }, [photo.path]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      if (inline && document.querySelector("dialog[open], [role='dialog'], [role='listbox'], [role='menu']")) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true'], [role='combobox']")) return;
      if (inline && event.key === "Escape") {
        event.preventDefault(); event.stopPropagation(); close();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); event.stopPropagation();
        onStep(event.key === "ArrowLeft" ? -1 : 1);
      } else if (["+", "=", "-", "0"].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        setZoom((current) => event.key === "0" ? 1 : Math.max(1, Math.min(3, current + (event.key === "-" ? -0.5 : 0.5))));
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onStep, inline, close]);
  const contents = <>
      <div className="photo-viewer-head">
        <div><strong>{name}</strong><em>{scientific}</em></div>
        <nav className="photo-species-controls" aria-label={t("大图切换鱼种")}>
          <button className="soft-button" onClick={() => onStep(-1)} disabled={count < 2} aria-label={t("上一种鱼")} title={t("上一种鱼 · ←")}><ArrowLeft size={16} /><span>{t("上一种")}</span></button>
          <span className="photo-species-counter" aria-live="polite" aria-atomic="true"><b>{index + 1}</b> / {count}</span>
          <button className="soft-button" onClick={() => onStep(1)} disabled={count < 2} aria-label={t("下一种鱼")} title={t("下一种鱼 · →")}><span>{t("下一种")}</span><ArrowRight size={16} /></button>
        </nav>
        <button ref={closeButton} className="icon-button" onClick={close} aria-label={t("关闭照片大图")}><X size={20} /></button>
      </div>
      <div
        ref={stage}
        className={`photo-viewer-stage ${zoom > 1 ? "zoomed" : ""}`}
        onDoubleClick={() => changeZoom(zoom === 1 ? 2 : 1)}
        onPointerDown={(event) => {
          if (zoom === 1 || event.pointerType !== "mouse") return;
          const element = stage.current!;
          drag.current = { x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop };
          element.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const element = stage.current!;
          element.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
          element.scrollTop = drag.current.top - (event.clientY - drag.current.y);
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <div className="photo-viewer-canvas">
          <img
            key={photo.path}
            src={photo.path}
            alt={t("{name}，{scientific}", { name, scientific })}
            draggable={false}
            onLoad={(event) => setImageSize({ path: photo.path, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            style={fit ? { width: imageSize.width * fit * zoom, height: imageSize.height * fit * zoom } : undefined}
          />
        </div>
      </div>
      <div className="photo-viewer-footer">
        <span>{t("照片：")}{photo.author} · <a href={photo.pageUrl} target="_blank" rel="noreferrer">{t("原始文件")}</a> · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a></span>
        <div className="photo-zoom-controls">
          <button onClick={() => changeZoom(zoom - 0.5)} disabled={zoom === 1} aria-label={t("缩小图片")}><Minus size={17} /></button>
          <button onClick={() => changeZoom(1)} aria-label={t("重置图片缩放")}>{Math.round(zoom * 100)}%</button>
          <button onClick={() => changeZoom(zoom + 0.5)} disabled={zoom === 3} aria-label={t("放大图片")}><Plus size={17} /></button>
        </div>
        <p className="photo-viewer-hint">{t("← → 切换鱼种 · + / − 缩放 · 0 重置 · Esc 返回详情")}</p>
      </div>
    </>;
  return inline
    ? <section className="photo-viewer photo-viewer-inline" role="region" aria-label={t("{value0}照片大图", { value0: name })}>{contents}</section>
    : <Modal label={t("{value0}照片大图", { value0: name })} onClose={close} className="photo-viewer">{contents}</Modal>;
}

function DetailPhoto({
  name,
  photo,
  children,
  onOpen,
}: {
  name: string;
  photo: DetailPhotoSource | null;
  children: React.ReactNode;
  onOpen: () => void;
}) {
  if (!photo) return <>{children}</>;
  return (
    <>
      <button className="detail-photo-trigger" onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); onOpen(); }} aria-label={t("放大查看{value0}照片", { value0: name })}>
        {children}
        <span className="detail-photo-hint"><ZoomIn size={16} />{t("点击放大")}</span>
      </button>
    </>
  );
}

function DetailContainer({ children, label, close, inline }: {
  children: React.ReactNode; label: string; close: () => void; inline?: boolean;
}) {
  return inline
    ? <div className="detail-inline" aria-label={label}>{children}</div>
    : <Modal label={label} onClose={close} className="detail-modal">{children}</Modal>;
}

function ExploreReader({ selected, sequence, onSelect, onStep, close, children, photoView }: {
  selected: Fish | PhotoProfile;
  sequence: (Fish | PhotoProfile)[];
  onSelect: (fish: Fish | PhotoProfile) => void;
  onStep: (direction: number) => void;
  close: () => void;
  children: React.ReactNode;
  photoView?: React.ReactNode;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const index = sequence.findIndex((fish) => fish.id === selected.id);
  const count = sequence.length;
  const enlarged = !!photoView;
  const thumbnails = sequence.slice(Math.max(0, Math.min(index - 3, count - 7)), Math.max(7, index + 4));
  useEffect(() => { closeButton.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (content.current) content.current.scrollTop = 0; }, [selected.id]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (enlarged || event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
        document.querySelector("dialog[open], [role='dialog'], [role='listbox'], [role='menu']")) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true'], [role='combobox'], [role='slider']")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        onStep(event.key === "ArrowLeft" ? -1 : 1);
      } else if (event.key === "Escape") {
        event.preventDefault(); close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStep, close, enlarged]);
  return <section className="explore-reader" aria-label={t("鱼类详情浏览")}>
    <div className="reader-details" inert={enlarged} aria-hidden={enlarged || undefined}>
    <div className="reader-toolbar">
      <div className="reader-heading"><span className="eyebrow">EXPLORE / FIELD GUIDE</span><strong>{t("跟着鱼，看看它的故乡")}</strong></div>
      <button ref={closeButton} className="icon-button" aria-label={t("关闭鱼种详情")} title={t("关闭详情 · Esc")} onClick={close}><X size={19} /></button>
    </div>
    <nav className="reader-nav" aria-label={t("切换鱼种")}>
      <button className="soft-button" onClick={() => onStep(-1)} disabled={count < 2} aria-label={t("上一种鱼")} title={t("上一种鱼 · ←")}><ArrowLeft size={16} /><span>{t("上一种")}</span></button>
      <span className="reader-counter" aria-live="polite" aria-atomic="true"><b>{index + 1}</b> / {count}<small>{fishName(selected)}</small></span>
      <button className="soft-button" onClick={() => onStep(1)} disabled={count < 2} aria-label={t("下一种鱼")} title={t("下一种鱼 · →")}><span>{t("下一种")}</span><ArrowRight size={16} /></button>
    </nav>
    <div className="reader-filmstrip" aria-label={t("快速选择鱼种")}>
      {thumbnails.map((fish) => <button key={fish.id} className={fish.id === selected.id ? "active" : ""} aria-pressed={fish.id === selected.id}
        aria-label={t("切换到{value0}", { value0: fishName(fish) })} title={fishName(fish)} onClick={() => onSelect(fish)}>
        <img src={fish.photo!.path} alt="" />
      </button>)}
    </div>
    <p className="reader-shortcuts"><span>{t("← → 切换 · Esc 返回")}</span><span>{t("按当前筛选结果浏览")}</span></p>
    <div className="reader-content" ref={content}><div className="reader-specimen" key={selected.id}>{children}</div></div>
    </div>
    {photoView}
  </section>;
}

function FishDetail({
  fish,
  close,
  plannerFindings,
  saved,
  toggleSave,
  compared,
  toggleCompare,
  viewEvidence,
  openPhotoViewer,
}: {
  fish: Fish;
  close: () => void;
  plannerFindings?: Finding[];
  saved: boolean;
  toggleSave: () => void;
  compared: boolean;
  toggleCompare: () => void;
  viewEvidence: () => void;
  openPhotoViewer: () => void;
}) {
  const r = regions.find((r) => r.id === fish.region)!;
  return (
    <>
      <button
        className="icon-button close-detail"
        onClick={close}
        aria-label={t("关闭鱼种详情")}
      >
        <X size={21} />
      </button>
      <div className="detail-visual">
        <div className="detail-serial">
          SPECIMEN /{" "}
          {String(fishes.findIndex((f) => f.id === fish.id) + 1).padStart(
            2,
            "0",
          )}
        </div>
        <DetailPhoto name={fishName(fish)} photo={fish.photo} onOpen={openPhotoViewer}>
          <FishImage key={fish.id} fish={fish} large />
        </DetailPhoto>
        <div className="detail-image-footer">
          <span>
            <span className="live-dot" />
            {regionName(r)}
          </span>
          <span>{fish.photo ? t("物种参考照片") : t("原创形态示意")}</span>
        </div>
      </div>
      <div className="detail-body">
        <div className="eyebrow">
          {fish.water === "marine" ? "MARINE" : "FRESHWATER"} FIELD GUIDE
        </div>
        <h2>{fishName(fish)}</h2>
        <p className="scientific">{fish.scientific}</p>
        <p className="detail-intro">{fishText(fish,"description")}</p>
        <div className="detail-actions">
          <button
            className={`soft-button ${saved ? "selected" : ""}`}
            onClick={toggleSave}
          >
            <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
            {saved ? t("已收藏") : t("收藏鱼种")}
          </button>
          <button
            className={`soft-button ${compared ? "selected" : ""}`}
            onClick={toggleCompare}
          >
            <GitCompareArrows size={16} />
            {compared ? t("已加入对比") : t("加入对比")}
          </button>
          <FeedbackLink fish={fish} />
        </div>
        <div className="metrics">
          <Metric
            label={t("成鱼体长 · {value0}", { value0: fishText(fish,"lengthType") })}
            value={fish.length ? `${fish.length} cm` : t("资料待补充")}
          />
          <Metric
            label={t("来源列出的缸长")}
            value={fish.tank ? t("{value0} cm 起", { value0: fish.tank }) : t("资料待补充")}
          />
          <Metric label={t("水温范围")} value={t(rangeText(fish.temperature, " °C"))} />
          <Metric label={t("pH 范围")} value={t(rangeText(fish.ph))} />
        </div>
        <p className="parameter-note">
          {fishText(fish,"parameterNote")} {fishText(fish,"tankNote")}
        </p>
        {fish.water === "marine" && (
          <div className="metrics">
            <Metric
              label={t("来源最低容积")}
              value={fish.minVolume ? `${fish.minVolume} L` : t("资料待补充")}
            />
            <Metric label={t("比重 SG")} value={t(rangeText(fish.specificGravity))} />
          </div>
        )}
        {plannerFindings && (
          <section className="detail-section planner-detail-check">
            <h3><Info size={16} />{t("与你的鱼缸核对")}</h3>
            <p>{t("按当前规划参数生成；示例水质仍需实测，以下结果不等于混养安全结论。")}</p>
            <Findings items={plannerFindings} />
            <p className="small-note">{fishText(fish,"tankNote")} {fishText(fish,"parameterNote")}</p>
          </section>
        )}
        <section className="detail-section">
          <h3>
            <Globe2 size={16} />
            {t("来自哪里")}</h3>
          <p>{fishText(fish,"distribution")}</p>
          <BasinTags fish={fish} /><DistributionDetails fish={fish} />
          <span className="small-note">
            {t("地图标记为探索区域入口，不是采集点或完整分布边界。")}</span>
        </section>
        <section className="detail-section">
          <h3>
            <Waves size={16} />
            {t("如何相处")}</h3>
          <p>{fishText(fish,"behavior")}</p>
          <div className="caution">
            <Info size={15} />
            <span>{fishText(fish,"caution")}</span>
          </div>
        </section>
        <Taxonomy fish={fish} />
        <button className="soft-button" onClick={viewEvidence}>
          {t("在地球查看证据")}</button>
        <details className="source-details">
          <summary>
            {t("资料来源与图片署名")}<ChevronRight size={15} />
          </summary>
          <SourceLink fish={fish} />
          <p>
            {t("访问：")}{fish.accessedAt} {t("· 已核对页面信息，尚未经过鱼类专家审定。")}</p>
          <p>
            {t("硬度：")}{t(rangeText(fish.hardness, " dGH"))}{t("。SL 为标准体长，TL 为全长。缺失字段保留空值。")}</p>
          {fish.aliases.length > 0 && (
            <p>{t("检索别名／旧学名：")}{fish.aliases.join("、")}</p>
          )}
          {fish.photo ? (
            <p>
              {t("照片：")}{fish.photo.author} ·{" "}
              <a href={fish.photo.pageUrl} target="_blank" rel="noreferrer">
                {t("原始文件")}</a>{" "}
              ·{" "}
              <a href={fish.photo.licenseUrl} target="_blank" rel="noreferrer">
                {fish.photo.license}
              </a>
              {t("。展示可能包含人工品系，图片不代表所有个体的形态。")}</p>
          ) : (
            <p>{t("本图为项目原创示意插画，不能用于物种鉴定。")}</p>
          )}
        </details>
        <FeedbackNote />
      </div>
    </>
  );
}

function PhotoDetail({ profile, close, saved, toggleSave, openPhotoViewer }: {
  profile: PhotoProfile;
  close: () => void;
  saved: boolean;
  toggleSave: () => void;
  openPhotoViewer: () => void;
}) {
  const waterName = profile.water === "marine" ? t("海水") : profile.water === "freshwater" ? t("淡水") : profile.water === "brackish" ? t("半咸水") : t("待核实");
  return (
    <>
      <button className="icon-button close-detail" onClick={close} aria-label={t("关闭鱼种详情")}><X size={21} /></button>
      <div className="detail-visual">
        <div className="detail-serial">PHOTO / GBIF {profile.gbifKey}</div>
        <DetailPhoto name={fishName(profile)} photo={profile.photo} onOpen={openPhotoViewer}>
          <div className="fish-image large"><img src={profile.photo.path} alt={t("{name}，{scientific}", { name: fishName(profile), scientific: profile.scientific })} /></div>
        </DetailPhoto>
        <div className="detail-image-footer"><span><span className="live-dot" />{t("有来源的物种照片")}</span><span>{waterName} · {profile.family}</span></div>
      </div>
      <div className="detail-body">
        <div className="eyebrow">PHOTO-BACKED FIELD GUIDE</div>
        <h2>{fishName(profile)}</h2>
        <p className="scientific">{profile.scientific}</p>
        {profile.intro && <p className="detail-intro" lang="en">{profile.intro}</p>}
        <div className="detail-actions"><button className={`soft-button ${saved ? "selected" : ""}`} onClick={toggleSave}><Bookmark size={16} fill={saved ? "currentColor" : "none"} />{saved ? t("已收藏") : t("收藏鱼种")}</button><FeedbackLink fish={profile} /></div>
        <div className="metrics"><Metric label={t("科")} value={profile.family} /><Metric label={t("属")} value={profile.scientific.split(" ")[0]} /><Metric label={t("GBIF 环境标签")} value={waterName} /></div>
        <section className="detail-section"><h3><Globe2 size={16} />{t("地理分布")}</h3><p>{fishLocations(profile).length ? t("已关联原生水域：{value0}。", { value0: fishLocations(profile).map((place) => locationName(place)).join("、") }) : distributions[profile.id]?.unlocatedReason}</p><BasinTags fish={profile} /><DistributionDetails fish={profile} /></section>
        <section className="detail-section"><h3><Waves size={16} />{t("野外习性")}</h3><p lang={profile.behavior ? "en" : undefined}>{profile.behavior || t("资料待补充；不能根据近缘鱼推断本物种的食性或相处方式。")}</p></section>
        <div className="caution"><Info size={15} /><span>{t("这条鱼尚无经核对的鱼缸养护参数，因此不进入鱼缸规划。图片依据文件名、描述与学名匹配，尚待鱼类专家复核；英文节选需结合原文及引用文献阅读。")}</span></div>
        <details className="source-details" open><summary>{t("资料来源与图片署名")}<ChevronRight size={15} /></summary>
          <p>{t("分类：")}<a href={`https://www.gbif.org/species/${profile.gbifKey}`} target="_blank" rel="noreferrer">{t("GBIF 物种记录")}</a> · <a href={profile.wikidataUrl} target="_blank" rel="noreferrer">Wikidata</a></p>
          <p>{t("英文文字：Wikipedia contributors，")}<a href={profile.wikipediaUrl} target="_blank" rel="noreferrer">{t("物种词条与编辑历史")}</a>，<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>{t("；本站仅保留短段落，不视为专家复核。")}</p>
          <p>{t("照片：")}{profile.photo.author} · <a href={profile.photo.pageUrl} target="_blank" rel="noreferrer">{t("原始文件")}</a> · <a href={profile.photo.licenseUrl} target="_blank" rel="noreferrer">{profile.photo.license}</a>。</p>
        </details>
        <FeedbackNote />
      </div>
    </>
  );
}

export default function App() {
  const { locale, setLocale } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "",
    region = params.get("region") ?? "",
    basin = params.get("basin") ?? "",
    size = params.get("size") ?? "",
    water = params.get("water") ?? "",
    exploreScope = params.get("scope") ?? "all";
  const backgroundRoute =
    location.pathname.startsWith("/species/") ||
    location.pathname === "/compare"
      ? (location.state?.from ?? "/explore")
      : location.pathname;
  const backgroundPath = backgroundRoute === "/" ? "/explore" : backgroundRoute;
  const isPlanner = backgroundPath === "/planner";
  const isCatalog = backgroundPath === "/catalog";
  const [activeOccurrence, setActiveOccurrence] = useState("");
  const evidenceFish = fishes.find((f) => f.id === params.get("evidence"));
  const evidencePoints = evidenceFish
    ? (geography[evidenceFish.id]?.occurrences ?? [])
    : [];
  const isSaved = backgroundPath === "/saved";
  const isList = backgroundPath === "/atlas" || backgroundPath === "/featured" || isSaved;
  const selectedId = location.pathname.startsWith("/species/")
    ? location.pathname.split("/")[2]
    : null;
  const selectedFish = fishes.find((f) => f.id === selectedId);
  const selectedPhoto = photoProfiles.find((p) => p.id === selectedId);
  const selected = selectedFish ?? selectedPhoto;
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      return readSaved(window.localStorage);
    } catch {
      return [];
    }
  });
  const [storageWarning, setStorageWarning] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [about, setAbout] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const photoReturnScroll = useRef(0);
  const [basinPickerOpen, setBasinPickerOpen] = useState(false);
  const [reset, setReset] = useState(0);
  const [rotate, setRotate] = useState(false);
  const [ready, setReady] = useState(false);
  const [glFailed, setGlFailed] = useState(false);
  const reading = !!selected && backgroundPath === "/explore" && location.state?.from === "/explore" && !glFailed;
  const exploreLayout = useRef<HTMLDivElement>(null);
  const captureGlobeLayout = useGlobeLayoutMotion(exploreLayout, reading);
  const readerOrigin = useRef<{ id: string; element: HTMLElement | null; scroll: number } | null>(null);
  // Router transitions may commit after several key events. Keep the requested
  // cursor synchronously so fast key presses advance once per event.
  const readerCursor = useRef<string | null>(selectedId);
  const wasReading = useRef(false);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setGlFailed(true), []);
  const activeRegion = regions.find((r) => r.id === region);
  const activeBasin = basinById.get(basin);
  const activeLocation = locationById.get(basin);
  const results = useMemo(
    () =>
      filterFish(fishes, "", region, size, isSaved, saved).filter(
        (f) => (!query.trim() || [f.name, f.scientific, ...f.aliases, ...locales.map((language) => fishName(f, language))].some((name) => name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))) && (!water || f.water === water) && (!basin || fishLocationIds(f).includes(basin)),
      ),
    [query, region, basin, size, isSaved, saved, water, locale],
  );
  const imageResults = useMemo<(Fish | PhotoProfile)[]>(() => [
    ...results.filter((fish) => fish.photo !== null),
    ...photoProfiles.filter((profile) => {
      if (size) return false; // These records have no verified adult length.
      if (region && exploreProfileRegion(profile) !== region) return false;
      if (basin && !fishLocationIds(profile).includes(basin)) return false;
      if (isSaved && !saved.includes(profile.id)) return false;
      if (water && profile.water !== water) return false;
      const needle = query.trim().toLocaleLowerCase();
      return !needle || [profile.name, profile.scientific, profile.family, ...(profile.aliases ?? []), ...locales.map((language) => fishName(profile, language)), ...(commonNames[profile.scientific]?.aliases ?? [])].some((field) =>
        field.toLocaleLowerCase().includes(needle),
      );
    }),
  ].sort((a, b) => a.scientific.localeCompare(b.scientific, "en")), [results, size, region, basin, isSaved, saved, water, query, locale]);
  const exploreResults = useMemo(() => imageResults.filter((item) => {
    const mapped = fishLocationIds(item).length > 0;
    return exploreScope === "regional" ? mapped : exploreScope === "unlocated" ? !mapped : true;
  }).sort((a, b) => {
    const aCurated = "gbifKey" in a ? 1 : 0;
    const bCurated = "gbifKey" in b ? 1 : 0;
    return aCurated - bCurated;
  }), [imageResults, exploreScope]);
  const visibleGlobePhotos = useMemo(() => exploreResults.map((item) => globePhotoById.get(item.id)!), [exploreResults]);
  const mappedGlobeCount = exploreResults.filter((item) => fishLocationIds(item).length > 0).length;
  const detailResults = location.state?.from === "/explore" ? exploreResults : imageResults;
  const browseSequence = selected && !detailResults.some((item) => item.id === selected.id) ? [selected] : detailResults;
  useEffect(() => { if (!selected?.photo) setPhotoOpen(false); }, [selected]);
  useEffect(() => {
    let frame = 0;
    if (reading) {
      readerCursor.current = selectedId;
      setRotate(false);
      if (matchMedia("(max-width: 620px)").matches) frame = requestAnimationFrame(() => {
        window.scrollTo({ top: Math.max(0, (exploreLayout.current?.offsetTop ?? 0) - 12),
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      });
    } else if (wasReading.current && readerOrigin.current) {
      const origin = readerOrigin.current;
      window.scrollTo({ top: origin.scroll, behavior: "instant" });
      let attempts = 0;
      const restore = () => {
        const target = origin.element?.isConnected ? origin.element : document.querySelector<HTMLElement>(`.globe-fish-pin[data-fish-id="${CSS.escape(origin.id)}"]`);
        const canvas = document.querySelector("canvas");
        const settled = !canvas || (canvas.dataset.activeFish === "" && canvas.dataset.cameraMoving === "false");
        if (target && settled && getComputedStyle(target).visibility !== "hidden") {
          target.focus({ preventScroll: true });
          window.scrollTo({ top: origin.scroll, behavior: "instant" });
          readerOrigin.current = null;
        } else if (++attempts < 120) frame = requestAnimationFrame(restore);
      };
      frame = requestAnimationFrame(restore);
    }
    wasReading.current = reading;
    if (!reading) readerCursor.current = null;
    return () => cancelAnimationFrame(frame);
  }, [reading]);
  useEffect(() => {
    if (location.pathname === "/featured") {
      navigate({ pathname: "/atlas", search: location.search }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    document.title = selectedFish || selectedPhoto
      ? t("{value0} · 鱼类星球", { value0: fishName((selectedFish || selectedPhoto)!) })
      : t("鱼类星球 · FISH ATLAS");
  }, [selectedFish, selectedPhoto, locale]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => {
      if (media.matches) setRotate(false);
    };
    media.addEventListener("change", on);
    return () => media.removeEventListener("change", on);
  }, []);
  const update = (key: string, value: string) => {
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        value ? next.set(key, value) : next.delete(key);
        return next;
      },
      { replace: true },
    );
  };
  const go = (path: string) => {
    if (reading && path === "/explore") captureGlobeLayout();
    navigate({ pathname: path, search: params.toString() });
  };
  const changeExploreGeography = (change: (current: URLSearchParams) => URLSearchParams) => {
    if (reading) { captureGlobeLayout(); navigate({ pathname: "/explore", search: change(params).toString() }, { replace: true }); }
    else setParams(change);
  };
  const chooseRegion = (id: RegionId) => {
    changeExploreGeography((p) => {
      const next = new URLSearchParams(p);
      next.set("region", id);
      next.delete("basin");
      next.delete("scope");
      return next;
    });
  };
  const chooseExploreScope = (scope: string) => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.delete("region");
      next.delete("basin");
      scope === "all" ? next.delete("scope") : next.set("scope", scope);
      return next;
    });
  };
  const chooseBasin = (id: string) => {
    changeExploreGeography((p) => {
      const next = new URLSearchParams(p);
      next.set("basin", id);
      next.delete("region");
      next.delete("scope");
      next.delete("water");
      return next;
    });
    setBasinPickerOpen(false);
  };
  const clearGeography = () => changeExploreGeography((p) => {
    const next = new URLSearchParams(p);
    next.delete("region");
    next.delete("basin");
    return next;
  });
  const clear = () => setParams(new URLSearchParams());
  const rememberReaderOrigin = (id: string) => {
    if (backgroundPath === "/explore" && !selectedId) {
      captureGlobeLayout();
      readerOrigin.current = {
      id, element: document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null, scroll: window.scrollY,
      };
    }
  };
  const openFish = (f: Fish, plannerFindings?: Finding[]) => {
    rememberReaderOrigin(f.id);
    readerCursor.current = f.id;
    navigate(
      { pathname: `/species/${f.id}`, search: params.toString() },
      { replace: reading || photoOpen, state: selectedId && photoOpen ? { ...location.state, plannerFindings } : { from: backgroundPath, plannerFindings } },
    );
  };
  const openPhoto = (p: PhotoProfile) => {
    rememberReaderOrigin(p.id);
    readerCursor.current = p.id;
    navigate(
      { pathname: `/species/${p.id}`, search: params.toString() },
      { replace: reading || photoOpen, state: selectedId && photoOpen ? { ...location.state, plannerFindings: undefined } : { from: backgroundPath } },
    );
  };
  const openReaderItem = (item: Fish | PhotoProfile) => "gbifKey" in item ? openPhoto(item) : openFish(item);
  const stepReader = (direction: number) => {
    if (browseSequence.length < 2) return;
    const index = browseSequence.findIndex((item) => item.id === (readerCursor.current ?? selectedId));
    openReaderItem(browseSequence[(index + direction + browseSequence.length) % browseSequence.length]);
  };
  const closeFish = () => {
    if (reading) captureGlobeLayout();
    if (location.state?.from) navigate(-1);
    else go("/atlas");
  };
  const openPhotoViewer = () => {
    photoReturnScroll.current = window.scrollY;
    setPhotoOpen(true);
  };
  const closePhotoViewer = () => {
    setPhotoOpen(false);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".detail-photo-trigger")?.focus({ preventScroll: true }));
  };
  const toggleSave = (id: string) => {
    const next = saved.includes(id)
      ? saved.filter((x) => x !== id)
      : [...saved, id];
    setSaved(next);
    try {
      localStorage.setItem(
        "fish-atlas:v1",
        JSON.stringify({ version: 1, saved: next }),
      );
    } catch {
      setStorageWarning(true);
    }
  };
  const toggleCompare = (id: string) => {
    if (compare.includes(id)) {
      setCompare(compare.filter((x) => x !== id));
      return;
    }
    if (compare.length >= 3) {
      setToast(t("最多同时对比 3 种鱼，请先移除一种。"));
      return;
    }
    setCompare([...compare, id]);
  };
  const compareIds =
    location.pathname === "/compare"
      ? [...new Set((params.get("ids") ?? "").split(",").filter(Boolean))]
      : compare;
  const compareFish = compareIds
    .map((id) => fishes.find((f) => f.id === id))
    .filter((f): f is Fish => !!f)
    .slice(0, 3);
  const openCompare = () => {
    const p = new URLSearchParams(params);
    p.set("ids", compare.join(","));
    navigate(
      { pathname: "/compare", search: p.toString() },
      { state: { from: location.pathname } },
    );
  };
  const closeCompare = () => {
    if (location.state?.from) navigate(-1);
    else {
      const p = new URLSearchParams(params);
      p.delete("ids");
      navigate({ pathname: "/atlas", search: p.toString() });
    }
  };
  const listActive = isList || (glFailed && backgroundPath === "/explore");
  const photoViewer = photoOpen && selected?.photo ? <PhotoViewer name={fishName(selected)} scientific={selected.scientific} photo={selected.photo}
    inline={reading} returnScroll={photoReturnScroll.current} close={closePhotoViewer} index={browseSequence.findIndex((item) => item.id === selected.id)} count={browseSequence.length} onStep={stepReader} /> : null;
  const fishContent = selectedFish ? <FishDetail
    key={selectedFish.id} fish={selectedFish} close={closeFish} openPhotoViewer={openPhotoViewer}
    plannerFindings={isPlanner ? location.state?.plannerFindings : undefined}
    saved={saved.includes(selectedFish.id)} toggleSave={() => toggleSave(selectedFish.id)}
    compared={compare.includes(selectedFish.id)} toggleCompare={() => toggleCompare(selectedFish.id)}
    viewEvidence={() => {
      if (reading) captureGlobeLayout();
      const p = new URLSearchParams(); p.set("evidence", selectedFish.id); p.set("region", selectedFish.region);
      navigate({ pathname: "/explore", search: p.toString() }); setActiveOccurrence("");
    }}
  /> : selectedPhoto ? <PhotoDetail key={selectedPhoto.id} profile={selectedPhoto} close={closeFish} openPhotoViewer={openPhotoViewer}
    saved={saved.includes(selectedPhoto.id)} toggleSave={() => toggleSave(selectedPhoto.id)} /> : null;
  const detailContent = selected ? <DetailContainer label={t("{value0}图鉴", { value0: fishName(selected) })} close={closeFish} inline={reading}>{fishContent}</DetailContainer> : null;
  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        {t("跳到图鉴内容")}</a>
      <header className="header">
        <button
          className="brand"
          onClick={() => {
            if (reading) captureGlobeLayout();
            navigate("/explore");
            setReset((x) => x + 1);
          }}
          aria-label={t("鱼类星球首页")}
        >
          <span className="brand-symbol">
            <FishIcon size={26} />
          </span>
          <span>
            {t("鱼类星球")}<small>FISH ATLAS</small>
          </span>
        </button>
        <nav aria-label={t("主导航")}>
          <button
            className={!listActive && !isPlanner && !isCatalog ? "active" : ""}
            onClick={() => go("/explore")}
          >
            <Globe2 size={16} />
            {t("探索地球")}</button>
          <button
            className={listActive && !isSaved ? "active" : ""}
            onClick={() => go("/atlas")}
          >
            <ListFilter size={16} />
            {t("鱼类图鉴")}</button>
          <button
            className={isCatalog ? "active" : ""}
            onClick={() => go("/catalog")}
          >
            <Search size={16} />
            {t("物种目录")}</button>
          <button
            className={isSaved ? "active" : ""}
            onClick={() => go("/saved")}
          >
            <Bookmark size={15} />
            {t("我的收藏")}{saved.length > 0 && (
              <span className="nav-count">{saved.length}</span>
            )}
          </button>
          <button
            className={isPlanner ? "active" : ""}
            onClick={() => go("/planner")}
          >
            <SlidersHorizontal size={15} />
            {t("鱼缸规划")}</button>
        </nav>
        <div className="header-actions">
          <div className="language-picker">
            <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
              <SelectTrigger aria-label={t("语言")} title={t("切换语言")}>
                <Languages size={15} aria-hidden="true" />
                <SelectValue><span className="language-native-name">{localeInfo[locale].name}</span><span className="language-short-name">{locale.toUpperCase()}</span></SelectValue>
              </SelectTrigger>
              <SelectContent>{locales.map((language) => <SelectItem key={language} value={language}><span lang={localeInfo[language].tag}>{localeInfo[language].name}</span></SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="repository-links" role="group" aria-label={t("GitHub 项目仓库：{value0}", { value0: feedbackRepository })}>
            <a className="repository-star" href={repositoryUrl} target="_blank" rel="noopener noreferrer"
              aria-label={t("在 GitHub 给鱼类星球 Star（新标签页）")} title={t("{value0} · 喜欢这份图鉴？在 GitHub 点亮 Star", { value0: feedbackRepository })}>
              <Github size={17} aria-hidden="true" /><span className="repository-wordmark">GitHub</span>
              <span className="repository-star-label"><Star size={13} aria-hidden="true" />Star</span>
            </a>
            <a className="repository-issue" href={`${repositoryUrl}/issues/new/choose`} target="_blank" rel="noopener noreferrer"
              aria-label={t("在 GitHub 提 Issue（新标签页）")} title={t("补充鱼类资料、反馈问题或提出功能建议")}>
              <MessageSquarePlus size={15} aria-hidden="true" /><span><span className="repository-issue-prefix">{t("提")}</span>Issue</span>
            </a>
          </div>
          <button className="about-button" aria-label={t("关于图鉴")} onClick={() => setAbout(true)}>
            <span className="live-dot" />
            {t("关于图鉴")}<Info size={15} />
          </button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {isPlanner ? (
          <Planner fishes={fishes} onFish={openFish} />
        ) : isCatalog ? (
          <Suspense fallback={<div className="catalog-loading" role="status">{t("正在打开物种目录…")}</div>}>
            <Catalog fishes={fishes} photoProfiles={photoProfiles} onFish={openFish} onPhoto={openPhoto} />
          </Suspense>
        ) : !listActive ? (
          <div className={`explore-layout${reading ? " reading" : ""}${reading && photoOpen ? " photo-reading" : ""}`} ref={exploreLayout}>
            <section className="intro" inert={reading} aria-hidden={reading}>
              <div className="eyebrow">
                <span />
                THE LIVING BLUE PLANET
              </div>
              <h1>
                {t("每一条鱼，")}<br />
                {t("都有一片")}<span>{t("故乡。")}</span>
              </h1>
              <p>
                {t("从亚马孙的雨林溪流，到东非的古老湖泊。")}<br className="desktop-break" />{" "}
                {t("转动地球，认识水下世界的居民。")}</p>
              <button className="text-button" onClick={() => go("/atlas")}>
                {t("翻开鱼类图鉴")}<ArrowRight size={17} />
              </button>
              <div className="intro-stats">
                <div>
                  <strong>{(fishes.length + photoProfiles.length).toString()}</strong>
                  <span>{t("种真实照片图鉴")}</span>
                </div>
                <i />
                <div>
                  <strong>{basins.length}</strong>
                  <span>{t("个全球主要流域")}</span>
                </div>
              </div>
              <div className="field-note">
                <Waves size={24} />
                <div>
                  <span>FIELD NOTE / 001</span>
                  <p>
                    {t("了解它从哪里来，")}<br />
                    {t("才能理解它需要什么。")}</p>
                </div>
              </div>
            </section>
            <section className="globe-stage" aria-label={t("地球探索")}>
              <div className="orbital-ring ring-one" />
              <div className="orbital-ring ring-two" />
              <div className="globe-coordinate">
                23° 26′ N <span>—</span> THE BLUE MARBLE
              </div>
              {!ready && (
                <div className="globe-loading">
                  <span className="loading-orbit" />
                  {t("正在展开水下世界…")}</div>
              )}
              <Suspense fallback={null}>
                <Globe
                  region={region}
                  onRegion={chooseRegion}
                  basin={basin}
                  onBasin={chooseBasin}
                  fish={visibleGlobePhotos}
                  activeFishId={reading ? selectedId ?? "" : ""}
                  detailMode={reading}
                  onFish={(item) => "gbifKey" in item ? openPhoto(item) : openFish(item)}
                  occurrences={evidencePoints}
                  activeOccurrence={activeOccurrence}
                  onOccurrence={setActiveOccurrence}
                  reset={reset}
                  rotate={rotate && !reading}
                  onReady={onReady}
                  onError={onError}
                />
              </Suspense>
              <div className="globe-caption">
                <span className="live-dot" />
                {activeLocation ? t("{value0} · {value1} 种已关联鱼", { value0: locationName(activeLocation), value1: mappedGlobeCount }) : activeRegion ? t("{value0} · {value1} 种已关联水域", { value0: regionName(activeRegion), value1: mappedGlobeCount }) : t("{value0} 种已定位水域 · {value1} 种在列表", { value0: mappedGlobeCount, value1: exploreResults.length })}
                <small>{t("主要河流常显 · 悬停看归属 · 选择水域看范围 · 非观测点")}</small>
              </div>
              <div className="globe-controls">
                <span>
                  <Maximize2 size={13} />
                  {t("拖动旋转 · 滚轮缩放")}</span>
                <button className="globe-basin-button" title={t("筛选流域、海域与湖泊")} aria-label={t("选择流域、海域或湖泊")} onClick={() => setBasinPickerOpen(true)}><Globe2 size={15} /><span>{t("选择水域")}</span></button>
                <button
                  title={t("重置视角")}
                  aria-label={t("重置视角")}
                  onClick={() => {
                    clearGeography();
                    setReset((x) => x + 1);
                  }}
                >
                  <RotateCcw size={16} />
                </button>
                {!reading && <button
                  title={rotate ? t("暂停自转") : t("开启自转")}
                  aria-label={rotate ? t("暂停自转") : t("开启自转")}
                  onClick={() => setRotate(!rotate)}
                >
                  {rotate ? <Pause size={16} /> : <Play size={16} />}
                </button>}
              </div>
            </section>
            <aside className={`species-panel${reading ? " reader-panel" : ""}`}>
              {reading && selected ? <ExploreReader selected={selected} sequence={browseSequence}
                onSelect={openReaderItem} onStep={stepReader} close={closeFish} photoView={photoViewer}>{detailContent}</ExploreReader> : <>
              <div className="panel-head">
                <div className="eyebrow">DISCOVER SPECIES</div>
                <h2>
                  {(activeLocation ? locationName(activeLocation) : undefined) ?? (activeRegion ? regionName(activeRegion) : undefined) ?? t("从一条鱼开始")}
                  <span>{exploreResults.length}</span>
                </h2>
              </div>
              <SearchBar value={query} onChange={(v) => update("q", v)} />
              <div className="explore-filter-groups">
                <div className="explore-filter-row" aria-label={t("展示范围筛选")}>
                  {[
                    ["all", t("全部照片"), allGlobePhotos.length],
                    ["regional", t("已定位"), basinLinkedCount],
                    ["unlocated", t("待定位"), allGlobePhotos.length - basinLinkedCount],
                  ].map(([value, label, count]) => (
                    <button key={value} className={exploreScope === value ? "active" : ""}
                      onClick={() => chooseExploreScope(String(value))}
                      aria-pressed={exploreScope === value}>{label}<b>{count}</b></button>
                  ))}
                </div>
                <div className="explore-filter-row water" aria-label={t("水体筛选")}>
                  {[["", t("全部水体")], ["freshwater", t("淡水")], ["marine", t("海水")], ["brackish", t("半咸水")]].map(([value, label]) => (
                    <button key={value} className={water === value ? "active" : ""}
                      onClick={() => update("water", value)} aria-pressed={water === value}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="panel-filter">
                <span>
                  {water === "marine"
                    ? t("海水鱼")
                    : water === "freshwater"
                      ? t("淡水鱼")
                      : water === "brackish"
                        ? t("半咸水鱼")
                        : t("全部水体")}{" "}
                  · {activeLocation ? t("已选择水域") : activeRegion ? t("已选择区域") : t("全部照片图鉴")}
                </span>
                {region || basin ? (
                  <button onClick={clearGeography}>
                    {t("清除")}{basin ? t("流域") : t("区域")}
                    <X size={12} />
                  </button>
                ) : (
                  <SlidersHorizontal size={14} />
                )}
              </div>
              {!activeRegion && !activeLocation && (
                <p className="explore-coverage">
                  {t("地球已展示")}{basinLinkedCount} {t("种鱼的原生水域；其余")}{allGlobePhotos.length - basinLinkedCount} {t("种保留在列表。选择流域、海域或湖泊查看关联鱼；展示位置不是采集点。")}</p>
              )}
              {activeLocation && !activeBasin && <p className="explore-coverage">{locationName(activeLocation)} · {t(locationKindNames[activeLocation.kind])}. {activeLocation.geometry ? t("边界为水域示意，不是物种分布范围。") : t("按有来源的水域位置展示，尚无边界多边形。")}</p>}
              {activeBasin && <p className="explore-coverage">{t("流域边界来自 GRDC 2020；这里仅显示图鉴资料提及该流域或所属支流的鱼。")}{!exploreResults.length && t("当前尚无可核实的关联鱼种。")}</p>}
              <div className="compact-list">
                {exploreResults.length ? (
                  exploreResults.map((f) => (
                    <button
                      key={f.id}
                      className="compact-card"
                      data-fish-id={f.id}
                      onClick={() => "gbifKey" in f ? openPhoto(f) : openFish(f)}
                    >
                      {"gbifKey" in f
                        ? <span className="fish-image"><img src={f.photo.path} alt={t("{value0}照片", { value0: fishName(f) })} loading="lazy" /></span>
                        : <FishImage fish={f} />}
                      <span className="compact-name">
                        <strong>{fishName(f)}</strong>
                        <em>{f.scientific}</em>
                        <span>
                          {exploreLocationLabel(f)}
                        </span>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))
                ) : (
                  <Empty clear={clear} />
                )}
              </div>
              <button className="panel-footer" onClick={() => go("/atlas")}>
                {t("浏览鱼类图鉴")}<ArrowRight size={16} />
              </button>
              </>}
            </aside>
            <section className="region-section">
              <div className="section-label">
                <span>{t("精选水域入口")}</span>
                <span>
                  EXPLORE BY ORIGIN
                  <ArrowDown size={12} />
                </span>
              </div>
              <div className="region-cards">
                {regions.map((r, i) => (
                  <button
                    key={r.id}
                    className={`region-card ${region === r.id ? "active" : ""}`}
                    onClick={() => chooseRegion(r.id)}
                    style={{ "--region-color": r.color } as React.CSSProperties}
                  >
                    <span className={`region-art region-art-${r.id}`}>
                      <svg viewBox="0 0 100 60" aria-hidden="true">
                        {r.id === "amazon" ? (
                          <path d="M-5 6Q24 8 24 23T57 33T96 55M24 23L43 9M57 33L65 14M57 33L29 52" />
                        ) : r.id === "asia" ? (
                          <path d="M25 4L35 20 29 30 47 43 55 58M51 12L58 23 74 32M73 6L80 20M62 43L83 50" />
                        ) : (
                          <>
                            <path d="M42 5Q32 20 44 36T40 60M60 7Q52 18 57 23T66 41" />
                            <path d="M20 12L32 19M67 40L80 52" />
                          </>
                        )}
                      </svg>
                    </span>
                    <span className="region-text">
                      <small>
                        0{i + 1} / {r.english}
                      </small>
                      <strong>{regionName(r)}</strong>
                      <span>{t(r.subtitle)} · {allExploreSpecies.filter((f) => f.region === r.id).length} {t("种")}</span>
                    </span>
                    <span className="region-arrow">
                      <ArrowRight size={18} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="basin-section" aria-label={t("全球主要流域")}>
              <div className="basin-section-head">
                <div><span className="eyebrow">GRDC · GLOBAL BASINS</span><h2>{t("从一条河，探索全世界。")}</h2>
                  <p>{basins.length} {t("个主要河流与湖泊流域，覆盖六大洲。地图边界与鱼种资料分别核对；目前")}{basinSpeciesCount.size} {t("个流域有图鉴鱼种关联。")}</p></div>
                <button onClick={() => setBasinPickerOpen(true)}>{t("查找全部")}{basins.length} {t("个流域")}<ArrowRight size={16} /></button>
              </div>
              <div className="basin-featured-grid">
                {featuredBasins.map((item) => <button key={item.id} className={basin === item.id ? "active" : ""} onClick={() => chooseBasin(item.id)}>
                  <span>{t(continentNames[item.continent])} · {formatNumber(Math.round(item.areaKm2 / 10000))} {t("万 km²")}</span>
                  <strong>{locationName(item)}</strong><small>{basinSpeciesCount.get(item.id) ? t("{value0} 种已关联鱼", { value0: basinSpeciesCount.get(item.id) }) : t("鱼种资料待补")}</small>
                </button>)}
              </div>
              <p className="basin-disclaimer">{t("流域采用 GRDC 2020 定义；海域和湖泊独立定位。关联流域不表示鱼占据整条水系，宽泛海洋记录也不会伪装成精确采集点。")}</p>
            </section>
            <Evidence
              fish={evidenceFish}
              fishes={fishes}
              onSelect={(id) => {
                update("evidence", id);
                setActiveOccurrence("");
              }}
              active={activeOccurrence}
              onPoint={setActiveOccurrence}
            />
          </div>
        ) : (
          <section className="atlas-page">
            <div className="atlas-heading">
              <div>
                <div className="eyebrow">YOUR UNDERWATER FIELD GUIDE</div>
                <h1>{isSaved ? t("我的收藏") : t("鱼类图鉴，认识水下世界。")}</h1>
                <p>
                  {isSaved
                    ? t("把喜欢的鱼留下，下次接着探索。")
                    : t("按名字、全球主要流域和体型寻找鱼种；流域筛选只显示资料提及该水系或所属支流的条目。")}
                </p>
                {!isSaved && <button className="catalog-jump" onClick={() => go("/catalog")}>{t("浏览")}{formatNumber(catalogManifest.totalEntries)} {t("条分类目录")}<ArrowRight size={14} /></button>}
              </div>
              <span className="atlas-total">
                {imageResults.length}
                <small>{t("种鱼")}</small>
              </span>
            </div>
            {glFailed && (
              <p className="status-notice">
                {t("当前设备未能加载 3D 地球，已为你打开完整图鉴。")}</p>
            )}
            <div className="atlas-toolbar">
              <SearchBar value={query} onChange={(v) => update("q", v)} />
              <div className="region-pills">
                <button
                  className={!region && !basin ? "active" : ""}
                  onClick={clearGeography}
                >
                  {t("全部区域")}</button>
                {regions.map((r) => (
                  <button
                    key={r.id}
                    className={region === r.id ? "active" : ""}
                    onClick={() => chooseRegion(r.id)}
                  >
                    {regionName(r)}
                  </button>
                ))}
              </div>
              <button className={`atlas-basin-trigger ${activeLocation ? "active" : ""}`} onClick={() => setBasinPickerOpen(true)}>
                <Globe2 size={17} /><span>{activeLocation ? locationName(activeLocation) : t("选择流域、海域或湖泊 · {value0} 流域", { value0: basins.length })}</span><ChevronRight size={15} />
              </button>
              {activeLocation && <button className="atlas-basin-clear" onClick={clearGeography} aria-label={t("清除流域筛选")}><X size={15} /></button>}
              <div className="size-filter">
                <Select value={water || "all"} onValueChange={(value) => update("water", value === "all" ? "" : value)}>
                  <SelectTrigger aria-label={t("水体筛选")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("全部水体")}</SelectItem>
                    <SelectItem value="freshwater">{t("淡水")}</SelectItem>
                    <SelectItem value="marine">{t("海水")}</SelectItem>
                    <SelectItem value="brackish">{t("半咸水")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="size-filter">
                <SlidersHorizontal size={15} />
                <Select value={size || "all"} onValueChange={(value) => update("size", value === "all" ? "" : value)}>
                  <SelectTrigger aria-label={t("按成鱼体长筛选")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("全部体型")}</SelectItem>
                    <SelectItem value="small">{t("小型 ≤ 5 cm")}</SelectItem>
                    <SelectItem value="medium">{t("中型 5–12 cm")}</SelectItem>
                    <SelectItem value="large">{t("大型 ＞ 12 cm")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {activeLocation && !activeBasin && <p className="atlas-basin-notice">{locationName(activeLocation)} · {t(locationKindNames[activeLocation.kind])} {t("· 已关联")}{imageResults.length} {t("种有照片的鱼。")}</p>}
            {activeBasin && <p className="atlas-basin-notice">{locationName(activeBasin)} · {t(continentNames[activeBasin.continent])} {t("· GRDC 估算汇水面积约")}{formatNumber(activeBasin.areaKm2)} km². {imageResults.length ? t("已关联 {value0} 种有照片的鱼。", { value0: imageResults.length }) : t("当前图鉴尚无可核实的关联鱼种；这不表示该流域没有鱼。")}</p>}
            {imageResults.length ? (
              <div className="fish-grid">
                {imageResults.map((f, i) => "gbifKey" in f ? (
                  <article className="fish-card" key={f.id}>
                    <button className="card-open" onClick={() => openPhoto(f)}>
                      <div className="card-image-wrap">
                        <div className="fish-image"><img src={f.photo.path} alt={`${fishName(f)}（${f.scientific}）`} loading="lazy" /></div>
                        <span className="card-number">{String(i + 1).padStart(2, "0")}</span>
                        <span className="card-region">{(activeLocation ? locationName(activeLocation) : undefined) ?? (f.water === "marine" ? t("海水") : f.water === "freshwater" ? t("淡水") : f.water === "brackish" ? t("半咸水") : t("水体待核实"))}</span>
                      </div>
                      <div className="card-copy">
                        <h2>{fishName(f)}<ArrowRight size={18} /></h2>
                        <p className="scientific">{f.scientific}</p>
                        <div className="card-facts"><span>{f.family}</span><span>{t("养护资料待补充")}</span></div>
                        <BasinSummary fish={f} />
                      </div>
                    </button>
                    <div className="card-actions">
                      <button aria-label={`${saved.includes(f.id) ? t("取消收藏") : t("收藏")}${fishName(f)}`} onClick={() => toggleSave(f.id)} className={saved.includes(f.id) ? "selected" : ""}>
                        <Bookmark size={15} fill={saved.includes(f.id) ? "currentColor" : "none"} />
                        {saved.includes(f.id) ? t("已收藏") : t("收藏")}
                      </button>
                    </div>
                  </article>
                ) : (
                  <article className="fish-card" key={f.id}>
                    <button className="card-open" onClick={() => openFish(f)}>
                      <div className="card-image-wrap">
                        <FishImage fish={f} />
                        <span className="card-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="card-region">
                          {(activeLocation ? locationName(activeLocation) : undefined) ?? regionName(regions.find((r) => r.id === f.region)!)}
                        </span>
                      </div>
                      <div className="card-copy">
                        <h2>
                          {fishName(f)}
                          <ArrowRight size={18} />
                        </h2>
                        <p className="scientific">{f.scientific}</p>
                        <div className="card-facts">
                          <span>
                            {f.length
                              ? `${f.length} cm ${fishText(f,"lengthType")}`
                              : t("体长待补充")}
                          </span>
                          <span>{t(rangeText(f.temperature, " °C"))}</span>
                        </div>
                        <BasinSummary fish={f} />
                      </div>
                    </button>
                    <div className="card-actions">
                      <button
                        aria-label={`${saved.includes(f.id) ? t("取消收藏") : t("收藏")}${fishName(f)}`}
                        onClick={() => toggleSave(f.id)}
                        className={saved.includes(f.id) ? "selected" : ""}
                      >
                        <Bookmark
                          size={15}
                          fill={saved.includes(f.id) ? "currentColor" : "none"}
                        />
                        {saved.includes(f.id) ? t("已收藏") : t("收藏")}
                      </button>
                      <button
                        className={compare.includes(f.id) ? "selected" : ""}
                        onClick={() => toggleCompare(f.id)}
                        aria-label={`${compare.includes(f.id) ? t("移除对比") : t("对比")}${fishName(f)}`}
                      >
                        {compare.includes(f.id) ? (
                          <Check size={15} />
                        ) : (
                          <GitCompareArrows size={15} />
                        )}
                        {t("对比")}</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty clear={clear} saved={isSaved} />
            )}
          </section>
        )}
      </main>
      <footer className="site-footer">
        <span>
          <FishIcon size={15} />
          {t("一份持续生长的水下自然笔记")}</span>
        <span>
          {fishes.length + photoProfiles.length} PROFILES · {formatNumber(catalogManifest.totalEntries)} TAXA · {basins.length} BASINS
          <button onClick={() => setAbout(true)}>
            {t("数据与图片来源")}<ExternalLink size={11} />
          </button>
          <FeedbackLink />
        </span>
      </footer>
      {storageWarning && (
        <div className="storage-warning" role="status">
          {t("浏览器存储不可用，收藏仅在本次浏览中保留。")}<button
            onClick={() => setStorageWarning(false)}
            aria-label={t("关闭存储提示")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {compare.length > 0 &&
        location.pathname !== "/compare" &&
        !selectedId && (
          <div className="compare-tray">
            <span>
              <GitCompareArrows size={18} />
              {compare.length} {t("/ 3 种鱼")}</span>
            <div>
              {compare.map((id) => (
                <button
                  key={id}
                  onClick={() => toggleCompare(id)}
                  aria-label={t("移除对比{value0}", { value0: fishName(fishes.find((f) => f.id === id)!) })}
                >
                  {fishName(fishes.find((f) => f.id === id)!)}
                  <X size={12} />
                </button>
              ))}
            </div>
            <button className="primary-button" onClick={openCompare}>
              {t("开始对比")}<ArrowRight size={16} />
            </button>
          </div>
        )}
      {!reading && detailContent}
      {!reading && photoViewer}
      {selectedId && !selectedFish && !selectedPhoto && (
        <Modal label={t("没有找到鱼种")} onClose={() => go("/atlas")}>
          <div className="simple-dialog">
            <h2>{t("没有找到这条鱼")}</h2>
            <p>{t("链接可能已变更，请返回图鉴搜索。")}</p>
            <button className="primary-button" onClick={() => go("/atlas")}>
              {t("返回图鉴")}</button>
          </div>
        </Modal>
      )}
      {location.pathname === "/compare" && (
        <Modal
          label={t("鱼种对比")}
          onClose={closeCompare}
          className="compare-modal"
        >
          <div className="compare-heading">
            <div>
              <div className="eyebrow">SIDE BY SIDE</div>
              <h2>{t("仔细了解，再做选择。")}</h2>
            </div>
            <button
              className="icon-button"
              onClick={closeCompare}
              aria-label={t("关闭对比")}
            >
              <X />
            </button>
          </div>
          {compareFish.length ? (
            <>
              <div className="compare-table-wrap">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>{t("饲养参考")}</th>
                      {compareFish.map((f) => (
                        <th key={f.id}>
                          <FishImage fish={f} />
                          <strong>{fishName(f)}</strong>
                          <em>{f.scientific}</em>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [
                        t("成鱼体长"),
                        (f: Fish) =>
                          f.length
                            ? `${f.length} cm ${fishText(f,"lengthType")}`
                            : t("资料待补充"),
                      ],
                      [
                        t("来源列出的缸长"),
                        (f: Fish) =>
                          f.tank ? t("{value0} cm 起", { value0: f.tank }) : t("资料待补充"),
                      ],
                      [
                        t("水温范围"),
                        (f: Fish) => t(rangeText(f.temperature, " °C")),
                      ],
                      [
                        t("水体"),
                        (f: Fish) => (f.water === "marine" ? t("海水") : t("淡水")),
                      ],
                      [
                        t("比重 SG"),
                        (f: Fish) =>
                          f.water === "marine"
                            ? t(rangeText(f.specificGravity))
                            : t("不适用"),
                      ],
                      [
                        t("有效水量参考"),
                        (f: Fish) =>
                          f.minVolume ? `${f.minVolume} L` : t("资料待补充"),
                      ],
                      [t("适用条件"), (f: Fish) => fishText(f,"tankNote")],
                      [t("pH 范围"), (f: Fish) => t(rangeText(f.ph))],
                      [t("硬度范围"), (f: Fish) => t(rangeText(f.hardness, " dGH"))],
                      [t("具体原生地"), (f: Fish) => fishText(f,"distribution")],
                      [t("相处与风险"), (f: Fish) => fishText(f,"caution")],
                    ].map(([label, fn]) => (
                      <tr key={label as string}>
                        <th>{label as string}</th>
                        {compareFish.map((f) => (
                          <td key={f.id}>{(fn as (f: Fish) => string)(f)}</td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <th>{t("资料来源")}</th>
                      {compareFish.map((f) => (
                        <td key={f.id}>
                          <SourceLink fish={f} />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <section className="comparison-risks">
                <h3>{t("已知组合风险")}</h3>
                <PairFindings
                  stock={compareFish.map((f) => ({ id: f.id, count: 1 }))}
                  fishes={fishes}
                />
                <button
                  className="soft-button"
                  onClick={() => {
                    const p = new URLSearchParams();
                    p.set(
                      "plan",
                      JSON.stringify({
                        version: 1,
                        tank: {
                          water: compareFish[0]?.water ?? "freshwater",
                          length: null,
                          width: null,
                          height: null,
                          volume: null,
                          temperature: null,
                          ph: null,
                          hardness: null,
                          specificGravity: null,
                        },
                        stock: compareFish.map((f) => ({ id: f.id, count: 1 })),
                      }),
                    );
                    navigate({ pathname: "/planner", search: p.toString() });
                  }}
                >
                  {t("带入鱼缸规划")}</button>
              </section>
              <div className="caution">
                <Info size={17} />
                <span>
                  {t("参数重叠不等于可以混养。还需要考虑数量、缸体空间、领地行为和捕食风险；本表不输出混养安全结论。")}</span>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>{t("先从图鉴中选择最多 3 种鱼。")}</p>
              <button onClick={() => go("/atlas")}>
                {t("前往图鉴")}<ArrowRight size={16} />
              </button>
            </div>
          )}
        </Modal>
      )}
      {basinPickerOpen && <BasinPicker selected={basin} onSelect={chooseBasin} onClose={() => setBasinPickerOpen(false)} />}
      {about && (
        <Modal
          label={t("关于鱼类星球")}
          onClose={() => setAbout(false)}
          className="about-modal"
        >
          <button
            className="icon-button close-detail"
            aria-label={t("关闭关于图鉴")}
            onClick={() => setAbout(false)}
          >
            <X />
          </button>
          <div className="eyebrow">A LIVING FIELD GUIDE</div>
          <h2>{t("好奇心，从水面之下开始。")}</h2>
          <p>
            {t("鱼类星球收录")}{fishes.length + photoProfiles.length} {t("种有照片和来源的图鉴，其中")}{fishes.length} {t("种有逐条核对的养护参考；其余")}{catalogManifest.totalEntries - fishes.length - photoProfiles.length} {t("条 GBIF 分类记录暂无照片。照片图鉴不等于适养鱼种，新增条目没有核对过的养护参数。资料尚未经过鱼类专家审定。")}</p>
          <h3>{t("读懂这颗地球")}</h3>
          <p>
            {t("地球默认显示全球主要河流与湖泊，放大时补充重要支流；选择或查看鱼的归属时，才高亮对应水域范围。可筛选")}{basins.length} {t("个 GRDC 主要流域，以及独立湖泊和海域。FishBase 26.06 与物种分布文献提供原生水域依据，排除引入记录。有边界的展示位经多边形校验；小水域使用有来源的位置锚点。照片标记和引导线都是展示位置，不是采集点；水域边界不是物种完整分布边界。河网、陆地海岸线、湖面与海域示意来自 Natural Earth。")}</p>
          <p>{t("流域数据：")}<a href="https://mrb.grdc.bafg.de/" target="_blank" rel="noreferrer">GRDC (2020), Major River Basins, 2nd revised edition</a>{t("，基于")}<a href="https://www.hydrosheds.org/products/hydrobasins" target="_blank" rel="noreferrer">HydroSHEDS／HydroBASINS（© WWF）</a>{t("；本站为地球浏览进行了简化，面积是原数据的估算值。")}</p>
          <h3>{t("资料与照片")}</h3>
          <p>
            {t("分布与参数参考 Seriously Fish、LiveAquaria、Florida Museum、Fishes of Australia 与 NOAA；分类及历史观测快照来自 GBIF，缺失字段保留空值。扩充目录的学名和科属来自 GBIF Backbone Taxonomy，按 CC BY 4.0 署名。识别照片来自 Wikimedia Commons，每张照片在详情中列出作者、原始页面与许可；示意插画由本项目绘制，不作为鉴定依据。")}</p>
          <section className="feedback-invite" aria-label={t("参与完善鱼类资料")}>
            <h3>{t("一起完善这份图鉴")}</h3>
            <p className="repository-invite">{t("鱼类星球的项目仓库：")}<a href={repositoryUrl} target="_blank" rel="noopener noreferrer"><Github size={15} aria-hidden="true" />{feedbackRepository}<ExternalLink size={12} aria-hidden="true" /></a>{t("。喜欢这份图鉴，欢迎在 GitHub 点亮 Star；资料补充、问题反馈和功能建议都可以提 Issue。")}</p>
            <p>{t("补充缺失的习性或养护资料，指出名称、分布和图片中的错误，也可以推荐尚未收录的鱼。无需知道所有参数，只要说明需要改哪一处；有参考链接或图片出处更方便核对。")}</p>
            <FeedbackLink>{t("在 GitHub 提交建议")}</FeedbackLink>
            <p className="feedback-note">{t("需要 GitHub 登录。提交的建议会公开显示，核对后再更新图鉴；点击入口不会自动提交。")}</p>
          </section>
          <h3>{t("隐私与收藏")}</h3>
          <p>
            {t("收藏保存在当前浏览器，不上传服务器。所有图鉴与图片随应用提供，浏览时无需登录或连接外部数据服务。")}</p>
          <div className="source-index">
            {fishes.map((f) => (
              <div key={f.id}>
                <strong>{fishName(f)}</strong>
                <SourceLink fish={f} />
                {f.photo && (
                  <a href={f.photo.pageUrl} target="_blank" rel="noreferrer">
                    {t("照片 ·")}{f.photo.author} · {f.photo.license}
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            ))}
          </div>
          <p className="small-note">
            {t("资料版本 2026.10.09 / v0.4 · 内容仅作了解物种的起点。")}</p>
        </Modal>
      )}
    </div>
  );
}

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="search-field">
      <Search size={17} />
      <ImeInput
        aria-label={t("搜索鱼种")}
        placeholder={t("搜索鱼名、学名或别名 · 输入后自动搜索")}
        value={value}
        onValueChange={onChange}
      />
      {value && (
        <button onClick={() => onChange("")} aria-label={t("清空搜索")}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}
function Empty({
  clear,
  saved = false,
}: {
  clear: () => void;
  saved?: boolean;
}) {
  return (
    <div className="empty-state">
      <Compass size={32} />
      <h3>{saved ? t("这里还没有鱼") : t("暂时没有找到")}</h3>
      <p>
        {saved
          ? t("在鱼种卡片上点击收藏，留下你的水下心愿单。")
          : t("试试别名、学名，或清除筛选条件。")}
      </p>
      <button onClick={clear}>
        {t("清除筛选")}<ArrowLeft size={14} />
      </button>
    </div>
  );
}
