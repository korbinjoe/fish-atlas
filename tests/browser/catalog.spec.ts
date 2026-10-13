import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const read = (name: string) => JSON.parse(readFileSync(new URL(`../../content/${name}`, import.meta.url), "utf8"));
const catalog = read("catalog.json") as { key: number; scientific: string; curatedId?: string }[];
const manifest = read("catalog-manifest.json") as { totalEntries: number; basicEntries: number };
const photoProfiles = read("photo-profiles.json") as { id: string; scientific: string; name: string; gbifKey: number; photo: { path: string } }[];
const atlasTotal = 33 + photoProfiles.length;
const basicTotal = manifest.totalEntries - atlasTotal;

const photoKeys = new Set(photoProfiles.map((profile) => profile.gbifKey));
const basic = catalog.find((entry) => !('curatedId' in entry) && !photoKeys.has(entry.key))!;

test("expanded directory searches taxonomy and keeps unreviewed entries out of planning", async ({ page }) => {
  await page.goto("/#/catalog");
  await expect(page.locator(".catalog-count")).toContainText(manifest.totalEntries.toLocaleString());
  await expect(page.locator(".catalog-card")).toHaveCount(48);
  await page.getByRole("button", { name: `基础记录 ${basicTotal.toLocaleString()}` }).click();
  await page.getByRole("textbox", { name: "搜索学名、中文名或科属" }).fill(basic.scientific);
  await page.getByRole("textbox", { name: "搜索学名、中文名或科属" }).press("Enter");
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await page.getByRole("button", { name: `查看${basic.scientific}资料` }).click();
  await expect(page.getByRole("dialog", { name: `${basic.scientific} 分类记录` })).toContainText("不能据此制定鱼缸方案");
  await expect(page.getByRole("dialog").getByRole("link", { name: /GBIF 原始分类记录/ })).toHaveAttribute("href", `https://www.gbif.org/species/${basic.key}`);
  await page.reload();
  await expect(page.getByRole("dialog", { name: `${basic.scientific} 分类记录` })).toBeVisible();
  await page.getByRole("button", { name: "关闭分类记录" }).click();
  await page.getByRole("button", { name: "鱼缸规划" }).click();
  await expect(page.getByRole("textbox", { name: "查找规划鱼种" })).toBeVisible();
  await expect(page.locator(".candidate")).toHaveCount(12);
  await expect(page.getByRole("button", { name: "查看更多鱼种（已显示 12 / 33）" })).toBeVisible();
});

test("curated fish opens full detail from directory; pagination and phone layout work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/catalog");
  await expect(page.locator(".catalog-card")).toHaveCount(48);
  await page.getByRole("button", { name: /下一页/ }).click();
  await expect(page.getByRole("status")).toContainText("第 2 /");
  await page.getByRole("textbox", { name: "搜索学名、中文名或科属" }).fill("Betta splendens");
  await page.getByRole("textbox", { name: "搜索学名、中文名或科属" }).press("Enter");
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await page.getByRole("button", { name: "查看暹罗斗鱼资料" }).click();
  await expect(page.getByRole("dialog", { name: "暹罗斗鱼图鉴" })).toBeVisible();
  await page.getByRole("button", { name: "关闭鱼种详情" }).click();
  await expect(page).toHaveURL(/catalog/);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
});

test("fish atlas contains only photographed fish; taxonomy directory keeps all records", async ({ page }) => {
  await page.goto("/#/explore");
  await page.getByRole("button", { name: "鱼类图鉴", exact: true }).click();
  await expect(page).toHaveURL(/#\/atlas/);
  await expect(page.locator(".atlas-total")).toContainText(String(atlasTotal));
  await expect(page.locator(".fish-card")).toHaveCount(atlasTotal);
  await expect(page.locator(".fish-card").first().locator("img")).toBeVisible();
  await expect(page.getByText("精选图鉴", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "物种目录", exact: true }).click();
  await expect(page).toHaveURL(/#\/catalog/);
  await expect(page.locator(".catalog-count")).toContainText(manifest.totalEntries.toLocaleString());
  await page.getByRole("button", { name: `基础记录 ${basicTotal.toLocaleString()}` }).click();
  await expect(page.locator(".catalog-card").first().locator("img")).toHaveCount(0);
});

test("old featured link opens the same single atlas", async ({ page }) => {
  await page.goto("/#/featured?q=斗鱼");
  await expect(page).toHaveURL(/#\/atlas\?q=/);
  await expect(page.locator(".fish-card").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "鱼类图鉴，认识水下世界。" })).toBeVisible();
});

test("new photographed species opens sourced detail but stays out of planning", async ({ page }) => {
  const profile = photoProfiles.find((item) => item.scientific === "Acanthurus achilles") ?? photoProfiles[0];
  expect(profile).toBeTruthy();
  await page.goto(`/#/atlas?q=${encodeURIComponent(profile.scientific)}`);
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await expect(page.locator(".fish-card img")).toHaveAttribute("src", profile.photo.path);
  await page.locator(".card-open").click();
  await expect(page.getByRole("dialog", { name: `${profile.name}图鉴` })).toContainText("不进入鱼缸规划");
  await expect(page.getByRole("dialog").getByRole("link", { name: "原始文件" })).toHaveAttribute("href", /commons.wikimedia.org/);
  await page.getByRole("button", { name: "关闭鱼种详情" }).click();
  await page.getByRole("button", { name: "物种目录", exact: true }).click();
  await page.getByRole("textbox", { name: "搜索学名、中文名或科属" }).fill("");
  await page.getByRole("textbox", { name: "搜索学名、中文名或科属" }).press("Enter");
  await page.getByRole("button", { name: /已入图鉴/ }).click();
  await expect(page.getByRole("status")).toContainText(`找到 ${atlasTotal} 条记录`);
});

test("common fish are searchable by Chinese name and a reviewed taxonomic synonym", async ({ page }) => {
  await page.goto("/#/catalog");
  const search = page.getByRole("textbox", { name: "搜索学名、中文名或科属" });
  await search.fill("斑马鱼");
  await search.press("Enter");
  const zebraDanio = page.locator(".catalog-card").filter({ hasText: "Danio rerio" });
  await expect(zebraDanio).toHaveCount(1);
  await expect(zebraDanio.locator("img")).toHaveCount(1);
  await search.fill("Otocinclus affinis");
  await search.press("Enter");
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await expect(page.locator(".catalog-card")).toContainText("Macrotocinclus affinis");
  await page.goto("/#/atlas?q=Otocinclus%20affinis");
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await expect(page.locator(".fish-card")).toContainText("Macrotocinclus affinis");
});

test("second-pass common fish show only when a reviewed photo exists", async ({ page }) => {
  await page.goto("/#/atlas?q=火焰灯");
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await expect(page.locator(".fish-card")).toContainText("Hyphessobrycon amandae");
  await expect(page.locator(".fish-card img")).toHaveCount(1);
  await page.goto("/#/atlas?q=Corydoras%20julii");
  await expect(page.locator(".fish-card")).toHaveCount(0);
  await page.goto("/#/catalog?q=Corydoras%20julii");
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await expect(page.locator(".catalog-card img")).toHaveCount(0);
});
