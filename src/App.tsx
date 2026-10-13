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
  Globe2,
  Info,
  ListFilter,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
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
const featuredBasins = ["3203", "4219", "1209", "1229", "2433", "6202", "5309", "2421"]
  .map((id) => basinById.get(id)!);

function BasinTags({ fish }: { fish: Fish | PhotoProfile }) {
  const names = fishLocations(fish).map((place) => place.label).filter(Boolean);
  return names.length ? <div className="detail-basin-tags"><span>原生分布水域</span>{names.map((name) => <b key={name}>{name}</b>)}</div> : null;
}

function BasinSummary({ fish }: { fish: Fish | PhotoProfile }) {
  const names = fishLocations(fish).map((place) => place.label).filter(Boolean);
  return names.length ? <p className="card-basin-summary" title={names.join(" · ")}><Globe2 size={12} /><span>{names.slice(0, 2).join(" · ")}{names.length > 2 ? ` 等 ${names.length} 个水域` : ""}</span></p> : null;
}

function exploreLocationLabel(fish: Fish | PhotoProfile): string {
  const linked = fishLocations(fish).map((place) => place.label).filter(Boolean);
  if (linked.length) return linked.slice(0, 2).join(" · ") + (linked.length > 2 ? ` 等 ${linked.length} 个水域` : "");
  const regionId = "gbifKey" in fish ? exploreProfileRegion(fish) : fish.region;
  const area = regions.find((item) => item.id === regionId);
  return area ? `${area.name}（宽泛区域）` : "具体水域待定位";
}

function DistributionDetails({ fish }: { fish: Fish | PhotoProfile }) {
  const distribution = distributions[fish.id];
  if (!distribution) return null;
  return <details className="source-details distribution-details">
    <summary>分布资料与关联依据 <ChevronRight size={15} /></summary>
    <p lang="en">{distribution.rangeText}</p>
    <p><a href={distribution.sourceUrl} target="_blank" rel="noreferrer">FishBase 物种分布</a> · 快照 {distribution.snapshot} · 原文参考文献 #{distribution.rangeRef} · <a href="https://fishbaseapi.readme.io/reference/license" target="_blank" rel="noreferrer">CC BY-NC 3.0</a></p>
    {distribution.acceptedScientific !== fish.scientific && <p>FishBase 接受名：<i>{distribution.acceptedScientific}</i>，通过学名异名匹配。</p>}
    {distribution.links.map((link) => <div key={link.locationId}>
      <p><strong>{locationById.get(link.locationId)?.label}</strong>：{link.evidence} <a href={link.sourceUrl} target="_blank" rel="noreferrer">物种依据</a> · <a href={locationById.get(link.locationId)?.sourceUrl} target="_blank" rel="noreferrer">地理位置来源</a>{link.additionalSourceUrls?.map((url, index) => <span key={url}> · <a href={url} target="_blank" rel="noreferrer">补充来源 {index + 1}</a></span>)}</p>
      {locationById.get(link.locationId)?.anchorNote && <p>{locationById.get(link.locationId)?.anchorNote}</p>}
    </div>)}
    {distribution.reviewNotes?.map((note) => <p key={note}>{note}</p>)}
    {distribution.unlocatedReason && <p>{distribution.unlocatedReason}</p>}
    <p>只关联有依据的原生水域；地图展示位不是采集点，水域边界也不是该鱼的完整分布边界。</p>
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
}: {
  name: string;
  scientific: string;
  photo: DetailPhotoSource;
  close: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setStageSize({ width: element.clientWidth, height: element.clientHeight });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const fit = imageSize.width && imageSize.height && stageSize.width && stageSize.height
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
  return (
    <Modal label={`${name}照片大图`} onClose={close} className="photo-viewer">
      <div className="photo-viewer-head">
        <div><strong>{name}</strong><em>{scientific}</em></div>
        <button className="icon-button" onClick={close} aria-label="关闭照片大图"><X size={20} /></button>
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
            src={photo.path}
            alt={`${name}，${scientific}`}
            draggable={false}
            onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            style={fit ? { width: imageSize.width * fit * zoom, height: imageSize.height * fit * zoom } : undefined}
          />
        </div>
      </div>
      <div className="photo-viewer-footer">
        <span>照片：{photo.author} · <a href={photo.pageUrl} target="_blank" rel="noreferrer">原始文件</a> · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a></span>
        <div className="photo-zoom-controls">
          <button onClick={() => changeZoom(zoom - 0.5)} disabled={zoom === 1} aria-label="缩小图片"><Minus size={17} /></button>
          <button onClick={() => changeZoom(1)} aria-label="重置图片缩放">{Math.round(zoom * 100)}%</button>
          <button onClick={() => changeZoom(zoom + 0.5)} disabled={zoom === 3} aria-label="放大图片"><Plus size={17} /></button>
        </div>
      </div>
    </Modal>
  );
}

