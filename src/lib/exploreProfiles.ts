import type { PhotoProfile } from "./photoProfiles";
import type { Fish, RegionId } from "./model";

export type ExploreSpecies = {
  id: string;
  name: string;
  scientific: string;
  region: RegionId | null;
  photo: NonNullable<Fish["photo"]>;
  item: Fish | PhotoProfile;
};

// Broad exploration areas only. Each assignment was checked against the
// profile's linked species text; the marker is an area entrance, not a point
// occurrence or a complete native-range polygon.
const regionalIds: Record<RegionId, string[]> = {
  amazon: [
    "apistogramma-agassizii", "corydoras-splendens",
    "mikrogeophagus-altispinosus",
  ],
  asia: [
    "acantopsis-dialuzona", "acantopsis-octoactinotos",
    "betta-anabatoides", "crossocheilus-oblongus",
    "danio-erythromicron", "danio-margaritatus",
    "danionella-dracula", "microdevario-kubotai",
    "osphronemus-exodon", "osphronemus-laticlavius",
    "pethia-padamya", "rasbora-trilineata",
    "trichopodus-trichopterus",
  ],
  africa: [],
  reef: [
    "abudefduf-bengalensis", "acanthurus-albipectoralis",
    "acanthurus-auranticavus", "acanthurus-leucosternon",
    "amblyglyphidodon-aureus", "amblyglyphidodon-curacao",
    "anampses-caeruleopunctatus", "canthigaster-axiologus",
    "canthigaster-bennetti", "centropyge-bispinosa",
    "chaetodon-andamanensis", "chaetodon-argentatus",
    "cheilinus-chlorourus", "cheilinus-fasciatus",
    "chelmon-rostratus", "chromis-viridis",
    "chrysiptera-cyanea", "ctenochaetus-binotatus",
    "ecsenius-bicolor", "ecsenius-midas", "ecsenius-stigmatura",
    "halichoeres-chrysus", "naso-annulatus",
    "nemateleotris-decora", "nemateleotris-magnifica",
    "pseudocheilinus-hexataenia", "valenciennea-puellaris",
    "zebrasoma-xanthurum",
  ],
};

export const photoProfileRegions = new Map<string, RegionId>(
  Object.entries(regionalIds).flatMap(([region, ids]) =>
    ids.map((id) => [`wm-${id}`, region as RegionId] as const),
  ),
);

export function exploreProfileRegion(profile: PhotoProfile): RegionId | null {
  return photoProfileRegions.get(profile.id) ?? null;
}
