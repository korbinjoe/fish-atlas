import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { locationSpeciesCount } from "./distribution-fixture";

const profiles = JSON.parse(readFileSync(new URL("../../content/photo-profiles.json", import.meta.url), "utf8")) as { id: string; scientific: string; name: string; photo: { path: string } }[];
const ranges = JSON.parse(readFileSync(new URL("../../content/distributions.json", import.meta.url), "utf8")) as { species: Record<string, { links: { locationId: string }[] }> };
for (const [waterbody, label] of [["2433", "长江"], ["4219", "密西西比"], ["6242", "莱茵"]]) {
  test(`${label} native fish can be searched, filtered and opened with real photos`, async ({ page }) => {
    const fish = profiles.find((profile) => ranges.species[profile.id].links.some((link) => link.locationId === waterbody));
    expect(fish).toBeDefined();
    await page.goto(`/#/atlas?basin=${waterbody}`);
    await expect(page.locator(".fish-card")).toHaveCount(locationSpeciesCount.get(waterbody)!);
    const search = page.getByRole("textbox", { name: "搜索鱼种", exact: true });
    await search.fill(fish!.scientific);
    await search.press("Enter");
    await expect(page.locator(".fish-card")).toHaveCount(1);
    await page.locator(".card-open").click();
    const detail = page.getByRole("dialog");
    await expect(detail.locator(".detail-basin-tags")).toContainText(label);
    await expect.poll(() => detail.locator(".detail-visual img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThanOrEqual(300);
    await expect(detail.locator(".detail-visual img")).toHaveAttribute("src", fish!.photo.path);
    await detail.getByText("分布资料与关联依据", { exact: false }).click();
    await expect(detail.getByRole("link", { name: "FishBase 物种分布" })).toBeVisible();
  });
}

test("Great Lakes remain distinct from their river outlet and link the reader to the selected lake", async ({ page }) => {
  await page.goto("/#/explore?basin=lake-superior");
  const count = locationSpeciesCount.get("lake-superior")!;
  await expect(page.locator(".compact-card")).toHaveCount(count);
  await expect(page.locator(".globe-fish-pin")).toHaveCount(count);
  await expect(page.locator(".globe-fish-pin").first()).toHaveAttribute("data-waterbody-kind", "lake");
  await page.locator(".compact-card").first().click();
  const reader = page.getByRole("region", { name: "鱼类详情浏览", exact: true });
  await expect(reader.locator(".detail-basin-tags")).toContainText("苏必利尔");
  await expect(page.locator('.globe-fish-pin[aria-pressed="true"]')).toHaveCount(1);
  const first = page.url();
  await page.keyboard.press("ArrowRight");
  await expect(page).not.toHaveURL(first);
  await expect(reader.locator(".detail-basin-tags")).toContainText("苏必利尔");
  await expect(page.locator('.globe-fish-pin[aria-pressed="true"]')).toHaveCount(1);
});
