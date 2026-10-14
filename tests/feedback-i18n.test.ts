import { describe, expect, it } from "vitest";
import { createFeedbackUrl } from "../src/lib/feedback";
import type { Locale } from "../src/i18n";

const fish = { id: "betta-splendens", name: "暹罗斗鱼", scientific: "Betta splendens" };
const pageUrl = "https://fish.example/atlas/?v=preview&query=private#/explore?basin=2421&q=betta";

describe("localized fish feedback links", () => {
  it("uses the English form for every non-Chinese locale while preserving species identity and removing filters", () => {
    const languages: Record<Exclude<Locale, "zh">, string> = { en: "English", fr: "Français", de: "Deutsch", ja: "日本語" };
    for (const [locale, language] of Object.entries(languages)) {
      const issue = new URL(createFeedbackUrl({ fish: { ...fish, name: "Siamese fighting fish" }, pageUrl, locale: locale as Locale }));
      expect(issue.pathname).toBe("/korbinjoe/fish-atlas/issues/new");
      expect(issue.searchParams.get("template")).toBe("fish-data-en.yml");
      expect(issue.searchParams.get("title")).toBe("[Fish data] Siamese fighting fish (Betta splendens) — additions or corrections");
      expect(issue.searchParams.get("fish")).toBe("Siamese fighting fish");
      expect(issue.searchParams.get("scientific")).toBe(fish.scientific);
      expect(issue.searchParams.get("language")).toBe(language);
      expect(issue.searchParams.get("page_url")).toBe("https://fish.example/atlas/#/species/betta-splendens");
    }
    const generic = new URL(createFeedbackUrl({ pageUrl, locale: "en" }));
    expect(generic.searchParams.get("page_url")).toBe("https://fish.example/atlas/#/atlas");
    expect(generic.searchParams.get("title")).toBe("[Fish data] Add information or suggest a species");
  });

  it("keeps the existing Chinese URL contract when locale is omitted or explicitly Chinese", () => {
    const legacy = createFeedbackUrl({ fish, pageUrl });
    expect(createFeedbackUrl({ fish, pageUrl, locale: "zh" })).toBe(legacy);
    const issue = new URL(legacy);
    expect(issue.searchParams.get("template")).toBe("fish-data.yml");
    expect(issue.searchParams.get("title")).toBe("[鱼类资料] 暹罗斗鱼（Betta splendens）补充或纠错");
    expect(issue.searchParams.has("language")).toBe(false);
    expect(issue.searchParams.get("page_url")).toBe("https://fish.example/atlas/#/species/betta-splendens");
  });
});
