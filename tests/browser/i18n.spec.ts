import { expect, test, type Locator, type Page } from "@playwright/test";

// Existing regression suites explicitly retain Chinese. This suite must exercise
// a genuinely new visitor, including a browser whose own language is Chinese.
test.use({ storageState: { cookies: [], origins: [] }, locale: "zh-CN" });

const languages = [
  { code: "en", tag: "en", native: "English", label: "Language", explore: "Explore", atlas: "Fish atlas", planner: "Tank planner", search: "Search fish", placeholder: "Search names, scientific names or aliases" },
  { code: "zh", tag: "zh-CN", native: "中文", label: "语言", explore: "探索地球", atlas: "鱼类图鉴", planner: "鱼缸规划", search: "搜索鱼种", placeholder: "搜索鱼名、学名或别名 · 输入后自动搜索" },
  { code: "fr", tag: "fr", native: "Français", label: "Langue", explore: "Explorer", atlas: "Atlas des poissons", planner: "Planifier un bac", search: "Rechercher un poisson", placeholder: "Nom, nom scientifique ou synonyme" },
  { code: "de", tag: "de", native: "Deutsch", label: "Sprache", explore: "Entdecken", atlas: "Fischatlas", planner: "Aquarienplaner", search: "Fische suchen", placeholder: "Name, wissenschaftlicher Name oder Synonym" },
  { code: "ja", tag: "ja", native: "日本語", label: "言語", explore: "地球を探索", atlas: "魚類図鑑", planner: "水槽計画", search: "魚種を検索", placeholder: "魚名・学名・別名を入力して検索" },
] as const;
type Language = typeof languages[number]["code"];
const language = (code: Language) => languages.find(item => item.code === code)!;
const languagePicker = (page: Page) => page.getByRole("combobox", { name: /^(Language|语言|Langue|Sprache|言語)$/ });
const nav = (page: Page) => page.locator(".header nav");
const gallery = (page: Page) => page.locator(".photo-viewer");

async function switchLanguage(page: Page, code: Language) {
  await languagePicker(page).click();
  await page.getByRole("option", { name: language(code).native, exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", language(code).tag);
  await expect(languagePicker(page)).toHaveAccessibleName(language(code).label);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("fish-atlas:locale"))).toBe(code);
}

