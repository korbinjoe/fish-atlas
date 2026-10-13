import { expect, test, type Locator, type Page } from "@playwright/test";

const reader = (page: Page) => page.getByRole("region", { name: "鱼类详情浏览", exact: true });
const gallery = (page: Page) => page.locator(".photo-viewer-inline");
const trigger = (page: Page) => reader(page).getByRole("button", { name: /^放大查看.+照片$/ });
const navigation = (page: Page) => page.getByRole("navigation", { name: "主导航", exact: true });

async function openPhoto(page: Page, basin = "river-nee-soon") {
  await page.goto(`/#/explore?basin=${basin}`);
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-camera-moving", "false");
  const originalCanvas = (await canvas.elementHandle())!;
  const pin = page.locator(".globe-fish-pin:visible").first();
  await expect(pin).toBeVisible();
  const id = (await pin.getAttribute("data-fish-id"))!;
  await pin.click();
  await expect(reader(page)).toBeVisible();
  await expect(canvas).toHaveAttribute("data-camera-moving", "false");
  const readerBuffer = await canvas.evaluate(element => ({
    width: (element as HTMLCanvasElement).width,
    height: (element as HTMLCanvasElement).height,
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
  }));
  await trigger(page).click();
  await expect(gallery(page)).toBeVisible();
  return { canvas, originalCanvas, id, readerBuffer };
}

