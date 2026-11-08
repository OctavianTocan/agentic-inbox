/**
 * Brand asset names served from `/integrations/<name>.svg` in the consuming
 * app's `public/` directory. Each name corresponds to a real SVG file shipped
 * with the app (see `apps/app/public/integrations/`).
 */
import { Img } from "../ui/img";

export type IntegrationAssetName =
  | "gmail"
  | "github"
  | "github-dark"
  | "google"
  | "google-admin"
  | "google-calendar"
  | "google-docs"
  | "google-drive"
  | "google-sheets"
  | "google-slides"
  | "google-tasks"
  | "google-workspace"
  | "hubspot"
  | "slack"
  | "twitter";

type IntegrationAssetIconProps = {
  /** Brand asset to render; resolves to `/integrations/<name>.svg`. */
  name: IntegrationAssetName;
  /** Tailwind classes for sizing and layout. */
  className?: string;
  /**
   * Accessible label. When omitted the icon is marked decorative
   * (`aria-hidden`) so it does not duplicate adjacent text.
   */
  alt?: string;
};

/** Renders a brand SVG from the app's `public/integrations/` directory. */
export function IntegrationAssetIcon({
  name,
  className,
  alt,
}: IntegrationAssetIconProps) {
  const isDecorative = alt === undefined;
  return (
    <Img
      alt={alt ?? ""}
      aria-hidden={isDecorative}
      className={className}
      draggable={false}
      src={`/integrations/${name}.svg`}
    />
  );
}
