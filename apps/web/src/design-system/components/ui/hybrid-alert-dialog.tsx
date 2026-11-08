"use client";

import {
  type ComponentProps,
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useIsMobile } from "../../hooks/use-mobile";
import { cn } from "../../lib/utils";
import {
  AlertDialog as DesktopAlertDialog,
  AlertDialogAction as DesktopAlertDialogAction,
  AlertDialogCancel as DesktopAlertDialogCancel,
  AlertDialogContent as DesktopAlertDialogContent,
  AlertDialogDescription as DesktopAlertDialogDescription,
  AlertDialogFooter as DesktopAlertDialogFooter,
  AlertDialogHeader as DesktopAlertDialogHeader,
  AlertDialogTitle as DesktopAlertDialogTitle,
  AlertDialogTrigger as DesktopAlertDialogTrigger,
} from "./alert-dialog";
import { buttonVariants } from "./button";
import {
  Drawer as MobileDrawer,
  DrawerClose as MobileDrawerClose,
  DrawerContent as MobileDrawerContent,
  DrawerDescription as MobileDrawerDescription,
  DrawerFooter as MobileDrawerFooter,
  DrawerHeader as MobileDrawerHeader,
  DrawerTitle as MobileDrawerTitle,
  DrawerTrigger as MobileDrawerTrigger,
} from "./drawer";

type BaseProps = { children: ReactNode };

type RootProps = BaseProps & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type ElementProps = BaseProps & {
  className?: string;
};

const HybridAlertDialogContext = createContext<{ isMobile: boolean }>({
  isMobile: false,
});

/** Reads the hybrid alert dialog context, throwing when used outside its provider. */
function useHybridAlertDialogContext() {
  const context = use(HybridAlertDialogContext);
  if (!context) {
    throw new Error(
      "HybridAlertDialog components cannot be rendered outside the HybridAlertDialog Context",
    );
  }
  return context;
}

/** Confirmation dialog that renders as an alert dialog on desktop and a drawer on mobile, supporting controlled and uncontrolled open state. */
function HybridAlertDialog({
  children,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: RootProps) {
  const isMobile = useIsMobile();
  const RootComponent = isMobile ? MobileDrawer : DesktopAlertDialog;

  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState<boolean>(
    defaultOpen ?? false,
  );
  const currentOpen = isControlled ? (open as boolean) : internalOpen;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen);
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
    },
    [isControlled, onOpenChange],
  );

  return (
    <HybridAlertDialogContext.Provider
      value={useMemo(() => ({ isMobile }), [isMobile])}
    >
      <RootComponent
        onOpenChange={handleOpenChange}
        open={currentOpen}
        {...props}
      >
        {children}
      </RootComponent>
    </HybridAlertDialogContext.Provider>
  );
}

/** Element that opens the hybrid alert dialog. */
function HybridAlertDialogTrigger({
  className,
  children,
  ...props
}: ElementProps) {
  const { isMobile } = useHybridAlertDialogContext();
  const Trigger = isMobile ? MobileDrawerTrigger : DesktopAlertDialogTrigger;
  return (
    <Trigger className={className} {...props}>
      {children}
    </Trigger>
  );
}

/** Surface containing the hybrid alert dialog's header, body, and footer. */
function HybridAlertDialogContent({
  className,
  children,
  ...props
}: ElementProps) {
  const { isMobile } = useHybridAlertDialogContext();
  const Content = isMobile ? MobileDrawerContent : DesktopAlertDialogContent;
  return (
    <Content
      className={cn(
        "flex flex-col gap-0 overflow-hidden p-0",
        "md:max-h-[min(85dvh,640px)]",
        className,
      )}
      {...props}
    >
      {children}
    </Content>
  );
}

/** Header region of the hybrid alert dialog. */
function HybridAlertDialogHeader({
  className,
  children,
  ...props
}: ElementProps) {
  const { isMobile } = useHybridAlertDialogContext();
  const Header = isMobile ? MobileDrawerHeader : DesktopAlertDialogHeader;
  return (
    <Header className={cn("shrink-0 gap-1 p-4", className)} {...props}>
      {children}
    </Header>
  );
}

/** Accessible title of the hybrid alert dialog. */
function HybridAlertDialogTitle({
  className,
  children,
  ...props
}: ElementProps) {
  const { isMobile } = useHybridAlertDialogContext();
  const Title = isMobile ? MobileDrawerTitle : DesktopAlertDialogTitle;
  return (
    <Title className={className} {...props}>
      {children}
    </Title>
  );
}

/** Supporting description text of the hybrid alert dialog. */
function HybridAlertDialogDescription({
  className,
  children,
  ...props
}: ElementProps) {
  const { isMobile } = useHybridAlertDialogContext();
  const Description = isMobile
    ? MobileDrawerDescription
    : DesktopAlertDialogDescription;
  return (
    <Description className={className} {...props}>
      {children}
    </Description>
  );
}

/** Footer region holding the hybrid alert dialog's action buttons. */
function HybridAlertDialogFooter({
  className,
  children,
  ...props
}: ElementProps) {
  const { isMobile } = useHybridAlertDialogContext();
  const Footer = isMobile ? MobileDrawerFooter : DesktopAlertDialogFooter;
  return (
    <Footer
      className={cn(
        "mx-0 mt-0 mb-0 shrink-0 flex-col-reverse gap-2 border-t bg-muted/50 p-4",
        "pb-[max(1rem,env(safe-area-inset-bottom))]",
        "sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
    </Footer>
  );
}

type ButtonLikeProps = ComponentProps<"button">;

type ActionButtonProps = ButtonLikeProps & {
  children: ReactNode;
};

/** Button that dismisses the hybrid alert dialog without confirming. */
function HybridAlertDialogCancel({
  className,
  children,
  ...props
}: ActionButtonProps) {
  const { isMobile } = useHybridAlertDialogContext();

  if (isMobile) {
    return (
      <MobileDrawerClose
        className={cn(buttonVariants({ variant: "outline" }), className)}
        render={<button type="button" {...props} />}
      >
        {children}
      </MobileDrawerClose>
    );
  }

  return (
    <DesktopAlertDialogCancel className={className} {...props}>
      {children}
    </DesktopAlertDialogCancel>
  );
}

/** Primary button that confirms the hybrid alert dialog's action. */
function HybridAlertDialogAction({
  className,
  children,
  ...props
}: ActionButtonProps) {
  const { isMobile } = useHybridAlertDialogContext();

  if (isMobile) {
    return (
      <MobileDrawerClose
        className={cn(buttonVariants(), className)}
        render={<button type="button" {...props} />}
      >
        {children}
      </MobileDrawerClose>
    );
  }

  return (
    <DesktopAlertDialogAction className={className} {...props}>
      {children}
    </DesktopAlertDialogAction>
  );
}

export {
  HybridAlertDialog,
  HybridAlertDialogAction,
  HybridAlertDialogCancel,
  HybridAlertDialogContent,
  HybridAlertDialogDescription,
  HybridAlertDialogFooter,
  HybridAlertDialogHeader,
  HybridAlertDialogTitle,
  HybridAlertDialogTrigger,
};
