import { expect, test } from "@playwright/test";
import { mappedSpeciesCount, locationSpeciesCount } from "./distribution-fixture";

test("overview photos stay near their native waterbody and reveal its ownership", async ({ page }) => {
  await page.goto("/#/explore");
  await expect(page.locator(".globe-fish-pin")).toHaveCount(mappedSpeciesCount);
  const pins = page.locator(".globe-fish-pin:visible");
  await expect(pins.first()).toHaveAttribute("data-anchor-x", /\d/);
  const offsets = await pins.evaluateAll((buttons) => buttons.map((element) => {
    const button = element as HTMLButtonElement;
    return Math.hypot(Number(button.dataset.positionX) - Number(button.dataset.anchorX),
      Number(button.dataset.positionY) - Number(button.dataset.anchorY));
  }));
  expect(offsets.length).toBeGreaterThan(10);
  expect(Math.max(...offsets)).toBeLessThanOrEqual(48.001);
  // Marker movement uses a compositor transform. The measured center must
  // still match the reported pixel position in the overlay's coordinate space.
  const centerErrors = await pins.evaluateAll((buttons) => buttons.map((element) => {
    const button = element as HTMLButtonElement;
    const overlay = button.closest(".photo-pin-overlay")!.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    return Math.hypot(rect.x + rect.width / 2 - overlay.x - Number(button.dataset.positionX),
      rect.y + rect.height / 2 - overlay.y - Number(button.dataset.positionY));
  }));
  expect(Math.max(...centerErrors)).toBeLessThanOrEqual(1);
  const seaPin = page.locator('.globe-fish-pin[data-waterbody-kind="sea"]:visible').last();
  const location = await seaPin.getAttribute("data-basin-id");
  await seaPin.focus();
  await expect(page.locator(".globe-renderer")).toHaveAttribute("data-highlighted-location", location!);
  await expect(page.locator(".globe-waterbody-context")).toBeVisible();
  await expect(seaPin.locator(".pin-tooltip")).toContainText("原生水域");
  await expect(page.locator(`.globe-fish-pin[data-basin-id="${location}"]`).first())
    .toHaveAttribute("data-waterbody-active", "true");
  await expect(page.locator(".globe-fish-pin[data-muted='true']").first()).toHaveCSS("opacity", "0.35");
});

test("selected waterbody keeps all photos in a bounded compact group on desktop and mobile", async ({ page }) => {
  for (const width of [1440, 390]) {
    for (const location of ["3203", "lake-tanganyika"]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/#/explore?basin=${location}`);
      const pins = page.locator(".globe-fish-pin:visible");
      await expect(pins).toHaveCount(locationSpeciesCount.get(location)!);
      await expect(page.locator(".globe-waterbody-context")).toContainText(location === "3203" ? "亚马孙河流域" : "坦噶尼喀湖");
      const measurements = await pins.evaluateAll((elements) => elements.map((element) => {
        const button = element as HTMLButtonElement;
        const x = Number(button.dataset.positionX), y = Number(button.dataset.positionY);
        const aX = Number(button.dataset.anchorX), aY = Number(button.dataset.anchorY);
        const rect = button.getBoundingClientRect();
        const overlay = button.closest(".photo-pin-overlay")!.getBoundingClientRect();
        return { offset: Math.hypot(x - aX, y - aY), anchor: `${aX},${aY}`,
          centerError: Math.hypot(rect.x + rect.width / 2 - overlay.x - x, rect.y + rect.height / 2 - overlay.y - y),
          reachable: document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest("button") === button };
      }));
      expect(Math.max(...measurements.map((pin) => pin.offset))).toBeLessThanOrEqual(width === 390 ? 48.001 : 72.001);
      expect(Math.max(...measurements.map((pin) => pin.centerError))).toBeLessThanOrEqual(1);
      if (location === "3203") expect(new Set(measurements.map((pin) => pin.anchor)).size).toBe(1);
      // The camera animates to a selected waterbody; early frames can still
      // place its group at the viewport edge. Check click targets after travel.
      await expect.poll(() => pins.evaluateAll((elements) => elements.every((element) => {
        const rect = element.getBoundingClientRect();
        return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest("button") === element;
      }))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
