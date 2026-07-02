import type * as React from "react";
import { cn } from "../../lib/utils";

type BackgroundEffectIntensity = "bold" | "subtle" | "minimal";

type BackgroundPatternType = "dots" | "lines" | "crosshatch" | "gradient";

interface BackgroundPatternProps extends React.ComponentProps<"div"> {
  /** Pattern type */
  pattern?: BackgroundPatternType;
  /** Visual intensity (affects opacity) */
  intensity?: BackgroundEffectIntensity;
  /** Custom cell size in pixels (default: 32) */
  size?: number;
  /** Whether pattern should be animated */
  animated?: boolean;
}

/** Decorative tiled background pattern (dots, lines, crosshatch, or gradient). */
function BackgroundPattern({
  className,
  pattern = "dots",
  intensity = "subtle",
  size = 32,
  animated = false,
  style,
  ...props
}: BackgroundPatternProps) {
  const opacityMap: Record<BackgroundEffectIntensity, number> = {
    bold: 0.12,
    subtle: 0.06,
    minimal: 0.03,
  };

  const opacity = opacityMap[intensity];

  const getPatternStyle = (): React.CSSProperties => {
    switch (pattern) {
      case "dots":
        return {
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: `${size}px ${size}px`,
        };
      case "lines":
        return {
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: `${size}px ${size}px`,
        };
      case "crosshatch":
        return {
          backgroundImage: `
            linear-gradient(45deg, currentColor 1px, transparent 1px),
            linear-gradient(-45deg, currentColor 1px, transparent 1px)
          `,
          backgroundSize: `${size}px ${size}px`,
        };
      case "gradient":
        return {
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, color-mix(in oklch, var(--primary) 15%, transparent), transparent),
            radial-gradient(ellipse 60% 40% at 100% 0%, color-mix(in oklch, var(--primary) 10%, transparent), transparent),
            radial-gradient(ellipse 50% 30% at 0% 100%, color-mix(in oklch, var(--primary) 8%, transparent), transparent)
          `,
        };
      default:
        return {};
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 text-foreground",
        animated && "animate-pulse",
        className,
      )}
      data-intensity={intensity}
      data-pattern={pattern}
      data-slot="background-pattern"
      style={{
        opacity,
        ...getPatternStyle(),
        ...style,
      }}
      {...props}
    />
  );
}

interface BackgroundGlowProps extends React.ComponentProps<"div"> {
  /** Position of the glow */
  position?: "top" | "center" | "bottom" | "top-left" | "top-right";
  /** Color variant */
  color?: "primary" | "accent" | "muted";
  /** Intensity of the glow */
  intensity?: BackgroundEffectIntensity;
}

/** Decorative blurred radial glow positioned around a section. */
function BackgroundGlow({
  className,
  position = "top",
  color = "primary",
  intensity = "subtle",
  ...props
}: BackgroundGlowProps) {
  const positionClasses: Record<string, string> = {
    top: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
    center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    bottom: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
    "top-left": "top-0 left-0 -translate-x-1/4 -translate-y-1/4",
    "top-right": "top-0 right-0 translate-x-1/4 -translate-y-1/4",
  };

  const colorClasses: Record<string, string> = {
    primary: "from-primary/20 via-primary/5",
    accent: "from-accent/20 via-accent/5",
    muted: "from-muted-foreground/10 via-muted-foreground/3",
  };

  const sizeMap: Record<BackgroundEffectIntensity, string> = {
    bold: "w-[800px] h-[400px]",
    subtle: "w-[600px] h-[300px]",
    minimal: "w-[400px] h-[200px]",
  };

  return (
    <div
      className={cn(
        "pointer-events-none absolute rounded-full bg-gradient-radial to-transparent blur-3xl",
        positionClasses[position],
        colorClasses[color],
        sizeMap[intensity],
        className,
      )}
      data-slot="background-glow"
      {...props}
    />
  );
}

export {
  type BackgroundEffectIntensity,
  BackgroundGlow,
  BackgroundPattern,
  type BackgroundPatternType,
};
