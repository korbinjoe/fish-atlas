import { mappedSpeciesCount, locationSpeciesCount } from "./distribution-fixture";
import { expect, test } from "@playwright/test";

test("explore exposes all 520 basins and keeps empty basins honest", async ({ page }) => {
  await page.goto("/#/explore");
  await expect(page.locator(".globe-fish-pin")).toHaveCount(mappedSpeciesCount);
  await page.getByRole("button", { name: "选择流域、海域或湖泊" }).click();
  const picker = page.getByRole("dialog", { name: "选择原生水域" });
  await expect(picker).toBeVisible();
  await expect(picker.locator(".basin-results button")).toHaveCount(520);
  await picker.getByRole("textbox", { name: "搜索水域" }).fill("长江");
  await picker.getByRole("textbox", { name: "搜索水域" }).press("Enter");
  await expect(picker.locator(".basin-results button")).toHaveCount(1);
  await picker.getByRole("button", { name: /查看长江流域/ }).click();
  await expect(page).toHaveURL(/basin=2433/);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(2);
  await expect(page.locator(".compact-card")).toHaveCount(2);
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "选择流域、海域或湖泊" }).click();
  await picker.getByRole("textbox", { name: "搜索水域" }).fill("Amazon");
  await picker.getByRole("textbox", { name: "搜索水域" }).press("Enter");
  await picker.getByRole("button", { name: /查看亚马孙河流域/ }).click();
  await expect(page.locator(".globe-fish-pin")).toHaveCount(locationSpeciesCount.get("3203")!);
  await expect(page.locator(".compact-card")).toHaveCount(locationSpeciesCount.get("3203")!);
  await page.getByRole("button", { name: "重置视角" }).click();
  await expect(page.locator(".globe-fish-pin")).toHaveCount(mappedSpeciesCount);
});

test("atlas basin filter links to sourced species and clears cleanly", async ({ page }) => {
  await page.goto("/#/atlas");
  await page.getByRole("button", { name: /选择流域、海域或湖泊/ }).click();
  const picker = page.getByRole("dialog", { name: "选择原生水域" });
  await picker.getByRole("textbox", { name: "搜索水域" }).fill("刚果");
  await picker.getByRole("textbox", { name: "搜索水域" }).press("Enter");
  await picker.getByRole("button", { name: /查看刚果河流域/ }).click();
  await expect(page).toHaveURL(/basin=1209/);
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await page.locator(".card-open").click();
  await expect(page.getByRole("dialog", { name: "刚果灯图鉴" })).toContainText("原生分布水域");
  await page.getByRole("button", { name: "关闭鱼种详情" }).click();
  await page.getByRole("button", { name: "清除流域筛选" }).click();
  await expect(page.locator(".fish-card")).toHaveCount(183);
});

test("mobile basin search and map fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/explore?basin=3203");
  await expect(page.locator(".globe-fish-pin:visible")).toHaveCount(locationSpeciesCount.get("3203")!);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "选择流域、海域或湖泊" }).click();
  const box = await page.getByRole("dialog", { name: "选择原生水域" }).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.width).toBeLessThanOrEqual(390);
});
