import { expect, test, type Page } from "@playwright/test";

const viewer = (page: Page) => page.locator(".photo-viewer");
const reader = (page: Page) => page.getByRole("region", { name: "鱼类详情浏览", exact: true });
const photoTrigger = (page: Page) => page.getByRole("button", { name: /^放大查看.+照片$/ });

async function openFilteredGlobePhoto(page: Page, basin: string) {
  await page.goto(`/#/explore?basin=${basin}`);
  const source = page.locator(".globe-fish-pin:visible").first();
  await expect(source).toBeVisible();
  const id = (await source.getAttribute("data-fish-id"))!;
  await source.click();
  await expect(reader(page)).toBeVisible();
  await photoTrigger(page).click();
  await expect(viewer(page)).toBeVisible();
  return id;
}

async function photoIndex(page: Page) {
  const text = (await viewer(page).locator(".photo-species-counter").textContent())!;
  const [_, current, count] = text.match(/(\d+)\s*\/\s*(\d+)/)!;
  return { current: Number(current), count: Number(count) };
}

test("the default detail gives the fish photograph most of the desktop opening view", async ({ page }) => {
  await page.goto("/#/species/betta-splendens");
  const trigger = photoTrigger(page);
  await expect(trigger).toBeVisible();
  await expect.poll(() => trigger.locator("img").evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const viewport = page.viewportSize()!;
  const photo = (await trigger.boundingBox())!;
  expect(photo.width).toBeGreaterThanOrEqual(viewport.width * 0.75);
  expect(photo.height).toBeGreaterThanOrEqual(viewport.height * 0.65);
  expect(photo.y).toBeLessThan(viewport.height * 0.15);
  expect(photo.y + photo.height).toBeLessThanOrEqual(viewport.height);
  await expect(page.getByRole("dialog", { name: "暹罗斗鱼图鉴", exact: true })).toBeVisible();
});

test("enlarged photos cross between curated and photo profiles without closing either dialog or adding history", async ({ page }) => {
  await page.goto("/#/species/betta-splendens?q=Betta");
  await expect(photoTrigger(page)).toBeVisible();
  const detail = await page.locator("dialog.detail-modal").elementHandle();
  const originalHistory = await page.evaluate(() => history.length);
  await photoTrigger(page).click();
  const gallery = viewer(page);
  await expect(gallery).toBeVisible();
  await expect(gallery).toHaveJSProperty("tagName", "DIALOG");
  const originalGallery = await gallery.elementHandle();
  const originalSource = await gallery.locator("img").getAttribute("src");
  await expect(gallery.locator(".photo-species-counter")).toContainText(/\/\s*2\b/);

  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/species\/wm-betta-anabatoides\?q=Betta/);
  await expect(gallery).toHaveAttribute("aria-label", "Giant Betta照片大图");
  await expect(gallery.locator("img")).toHaveAttribute("alt", /Giant Betta.*Betta anabatoides/);
  await expect(gallery.locator("img")).not.toHaveAttribute("src", originalSource!);
  await expect.poll(() => gallery.locator("img").evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator("dialog.detail-modal").getByRole("heading", { name: "Giant Betta", exact: true })).toBeVisible();
  expect(await originalGallery!.evaluate(element => element.isConnected && element === document.querySelector("dialog.photo-viewer"))).toBe(true);
  expect(await detail!.evaluate(element => element.isConnected && element === document.querySelector("dialog.detail-modal"))).toBe(true);

  await gallery.getByRole("button", { name: "上一种鱼", exact: true }).click();
  await expect(page).toHaveURL(/species\/betta-splendens\?q=Betta/);
  await gallery.getByRole("button", { name: "下一种鱼", exact: true }).click();
  await expect(page).toHaveURL(/species\/wm-betta-anabatoides\?q=Betta/);
  expect(await page.evaluate(() => history.length)).toBe(originalHistory);
  await page.keyboard.press("Escape");
  await expect(gallery).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Giant Betta图鉴", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "放大查看Giant Betta照片", exact: true })).toBeFocused();
  await expect(page).toHaveURL(/species\/wm-betta-anabatoides\?q=Betta/);
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog.detail-modal")).toHaveCount(0);
});

test("the enlarged gallery cycles within its two-fish waterbody and updates the globe selection", async ({ page }) => {
  const originalId = await openFilteredGlobePhoto(page, "river-nee-soon");
  const ids = await page.locator(".globe-fish-pin").evaluateAll(pins => pins.map(pin => (pin as HTMLElement).dataset.fishId));
  expect(ids).toHaveLength(2);
  const otherId = ids.find(id => id !== originalId)!;
  const gallery = viewer(page);
  const originalGallery = await gallery.elementHandle();
  await expect(gallery).toHaveClass(/photo-viewer-inline/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(gallery.locator(".photo-species-counter")).toContainText(/\/\s*2\b/);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", otherId);
  await expect(page.locator(`.globe-fish-pin[data-fish-id="${otherId}"]`)).toHaveAttribute("data-selected", "true");
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-target-fish", otherId);
  await expect(page).toHaveURL(/basin=river-nee-soon/);
  await expect(gallery.locator("img")).toHaveAttribute("alt", await reader(page).locator(".detail-photo-trigger img").getAttribute("alt") ?? "");
  await gallery.getByRole("button", { name: "下一种鱼", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", originalId);
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", otherId);
  expect(await originalGallery!.evaluate(element => element.isConnected)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(gallery).toHaveCount(0);
  await expect(reader(page)).toBeVisible();
  await expect(photoTrigger(page)).toBeFocused();
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", otherId);
  await page.keyboard.press("Escape");
  await expect(reader(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#\/explore\?basin=river-nee-soon$/);
});

test("phone gallery counts every rapid arrow press, resets each new photograph and keeps controls within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFilteredGlobePhoto(page, "lake-malawi");
  const gallery = viewer(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const box = (await gallery.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  const zoom = gallery.getByRole("button", { name: "重置图片缩放", exact: true });
  await page.keyboard.press("=");
  await expect(zoom).toHaveText("150%");
  await page.keyboard.press("-");
  await expect(zoom).toHaveText("100%");
  await page.keyboard.press("+");
  await expect(zoom).toHaveText("150%");
  await page.keyboard.press("0");
  await expect(zoom).toHaveText("100%");
  await gallery.getByRole("button", { name: "放大图片", exact: true }).click();
  await expect(zoom).toHaveText("150%");
  const initial = await photoIndex(page);
  expect(initial.count).toBe(4);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  const expected = (initial.current - 1 + 3) % initial.count + 1;
  await expect.poll(async () => (await photoIndex(page)).current).toBe(expected);
  await expect(zoom).toHaveText("100%");
  const next = gallery.getByRole("button", { name: "下一种鱼", exact: true });
  const nextBox = (await next.boundingBox())!;
  expect(nextBox.x).toBeGreaterThanOrEqual(0);
  expect(nextBox.x + nextBox.width).toBeLessThanOrEqual(390);
  expect(nextBox.y + nextBox.height).toBeLessThanOrEqual(844);
  await expect(gallery.locator("img")).toHaveAttribute("src", (await reader(page).locator(".detail-photo-trigger img").getAttribute("src"))!);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
