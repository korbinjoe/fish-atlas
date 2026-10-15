import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { atlasTotal, locationSpeciesCount } from "./distribution-fixture";

// Exercise the production snapshot as a new visitor, even in a Chinese browser.
// Keep the expected round-two species explicit: later catalogue growth must not
// silently remove coverage of the photos introduced by this expansion.
test.use({ storageState: { cookies: [], origins: [] }, locale: "zh-CN" });

type Profile = { id: string; scientific: string; photo: { path: string } };
const profiles = JSON.parse(readFileSync(new URL("../../content/photo-profiles.json", import.meta.url), "utf8")) as Profile[];
const profileById = new Map(profiles.map(fish => [fish.id, fish]));
const addedSpecies = `
Acipenser baerii, Coregonus nasus, Coregonus sardinella, Stenodus nelma,
Coregonus muksun, Brachymystax lenok, Oncorhynchus masou, Salvelinus leucomaenis,
Nipponocypris temminckii, Opsariichthys uncirostris, Pseudogobio esocinus,
Galaxias argenteus, Galaxias fasciatus, Galaxias gollumoides, Prototroctes maraena,
Channa lucius, Rasbora argyrotaenia, Osteochilus vittatus, Barbonymus gonionotus,
Channa punctata, Heteropneustes fossilis, Systomus sarana, Plecoglossus altivelis,
Puntius sophore, Pethia ticto, Wallago attu, Anguilla australis,
Iriatherina werneri, Hypseleotris compressa,
Alcolapia alcalica, Andinoacara blombergi, Anguilla marmorata, Anguilla mossambica,
Gymnogeophagus tiraparae, Hoplias curupira, Labeo molybdinus, Loricariichthys anus,
Mugil cephalus, Nothobranchius furzeri, Opsaridium peringueyi,
Pachypanchax omalonotus, Pachypanchax sakaramyi, Paretroplus kieneri,
Paretroplus maculatus, Peckoltia greedoi, Phalloceros caudimaculatus,
Pseudobarbus asper, Pseudobarbus tenuis, Sandelia capensis, Sternopygus macrurus,
Alosa sapidissima, Catostomus catostomus, Coregonus artedi, Coregonus clupeaformis,
Cottus cognatus, Cyprinella leedsi, Etheostoma fusiforme, Exoglossum maxillingua,
Hybognathus hayi, Hysterocarpus traskii, Labidesthes vanhyningi, Luxilus cornutus,
Lythrurus umbratilis, Moxostoma macrolepidotum, Nocomis micropogon,
Notemigonus crysoleucas, Parachromis managuensis, Percopsis omiscomaycus,
Phenacobius mirabilis, Prosopium cylindraceum, Rhinichthys cataractae,
Richardsonius balteatus, Salvelinus malma, Semotilus atromaculatus,
Semotilus corporalis, Thymallus arcticus,
Luciobarbus sclateri, Luciobarbus comizo, Luciobarbus bocagei,
Pseudochondrostoma duriense, Leuciscus idus, Leuciscus aspius, Vimba vimba,
Lampetra fluviatilis, Lampetra planeri, Ballerus sapa, Ballerus ballerus,
Petromyzon marinus
`.split(",").map(name => name.trim());

const reader = (page: Page) => page.getByRole("region", { name: "Fish detail reader", exact: true });
const fishPin = (page: Page, id: string) => page.locator(`.globe-fish-pin[data-fish-id="${id}"]`);

async function loadedPhoto(image: Locator, source?: string) {
  if (source) await expect(image).toHaveAttribute("src", source);
  await expect.poll(() => image.evaluate(element => {
    const photo = element as HTMLImageElement;
    return photo.complete && Math.min(photo.naturalWidth, photo.naturalHeight) >= 256
      && Math.max(photo.naturalWidth, photo.naturalHeight) >= 500;
  }), { message: `Real photo must load at its original supported dimensions: ${source ?? "selected fish"}` }).toBe(true);
}

async function overview(page: Page, locationId: string) {
  const count = locationSpeciesCount.get(locationId);
  expect(count, `Published native links for ${locationId}`).toBeGreaterThan(0);
  await page.goto(`/#/explore?basin=${locationId}`);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving", "false");
  await expect(page.locator(".globe-fish-pin")).toHaveCount(count!);
  await expect(page.locator(".compact-card")).toHaveCount(count!);
  await expect(page.locator(".globe-fish-pin:visible")).toHaveCount(count!);
}

