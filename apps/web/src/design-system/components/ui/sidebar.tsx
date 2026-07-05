"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { PanelLeftIcon } from "@/design-system/components/icons";
import { useIsMobile } from "../../hooks/use-mobile";
import { useSidebarResize } from "../../hooks/use-sidebar-resize";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Separator } from "./separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./sheet";
import { SIDEBAR_WIDTH_COOKIE_NAME } from "./sidebar-width";
import { Skeleton } from "./skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
  width: number;
  setWidth: (width: number) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  resizable: boolean;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

/**
 * Access the sidebar context.
 *
 * @returns The sidebar state and controls from the nearest provider.
 * @throws Error when called outside a SidebarProvider.
 */
function useSidebar() {
  const context = React.use(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

/** Save the sidebar width to a cookie for later sessions. */
function persistWidth(cookieName: string, widthPx: number) {
  if (typeof document === "undefined") {
    return;
  }
  // biome-ignore lint/suspicious/noDocumentCookie: cookieStore is Chromium-only, document.cookie works cross-browser
  document.cookie = `${cookieName}=${String(widthPx)}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
}

type SidebarProviderProps = React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  cookieName?: string;
  keyboardShortcut?: string | false;
  resizable?: boolean;
  defaultWidth?: number;
  persistedWidth?: number | undefined;
  minWidth?: number;
  maxWidth?: number;
};

/** Provides sidebar open/collapsed and resize state to descendants. */
function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  cookieName = SIDEBAR_COOKIE_NAME,
  keyboardShortcut = SIDEBAR_KEYBOARD_SHORTCUT,
  resizable = false,
  defaultWidth = 256,
  persistedWidth,
  minWidth = 220,
  maxWidth = 480,
  className,
  style,
  children,
  ...props
}: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      // biome-ignore lint/suspicious/noDocumentCookie: cookieStore is Chromium-only, document.cookie works cross-browser
      document.cookie = `${cookieName}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open, cookieName],
  );

  const [width, setWidth] = React.useState(persistedWidth ?? defaultWidth);
  const [isDragging, setIsDragging] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen]);

  const toggleSidebarRef = React.useRef(toggleSidebar);
  toggleSidebarRef.current = toggleSidebar;

  React.useEffect(() => {
    if (keyboardShortcut === false) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === keyboardShortcut && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebarRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardShortcut]);

  const state = open ? "expanded" : "collapsed";

  const sidebarWidth = resizable ? `${width}px` : SIDEBAR_WIDTH;

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      width,
      setWidth,
      isDragging,
      setIsDragging,
      resizable,
      minWidth,
      maxWidth,
      defaultWidth,
      wrapperRef,
    }),
    [
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      toggleSidebar,
      width,
      isDragging,
      resizable,
      minWidth,
      maxWidth,
      defaultWidth,
    ],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        ref={wrapperRef}
        className={cn(
          "group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
          className,
        )}
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": sidebarWidth,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

/** Sidebar shell that adapts to mobile, off-canvas, and collapsed states. */
function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  dir,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        className={cn(
          "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
          className,
        )}
        data-slot="sidebar"
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet onOpenChange={setOpenMobile} open={openMobile} {...props}>
        <SheetContent
          className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          data-mobile="true"
          data-sidebar="sidebar"
          data-slot="sidebar"
          dir={dir}
          side={side}
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-side={side}
      data-slot="sidebar"
      data-state={state}
      data-variant={variant}
    >
      <div
        className={cn(
          "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-panel",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
        )}
        data-slot="sidebar-gap"
      />
      <div
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-panel data-[side=right]:right-0 data-[side=left]:left-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] md:flex",
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className,
        )}
        data-side={side}
        data-slot="sidebar-container"
        {...props}
      >
        <div
          className="flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border"
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Button that toggles the sidebar open or collapsed. */
function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      className={cn(className)}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      size="icon-sm"
      variant="ghost"
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

/** Thin edge rail that toggles the sidebar on click. */
function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      aria-label="Toggle Sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:after:left-full",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className,
      )}
      data-sidebar="rail"
      data-slot="sidebar-rail"
      onClick={toggleSidebar}
      tabIndex={-1}
      title="Toggle Sidebar"
      type="button"
      {...props}
    />
  );
}

/** Main content area placed alongside the sidebar. */
function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "relative flex w-full flex-1 flex-col bg-background md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2 md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm",
        className,
      )}
      data-slot="sidebar-inset"
      {...props}
    />
  );
}

/** Input styled to sit within the sidebar. */
function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn("h-8 w-full bg-background shadow-none", className)}
      data-sidebar="input"
      data-slot="sidebar-input"
      {...props}
    />
  );
}

/** Header region at the top of the sidebar. */
function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-12 shrink-0 flex-col justify-center gap-1 p-2",
        className,
      )}
      data-sidebar="header"
      data-slot="sidebar-header"
      {...props}
    />
  );
}

