import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import catalogEnglishNames from "./english-names.json";
import { appMessages } from "./app";
import { plannerMessages } from "./planner";
import { componentMessages } from "./components";
import { dataMessages, fishTranslations, geographicNames } from "./data";
import { chineseFishName } from "../lib/chineseNames";

export type Locale = "en" | "zh" | "fr" | "de" | "ja";
export type MessageTranslations = Record<Exclude<Locale, "zh">, string>;
export type Messages = Record<string, MessageTranslations>;
export const localeInfo: Record<Locale, { name: string; tag: string }> = {
  en: { name: "English", tag: "en" },
  zh: { name: "中文", tag: "zh-CN" },
  fr: { name: "Français", tag: "fr" },
  de: { name: "Deutsch", tag: "de" },
  ja: { name: "日本語", tag: "ja" },
};
export const locales: Locale[] = ["en", "zh", "fr", "de", "ja"];
export const LOCALE_STORAGE_KEY = "fish-atlas:locale";
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}
export function readLocale(storage: Pick<Storage, "getItem"> | null): Locale {
  try {
    const preference = storage?.getItem(LOCALE_STORAGE_KEY);
    return isLocale(preference) ? preference : "en";
  } catch { return "en"; }
}
function browserLocale(): Locale {
  try { return readLocale(typeof window === "undefined" ? null : window.localStorage); }
  catch { return "en"; }
}
let activeLocale: Locale = browserLocale();
const messages: Messages = { ...dataMessages, ...componentMessages, ...plannerMessages, ...appMessages };
const englishSources = new Map(Object.entries(messages)
  .filter(([, translations]) => translations.en !== "")
  .map(([source, translations]) => [translations.en, source]));