async function openFish(page: Page, id: string) {
  await page.locator(`.compact-card[data-fish-id="${id}"]`).click();
  await expect(reader(page)).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", id);
  await expect(fishPin(page, id)).toHaveAttribute("data-selected", "true");
  await loadedPhoto(reader(page).locator(".detail-visual img"), profileById.get(id)!.photo.path);
}

async function evidence(page: Page, sourceUrl: string) {
  const sources = reader(page).locator(".distribution-details");
  await sources.locator("summary").click();
  await expect(sources.locator("summary")).toHaveText("Distribution sources and evidence");
  const links = await sources.getByRole("link", { name: "Species evidence", exact: true })
    .evaluateAll(elements => elements.map(element => element.getAttribute("href")));
  expect(links).toContain(sourceUrl);
  return sources;
}

async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test("all 88 added real photos load naturally in the English atlas", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/#/atlas");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await page.evaluate(() => navigator.language)).toBe("zh-CN");
  await expect(page.getByRole("textbox", { name: "Search fish", exact: true })).toBeVisible();
  await expect(page.locator(".fish-card")).toHaveCount(atlasTotal);
  expect(addedSpecies).toHaveLength(88);
  for (const scientific of addedSpecies) {
    const fish = profiles.find(item => item.scientific === scientific);
    expect(fish, scientific).toBeDefined();
    const image = page.locator(".fish-card")
      .filter({ has: page.locator(".scientific", { hasText: new RegExp(`^${scientific}$`) }) })
      .locator(".fish-image img");
    // Scroll like a visitor; do not rewrite lazy loading, intercept requests or
    // inject images, so a missing or invalid public asset fails this test.
    await image.scrollIntoViewIfNeeded();
    await loadedPhoto(image, fish!.photo.path);
  }
  expect(errors).toEqual([]);
});

for (const { location, id } of [
  { location: "4246", id: "wm-cyprinella-leedsi" },
  { location: "4233", id: "wm-etheostoma-fusiforme" },
]) {
  test(`new North American native basin ${location} exposes all fish and their evidence`, async ({ page }) => {
    await overview(page, location);
    for (const image of await page.locator(".globe-fish-pin img").all()) await loadedPhoto(image);
    for (const image of await page.locator(".compact-card img").all()) {
      await image.scrollIntoViewIfNeeded();
      await loadedPhoto(image);
    }
    await openFish(page, id);
    const sources = await evidence(page, `https://www.fishbase.se/summary/${id.includes("cyprinella") ? "2871" : "3424"}`);
    await expect(sources.getByRole("link", { name: "Location source", exact: true }).first()).toBeVisible();
    await expect(sources).toContainText("native");
  });
}

test("Asian original vouchers retain exact sourced positions and explain geographic inference", async ({ page }) => {
  test.setTimeout(90_000);
  for (const sample of [
    { id: "wm-abbottina-rivularis", basin: "2417", point: [123.46, 43.73], accession: "JX137528" },
    { id: "wm-abbottina-rivularis", basin: "2418", point: [119.14, 39.46], accession: "JX137498" },
    { id: "wm-hemiculter-leucisculus", basin: "2406", point: [114.69, 23.52], accession: "MZ403388" },
    { id: "wm-garra-mullya", basin: "2318", point: [79.2064, 14.3858], accession: "PX720683" },
    { id: "wm-garra-mullya", basin: "2313", point: [82.09, 21.19], accession: "OP715797" },
    { id: "wm-garra-mullya", basin: "2301", point: [84.71, 22.7], accession: "OL343016" },
  ]) {
    await overview(page, sample.basin);
    await expect(fishPin(page, sample.id)).toHaveAttribute("data-longitude", String(sample.point[0]));
    await expect(fishPin(page, sample.id)).toHaveAttribute("data-latitude", String(sample.point[1]));
    await openFish(page, sample.id);
    const sourceUrl = `https://www.ebi.ac.uk/ena/browser/view/${sample.accession}`;
    const sources = await evidence(page, sourceUrl);
    await expect(sources).toContainText(sample.accession);
    const anchors = await sources.getByRole("link", { name: "Map location source", exact: true })
      .evaluateAll(elements => elements.map(element => element.getAttribute("href")));
    expect(anchors).toContain(sourceUrl);
    await expect(sources).toContainText(/inference|inferred|intersection|polygon/i);
  }
});