/** Footer region pinned to the bottom of the sidebar. */
function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        className,
      )}
      data-sidebar="footer"
      data-slot="sidebar-footer"
      {...props}
    />
  );
}

/** Horizontal divider between sidebar sections. */
function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      data-sidebar="separator"
      data-slot="sidebar-separator"
      {...props}
    />
  );
}

/** Scrollable region holding the sidebar's groups and menus. */
function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className,
      )}
      data-sidebar="content"
      data-slot="sidebar-content"
      {...props}
    />
  );
}

/** Grouping container for a labeled set of sidebar items. */
function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative flex w-full min-w-0 flex-col px-1.5 py-1",
        className,
      )}
      data-sidebar="group"
      data-slot="sidebar-group"
      {...props}
    />
  );
}

/** Label heading for a sidebar group; hides when collapsed to icons. */
function SidebarGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div"> & React.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "flex h-8 shrink-0 items-center rounded-md px-2 font-medium text-sidebar-foreground/70 text-xs outline-hidden ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 [&>svg]:size-4 [&>svg]:shrink-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "sidebar-group-label",
      sidebar: "group-label",
    },
  });
}

/** Action button anchored to a sidebar group's header. */
function SidebarGroupAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<"button"> & React.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(
          "absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-transform after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:hidden md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "sidebar-group-action",
      sidebar: "group-action",
    },
  });
}

/** Content wrapper inside a sidebar group. */
function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("w-full text-sm", className)}
      data-sidebar="group-content"
      data-slot="sidebar-group-content"
      {...props}
    />
  );
}

/** List container for top-level sidebar menu items. */
function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex w-full min-w-0 flex-col gap-[1px]", className)}
      data-sidebar="menu"
      data-slot="sidebar-menu"
      {...props}
    />
  );
}

/** Single item row within a sidebar menu. */
function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("group/menu-item relative", className)}
      data-sidebar="menu-item"
      data-slot="sidebar-menu-item"
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  "peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent-hover hover:text-sidebar-accent-foreground hover:[text-shadow:0.5px_0_0_currentColor] group-has-[[data-sidebar=menu-action]:hover]/menu-item:bg-sidebar-accent-hover group-has-[[data-sidebar=menu-action]:hover]/menu-item:text-sidebar-accent-foreground group-has-[[data-sidebar=menu-action]:hover]/menu-item:[text-shadow:0.5px_0_0_currentColor] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:bg-sidebar-accent-active data-active:text-sidebar-accent-foreground data-active:[text-shadow:0.5px_0_0_currentColor] data-active:hover:bg-sidebar-accent-active data-active:group-has-[[data-sidebar=menu-action]:hover]/menu-item:bg-sidebar-accent-active data-open:hover:bg-sidebar-accent-hover data-active:hover:text-sidebar-accent-foreground data-active:group-has-[[data-sidebar=menu-action]:hover]/menu-item:text-sidebar-accent-foreground data-active:hover:[text-shadow:0.5px_0_0_currentColor] data-open:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:opacity-60 [&_svg]:transition-opacity hover:[&_svg]:opacity-100 group-has-[[data-sidebar=menu-action]:hover]/menu-item:[&_svg]:opacity-100 data-active:[&_svg]:opacity-100",
  {
    variants: {
      variant: {
        default:
          "hover:bg-sidebar-accent-hover hover:text-sidebar-accent-foreground data-active:hover:bg-sidebar-accent-active data-active:hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent-hover hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)] data-active:hover:bg-sidebar-accent-active data-active:hover:text-sidebar-accent-foreground",
      },
      size: {
        default: "h-8 text-sm max-md:h-9",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/** Styled menu button element, with active and size variants applied. */
function SidebarMenuButtonInner({
  render,
  isActive = false,
  variant = "default",
  size = "default",
  className,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    isActive?: boolean;
  } & VariantProps<typeof sidebarMenuButtonVariants>) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(sidebarMenuButtonVariants({ variant, size }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "sidebar-menu-button",
      sidebar: "menu-button",
      size,
      active: isActive,
    },
  });
}

/** Sidebar menu button that shows a tooltip when collapsed to icons. */
function SidebarMenuButton({
  tooltip,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>) {
  const { isMobile, state } = useSidebar();

  if (!tooltip) {
    return <SidebarMenuButtonInner {...props} />;
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    };
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<SidebarMenuButtonInner {...props} />} />
      <TooltipContent
        align="center"
        hidden={state !== "collapsed" || isMobile}
        side="right"
        {...tooltip}
      />
    </Tooltip>
  );
}