function DetailPhoto({
  name,
  scientific,
  photo,
  children,
}: {
  name: string;
  scientific: string;
  photo: DetailPhotoSource | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!photo) return <>{children}</>;
  return (
    <>
      <button className="detail-photo-trigger" onClick={(event) => { event.currentTarget.focus(); setOpen(true); }} aria-label={`放大查看${name}照片`}>
        {children}
        <span className="detail-photo-hint"><ZoomIn size={16} />点击放大</span>
      </button>
      {open && <PhotoViewer name={name} scientific={scientific} photo={photo} close={() => setOpen(false)} />}
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

function ExploreReader({ selected, sequence, onSelect, onStep, close, children }: {
  selected: Fish | PhotoProfile;
  sequence: (Fish | PhotoProfile)[];
  onSelect: (fish: Fish | PhotoProfile) => void;
  onStep: (direction: number) => void;
  close: () => void;
  children: React.ReactNode;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const index = sequence.findIndex((fish) => fish.id === selected.id);
  const count = sequence.length;
  const thumbnails = sequence.slice(Math.max(0, Math.min(index - 3, count - 7)), Math.max(7, index + 4));
  useEffect(() => { closeButton.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (content.current) content.current.scrollTop = 0; }, [selected.id]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
        document.querySelector("dialog[open], [role='dialog']")) return;
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
  }, [onStep, close]);
  return <section className="explore-reader" aria-label="鱼类详情浏览">
    <div className="reader-toolbar">
      <div className="reader-heading"><span className="eyebrow">EXPLORE / FIELD GUIDE</span><strong>跟着鱼，看看它的故乡</strong></div>
      <button ref={closeButton} className="icon-button" aria-label="关闭鱼种详情" title="关闭详情 · Esc" onClick={close}><X size={19} /></button>
    </div>
    <nav className="reader-nav" aria-label="切换鱼种">
      <button className="soft-button" onClick={() => onStep(-1)} disabled={count < 2} aria-label="上一种鱼" title="上一种鱼 · ←"><ArrowLeft size={16} /><span>上一种</span></button>
      <span className="reader-counter" aria-live="polite" aria-atomic="true"><b>{index + 1}</b> / {count}<small>{selected.name}</small></span>
      <button className="soft-button" onClick={() => onStep(1)} disabled={count < 2} aria-label="下一种鱼" title="下一种鱼 · →"><span>下一种</span><ArrowRight size={16} /></button>
    </nav>
    <div className="reader-filmstrip" aria-label="快速选择鱼种">
      {thumbnails.map((fish) => <button key={fish.id} className={fish.id === selected.id ? "active" : ""} aria-pressed={fish.id === selected.id}
        aria-label={`切换到${fish.name}`} title={fish.name} onClick={() => onSelect(fish)}>
        <img src={fish.photo!.path} alt="" />
      </button>)}
    </div>
    <p className="reader-shortcuts"><span>← → 切换 · Esc 返回</span><span>按当前筛选结果浏览</span></p>
    <div className="reader-content" ref={content}><div className="reader-specimen" key={selected.id}>{children}</div></div>
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
  inline,
}: {
  fish: Fish;
  close: () => void;
  plannerFindings?: Finding[];
  saved: boolean;
  toggleSave: () => void;
  compared: boolean;
  toggleCompare: () => void;
  viewEvidence: () => void;
  inline?: boolean;
}) {
  const r = regions.find((r) => r.id === fish.region)!;
  return (
    <DetailContainer label={`${fish.name}图鉴`} close={close} inline={inline}>
      <button
        className="icon-button close-detail"
        onClick={close}
        aria-label="关闭鱼种详情"
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
        <DetailPhoto name={fish.name} scientific={fish.scientific} photo={fish.photo}>
          <FishImage key={fish.id} fish={fish} large />
        </DetailPhoto>
        <div className="detail-image-footer">
          <span>
            <span className="live-dot" />
            {r.name}
          </span>
          <span>{fish.photo ? "物种参考照片" : "原创形态示意"}</span>
        </div>
      </div>
      <div className="detail-body">
        <div className="eyebrow">
          {fish.water === "marine" ? "MARINE" : "FRESHWATER"} FIELD GUIDE
        </div>
        <h2>{fish.name}</h2>
        <p className="scientific">{fish.scientific}</p>
        <p className="detail-intro">{fish.description}</p>
        <div className="detail-actions">
          <button
            className={`soft-button ${saved ? "selected" : ""}`}
            onClick={toggleSave}
          >
            <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
            {saved ? "已收藏" : "收藏鱼种"}
          </button>
          <button
            className={`soft-button ${compared ? "selected" : ""}`}
            onClick={toggleCompare}
          >
            <GitCompareArrows size={16} />
            {compared ? "已加入对比" : "加入对比"}
          </button>
          <FeedbackLink fish={fish} />
        </div>
        <div className="metrics">
          <Metric
            label={`成鱼体长 · ${fish.lengthType}`}
            value={fish.length ? `${fish.length} cm` : "资料待补充"}
          />
          <Metric
            label="来源列出的缸长"
            value={fish.tank ? `${fish.tank} cm 起` : "资料待补充"}
          />
          <Metric label="水温范围" value={rangeText(fish.temperature, " °C")} />
          <Metric label="pH 范围" value={rangeText(fish.ph)} />
        </div>
        <p className="parameter-note">
          {fish.parameterNote} {fish.tankNote}
        </p>
        {fish.water === "marine" && (
          <div className="metrics">
            <Metric
              label="来源最低容积"
              value={fish.minVolume ? `${fish.minVolume} L` : "资料待补充"}
            />
            <Metric label="比重 SG" value={rangeText(fish.specificGravity)} />
          </div>
        )}
        {plannerFindings && (
          <section className="detail-section planner-detail-check">
            <h3><Info size={16} />与你的鱼缸核对</h3>
            <p>按当前规划参数生成；示例水质仍需实测，以下结果不等于混养安全结论。</p>
            <Findings items={plannerFindings} />
            <p className="small-note">{fish.tankNote} {fish.parameterNote}</p>
          </section>
        )}
        <section className="detail-section">
          <h3>
            <Globe2 size={16} />
            来自哪里
          </h3>
          <p>{fish.distribution}</p>
          <BasinTags fish={fish} /><DistributionDetails fish={fish} />
          <span className="small-note">
            地图标记为探索区域入口，不是采集点或完整分布边界。
          </span>
        </section>
        <section className="detail-section">
          <h3>
            <Waves size={16} />
            如何相处
          </h3>
          <p>{fish.behavior}</p>
          <div className="caution">
            <Info size={15} />
            <span>{fish.caution}</span>
          </div>
        </section>
        <Taxonomy fish={fish} />
        <button className="soft-button" onClick={viewEvidence}>
          在地球查看证据
        </button>
        <details className="source-details">
          <summary>
            资料来源与图片署名 <ChevronRight size={15} />
          </summary>
          <SourceLink fish={fish} />
          <p>
            访问：{fish.accessedAt} · 已核对页面信息，尚未经过鱼类专家审定。
          </p>
          <p>
            硬度：{rangeText(fish.hardness, " dGH")}。SL 为标准体长，TL
            为全长。缺失字段保留空值。
          </p>
          {fish.aliases.length > 0 && (
            <p>检索别名／旧学名：{fish.aliases.join("、")}</p>
          )}
          {fish.photo ? (
            <p>
              照片：{fish.photo.author} ·{" "}
              <a href={fish.photo.pageUrl} target="_blank" rel="noreferrer">
                原始文件
              </a>{" "}
              ·{" "}
              <a href={fish.photo.licenseUrl} target="_blank" rel="noreferrer">
                {fish.photo.license}
              </a>
              。展示可能包含人工品系，图片不代表所有个体的形态。
            </p>
          ) : (
            <p>本图为项目原创示意插画，不能用于物种鉴定。</p>
          )}
        </details>
        <FeedbackNote />
      </div>
    </DetailContainer>
  );
}

