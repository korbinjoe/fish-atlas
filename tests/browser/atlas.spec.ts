import { mappedSpeciesCount } from "./distribution-fixture";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const photoCount = (JSON.parse(readFileSync(new URL("../../content/photo-profiles.json", import.meta.url), "utf8")) as unknown[]).length;
const atlasTotal = 33 + photoCount;

test("globe renders, region selection filters, drag does not open a fish", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("正在展开水下世界…")).not.toBeVisible();
  await expect(page.locator(".compact-card")).toHaveCount(atlasTotal);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(mappedSpeciesCount);
  await expect(page.locator(".globe-fish-pin.regional")).toHaveCount(mappedSpeciesCount);
  await expect(page.locator(".globe-fish-pin.unlocated")).toHaveCount(0);
  await expect(page.locator(".globe-fish-pin img").first()).toHaveAttribute("src", /media\//);
  await expect.poll(() => page.locator(".globe-fish-pin img").evaluateAll(
    (images) => images.filter((image) => (image as HTMLImageElement).naturalWidth > 0).length,
  )).toBe(mappedSpeciesCount);
  await page.getByRole("button", { name: /01 \/ AMAZON BASIN/ }).click();
  await expect(page).toHaveURL(/region=amazon/);
  await expect(page.locator(".compact-card")).toHaveCount(13);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(13);
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Canvas missing");
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.38);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.63, box.y + box.height * 0.5, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).not.toHaveURL(/species/);
  await page.getByRole("button", { name: "重置视角" }).click();
  await expect(page.locator(".compact-card")).toHaveCount(atlasTotal);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(mappedSpeciesCount);
  expect(errors).toEqual([]);
});

test("search, detail, provenance, back navigation, favorite persistence", async ({
  page,
}) => {
  await page.goto("/#/atlas");
  await page.getByRole("textbox", { name: "搜索鱼种" }).fill("暹罗斗鱼");
  await page.getByRole("textbox", { name: "搜索鱼种" }).press("Enter");
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await page.locator(".card-open").click();
  await expect(
    page.getByRole("dialog", { name: "暹罗斗鱼图鉴" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "暹罗斗鱼", exact: true }),
  ).toBeVisible();
  await page.getByText("资料来源与图片署名", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Seriously Fish · Betta splendens/ }),
  ).toHaveAttribute(
    "href",
    "https://www.seriouslyfish.com/species/betta-splendens/",
  );
  await page.getByRole("button", { name: "收藏鱼种", exact: true }).click();
  await page.getByRole("button", { name: "关闭鱼种详情" }).click();
  await expect(page).toHaveURL(/atlas\?q=/);
  await expect(page.getByRole("textbox", { name: "搜索鱼种" })).toHaveValue(
    "暹罗斗鱼",
  );
  await page.reload();
  await page.getByRole("button", { name: /我的收藏/ }).click();
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await page.getByRole("button", { name: "取消收藏暹罗斗鱼" }).click();
  await expect(page.getByText("这里还没有鱼")).toBeVisible();
});

test("curated fish photo fills detail and opens a zoomable full-size viewer", async ({ page }) => {
  await page.goto("/#/species/betta-splendens");
  const trigger = page.getByRole("button", { name: "放大查看暹罗斗鱼照片" });
  await expect(trigger).toBeVisible();
  await expect.poll(() => trigger.locator("img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect((await trigger.boundingBox())!.width).toBeGreaterThan(500);
  await trigger.click();
  const viewer = page.getByRole("dialog", { name: "暹罗斗鱼照片大图" });
  await expect(viewer).toBeVisible();
  const photo = viewer.locator("img");
  const initial = await photo.boundingBox();
  await viewer.getByRole("button", { name: "放大图片" }).click();
  await viewer.getByRole("button", { name: "放大图片" }).click();
  await expect(viewer.getByRole("button", { name: "重置图片缩放" })).toHaveText("200%");
  expect((await photo.boundingBox())!.width).toBeGreaterThan(initial!.width * 1.9);
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "暹罗斗鱼图鉴" })).toBeVisible();
  await expect(trigger).toBeFocused();
});

test("photo-profile image can be enlarged and panned on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/species/wm-amphiprion-percula");
  const trigger = page.getByRole("button", { name: "放大查看真小丑鱼照片" });
  await expect.poll(() => trigger.locator("img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await trigger.click();
  const viewer = page.getByRole("dialog", { name: "真小丑鱼照片大图" });
  await expect(viewer).toBeVisible();
  expect((await viewer.boundingBox())!.width).toBeLessThanOrEqual(390);
  await viewer.getByRole("button", { name: "放大图片" }).click();
  await viewer.getByRole("button", { name: "放大图片" }).click();
  await expect.poll(() => viewer.locator(".photo-viewer-stage").evaluate((stage) => stage.scrollWidth > stage.clientWidth)).toBe(true);
  await viewer.getByRole("button", { name: "关闭照片大图" }).click();
  await expect(viewer).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "真小丑鱼图鉴" })).toBeVisible();
});

