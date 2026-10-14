import { test, expect } from "@playwright/test";
import { mappedSpeciesCount, locationSpeciesCount } from "./distribution-fixture";

test("marine and lake locations filter photos and show distribution evidence", async ({page}) => {
  await page.goto('/#/explore');
  await expect(page.locator('.globe-fish-pin')).toHaveCount(mappedSpeciesCount);
  await page.getByRole('button',{name:'选择流域、海域或湖泊'}).click();
  const picker=page.getByRole('dialog',{name:'选择原生水域'});
  await picker.getByRole('button',{name:/^海域 /}).click();
  await picker.getByRole('textbox',{name:'搜索水域'}).fill('红海');
  await picker.getByRole('textbox',{name:'搜索水域'}).press('Enter');
  await picker.getByRole('button',{name:/查看红海/}).click();
  await expect(page).toHaveURL(/basin=sea-5/);
  await expect(page.locator('.compact-card')).toHaveCount(locationSpeciesCount.get('sea-5')!);
  await expect(page.locator('.globe-fish-pin')).toHaveCount(locationSpeciesCount.get('sea-5')!);
  await expect(page.locator('.globe-fish-pin').first()).toHaveAttribute('data-waterbody-kind','sea');
  await page.getByRole('button',{name:'选择流域、海域或湖泊'}).click();
  await picker.getByRole('button',{name:/^湖泊／潟湖 /}).click();
  await picker.getByRole('textbox',{name:'搜索水域'}).fill('坦噶');
  await picker.getByRole('textbox',{name:'搜索水域'}).press('Enter');
  await picker.getByRole('button',{name:/查看坦噶尼喀湖/}).click();
  await expect(page.locator('.globe-fish-pin')).toHaveCount(6);
  await expect(page.locator('.compact-card')).toHaveCount(6);
  const pins=page.locator('.globe-fish-pin:visible');
  await expect(pins).toHaveCount(6);
  // Every lake card remains individually reachable despite a compact geographic area.
  await pins.first().click();
  await expect(page.locator('.detail-basin-tags')).toContainText('坦噶尼喀湖');
  await page.getByText('分布资料与关联依据',{exact:false}).click();
  await expect(page.getByRole('link',{name:'FishBase 物种分布'})).toBeVisible();
});

test("atlas can select a point-only lake and keep its fish out of the outlet basin", async ({page}) => {
  await page.goto('/#/atlas?basin=lake-inle');
  await expect(page.locator('.fish-card')).toHaveCount(1);
  await expect(page.locator('.atlas-basin-notice')).toContainText('茵莱湖');
  await page.locator('.card-open').click();
  await expect(page.locator('.detail-basin-tags')).toContainText('茵莱湖');
  await expect(page.locator('.detail-basin-tags')).not.toContainText('萨尔温');
});

test("mobile sea/lake picker and crowded photos remain usable", async({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#/explore?basin=lake-malawi');
  await expect(page.locator('.globe-fish-pin:visible')).toHaveCount(4);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'选择流域、海域或湖泊'}).click();
  const picker=page.getByRole('dialog',{name:'选择原生水域'});
  await picker.getByRole('button',{name:/^海域 /}).click();
  await picker.getByRole('textbox',{name:'搜索水域'}).fill('夏威夷');
  await picker.getByRole('textbox',{name:'搜索水域'}).press('Enter');
  await picker.getByRole('button',{name:/查看夏威夷/}).click();
  await expect(page.locator('.compact-card')).toHaveCount(locationSpeciesCount.get('sea-166')!);
});

test("new river anchors are selectable and keep small native habitats inland", async ({page}) => {
  await page.goto('/#/explore?basin=river-kananmae-chaung');
  const pin=page.locator('.globe-fish-pin');
  await expect(pin).toHaveCount(1);
  await expect(pin).toHaveAttribute('data-waterbody-kind','river');
  await expect(pin).toHaveAttribute('data-latitude','18.59416');
  await expect(pin).toHaveAttribute('data-longitude','94.37916');
  await pin.click();
  await expect(page.locator('.detail-basin-tags')).toContainText('卡南梅溪');
  await page.getByText('分布资料与关联依据',{exact:false}).click();
  await expect(page.locator('.distribution-details')).toContainText('NRM 正模标本');
  await expect(page.locator('.distribution-details')).toContainText('8°');
});

test("river picker finds Hong Kong streams and shows both Nee Soon native fish", async ({page}) => {
  await page.goto('/#/explore?basin=river-nee-soon');
  await expect(page.locator('.globe-fish-pin')).toHaveCount(2);
  await expect(page.locator('.compact-card')).toHaveCount(2);
  await page.getByRole('button',{name:'选择流域、海域或湖泊'}).click();
  const picker=page.getByRole('dialog',{name:'选择原生水域'});
  await picker.getByRole('button',{name:/^河流水系 /}).click();
  await picker.getByRole('textbox',{name:'搜索水域'}).fill('沙螺洞');
  await picker.getByRole('textbox',{name:'搜索水域'}).press('Enter');
  await picker.getByRole('button',{name:/查看沙螺洞/}).click();
  await expect(page).toHaveURL(/basin=river-sha-lo-tung/);
  await expect(page.locator('.globe-fish-pin')).toHaveCount(1);
  await expect(page.locator('.compact-card')).toContainText('香港');
});

test("published Pangio survey limitations are available in fish details", async ({page}) => {
  await page.goto('/#/species/pangio-kuhlii');
  await expect(page.locator('.detail-basin-tags')).toContainText('Klawing');
  await page.getByText('分布资料与关联依据',{exact:false}).click();
  const evidence=page.locator('.distribution-details');
  await expect(evidence).toContainText('形态鉴定');
  await expect(evidence).toContainText('未提供标本照片、馆藏号或分子复核');
  await expect(evidence.getByRole('link',{name:'物种依据',exact:true})).toHaveAttribute('href',/maiyah\/article\/view\/7252/);
});

test("the newly sourced Veracruz lagoon filters the atlas independently", async ({page}) => {
  await page.goto('/#/atlas?basin=lake-san-julian-veracruz');
  await expect(page.locator('.fish-card')).toHaveCount(1);
  await expect(page.locator('.atlas-basin-notice')).toContainText('圣胡利安潟湖');
  await page.locator('.card-open').click();
  await expect(page.locator('.detail-basin-tags')).toContainText('圣胡利安潟湖');
});
