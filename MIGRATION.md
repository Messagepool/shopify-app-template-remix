# Remix -> React Router v7 Migration

This document records every change made when migrating this Shopify embedded app boilerplate from **Remix 2.17** to **React Router 7.15.1**, including package upgrades, configuration updates, and application code changes. It is written for a technical lead reviewing migration decisions.

---

## 1. Overview

### What this migration is about

This project was a **Shopify embedded app** built on the Remix stack:

- **Remix 2.17** with Vite 6
- **`@shopify/shopify-app-remix`** for OAuth, session storage, and App Bridge integration
- **Custom HN privilege layer** (GraphQL-backed authorization, client-side polling, Redis sessions)
- **PM2 production deployment** via custom `server.js` (Express)

The migration replaces the Remix framework layer with **React Router v7** and swaps the Shopify integration package to **`@shopify/shopify-app-react-router`**, while preserving all custom business logic (privileges, Redis, PM2, multi-site env prefixes).

### Why we migrated from Remix to React Router v7

| Before | After |
|--------|-------|
| `@remix-run/*` packages | `react-router` + `@react-router/*` packages |
| `@shopify/shopify-app-remix` | `@shopify/shopify-app-react-router` |
| `remix vite:build` / `remix-serve` | `react-router build` / `react-router-serve` |
| `RemixServer` in `entry.server.tsx` | `ServerRouter` from `react-router` |

**Why it had to change:** Remix and React Router merged. Remix v2 is in maintenance mode; active development continues under the React Router v7 package namespace. Shopify's official app template ([`shopify-app-template-react-router`](https://github.com/Shopify/shopify-app-template-react-router)) targets React Router, not Remix. Staying on Remix would mean:

- No new Shopify SDK features on the Remix adapter
- Growing peer dependency conflicts as the ecosystem moves to RR7
- Divergence from Shopify CLI dev tooling (`shopify app dev` now reports `react-router`, not `remix`)

### Why now

1. **Remix merged into React Router** — React Router v7 is the successor; `@remix-run/*` is legacy.
2. **Shopify moved to React Router** — `@shopify/shopify-app-react-router@1.x` is the supported path; `@shopify/shopify-app-remix` still exists but targets Remix peers.
3. **Dependency alignment** — `@shopify/shopify-app-session-storage-redis@6.x` and `@shopify/shopify-api@13.x` align with the React Router package, not the older Remix stack.

### Reference: Shopify official React Router template

The migration was **primarily modeled on** Shopify's official template:

