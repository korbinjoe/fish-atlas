import { expect, test, type Page } from "@playwright/test";

const reader = (page: Page) => page.getByRole("region", { name: "鱼类详情浏览", exact: true });
const navigation = (page: Page) => page.getByRole("navigation", { name: "主导航", exact: true });

async function globeProjection(page: Page) {
  return page.locator("canvas").evaluate(element => {
    const target = element as HTMLCanvasElement;
    const box = target.getBoundingClientRect();
    const distance = Number(target.dataset.cameraDistance);
    const fov = Number(target.dataset.cameraFov);
    const aspect = Number(target.dataset.cameraAspect);
    // Use the actual camera projection. A unit sphere's silhouette radius
    // is focalLength / sqrt(distance^2 - 1), not focalLength / distance.
    const diameter = box.height / (Math.tan(fov * Math.PI / 360) * Math.sqrt(distance * distance - 1));
    return { ratio: diameter / (box.height * Math.min(aspect, 1)),
      aspect, viewportAspect: box.width / box.height, fov, distance };
  });
}

async function overview(page: Page, path = "/#/explore") {
  await page.goto(path);
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-camera-distance", /\d/);
  await expect(canvas).toHaveAttribute("data-camera-moving", "false");
  return canvas;
}

async function settleGlobe(page: Page) {
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving", "false");
  await page.waitForFunction(() => {
    const renderer = document.querySelector(".globe-renderer");
    return renderer && renderer.getAnimations().every(animation => animation.playState !== "running");
  });
}

test("opening and closing the reader keeps one canvas and avoids frame-by-frame buffer resizing", async ({ page }) => {
  const canvas = await overview(page);
  const original = (await canvas.elementHandle())!;
  const pin = page.locator(".globe-fish-pin:visible").first();
  await expect(pin).toBeVisible();
  const installProbe = () => original.evaluate(element => {
    const target = element as HTMLCanvasElement & {
      sizeProbe?: { observer: MutationObserver; sizes: string[]; last: string };
    };
    target.sizeProbe?.observer.disconnect();
    const sizes: string[] = [];
    const probe = {
      sizes,
      last: `${target.width}x${target.height}`,
      observer: new MutationObserver(() => {
        const next = `${target.width}x${target.height}`;
        if (next !== probe.last) {
          // A buffer resize writes width and height together. Count the
          // resulting size pair once, rather than counting both attributes.
          sizes.push(next);
          probe.last = next;
        }
      }),
    };
    target.sizeProbe = probe;
    probe.observer.observe(target, { attributes: true, attributeFilter: ["width", "height"] });
  });
  const dimensionsChanged = () => original.evaluate(element => {
    const target = element as HTMLCanvasElement & {
      sizeProbe?: { observer: MutationObserver; sizes: string[] };
    };
    const changes = target.sizeProbe!.sizes;
    target.sizeProbe!.observer.disconnect();
    return { changes, sameCanvas: target.isConnected && target === document.querySelector("canvas") };
  });

  await installProbe();
  await pin.click();
  await expect(reader(page)).toBeVisible();
  await settleGlobe(page);
  const opened = await dimensionsChanged();
  expect(opened.sameCanvas).toBe(true);
  expect(opened.changes.length).toBeLessThanOrEqual(3);

  await installProbe();
  await reader(page).getByRole("button", { name: "关闭鱼种详情", exact: true }).click();
  await expect(reader(page)).toHaveCount(0);
  await settleGlobe(page);
  const closed = await dimensionsChanged();
  expect(closed.sameCanvas).toBe(true);
  expect(closed.changes.length).toBeLessThanOrEqual(3);
});

test("the default globe fills its short viewport dimension without cropping the sphere", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await overview(page);
    const occupancy = await globeProjection(page);
    expect(occupancy.fov).toBeGreaterThan(0);
    expect(Math.abs(occupancy.aspect - occupancy.viewportAspect)).toBeLessThan(0.005);
    expect(occupancy.ratio).toBeGreaterThanOrEqual(0.89);
    expect(occupancy.ratio).toBeLessThanOrEqual(0.97);
  }
});

