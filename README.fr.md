[English](README.md) · [简体中文](README.zh-CN.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [日本語](README.ja.md)

# Fish Atlas

**[Ouvrir le site en ligne](https://fish-atlas-korbinjoe.korbinzhao.chatgpt.site)** · Hébergé publiquement sur ChatGPT Sites.

Un globe interactif, un atlas photographique des poissons, un catalogue taxonomique et un outil de préparation d'aquarium, avec des sources consultables pour chaque fiche.

L'interface s'ouvre en **anglais par défaut**. Le menu de langue propose **English, 中文, Français, Deutsch et 日本語** et mémorise votre choix dans le navigateur.

![Fish Atlas : globe interactif et interface anglaise](docs/i18n-default-english.png)

## Ce que vous pouvez explorer

- **Globe interactif** : rotation, zoom, sélection d'un bassin et affichage des principaux cours d'eau et lacs.
- **Atlas photographique** : recherche par nom courant, alias ou nom scientifique ; filtres géographiques et par type d'eau ; favoris et comparaison de trois espèces au maximum parmi celles disposant de références de maintenance.
- **Navigation liée au globe** : ouvrir une photo affiche sa fiche à côté du globe et met en évidence le milieu d'origine documenté. Les flèches du clavier permettent de parcourir les résultats filtrés.
- **Visionneuse photo** : agrandissement, déplacement et navigation entre les espèces sans perdre le contexte du globe.
- **Catalogue taxonomique** : noms acceptés du GBIF, familles, genres, filtres et pagination, y compris pour les espèces sans photo.
- **Préparation d'aquarium** : dimensions, volume estimé, paramètres d'eau, effectifs et explication des conflits ou risques connus ; enregistrement local et lien de partage restaurable.
- **Sources et contributions** : références, attribution des images et accès aux formulaires GitHub pour corriger une fiche ou proposer des données.

## Contenu actuel

| Couche | Couverture |
| --- | --- |
| Fiches avec photo | **467 espèces** |
| Fiches avec références de maintenance, utilisables dans le planificateur | **33 espèces** |
| Fiches avec photo mais sans données de maintenance suffisantes | **434 espèces**, exclues du planificateur |
| Catalogue taxonomique | **3 865 entrées**, dont **3 398 sans photo** |
| Géographie | **520 grands bassins fluviaux ou lacustres** du GRDC et 4 régions sélectionnées |
| Milieux associés aux fiches photographiques | **512** : 376 bassins GRDC, 47 zones marines, 39 lacs/lagunes et 50 réseaux fluviaux supplémentaires |
| Associations documentées à des milieux d’origine | **2 615** |

Les 467 espèces photographiées sont associées à des milieux d'origine nommés et documentés. Le catalogue est une couche d'exploration taxonomique : il ne constitue pas une liste de poissons adaptés à l'aquarium. Une espèce sans photo reste consultable dans le catalogue, mais n'apparaît pas dans l'atlas photographique.

La [deuxième extension des bassins non couverts](docs/blank-basin-expansion-2.md) ajoute 88 espèces photographiées et renseigne 166 bassins auparavant vides, grâce aux répartitions indigènes documentées d’espèces nouvelles et déjà présentes. Au total, 376 des 520 grands bassins ont une association indigène vérifiée ; 144 restent sans fiche photographique associée. La [première extension](docs/blank-basin-expansion.md) reste documentée comme un état antérieur des données.

## Démarrage rapide

Prérequis : **Node.js 22.12 ou ultérieur**, dans une version compatible, et npm.

```bash
git clone https://github.com/korbinjoe/fish-atlas.git
cd fish-atlas
npm ci
npm run dev -- --port 4173
```

Ouvrez [http://127.0.0.1:4173](http://127.0.0.1:4173). Les données, photos et fonds géographiques sont déjà présents dans le dépôt ; l'installation et la compilation ne relancent pas la collecte des sources.

Pour prévisualiser la version de production :

```bash
npm run build
npm run preview -- --port 4174
```

- [Explorer le globe](http://127.0.0.1:4174/#/explore)
- [Atlas photographique](http://127.0.0.1:4174/#/atlas)
- [Catalogue des espèces](http://127.0.0.1:4174/#/catalog)
- [Préparation d'aquarium](http://127.0.0.1:4174/#/planner)

La compilation produit `dist/`. Le routage par fragment d'URL et les chemins de ressources relatifs permettent un hébergement statique, y compris dans un sous-répertoire, sans réécriture des routes.

## Langues

Le changement de langue met à jour la navigation, les filtres, les fiches, les noms géographiques, la comparaison et le planificateur. Le choix est conservé dans `fish-atlas:locale` ; si le stockage n'est pas disponible, le changement fonctionne pour la visite en cours.

Les principales descriptions et notes de maintenance des 33 fiches documentées sont traduites dans les cinq langues. La recherche reconnaît les noms chinois, anglais, les traductions disponibles, les alias et les noms scientifiques, quelle que soit la langue affichée.

Les noms scientifiques, valeurs, auteurs, licences et citations originales restent fidèles aux sources. Les extraits des 434 fiches supplémentaires ne sont pas tous traduits. Les formulaires de contribution sont en chinois pour l'interface chinoise et en anglais pour les autres langues. Voir [l'implémentation multilingue](docs/i18n.md).

## Interpréter les données

Les photos placées sur le globe indiquent un **milieu d'origine documenté**, pas un lieu exact de collecte ni l'aire de répartition complète de l'espèce. Les limites des bassins du GRDC servent de contexte géographique ; elles ne sont pas des limites de répartition biologique.

Les observations historiques du GBIF sont présentées séparément des données de répartition naturelle. Le projet conserve 26 observations sélectionnées avec leur provenance et leur licence ; leur statut indigène est inconnu. Le globe ne propose pas de suivi en temps réel.

Le planificateur effectue une vérification préliminaire à partir des références et règles disponibles. Il ne garantit ni la compatibilité d'une population ni une charge totale sûre. Une donnée absente reste inconnue ; les recommandations de quantité ne signifient pas que votre aquarium peut accueillir ces poissons.

Les températures de milieu naturel ne deviennent pas automatiquement des consignes de maintenance. La dureté dGH en eau douce, l'alcalinité dKH et la densité de l'eau de mer restent distinctes. Une vérification par un spécialiste et des essais sur de vrais téléphones restent à réaliser ; voir [la liste de contrôle](docs/release-checklist.md).

## Développement et vérification

Le projet utilise React 19, TypeScript, Vite, Three.js, React Three Fiber, Drei et Zod. Les versions résolues sont enregistrées dans `package-lock.json`.

```bash
npm run validate
npm test
npm run build
npx playwright install webkit
npm run test:e2e
npm run benchmark
```

Les tests navigateur utilisent Chrome installé localement et Playwright WebKit, avec une prévisualisation de production sur le port 4174. Les mesures de performance sur ordinateur et les simulations tactiles ne remplacent pas les essais sur un téléphone réel. `npm run catalog:refresh` actualise volontairement le snapshot GBIF via le réseau ; cette commande n'est pas nécessaire à la compilation courante.

## Contribuer et consulter la documentation

Consultez le [guide de contribution](CONTRIBUTING.md) avant de proposer une correction, une nouvelle espèce ou une photo. Chaque proposition doit permettre de vérifier l'identification, les références et les droits de réutilisation. Vous pouvez aussi [ouvrir une issue](https://github.com/korbinjoe/fish-atlas/issues/new/choose).

- [Implémentation et vérification](docs/implementation.md) · [Architecture technique](docs/technical-proposal.md)
- [Deuxième extension des bassins](docs/blank-basin-expansion-2.md) · [Première extension (historique)](docs/blank-basin-expansion.md)
- [Couverture des bassins](docs/global-basin-coverage.md) · [Sources de répartition naturelle](docs/native-distribution-expansion.md)
- [Extension régionale de l'atlas](docs/regional-fish-expansion.md) · [Couverture des poissons d'aquarium courants](docs/common-aquarium-fish-coverage.md)
- [Navigation liée au globe](docs/globe-linked-reader.md) · [Visionneuse photo](docs/fish-photo-gallery.md)

## Sources et licences

Les photos de Wikimedia Commons possèdent chacune leur propre licence et attribution, y compris des obligations de partage à l'identique pour certaines images. Natural Earth fournit des données géographiques du domaine public. Les bassins GRDC/HydroSHEDS doivent être attribués selon les exigences de leurs sources. Le catalogue GBIF Backbone est sous CC BY 4.0 ; les observations sélectionnées utilisent les licences CC BY ou CC0 prises en charge par la collecte.

Les données de répartition **FishBase 26.06 sont sous CC BY-NC 3.0**, avec attribution et restriction d'usage commercial. Cette licence est indépendante de celles du code des outils et des photographies. Consultez [les sources et attributions](public/ATTRIBUTION.md) et [l'index des photos supplémentaires](public/PHOTO_PROFILES_ATTRIBUTION.md) avant toute réutilisation. Les illustrations de remplacement ne servent pas à identifier une espèce.
