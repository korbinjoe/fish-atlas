import { expect, test, type Page } from "@playwright/test";
import { mappedSpeciesCount } from "./distribution-fixture";

const reader = (page: Page) => page.getByRole("region", { name: "鱼类详情浏览", exact: true });
const selectedId = (page: Page) => page.locator("canvas").getAttribute("data-active-fish");

async function openVisibleFish(page: Page, path = "/#/explore") {
  await page.goto(path);
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const originalCanvas = await canvas.elementHandle();
  const pin = page.locator(".globe-fish-pin:visible").first();
  await expect(pin).toBeVisible();
  await expect(pin).toHaveAttribute("data-fish-id", /\S+/);
  const id = (await pin.getAttribute("data-fish-id"))!;
  await pin.click();
  await expect(reader(page)).toBeVisible();
  await expect(canvas).toHaveAttribute("data-active-fish", id);
  return { id, pin, originalCanvas };
}

test("opening a globe fish moves the same globe beside an inline reader and follows the selected fish", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const { id, originalCanvas } = await openVisibleFish(page);
  await expect(page.locator(".explore-layout")).toHaveClass(/reading/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(mappedSpeciesCount);
  expect(await originalCanvas!.evaluate(canvas => canvas.isConnected && canvas === document.querySelector("canvas"))).toBe(true);
  await expect(page.locator(`.globe-fish-pin[data-fish-id="${id}"]`)).toHaveAttribute("data-selected", "true");
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving", "false");
  const globeBox = (await page.locator(".globe-stage").boundingBox())!;
  const readerBox = (await reader(page).boundingBox())!;
  expect(globeBox.x + globeBox.width).toBeLessThanOrEqual(readerBox.x + 24);

  await reader(page).getByRole("button", { name: "下一种鱼", exact: true }).click();
  await expect.poll(() => selectedId(page)).not.toBe(id);
  const nextId = (await selectedId(page))!;
  await expect(page).toHaveURL(new RegExp(`/species/${nextId}`));
  await expect(page.locator(`.globe-fish-pin[data-fish-id="${nextId}"]`)).toHaveAttribute("data-selected", "true");
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving", "false");
  await expect(page.locator(`.globe-fish-pin[data-fish-id="${nextId}"]`)).toBeVisible();
  await expect(page.locator(".globe-waterbody-context")).toBeVisible();
  const currentIndex = Number(await reader(page).locator(".reader-counter b").textContent());
  const sequenceCount = Number((await reader(page).locator(".reader-counter").textContent())!.match(/\/\s*(\d+)/)![1]);
  const finalIndex = (currentIndex - 1 + 3) % sequenceCount + 1;
  for (let index = 0; index < 3; index++) await page.keyboard.press("ArrowRight");
  await expect(reader(page).locator(".reader-counter b")).toHaveText(String(finalIndex));
  const finalId = (await selectedId(page))!;
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-target-fish", finalId);
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving", "false");
  const coordinates = await page.evaluate(id => {
    const canvas = document.querySelector("canvas")!;
    const pin = document.querySelector<HTMLElement>(`.globe-fish-pin[data-fish-id="${id}"]`)!;
    const longitudeDifference = Number(canvas.dataset.cameraLongitude) - Number(pin.dataset.longitude);
    return {
      longitude: Math.abs((longitudeDifference + 540) % 360 - 180),
      latitude: Math.abs(Number(canvas.dataset.cameraLatitude) - Number(pin.dataset.latitude)),
    };
  }, finalId);
  expect(coordinates.longitude).toBeLessThan(0.001);
  expect(coordinates.latitude).toBeLessThan(0.001);
  expect(await originalCanvas!.evaluate(canvas => canvas.isConnected)).toBe(true);
  expect(errors).toEqual([]);
});

