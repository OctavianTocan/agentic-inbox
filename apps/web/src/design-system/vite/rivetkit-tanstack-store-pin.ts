import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

type PackageEntryCandidate = {
  readonly entry: string;
  readonly packageJson: string;
};

type PinResolution = {
  readonly packageName: "@tanstack/store" | "@tanstack/react-store";
  readonly candidates: readonly PackageEntryCandidate[];
};

const TANSTACK_COMPATIBLE_VERSION_PREFIX = "0.7.";

/** Returns whether the package.json at `packageJson` is a compatible TanStack 0.7 package. */
function hasCompatiblePackageVersion(packageJson: string): boolean {
  if (!existsSync(packageJson)) {
    return false;
  }

  const packageText = readFileSync(packageJson, "utf8");
  return packageText.includes(
    `"version": "${TANSTACK_COMPATIBLE_VERSION_PREFIX}`,
  );
}

/** Returns the first existing candidate whose package version matches RivetKit's TanStack 0.7 API. */
function firstCompatibleEntry(
  candidates: readonly PackageEntryCandidate[],
): string | null {
  for (const candidate of candidates) {
    if (
      existsSync(candidate.entry) &&
      hasCompatiblePackageVersion(candidate.packageJson)
    ) {
      return candidate.entry;
    }
  }

  return null;
}

/** Builds an entry candidate from a package directory under the repository root. */
function packageEntry(
  repoRoot: string,
  packagePath: string,
): PackageEntryCandidate {
  const packageRoot = resolve(repoRoot, packagePath);
  return {
    entry: resolve(packageRoot, "dist/esm/index.js"),
    packageJson: resolve(packageRoot, "package.json"),
  };
}

/** Returns the package.json path for a resolved package entry. */
function packageJsonForResolvedEntry(
  resolvedId: string,
  packageName: string,
): string | null {
  const packagePath = `/node_modules/${packageName}/`;
  const packagePathIndex = resolvedId.lastIndexOf(packagePath);
  if (packagePathIndex === -1) {
    return null;
  }

  return resolve(
    resolvedId.slice(0, packagePathIndex + packagePath.length),
    "package.json",
  );
}

/** Returns whether a Vite importer belongs to a RivetKit package. */
function isRivetkitImporter(importer: string | undefined): boolean {
  return importer?.includes("/node_modules/@rivetkit/") ?? false;
}

/** Returns whether a Vite importer belongs to RivetKit's nested React Store dependency. */
function isRivetkitReactStoreImporter(importer: string | undefined): boolean {
  return (
    importer?.includes(
      "/node_modules/@rivetkit/react/node_modules/@tanstack/react-store/",
    ) ?? false
  );
}

/** Returns compatible package candidates for an intercepted RivetKit import. */
function pinResolutionFor(
  source: string,
  importer: string | undefined,
  options: {
    readonly storeCandidates: readonly PackageEntryCandidate[];
    readonly reactStoreCandidates: readonly PackageEntryCandidate[];
    readonly storeFromReactStoreCandidates: readonly PackageEntryCandidate[];
  },
): PinResolution | null {
  if (source === "@tanstack/store") {
    if (isRivetkitReactStoreImporter(importer)) {
      return {
        packageName: source,
        candidates: options.storeFromReactStoreCandidates,
      };
    }
    if (isRivetkitImporter(importer)) {
      return { packageName: source, candidates: options.storeCandidates };
    }
    return null;
  }

  if (source === "@tanstack/react-store" && isRivetkitImporter(importer)) {
    return { packageName: source, candidates: options.reactStoreCandidates };
  }

  return null;
}

/**
 * Pins `@tanstack/store` and `@tanstack/react-store` resolution for imports
 * originating inside `@rivetkit/*` packages to compatible `0.7.x` copies.
 *
 * `@rivetkit/framework-base` imports `{ Derived, Effect, Store }` from
 * `@tanstack/store@^0.7.1`. `@rivetkit/react` imports `useStore` from
 * `@tanstack/react-store@^0.7.1`, which itself re-exports
 * `@tanstack/store@0.7.x`. Other workspace consumers
 * (`@tanstack/react-store@0.9.x`, `@tanstack/react-hotkeys`, `@tanstack/db`,
 * `@tanstack/electric-db-collection`) require `@tanstack/store@0.9.x`, which
 * dropped `Derived`/`Effect` and reshaped `Store`. Bun usually nests `0.7.x`
 * copies under each `@rivetkit/*` package's own `node_modules`; Node's resolver
 * picks them, but Vite/Rollup occasionally hoists to the top-level `0.9.x`
 * instead (the failure mode hit on Vercel:
 * `"Derived" is not exported by .../@tanstack/store/dist/esm/index.js`).
 *
 * Filtered installs may omit one of Bun's nested physical paths. This plugin
 * only returns paths that exist and have a compatible package version; when a
 * nested copy is absent it accepts a compatible Vite-resolved fallback and
 * rejects incompatible hoisted `0.9.x` copies before Rollup can bundle them.
 *
 * @param repoRoot - Absolute path to the workspace root.
 * @returns Vite plugin that intercepts `@tanstack/store` and
 *   `@tanstack/react-store` resolution for rivetkit internals.
 */
export const rivetkitTanstackStorePin = (repoRoot: string): Plugin => {
  const storeCandidates = [
    packageEntry(
      repoRoot,
      "node_modules/@rivetkit/framework-base/node_modules/@tanstack/store",
    ),
    packageEntry(repoRoot, "node_modules/@tanstack/store"),
  ];
  const reactStoreCandidates = [
    packageEntry(
      repoRoot,
      "node_modules/@rivetkit/react/node_modules/@tanstack/react-store",
    ),
    packageEntry(repoRoot, "node_modules/@tanstack/react-store"),
  ];
  const storeFromReactStoreCandidates = [
    packageEntry(
      repoRoot,
      "node_modules/@rivetkit/react/node_modules/@tanstack/react-store/node_modules/@tanstack/store",
    ),
    ...storeCandidates,
  ];

  return {
    name: "rivetkit-tanstack-store-nested",
    enforce: "pre",
    async resolveId(source, importer) {
      const pinResolution = pinResolutionFor(source, importer, {
        storeCandidates,
        reactStoreCandidates,
        storeFromReactStoreCandidates,
      });
      if (!pinResolution) {
        return null;
      }

      const compatibleEntry = firstCompatibleEntry(pinResolution.candidates);
      if (compatibleEntry) {
        return compatibleEntry;
      }

      const resolved = await this.resolve(source, importer, { skipSelf: true });
      const packageJson = resolved
        ? packageJsonForResolvedEntry(resolved.id, pinResolution.packageName)
        : null;
      if (packageJson && hasCompatiblePackageVersion(packageJson)) {
        return resolved?.id ?? null;
      }

      this.error(
        `Unable to resolve a compatible ${source}@${TANSTACK_COMPATIBLE_VERSION_PREFIX}x for ${importer ?? "unknown RivetKit importer"}`,
      );
    },
  };
};
