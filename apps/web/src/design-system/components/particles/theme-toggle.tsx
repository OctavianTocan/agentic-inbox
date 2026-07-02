"use client";

import type { VariantProps } from "class-variance-authority";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "../../lib/utils";
import { HalfCircleIcon, MoonIcon, SunIcon } from "../icons";
import { Button, type buttonVariants } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { IconMorph } from "../ui/icon-morph";

type ButtonSize = VariantProps<typeof buttonVariants>["size"];

const themes = [
  { label: "Light", value: "light", icon: SunIcon },
  { label: "Dark", value: "dark", icon: MoonIcon },
  { label: "System", value: "system", icon: HalfCircleIcon },
];

/** Tailwind size utility matching the icon to the host button size. */
const iconSizeForButton = (size: ButtonSize) => {
  if (size === "icon-xs" || size === "xs") {
    return "size-3.5";
  }
  if (size === "icon-sm" || size === "sm") {
    return "size-4";
  }
  return "size-[1.2rem]";
};

type ThemeToggleProps = {
  size?: ButtonSize;
  className?: string;
};

/** Dropdown control for switching between light, dark, and system themes. */
export const ThemeToggle = ({ size = "icon", className }: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();
  /** No-op unsubscribe; the subscribe callback itself is never invoked. */
  const noop = () => () => {
    /* subscribe placeholder */
  };
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  const activeKey = mounted ? (theme ?? "system") : "system";
  const iconSize = iconSizeForButton(size);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className={cn("shrink-0 text-foreground", className)}
            size={size}
            variant="ghost"
          />
        }
      >
        <IconMorph activeKey={activeKey} className={iconSize}>
          {{
            light: <SunIcon className={iconSize} />,
            dark: <MoonIcon className={iconSize} />,
            system: <HalfCircleIcon className={iconSize} />,
          }}
        </IconMorph>
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {themes.map(({ label, value, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => {
              setTheme(value);
            }}
          >
            <Icon className="mr-2 size-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