function PhotoDetail({ profile, close, saved, toggleSave, inline }: {
  profile: PhotoProfile;
  close: () => void;
  saved: boolean;
  toggleSave: () => void;
  inline?: boolean;
}) {
  const waterName = profile.water === "marine" ? "海水" : profile.water === "freshwater" ? "淡水" : profile.water === "brackish" ? "半咸水" : "待核实";
  return (
    <DetailContainer label={`${profile.name}图鉴`} close={close} inline={inline}>
      <button className="icon-button close-detail" onClick={close} aria-label="关闭鱼种详情"><X size={21} /></button>
      <div className="detail-visual">
        <div className="detail-serial">PHOTO / GBIF {profile.gbifKey}</div>
        <DetailPhoto name={profile.name} scientific={profile.scientific} photo={profile.photo}>
          <div className="fish-image large"><img src={profile.photo.path} alt={`${profile.name}，${profile.scientific}`} /></div>
        </DetailPhoto>
        <div className="detail-image-footer"><span><span className="live-dot" />有来源的物种照片</span><span>{waterName} · {profile.family}</span></div>
      </div>
      <div className="detail-body">
        <div className="eyebrow">PHOTO-BACKED FIELD GUIDE</div>
        <h2>{profile.name}</h2>
        <p className="scientific">{profile.scientific}</p>
        {profile.intro && <p className="detail-intro" lang="en">{profile.intro}</p>}
        <div className="detail-actions"><button className={`soft-button ${saved ? "selected" : ""}`} onClick={toggleSave}><Bookmark size={16} fill={saved ? "currentColor" : "none"} />{saved ? "已收藏" : "收藏鱼种"}</button><FeedbackLink fish={profile} /></div>
        <div className="metrics"><Metric label="科" value={profile.family} /><Metric label="属" value={profile.scientific.split(" ")[0]} /><Metric label="GBIF 环境标签" value={waterName} /></div>
        <section className="detail-section"><h3><Globe2 size={16} />地理分布</h3><p>{fishLocations(profile).length ? `已关联原生水域：${fishLocations(profile).map((place) => place.label).join("、")}。` : distributions[profile.id]?.unlocatedReason}</p><BasinTags fish={profile} /><DistributionDetails fish={profile} /></section>
        <section className="detail-section"><h3><Waves size={16} />野外习性</h3><p lang={profile.behavior ? "en" : undefined}>{profile.behavior || "资料待补充；不能根据近缘鱼推断本物种的食性或相处方式。"}</p></section>
        <div className="caution"><Info size={15} /><span>这条鱼尚无经核对的鱼缸养护参数，因此不进入鱼缸规划。图片依据文件名、描述与学名匹配，尚待鱼类专家复核；英文节选需结合原文及引用文献阅读。</span></div>
        <details className="source-details" open><summary>资料来源与图片署名 <ChevronRight size={15} /></summary>
          <p>分类：<a href={`https://www.gbif.org/species/${profile.gbifKey}`} target="_blank" rel="noreferrer">GBIF 物种记录</a> · <a href={profile.wikidataUrl} target="_blank" rel="noreferrer">Wikidata</a></p>
          <p>英文文字：Wikipedia contributors，<a href={profile.wikipediaUrl} target="_blank" rel="noreferrer">物种词条与编辑历史</a>，<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>；本站仅保留短段落，不视为专家复核。</p>
          <p>照片：{profile.photo.author} · <a href={profile.photo.pageUrl} target="_blank" rel="noreferrer">原始文件</a> · <a href={profile.photo.licenseUrl} target="_blank" rel="noreferrer">{profile.photo.license}</a>。</p>
        </details>
        <FeedbackNote />
      </div>
    </DetailContainer>
  );
}