test("compare max three, shareable comparison, and unknown fields are explicit", async ({
  page,
}) => {
  await page.goto("/#/atlas");
  for (const name of ["红绿灯", "宝莲灯", "七彩神仙"])
    await page
      .getByRole("button", { name: `对比${name}`, exact: true })
      .click();
  await page.getByRole("button", { name: "对比暹罗斗鱼", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("最多同时对比 3 种鱼");
  await page.getByRole("button", { name: "开始对比" }).click();
  await expect(page.getByRole("dialog", { name: "鱼种对比" })).toBeVisible();
  await expect(
    page.getByText("参数重叠不等于可以混养。", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "资料待补充", exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog", { name: "鱼种对比" })).toBeVisible();
  await expect(page.locator(".compare-table thead th")).toHaveCount(4);
});

test("empty search, bad deep link, and blocked storage recover gracefully", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new Error("Storage blocked");
    };
  });
  await page.goto("/#/atlas");
  await page.getByRole("button", { name: "收藏红绿灯", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "收藏仅在本次浏览中保留",
  );
  await page
    .getByRole("textbox", { name: "搜索鱼种" })
    .fill("不存在的鱼 species");
  await page.getByRole("textbox", { name: "搜索鱼种" }).press("Enter");
  await expect(page.getByText("暂时没有找到")).toBeVisible();
  await page.getByRole("button", { name: "清除筛选", exact: true }).click();
  await expect(page.locator(".fish-card")).toHaveCount(atlasTotal);
  await page.goto("/#/species/not-a-fish");
  await expect(
    page.getByRole("heading", { name: "没有找到这条鱼" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回图鉴", exact: true }).click();
  await expect(page.locator(".fish-card")).toHaveCount(atlasTotal);
});

test("WebGL loss preserves usable list and filters", async ({ page }) => {
  await page.goto("/#/explore?region=asia");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("正在展开水下世界…")).not.toBeVisible();
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(
    page.getByText("当前设备未能加载 3D 地球，已为你打开完整图鉴。"),
  ).toBeVisible();
  await expect(page.locator(".fish-card")).toHaveCount(23);
});

test("explore keeps unmapped photos in the list and maps only sourced basin links", async ({ page }) => {
  await page.goto("/#/explore");
  await expect(page.locator(".compact-card")).toHaveCount(atlasTotal);
  await expect(page.locator(".explore-coverage")).toContainText(`${mappedSpeciesCount} 种鱼的原生水域`);
  await page.getByRole("button", { name: `已定位 ${mappedSpeciesCount}` }).click();
  await expect(page.locator(".compact-card")).toHaveCount(mappedSpeciesCount);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(mappedSpeciesCount);
  await page.getByRole("button", { name: `待定位 ${183-mappedSpeciesCount}` }).click();
  await expect(page.locator(".compact-card")).toHaveCount(183-mappedSpeciesCount);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(0);
  await page.getByRole("button", { name: "全部照片 183" }).click();
  await expect(page.locator(".globe-fish-pin")).toHaveCount(mappedSpeciesCount);
  await page.getByRole("button", { name: "海水", exact: true }).click();
  await expect(page.locator(".globe-fish-pin")).toHaveCount(70);
  await page.getByRole("button", { name: "全部水体" }).click();
  await page.getByRole("textbox", { name: "搜索鱼种" }).fill("真小丑鱼");
  await page.getByRole("textbox", { name: "搜索鱼种" }).press("Enter");
  await expect(page.locator(".compact-card")).toHaveCount(1);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(1);
  await page.locator(".compact-card").click();
  const reader = page.getByRole("region", { name: "鱼类详情浏览", exact: true });
  await expect(reader.getByRole("heading", { name: "真小丑鱼", exact: true })).toBeVisible();
  await expect(reader.locator(".detail-visual img")).toHaveAttribute("src", /\/media\//);
  await page.getByRole("button", { name: "关闭鱼种详情" }).click();
  await page.getByRole("textbox", { name: "搜索鱼种" }).fill("红绿灯");
  await page.getByRole("textbox", { name: "搜索鱼种" }).press("Enter");
  await expect(page.locator(".globe-fish-pin")).toHaveCount(1);
  await page.locator(".globe-fish-pin").click();
  await expect(reader.getByRole("heading", { name: "红绿灯", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭鱼种详情" }).click();
  await page.getByRole("textbox", { name: "搜索鱼种" }).fill("皇家格兰玛");
  await page.getByRole("textbox", { name: "搜索鱼种" }).press("Enter");
  await expect(page.locator(".compact-card")).toContainText("加勒比海");
  await expect(page.locator(".globe-fish-pin")).toHaveCount(1);
});

test("mobile browsing and bottom sheet remain within viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("正在展开水下世界…")).not.toBeVisible();
  const globe = await page.locator(".globe-stage").boundingBox();
  const evidence = await page.locator(".evidence-panel").boundingBox();
  expect(globe!.y).toBeLessThan(evidence!.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "docs/mobile-preview.png", fullPage: true });
  await page.getByRole("button", { name: "鱼类图鉴", exact: true }).click();
  await page.locator(".card-open").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "docs/mobile-detail.png" });
  await page.getByRole("button", { name: "关闭鱼种详情" }).click();
  await expect(dialog).toHaveCount(0);
});

test("no external network is required to view the atlas", async ({ page }) => {
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" && url.protocol.startsWith("http")) {
      external.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/#/atlas");
  await expect(page.locator(".fish-card")).toHaveCount(atlasTotal);
  await page.locator(".card-open").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(external).toEqual([]);
});