**[Shopify/shopify-app-template-react-router](https://github.com/Shopify/shopify-app-template-react-router)**

That repo is Shopify's canonical embedded-app boilerplate after the Remix -> React Router transition. It was used as the **reference implementation** for framework-level changes (package swaps, Vite plugin, SSR entry, route imports, tsconfig/eslint shape, npm scripts). See also the [Upgrading from Remix wiki](https://github.com/Shopify/shopify-app-template-react-router/wiki/Upgrading-from-Remix).

#### Shopify's original migration PR (commit-by-commit reference)

Shopify's own Remix -> React Router upgrade is documented as a merged PR with **logical, ordered commits**:

**[Shopify/shopify-app-template-react-router#1 — Upgrade to React Router](https://github.com/Shopify/shopify-app-template-react-router/pull/1)** (merged July 2025)

That PR is the closest public diff to what this boilerplate migration did. It breaks changes into the same sequence Shopify recommends in their migration guides ([Adopt Remix future flags](https://remix.run/docs/en/main/start/future-flags), [Upgrading from Remix](https://reactrouter.com/upgrading/remix)). Relevant commit themes from PR #1:

| PR #1 commit theme | What it changed | This boilerplate |
|--------------------|-----------------|------------------|
| Remove `installGlobals` | Dropped from `vite.config.ts` | Same — removed |
| Update `tsconfig.json` | RR7 / Vite plugin types | Same — `.react-router/types`, `rootDirs` |
| Adopt `v3_singleFetch` | Enabled; required `boundary.headers` on routes calling `authenticate.admin()` | **Not adopted** — was already `false` pre-migration; kept disabled |
| Remove `@remix-run/eslint-config` | Manual `.eslintrc.cjs` + ESLint plugins | Same — see [Package Changes](#package-changes) |
| `npx codemod remix/2/react-router/upgrade` | Automated dependency/import renames | **Equivalent manual changes** — same end state, no codemod run |
| Update `shopify.web.toml` dev command | `react-router dev` via Shopify CLI | Same |
| Enable RR7 type safety | `typecheck` script, generated route types | Same — `react-router typegen && tsc --noEmit` |
| Switch to `@shopify/shopify-app-react-router` | `shopify.server.ts`, routes, `AppProvider` | Same |
| Update `AppProvider` | `embedded` prop (simpler API) | Same — `isEmbeddedApp` -> `embedded` |
| **Polaris Web Components** (final commit) | Remove `@shopify/polaris`; add `polaris.js` CDN + web components | **Deferred to follow-up PR** — see [Polaris Web Components](#polaris-web-components) |

PR #1 validates two decisions in this migration:

1. **Framework migration and Polaris UI migration are separable** — Shopify landed Polaris Web Components in the **last commit** of the same PR series, not mixed into the core RR renames. This boilerplate intentionally keeps Polaris React for this PR and plans Web Components next.
2. **`boundary.headers` on authenticated routes** — PR #1 added `headers` to `app._index.tsx` specifically when adopting `v3_singleFetch`. This app keeps `headers` + `ErrorBoundary` on the **`app.tsx` layout route** (which also calls `authenticate.admin()`). Child routes (`app._index.tsx`, `app.restricted-page.tsx`) call `authenticate.admin()` in their own loaders but do not duplicate `headers` exports — acceptable while `v3_singleFetch` remains off; revisit if single-fetch is enabled later.

**Optional tooling note:** PR #1 used Shopify's recommended codemod:

```sh
npx codemod remix/2/react-router/upgrade
```

This migration applied the same renames manually (verified via `grep`, `tsc`, and `npm run build`) because the boilerplate has custom files (privilege layer, Redis, PM2) that a blind codemod would not cover.

**Why this repo was the primary reference:**

1. **Shopify's supported path** — `@shopify/shopify-app-react-router` is documented and maintained against this template, not the old Remix one.
2. **Same app type** — Embedded app with OAuth, App Bridge, loaders/actions, and webhooks — structurally identical to this boilerplate.
3. **Reduces migration risk** — Import paths, `vite.config.ts`, `entry.server.tsx`, `shopify.server.ts`, and route module APIs match a known-good baseline rather than being inferred from Remix docs.

#### Adopted from the official template

| Area | Official template pattern | Applied here |
|------|---------------------------|--------------|
| Framework | `react-router` + `@react-router/*` | Yes — replaces all `@remix-run/*` |
| Shopify SDK | `@shopify/shopify-app-react-router` | Yes — replaces `@shopify/shopify-app-remix` |
| Scripts | `react-router build`, `react-router-serve`, `react-router dev` | Yes |
| `vite.config.ts` | `reactRouter()` from `@react-router/dev/vite` | Yes |
| `entry.server.tsx` | `ServerRouter`, streams from `@react-router/node` | Yes |
| `app/routes.ts` | `flatRoutes()` from `@react-router/fs-routes` | Yes |
| Route modules | Types/components from `react-router` | Yes — all 13 route files |
| `app/routes/app.tsx` | `boundary.error`, `boundary.headers`, `AppProvider` | Yes |
| `tsconfig.json` | `.react-router/types`, `rootDirs`, RR7 types | Yes |
| `.eslintrc.cjs` | Manual React/TS/import plugins (no Remix eslint config) | Yes |
| Dev tooling | `typecheck` script, `@shopify/polaris-types`, Node `>=20.19` | Yes |
| React / Vite / ESLint | React 18, Vite 6, ESLint 8 | Yes — same compatibility band |

#### Intentionally not copied (project-specific)

| Official template | This boilerplate | Reason |
|-------------------|------------------|--------|
| RR packages at `^7.12.0` | Exact `7.15.1` on all six RR packages | Project rule: `@react-router/express` exact peer on `react-router` |
| `@shopify/shopify-app-react-router@^1.1.0` | `^1.2.0` | Latest compatible at migration time |
| Prisma session storage | **Redis** (`@shopify/shopify-app-session-storage-redis`) | Existing production infrastructure |
| No custom production server | **`server.js` + `ecosystem.config.cjs` (PM2)** | Multi-site HNUK/HNIE deployment |
| `shopify app dev` only | **`run-p auth develop`** (auth proxy + CLI) | Local OAuth/nginx proxy stack (`auth.js`) |
| Production Dockerfile (`node:20-alpine`, `npm ci --omit=dev`, build in image) | **Company standard** (`node:22.14.0-alpine`, `COPY . .`, `npm install`) | Team Docker convention |
| No custom privilege layer | **HN privilege system** (GraphQL, polling, encryption) | Business logic — unchanged |
| `future.expiringOfflineAccessTokens: true` | `future: {}` | Optional flag; deprecated Remix flags removed instead |
| May omit `@shopify/polaris` as direct dep | **`@shopify/polaris@^13.9.5` kept** | UI uses Polaris React components throughout; Web Components deferred (see PR #1 final commit) |
| No `react-router.config.ts` | **`react-router.config.ts`** with `ssr: true` | Explicit SSR config (defaults work without it) |

**Version note:** The official template is a **floor**, not a ceiling. Where compatible, this migration used newer versions (RR 7.15.1 vs 7.12.0, Vite 6.4.2 vs 6.3.6) while staying in the same compatibility band.

---

## 2. Version Matrix

All `react-router` and `@react-router/*` packages are **exact-pinned to `7.15.1` with no `^` prefix**. This is required because `@react-router/express` declares `react-router` as an exact peer (`"react-router": "7.15.1"`). Any version mismatch causes npm peer dependency conflicts.

All other packages use `^` as normal.

| Package | Before | After | Why this version | Why not higher |
|---------|--------|-------|------------------|----------------|
| `react-router` | (transitive `6.30.3` via Remix) | `7.15.1` (exact) | Latest RR7; required by Shopify RR package | N/A — at latest compatible RR7 |
| `@react-router/dev` | — (`@remix-run/dev` ^2.16.1) | `7.15.1` (exact) | Build tooling for RR7 | Must match other `@react-router/*` |
| `@react-router/node` | — (`@remix-run/node` ^2.16.1) | `7.15.1` (exact) | Server runtime (streams, request handling) | Must match |
| `@react-router/express` | — (`@remix-run/express` ^2.17.4) | `7.15.1` (exact) | Custom `server.js` PM2 integration | Must match |
| `@react-router/fs-routes` | — (`@remix-run/fs-routes` ^2.16.1) | `7.15.1` (exact) | File-based routing in `app/routes.ts` | Must match |
| `@react-router/serve` | — (`@remix-run/serve` ^2.16.1) | `7.15.1` (exact) | `npm start` production server | Must match |
| `@shopify/shopify-app-react-router` | — (`@shopify/shopify-app-remix` ^3.7.0) | `^1.2.0` | Official Shopify RR integration; peer requires `react-router ^7.6.2` | At latest |
| `@shopify/shopify-app-session-storage-redis` | ^4.2.11 | `^6.0.0` | Aligns with `@shopify/shopify-api ^13.0.0` required by RR package | At latest |
| `@shopify/polaris` | ^12.0.0 | `^13.9.5` | Latest; Shopify RR ecosystem target | At latest for React 18 |
| `@shopify/app-bridge-react` | ^4.1.6 | `^4.2.10` | Latest | At latest |
| `@shopify/cli` | ^3.63.1 | `^3.94.3` | Latest CLI | At latest |
| `@shopify/api-codegen-preset` | ^1.1.1 (dev) | `^2.0.0` (dev) | Uses `@graphql-codegen/cli ^6.x`; removes old pin conflicts | At latest |
| `react` | ^18.2.0 | `^18.3.1` | Polaris 13 peer requires `^18.0.0` | **Not 19.2.6** — Polaris 13 does not peer React 19 |
| `react-dom` | ^18.2.0 | `^18.3.1` | Matched to React 18 | **Not 19.2.6** |
| `@types/react` | ^18.2.31 | `^18.3.25` | React 18 type definitions | **Not 19.x** |
| `@types/react-dom` | ^18.2.14 | `^18.3.7` | React 18 type definitions | **Not 19.x** |
| `vite` | ^6.2.2 (dev) | `^6.4.2` (dev) | RR7 supports Vite 6; Shopify official template uses Vite 6 | **Not 8.0.13** — Vite 8 uses Rolldown (major bundler change) |
| `typescript` | ^5.2.2 (dev) | `^5.9.3` (dev) | RR7 supports TS 5; ESLint/typescript-eslint v6 ecosystem | **Not 6.0.3** — tooling compatibility risk |
| `eslint` | ^8.42.0 (dev) | `^8.57.1` (dev) | Matches Shopify RR template; `@remix-run/eslint-config` removed | **Not 10.4.0** — ESLint 10 is flat-config-only |
| `eslint-config-prettier` | ^10.0.1 (dev) | `^10.1.8` (dev) | Latest compatible with ESLint 8 | At latest for ESLint 8 |
| `prettier` | ^3.2.4 (dev) | `^3.8.3` (dev) | Latest | At latest |
| `vite-tsconfig-paths` | ^5.0.1 | `^6.1.1` | Latest | At latest |
| `sass` | ^1.97.3 (dev) | **removed** | Duplicate of `sass-embedded` | N/A |
| `sass-embedded` | ^1.99.0 (dev) | `^1.99.0` (dev) | Faster native Sass compiler | At latest |
| `isbot` | ^5.1.0 | `^5.1.40` | Latest | At latest |
| `axios` | ^1.13.6 | `^1.16.1` | Latest | At latest |
| `clsx` | ^2.1.1 | `^2.1.1` | Already latest | — |
| `crypto-ts` | ^1.0.2 | `^1.0.2` | Already latest | — |
| `dayjs` | ^1.11.13 | `^1.11.20` | Latest | At latest |
| `express` | ^4.21.2 | `^4.21.2` | `@react-router/serve` depends on Express 4 | **Not 5.x** — RR serve peer is Express 4 |
| `graphql-request` | ^7.2.0 | `^7.4.0` | Latest | At latest |
| `lodash` | ^4.17.21 | `^4.18.1` | Latest (`npm info lodash@latest` -> 4.18.1) | At latest |
| `npm-run-all` | ^4.1.5 | `^4.1.5` | Already latest | — |
| `pm2` | ^6.0.14 | `^6.0.14` | Already latest 6.x; unrelated to RR migration | **Not 7.0.1** — major bump with no migration benefit |
| `usehooks-ts` | ^3.1.1 | `^3.1.1` | Already latest | — |
| `zod` | ^4.3.6 | `^4.4.3` | Latest | At latest |
| `zustand` | ^5.0.11 | `^5.0.13` | Latest | At latest |
| `compression` | missing | `^1.8.1` | Used by `server.js` but never declared | N/A |
| `@shopify/polaris-types` | — | `^1.0.1` (dev) | TS types for Polaris in `tsconfig.json` | At latest |
| `@types/node` | ^22.2.0 (dev) | `^22.15.29` (dev) | Latest Node 22 types | **Not 25.x** — conservative |
| `@types/lodash` | ^4.17.20 (dev) | `^4.17.21` (dev) | Latest | At latest |
| `@types/eslint` | ^9.6.1 (dev) | `^9.6.1` (dev) | Unchanged | — |
| **Node engines** | `^18.20 \|\| ^20.10 \|\| >=21.0.0` | `>=20.19 <22 \|\| >=22.12` | Required by RR7 7.15.1, Vite 6.4+, Shopify packages | Node 18 no longer supported |

---

## 3. Package Changes

### Packages removed

| Package | Was | Replaced by | Why removed | What breaks if kept |
|---------|-----|-------------|-------------|---------------------|
| `@remix-run/dev` | ^2.16.1 | `@react-router/dev@7.15.1` | Remix build plugin obsolete | `remix vite:build` fails; dual framework conflict |
| `@remix-run/express` | ^2.17.4 | `@react-router/express@7.15.1` | Remix Express adapter obsolete | `server.js` cannot create request handler |
| `@remix-run/fs-routes` | ^2.16.1 | `@react-router/fs-routes@7.15.1` | Remix file routing obsolete | `app/routes.ts` import fails |
| `@remix-run/node` | ^2.16.1 | `@react-router/node@7.15.1` | Remix server runtime obsolete | `createReadableStreamFromReadable`, server types break |
| `@remix-run/react` | ^2.16.1 | `react-router@7.15.1` | Remix re-exported React Router 6 | Components/hooks import from wrong package |
| `@remix-run/serve` | ^2.16.1 | `@react-router/serve@7.15.1` | Remix production server obsolete | `npm start` (`remix-serve`) fails |
| `@remix-run/eslint-config` | ^2.16.1 (dev) | Manual ESLint config + plugins | No `@react-router/eslint-config` package exists | ESLint extends fail |
| `@remix-run/route-config` | ^2.16.1 (dev) | (nothing) | Unused in RR7; `@react-router/fs-routes` replaces it | Unnecessary dependency |
| `@shopify/shopify-app-remix` | ^3.7.0 | `@shopify/shopify-app-react-router@^1.2.0` | Shopify's supported path for RR7 apps | OAuth, sessions, AppProvider, boundary helpers break |
| `sass` | ^1.97.3 (dev) | (nothing — `sass-embedded` kept) | Duplicate Sass compiler | Two compilers installed; slower builds |

### Packages added

| Package | Version | Why added | What breaks without it |
|---------|---------|-----------|------------------------|
| `react-router` | `7.15.1` | Core RR7 runtime (routes, loaders, components) | No routing, no SSR, no loaders/actions |
| `@react-router/dev` | `7.15.1` | Vite plugin, CLI (`react-router build/dev`) | Build and dev server fail |
| `@react-router/node` | `7.15.1` | Server streams and Node adapters | `entry.server.tsx` stream creation fails |
| `@react-router/express` | `7.15.1` | Express request handler for PM2 `server.js` | Production PM2 server cannot serve SSR |
| `@react-router/fs-routes` | `7.15.1` | File-based route discovery | No routes registered |
| `@react-router/serve` | `7.15.1` | `react-router-serve` for `npm start` | Default start script fails |
| `@shopify/shopify-app-react-router` | ^1.2.0 | Shopify OAuth, sessions, App Bridge, boundary | Entire Shopify integration broken |
| `compression` | ^1.8.1 | Explicit dep for `server.js` (was imported but undeclared) | `npm install --omit=dev` in strict environments may not resolve it |
| `@shopify/polaris-types` | ^1.0.1 (dev) | Polaris TypeScript types in tsconfig | TS errors on Polaris component props |
| ESLint plugins | various (dev) | Replace `@remix-run/eslint-config` | Lint config fails to load |
| `docker-start` script dep | (script only) | `npm run docker-start` -> `npm run start` | Docker CMD fails if production Dockerfile adds CMD back |

### Packages upgraded (not replaced)

| Package | Before -> After | Why |
|---------|----------------|-----|
| `@shopify/shopify-app-session-storage-redis` | ^4.2.11 -> ^6.0.0 | Required by `@shopify/shopify-api ^13` (transitive from RR Shopify package) |
| `@shopify/polaris` | ^12.0.0 -> ^13.9.5 | Latest compatible with React 18; official Shopify RR ecosystem |
| `@shopify/api-codegen-preset` | ^1.1.1 -> ^2.0.0 | Uses GraphQL Codegen 6.x; eliminates override conflicts |

### Why the `resolutions` / `overrides` block was removed

**Before** (`package.json`):

```json
"resolutions": {
  "@graphql-tools/url-loader": "8.0.16",
  "@graphql-codegen/client-preset": "4.7.0",
  "@graphql-codegen/typescript-operations": "4.5.0",
  "minimatch": "9.0.5"
},
"overrides": { /* identical */ }
```

**Now:** Entire block removed.

**Why:** These pins existed because `@shopify/api-codegen-preset@1.x` pulled `@graphql-codegen/*@4.x` packages that conflicted with other tooling versions. `@shopify/api-codegen-preset@2.0.0` depends on `@graphql-codegen/cli@^6.1.1` — the conflicts no longer exist.

**What breaks if kept:** Stale pins could force outdated codegen packages and create new conflicts with preset 2.x.

### Why `sass` was removed but `sass-embedded` kept

| | `sass` | `sass-embedded` |
|---|--------|-----------------|
| **Implementation** | JavaScript wrapper calling Dart Sass | Native binary (faster) |
| **Before** | Both were in devDependencies | Both were in devDependencies |
| **After** | Removed | Kept at ^1.99.0 |

**Why:** Having both is redundant. Vite accepts either as a Sass compiler peer. `sass-embedded` is the faster native option.

**What breaks if both removed:** Any `.scss`/`.sass` imports would fail to compile (this project uses CSS modules, not Sass files, but the dependency is kept for Vite compatibility).

### npm scripts changed

| Script | Before | After | Why |
|--------|--------|-------|-----|
| `build` | `remix vite:build` | `react-router build` | RR7 CLI |
| `start` | `remix-serve ./build/server/index.js` | `react-router-serve ./build/server/index.js` | RR7 production server |
| `docker-start` | (missing) | `npm run start` | Docker CMD support |
| `typecheck` | (missing) | `react-router typegen && tsc --noEmit` | RR7 generates route types |
| `lint` | `eslint --cache ...` | `eslint --ignore-path .gitignore --cache ...` | Matches Shopify RR template |

---

## 4. Configuration Files

### `vite.config.ts`

| Aspect | Before | After | Why | Breaks if unchanged |
|--------|--------|-------|-----|---------------------|
| Vite plugin | `vitePlugin as remix` from `@remix-run/dev` | `reactRouter` from `@react-router/dev/vite` | RR7 build pipeline | Vite cannot build the app |
| `installGlobals()` | Called from `@remix-run/node` | Removed | RR7 plugin handles globals | Usually harmless to keep, but unnecessary |
| Remix `future` flags | `v3_fetcherPersist`, `v3_routeConfig`, etc. | Removed | RR7 defaults; flags configured differently | Stale Remix-specific config ignored or errors |
| HOST workaround | Present | Preserved | Shopify CLI passes `HOST` instead of `SHOPIFY_APP_URL` | Dev tunnel HMR breaks |
| HMR config | Present | Preserved | Shopify tunnel compatibility | Dev server unreachable through tunnel |
| `optimizeDeps` | Included Polaris + App Bridge | Preserved | Pre-bundling for dev performance | Slow or failed dev loads |

### `tsconfig.json`

| Aspect | Before | After | Why | Breaks if unchanged |
|--------|--------|-------|-----|---------------------|
| `include` | `env.d.ts`, `**/*.ts`, `**/*.tsx` | Added `.react-router/types/**/*` | RR7 typegen output | Route type imports fail |
| `types` | `["node"]` | `["@react-router/node", "vite/client", "@shopify/polaris-types"]` | RR7 server types + Polaris 13 types | Missing loader/action types |
| `rootDirs` | (absent) | `[".", "./.react-router/types"]` | Merge generated route types with source | `Route.LoaderArgs` etc. not found |

### `react-router.config.ts` (new file)

| Aspect | Before | After | Why | Breaks if missing |
|--------|--------|-------|-----|-------------------|
| File | Did not exist | `ssr: true` | Explicit SSR configuration for RR7 | Defaults work, but explicit is clearer for SSR apps |

```typescript
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
} satisfies Config;
```

### `.eslintrc.cjs`

| Aspect | Before | After | Why | Breaks if unchanged |
|--------|--------|-------|-----|---------------------|
| Extends | `@remix-run/eslint-config`, `/node`, `/jest-testing-library`, `prettier` | Manual overrides: `eslint:recommended`, React, TypeScript, import, jsx-a11y plugins | `@remix-run/eslint-config` removed; no RR equivalent package | `npm run lint` fails immediately |
| `react-router.config.ts` | N/A | Added to Node files override | Lint server-side config | — |

New devDependencies required: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`, `eslint-import-resolver-typescript`.

### `.eslintignore`

| Before | After | Why |
|--------|-------|-----|
| `shopify-app-remix` | `shopify-app-react-router` | Ignore generated/bundled Shopify package paths in lint |

### `.gitignore`

| Before | After | Why | Breaks if unchanged |
|--------|--------|-------|-----|---------------------|
| (no entry) | `.react-router/` | RR7 typegen writes generated types here | Generated files committed to git |

### `shopify.web.toml`

| Field | Before | After | Why | Breaks if unchanged |
|-------|--------|-------|-----|---------------------|
| `name` | `"remix"` | `"react-router"` | Accurate framework identifier | Cosmetic only |
| `dev` | `npm exec remix vite:dev -- --host` | `npm exec react-router dev -- --host` | Shopify CLI invokes RR7 dev server | CLI dev command fails |

### `env.d.ts`

| Before | After | Why | Breaks if unchanged |
|--------|--------|-------|-----|---------------------|
| `/// <reference types="@remix-run/node" />` | Removed | Types now via `tsconfig.json` `"types"` array | Reference to uninstalled package causes TS errors |
| `/// <reference types="vite/client" />` | Kept | Vite client types (`import.meta.env`) | — |

---

## 5. Server & Entry Files

### `server.js` (PM2 production server)

| Change | Before | After | Why | Breaks if unchanged |
|--------|--------|-------|-----|---------------------|
| Request handler import | `@remix-run/express` | `@react-router/express` | RR7 Express adapter | PM2 server throws on startup |
| Static assets `/build` | `public/build` (legacy Remix path) | Removed | RR7 outputs to `build/client/` | 404 on assets in production |
| Static assets `/assets` | `build/client/assets` | Preserved (path confirmed) | RR7 client build output | JS/CSS 404 in production |
| Static root | `public` + `build/client/assets` | `build/client` only | RR7 no longer uses `public/build` | Stale asset paths |
| Log message | "Shopify Remix App" | "Shopify React Router App" | Accurate | Cosmetic |

`compression` is now a declared dependency in `package.json` (was imported but missing from dependencies).

### `app/entry.server.tsx`

| Import / API | Before | After | Why | Breaks if unchanged |
|--------------|--------|-------|-----|---------------------|
| SSR component | `RemixServer` from `@remix-run/react` | `ServerRouter` from `react-router` | RR7 server rendering API | SSR returns blank/error |
| Context type | `EntryContext` from `@remix-run/node` | `EntryContext` from `react-router` | Type moved to core package | TypeScript error |
| Stream helper | `createReadableStreamFromReadable` from `@remix-run/node` | From `@react-router/node` | Package namespace change | Runtime import error |
| Context param name | `remixContext` | `reactRouterContext` | Naming clarity (behavior identical) | — |
| Bot streaming logic | `isbot` + `onAllReady`/`onShellReady` | Preserved | SEO/crawler compatibility | — |
| Shopify headers | `addDocumentResponseHeaders` | Preserved | Required for embedded app iframe headers | Embedded app security headers missing |

### `app/root.tsx`

| Import | Before | After | Why | Breaks if unchanged |
|--------|--------|-------|-----|---------------------|
| `Links`, `Meta`, `Outlet`, `Scripts`, `ScrollRestoration` | `@remix-run/react` | `react-router` | Package consolidation | Runtime import error |

HTML shell structure unchanged.

### `app/shopify.server.ts`

| Change | Before | After | Why | Breaks if unchanged |
|--------|--------|-------|-----|---------------------|
| Adapter import | `@shopify/shopify-app-remix/adapters/node` | `@shopify/shopify-app-react-router/adapters/node` | Shopify RR adapter | Server-side Shopify init fails |
| Server imports | `@shopify/shopify-app-remix/server` | `@shopify/shopify-app-react-router/server` | Package rename | All auth/session APIs unavailable |
| `future.unstable_newEmbeddedAuthStrategy` | `true` | Removed | Token exchange is now default in RR package | N/A — flag no longer exists |
| `future.removeRest` | `true` | Removed | Not in `FutureFlags` interface for RR package | TypeScript error |
| `future` | `{ unstable_newEmbeddedAuthStrategy, removeRest }` | `{}` | Only `expiringOfflineAccessTokens` available now (optional) | — |
| `useOnlineTokens` | `true` | Preserved | Required for HN user lookup via online session | `/api/user` returns wrong/no user |
| Redis session storage | Preserved | Preserved | Custom infrastructure unchanged | — |
| `ApiVersion.January25` | Preserved | Preserved | Current API version | — |

### `app/routes.ts`

| Before | After | Why | Breaks if unchanged |
|--------|-------|-----|---------------------|
| `flatRoutes` from `@remix-run/fs-routes` | `flatRoutes` from `@react-router/fs-routes` | Package namespace change | No routes discovered; all URLs 404 |

Route file naming conventions unchanged (`app._index.tsx` -> `/app`, etc.).

---

## 6. Route Files

### Migration pattern (applied to all 13 route modules)

Every route file received the same import substitutions:

| Before (Remix) | After (React Router v7) |
|----------------|-------------------------|
| `LoaderFunctionArgs`, `ActionFunctionArgs`, `HeadersFunction` from `@remix-run/node` | Same types from `react-router` |
| `redirect` from `@remix-run/node` | `redirect` from `react-router` |
| `Form`, `Link`, `Outlet`, `useLoaderData`, `useActionData`, `useRouteError` from `@remix-run/react` | Same exports from `react-router` |
| `@shopify/shopify-app-remix/server` | `@shopify/shopify-app-react-router/server` |
| `@shopify/shopify-app-remix/react` | `@shopify/shopify-app-react-router/react` |

**Loader/action logic was not changed.** This codebase already returned plain objects and `Response.json()` (not Remix's `json()` helper), which maps directly to RR7.

### Files changed

| File | Route URL | Changes |
|------|-----------|---------|
| `app/routes/_index/route.tsx` | `/` | Import migration only |
| `app/routes/app.tsx` | `/app` (layout) | Imports + `AppProvider isEmbeddedApp` -> `AppProvider embedded` |
| `app/routes/app._index.tsx` | `/app` (index) | Import migration only |
| `app/routes/app.restricted-page.tsx` | `/app/restricted-page` | Import migration only |
| `app/routes/auth.$.tsx` | `/auth/*` | Import migration only |
| `app/routes/auth.login/route.tsx` | `/auth/login` | Import migration only |
| `app/routes/auth.login/error.server.tsx` | (server helper) | Shopify package import path |
| `app/routes/api.user.tsx` | `/api/user` | Import migration only |
| `app/routes/api.user.privileges.tsx` | `/api/user/privileges` | Import migration only |
| `app/routes/api.user.$userId.privileges.hash.tsx` | `/api/user/:userId/privileges/hash` | Import migration only |
| `app/routes/webhooks.app.uninstalled.tsx` | `/webhooks/app/uninstalled` | Import migration only |
| `app/routes/webhooks.app.scopes_update.tsx` | `/webhooks/app/scopes_update` | Import migration only |

### File deleted

| File | Why |
|------|-----|
| `app/routes/services/hn.services.ts` | Orphan duplicate of `app/services/hn.services.ts` with broken relative imports; flatRoutes could register it as a spurious route |

### `AppProvider` prop change (`app/routes/app.tsx`)

| Before | After | Why | Breaks if unchanged |
|--------|-------|-----|---------------------|
| `<AppProvider isEmbeddedApp apiKey={apiKey}>` | `<AppProvider embedded apiKey={apiKey}>` | `@shopify/shopify-app-react-router` API rename | TypeScript error; App Bridge script not injected |

### `headers` export on layout routes

The `headers` export on `app/routes/app.tsx` was **already present before migration** and was **preserved**, not newly introduced:

```typescript
export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
```

**Why it is required on routes that call `authenticate.admin()`:** Shopify's `boundary.headers()` merges authentication-related response headers (including those thrown by redirect responses during OAuth) into the final HTTP response. Without it, embedded app OAuth redirects can lose required headers and break iframe authentication.

In [Shopify PR #1](https://github.com/Shopify/shopify-app-template-react-router/pull/1), `boundary.headers` was also added to `app._index.tsx` when adopting Remix's `v3_singleFetch` future flag (single-fetch changes how loader headers merge). This boilerplate did **not** enable single-fetch, so only the layout route (`app.tsx`) exports `headers`. If `v3_singleFetch` is enabled in a future change, add `headers` (and review `ErrorBoundary`) to every route module whose loader calls `authenticate.admin()` — matching PR #1's pattern.

Same applies to `ErrorBoundary` using `boundary.error(useRouteError())`.

**What breaks if removed:** OAuth redirect responses in embedded context may not include Shopify-required headers; users see auth loops or blank iframe.

---

## 7. Dockerfile

### History of changes

| Stage | Content | Context |
|-------|---------|---------|
| **Original (pre-migration)** | `node:18-alpine`, `npm ci --omit=dev`, `npm run build`, `CMD npm run docker-start` | Shopify Remix production template |
| **During migration** | Updated to `node:20-alpine` (RR7 requires Node >= 20.19) | Engine requirement |
| **Final (company standard)** | Matches `docker/local/app/Dockerfile` | User override |

### Current root `Dockerfile` (company standard)

```dockerfile
FROM node:22.14.0-alpine

RUN apk -U add --no-cache curl gcc g++ make ruby-full ruby-dev libffi-dev xdg-utils python3 py3-pip

WORKDIR /app

COPY . .

RUN npm install
```

### What the migration agent changed vs. what was overridden

| Aspect | Migration agent proposed | Company standard (final) | Why overridden |
|--------|------------------------|--------------------------|----------------|
| Base image | `node:20-alpine` | `node:22.14.0-alpine` | Company standard; satisfies `>=20.19` engines |
| Build deps | `openssl` only | `curl gcc g++ make ruby-full ...` | Native module compilation (e.g. Shopify CLI plugins, optional gems) |
| Install strategy | `npm ci --omit=dev` then `npm run build` | `COPY . .` + `npm install` | Dev-oriented image; volume-mounted local dev |
| `CMD` | `npm run docker-start` | (none) | Local dev container stays alive via `docker-compose`; no production CMD |
| Production build | Included in Dockerfile | Not included | Build run manually inside container (`npm run build`) |

### `docker/local/app/Dockerfile`

Unchanged — already matched company standard before migration. Root `Dockerfile` was aligned to match it.

### `docker-start` script

Added to `package.json` during migration for production Docker CMD compatibility:

```json
"docker-start": "npm run start"
```

Currently unused by the company-standard Dockerfile (no CMD), but available if a production Dockerfile with `CMD ["npm", "run", "docker-start"]` is reintroduced.

---

## 8. Breaking Changes & Risks

### Framework layer

| Risk | Severity | What to watch | Mitigation |
|------|----------|---------------|------------|
| RR7 exact version pinning | Medium | Any `@react-router/*` version drift causes peer conflicts | Keep all six packages at identical version |
| `@remix-run` imports remaining | High | Any missed import causes runtime/build failure | `find app -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -H "@remix-run" {} +` |
| Route typegen | Low | `.react-router/types/` must be generated before strict tsc | Run `react-router typegen` or `npm run typecheck` |

### Redis session storage (4.x -> 6.x)

| Aspect | Detail |
|--------|--------|
| **What changed** | `@shopify/shopify-app-session-storage-redis` major bump to align with `@shopify/shopify-api@13` |
| **What to test** | Fresh app install (OAuth), session persistence across restarts, reinstall after uninstall webhook |
| **What breaks** | Existing Redis session keys *may* be incompatible if storage format changed — users may need to re-authenticate |
| **Config** | `sessionKeyPrefix: process.env.SHOPIFY_API_KEY` preserved in `shopify.server.ts` |

### Polaris (12.x -> 13.x)

| Aspect | Detail |
|--------|--------|
| **What changed** | `@shopify/polaris@^13.9.5`; added `@shopify/polaris-types` for TS |
| **What to test** | Login page (`/auth/login`), app shell, `Text`, `Page`, `Card`, `TextField`, `Button`, NavMenu, TitleBar |
| **What breaks** | Visual regressions, deprecated prop warnings, CSS size changes (444 KB Polaris CSS bundle) |
| **Not changed** | Still using React components — not Polaris Web Components |

### Node engine requirement

| Before | After | Impact |
|--------|-------|--------|
| `^18.20 \|\| ^20.10 \|\| >=21.0.0` | `>=20.19 <22 \|\| >=22.12` | Node 18 environments fail (`.npmrc` has `engine-strict=true`) |

**Affected environments:** CI runners, PM2 hosts, any Docker image still on Node 18. Local docker-compose uses Node 22.14.0 (OK).

### Shopify SDK behavior changes

| Change | Impact |
|--------|--------|
| `unstable_newEmbeddedAuthStrategy` removed | Token exchange is default; no action needed |
| `removeRest` removed from future flags | REST Admin API already disabled in prior config |
| `config.future.expiringOfflineAccessTokens undefined` log | Informational only; optional to enable `expiringOfflineAccessTokens: true` later |
| `AppProvider` prop rename | Must use `embedded` not `isEmbeddedApp` |

### Alpine BusyBox grep

The verification command `grep --include` fails on Alpine BusyBox. Use:

```sh
find app -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -H "@remix-run" {} +
```

---

## 9. Manual Verification Checklist

### Automated checks (inside container)

```sh
# 1. No Remix imports
find app -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -H "@remix-run" {} +
# Expected: no output

# 2. TypeScript
npx tsc --noEmit
# Expected: exit 0

# 3. Production build
npm run build
# Expected: react-router build succeeds (client + SSR bundles)
```

From host:

```sh
docker compose exec app sh -c "npx tsc --noEmit"
docker compose exec app sh -c "npm run build"
```

### Dev server

- [ ] `npm run dev` starts without errors
- [ ] Shopify CLI reports `react-router` (not `remix`)
- [ ] `shopify-api/INFO version 13.0.0, environment React Router` in logs
- [ ] Dev tunnel URL loads in browser

### OAuth install flow

- [ ] Install app on dev store (or re-open after migration)
- [ ] OAuth completes without redirect loops
- [ ] Redis session created (`Creating new session` in logs)
- [ ] Both offline and online tokens created (`useOnlineTokens: true`)
- [ ] `APP_UNINSTALLED` webhook delivers successfully

### Embedded app UI

- [ ] App loads inside Shopify Admin iframe
- [ ] `/app` home page renders
- [ ] NavMenu links work (`/app`, `/app/restricted-page`)
- [ ] `/auth/login` standalone login form renders with Polaris styling
- [ ] `/` public landing page loads

### Privilege system (custom HN layer)

Requires `.env` values: `REDIS_CONNECTION_URL`, `HN_GRAPHQL_ENDPOINT`, `APPLICATION_ID`, `VITE_PRIVILEGE_ENCRYPTION_KEY`, Shopify API credentials.

- [ ] `PrivilegeScreen` loading state appears
- [ ] `GET /api/user` -> 200 with staff user (id, email, name)
- [ ] `GET /api/user/privileges` -> 200 with privileges array
- [ ] `GET /api/user/:userId/privileges/hash` -> 200 with hash
- [ ] Hash polling every 60s (no console errors)
- [ ] `/app/restricted-page` gates access per `privilege.config.ts`
- [ ] Encrypted sessionStorage cache works across page reload

### PM2 production setup

On host with Node >= 20.19 and env vars configured (see `ecosystem.config.cjs`):

- [ ] `npm run build` succeeds
- [ ] `npm run pm2:start` starts HNUK + HNIE instances
- [ ] Static assets served from `/assets/*` (no 404)
- [ ] SSR pages render (not blank)
- [ ] `server.js` logs show correct `HN_API_APP_SITE`, shop, port

`ecosystem.config.cjs` required **no changes** — PM2 stayed on 6.x.

### Docker build

- [ ] `docker compose up --build -d` succeeds
- [ ] `docker compose exec app node -v` -> `v22.14.0`
- [ ] `docker compose exec app npm install` succeeds
- [ ] `docker compose exec app npm run build` succeeds
- [ ] `docker compose exec app npm run dev` starts Shopify CLI + RR7 dev server

---

## 10. What Was Not Changed and Why

### Polaris Web Components (deferred — follow-up PR)

| Decision | Stay on React components (`@shopify/polaris` JSX) for this PR |
|----------|----------------------------------------------------------------|
| **Why not Web Components yet** | Polaris Web Components ([App Home docs](https://shopify.dev/docs/api/app-home/web-components)) use CDN-loaded custom elements (`<s-page>`, `<s-button>`, etc.) — a full UI rewrite, not a framework migration step. |
| **Shopify precedent** | [PR #1's final commit](https://github.com/Shopify/shopify-app-template-react-router/pull/1) (`Shopify App: Convert @shopify/polaris UI to Polaris web components`) landed **after** all RR7/framework commits — same separation this boilerplate follows. |
| **Already prepared** | `@shopify/polaris-types` in `tsconfig.json` — recommended by Shopify for Web Component TypeScript support when the UI PR happens. |
| **Do not prep now** | Do not add `polaris.js` CDN to `root.tsx` while React Polaris is still in use — loads two Polaris systems and can cause style conflicts. |
| **Future PR scope** | Remove `@shopify/polaris` npm package; add `polaris.js` + `shopify-api-key` meta to `root.tsx`; rewrite 6 UI files; remove Polaris CSS `links()` exports. |

### PM2 (stayed on 6.x)

| Decision | `pm2@^6.0.14` (not 7.0.1) |
|----------|---------------------------|
| **Why not PM2 7** | Major version bump unrelated to RR migration. PM2 7 refactored internals (TreeKill rewrite, OpenTelemetry deps, Node 18+ requirement) but **`ecosystem.config.cjs` requires no changes**. |
| **PM2 7 breaking changes** | Node >= 18 (already satisfied), internal dependency refactor, process termination logic changes. |
| **Risk of upgrading** | Unnecessary production process manager change during framework migration. |

### React 18 (not 19)

| Decision | `react@^18.3.1`, `react-dom@^18.3.1` |
|----------|--------------------------------------|
| **Why not React 19** | `@shopify/polaris@13.9.5` peer dependency is `react: ^18.0.0`. React 19 would cause peer dependency warnings/conflicts. |
| **Risk of React 19** | Polaris compatibility unverified; potential runtime issues in embedded app context. |

### Vite 6 (not 8)

| Decision | `vite@^6.4.2` (not 8.0.13) |
|----------|----------------------------|
| **Why not Vite 8** | Vite 8 uses Rolldown as bundler (major architectural change from Rollup/esbuild). Higher regression risk for Shopify + RR7 plugin chain. |
| **Compatibility** | `@react-router/dev@7.15.1` peers accept Vite 5/6/7/8, but Shopify official RR template uses Vite 6. |
| **Risk of Vite 8** | Build pipeline changes, plugin incompatibilities, harder to diagnose SSR/asset issues during migration. |

Also not upgraded (with rationale):

| Item | Decision | Why |
|------|----------|-----|
| **TypeScript 6** | Stayed on 5.9.3 | ESLint/typescript-eslint v6 ecosystem; RR7 supports both but 5.x is safer |
| **ESLint 10** | Stayed on 8.57.1 | ESLint 10 requires flat config; no drop-in `@react-router/eslint-config` |
| **Express 5** | Stayed on 4.21.2 | `@react-router/serve` depends on Express 4 |
| **README.md / CHANGELOG.md** | Not updated | Out of migration scope; still reference Remix |

---

## Appendix: Quick Reference

### Verify migration is complete

```sh
# Inside container (/app)
find app -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -H "@remix-run" {} +
npx tsc --noEmit
npm run build
```

### Key file locations

| Purpose | File |
|---------|------|
| Shopify server config | `app/shopify.server.ts` |
| SSR entry | `app/entry.server.tsx` |
| Route config | `app/routes.ts` |
| RR7 config | `react-router.config.ts` |
| PM2 production server | `server.js` |
| PM2 config | `ecosystem.config.cjs` |
| Local Docker | `docker-compose.yml`, `docker/local/app/Dockerfile` |
| Root Docker | `Dockerfile` |

### Official references

These were used during planning and execution of this migration:

- [Shopify React Router app template](https://github.com/Shopify/shopify-app-template-react-router) — **primary reference implementation** (see [Reference: Shopify official React Router template](#reference-shopify-official-react-router-template) in Overview)
- [**Shopify PR #1 — Upgrade to React Router**](https://github.com/Shopify/shopify-app-template-react-router/pull/1) — Shopify's own commit-by-commit migration diff; validates file-level changes and Polaris Web Components as a separate final step
- [Shopify RR upgrade wiki](https://github.com/Shopify/shopify-app-template-react-router/wiki/Upgrading-from-Remix) — Remix -> RR migration guide from Shopify
- [React Router upgrading from Remix](https://reactrouter.com/upgrading/remix) — Official RR7 upgrade guide (codemod, scripts, type safety)
- [Polaris Web Components (App Home)](https://shopify.dev/docs/api/app-home/web-components) — Target UI stack for planned follow-up PR
- [React Router v7 docs](https://reactrouter.com/) — Framework documentation
