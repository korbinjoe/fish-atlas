import { expect, test, type Locator, type Page } from "@playwright/test";

const repositoryIssuePath = "/korbinjoe/fish-atlas/issues/new";

async function expectIssueLink(link: Locator, page: Page, canonicalHash: string) {
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("target", "_blank");
  const rel = (await link.getAttribute("rel"))!.split(/\s+/);
  expect(rel).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
  const issue = new URL((await link.getAttribute("href"))!);
  expect(issue.origin).toBe("https://github.com");
  expect(issue.pathname).toBe(repositoryIssuePath);
  expect(issue.searchParams.get("template")).toBe("fish-data.yml");
  expect(issue.searchParams.get("title")).toMatch(/^\[鱼类资料\]/);
  const source = new URL(issue.searchParams.get("page_url")!);
  expect(source.origin).toBe(new URL(page.url()).origin);
  expect(source.pathname).toBe("/");
  expect(source.search).toBe("");
  expect(source.hash).toBe(canonicalHash);
  return issue;
}

for (const fish of [
  { id: "betta-splendens", name: "暹罗斗鱼", scientific: "Betta splendens" },
  { id: "wm-amphiprion-percula", name: "真小丑鱼", scientific: "Amphiprion percula" },
]) {
  test(`${fish.name} feedback carries its name, scientific name and clean detail URL`, async ({ page }) => {
    await page.goto(`/?v=feedback-check#/species/${fish.id}?q=%E9%B1%BC&region=asia&plan=private-tank`);
    const detail = page.getByRole("dialog", { name: `${fish.name}图鉴`, exact: true });
    await expect(detail).toBeVisible();
    const link = detail.getByRole("link", { name: `补充或纠错${fish.name}的资料`, exact: true });
    await expect(link).toHaveCount(1);
    const issue = await expectIssueLink(link, page, `#/species/${fish.id}`);
    expect(issue.searchParams.get("fish")).toBe(fish.name);
    expect(issue.searchParams.get("scientific")).toBe(fish.scientific);
    expect(issue.searchParams.get("title")).toContain(fish.name);
    await expect(detail.locator(".detail-body > .feedback-note")).toBeVisible();
    await expect(detail.locator(".detail-body > .feedback-note")).toContainText("发现资料缺失或有误？");
    await expect(detail.locator(".detail-body > .feedback-note")).toContainText("在 GitHub 登录后填写建议");
    await expect(detail.locator(".source-details").getByRole("link", { name: /补充或纠错/ })).toHaveCount(0);
  });
}

test("footer and about offer a generic GitHub form without leaking search or planner parameters", async ({ page }) => {
  await page.goto("/?v=feedback-check#/atlas?q=%E9%B1%BC&region=asia&plan=private-tank");
  const footerLink = page.locator(".site-footer").getByRole("link", { name: "补充或纠错鱼类资料", exact: true });
  await expectIssueLink(footerLink, page, "#/atlas");
  await page.getByRole("button", { name: "关于图鉴", exact: true }).click();
  const about = page.getByRole("dialog", { name: "关于鱼类星球", exact: true });
  const suggestion = about.getByRole("link", { name: "在 GitHub 提交建议", exact: true });
  await expectIssueLink(suggestion, page, "#/atlas");
  await expect(about).toContainText(/推荐.*鱼|新增.*鱼|收录.*鱼/);
});

test("phone detail keeps one reachable feedback action with a full touch target and no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/species/betta-splendens");
  const detail = page.getByRole("dialog", { name: "暹罗斗鱼图鉴", exact: true });
  const link = detail.getByRole("link", { name: "补充或纠错暹罗斗鱼的资料", exact: true });
  await expect(link).toHaveCount(1);
  await link.scrollIntoViewIfNeeded();
  await expectIssueLink(link, page, "#/species/betta-splendens");
  const box = (await link.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  expect(await detail.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
