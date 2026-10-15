import { expect, test } from "vitest";
import { fishName } from "../src/i18n";
import { chineseFishName, chineseNameEntry, normalizeChineseName } from "../src/lib/chineseNames";
import policy from "../content/chinese-name-policy.json";
import curated from "../content/species.json";
import photos from "../content/photo-profiles.json";

test("Chinese titles use ordinary simplified spelling without manufacturing new rare fish characters", () => {
  expect(normalizeChineseName("黃鰭刺鰕虎魚")).toBe("黄鳍刺鰕虎鱼");
  expect(normalizeChineseName("斑點叉尾𫚔")).toBe("斑点叉尾鮰");
  expect(normalizeChineseName("大鳍鱊、鮈、鮠、鰶")).toBe("大鳍鱊、鮈、鮠、鰶");
  expect(normalizeChineseName("角閃光美洲鱥")).toBe("角闪光美洲鱥");
  expect(normalizeChineseName("Gobio gobio")).toBe("Gobio gobio");
});

test("reviewed names follow the scientific species rather than an incorrect imported Chinese label", () => {
  expect(fishName({ name: "马斯科吸口鱼", scientific: "  Moxostoma   macrolepidotum " }, "zh")).toBe("大鳞吸口鱼");
  expect(chineseFishName({ name: "银石首鱼", scientific: "Barbonymus gonionotus" })).toBe("银高体鲃");
  expect(chineseFishName({ name: "八棘多刺鱼", scientific: "Pungitius pungitius" })).toBe("九棘多刺鱼");
  expect(chineseFishName({ name: "未知中文名", scientific: "Unreviewed example" })).toBe("未知中文名");
});

test("supplementary Han aliases cannot leak into the English common-name fallback", () => {
  const fish = { name: "𫚔", scientific: "Unreviewed example", aliases: ["𫚔", "𬶋"] };
  expect(fishName(fish, "en")).toBe("Unreviewed example");
  expect(fishName({ ...fish, aliases: ["𫚔", "Recorded English name"] }, "en")).toBe("Recorded English name");
  expect(fishName({ name: "斑点叉尾鮰", scientific: "Ictalurus punctatus" }, "en")).toBe("Channel catfish");
});

test("every shipped Chinese title avoids broken encoding and poorly supported supplementary Han glyphs", () => {
  for (const fish of [...curated, ...photos]) {
    expect(fish.name, fish.scientific).toBe(chineseFishName(fish));
    expect(fish.name, fish.scientific).not.toContain("\uFFFD");
    expect(Array.from(fish.name).filter(c => /\p{Script=Han}/u.test(c) && c.codePointAt(0)! > 0xffff), fish.scientific).toEqual([]);
  }
  for (const scientific of Object.keys(policy.preferredNames)) {
    const entry = chineseNameEntry(scientific)!;
    expect(entry.sourceUrls.length, scientific).toBeGreaterThan(0);
    expect(entry.sourceUrls.every(url => url.startsWith("https://")), scientific).toBe(true);
    expect(entry.reason, scientific).not.toBe("");
  }
});
