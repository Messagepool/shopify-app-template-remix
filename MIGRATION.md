# Remix -> React Router v7 Migration

Technical summary for reviewing **PR: `feature/migration-rr-to-remix` -> `main`**.

**Reference:** [Shopify/shopify-app-template-react-router](https://github.com/Shopify/shopify-app-template-react-router) · [Upgrading from Remix wiki](https://github.com/Shopify/shopify-app-template-react-router/wiki/Upgrading-from-Remix) · [Shopify PR #1](https://github.com/Shopify/shopify-app-template-react-router/pull/1)

---

## TL;DR 

Remix and React Router v7 share the same model (loaders, actions, file routes, SSR). **This migration is mostly package and import renames** - custom business logic (HN privileges, Redis sessions, GraphQL) is unchanged.

| Area | Change level |
|------|----------------|
| Route loaders/actions | **No logic changes** |
| Privilege layer | **Unchanged** |
| Redis session storage | **Unchanged** |
| Framework imports | **Renamed** (`@remix-run/*` -> `react-router` / `@react-router/*`) |
| Shopify SDK | **Swapped** (`@shopify/shopify-app-remix` -> `@shopify/shopify-app-react-router`) |
| UI | **Polaris React kept** - Web Components deferred to a follow-up PR |

**Out of scope for this PR:** PM2 deployment files (`server.js`, `ecosystem.config.cjs`) were removed per review focus. The `pm2` package and npm scripts remain in `package.json` for a future deployment PR.

---

## Why migrate

1. Remix merged into React Router v7 - Remix is maintenance-only.
2. Shopify's supported path is `@shopify/shopify-app-react-router` and the [official RR template](https://github.com/Shopify/shopify-app-template-react-router).
3. Aligns session storage and CLI tooling with current Shopify packages.

---

## Files changed (30)

### Migration-related

| File | Change |
|------|--------|
| `package.json` | Remix -> RR7 deps; Shopify SDK swap; script renames; dependency upgrades |
| `vite.config.ts` | `remix()` plugin -> `reactRouter()`; removed `installGlobals` and Remix future flags |
| `tsconfig.json` | RR7 types, `.react-router/types`, `rootDirs` |
| `react-router.config.ts` | **New** - `ssr: true` |
| `shopify.web.toml` | Dev command: `react-router dev` |
| `.eslintrc.cjs` | Replaced `@remix-run/eslint-config` with manual React/TS/import plugins |
| `.eslintignore` | `shopify-app-remix` -> `shopify-app-react-router` |
| `.gitignore` | Added `.react-router/` |
| `env.d.ts` | Removed `@remix-run/node` reference |
| `app/entry.server.tsx` | `RemixServer` -> `ServerRouter`; imports from `react-router` / `@react-router/node` |
| `app/root.tsx` | Imports from `react-router` |
| `app/routes.ts` | `@react-router/fs-routes` |
| `app/shopify.server.ts` | `@shopify/shopify-app-react-router`; removed Remix-only `future` flags |
| `app/routes/**/*.tsx` (13 files) | Import path updates only - see [Route migration pattern](#route-migration-pattern) |
| `app/routes/auth.login/error.server.tsx` | Shopify package import path |

### Also in this branch (not part of the framework migration)

| File | Note |
|------|------|
| `Dockerfile` | Company local-dev image change - separate from RR migration |
| `shopify.app.toml` | Deleted (already gitignored; per-env `shopify.app.*.toml` files are used) |

---

## Package changes

### Removed (Remix)

| Package | Replaced by |
|---------|-------------|
| `@remix-run/dev` | `@react-router/dev@7.15.1` |
| `@remix-run/node` | `@react-router/node@7.15.1` |
| `@remix-run/react` | `react-router@7.15.1` |
| `@remix-run/serve` | `@react-router/serve@7.15.1` |
| `@remix-run/fs-routes` | `@react-router/fs-routes@7.15.1` |
| `@remix-run/eslint-config` | Manual ESLint config + plugins |
| `@remix-run/route-config` | (removed - unused) |
| `@shopify/shopify-app-remix` | `@shopify/shopify-app-react-router@^1.2.0` |
| `resolutions` / `overrides` block | Removed - no longer needed with `@shopify/api-codegen-preset@2.x` |

> **Note:** “Breaks if kept” in older notes meant keeping the **old Remix package**, not keeping app files like routes.

### Added (React Router)

All `@react-router/*` and `react-router` are **exact-pinned to `7.15.1`** (peer dependency requirement).

| Package | Purpose |
|---------|---------|
| `react-router` | Core runtime (loaders, components, SSR types) |
| `@react-router/dev` | Vite plugin + `react-router build/dev/typegen` CLI |
| `@react-router/node` | Server streams (`createReadableStreamFromReadable`) |
| `@react-router/fs-routes` | File-based routing in `app/routes.ts` |
| `@react-router/serve` | `npm start` via `react-router-serve` |
| `@react-router/express` | Express adapter (kept for future custom server / PM2 work) |
| `@shopify/shopify-app-react-router` | OAuth, sessions, App Bridge, `boundary` helpers |

`@react-router/dev` is in **`dependencies`** (not `devDependencies`) - same as the pre-migration Remix setup and [Shopify's RR template](https://github.com/Shopify/shopify-app-template-react-router). This ensures `npm run build` works in Docker images that use `npm ci --omit=dev`.

### Upgraded (selected)

| Package | Before -> After |
|---------|----------------|
| `@shopify/shopify-app-session-storage-redis` | ^4.2.11 -> ^6.0.0 |
| `@shopify/polaris` | ^12.0.0 -> ^13.9.5 |
| `@shopify/api-codegen-preset` | ^1.1.1 -> ^2.0.0 |
| `react` / `react-dom` | ^18.2.0 -> ^18.3.1 |
| `vite` | ^6.2.2 -> ^6.4.2 |
| Node engines | `^18.20 \|\| ^20.10 \|\| >=21` -> `>=20.19 <22 \|\| >=22.12` |

### PM2 (package only - files out of scope)

| Item | Status in this PR |
|------|-------------------|
| `pm2` dependency | Kept / added in `package.json` |
| `pm2:*` npm scripts | Present (reference `ecosystem.config.cjs`) |
| `server.js`, `ecosystem.config.cjs` | **Removed** - follow-up deployment PR |
| `@react-router/express`, `express`, `compression` | Kept in `package.json` for future PM2 server setup |

---

## Script changes

| Script | Before | After |
|--------|--------|-------|
| `build` | `remix vite:build` | `react-router build` |
| `start` | `remix-serve ./build/server/index.js` | `react-router-serve ./build/server/index.js` |
| `typecheck` | (none) | `react-router typegen && tsc --noEmit` |
| `lint` | (no ignore-path) | `--ignore-path .gitignore` added |

Dev flow unchanged: `npm run dev` -> `run-p auth develop` -> Shopify CLI reads `shopify.web.toml`.

---

## Config changes

### `vite.config.ts`

- Plugin: `vitePlugin as remix` -> `reactRouter()` from `@react-router/dev/vite`
- Removed: `installGlobals()`, Remix `future` flags block
- Preserved: Shopify `HOST` / `SHOPIFY_APP_URL` workaround, HMR config, `allowedHosts`

### `tsconfig.json`

- `include`: added `.react-router/types/**/*`
- `types`: `node` -> `@react-router/node`, `vite/client`, `@shopify/polaris-types`
- `rootDirs`: `[".", "./.react-router/types"]`

### `shopify.web.toml`

```toml
name = "react-router"
dev = "npm exec react-router dev -- --host"
```

---

## Application code

### `app/entry.server.tsx`

| Before | After |
|--------|-------|
| `RemixServer` from `@remix-run/react` | `ServerRouter` from `react-router` |
| `EntryContext`, streams from `@remix-run/node` | From `react-router` / `@react-router/node` |
| Param `remixContext` | `reactRouterContext` |

Bot streaming, Shopify `addDocumentResponseHeaders`, and timeout logic unchanged.

### `app/shopify.server.ts`

| Change | Detail |
|--------|--------|
| Adapter + imports | `@shopify/shopify-app-react-router` |
| `future.unstable_newEmbeddedAuthStrategy` | Removed - default in RR package |
| `future.removeRest` | Removed - REST not in RR package |
| Redis, `useOnlineTokens`, `ApiVersion.January25` | **Unchanged** |

### `app/routes/app.tsx` (only non-import route change)

```tsx
// Before
<AppProvider isEmbeddedApp apiKey={apiKey}>

// After
<AppProvider embedded apiKey={apiKey}>
```

`boundary.headers`, `ErrorBoundary`, `NavMenu`, and `AppPrivilegeProvider` unchanged.

### Route migration pattern

Every route file uses the same substitutions:

| Before (Remix) | After (RR7) |
|----------------|-------------|
| Types from `@remix-run/node` | From `react-router` |
| Components/hooks from `@remix-run/react` | From `react-router` |
| `@shopify/shopify-app-remix/server` | `@shopify/shopify-app-react-router/server` |
| `@shopify/shopify-app-remix/react` | `@shopify/shopify-app-react-router/react` |

**Loader and action logic was not modified.**

| File | URL |
|------|-----|
| `app/routes/_index/route.tsx` | `/` |
| `app/routes/app.tsx` | `/app` (layout) |
| `app/routes/app._index.tsx` | `/app` |
| `app/routes/app.restricted-page.tsx` | `/app/restricted-page` |
| `app/routes/auth.$.tsx` | `/auth/*` |
| `app/routes/auth.login/route.tsx` | `/auth/login` |
| `app/routes/api.user.tsx` | `/api/user` |
| `app/routes/api.user.privileges.tsx` | `/api/user/privileges` |
| `app/routes/api.user.$userId.privileges.hash.tsx` | `/api/user/:userId/privileges/hash` |
| `app/routes/webhooks.app.uninstalled.tsx` | `/webhooks/app/uninstalled` |
| `app/routes/webhooks.app.scopes_update.tsx` | `/webhooks/app/scopes_update` |

---

## Unchanged

- HN privilege system (GraphQL, polling, encryption, `withPrivilege`)
- Redis session storage configuration
- `auth.js` local OAuth proxy
- Polaris React UI (login still uses `PolarisAppProvider`)
- Multi-site env prefix pattern (`shopify.app.*.toml`)

---

## Deferred (follow-up PRs)

| Item | Reason |
|------|--------|
| **Polaris Web Components** | Shopify PR #1 landed UI migration as a separate final commit |
| **PM2 production server** | `server.js` + `ecosystem.config.cjs` removed from this PR; packages kept for next step |
| **`future.expiringOfflineAccessTokens: true`** | Optional Shopify flag |
| **`lang="en"` on `<html>`** | Minor a11y tweak from official template |

---

## Verification

```bash
# No remaining Remix imports
find app -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -H "@remix-run" {} +

npm run typecheck
npm run build
npm run dev   # OAuth, embedded app, webhooks
```

All passed during migration.

---

## Comparison to Shopify PR #1

This PR follows the same core steps as [Shopify PR #1](https://github.com/Shopify/shopify-app-template-react-router/pull/1):

- RR7 package swap (manual equivalent of `npx codemod remix/2/react-router/upgrade`)
- `@shopify/shopify-app-react-router` + `AppProvider embedded`
- ESLint config without `@remix-run/eslint-config`
- `shopify.web.toml` dev command update

**Intentional differences:**

- Polaris Web Components not migrated yet
- `v3_singleFetch` not enabled (was already off pre-migration)
- Redis instead of Prisma
- PM2 deployment files excluded from this PR