async function expectInViewport(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  const viewport = page.viewportSize()!;
  const box = (await target.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  return box;
}

test("the desktop enlarged photograph leaves the original globe beside it and permits globe zoom", async ({ page }) => {
  const { canvas, originalCanvas, id, readerBuffer } = await openPhoto(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(gallery(page)).toHaveAttribute("role", "region");
  await expect(reader(page)).toBeVisible();
  expect(await originalCanvas.evaluate(element => element.isConnected && element === document.querySelector("canvas"))).toBe(true);
  const globeBox = await expectInViewport(page, page.locator(".globe-stage"));
  const imageBox = await expectInViewport(page, gallery(page));
  expect(globeBox.x + globeBox.width).toBeLessThanOrEqual(imageBox.x + 1);
  expect(imageBox.width).toBeGreaterThan(globeBox.width);
  expect((await gallery(page).locator(".photo-viewer-stage").boundingBox())!.height).toBeGreaterThan(imageBox.height * 0.6);
  await expect.poll(() => canvas.evaluate(element => ({
    width: (element as HTMLCanvasElement).width,
    height: (element as HTMLCanvasElement).height,
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
  }))).toEqual(readerBuffer);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");

  const initialDistance = Number(await canvas.getAttribute("data-camera-distance"));
  // OrbitControls receives events on the canvas. This corner stays clear of
  // floating waterbody controls and fish buttons.
  const canvasBox = (await canvas.boundingBox())!;
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.95, canvasBox.y + canvasBox.height * 0.08);
  await page.mouse.wheel(0, -100);
  await expect.poll(async () => Number(await canvas.getAttribute("data-camera-distance")))
    .toBeLessThan(initialDistance * 0.99);
  await expect(gallery(page)).toBeVisible();
  await expect(canvas).toHaveAttribute("data-active-fish", id);
  await expect(page.locator(`.globe-fish-pin[data-fish-id="${id}"]`)).toHaveAttribute("data-selected", "true");
});

test("inline photograph switches preserve the two-fish filter, camera selection and Escape focus", async ({ page }) => {
  const { canvas, originalCanvas, id } = await openPhoto(page);
  const ids = await page.locator(".globe-fish-pin").evaluateAll(pins => pins.map(pin => (pin as HTMLElement).dataset.fishId));
  expect(ids).toHaveLength(2);
  const otherId = ids.find(value => value !== id)!;
  const originalHistory = await page.evaluate(() => history.length);
  const originalGallery = (await gallery(page).elementHandle())!;
  await page.keyboard.press("ArrowRight");
  await expect(canvas).toHaveAttribute("data-active-fish", otherId);
  await expect(canvas).toHaveAttribute("data-camera-target-fish", otherId);
  await expect(page.locator(`.globe-fish-pin[data-fish-id="${otherId}"]`)).toHaveAttribute("data-selected", "true");
  await expect(gallery(page).locator("img")).toHaveAttribute("src", (await reader(page).locator(".detail-photo-trigger img").getAttribute("src"))!);
  await expect(page).toHaveURL(/basin=river-nee-soon/);
  await gallery(page).getByRole("button", { name: "下一种鱼", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-active-fish", id);
  expect(await page.evaluate(() => history.length)).toBe(originalHistory);
  expect(await originalGallery.evaluate(element => element.isConnected)).toBe(true);
  expect(await originalCanvas.evaluate(element => element.isConnected)).toBe(true);

  await page.keyboard.press("Escape");
  await expect(gallery(page)).toHaveCount(0);
  await expect(reader(page)).toBeVisible();
  await expect(trigger(page)).toBeFocused();
  await expect(canvas).toHaveAttribute("data-active-fish", id);
  await expect(page).toHaveURL(new RegExp(`/species/${id}\\?basin=river-nee-soon`));
});

test("the waterbody picker remains usable beside the enlarged image and owns its keyboard events", async ({ page }) => {
  const { canvas, id } = await openPhoto(page);
  const chooseWaterbody = page.getByRole("button", { name: "选择流域、海域或湖泊", exact: true });
  await chooseWaterbody.click();
  const picker = page.getByRole("dialog", { name: "选择原生水域", exact: true });
  await expect(picker).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(canvas).toHaveAttribute("data-active-fish", id);
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await expect(gallery(page)).toBeVisible();
  await chooseWaterbody.click();
  await picker.getByRole("button", { name: /^湖泊／潟湖 / }).click();
  await picker.getByRole("textbox", { name: "搜索水域", exact: true }).fill("马拉维");
  await picker.getByRole("textbox", { name: "搜索水域", exact: true }).press("Enter");
  await picker.getByRole("button", { name: /查看马拉维湖/ }).click();
  await expect(page).toHaveURL(/#\/explore\?basin=lake-malawi$/);
  await expect(gallery(page)).toHaveCount(0);
  await expect(reader(page)).toHaveCount(0);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(4);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }]) {
  test(`phone ${viewport.width}×${viewport.height} shows both globe and enlarged image with reachable controls`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { canvas, originalCanvas } = await openPhoto(page, "lake-malawi");
    const globeBox = await expectInViewport(page, canvas);
    const imageBox = await expectInViewport(page, gallery(page));
    expect(globeBox.y + globeBox.height).toBeLessThanOrEqual(imageBox.y + 1);
    expect(globeBox.height).toBeGreaterThan(120);
    expect((await gallery(page).locator(".photo-viewer-stage").boundingBox())!.height).toBeGreaterThan(120);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const name of ["上一种鱼", "下一种鱼", "关闭照片大图", "放大图片", "缩小图片", "重置图片缩放"]) {
      await expectInViewport(page, gallery(page).getByRole("button", { name, exact: true }));
    }

    const zoom = gallery(page).getByRole("button", { name: "重置图片缩放", exact: true });
    await page.keyboard.press("+");
    await expect(zoom).toHaveText("150%");
    await page.keyboard.press("-");
    await expect(zoom).toHaveText("100%");
    await page.keyboard.press("=");
    await expect(zoom).toHaveText("150%");
    await page.keyboard.press("0");
    await expect(zoom).toHaveText("100%");
    const firstIndex = Number((await gallery(page).locator(".photo-species-counter").textContent())!.match(/(\d+)\s*\//)![1]);
    await expect(gallery(page).locator(".photo-species-counter")).toContainText(/\/\s*4\b/);
    for (let step = 0; step < 3; step++) await page.keyboard.press("ArrowRight");
    const expected = (firstIndex - 1 + 3) % 4 + 1;
    await expect(gallery(page).locator(".photo-species-counter")).toContainText(new RegExp(`\\b${expected}\\s*/\\s*4\\b`));
    const activeId = (await canvas.getAttribute("data-active-fish"))!;
    await expect(canvas).toHaveAttribute("data-camera-target-fish", activeId);
    await expect(page.locator(`.globe-fish-pin[data-fish-id="${activeId}"]`)).toHaveAttribute("data-selected", "true");
    await expect(page).toHaveURL(/basin=lake-malawi/);
    expect(await originalCanvas.evaluate(element => element.isConnected)).toBe(true);
    await expectInViewport(page, canvas);
    await expectInViewport(page, gallery(page));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("closing a phone enlarged image restores the scrolled reader and its photo trigger focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/explore?basin=lake-malawi");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-camera-moving", "false");
  const originalCanvas = (await canvas.elementHandle())!;
  await page.locator(".globe-fish-pin:visible").first().click();
  await expect(reader(page)).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 420, behavior: "instant" }));
  await trigger(page).scrollIntoViewIfNeeded();
  await expectInViewport(page, trigger(page));
  const beforeScroll = await page.evaluate(() => window.scrollY);
  expect(beforeScroll).toBeGreaterThan(200);

  await trigger(page).click();
  await expect(gallery(page)).toBeVisible();
  await expectInViewport(page, canvas);
  await expectInViewport(page, gallery(page));
  await gallery(page).getByRole("button", { name: "关闭照片大图", exact: true }).click();
  await expect(gallery(page)).toHaveCount(0);
  await expect(reader(page)).toBeVisible();
  await expect.poll(() => page.evaluate(before => Math.abs(window.scrollY - before), beforeScroll)).toBeLessThanOrEqual(3);
  await expect(trigger(page)).toBeFocused();
  expect(await originalCanvas.evaluate(element => element.isConnected && element === document.querySelector("canvas"))).toBe(true);
});

test("browser Back and top navigation clear the inline photo reader without leaving an overlay", async ({ page }) => {
  await openPhoto(page);
  await page.goBack();
  await expect(page).toHaveURL(/#\/explore\?basin=river-nee-soon$/);
  await expect(gallery(page)).toHaveCount(0);
  await expect(reader(page)).toHaveCount(0);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.locator(".globe-fish-pin:visible").first().click();
  await expect(reader(page)).toBeVisible();
  await trigger(page).click();
  await expect(gallery(page)).toBeVisible();
  await navigation(page).getByRole("button", { name: "鱼类图鉴", exact: true }).click();
  await expect(page).toHaveURL(/#\/atlas\?basin=river-nee-soon$/);
  await expect(page.locator(".photo-viewer")).toHaveCount(0);
  await expect(reader(page)).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});
