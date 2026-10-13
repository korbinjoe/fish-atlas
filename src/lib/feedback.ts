export const feedbackRepository = "korbinjoe/fish-atlas";
export const repositoryUrl = `https://github.com/${feedbackRepository}`;

export type FeedbackFish = { id: string; name: string; scientific: string };

export function createFeedbackUrl({ fish, pageUrl }: { fish?: FeedbackFish; pageUrl: string }): string {
  const page = new URL(pageUrl);
  // Share the species permalink, without search filters or a user's tank plan.
  page.search = "";
  page.hash = fish ? `/species/${encodeURIComponent(fish.id)}` : "/atlas";
  const issue = new URL(`${repositoryUrl}/issues/new`);
  issue.searchParams.set("template", "fish-data.yml");
  issue.searchParams.set("title", fish
    ? `[鱼类资料] ${fish.name}（${fish.scientific}）补充或纠错`
    : "[鱼类资料] 补充资料或推荐新鱼");
  if (fish) {
    issue.searchParams.set("fish", fish.name);
    issue.searchParams.set("scientific", fish.scientific);
  }
  issue.searchParams.set("page_url", page.href);
  return issue.href;
}