test("Natron fish stay in the documented spring rather than the hypersaline lake centre", async ({ page }, testInfo) => {
  const id = "wm-alcolapia-alcalica";
  const sourceUrl = "https://www.gbif.org/occurrence/1211725463";
  for (const location of ["river-natron-southern-spring", "1910"]) {
    await overview(page, location);
    await expect(fishPin(page, id)).toHaveAttribute("data-longitude", "35.91854");
    await expect(fishPin(page, id)).toHaveAttribute("data-latitude", "-2.59617");
    if (location.startsWith("river-")) await expect(fishPin(page, id)).toHaveAttribute("data-waterbody-kind", "river");
  }
  await openFish(page, id);
  await expect(reader(page).locator(".detail-basin-tags")).toContainText("Lake Natron southern spring creek");
  const sources = await evidence(page, sourceUrl);
  await expect(sources).toContainText("ROMI098829");
  await expect(sources).toContainText("hypersaline main lake");
  await expect(sources.getByRole("link", { name: "Map location source", exact: true })).toHaveAttribute("href", sourceUrl);
  await sources.locator("summary").click();
  await reader(page).getByRole("button", { name: /^Enlarge photo of / }).click();
  await loadedPhoto(page.locator(".photo-viewer img"), profileById.get(id)!.photo.path);
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving", "false");
  await page.mouse.move(10, 10);
  if (testInfo.project.name === "chrome") await page.screenshot({ path: "docs/blank-basin-round2-natron-desktop.png", fullPage: true });
});

test("English enlarged-photo keyboard and mouse navigation keep the new basin and globe selection", async ({ page }) => {
  const id = "wm-etheostoma-fusiforme";
  await overview(page, "4233");
  const ids = await page.locator(".globe-fish-pin").evaluateAll(elements => elements.map(element => element.getAttribute("data-fish-id")));
  expect(ids.length).toBeGreaterThan(1);
  await openFish(page, id);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("canvas")).not.toHaveAttribute("data-active-fish", id);
  const next = (await page.locator("canvas").getAttribute("data-active-fish"))!;
  expect(ids).toContain(next);
  await expect(fishPin(page, next)).toHaveAttribute("data-selected", "true");
  await loadedPhoto(reader(page).locator(".detail-visual img"), profileById.get(next)!.photo.path);
  await reader(page).getByRole("button", { name: /^Enlarge photo of / }).click();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", id);
  await loadedPhoto(page.locator(".photo-viewer img"), profileById.get(id)!.photo.path);
  await page.locator(".photo-viewer").getByRole("button", { name: "Next fish", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-active-fish", next);
  await loadedPhoto(page.locator(".photo-viewer img"), profileById.get(next)!.photo.path);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving", "false");
  await expect(page).toHaveURL(/basin=4233/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".photo-viewer")).toHaveCount(0);
  await expect(reader(page)).toBeVisible();
  await expect(fishPin(page, next)).toHaveAttribute("aria-pressed", "true");
});

test("Lagarfljot stays an independent lake with the published point and fits a phone", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const id = "wm-salmo-trutta";
  const sourceUrl = "https://www.hafogvatn.is/static/research/files/hv2025_37_lagarfljot-fiskrannsoknir.pdf";
  for (const location of ["6104", "lake-lagarfljot"]) {
    await overview(page, location);
    await expect(fishPin(page, id)).toHaveAttribute("data-longitude", "-14.44025");
    await expect(fishPin(page, id)).toHaveAttribute("data-latitude", "65.252581");
    await noHorizontalOverflow(page);
  }
  await expect(fishPin(page, id)).toHaveAttribute("data-waterbody-kind", "lake");
  await openFish(page, id);
  const sources = await evidence(page, sourceUrl);
  await expect(sources).toContainText("LAGF02");
  // Brown trout also has other sourced, localized native-water anchors. Check
  // the lake's exact paper among these valid links rather than assuming one.
  const anchors = await sources.getByRole("link", { name: "Map location source", exact: true })
    .evaluateAll(elements => elements.map(element => element.getAttribute("href")));
  expect(anchors).toContain(sourceUrl);
  await noHorizontalOverflow(page);
  await sources.locator("summary").click();
  await reader(page).getByRole("button", { name: /^Enlarge photo of / }).click();
  await loadedPhoto(page.locator(".photo-viewer img"), profileById.get(id)!.photo.path);
  await noHorizontalOverflow(page);
  await page.locator(".photo-viewer").scrollIntoViewIfNeeded();
  if (testInfo.project.name === "chrome") await page.screenshot({ path: "docs/blank-basin-round2-lagarfljot-mobile.png", fullPage: true });
  await page.keyboard.press("Escape");
  await expect(reader(page)).toBeVisible();
  await reader(page).getByRole("button", { name: "Close fish details", exact: true }).click();
  await expect(reader(page)).toHaveCount(0);
  await noHorizontalOverflow(page);
});
