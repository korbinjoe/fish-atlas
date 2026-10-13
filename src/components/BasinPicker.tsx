import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { basins, continentNames } from "../lib/basins";
import type { ContinentId } from "../lib/basins";
import { locations, locationSpeciesCount, locationKindNames } from "../lib/distribution";
import ImeInput from "./ImeInput";

type Props = {
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};
const continents = Object.entries(continentNames) as [ContinentId, string][];

export default function BasinPicker({ selected, onSelect, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"basin" | "sea" | "lake" | "river">("basin");
  const [continent, setContinent] = useState<ContinentId | "all">("all");
  useEffect(() => {
    const element = dialog.current!;
    const before = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    element.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      element.close();
      document.body.style.overflow = previous;
      before?.focus();
    };
  }, []);
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return locations.filter((place) => place.kind === kind && (kind !== "basin" || continent === "all" || basins.find((b) => b.id === place.id)?.continent === continent) && (!needle || `${place.label} ${place.name} ${place.id}`.toLocaleLowerCase().includes(needle)));
  }, [query, continent, kind]);
  return (
    <dialog ref={dialog} className="basin-dialog" aria-label="选择原生水域"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === dialog.current) onClose(); }}>
      <div className="basin-picker">
        <div className="basin-picker-head">
          <div><span className="eyebrow">WORLD RIVER BASINS</span><h2>选择原生水域</h2>
            <p>按流域、海域或湖泊探索；每个水域标明已关联鱼种数量。</p></div>
          <button aria-label="关闭水域选择" className="basin-close" onClick={onClose}><X size={20} /></button>
        </div>
        <label className="basin-search"><Search size={17} />
          <ImeInput aria-label="搜索水域" placeholder="搜索中文名、原始英文名或编号" value={query} onValueChange={setQuery} />
        </label>
        <div className="basin-continent-tabs" aria-label="水域类型">
          {(["basin", "sea", "lake", "river"] as const).map((value) => <button key={value} className={kind === value ? "active" : ""} aria-pressed={kind === value} onClick={() => { setKind(value); setQuery(""); }}>{locationKindNames[value]} <b>{locations.filter((l) => l.kind === value).length}</b></button>)}
        </div>
        {kind === "basin" && <div className="basin-continent-tabs" aria-label="按大洲筛选流域">
          <button className={continent === "all" ? "active" : ""} aria-pressed={continent === "all"} onClick={() => setContinent("all")}>全部 <b>{basins.length}</b></button>
          {continents.map(([id, name]) => <button key={id} className={continent === id ? "active" : ""}
            aria-pressed={continent === id} onClick={() => setContinent(id)}>{name} <b>{basins.filter((basin) => basin.continent === id).length}</b></button>)}
        </div>}
        <p className="basin-results-label">找到 {results.length} 个{locationKindNames[kind]}{kind === "basin" ? " · 按 GRDC 估算汇水面积排序" : ""}</p>
        <div className="basin-results">
          {results.map((basin) => {
            const count = locationSpeciesCount.get(basin.id) ?? 0;
            return <button key={basin.id} className={selected === basin.id ? "selected" : ""}
              onClick={() => onSelect(basin.id)} aria-label={`查看${basin.label}，${count ? `${count} 种已关联鱼` : "鱼种待补充"}`}>
              <span className="basin-result-name"><strong>{basin.label}</strong>
                {basin.label !== basin.name && <small>{basin.name}</small>}
                <em>{kind === "basin" ? `${continentNames[basins.find((b) => b.id === basin.id)!.continent]} · 约 ${Math.round(basins.find((b) => b.id === basin.id)!.areaKm2).toLocaleString()} km²` : `${locationKindNames[basin.kind]} · ${basin.geometry ? "有水域边界示意" : "有来源的位置锚点"}`}</em></span>
              <span className={`basin-result-count ${count ? "has-fish" : ""}`}>{count ? `${count} 种鱼` : "鱼种待补"}</span>
              {selected === basin.id && <Check size={15} />}
            </button>;
          })}
          {!results.length && <p className="basin-empty">没有找到对应流域，试试原始英文名或切换大洲。</p>}
        </div>
        <p className="basin-source">流域：GRDC 2020；湖泊、海域示意：Natural Earth。原生关联：FishBase 26.06 与物种文献。边界与展示位置不代表完整物种分布。</p>
      </div>
    </dialog>
  );
}
