import { useI18n } from "../i18n";
import { chineseNameEntry } from "../lib/chineseNames";

export default function ChineseNameSources({ scientific }: { scientific: string }) {
  const { locale } = useI18n();
  const entry = chineseNameEntry(scientific);
  if (locale !== "zh" || !entry?.sourceUrls.length) return null;
  return <p lang="zh-CN" data-testid="chinese-name-sources">
    中文名称：{entry.name}{entry.formalName && entry.formalName !== entry.name && <> · 资料名称：{entry.formalName}</>}{entry.sourceUrls.map((url, index) => <span key={url}> · <a href={url} target="_blank" rel="noreferrer">中文名称依据{index ? ` ${index + 1}` : ""}</a></span>)}
  </p>;
}
