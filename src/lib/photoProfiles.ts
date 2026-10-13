import { z } from "zod";

export const photoProfileSchema = z.object({
  id: z.string().min(1),
  gbifKey: z.number().int().positive(),
  scientific: z.string().min(3),
  name: z.string().min(1),
  family: z.string().min(1),
  water: z.enum(["freshwater", "marine", "brackish"]).nullable(),
  wikipediaUrl: z.url(),
  wikidataUrl: z.url(),
  intro: z.string(),
  distribution: z.string(),
  behavior: z.string(),
  photo: z.object({
    path: z.string(),
    author: z.string().min(1),
    license: z.string().min(1),
    licenseUrl: z.url(),
    pageUrl: z.url(),
    caption: z.string(),
  }),
});

export type PhotoProfile = z.infer<typeof photoProfileSchema>;