async function inViewport(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  const box = (await target.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  return box;
}

test("a new Chinese-browser visitor gets English and all five languages update navigation, search and persistence", async ({ page }) => {
  await page.goto("/?v=i18n-check#/atlas?q=Betta%20splendens&water=freshwater");
  expect(await page.evaluate(() => navigator.language)).toBe("zh-CN");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(languagePicker(page)).toContainText("English");
  await expect(page).toHaveTitle(/Fish Atlas/);

  for (const code of ["zh", "fr", "de", "ja", "en"] as const) {
    const expected = language(code);
    await switchLanguage(page, code);
    for (const name of [expected.explore, expected.atlas, expected.planner]) {
      await expect(nav(page).getByRole("button", { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("textbox", { name: expected.search, exact: true })).toHaveAttribute("placeholder", expected.placeholder);
    await expect(page).toHaveTitle(code === "zh" ? /鱼类星球/ : code === "ja" ? /魚類図鑑/ : /Fish Atlas/);
    const feedback = page.locator(".site-footer .feedback-link");
    await expect(feedback).toHaveCount(1);
    const issue = new URL((await feedback.getAttribute("href"))!);
    expect(issue.origin).toBe("https://github.com");
    expect(issue.pathname).toBe("/korbinjoe/fish-atlas/issues/new");
    expect(issue.searchParams.get("template")).toBe(code === "zh" ? "fish-data.yml" : "fish-data-en.yml");
    expect(issue.searchParams.get("language")).toBe(code === "zh" ? null : expected.native);
    expect(issue.searchParams.get("title")).toMatch(code === "zh" ? /^\[鱼类资料\]/ : /^\[Fish data\]/);
    expect(issue.searchParams.has("fish")).toBe(false);
    const canonical = new URL(issue.searchParams.get("page_url")!);
    expect(canonical.origin).toBe(new URL(page.url()).origin);
    expect(canonical.search).toBe("");
    expect(canonical.hash).toBe("#/atlas");
    if (code === "ja" || code === "en") {
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", expected.tag);
      await expect(languagePicker(page)).toContainText(expected.native);
    }
  }
});

test("language changes preserve atlas filters, bilingual search results and saved fish", async ({ page }) => {
  await page.goto("/#/atlas?q=Betta%20splendens&region=asia&water=freshwater");
  const originalUrl = page.url();
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await expect(page.locator(".fish-card h2")).toHaveText("Siamese fighting fish");
  await page.locator(".fish-card").getByRole("button", { name: "Save Siamese fighting fish", exact: true }).click();
  const savedBefore = await page.evaluate(() => localStorage.getItem("fish-atlas:v1"));
  expect(JSON.parse(savedBefore!).saved).toContain("betta-splendens");

  for (const [code, name] of [["fr", "Combattant"], ["ja", "ベタ"], ["zh", "暹罗斗鱼"]] as const) {
    await switchLanguage(page, code);
    await expect(page).toHaveURL(originalUrl);
    await expect(page.getByRole("textbox", { name: language(code).search, exact: true })).toHaveValue("Betta splendens");
    await expect(page.locator(".fish-card")).toHaveCount(1);
    await expect(page.locator(".fish-card h2")).toHaveText(name);
    expect(await page.evaluate(() => localStorage.getItem("fish-atlas:v1"))).toBe(savedBefore);
  }
  await switchLanguage(page, "fr");
  await page.getByRole("textbox", { name: language("fr").search, exact: true }).fill("Combattant");
  await page.getByRole("textbox", { name: language("fr").search, exact: true }).press("Enter");
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await expect(page.locator(".fish-card h2")).toHaveText("Combattant");
  const frenchQueryUrl = page.url();
  await switchLanguage(page, "en");
  await expect(page).toHaveURL(frenchQueryUrl);
  await expect(page.getByRole("textbox", { name: language("en").search, exact: true })).toHaveValue("Combattant");
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await expect(page.locator(".fish-card h2")).toHaveText("Siamese fighting fish");
  await switchLanguage(page, "zh");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await nav(page).getByRole("button", { name: /我的收藏/ }).click();
  await expect(page.locator(".fish-card")).toHaveCount(1);
  await expect(page.locator(".fish-card h2")).toHaveText("暹罗斗鱼");
  await switchLanguage(page, "en");
  await expect(page.locator(".fish-card h2")).toHaveText("Siamese fighting fish");
});

test("catalog and waterbody picker translate labels while Chinese and English names remain searchable", async ({ page }) => {
  await page.goto("/#/catalog?tier=basic&q=Aboma%20etheostoma");
  const basic = page.locator(".catalog-card");
  await expect(basic).toHaveCount(1);
  await expect(basic.getByRole("heading", { name: "Scaly Goby", exact: true })).toBeVisible();
  await expect(basic.getByText("Aboma etheostoma", { exact: true })).toBeVisible();
  await expect(basic.getByText("Scaly Goby", { exact: true })).toHaveCount(1);
  await basic.getByRole("button", { name: "View Scaly Goby details", exact: true }).click();
  const record = page.getByRole("dialog", { name: "Aboma etheostoma taxonomy record", exact: true });
  await expect(record.getByRole("heading", { name: "Scaly Goby", exact: true })).toBeVisible();
  await expect(record.getByText("Aboma etheostoma", { exact: true })).toBeVisible();
  await record.getByRole("button", { name: "Close taxonomy record", exact: true }).click();
  await page.goto("/#/catalog?q=%E7%BA%A2%E7%BB%BF%E7%81%AF");
  await switchLanguage(page, "fr");
  await expect(page.getByRole("heading", { name: "Un répertoire d’espèces qui s’enrichit.", exact: true })).toBeVisible();
  await expect(page.locator(".catalog-card h2")).toContainText(["Néon bleu"]);
  await expect(page.locator(".catalog-search input")).toHaveValue("红绿灯");

  await page.goto("/#/explore?basin=lake-malawi");
  await page.getByRole("button", { name: "Choisir un bassin, une mer ou un lac", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Choisir un milieu d’origine", exact: true });
  await picker.getByRole("button", { name: /^Lac \/ lagune / }).click();
  const search = picker.getByRole("textbox", { name: "Rechercher un milieu", exact: true });
  for (const query of ["Malawi", "马拉维"]) {
    await search.fill(query);
    await search.press("Enter");
    await expect(picker.locator(".basin-result-name strong")).toHaveText(["Lac Malawi"]);
    await expect(picker.locator(".basin-result-count")).toHaveText("4 espèces");
  }
  await picker.getByRole("button", { name: "Fermer le choix du milieu", exact: true }).click();
  await expect(page.locator(".globe-waterbody-context strong")).toHaveText("Lac Malawi");
  await switchLanguage(page, "ja");
  await expect(page.locator(".globe-waterbody-context strong")).toHaveText("マラウイ湖");
});

test("translated standalone details retain source content and photo keyboard navigation", async ({ page }) => {
  await page.goto("/#/atlas?q=Paracheirodon");
  await switchLanguage(page, "de");
  const firstCard = page.locator(".fish-card").filter({ has: page.getByRole("heading", { name: "Neonsalmler", exact: true }) });
  await firstCard.locator(".card-open").click();
  const detail = page.getByRole("dialog", { name: "Steckbrief: Neonsalmler", exact: true });
  await expect(detail).toBeVisible();
  await expect(detail).toContainText("Ein blaugrüner Streifen");
  await expect(detail).toContainText("Paracheirodon innesi");
  await detail.getByRole("button", { name: "Foto von Neonsalmler vergrößern", exact: true }).click();
  await expect(gallery(page)).toBeVisible();
  const initialUrl = page.url();
  await page.keyboard.press("ArrowRight");
  await expect(page).not.toHaveURL(initialUrl);
  await expect(gallery(page).getByRole("button", { name: "Nächster Fisch", exact: true })).toBeEnabled();
  await page.keyboard.press("+");
  await expect(gallery(page).getByRole("button", { name: "Fotozoom zurücksetzen", exact: true })).toHaveText("150%");
  await page.keyboard.press("Escape");
  await expect(gallery(page)).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^Foto von .+ vergrößern$/ })).toBeFocused();
});

test("changing language in the inline photo reader keeps its globe, selected fish and keyboard sequence", async ({ page }) => {
  await page.goto("/#/explore?basin=lake-malawi");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-camera-moving", "false");
  const originalCanvas = (await canvas.elementHandle())!;
  await page.locator(".globe-fish-pin:visible").first().click();
  await page.getByRole("button", { name: /^Enlarge photo of / }).click();
  await expect(page.locator(".photo-viewer-inline")).toBeVisible();
  const originalUrl = page.url();
  const firstId = (await canvas.getAttribute("data-active-fish"))!;
  const counter = (await gallery(page).locator(".photo-species-counter").textContent())!;
  await switchLanguage(page, "fr");
  await expect(page).toHaveURL(originalUrl);
  await expect(canvas).toHaveAttribute("data-active-fish", firstId);
  await expect(gallery(page).locator(".photo-species-counter")).toHaveText(counter);
  await expect(gallery(page).getByRole("button", { name: "Poisson suivant", exact: true })).toBeVisible();
  await languagePicker(page).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(gallery(page)).toBeVisible();
  await expect(canvas).toHaveAttribute("data-active-fish", firstId);
  await expect(gallery(page).locator(".photo-species-counter")).toHaveText(counter);
  await expect(page).toHaveURL(originalUrl);
  await expect(languagePicker(page)).toHaveAccessibleName("Langue");
  await gallery(page).getByRole("button", { name: "Fermer la photo agrandie", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(canvas).not.toHaveAttribute("data-active-fish", firstId);
  const nextId = (await canvas.getAttribute("data-active-fish"))!;
  await expect(canvas).toHaveAttribute("data-camera-target-fish", nextId);
  await expect(page.locator(`.globe-fish-pin[data-fish-id="${nextId}"]`)).toHaveAttribute("data-selected", "true");
  await expect(page).toHaveURL(/basin=lake-malawi/);
  expect(await originalCanvas.evaluate(element => element.isConnected && element === document.querySelector("canvas"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(gallery(page)).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Détails des poissons", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Agrandir la photo de / })).toBeFocused();
});

for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
  test(`phone ${viewport.width} keeps language selection and GitHub controls reachable without overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/#/atlas");
    for (const code of ["de", "ja", "fr", "zh", "en"] as const) {
      await switchLanguage(page, code);
      await inViewport(page, languagePicker(page));
      const star = page.locator(".header .repository-star");
      const issue = page.locator(".header .repository-issue");
      for (const target of [star, issue]) {
        const box = await inViewport(page, target);
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
      await expect(star).toHaveAttribute("href", "https://github.com/korbinjoe/fish-atlas");
      await expect(issue).toHaveAttribute("href", "https://github.com/korbinjoe/fish-atlas/issues/new/choose");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(nav(page).getByRole("button", { name: language(code).planner, exact: true })).toBeVisible();
    }
  });
}

test("planner presets and recommended quantities retain their actual values when language changes", async ({ page }) => {
  await page.goto("/#/planner");
  await expect(page.locator(".tank-current strong")).toHaveText("60 cm standard tank");
  await expect(page.locator(".tank-current")).toContainText("25°C · pH 7 · 6 dGH");
  await page.locator(".planner-advanced summary").click();
  await expect(page.getByRole("spinbutton", { name: "Tank length (cm)", exact: true })).toHaveValue("60");
  await expect(page.getByRole("spinbutton", { name: "Temperature (°C)", exact: true })).toHaveValue("25");
  await expect(page.getByRole("spinbutton", { name: "pH", exact: true })).toHaveValue("7");
  const search = page.getByRole("textbox", { name: "Search fish for your plan", exact: true });
  await search.fill("Neon tetra");
  await search.press("Enter");
  const candidate = page.locator(".candidate").filter({ has: page.getByText("Paracheirodon innesi", { exact: true }) });
  await candidate.getByRole("button", { name: "Add to plan · 8 fish", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Neon tetra quantity", exact: true })).toHaveValue("8");
  await switchLanguage(page, "de");
  await expect(page.locator(".tank-current strong")).toHaveText("60-cm-Standardbecken");
  await expect(page.getByRole("spinbutton", { name: "Beckenlänge (cm)", exact: true })).toHaveValue("60");
  await expect(page.getByRole("spinbutton", { name: "Temperatur (°C)", exact: true })).toHaveValue("25");
  const quantity = page.getByRole("spinbutton", { name: "Anzahl von Neonsalmler", exact: true });
  await expect(quantity).toHaveValue("8");
  await page.getByRole("button", { name: "Anzahl von Neonsalmler erhöhen", exact: true }).click();
  await expect(quantity).toHaveValue("9");
  await expect(page.getByRole("textbox", { name: "Fische für deinen Plan suchen", exact: true })).toHaveValue("Neon tetra");
  await expect(candidate).toHaveCount(1);
  await switchLanguage(page, "ja");
  await expect(page.getByRole("spinbutton", { name: "ネオンテトラの匹数", exact: true })).toHaveValue("9");
  await expect(page.getByRole("spinbutton", { name: "水温（°C）", exact: true })).toHaveValue("25");
});
