import { useEffect, useId, useRef, useState } from "react";
import type { Fish } from "../lib/model";
import { useI18n } from "../i18n";

/** Original schematic artwork; never presented as an identification photograph. */
export function FishArt({
  fish,
  className = "",
}: {
  fish: Pick<Fish, "color" | "shape" | "name">;
  className?: string;
}) {
  const { t, fishName } = useI18n();
  const id = useId().replace(/:/g, "");
  const round = fish.shape === "round",
    angel = fish.shape === "angel",
    betta = fish.shape === "betta",
    loach = fish.shape === "loach";
  return (
    <svg
      className={`fish-art ${className}`}
      viewBox="0 0 320 160"
      role="img"
      aria-label={t("{name}形态示意插画", { name: fishName(fish) })}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.8" y2="1">
          <stop stopColor="#d7eef0" />
          <stop offset=".4" stopColor={fish.color} />
          <stop offset="1" stopColor="#163d46" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`} stroke={fish.color} strokeWidth=".7">
        <path
          opacity=".65"
          d={
            betta
              ? "M212 77 Q299 -12 302 29 Q268 79 308 132 Q261 178 208 91Z"
              : "M213 75 Q250 43 264 47 L249 81 266 116 Q232 116 211 88Z"
          }
        />
        <path
          opacity=".75"
          d={
            angel
              ? "M125 67 L184 4 173 71Z"
              : betta
                ? "M123 68 Q170 9 230 38 L217 72Z"
                : "M130 65 Q155 27 189 39 L199 69Z"
          }
        />
        <path
          opacity=".6"
          d={
            angel
              ? "M129 94 L175 155 181 92Z"
              : betta
                ? "M121 92 Q174 166 228 120 L213 90Z"
                : "M132 92 Q167 138 188 104 L202 91Z"
          }
        />
        <path
          d={
            angel
              ? "M71 81 Q147 12 196 57 Q224 79 206 95 Q152 135 71 81Z"
              : round
                ? "M64 80 Q122 16 181 36 Q240 80 181 124 Q119 142 64 80Z"
                : loach
                  ? "M46 86 Q106 61 211 77 Q230 85 210 92 Q101 106 46 86Z"
                  : "M52 80 Q111 42 165 58 Q199 63 225 81 Q183 104 120 101 Q83 99 52 80Z"
          }
        />
      </g>
      <path
        d="M80 80 Q151 65 205 81"
        stroke={fish.color}
        strokeWidth="4"
        fill="none"
        opacity=".8"
      />
      <path
        d="M98 68 Q112 81 97 96"
        stroke="#102f38"
        fill="none"
        opacity=".5"
      />
      <circle cx="79" cy="76" r="5" fill="#071820" />
      <circle cx="78" cy="74" r="1.7" fill="#e5f6e8" />
    </svg>
  );
}

export function FishImage({
  fish,
  large = false,
}: {
  fish: Fish;
  large?: boolean;
}) {
  const { t, fishName } = useI18n();
  const [broken, setBroken] = useState(false);
  const [visible, setVisible] = useState(large);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (visible) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, [visible]);
  return (
    <div
      ref={container}
      className={`fish-image ${large ? "large" : ""}`}
      style={{ "--fish-color": fish.color } as React.CSSProperties}
    >
      {fish.photo && !broken && visible ? (
        <img
          src={fish.photo.path}
          alt={t("{name}，{scientific}", { name: fishName(fish), scientific: fish.scientific })}
          loading={large ? "eager" : "lazy"}
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : !fish.photo || broken ? (
        <FishArt fish={fish} />
      ) : (
        <span
          className="photo-placeholder"
          aria-label={t("{name}照片待加载", { name: fishName(fish) })}
        />
      )}
      {(!fish.photo || broken) && (
        <span className="illustration-label">{t("形态示意 · 非鉴定照片")}</span>
      )}
    </div>
  );
}