export default function App() {
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
  const [basinPickerOpen, setBasinPickerOpen] = useState(false);
  const [reset, setReset] = useState(0);
  const [rotate, setRotate] = useState(false);
  const [ready, setReady] = useState(false);
  const [glFailed, setGlFailed] = useState(false);
  const reading = !!selected && backgroundPath === "/explore" && location.state?.from === "/explore" && !glFailed;
  const exploreLayout = useRef<HTMLDivElement>(null);
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
      filterFish(fishes, query, region, size, isSaved, saved).filter(
        (f) => (!water || f.water === water) && (!basin || fishLocationIds(f).includes(basin)),
      ),
    [query, region, basin, size, isSaved, saved, water],
  );
  const imageResults: (Fish | PhotoProfile)[] = [
    ...results.filter((fish) => fish.photo !== null),
    ...photoProfiles.filter((profile) => {
      if (size) return false; // These records have no verified adult length.
      if (region && exploreProfileRegion(profile) !== region) return false;
      if (basin && !fishLocationIds(profile).includes(basin)) return false;
      if (isSaved && !saved.includes(profile.id)) return false;
      if (water && profile.water !== water) return false;
      const needle = query.trim().toLocaleLowerCase();
      return !needle || [profile.name, profile.scientific, profile.family, ...(commonNames[profile.scientific]?.aliases ?? [])].some((field) =>
        field.toLocaleLowerCase().includes(needle),
      );
    }),
  ].sort((a, b) => a.scientific.localeCompare(b.scientific, "en"));
  const exploreResults = imageResults.filter((item) => {
    const mapped = fishLocationIds(item).length > 0;
    return exploreScope === "regional" ? mapped : exploreScope === "unlocated" ? !mapped : true;
  }).sort((a, b) => {
    const aCurated = "gbifKey" in a ? 1 : 0;
    const bCurated = "gbifKey" in b ? 1 : 0;
    return aCurated - bCurated;
  });
  const visibleGlobePhotos = exploreResults.map((item) => globePhotoById.get(item.id)!);
  const mappedGlobeCount = exploreResults.filter((item) => fishLocationIds(item).length > 0).length;
  const browseSequence = selected && !exploreResults.some((item) => item.id === selected.id) ? [selected] : exploreResults;
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
      ? `${(selectedFish || selectedPhoto)!.name} · 鱼类星球`
      : "鱼类星球 · FISH ATLAS";
  }, [selectedFish, selectedPhoto]);
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
  const go = (path: string) =>
    navigate({ pathname: path, search: params.toString() });
  const changeExploreGeography = (change: (current: URLSearchParams) => URLSearchParams) => {
    if (reading) navigate({ pathname: "/explore", search: change(params).toString() }, { replace: true });
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
    if (backgroundPath === "/explore" && !selectedId) readerOrigin.current = {
      id, element: document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null, scroll: window.scrollY,
    };
  };
  const openFish = (f: Fish, plannerFindings?: Finding[]) => {
    rememberReaderOrigin(f.id);
    readerCursor.current = f.id;
    navigate(
      { pathname: `/species/${f.id}`, search: params.toString() },
      { replace: reading, state: { from: backgroundPath, plannerFindings } },
    );
  };
  const openPhoto = (p: PhotoProfile) => {
    rememberReaderOrigin(p.id);
    readerCursor.current = p.id;
    navigate(
      { pathname: `/species/${p.id}`, search: params.toString() },
      { replace: reading, state: { from: backgroundPath } },
    );
  };
  const openReaderItem = (item: Fish | PhotoProfile) => "gbifKey" in item ? openPhoto(item) : openFish(item);
  const stepReader = (direction: number) => {
    if (browseSequence.length < 2) return;
    const index = browseSequence.findIndex((item) => item.id === (readerCursor.current ?? selectedId));
    openReaderItem(browseSequence[(index + direction + browseSequence.length) % browseSequence.length]);
  };
  const closeFish = () => {
    if (location.state?.from) navigate(-1);
    else go("/atlas");
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
      setToast("最多同时对比 3 种鱼，请先移除一种。");
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
  const detailContent = selectedFish ? <FishDetail
    key={selectedFish.id} fish={selectedFish} close={closeFish} inline={reading}
    plannerFindings={isPlanner ? location.state?.plannerFindings : undefined}
    saved={saved.includes(selectedFish.id)} toggleSave={() => toggleSave(selectedFish.id)}
    compared={compare.includes(selectedFish.id)} toggleCompare={() => toggleCompare(selectedFish.id)}
    viewEvidence={() => {
      const p = new URLSearchParams(); p.set("evidence", selectedFish.id); p.set("region", selectedFish.region);
      navigate({ pathname: "/explore", search: p.toString() }); setActiveOccurrence("");
    }}
  /> : selectedPhoto ? <PhotoDetail key={selectedPhoto.id} profile={selectedPhoto} close={closeFish} inline={reading}
    saved={saved.includes(selectedPhoto.id)} toggleSave={() => toggleSave(selectedPhoto.id)} /> : null;
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
        跳到图鉴内容
      </a>
      <header className="header">
        <button
          className="brand"
          onClick={() => {
            navigate("/explore");
            setReset((x) => x + 1);
          }}
          aria-label="鱼类星球首页"
        >
          <span className="brand-symbol">
            <FishIcon size={26} />
          </span>
          <span>
            鱼类星球<small>FISH ATLAS</small>
          </span>
        </button>
        <nav aria-label="主导航">
          <button
            className={!listActive && !isPlanner && !isCatalog ? "active" : ""}
            onClick={() => go("/explore")}
          >
            <Globe2 size={16} />
            探索地球
          </button>
          <button
            className={listActive && !isSaved ? "active" : ""}
            onClick={() => go("/atlas")}
          >
            <ListFilter size={16} />
            鱼类图鉴
          </button>
          <button
            className={isCatalog ? "active" : ""}
            onClick={() => go("/catalog")}
          >
            <Search size={16} />
            物种目录
          </button>
          <button
            className={isSaved ? "active" : ""}
            onClick={() => go("/saved")}
          >
            <Bookmark size={15} />
            我的收藏
            {saved.length > 0 && (
              <span className="nav-count">{saved.length}</span>
            )}
          </button>
          <button
            className={isPlanner ? "active" : ""}
            onClick={() => go("/planner")}
          >
            <SlidersHorizontal size={15} />
            鱼缸规划
          </button>
        </nav>
        <button className="about-button" onClick={() => setAbout(true)}>
          <span className="live-dot" />
          关于图鉴
          <Info size={15} />
        </button>
      </header>
      <main id="main-content" tabIndex={-1}>
        {isPlanner ? (
          <Planner fishes={fishes} onFish={openFish} />
        ) : isCatalog ? (
          <Suspense fallback={<div className="catalog-loading" role="status">正在打开物种目录…</div>}>
            <Catalog fishes={fishes} photoProfiles={photoProfiles} onFish={openFish} onPhoto={openPhoto} />
          </Suspense>
        ) : !listActive ? (
          <div className={`explore-layout${reading ? " reading" : ""}`} ref={exploreLayout}>
            <section className="intro" inert={reading} aria-hidden={reading}>
              <div className="eyebrow">
                <span />
                THE LIVING BLUE PLANET
              </div>
              <h1>
                每一条鱼，
                <br />
                都有一片<span>故乡。</span>
              </h1>
              <p>
                从亚马孙的雨林溪流，到东非的古老湖泊。
                <br className="desktop-break" />
                转动地球，认识水下世界的居民。
              </p>
              <button className="text-button" onClick={() => go("/atlas")}>
                翻开鱼类图鉴
                <ArrowRight size={17} />
              </button>
              <div className="intro-stats">
                <div>
                  <strong>{(fishes.length + photoProfiles.length).toString()}</strong>
                  <span>种真实照片图鉴</span>
                </div>
                <i />
                <div>
                  <strong>{basins.length}</strong>
                  <span>个全球主要流域</span>
                </div>
              </div>
              <div className="field-note">
                <Waves size={24} />
                <div>
                  <span>FIELD NOTE / 001</span>
                  <p>
                    了解它从哪里来，
                    <br />
                    才能理解它需要什么。
                  </p>
                </div>
              </div>
            </section>
            <section className="globe-stage" aria-label="地球探索">
              <div className="orbital-ring ring-one" />
              <div className="orbital-ring ring-two" />
              <div className="globe-coordinate">
                23° 26′ N <span>—</span> THE BLUE MARBLE
              </div>
              {!ready && (
                <div className="globe-loading">
                  <span className="loading-orbit" />
                  正在展开水下世界…
                </div>
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
                {activeLocation ? `${activeLocation.label} · ${mappedGlobeCount} 种已关联鱼` : activeRegion ? `${activeRegion.name} · ${mappedGlobeCount} 种已关联水域` : `${mappedGlobeCount} 种已定位水域 · ${exploreResults.length} 种在列表`}
                <small>主要河流常显 · 悬停看归属 · 选择水域看范围 · 非观测点</small>
              </div>
              <div className="globe-controls">
                <span>
                  <Maximize2 size={13} />
                  拖动旋转 · 滚轮缩放
                </span>
                <button className="globe-basin-button" title="筛选流域、海域与湖泊" aria-label="选择流域、海域或湖泊" onClick={() => setBasinPickerOpen(true)}><Globe2 size={15} /><span>选择水域</span></button>
                <button
                  title="重置视角"
                  aria-label="重置视角"
                  onClick={() => {
                    clearGeography();
                    setReset((x) => x + 1);
                  }}
                >
                  <RotateCcw size={16} />
                </button>
                {!reading && <button
                  title={rotate ? "暂停自转" : "开启自转"}
                  aria-label={rotate ? "暂停自转" : "开启自转"}
                  onClick={() => setRotate(!rotate)}
                >
                  {rotate ? <Pause size={16} /> : <Play size={16} />}
                </button>}
              </div>
            </section>
            <aside className={`species-panel${reading ? " reader-panel" : ""}`}>
              {reading && selected ? <ExploreReader selected={selected} sequence={browseSequence}
                onSelect={openReaderItem} onStep={stepReader} close={closeFish}>{detailContent}</ExploreReader> : <>
              <div className="panel-head">
                <div className="eyebrow">DISCOVER SPECIES</div>
                <h2>
                  {activeLocation?.label ?? activeRegion?.name ?? "从一条鱼开始"}
                  <span>{exploreResults.length}</span>
                </h2>
              </div>
              <SearchBar value={query} onChange={(v) => update("q", v)} />
              <div className="explore-filter-groups">
                <div className="explore-filter-row" aria-label="展示范围筛选">
                  {[
                    ["all", "全部照片", allGlobePhotos.length],
                    ["regional", "已定位", basinLinkedCount],
                    ["unlocated", "待定位", allGlobePhotos.length - basinLinkedCount],
                  ].map(([value, label, count]) => (
                    <button key={value} className={exploreScope === value ? "active" : ""}
                      onClick={() => chooseExploreScope(String(value))}
                      aria-pressed={exploreScope === value}>{label}<b>{count}</b></button>
                  ))}
                </div>
                <div className="explore-filter-row water" aria-label="水体筛选">
                  {[["", "全部水体"], ["freshwater", "淡水"], ["marine", "海水"], ["brackish", "半咸水"]].map(([value, label]) => (
                    <button key={value} className={water === value ? "active" : ""}
                      onClick={() => update("water", value)} aria-pressed={water === value}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="panel-filter">
                <span>
                  {water === "marine"
                    ? "海水鱼"
                    : water === "freshwater"
                      ? "淡水鱼"
                      : water === "brackish"
                        ? "半咸水鱼"
                        : "全部水体"}{" "}
                  · {activeLocation ? "已选择水域" : activeRegion ? "已选择区域" : "全部照片图鉴"}
                </span>
                {region || basin ? (
                  <button onClick={clearGeography}>
                    清除{basin ? "流域" : "区域"}
                    <X size={12} />
                  </button>
                ) : (
                  <SlidersHorizontal size={14} />
                )}
              </div>
              {!activeRegion && !activeLocation && (
                <p className="explore-coverage">
                  地球已展示 {basinLinkedCount} 种鱼的原生水域；其余 {allGlobePhotos.length - basinLinkedCount} 种保留在列表。选择流域、海域或湖泊查看关联鱼；展示位置不是采集点。
                </p>
              )}
              {activeLocation && !activeBasin && <p className="explore-coverage">{activeLocation.label} · {locationKindNames[activeLocation.kind]}。{activeLocation.geometry ? "边界为水域示意，不是物种分布范围。" : "按有来源的水域位置展示，尚无边界多边形。"}</p>}
              {activeBasin && <p className="explore-coverage">流域边界来自 GRDC 2020；这里仅显示图鉴资料提及该流域或所属支流的鱼。{!exploreResults.length && "当前尚无可核实的关联鱼种。"}</p>}
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
                        ? <span className="fish-image"><img src={f.photo.path} alt={`${f.name}照片`} loading="lazy" /></span>
                        : <FishImage fish={f} />}
                      <span className="compact-name">
                        <strong>{f.name}</strong>
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
                浏览鱼类图鉴
                <ArrowRight size={16} />
              </button>
              </>}
            </aside>
            <section className="region-section">
              <div className="section-label">
                <span>精选水域入口</span>
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
                      <strong>{r.name}</strong>
                      <span>{r.subtitle} · {allExploreSpecies.filter((f) => f.region === r.id).length} 种</span>
                    </span>
                    <span className="region-arrow">
                      <ArrowRight size={18} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="basin-section" aria-label="全球主要流域">
              <div className="basin-section-head">
                <div><span className="eyebrow">GRDC · GLOBAL BASINS</span><h2>从一条河，探索全世界。</h2>
                  <p>{basins.length} 个主要河流与湖泊流域，覆盖六大洲。地图边界与鱼种资料分别核对；目前 {basinSpeciesCount.size} 个流域有图鉴鱼种关联。</p></div>
                <button onClick={() => setBasinPickerOpen(true)}>查找全部 {basins.length} 个流域 <ArrowRight size={16} /></button>
              </div>
              <div className="basin-featured-grid">
                {featuredBasins.map((item) => <button key={item.id} className={basin === item.id ? "active" : ""} onClick={() => chooseBasin(item.id)}>
                  <span>{continentNames[item.continent]} · {Math.round(item.areaKm2 / 10000).toLocaleString()} 万 km²</span>
                  <strong>{item.label}</strong><small>{basinSpeciesCount.get(item.id) ? `${basinSpeciesCount.get(item.id)} 种已关联鱼` : "鱼种资料待补"}</small>
                </button>)}
              </div>
              <p className="basin-disclaimer">流域采用 GRDC 2020 定义；海域和湖泊独立定位。关联流域不表示鱼占据整条水系，宽泛海洋记录也不会伪装成精确采集点。</p>
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
                <h1>{isSaved ? "我的收藏" : "鱼类图鉴，认识水下世界。"}</h1>
                <p>
                  {isSaved
                    ? "把喜欢的鱼留下，下次接着探索。"
                    : "按名字、全球主要流域和体型寻找鱼种；流域筛选只显示资料提及该水系或所属支流的条目。"}
                </p>
                {!isSaved && <button className="catalog-jump" onClick={() => go("/catalog")}>浏览 {catalogManifest.totalEntries.toLocaleString()} 条分类目录 <ArrowRight size={14} /></button>}
              </div>
              <span className="atlas-total">
                {imageResults.length}
                <small>种鱼</small>
              </span>
            </div>
            {glFailed && (
              <p className="status-notice">
                当前设备未能加载 3D 地球，已为你打开完整图鉴。
              </p>
            )}
            <div className="atlas-toolbar">
              <SearchBar value={query} onChange={(v) => update("q", v)} />
              <div className="region-pills">
                <button
                  className={!region && !basin ? "active" : ""}
                  onClick={clearGeography}
                >
                  全部区域
                </button>
                {regions.map((r) => (
                  <button
                    key={r.id}
                    className={region === r.id ? "active" : ""}
                    onClick={() => chooseRegion(r.id)}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
              <button className={`atlas-basin-trigger ${activeLocation ? "active" : ""}`} onClick={() => setBasinPickerOpen(true)}>
                <Globe2 size={17} /><span>{activeLocation ? activeLocation.label : `选择流域、海域或湖泊 · ${basins.length} 流域`}</span><ChevronRight size={15} />
              </button>
              {activeLocation && <button className="atlas-basin-clear" onClick={clearGeography} aria-label="清除流域筛选"><X size={15} /></button>}
              <div className="size-filter">
                <Select value={water || "all"} onValueChange={(value) => update("water", value === "all" ? "" : value)}>
                  <SelectTrigger aria-label="水体筛选"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部水体</SelectItem>
                    <SelectItem value="freshwater">淡水</SelectItem>
                    <SelectItem value="marine">海水</SelectItem>
                    <SelectItem value="brackish">半咸水</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="size-filter">
                <SlidersHorizontal size={15} />
                <Select value={size || "all"} onValueChange={(value) => update("size", value === "all" ? "" : value)}>
                  <SelectTrigger aria-label="按成鱼体长筛选"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部体型</SelectItem>
                    <SelectItem value="small">小型 ≤ 5 cm</SelectItem>
                    <SelectItem value="medium">中型 5–12 cm</SelectItem>
                    <SelectItem value="large">大型 ＞ 12 cm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {activeLocation && !activeBasin && <p className="atlas-basin-notice">{activeLocation.label} · {locationKindNames[activeLocation.kind]} · 已关联 {imageResults.length} 种有照片的鱼。</p>}
            {activeBasin && <p className="atlas-basin-notice">{activeBasin.label} · {continentNames[activeBasin.continent]} · GRDC 估算汇水面积约 {activeBasin.areaKm2.toLocaleString()} km²。{imageResults.length ? `已关联 ${imageResults.length} 种有照片的鱼。` : "当前图鉴尚无可核实的关联鱼种；这不表示该流域没有鱼。"}</p>}
            {imageResults.length ? (
              <div className="fish-grid">
                {imageResults.map((f, i) => "gbifKey" in f ? (
                  <article className="fish-card" key={f.id}>
                    <button className="card-open" onClick={() => openPhoto(f)}>
                      <div className="card-image-wrap">
                        <div className="fish-image"><img src={f.photo.path} alt={`${f.name}（${f.scientific}）`} loading="lazy" /></div>
                        <span className="card-number">{String(i + 1).padStart(2, "0")}</span>
                        <span className="card-region">{activeLocation?.label ?? (f.water === "marine" ? "海水" : f.water === "freshwater" ? "淡水" : f.water === "brackish" ? "半咸水" : "水体待核实")}</span>
                      </div>
                      <div className="card-copy">
                        <h2>{f.name}<ArrowRight size={18} /></h2>
                        <p className="scientific">{f.scientific}</p>
                        <div className="card-facts"><span>{f.family}</span><span>养护资料待补充</span></div>
                        <BasinSummary fish={f} />
                      </div>
                    </button>
                    <div className="card-actions">
                      <button aria-label={`${saved.includes(f.id) ? "取消收藏" : "收藏"}${f.name}`} onClick={() => toggleSave(f.id)} className={saved.includes(f.id) ? "selected" : ""}>
                        <Bookmark size={15} fill={saved.includes(f.id) ? "currentColor" : "none"} />
                        {saved.includes(f.id) ? "已收藏" : "收藏"}
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
                          {activeLocation?.label ?? regions.find((r) => r.id === f.region)!.name}
                        </span>
                      </div>
                      <div className="card-copy">
                        <h2>
                          {f.name}
                          <ArrowRight size={18} />
                        </h2>
                        <p className="scientific">{f.scientific}</p>
                        <div className="card-facts">
                          <span>
                            {f.length
                              ? `${f.length} cm ${f.lengthType}`
                              : "体长待补充"}
                          </span>
                          <span>{rangeText(f.temperature, " °C")}</span>
                        </div>
                        <BasinSummary fish={f} />
                      </div>
                    </button>
                    <div className="card-actions">
                      <button
                        aria-label={`${saved.includes(f.id) ? "取消收藏" : "收藏"}${f.name}`}
                        onClick={() => toggleSave(f.id)}
                        className={saved.includes(f.id) ? "selected" : ""}
                      >
                        <Bookmark
                          size={15}
                          fill={saved.includes(f.id) ? "currentColor" : "none"}
                        />
                        {saved.includes(f.id) ? "已收藏" : "收藏"}
                      </button>
                      <button
                        className={compare.includes(f.id) ? "selected" : ""}
                        onClick={() => toggleCompare(f.id)}
                        aria-label={`${compare.includes(f.id) ? "移除对比" : "对比"}${f.name}`}
                      >
                        {compare.includes(f.id) ? (
                          <Check size={15} />
                        ) : (
                          <GitCompareArrows size={15} />
                        )}
                        对比
                      </button>
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
          一份持续生长的水下自然笔记
        </span>
        <span>
          {fishes.length + photoProfiles.length} PROFILES · {catalogManifest.totalEntries.toLocaleString()} TAXA · {basins.length} BASINS
          <button onClick={() => setAbout(true)}>
            数据与图片来源
            <ExternalLink size={11} />
          </button>
          <FeedbackLink />
        </span>
      </footer>
      {storageWarning && (
        <div className="storage-warning" role="status">
          浏览器存储不可用，收藏仅在本次浏览中保留。
          <button
            onClick={() => setStorageWarning(false)}
            aria-label="关闭存储提示"
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
              {compare.length} / 3 种鱼
            </span>
            <div>
              {compare.map((id) => (
                <button
                  key={id}
                  onClick={() => toggleCompare(id)}
                  aria-label={`移除对比${fishes.find((f) => f.id === id)?.name}`}
                >
                  {fishes.find((f) => f.id === id)?.name}
                  <X size={12} />
                </button>
              ))}
            </div>
            <button className="primary-button" onClick={openCompare}>
              开始对比
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      {!reading && detailContent}
      {selectedId && !selectedFish && !selectedPhoto && (
        <Modal label="没有找到鱼种" onClose={() => go("/atlas")}>
          <div className="simple-dialog">
            <h2>没有找到这条鱼</h2>
            <p>链接可能已变更，请返回图鉴搜索。</p>
            <button className="primary-button" onClick={() => go("/atlas")}>
              返回图鉴
            </button>
          </div>
        </Modal>
      )}
      {location.pathname === "/compare" && (
        <Modal
          label="鱼种对比"
          onClose={closeCompare}
          className="compare-modal"
        >
          <div className="compare-heading">
            <div>
              <div className="eyebrow">SIDE BY SIDE</div>
              <h2>仔细了解，再做选择。</h2>
            </div>
            <button
              className="icon-button"
              onClick={closeCompare}
              aria-label="关闭对比"
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
                      <th>饲养参考</th>
                      {compareFish.map((f) => (
                        <th key={f.id}>
                          <FishImage fish={f} />
                          <strong>{f.name}</strong>
                          <em>{f.scientific}</em>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [
                        "成鱼体长",
                        (f: Fish) =>
                          f.length
                            ? `${f.length} cm ${f.lengthType}`
                            : "资料待补充",
                      ],
                      [
                        "来源列出的缸长",
                        (f: Fish) =>
                          f.tank ? `${f.tank} cm 起` : "资料待补充",
                      ],
                      [
                        "水温范围",
                        (f: Fish) => rangeText(f.temperature, " °C"),
                      ],
                      [
                        "水体",
                        (f: Fish) => (f.water === "marine" ? "海水" : "淡水"),
                      ],
                      [
                        "比重 SG",
                        (f: Fish) =>
                          f.water === "marine"
                            ? rangeText(f.specificGravity)
                            : "不适用",
                      ],
                      [
                        "有效水量参考",
                        (f: Fish) =>
                          f.minVolume ? `${f.minVolume} L` : "资料待补充",
                      ],
                      ["适用条件", (f: Fish) => f.tankNote],
                      ["pH 范围", (f: Fish) => rangeText(f.ph)],
                      ["硬度范围", (f: Fish) => rangeText(f.hardness, " dGH")],
                      ["具体原生地", (f: Fish) => f.distribution],
                      ["相处与风险", (f: Fish) => f.caution],
                    ].map(([label, fn]) => (
                      <tr key={label as string}>
                        <th>{label as string}</th>
                        {compareFish.map((f) => (
                          <td key={f.id}>{(fn as (f: Fish) => string)(f)}</td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <th>资料来源</th>
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
                <h3>已知组合风险</h3>
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
                  带入鱼缸规划
                </button>
              </section>
              <div className="caution">
                <Info size={17} />
                <span>
                  参数重叠不等于可以混养。还需要考虑数量、缸体空间、领地行为和捕食风险；本表不输出混养安全结论。
                </span>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>先从图鉴中选择最多 3 种鱼。</p>
              <button onClick={() => go("/atlas")}>
                前往图鉴
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </Modal>
      )}
      {basinPickerOpen && <BasinPicker selected={basin} onSelect={chooseBasin} onClose={() => setBasinPickerOpen(false)} />}
      {about && (
        <Modal
          label="关于鱼类星球"
          onClose={() => setAbout(false)}
          className="about-modal"
        >
          <button
            className="icon-button close-detail"
            aria-label="关闭关于图鉴"
            onClick={() => setAbout(false)}
          >
            <X />
          </button>
          <div className="eyebrow">A LIVING FIELD GUIDE</div>
          <h2>好奇心，从水面之下开始。</h2>
          <p>
            鱼类星球收录 {fishes.length + photoProfiles.length} 种有照片和来源的图鉴，其中 {fishes.length} 种有逐条核对的养护参考；其余 {catalogManifest.totalEntries - fishes.length - photoProfiles.length} 条 GBIF 分类记录暂无照片。照片图鉴不等于适养鱼种，新增条目没有核对过的养护参数。当前为本地预览版，资料尚未经过鱼类专家审定。
          </p>
          <h3>读懂这颗地球</h3>
          <p>
            地球默认显示全球主要河流与湖泊，放大时补充重要支流；选择或查看鱼的归属时，才高亮对应水域范围。可筛选 {basins.length} 个 GRDC 主要流域，以及独立湖泊和海域。FishBase 26.06 与物种分布文献提供原生水域依据，排除引入记录。有边界的展示位经多边形校验；小水域使用有来源的位置锚点。照片标记和引导线都是展示位置，不是采集点；水域边界不是物种完整分布边界。河网、陆地海岸线、湖面与海域示意来自 Natural Earth。
          </p>
          <p>流域数据：<a href="https://mrb.grdc.bafg.de/" target="_blank" rel="noreferrer">GRDC (2020), Major River Basins, 2nd revised edition</a>，基于 <a href="https://www.hydrosheds.org/products/hydrobasins" target="_blank" rel="noreferrer">HydroSHEDS／HydroBASINS（© WWF）</a>；本站为地球浏览进行了简化，面积是原数据的估算值。</p>
          <h3>资料与照片</h3>
          <p>
            分布与参数参考 Seriously Fish、LiveAquaria、Florida Museum、Fishes
            of Australia 与 NOAA；分类及历史观测快照来自
            GBIF，缺失字段保留空值。扩充目录的学名和科属来自 GBIF Backbone Taxonomy，按 CC BY 4.0 署名。识别照片来自 Wikimedia
            Commons，每张照片在详情中列出作者、原始页面与许可；示意插画由本项目绘制，不作为鉴定依据。
          </p>
          <section className="feedback-invite" aria-label="参与完善鱼类资料">
            <h3>一起完善这份图鉴</h3>
            <p>补充缺失的习性或养护资料，指出名称、分布和图片中的错误，也可以推荐尚未收录的鱼。无需知道所有参数，只要说明需要改哪一处；有参考链接或图片出处更方便核对。</p>
            <FeedbackLink>在 GitHub 提交建议</FeedbackLink>
            <p className="feedback-note">需要 GitHub 登录。提交的建议会公开显示，核对后再更新图鉴；点击入口不会自动提交。</p>
          </section>
          <h3>隐私与收藏</h3>
          <p>
            收藏保存在当前浏览器，不上传服务器。所有图鉴与图片随应用提供，浏览时无需登录或连接外部数据服务。
          </p>
          <div className="source-index">
            {fishes.map((f) => (
              <div key={f.id}>
                <strong>{f.name}</strong>
                <SourceLink fish={f} />
                {f.photo && (
                  <a href={f.photo.pageUrl} target="_blank" rel="noreferrer">
                    照片 · {f.photo.author} · {f.photo.license}
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            ))}
          </div>
          <p className="small-note">
            资料版本 2026.10.09 / v0.4 · 内容仅作了解物种的起点。
          </p>
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
        aria-label="搜索鱼种"
        placeholder="搜索鱼名、学名或别名 · 输入后自动搜索"
        value={value}
        onValueChange={onChange}
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="清空搜索">
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
      <h3>{saved ? "这里还没有鱼" : "暂时没有找到"}</h3>
      <p>
        {saved
          ? "在鱼种卡片上点击收藏，留下你的水下心愿单。"
          : "试试别名、学名，或清除筛选条件。"}
      </p>
      <button onClick={clear}>
        清除筛选
        <ArrowLeft size={14} />
      </button>
    </div>
  );
}
