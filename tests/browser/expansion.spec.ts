import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const photoProfiles = JSON.parse(readFileSync(new URL("../../content/photo-profiles.json", import.meta.url), "utf8")) as { water: string | null }[];
async function add(page: any, name: string) {
  await page.getByRole("textbox", { name: "查找规划鱼种" }).fill(name);
  await page.getByRole("textbox", { name: "查找规划鱼种" }).press("Enter");
  await page
    .locator(".candidate")
    .filter({ has: page.getByRole("button", { name: new RegExp("^" + name) }) })
    .getByRole("button", { name: /^加入规划/ })
    .click();
}
test("beginner scenarios supply editable starting values and water-specific presets", async ({ page }) => {
  await page.goto("/#/planner");
  await page.getByText("我的尺寸或水质不同？修改详细参数").click();
  await expect(page.getByRole("button", { name: /普通热带淡水/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("spinbutton", { name: "水温 °C" })).toHaveValue("25");
  await expect(page.getByRole("spinbutton", { name: "pH" })).toHaveValue("7");
  await expect(page.getByRole("spinbutton", { name: "硬度 dGH" })).toHaveValue("6");
  await page.getByRole("button", { name: /60 cm.*入门参考/ }).click();
  await expect(page.getByRole("spinbutton", { name: "缸长 cm" })).toHaveValue("60");
  await expect(page.getByRole("spinbutton", { name: "缸宽 cm" })).toHaveValue("30");
  await expect(page.getByRole("spinbutton", { name: "缸高 cm" })).toHaveValue("36");
  await expect(page.getByRole("spinbutton", { name: "有效水量 L" })).toHaveValue("52");
  await page.getByRole("spinbutton", { name: "有效水量 L" }).fill("48");
  await page.getByRole("button", { name: /东非湖慈鲷/ }).click();
  await expect(page.getByRole("spinbutton", { name: "pH" })).toHaveValue("8.2");
  await expect(page.getByRole("spinbutton", { name: "硬度 dGH" })).toHaveValue("12");
  await expect(page.getByRole("spinbutton", { name: "缸长 cm" })).toHaveValue("120");
  await page.getByRole("combobox", { name: /水体类型/ }).click();
  await page.getByRole("option", { name: "海水", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "pH" })).toHaveValue("8.2");
  await expect(page.getByRole("button", { name: /90 cm.*入门参考/ })).toBeVisible();
  await page.getByRole("button", { name: /90 cm.*入门参考/ }).click();
  await expect(page.getByRole("spinbutton", { name: "有效水量 L" })).toHaveValue("130");
  await expect(page.getByRole("spinbutton", { name: "比重 SG" })).toHaveValue("1.025");
  await expect(page.getByRole("link", { name: "依据 ↗" })).toHaveCount(2);
  await page.getByText("保存、分享或清空规划").click();
  await page.getByRole("button", { name: "生成分享链接" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: /90 cm.*入门参考/ })).toHaveAttribute("aria-pressed", "true");
});
test("planner validates input, quantity, fin risk, persistence and share links", async ({
  page,
}) => {
  await page.goto("/#/planner");
  await page.getByText("我的尺寸或水质不同？修改详细参数").click();
  await page.getByText("保存、分享或清空规划").click();
  await page
    .getByRole("spinbutton", { name: "缸长 cm", exact: true })
    .fill("-1");
  await expect(page.getByRole("alert")).toContainText("请检查数值");
  await expect(page.getByRole("button", { name: "保存规划" })).toBeDisabled();
  await page
    .getByRole("spinbutton", { name: "缸长 cm", exact: true })
    .fill("100");
  await page
    .getByRole("spinbutton", { name: "缸宽 cm", exact: true })
    .fill("40");
  await page
    .getByRole("spinbutton", { name: "缸高 cm", exact: true })
    .fill("50");
  await page
    .getByRole("spinbutton", { name: "有效水量 L", exact: true })
    .fill("300");
  await expect(page.getByRole("alert")).toContainText("几何容积");
  await page
    .getByRole("spinbutton", { name: "有效水量 L", exact: true })
    .fill("160");
  await add(page, "暹罗斗鱼");
  await page.getByRole("spinbutton", { name: "暹罗斗鱼数量" }).fill("2");
  await expect(page.locator(".stock-panel")).toContainText(
    "通常建议单养，当前选择了 2 条",
  );
  await add(page, "红裙鱼");
  await expect(page.locator(".pair-results")).toContainText("咬鳍行为");
  await page.getByRole("button", { name: "保存规划" }).click();
  await expect(page.getByRole("status")).toContainText("已保存");
  await page.getByRole("button", { name: "生成分享链接" }).click();
  await expect(page).toHaveURL(/plan=/);
  await page.reload();
  await expect(page.locator(".stock-row")).toHaveCount(2);
  await page.getByText("保存、分享或清空规划").click();
  await page.getByRole("button", { name: "清空当前" }).click();
  await expect(page.locator(".stock-row")).toHaveCount(0);
  await page.getByRole("button", { name: "读取规划" }).click();
  await expect(page.locator(".stock-row")).toHaveCount(2);
  await page
    .locator(".stock-title")
    .first()
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "关闭鱼种详情" }).click();
  await expect(page.locator(".stock-row")).toHaveCount(2);
});
test("marine filter and reference data remain distinct from freshwater", async ({
  page,
}) => {
  await page.goto("/#/atlas");
  await page.getByRole("combobox", { name: "水体筛选" }).click();
  await page.getByRole("option", { name: "海水", exact: true }).click();
  await expect(page.locator(".fish-card")).toHaveCount(3 + photoProfiles.filter((profile) => profile.water === "marine").length);
  await page.getByRole("button", { name: /蓝倒吊.*31 cm/ }).click();
  await expect(page.getByRole("dialog")).toContainText("681.37 L");
  await expect(page.getByRole("dialog")).toContainText("比重 SG");
  await page.getByRole("button", { name: "在地球查看证据" }).click();
  await expect(page).toHaveURL(/evidence=paracanthurus-hepatus/);
  await expect(page.locator(".evidence-panel")).toContainText("蓝倒吊");
});
test("evidence layer exposes provenance and empty samples, points can focus", async ({
  page,
}) => {
  await page.goto("/#/explore?evidence=pterophyllum-scalare");
  await expect(page.locator(".evidence-panel")).toContainText("历史记录样本");
  await expect(page.locator(".evidence-records article").first()).toBeVisible();
  await page.locator(".evidence-records button").first().click();
  await expect(page.locator(".evidence-records article.active")).toHaveCount(1);
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("combobox", { name: "选择分布证据鱼种" }).click();
  await page.getByRole("option", { name: "红绿灯", exact: true }).click();
  await expect(page.locator(".evidence-panel")).toContainText("没有通过当前");
  await expect(page.locator(".evidence-records")).toHaveCount(0);
});
test("phone planner and evidence fit viewport, malformed links recover", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/planner?plan=%7Bbroken");
  await expect(page.getByRole("status")).toContainText("规划无效");
  const navBox=await page.getByRole("navigation",{name:"主导航"}).boundingBox();
  const titleBox=await page.locator(".planner-page h1").boundingBox();
  expect(titleBox!.y).toBeGreaterThan(navBox!.y+navBox!.height);
  expect(titleBox!.x).toBeGreaterThanOrEqual(20);
  await add(page, "公子小丑鱼");
  await expect(page.locator(".stock-panel")).toContainText("水体类型不同");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "docs/mobile-planner.png", fullPage: true });
  await page.goto("/#/explore?evidence=pterophyllum-scalare");
  await expect(page.locator(".evidence-records")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/#/species/%E0%A4%A");
  await expect(
    page.getByRole("heading", { name: "没有找到这条鱼" }),
  ).toBeVisible();
});
test("phone planner keeps selection and risk review reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/planner");
  await page.getByRole("button", { name: "去选鱼" }).click();
  await expect(page.getByRole("heading", { name: "挑选喜欢的鱼" })).toBeInViewport();
  await page.locator(".candidate").first().getByRole("button", { name: /^加入规划/ }).click();
  await expect(page.locator(".planner-mobile-bar")).toContainText("已选 1 种鱼");
  await page.getByRole("button", { name: "查看规划" }).click();
  await expect(page.locator(".stock-panel")).toBeInViewport();
  await expect(page.getByRole("spinbutton", { name: "红绿灯数量" })).toHaveValue("8");
  await page.getByRole("button", { name: "减少红绿灯数量" }).click();
  await expect(page.locator(".stock-panel")).toContainText("来源建议群体至少 8 条");
});
test("suggested quantity is visible and the number input permits replacement", async ({ page }) => {
  await page.goto("/#/planner");
  const search = page.getByRole("textbox", { name: "查找规划鱼种" });
  await search.fill("红绿灯");
  await expect(page.locator(".candidate")).toHaveCount(1);
  await expect(page.locator(".candidate")).toContainText("建议至少 8 条群养");
  await page.getByRole("button", { name: "加入规划 · 8 条" }).click();
  const quantity = page.getByRole("spinbutton", { name: "红绿灯数量" });
  await expect(quantity).toHaveValue("8");
  await quantity.fill("");
  await expect(quantity).toHaveValue("");
  await quantity.fill("10");
  await expect(quantity).toHaveValue("10");
  await page.getByRole("button", { name: "减少红绿灯数量" }).click();
  await expect(quantity).toHaveValue("9");
});
test("planner fish cards use the available width and open the pictured fish", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 960 });
  await page.goto("/#/planner");
  const cards = page.locator(".candidate");
  const first = await cards.nth(0).boundingBox();
  const fourth = await cards.nth(3).boundingBox();
  const fifth = await cards.nth(4).boundingBox();
  const photo = await cards.first().locator(".fish-image").boundingBox();
  expect(first && fourth && fifth && photo).toBeTruthy();
  expect(fourth!.y).toBe(first!.y);
  expect(fourth!.x).toBeGreaterThan(first!.x);
  expect(fifth!.y).toBeGreaterThan(first!.y);
  expect(photo!.width).toBeGreaterThan(250);
  expect(photo!.height).toBeGreaterThan(160);
  await expect(cards.first()).toContainText("缸长");
  await expect(cards.first()).toContainText("水温");
  await expect(cards.first()).toContainText("建议至少 8 条群养");
  await expect(cards.first()).not.toContainText("来源建议");
  await expect(cards.first().getByText("查看核对依据")).toHaveCount(0);
  await cards.first().getByRole("button", { name: "查看红绿灯图鉴" }).click();
  await expect(page.getByRole("dialog")).toContainText("红绿灯");
  await expect(page.getByRole("dialog")).toContainText("与你的鱼缸核对");
  await expect(page.getByRole("dialog")).toContainText("来源 ↗");
  await page.getByRole("button", { name: "关闭鱼种详情" }).click();
  await cards.first().getByRole("button", { name: /^加入规划/ }).click();
  await expect(page.locator(".stock-panel")).toContainText("红绿灯");
});
test("keyboard modal closes with Escape and returns focus", async ({
  page,
}) => {
  await page.goto("/#/atlas");
  const button = page.locator(".card-open").first();
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(button).toBeFocused();
});

