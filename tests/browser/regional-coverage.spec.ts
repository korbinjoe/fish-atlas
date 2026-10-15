import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { locationSpeciesCount } from "./distribution-fixture";

const profiles = JSON.parse(readFileSync(new URL("../../content/photo-profiles.json", import.meta.url), "utf8")) as { id: string; scientific: string; name: string; wikipediaUrl?: string | null; textLanguage?: string; intro: string; photo: { path: string } }[];
const ranges = JSON.parse(readFileSync(new URL("../../content/distributions.json", import.meta.url), "utf8")) as { species: Record<string, { links: { locationId: string }[] }> };
for (const [waterbody, label] of [
  ["2433", "长江"], ["4219", "密西西比"], ["6242", "莱茵"],
  ["1229", "尼罗"], ["5309", "墨累"], ["3227", "马格达莱纳"],
]) {
  test(`${label} native fish can be searched, filtered and opened with real photos`, async ({ page }) => {
    const fish = profiles.find((profile) => ranges.species[profile.id].links.some((link) => link.locationId === waterbody));
    expect(fish).toBeDefined();
    await page.goto(`/#/atlas?basin=${waterbody}`);
    await expect(page.locator(".fish-card")).toHaveCount(locationSpeciesCount.get(waterbody)!);
    const search = page.getByRole("textbox", { name: "搜索鱼种", exact: true });
    await search.fill(fish!.scientific);
    await search.press("Enter");
    await expect(page.locator(".fish-card")).toHaveCount(1);
    await page.locator(".card-open").click();
    const detail = page.getByRole("dialog");
    await expect(detail.locator(".detail-basin-tags")).toContainText(label);
    await expect.poll(() => detail.locator(".detail-visual img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThanOrEqual(300);
    await expect(detail.locator(".detail-visual img")).toHaveAttribute("src", fish!.photo.path);
    await detail.getByText("分布资料与关联依据", { exact: false }).click();
    await expect(detail.getByRole("link", { name: "FishBase 物种分布" })).toBeVisible();
  });
}

test("Great Lakes remain distinct from their river outlet and link the reader to the selected lake", async ({ page }) => {
  await page.goto("/#/explore?basin=lake-superior");
  const count = locationSpeciesCount.get("lake-superior")!;
  await expect(page.locator(".compact-card")).toHaveCount(count);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(count);
  await expect(page.locator(".globe-fish-pin").first()).toHaveAttribute("data-waterbody-kind", "lake");
  await page.locator(".compact-card").first().click();
  const reader = page.getByRole("region", { name: "鱼类详情浏览", exact: true });
  await expect(reader.locator(".detail-basin-tags")).toContainText("苏必利尔");
  await expect(page.locator('.globe-fish-pin[aria-pressed="true"]')).toHaveCount(1);
  const first = page.url();
  await page.keyboard.press("ArrowRight");
  await expect(page).not.toHaveURL(first);
  await expect(reader.locator(".detail-basin-tags")).toContainText("苏必利尔");
  await expect(page.locator('.globe-fish-pin[aria-pressed="true"]')).toHaveCount(1);
});

test("fish without a Wikipedia article retain their photo and independent distribution sources", async ({ page }) => {
  const fish = profiles.find((profile) => !profile.wikipediaUrl);
  expect(fish).toBeDefined();
  await page.goto(`/#/species/${fish!.id}`);
  const detail = page.getByRole("dialog");
  await expect(detail.locator(".scientific")).toHaveText(fish!.scientific);
  await expect.poll(() => detail.locator(".detail-visual img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThanOrEqual(300);
  await expect(detail.getByRole("link", { name: "物种词条与编辑历史" })).toHaveCount(0);
  await detail.locator(".distribution-details summary").click();
  await expect(detail.locator(".distribution-details").getByRole("link", { name: "物种依据", exact: true }).first()).toBeVisible();
});

test("original classification sources are not credited or licensed as FishBase", async ({ page }) => {
  await page.goto("/#/species/wm-steindachneridion-parahybae");
  const sources = page.getByRole("dialog").locator(".distribution-details");
  await sources.locator("summary").click();
  await expect(sources.getByRole("link", { name: "原生分布来源", exact: true })).toHaveAttribute("href", /calacademy\.org/);
  await expect(sources.getByRole("link", { name: "CC BY-NC 3.0", exact: true })).toHaveCount(0);
  await expect(sources).toContainText("Steindachneridion amblyurum");
});

test("non-English source excerpts use their actual language", async ({ page }) => {
  const fish = profiles.find((profile) => profile.textLanguage && profile.textLanguage !== "en" && profile.intro);
  expect(fish).toBeDefined();
  await page.goto(`/#/species/${fish!.id}`);
  const intro = page.getByRole("dialog").locator(".detail-intro");
  await expect(intro).toHaveAttribute("lang", fish!.textLanguage!);
  await expect(intro).toHaveText(fish!.intro);
});