test("the narrow tablet reader fits the whole globe into its short dimension", async ({ page }) => {
  for (const width of [621, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await overview(page, "/#/explore?basin=river-nee-soon");
    await page.locator(".globe-fish-pin:visible").first().click();
    await expect(reader(page)).toBeVisible();
    await settleGlobe(page);
    const occupancy = await globeProjection(page);
    expect(Math.abs(occupancy.aspect - occupancy.viewportAspect)).toBeLessThan(0.005);
    expect(occupancy.ratio).toBeGreaterThanOrEqual(0.86);
    expect(occupancy.ratio).toBeLessThanOrEqual(0.94);
  }
});

test("the default camera refits after leaving the globe and returning at another viewport size", async ({ page }) => {
  await overview(page);
  await navigation(page).getByRole("button", { name: "鱼类图鉴", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await navigation(page).getByRole("button", { name: "探索地球", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-distance", /\d/);
  await settleGlobe(page);
  const occupancy = await globeProjection(page);
  expect(occupancy.ratio).toBeGreaterThanOrEqual(0.89);
  expect(occupancy.ratio).toBeLessThanOrEqual(0.97);
});

test("manual wheel zoom survives leaving the globe and returning at another viewport size", async ({ page }) => {
  const canvas = await overview(page);
  const initialDistance = Number(await canvas.getAttribute("data-camera-distance"));
  const box = (await canvas.boundingBox())!;
  // Use a quiet corner of the canvas, away from the floating controls and fish.
  await page.mouse.move(box.x + box.width * .95, box.y + box.height * .07);
  await page.mouse.wheel(0, -100);
  await expect.poll(async () => Number(await canvas.getAttribute("data-camera-distance")))
    .toBeLessThan(initialDistance * .99);
  const manualDistance = Number(await canvas.getAttribute("data-camera-distance"));
  await navigation(page).getByRole("button", { name: "鱼类图鉴", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await navigation(page).getByRole("button", { name: "探索地球", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-distance", /\d/);
  await settleGlobe(page);
  const restoredDistance = Number(await page.locator("canvas").getAttribute("data-camera-distance"));
  expect(Math.abs(restoredDistance - manualDistance)).toBeLessThan(0.02);
});

test("opening the desktop reader keeps the globe round throughout its layout animation", async ({ page }) => {
  await overview(page);
  await page.locator(".globe-fish-pin:visible").first().click();
  await expect(reader(page)).toBeVisible();
  const renderer = page.locator(".globe-renderer");
  await expect(renderer).toHaveAttribute("data-layout-moving", "true");
  const samples = await renderer.evaluate(async element => {
    const values: { scaleX: number; scaleY: number }[] = [];
    for (let index = 0; index < 6; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (!element.getAnimations().some(animation => animation.playState === "running")) break;
      const matrix = new DOMMatrix(getComputedStyle(element).transform);
      values.push({ scaleX: Math.hypot(matrix.m11, matrix.m12), scaleY: Math.hypot(matrix.m21, matrix.m22) });
    }
    return values;
  });
  expect(samples.length).toBeGreaterThanOrEqual(3);
  for (const sample of samples) expect(Math.abs(sample.scaleX - sample.scaleY)).toBeLessThan(0.001);
});

test("returning from the reader through navigation or evidence animates the existing globe", async ({ page }) => {
  const canvas = await overview(page);
  const original = (await canvas.elementHandle())!;
  const bettaCard = page.locator('.compact-card[data-fish-id="betta-splendens"]');
  await bettaCard.click();
  await expect(reader(page)).toBeVisible();
  await settleGlobe(page);
  await navigation(page).getByRole("button", { name: "探索地球", exact: true }).click();
  await expect(reader(page)).toHaveCount(0);
  await expect(page.locator(".globe-renderer")).toHaveAttribute("data-layout-moving", "true");
  expect(await original.evaluate(element => element.isConnected && element === document.querySelector("canvas"))).toBe(true);
  await settleGlobe(page);

  await bettaCard.click();
  await expect(reader(page)).toBeVisible();
  await settleGlobe(page);
  await reader(page).getByRole("button", { name: "在地球查看证据", exact: true }).click();
  await expect(reader(page)).toHaveCount(0);
  await expect(page.locator(".globe-renderer")).toHaveAttribute("data-layout-moving", "true");
  expect(await original.evaluate(element => element.isConnected && element === document.querySelector("canvas"))).toBe(true);
  await expect(page).toHaveURL(/#\/explore\?evidence=betta-splendens/);
});

test("switching fish after an idle demand frame still plays the full camera flight", async ({ page }) => {
  const canvas = await overview(page);
  const pin = page.locator(".globe-fish-pin:visible").first();
  await expect(pin).toBeVisible();
  await pin.click();
  await expect(reader(page)).toBeVisible();
  await settleGlobe(page);
  const originalId = await canvas.getAttribute("data-active-fish");
  // This pause is the regression trigger: demand rendering accumulates a
  // long frame delta while idle, which must not complete the next flight.
  await page.waitForTimeout(1200);
  const started = await page.evaluate(() => performance.now());
  await page.keyboard.press("ArrowRight");
  expect(await canvas.getAttribute("data-camera-moving")).toBe("true");
  await expect(canvas).not.toHaveAttribute("data-active-fish", originalId!);
  await page.waitForFunction(() => document.querySelector("canvas")?.dataset.cameraMoving === "false");
  const elapsed = await page.evaluate(start => performance.now() - start, started);
  expect(elapsed).toBeGreaterThanOrEqual(550);
  // The nominal flight takes 700ms. Allow slower automation hosts without
  // allowing an idle delta to skip straight to the destination on frame one.
  expect(elapsed).toBeLessThanOrEqual(2000);
});

test("reader navigation stays inside the visible panel at phone, tablet and desktop widths", async ({ page }) => {
  test.setTimeout(60000);
  for (const width of [360, 620, 768, 901, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await overview(page, "/#/explore?basin=river-nee-soon");
    const pin = page.locator(".globe-fish-pin:visible").first();
    await expect(pin).toBeVisible();
    await pin.click();
    await expect(reader(page)).toBeVisible();
    await settleGlobe(page);
    const nav = reader(page).getByRole("navigation", { name: "切换鱼种", exact: true });
    const measurements = await nav.evaluate(element => {
      const panel = element.closest(".species-panel")!.getBoundingClientRect();
      const navBox = element.getBoundingClientRect();
      const children = Array.from(element.children).map(child => {
        const box = child.getBoundingClientRect();
        return { left: box.left, right: box.right, width: box.width };
      });
      return { panel: { left: panel.left, right: panel.right }, nav: { left: navBox.left, right: navBox.right }, children };
    });
    expect(measurements.children).toHaveLength(3);
    for (const child of measurements.children) {
      expect(child.left).toBeGreaterThanOrEqual(measurements.panel.left - 1);
      expect(child.right).toBeLessThanOrEqual(measurements.panel.right + 1);
      expect(child.left).toBeGreaterThanOrEqual(measurements.nav.left - 1);
      expect(child.right).toBeLessThanOrEqual(measurements.nav.right + 1);
      expect(child.width).toBeGreaterThan(0);
    }
    expect(measurements.children[0].right).toBeLessThanOrEqual(measurements.children[1].left + 1);
    expect(measurements.children[1].right).toBeLessThanOrEqual(measurements.children[2].left + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
