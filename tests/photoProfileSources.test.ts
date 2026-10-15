import { expect, test } from "vitest";
import profiles from "../content/photo-profiles.json";
import { photoProfileSchema } from "../src/lib/photoProfiles";

test("a sourced photo and taxonomy do not require a nonexistent Wikipedia article", () => {
  const { wikipediaUrl: _article, wikidataUrl: _entity, ...photo } = profiles[0];
  const profile = photoProfileSchema.parse({ ...photo, intro: "", distribution: "", behavior: "" });
  expect(profile.wikipediaUrl).toBeUndefined();
  expect(profile.wikidataUrl).toBeUndefined();
  expect(profile.photo.pageUrl).toMatch(/^https:\/\/commons\.wikimedia\.org/);
});

test("source-language tags retain non-English excerpts and reject invalid markup", () => {
  const profile = photoProfileSchema.parse({ ...profiles[0], textLanguage: "pt" });
  expect(profile.textLanguage).toBe("pt");
  expect(photoProfileSchema.safeParse({ ...profiles[0], textLanguage: "pt\" onclick=alert(1)" }).success).toBe(false);
});
