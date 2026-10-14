import { ExternalLink, SquarePen } from "lucide-react";
import { createFeedbackUrl } from "../lib/feedback";
import type { FeedbackFish } from "../lib/feedback";
import { useI18n } from "../i18n";

export default function FeedbackLink({ fish, children, className = "" }: {
  fish?: FeedbackFish; children?: React.ReactNode; className?: string;
}) {
  const { t, fishName, locale } = useI18n();
  return <a
    className={`soft-button feedback-link ${className}`.trim()}
    href={createFeedbackUrl({ fish: fish ? { ...fish, name: fishName(fish) } : undefined, pageUrl: window.location.href, locale })}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={fish ? t("补充或纠错{name}的资料", { name: fishName(fish) }) : children ? undefined : t("补充或纠错鱼类资料")}
  >
    <SquarePen size={15} aria-hidden="true" />
    <span>{typeof children === "string" ? t(children) : children ?? t("补充或纠错")}</span>
    <ExternalLink size={12} aria-hidden="true" />
  </a>;
}

export function FeedbackNote() {
  const { t } = useI18n();
  return <p className="feedback-note">{t("发现资料缺失或有误？点击“补充或纠错”，在 GitHub 登录后填写建议，附上参考链接或图片出处。建议经核对后更新图鉴。")}</p>;
}
