import { expect, test } from "@playwright/test";
import { mappedSpeciesCount } from "./distribution-fixture";

test.use({ deviceScaleFactor: 2 });

test("high-resolution globe defaults to major rivers and adds details when zoomed", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#/explore");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-map-layer", "vector-rivers");
  await expect(canvas).toHaveAttribute("data-main-river-features", "783");
  await expect(canvas).toHaveAttribute("data-outline-location", "");
  await expect(canvas).toHaveAttribute("data-river-detail-visible", "false");
  expect(Number(await canvas.getAttribute("data-map-texture-width"))).toBeGreaterThanOrEqual(4096);
  expect(await canvas.evaluate((element) => (element as HTMLCanvasElement).width / element.getBoundingClientRect().width)).toBeGreaterThan(1.9);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(mappedSpeciesCount);
  const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + box!.width * .82, box!.y + box!.height * .15);
  // OrbitControls treats each wheel event as one step, regardless of delta.
  for (let step = 0; step < 25; step++) await page.mouse.wheel(0, -100);
  await expect(canvas).toHaveAttribute("data-river-detail-visible", "true");
  // Zoom can move a fish underneath the cursor, legitimately revealing its
  // waterbody. Leave the globe before checking the unselected map state.
  await page.mouse.move(10, 10);
  await expect(canvas).toHaveAttribute("data-outline-location", "");
  await expect(page.locator(".globe-fish-pin")).toHaveCount(mappedSpeciesCount);
  expect(errors).toEqual([]);
});

test("waterbody outlines appear on selection and disappear after clearing on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/explore?basin=3203");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-outline-location", "3203");
  await expect(page.locator(".globe-waterbody-context")).toContainText("亚马孙河流域");
  await expect(canvas).toHaveAttribute("data-map-texture-width", "2048");
  await page.getByRole("button", { name: "重置视角" }).click();
  await expect(canvas).toHaveAttribute("data-outline-location", "");
  await expect(page.locator(".globe-fish-pin")).toHaveCount(mappedSpeciesCount);
  await expect(canvas).toHaveAttribute("data-main-river-features", "783");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