const placeholder = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;
function interpolate(source: string, values?: Record<string, string | number>): string {
  return values ? source.replace(placeholder, (match, key: string) => values[key] === undefined ? match : String(values[key])) : source;
}
export function translate(source: string, locale: Locale = activeLocale, values?: Record<string, string | number>): string {
  const key = messages[source] ? source : englishSources.get(source) ?? source;
  return interpolate(locale === "zh" ? key : messages[key]?.[locale] ?? source, values);
}
export function formatNumber(value: number, locale: Locale = activeLocale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeInfo[locale].tag, options).format(value);
}
type FishNameSource = { id?: string; name: string; scientific?: string; aliases?: string[] };
type LocationNameSource = { id?: string; name: string; english?: string; label?: string; kind?: string };
const scientificKey = (scientific: string) => scientific.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
// Generated from content/catalog.json: normalized scientific name → non-empty
// vernacular, sorted by key. Keep the full taxonomy catalogue lazy-loaded.
const englishFishNames = new Map(Object.entries(catalogEnglishNames));
const englishNames: Record<string, string> = {
  "paracheirodon innesi": "Neon tetra", "paracheirodon axelrodi": "Cardinal tetra",
  "paracheirodon simulans": "Green neon tetra", "pterophyllum scalare": "Freshwater angelfish",
  "hemigrammus bleheri": "Rummy-nose tetra", "nannostomus beckfordi": "Golden pencilfish",
  "carnegiella strigata": "Marbled hatchetfish", "apistogramma cacatuoides": "Cockatoo dwarf cichlid",
  "symphysodon aequifasciatus": "Discus", "hyphessobrycon eques": "Serpae tetra",
  "betta splendens": "Siamese fighting fish", "trichopodus leerii": "Pearl gourami",
  "trichopsis pumila": "Sparkling gourami", "trigonostigma heteromorpha": "Harlequin rasbora",
  "trigonostigma espei": "Lambchop rasbora", "trigonostigma hengeli": "Glowlight rasbora",
  "boraras brigittae": "Chili rasbora", "boraras maculatus": "Dwarf rasbora",
  "pangio kuhlii": "Kuhli loach", "chromobotia macracanthus": "Clown loach",
  "labidochromis caeruleus": "Electric yellow cichlid", "pseudotropheus demasoni": "Demasoni cichlid",
  "melanochromis auratus": "Golden mbuna", "pseudotropheus socolofi": "Pindani cichlid",
  "julidochromis ornatus": "Golden julie", "neolamprologus multifasciatus": "Multies",
  "neolamprologus brichardi": "Princess of Burundi", "neolamprologus leleupi": "Lemon cichlid",
  "cyphotilapia frontosa": "Frontosa", "cyprichromis leptosoma": "Sardine cichlid",
  "amphiprion ocellaris": "Ocellaris clownfish", "paracanthurus hepatus": "Blue tang",
  "pterapogon kauderni": "Banggai cardinalfish", "macrotocinclus affinis": "Golden otocinclus",
  "puntigrus tetrazona": "Tiger barb", "poecilia wingei": "Endler's livebearer",
  "mikrogeophagus ramirezi": "Ram cichlid", "trichogaster chuna": "Honey gourami",
  "corydoras panda": "Panda corydoras", "corydoras paleatus": "Peppered corydoras",
};
export function fishName(fish: FishNameSource, locale: Locale = activeLocale): string {
  if (locale === "zh") return chineseFishName(fish);
  const key = fish.scientific ? scientificKey(fish.scientific) : "";
  // Common names come from the existing source catalogue. Uncertain local names
  // fall back to the scientific name rather than a guessed vernacular identity.
  const common = englishNames[key] ?? englishFishNames.get(key)
    ?? fish.aliases?.find((alias) => !/\p{Script=Han}/u.test(alias) && scientificKey(alias) !== key)
    ?? fish.scientific ?? fish.name;
  return locale === "en" ? common : fishTranslations[key]?.name?.[locale] ?? fish.scientific ?? common;
}
export function locationName(location: LocationNameSource, locale: Locale = activeLocale): string {
  if (locale === "zh") return location.label ?? location.name;
  const translated = geographicNames[location.id ?? ""];
  if (translated) return translated[locale];
  return translate(location.english ?? location.name, locale);
}
export function regionName(region: LocationNameSource, locale: Locale = activeLocale): string {
  return locationName(region, locale);
}
export function fishText(fish: { scientific?: string; [key: string]: unknown }, field: string, locale: Locale = activeLocale): string {
  const value = fish[field];
  if (typeof value !== "string") return "";
  if (locale === "zh") return value;
  const localized = fish.scientific ? fishTranslations[scientificKey(fish.scientific)]?.[field]?.[locale] : undefined;
  return localized ?? translate(value, locale);
}
export const localizedText = translate;
type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (source: string, values?: Record<string, string | number>) => string;
  fishName: (fish: FishNameSource) => string;
  locationName: (location: LocationNameSource) => string;
  regionName: (region: LocationNameSource) => string;
  fishText: (fish: { scientific?: string; [key: string]: unknown }, field: string) => string;
  localizedText: (source: string, values?: Record<string, string | number>) => string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  localeInfo: typeof localeInfo;
};
const I18nContext = createContext<I18nContextValue | null>(null);
const siteDescriptions: Record<Locale, string> = {
  en: "Rotate the globe and explore where fish come from. Fish Atlas is an interactive, source-linked guide to fish and their habitats.",
  zh: "旋转地球，探索鱼类的故乡。鱼类星球是一份有来源、有边界的交互式鱼类图鉴。",
  fr: "Faites tourner le globe et découvrez l’origine des poissons. Fish Atlas est un guide interactif des poissons et de leurs habitats, avec ses sources.",
  de: "Drehen Sie den Globus und entdecken Sie die Herkunft der Fische. Fish Atlas ist ein interaktiver Fischatlas mit Lebensräumen und Quellen.",
  ja: "地球を回して、魚たちのふるさとを探しましょう。Fish Atlas は、出典と生息環境を確認できるインタラクティブな魚類図鑑です。",
};
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(browserLocale);
  activeLocale = locale;
  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    activeLocale = next;
    updateLocale(next);
    try { window.localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch { /* Preference still works for this visit. */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = localeInfo[locale].tag;
    document.querySelector('meta[name="description"]')?.setAttribute("content", siteDescriptions[locale]);
  }, [locale]);
  useEffect(() => {
    const syncPreference = (event: StorageEvent) => {
      if (event.key !== LOCALE_STORAGE_KEY && event.key !== null) return;
      const next = isLocale(event.newValue) ? event.newValue : "en";
      activeLocale = next;
      updateLocale(next);
    };
    window.addEventListener("storage", syncPreference);
    return () => window.removeEventListener("storage", syncPreference);
  }, []);
  const value = useMemo<I18nContextValue>(() => ({
    locale, setLocale, localeInfo,
    t: (source, values) => translate(source, locale, values),
    localizedText: (source, values) => translate(source, locale, values),
    fishName: (fish) => fishName(fish, locale),
    locationName: (location) => locationName(location, locale),
    regionName: (region) => regionName(region, locale),
    fishText: (fish, field) => fishText(fish, field, locale),
    number: (number, options) => formatNumber(number, locale, options),
  }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
