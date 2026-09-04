import * as React from "react";

import { cn } from "@/lib/utils";

export type BrandMotion = "static" | "entrance";

interface BrandMarkProps extends React.SVGProps<SVGSVGElement> {
  motion?: BrandMotion;
  title?: string;
}

interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean;
  motion?: BrandMotion;
}

export const BrandMark = React.forwardRef<SVGSVGElement, BrandMarkProps>(
  ({ className, motion = "static", title, ...props }, ref) => {
    const rawId = React.useId();
    const id = rawId.replace(/:/g, "");
    const limeGradientId = `brand-lime-${id}`;
    const energyGradientId = `brand-energy-${id}`;
    const glowId = `brand-glow-${id}`;
    const titleId = title ? `brand-title-${id}` : undefined;

    return (
      <svg
        ref={ref}
        viewBox="0 0 128 112"
        className={cn("brand-mark shrink-0 overflow-visible", `brand-mark--${motion}`, className)}
        role={title ? "img" : undefined}
        aria-labelledby={titleId}
        aria-hidden={title ? undefined : true}
        focusable="false"
        {...props}
      >
        {title && <title id={titleId}>{title}</title>}
        <defs>
          <linearGradient id={limeGradientId} x1="12" y1="91" x2="77" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#63df16" />
            <stop offset="0.58" stopColor="#a8f900" />
            <stop offset="1" stopColor="#d5ff45" />
          </linearGradient>
          <linearGradient id={energyGradientId} x1="54" y1="94" x2="111" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2f80ff" stopOpacity="0" />
            <stop offset="1" stopColor="#39b8ff" stopOpacity="0.9" />
          </linearGradient>
          <filter id={glowId} x="-45%" y="-45%" width="190%" height="190%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          className="brand-mark__energy"
          d="M67 35H92c17 0 28 10 28 25 0 11-6 19-16 23l18 23h-19L87 85h-9l-9 17H50l16-29h26c8 0 12-5 12-12s-5-11-12-11H59l8-15Z"
          fill={`url(#${energyGradientId})`}
          filter={`url(#${glowId})`}
        />

        <path
          className="brand-mark__r"
          d="M67 35H92c17 0 28 10 28 25 0 11-6 19-16 23l18 23h-19L87 85h-9l-9 17H50l16-29h26c8 0 12-5 12-12s-5-11-12-11H59l8-15Z"
          fill="currentColor"
        />
        <path
          className="brand-mark__r-highlight"
          d="M69 39h23c13 0 22 7 24 18"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />

        <path
          className="brand-mark__check-shadow"
          d="M13 67 35 90 73 24"
          fill="none"
          stroke="hsl(var(--background) / 0.42)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="20"
        />
        <path
          className="brand-mark__check"
          d="M13 67 35 90 73 24"
          fill="none"
          stroke={`url(#${limeGradientId})`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="16"
          pathLength="100"
        />
      </svg>
    );
  },
);

BrandMark.displayName = "BrandMark";

export function BrandLogo({
  collapsed = false,
  motion = "static",
  className,
  ...props
}: BrandLogoProps) {
  return (
    <div
      className={cn("inline-flex min-w-0 items-center text-foreground", collapsed ? "justify-center" : "gap-1.5", className)}
      {...props}
    >
      <BrandMark
        motion={motion}
        className={cn("text-current", collapsed ? "size-9" : "h-11 w-[50px]")}
        title={collapsed ? "vouRevisar" : undefined}
      />
      {!collapsed && (
        <span className="brand-wordmark whitespace-nowrap font-sans text-[21px] font-extrabold leading-none tracking-[-0.03em] text-current">
          <span className="font-medium opacity-65">vou</span>
          <span>Revisar</span>
        </span>
      )}
    </div>
  );
}
