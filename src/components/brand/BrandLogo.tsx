import * as React from "react";

import { cn } from "@/lib/utils";
import geometry from "./brand-geometry.json";

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
    const revealId = `brand-reveal-${id}`;
    const titleId = title ? `brand-title-${id}` : undefined;

    return (
      <svg
        ref={ref}
        viewBox={geometry.viewBox}
        className={cn("brand-mark shrink-0 overflow-visible", `brand-mark--${motion}`, className)}
        role={title ? "img" : undefined}
        aria-labelledby={titleId}
        aria-hidden={title ? undefined : true}
        focusable="false"
        {...props}
      >
        {title && <title id={titleId}>{title}</title>}
        <defs>
          <linearGradient id={limeGradientId} {...geometry.gradient} gradientUnits="userSpaceOnUse">
            {geometry.stops.map(([offset, color]) => (
              <stop key={offset} offset={offset} stopColor={String(color)} />
            ))}
          </linearGradient>
          {motion === "entrance" && (
            <mask id={revealId} maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="132">
              <path
                className="brand-mark__check-draw"
                d={geometry.reveal}
                fill="none"
                stroke="white"
                strokeWidth="30"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="100"
              />
            </mask>
          )}
        </defs>

        <path
          className="brand-mark__r"
          d={geometry.r}
          fill="currentColor"
        />
        <path
          className="brand-mark__check"
          d={geometry.check}
          fill={`url(#${limeGradientId})`}
          mask={motion === "entrance" ? `url(#${revealId})` : undefined}
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
