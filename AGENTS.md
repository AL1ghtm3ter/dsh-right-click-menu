# Agent notes

This repository is a single DSH plugin package that is also a profile bundle. It has no
build step: the files in the repository are the files DSH loads.

## Install and verify

```
plugin_manager  action: install_bundle  target: github:AL1ghtm3ter/dsh-right-click-menu
```

Shell equivalent (DSH quit first): `dsh plugin --profile <profile> add github:AL1ghtm3ter/dsh-right-click-menu`.

Read the result's `application` field, not the logs: `applied` means live,
`restart-required` means the Host half waits for the next application start.

* Host half — use a route-backed row (复制文件内容 / 另存为…): those need
  `/dsh-right-click-menu/*`. An anonymous probe of that path is answered by the connection
  fence before routing, so its status alone is not a route test: `401` on a deployment that
  fences per route, `403` (including for paths that do not exist) on one that gates the
  whole server.
* Browser half — `cordis_inspect_query` on the client `Slots` provider, `listSubTree`
  `{"root": "shell.overlay"}`, lists an occupant `right-click-menu`.
* Both halves are exercised by the user in the DSH web UI: right-click a file-tree row, a
  file path in a chat message, and a hyperlink.

## Invariants

* `package.json` `name` == the `cordis.patch.yml` row `name` == the id in
  `lib/client.js`'s `window.__ModuleLoader__.load({ id })`. Change one and the browser half
  loads without registering itself.
* `dsh.bundle.patch` and `exports["./client"]` are both required: the first makes the
  package installable, the second gives it a browser half.
* The browser half requires only platform seed modules (`react`, `react/jsx-runtime`,
  `@deepseek-ai/dsh-client-ui-primitives`) and reaches DSH through `ctx`. Do not add an
  import of another `@deepseek-ai/*` package.
* Every nested Remote namespace is bound once, per namespace, through a scoped injection
  (`ctx.inject(["remote", "remote.workspaceFiles"], …)`). Property access such as
  `ctx.remote.workspaceFiles` throws without it.
* The Host half imports Node built-ins only, and every route asks
  `connection.requestRejection` first.
* Never write the profile's `package.json` or `cordis.patch.yml` by hand and never run pnpm
  inside the profile: `plugin_manager` performs those steps.
* Keep the surfaces honest: a right-click that is not on a file or a link must not be
  intercepted, and a path the Host cannot resolve must report itself rather than open an
  empty menu.

## Surfaces and the DOM they key off

| Surface | Contract |
|---|---|
| File tree row | `[data-files-path][data-files-entry]`, root from `[data-files-state='tree'][data-files-root]` |
| Chat file mention | `button[class*="fileLink"]` with `title="<path>"` |
| Hyperlink | `a[href]`; the anchor's own click is what opens it |
| Session context | `[data-conversation-session]`, `[data-sidebar-right-session]`, else `ctx.get("uiSession")` |

These are the shipped UI's markup, not a published API: if a surface stops responding,
re-read the owning package's `lib/client.js` before changing selectors.

## Development loop

| Change | Live after |
|---|---|
| `lib/client.js` | a page reload (the bundle URL carries an mtime/size revision) |
| `lib/index.js` | an application restart (Node's ESM cache keeps the old module generation) |
| `locale/*.json`, `package.json` metadata | a page reload |

Iterate with a path install so edits need no reinstall:
`dsh plugin --profile <profile> add link:<absolute path>`.

## Release checklist

1. Bump `version` in `package.json`.
2. `npm pack --dry-run` — the tarball must contain exactly `lib/`, `cordis.patch.yml`,
   `icon.svg`, `locale/*.json`, `README.md`, `README.en.md`, `LICENSE`, `package.json`.
3. Commit and push to `main`.
4. Publish the GitHub release with the asset named **`dsh-right-click-menu.tgz`** (no
   version in the name): the community catalog entry points at
   `releases/latest/download/dsh-right-click-menu.tgz`, so a version-free asset name keeps
   that link valid across releases.
   `gh release create vX.Y.Z <packed file> --repo AL1ghtm3ter/dsh-right-click-menu`
5. `npm publish`, once logged in as the account that owns the name (optional for listing).
6. The catalog entry (`data/plugins/AL1ghtm3ter__dsh-right-click-menu.yml` upstream) needs
   no change on a release. When the description changes, edit that one file in a PR against
   `awesome-dsh-plugin/awesome-dsh-plugin` — never the generated READMEs.

## Self-check before submitting a change

```sh
node --check lib/index.js
node --check lib/client.js
```

Then confirm the two dictionaries in `lib/client.js` still hold the same key set, and that
every `t("…")` key exists in both.