test("choosing another waterbody from the reader returns to the filtered overview", async ({ page }) => {
  await openVisibleFish(page, "/#/explore?basin=3203");
  await page.getByRole("button", { name: "选择流域、海域或湖泊", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "选择原生水域", exact: true });
  await picker.getByRole("button", { name: /^湖泊／潟湖 / }).click();
  await picker.getByRole("textbox", { name: "搜索水域", exact: true }).fill("马拉维");
  await picker.getByRole("textbox", { name: "搜索水域", exact: true }).press("Enter");
  await picker.getByRole("button", { name: /查看马拉维湖/ }).click();
  await expect(page).toHaveURL(/#\/explore\?basin=lake-malawi$/);
  await expect(reader(page)).toHaveCount(0);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(4);
  await expect(page.locator(".compact-card")).toHaveCount(4);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("keyboard and mouse switches cycle only within the current waterbody filter", async ({ page }) => {
  const { id } = await openVisibleFish(page, "/#/explore?basin=river-nee-soon");
  const filteredIds = await page.locator(".globe-fish-pin").evaluateAll(pins => pins.map(pin => (pin as HTMLElement).dataset.fishId));
  expect(filteredIds).toHaveLength(2);
  const otherId = filteredIds.find(value => value !== id)!;
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", otherId);
  await expect(page).toHaveURL(/basin=river-nee-soon/);
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", id);
  await reader(page).getByRole("button", { name: "上一种鱼", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", otherId);
  await reader(page).getByRole("button", { name: "下一种鱼", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", id);
  await reader(page).getByRole("button", { name: "下一种鱼", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", otherId);
  await reader(page).getByRole("button", { name: "下一种鱼", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", id);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(2);
});

test("photo zoom keeps arrows and Escape isolated from the underlying fish reader", async ({ page }) => {
  const { id } = await openVisibleFish(page, "/#/explore?basin=3203");
  const trigger = reader(page).getByRole("button", { name: /^放大查看.+照片$/ });
  await trigger.click();
  const viewer = page.locator("dialog.photo-viewer");
  await expect(viewer).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", id);
  await viewer.getByRole("button", { name: "放大图片", exact: true }).click();
  await expect(viewer.getByRole("button", { name: "重置图片缩放" })).toHaveText("150%");
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  await expect(reader(page)).toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", id);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => selectedId(page)).not.toBe(id);
});

test("fast switching replaces the detail entry and closing restores the overview focus and scroll", async ({ page }) => {
  await page.goto("/#/explore?basin=lake-tanganyika");
  const source = page.locator(".globe-fish-pin:visible").first();
  await expect(source).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving", "false");
  await source.scrollIntoViewIfNeeded();
  await source.focus();
  const initialScroll = await page.evaluate(() => window.scrollY);
  const initialHistoryLength = await page.evaluate(() => history.length);
  const sourceId = await source.getAttribute("data-fish-id");
  await source.click();
  await expect(reader(page)).toBeVisible();
  for (let index = 0; index < 3; index++) {
    await reader(page).getByRole("button", { name: "下一种鱼", exact: true }).click();
  }
  expect(await page.evaluate(() => history.length)).toBe(initialHistoryLength + 1);
  await reader(page).getByRole("button", { name: "关闭鱼种详情", exact: true }).click();
  await expect(page).toHaveURL(/#\/explore\?basin=lake-tanganyika$/);
  await expect(reader(page)).toHaveCount(0);
  await expect(page.locator(".explore-layout")).not.toHaveClass(/reading/);
  await expect(page.locator(`.globe-fish-pin[data-fish-id="${sourceId}"]`)).toBeFocused();
  await expect.poll(() => page.evaluate(initial => Math.abs(window.scrollY - initial), initialScroll)).toBeLessThanOrEqual(3);

  await source.click();
  await expect(reader(page)).toBeVisible();
  await reader(page).getByRole("button", { name: "下一种鱼", exact: true }).click();
  await page.goBack();
  await expect(page).toHaveURL(/#\/explore\?basin=lake-tanganyika$/);
  await expect(reader(page)).toHaveCount(0);
});

test("phone reader preserves reachable controls and reduced motion has no camera travel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { id, originalCanvas } = await openVisibleFish(page, "/#/explore?basin=lake-malawi");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving", "false");
  await reader(page).getByRole("button", { name: "下一种鱼", exact: true }).click();
  await expect.poll(() => selectedId(page)).not.toBe(id);
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving", "false");
  expect(await originalCanvas!.evaluate(canvas => canvas.isConnected)).toBe(true);
  await reader(page).getByRole("button", { name: "上一种鱼", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", id);
  await reader(page).getByRole("button", { name: "关闭鱼种详情", exact: true }).click();
  await expect(reader(page)).toHaveCount(0);
  await expect(page.locator(".globe-fish-pin:visible")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
