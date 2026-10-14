import { expect, test } from "@playwright/test";

for (const [route, label] of [
  ["/#/atlas", "搜索鱼种"],
  ["/#/catalog", "搜索学名、中文名或科属"],
] as const) {
  test(`${route} keeps the field stable before and during Chinese IME composition`, async ({ page }) => {
    await page.goto(route);
    const input = page.getByRole("textbox", { name: label });
    await input.focus();
    // Some macOS IMEs send plain input before compositionstart. The page must
    // not change its route or replace the field in that interval.
    await input.fill("h");
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(input).toBeFocused();
    await input.evaluate((element) =>
      element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true })),
    );
    await input.fill("honglv");
    await expect(input).toHaveValue("honglv");
    await expect(page).not.toHaveURL(/[?&]q=/);

    await input.fill("红绿灯");
    await expect(page).not.toHaveURL(/[?&]q=/);
    await input.evaluate((element) =>
      element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "红绿灯" })),
    );
    await expect.poll(() => page.evaluate(() => new URLSearchParams(location.hash.split("?")[1]).get("q"))).toBe("红绿灯");
    await expect(input).toHaveValue("红绿灯");
    await expect(page.locator(route.endsWith("catalog") ? ".catalog-card" : ".fish-card")).toHaveCount(1);
  });
}

test("ordinary text searches on Enter and after a short pause", async ({ page }) => {
  await page.goto("/#/atlas");
  const input = page.getByRole("textbox", { name: "搜索鱼种" });
  await input.fill("Betta splendens");
  await expect(page).not.toHaveURL(/[?&]q=/);
  await expect(input).toBeFocused();
  await input.press("Enter");
  await expect(page).toHaveURL(/q=Betta/);
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await input.fill("Paracheirodon innesi");
  await expect(page).toHaveURL(/q=Paracheirodon/);
  await expect(input).toBeFocused();
  await expect(page.locator(".fish-card")).toHaveCount(1);
});

test("planner keeps Chinese IME draft without filtering the fish list", async ({ page }) => {
  await page.goto("/#/planner");
  const input = page.getByRole("textbox", { name: "查找规划鱼种" });
  await expect(page.locator(".candidate")).toHaveCount(12);
  await input.focus();
  await input.evaluate((element) =>
    element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true })),
  );
  await input.fill("honglv");
  await page.waitForTimeout(350);
  await expect(page.locator(".candidate")).toHaveCount(12);
  await input.fill("红绿灯");
  await input.evaluate((element) =>
    element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "红绿灯" })),
  );
  await expect(page.locator(".candidate")).toHaveCount(1);
  await expect(input).toHaveValue("红绿灯");
});
