import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({
  locale: "zh-CN",
  storageState: { cookies: [], origins: [{
    origin: "http://127.0.0.1:4174",
    localStorage: [{ name: "fish-atlas:locale", value: "zh" }],
  }] },
});

type Profile = { id: string; scientific: string; photo: { path: string } };
const profiles = JSON.parse(readFileSync(new URL("../../content/photo-profiles.json", import.meta.url), "utf8")) as Profile[];
const profileById = new Map(profiles.map(fish => [fish.id, fish]));
const detail = (page: Page) => page.locator("dialog.detail-modal");
const gallery = (page: Page) => page.locator(".photo-viewer");
const hanOrExtendedFish = /\p{Script=Han}/u;

async function loadedPhoto(image: Locator, expectedPath: string) {
  await expect(image).toHaveAttribute("src", expectedPath);
  await expect.poll(() => image.evaluate(element => {
    const photo = element as HTMLImageElement;
    return photo.complete && photo.naturalWidth > 0 && photo.naturalHeight > 0;
  })).toBe(true);
}

async function switchEnglish(page: Page) {
  await page.getByRole("combobox", { name: "语言", exact: true }).click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
}

test("Chinese atlas and globe cards show simplified names with the same real photos", async ({ page }, testInfo) => {
  for (const { id, scientific, name } of [
    { id: "wm-abudefduf-bengalensis", scientific: "Abudefduf bengalensis", name: "孟加拉豆娘鱼" },
    { id: "wm-astronotus-ocellatus", scientific: "Astronotus ocellatus", name: "地图鱼" },
  ]) {
    await page.goto(`/#/atlas?q=${encodeURIComponent(scientific)}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    const card = page.locator(".fish-card");
    await expect(card).toHaveCount(1);
    await expect(card.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(card.locator(".scientific")).toHaveText(scientific);
    await loadedPhoto(card.locator(".fish-image img"), profileById.get(id)!.photo.path);
  }

  if (testInfo.project.name === "chrome") {
    await page.mouse.move(5, 5);
    await page.screenshot({ path: "docs/chinese-name-fix.png", fullPage: true });
  }

  await page.goto("/#/explore?basin=3203&q=Astronotus%20ocellatus");
  const compact = page.locator('.compact-card[data-fish-id="wm-astronotus-ocellatus"]');
  await expect(compact).toBeVisible();
  await expect(compact.locator("strong")).toHaveText("地图鱼");
  await expect(compact.locator("em")).toHaveText("Astronotus ocellatus");
  await loadedPhoto(compact.locator("img"), profileById.get("wm-astronotus-ocellatus")!.photo.path);
  await expect(page.locator('.globe-fish-pin[data-fish-id="wm-astronotus-ocellatus"]')).toHaveAttribute("title", /地图鱼/);
});

test("old supplementary and standard catfish spellings find one fish whose detail and gallery stay bilingual", async ({ page }) => {
  const id = "wm-ictalurus-punctatus";
  const fish = profileById.get(id)!;
  for (const query of ["斑点叉尾𫚔", "斑点叉尾鮰"]) {
    await page.goto("/#/atlas");
    const search = page.getByRole("textbox", { name: "搜索鱼种", exact: true });
    await search.fill(query);
    await search.press("Enter");
    const card = page.locator(".fish-card");
    await expect(card).toHaveCount(1);
    await expect(card.getByRole("heading", { name: "斑点叉尾鮰", exact: true })).toBeVisible();
    await expect(card.locator(".scientific")).toHaveText(fish.scientific);
    await loadedPhoto(card.locator(".fish-image img"), fish.photo.path);
  }

  await page.locator(".fish-card .card-open").click();
  await expect(detail(page).getByRole("heading", { name: "斑点叉尾鮰", exact: true })).toBeVisible();
  await expect(detail(page).locator(".scientific")).toHaveText(fish.scientific);
  await expect(page).toHaveTitle(/斑点叉尾鮰/);
  await loadedPhoto(detail(page).locator(".detail-photo-trigger img"), fish.photo.path);
  await detail(page).getByRole("button", { name: "放大查看斑点叉尾鮰照片", exact: true }).click();
  await expect(gallery(page).locator(".photo-viewer-head strong")).toHaveText("斑点叉尾鮰");
  await expect(gallery(page).locator(".photo-viewer-head em")).toHaveText(fish.scientific);
  await expect(gallery(page)).toHaveAttribute("aria-label", "斑点叉尾鮰照片大图");
  await loadedPhoto(gallery(page).locator("img"), fish.photo.path);
  await page.keyboard.press("Escape");

  await page.keyboard.press("Escape");
  await expect(detail(page)).toHaveCount(0);
  await switchEnglish(page);
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await page.locator(".fish-card .card-open").click();
  await expect(detail(page).getByRole("heading", { name: "Channel catfish", exact: true })).toBeVisible();
  await expect(detail(page).locator(".scientific")).toHaveText(fish.scientific);
  await expect(page.getByTestId("chinese-name-sources")).toHaveCount(0);
  await loadedPhoto(detail(page).locator(".detail-photo-trigger img"), fish.photo.path);
  await detail(page).getByRole("button", { name: "Enlarge photo of Channel catfish", exact: true }).click();
  await expect(gallery(page).locator(".photo-viewer-head strong")).toHaveText("Channel catfish");
  await expect(gallery(page).locator(".photo-viewer-head em")).toHaveText(fish.scientific);
  await expect(gallery(page).locator(".photo-viewer-head strong")).not.toContainText(hanOrExtendedFish);
  await expect(gallery(page).locator("img")).not.toHaveAttribute("alt", hanOrExtendedFish);
  await loadedPhoto(gallery(page).locator("img"), fish.photo.path);
});

test("shorthead redhorse uses its corrected Chinese name, rejects the wrong species alias and exposes evidence", async ({ page }) => {
  const fish = profileById.get("wm-moxostoma-macrolepidotum")!;
  for (const query of ["马斯科吸口鱼", "馬斯科吸口魚"]) {
    await page.goto(`/#/atlas?q=${encodeURIComponent(query)}`);
    await expect(page.locator(".fish-card")).toHaveCount(0);
  }
  await page.goto(`/#/atlas?q=${encodeURIComponent("大鳞吸口鱼")}`);
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await expect(page.locator(".fish-card h2")).toHaveText("大鳞吸口鱼");
  await expect(page.locator(".fish-card .scientific")).toHaveText(fish.scientific);
  await page.locator(".fish-card .card-open").click();
  await expect(detail(page).getByRole("heading", { name: "大鳞吸口鱼", exact: true })).toBeVisible();
  await expect(detail(page)).not.toContainText(/马斯科|馬斯科/);
  await loadedPhoto(detail(page).locator(".detail-photo-trigger img"), fish.photo.path);
  const sources = page.getByTestId("chinese-name-sources");
  await expect(sources).toBeVisible();
  await expect(sources).toContainText("中文名称：大鳞吸口鱼");
  const authority = sources.getByRole("link", { name: "中文名称依据", exact: true });
  await expect(authority).toBeVisible();
  await expect(authority).toHaveAttribute("href", /^https:\/\/fishdb\.sinica\.edu\.tw\//);
  await expect(authority).toHaveAttribute("target", "_blank");
  await page.keyboard.press("Escape");
  await expect(detail(page)).toHaveCount(0);
  await switchEnglish(page);
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await page.locator(".fish-card .card-open").click();
  const heading = detail(page).getByRole("heading", { name: "Shorthead Redhorse", exact: true });
  await expect(heading).toBeVisible();
  await expect(heading).not.toContainText(hanOrExtendedFish);
  await expect(detail(page).locator(".scientific")).toHaveText(fish.scientific);
  await expect(page.getByTestId("chinese-name-sources")).toHaveCount(0);
  await loadedPhoto(detail(page).locator(".detail-photo-trigger img"), fish.photo.path);
});