/** Secondary action button anchored to a sidebar menu item. */
function SidebarMenuAction({
  className,
  render,
  showOnHover = false,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    showOnHover?: boolean;
  }) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(
          "absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-transform after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
          showOnHover &&
            "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 aria-expanded:opacity-100 peer-data-active/menu-button:text-sidebar-accent-foreground md:opacity-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "sidebar-menu-action",
      sidebar: "menu-action",
    },
  });
}

/** Count or status badge anchored to a sidebar menu item. */
function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 font-medium text-sidebar-foreground text-xs tabular-nums peer-hover/menu-button:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 peer-data-active/menu-button:text-sidebar-accent-foreground",
        className,
      )}
      data-sidebar="menu-badge"
      data-slot="sidebar-menu-badge"
      {...props}
    />
  );
}

/** Loading placeholder for a sidebar menu item, optionally with an icon. */
function SidebarMenuSkeleton({
  className,
  showIcon = false,
  width: widthProp,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean;
  width?: string;
}) {
  const [randomWidth] = React.useState(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  });
  const width = widthProp ?? randomWidth;

  return (
    <div
      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
      data-sidebar="menu-skeleton"
      data-slot="sidebar-menu-skeleton"
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

/** Nested list of submenu items under a sidebar menu item. */
function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-sidebar-border border-l px-2.5 py-0.5 group-data-[collapsible=icon]:hidden",
        className,
      )}
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      {...props}
    />
  );
}

/** Single row within a sidebar submenu. */
function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("group/menu-sub-item relative", className)}
      data-sidebar="menu-sub-item"
      data-slot="sidebar-menu-sub-item"
      {...props}
    />
  );
}

/** Link button for a sidebar submenu entry. */
function SidebarMenuSubButton({
  render,
  size = "md",
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<"a"> &
  React.ComponentProps<"a"> & {
    size?: "sm" | "md";
    isActive?: boolean;
  }) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-hidden ring-sidebar-ring hover:bg-sidebar-accent-hover hover:text-sidebar-accent-foreground hover:[text-shadow:0.5px_0_0_currentColor] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:bg-sidebar-accent-active data-[size=md]:text-sm data-[size=sm]:text-xs data-active:text-sidebar-accent-foreground data-active:[text-shadow:0.5px_0_0_currentColor] data-active:hover:bg-sidebar-accent-active data-active:hover:text-sidebar-accent-foreground data-active:hover:[text-shadow:0.5px_0_0_currentColor] group-data-[collapsible=icon]:hidden [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "sidebar-menu-sub-button",
      sidebar: "menu-sub-button",
      size,
      active: isActive,
    },
  });
}

/** Drag handle for resizing a resizable sidebar; renders nothing when fixed-width. */
function SidebarResizeHandle({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const {
    state,
    setOpen,
    width,
    setWidth,
    setIsDragging,
    resizable,
    minWidth,
    maxWidth,
    defaultWidth,
    wrapperRef,
  } = useSidebar();

  const isCollapsed = state === "collapsed";

  const onResize = React.useCallback(
    (widthPx: number) => {
      if (wrapperRef.current) {
        wrapperRef.current.style.setProperty("--sidebar-width", `${widthPx}px`);
      }
    },
    [wrapperRef],
  );

  const onCollapse = React.useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const onExpand = React.useCallback(
    (widthPx: number) => {
      if (wrapperRef.current) {
        wrapperRef.current.style.setProperty("--sidebar-width", `${widthPx}px`);
      }
      setWidth(widthPx);
      setOpen(true);
    },
    [setOpen, setWidth, wrapperRef],
  );

  const { isDragging, handleMouseDown, handleDoubleClick } = useSidebarResize({
    isCollapsed,
    minWidth,
    maxWidth,
    defaultWidth,
    onResize,
    onCollapse,
    onExpand,
  });

  React.useEffect(() => {
    setIsDragging(isDragging);
  }, [isDragging, setIsDragging]);

  React.useEffect(() => {
    if (isDragging || !resizable) {
      return;
    }
    if (wrapperRef.current) {
      const currentWidth =
        wrapperRef.current.style.getPropertyValue("--sidebar-width");
      if (currentWidth) {
        const px = Number.parseInt(currentWidth, 10);
        if (!Number.isNaN(px) && px !== width) {
          setWidth(px);
          persistWidth(SIDEBAR_WIDTH_COOKIE_NAME, px);
        }
      }
    }
  }, [isDragging, resizable, wrapperRef, width, setWidth]);

  if (!resizable) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label="Resize sidebar"
            className={cn(
              "absolute inset-y-0 right-0 z-20 w-1 cursor-col-resize border-none bg-transparent p-0 transition-colors",
              isDragging ? "bg-border" : "hover:bg-border/50",
              className,
            )}
            data-slot="sidebar-resize-handle"
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleMouseDown}
            type="button"
            {...props}
          />
        }
      />
      <TooltipContent side="right">Drag to resize</TooltipContent>
    </Tooltip>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarResizeHandle,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
