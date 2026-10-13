import { z } from "zod";
import raw from "../../content/enrichment/geography.json";
export const occurrenceSchema = z.object({
  id: z.string(),
  coordinates: z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ]),
  uncertaintyMeters: z.number().min(0).max(10000),
  eventDate: z.string(),
  establishment: z.enum(["native", "introduced", "unknown"]),
  datasetKey: z.string(),
  datasetTitle: z.string(),
  license: z.url(),
  recordedBy: z.string(),
  url: z.url(),
  basis: z.literal("HUMAN_OBSERVATION"),
});
export type Occurrence = z.infer<typeof occurrenceSchema>;
const entry = z.object({
  queriedName: z.string(),
  matchedName: z.string().nullable(),
  acceptedName: z.string().nullable(),
  key: z.number().nullable(),
  matchType: z.string().nullable(),
  confidence: z.number().nullable(),
  status: z.string().nullable(),
  family: z.string().nullable(),
  accessedAt: z.string(),
  review: z.enum(["exact-species-match", "needs-review"]),
  url: z.url(),
  occurrences: z.array(occurrenceSchema),
});
export const geography = z.record(z.string(), entry).parse(raw);
export const establishmentLabels = {
  native: "来源标为原生",
  introduced: "来源标为引入",
  unknown: "原生性未知",
};
export const establishmentColors = {
  native: "#8ad3b1",
  introduced: "#efb575",
  unknown: "#c2a7f3",
};
