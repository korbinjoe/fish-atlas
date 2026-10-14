import type { Locale } from "../i18n";

export const feedbackRepository = "korbinjoe/fish-atlas";
export const repositoryUrl = `https://github.com/${feedbackRepository}`;

export type FeedbackFish = { id: string; name: string; scientific: string };

export function createFeedbackUrl({ fish, pageUrl, locale = "zh" }: { fish?: FeedbackFish; pageUrl: string; locale?: Locale }): string {
  const page = new URL(pageUrl);
  // Share the species permalink, without search filters or a user's tank plan.
  page.search = "";
  page.hash = fish ? `/species/${encodeURIComponent(fish.id)}` : "/atlas";
  const issue = new URL(`${repositoryUrl}/issues/new`);
  const chinese = locale === "zh";
  issue.searchParams.set("template", chinese ? "fish-data.yml" : "fish-data-en.yml");
  issue.searchParams.set("title", chinese
    ? fish ? `[鱼类资料] ${fish.name}（${fish.scientific}）补充或纠错` : "[鱼类资料] 补充资料或推荐新鱼"
    : fish ? `[Fish data] ${fish.name} (${fish.scientific}) — additions or corrections` : "[Fish data] Add information or suggest a species");
  if (!chinese) {
    const languages = { en: "English", fr: "Français", de: "Deutsch", ja: "日本語" };
    issue.searchParams.set("language", languages[locale]);
  }
  if (fish) {
    issue.searchParams.set("fish", fish.name);
    issue.searchParams.set("scientific", fish.scientific);
  }
  issue.searchParams.set("page_url", page.href);
  return issue.href;
}
