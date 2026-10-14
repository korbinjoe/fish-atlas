import { describe, expect, it } from "vitest";
import {
  LOCALE_STORAGE_KEY,
  fishName,
  fishText,
  formatNumber,
  isLocale,
  locales,
  locationName,
  readLocale,
  translate,
} from "../src/i18n";
import { appMessages } from "../src/i18n/app";
import { componentMessages } from "../src/i18n/components";
import { dataMessages } from "../src/i18n/data";
import { plannerMessages } from "../src/i18n/planner";
import curatedFish from "../content/species.json";

describe("language preferences", () => {
  it("starts in English with absent, malformed or unavailable storage", () => {
    expect(readLocale(null)).toBe("en");
    for (const preference of [null, "", "es", "fr-FR", "EN", '{"locale":"ja"}']) {
      expect(readLocale({ getItem: () => preference })).toBe("en");
    }
    expect(readLocale({ getItem: () => { throw new Error("storage denied"); } })).toBe("en");
  });

  it("restores each supported preference from its own storage key", () => {
    for (const locale of locales) {
      let requestedKey = "";
      expect(readLocale({ getItem: (key) => { requestedKey = key; return locale; } })).toBe(locale);
      expect(requestedKey).toBe(LOCALE_STORAGE_KEY);
      expect(isLocale(locale)).toBe(true);
    }
    for (const invalid of [undefined, null, 0, {}, "jp", "zh-CN", "english"]) {
      expect(isLocale(invalid)).toBe(false);
    }
  });
});

describe("localized text and factual values", () => {
  it("interpolates quantities including zero without losing a count or replacing literal user text", () => {
    expect(translate("加入规划 · {count} 条", "en", { count: 8 })).toBe("Add to plan · 8 fish");
    expect(translate("加入规划 · {count} 条", "zh", { count: 0 })).toBe("加入规划 · 0 条");
    expect(translate("查看{name}图鉴", "en", { name: "$& {count} fish" })).toBe("View $& {count} fish profile");
    expect(translate("Unknown source: {name}", "de", { name: "Betta splendens" })).toBe("Unknown source: Betta splendens");
  });

  it("keeps specific gravity, SI units and source ranges intact during translation", () => {
    for (const locale of locales) {
      expect(translate("比重 {value}", locale, { value: 1.025 })).toContain("1.025");
      const dimensions = translate("{length} × {width} × {height} cm · 暂估有效水量 {volume} L", locale, {
        length: 60, width: 30, height: 36, volume: 52,
      });
      expect(dimensions).toContain("60 × 30 × 36 cm");
      expect(dimensions).toContain("52 L");
      const range = translate("水温 {value}", locale, { value: "24–28°C" });
      expect(range).toContain("24–28°C");
      expect(range).not.toContain("{value}");
    }
    expect(formatNumber(1234.5, "de", { maximumFractionDigits: 1 })).toBe("1.234,5");
    expect(formatNumber(1.025, "en", { maximumFractionDigits: 3 })).toBe("1.025");
  });

  it("renders a supported common name and preserves the source name in Chinese", () => {
    const neon = { name: "红绿灯", scientific: "  Paracheirodon   innesi ", aliases: ["Neon tetra"] };
    expect(fishName(neon, "zh")).toBe("红绿灯");
    expect(fishName(neon, "en")).toBe("Neon tetra");
    expect(fishName(neon, "fr")).toBe("Néon bleu");
    expect(fishName(neon, "de")).toBe("Neonsalmler");
    expect(fishName(neon, "ja")).toBe("ネオンテトラ");
  });

  it("falls back to the scientific name when a local common name has not been established", () => {
    const unknown = { name: "未核对俗名", scientific: "Exampleus testensis", aliases: ["示例别名"] };
    for (const locale of ["en", "fr", "de", "ja"] as const) {
      expect(fishName(unknown, locale)).toBe("Exampleus testensis");
    }
    expect(fishName({ ...unknown, aliases: ["Recorded English common name"] }, "en")).toBe("Recorded English common name");
  });

  it("does not alter untranslated source prose or return invented numerical content", () => {
    const source = { scientific: "Exampleus testensis", distribution: "Recorded in tributaries at 24–28°C.", length: 6.5 };
    for (const locale of locales) {
      expect(fishText(source, "distribution", locale)).toBe(source.distribution);
      expect(fishText(source, "length", locale)).toBe("");
      expect(fishText(source, "missing", locale)).toBe("");
    }
    expect(source.length).toBe(6.5);
    for (const locale of locales) expect(translate("", locale)).toBe("");
  });

  it("translates curated husbandry and distribution prose without leaving Chinese in European locales", () => {
    const fields = ["description", "habitat", "distribution", "behavior", "caution", "tankNote", "parameterNote", "lengthType"];
    for (const fish of curatedFish) {
      for (const field of fields) {
        const source = (fish as Record<string, unknown>)[field];
        if (typeof source !== "string" || !/[\u3400-\u9fff]/u.test(source)) continue;
        expect(fishText(fish, field, "zh")).toBe(source);
        for (const locale of ["en", "fr", "de"] as const) {
          const text = fishText(fish, field, locale);
          expect(text, `${fish.scientific} ${field} ${locale}`).not.toMatch(/[\u3400-\u9fff]/u);
          expect(text, `${fish.scientific} ${field} ${locale}`).not.toBe("");
        }
      }
    }
  });

  it("uses the waterbody ID for localized names without changing an unknown geographic identity", () => {
    const malawi = { id: "lake-malawi", name: "马拉维湖", english: "Lake Malawi" };
    expect(locationName(malawi, "zh")).toBe("马拉维湖");
    expect(locationName(malawi, "en")).toBe("Lake Malawi");
    expect(locationName(malawi, "de")).toBe("Malawisee");
    expect(locationName({ id: "source-waterbody", name: "源水域", english: "River Example" }, "fr")).toBe("River Example");
  });

  it("provides every UI locale and preserves every named placeholder in the current resources", () => {
    const messages = { ...dataMessages, ...componentMessages, ...plannerMessages, ...appMessages };
    const slots = (text: string) => [...new Set([...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map((match) => match[1]))].sort();
    for (const [source, translations] of Object.entries(messages)) {
      for (const locale of ["en", "fr", "de", "ja"] as const) {
        // A grammatical prefix may be deliberately empty in another language.
        expect(translations[locale], `${locale}: ${source}`).toBeTypeOf("string");
        expect(slots(translations[locale]), `${locale}: ${source}`).toEqual(slots(source));
      }
    }
  });
});