test('unavailable WebGL and failed photos retain a readable atlas', async ({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this: HTMLCanvasElement,type:any,...args:any[]){if(type==='webgl2'||type==='webgl')return null;return (original as any).call(this,type,...args)} as any;});
 await page.route('**/media/**',route=>route.abort());await page.goto('/#/explore?region=asia');await expect(page.locator('.fish-card')).toHaveCount(23);await expect(page.getByText('当前设备未能加载 3D 地球，已为你打开完整图鉴。')).toBeVisible();await page.locator('.fish-card').filter({hasText:'暹罗斗鱼'}).locator('.card-open').click();await expect(page.getByRole('dialog').getByRole('img',{name:/形态示意插画/})).toBeVisible();
});

test('repeated navigation releases scenes and reduced motion keeps rotation off',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#/explore');
 for(let i=0;i<6;i++){await expect(page.locator('canvas')).toHaveCount(1);await page.getByRole('button',{name:'鱼类图鉴',exact:true}).click();await expect(page.locator('canvas')).toHaveCount(0);await page.getByRole('button',{name:'探索地球',exact:true}).click();}
 await expect(page.getByRole('button',{name:'开启自转'})).toBeVisible();await expect(page.locator('canvas')).toHaveCount(1);expect(errors).toEqual([]);
});
