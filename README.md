# Fish Atlas

**English** · [简体中文](README.zh-CN.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [日本語](README.ja.md)

Explore where fish come from on an interactive 3D globe, browse real fish photographs and source-linked habitats, and check an aquarium plan against available care references.

Fish Atlas opens in **English by default**. Switch to **中文, Français, Deutsch, or 日本語** from the language menu in the header; your choice is remembered across visits.

[Report an issue](https://github.com/korbinjoe/fish-atlas/issues/new/choose) · [Suggest a fish or correct its data](https://github.com/korbinjoe/fish-atlas/issues/new?template=fish-data-en.yml)

![Fish Atlas with its English interface, interactive globe, and fish photographs](docs/i18n-default-english.png)

## What you can do

- **Explore the globe.** Rotate, zoom, and focus on rivers, lakes, seas, or one of 520 major GRDC basins. Vector coastlines and the Natural Earth river network remain detailed as you zoom.
- **Follow a fish to its habitat.** Open a photograph to read its profile alongside the globe. Browse the current results with arrow keys or thumbnails; the globe highlights the selected fish's source-linked native waterbody.
- **Browse and search.** Search Chinese, English, available translated names, aliases, and scientific names. Filter by waterbody, region, size, or water type, save favorites locally, and enlarge photographs with zoom and pan.
- **Explore taxonomy.** Search the GBIF Backbone catalog by name, genus, or family. Photo profiles and records without photographs are clearly separated.
- **Plan an aquarium.** Start with a tropical freshwater, soft-water, East African cichlid, or marine example. Adjust dimensions, water parameters, and quantities for up to six species with care references. Review parameter conflicts and documented schooling, territorial, fin-nipping, and predation concerns; save locally or share a restorable plan link. Compare up to three species with care references.
- **Help improve the data.** Each photo profile offers a prefilled GitHub feedback form with the fish's name, scientific name, and permanent link. Suggestions are reviewed before the data changes.

## Content snapshot

The current local dataset, updated on **2026-10-14**, contains:

| Content | Coverage |
| --- | --- |
| Photo atlas | **287 species**, all linked to a named native waterbody |
| Profiles with care references | **33 species**, available for comparison and aquarium planning |
| Additional photo profiles | **254 species**, with incomplete care data; excluded from planning |
| Taxonomy catalog | **3,697 records**, including **3,410 without photographs** |
| Geographic background | **520 major basins** plus independent seas, lakes, and river systems |
| Waterbodies linked to photo profiles | **203**: 94 GRDC basins, 47 seas, 25 lakes/lagoons, and 37 additional river systems |
| Selected historical observations | **26 GBIF records**, with dates, precision, datasets, and licenses |

The representative checklist of 111 common aquarium fish currently has 101 photo profiles and 10 catalog-only records. It is a selected checklist, not a complete inventory of aquarium species. See the [coverage table](docs/common-aquarium-fish-coverage.md) and [regional expansion notes](docs/regional-fish-expansion.md).

## Run locally

Use **Node.js 22.12 or later**. Dependencies are pinned in `package-lock.json`.

```bash
git clone https://github.com/korbinjoe/fish-atlas.git
cd fish-atlas
npm ci
npm run dev -- --port 4173
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). Fish data, photographs, geographic assets, and observation snapshots are included locally; installation and builds do not require collecting them again.

For a production build and local preview:

```bash
npm run build
npm run preview -- --port 4174
```

Open [Explore](http://127.0.0.1:4174/#/explore), [Atlas](http://127.0.0.1:4174/#/atlas), [Catalog](http://127.0.0.1:4174/#/catalog), or [Planner](http://127.0.0.1:4174/#/planner). Restart the preview process if it has stopped.

The build output is `dist/`. Relative asset paths and hash-based routing support static hosting in a subdirectory without SPA route rewrites. A public website has not yet been configured.

## Languages

| Interface language | Menu label | HTML language tag |
| --- | --- | --- |
| English (default) | English | `en` |
| Simplified Chinese | 中文 | `zh-CN` |
| French | Français | `fr` |
| German | Deutsch | `de` |
| Japanese | 日本語 | `ja` |

The first visit uses English regardless of the browser's language. The header menu updates navigation, filters, geographic labels, profiles, comparisons, aquarium planning, page metadata, and accessibility labels. Preferences use the separate `fish-atlas:locale` storage key; switching languages preserves favorites, plans, and filters. Invalid or unavailable storage falls back to English, and switching remains available for the current visit.

The 33 profiles with care references have translated descriptions and reference notes. Additional photo profiles retain original source excerpts and distribution quotations in their source language. Scientific names, values, author credits, licenses, and citations remain unchanged; uncertain translated common names fall back to scientific names. Chinese feedback uses the Chinese Issue form; the other interfaces use the English form, which accepts suggestions in any supported language.

See [internationalization implementation and verification](docs/i18n.md). The links at the top of this README switch the documentation language independently of the app.

## Data and planning limits

Source checking does not constitute expert approval. The planner performs preliminary checks against existing references and rules; it does not certify safe stocking, total carrying capacity, or compatibility. Missing fields remain unknown. Only 23 species currently have structured behavior profiles, and the rules do not cover every interaction.

The taxonomy catalog supports discovery; it does not establish aquarium suitability or confirm species identification. Photo coverage and waterbody links do not imply complete natural-range coverage. Globe markers are **geographic display positions**, not collection coordinates, and basin boundaries are not species-range boundaries. Selected observations are historical snapshots; all 26 currently have unknown native status.

Unverified distribution, behavior, and care fields are not guessed. Freshwater dGH and marine dKH are kept distinct, and source ranges are not automatically long-term target values. Real-device validation and expert review remain external checks; see the [release checklist](docs/release-checklist.md).

## Maintain and verify

```bash
npm run validate
npm test
npx playwright install webkit
npm run test:e2e
npm run benchmark
```

Browser tests use local Chrome and Playwright WebKit with a production preview on port 4174. The benchmark runs locally in Chrome; simulated mobile results do not establish real-phone performance.

Refresh the GBIF taxonomy snapshot only when an online data update is intended:

```bash
npm run catalog:refresh
```

| Files | Purpose |
| --- | --- |
| `content/species.json`, `content/marine.json` | Care profiles and marine references |
| `content/photo-profiles.json` | Additional photo profiles and individual image credits |
| `content/common-priority.json` | Representative aquarium checklist and verified name aliases |
| `content/catalog.json`, `content/catalog-manifest.json` | Taxonomy snapshot, sources, licenses, and counts |
| `content/distributions.json`, `content/waterbodies.json` | Native-waterbody relationships, evidence, and independent waterbodies |
| `content/major-basins.json` | 520 simplified GRDC basin boundaries |
| `content/enrichment/` | Conditional care references, behavior rules, observations, and geographic assets |
| `src/i18n/` | Interface messages, translated profiles, and localized names |
| `public/ATTRIBUTION.md`, `public/PHOTO_PROFILES_ATTRIBUTION.md` | Source and photograph attribution |

`scripts/build-content.py` rebuilds content from local research caches; its `notes` maintain the original Chinese summaries. `scripts/prepare-v2-content.py` maintains supplemental care conditions, behavior rules, and marine records. Update their editable sources when changing generated data.

Optional collection scripts are outside the normal build. Research caches under `content/research/` are not included in the published build. Do not republish full source articles; stop and wait when collection services rate-limit requests.

## Contribute

Use [GitHub Issues](https://github.com/korbinjoe/fish-atlas/issues/new/choose) for bugs and feature requests, or the [fish data form](https://github.com/korbinjoe/fish-atlas/issues/new?template=fish-data-en.yml) to add information, correct errors, or suggest a species. Include evidence links and, for photographs, the original page, author, and license. You review and submit the form yourself after signing in to GitHub; a submission does not automatically alter the atlas.

See the [contribution guide](CONTRIBUTING.md) for details. Much of the research and implementation documentation is currently in Chinese.

## Technology and licensing

Built with React 19, TypeScript, Vite, Three.js, React Three Fiber 9, Drei, Zod, and shadcn/ui components. Exact resolved versions are recorded in `package-lock.json`.

Photographs from Wikimedia Commons have individual licenses. Natural Earth geographic data is public domain; GRDC/HydroSHEDS basin data retains the required attribution. Imported GBIF observations use the supported CC BY/CC0 licenses. **FishBase 26.06 distribution data uses CC BY-NC 3.0**, including attribution and noncommercial-use requirements. Consult the [source and license index](public/ATTRIBUTION.md) and [photo attribution index](public/PHOTO_PROFILES_ATTRIBUTION.md) before reusing data or media. Original fallback illustrations are not identification aids.

[Technical proposal](docs/technical-proposal.md) · [Implementation notes](docs/implementation.md) · [Release checklist](docs/release-checklist.md)
