import { ExternalLink, SquarePen } from "lucide-react";
import { createFeedbackUrl } from "../lib/feedback";
import type { FeedbackFish } from "../lib/feedback";

export default function FeedbackLink({ fish, children, className = "" }: {
  fish?: FeedbackFish; children?: React.ReactNode; className?: string;
}) {
  return <a
    className={`soft-button feedback-link ${className}`.trim()}
    href={createFeedbackUrl({ fish, pageUrl: window.location.href })}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={fish ? `补充或纠错${fish.name}的资料` : children ? undefined : "补充或纠错鱼类资料"}
  >
    <SquarePen size={15} aria-hidden="true" />
    <span>{children ?? "补充或纠错"}</span>
    <ExternalLink size={12} aria-hidden="true" />
  </a>;
}

export function FeedbackNote() {
  return <p className="feedback-note">发现资料缺失或有误？点击“补充或纠错”，在 GitHub 登录后填写建议，附上参考链接或图片出处。建议经核对后更新图鉴。</p>;
}
