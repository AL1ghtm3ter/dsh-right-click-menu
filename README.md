# dsh-file-context-menu

A Codex-style right-click file menu for the DSH web GUI.

## What it does

Right-click a **file** or **folder** in either of these places and a menu opens:

| Surface | How the target is found |
|---|---|
| The right Sidebar's **文件** (file tree) tab | the row markup's `data-files-path` / `data-files-entry`, with the workspace root from `data-files-root` |
| A **path written in a chat message** | the code element under the pointer, else the token under the caret (quoted paths included), else the selection — confirmed against the Host before the menu opens |

Menu rows (Codex's seven plus extras DSH makes cheap):

| Row | Action |
|---|---|
| 在 DSH 中预览 / 在文件树中展开 | the tree row's own gesture, or `sidebarRight.openResource("dsh-resource://file/session/…")` |
| 在默认应用中打开 | `remote.session.openWorkspacePath({ path })` |
| 打开方式 ▸ | `remote.session.workspacePathApplications({ path })`, then `openWorkspacePath({ path, application })` |
| 在资源管理器中打开 | `remote.session.openWorkspacePath({ path, action: "reveal" })` |
| 复制路径 | clipboard, absolute path |
| 复制相对路径 | clipboard, workspace-relative path |
| 复制文件名 | clipboard |
| 复制文件内容 | the `/dsh-file-menu/read` route, falling back to paged `remote.workspaceFiles.read` |
| 另存为… | a real Save-As dialog when the browser has `showSaveFilePicker`, otherwise the `directoryPicker` Remote plus the `/save-as` route |

Anything that is **not** a file target is left completely alone: no `preventDefault`, so the
native browser menu still appears for text, links, message actions, code blocks, and the
JSON copy control. A path-shaped token the Host does not know reports
`工作区里没有找到 <path>` instead of silently swallowing the right-click.

## Layout

```
dsh-file-context-menu/
├── package.json          name = Loader row name = the id in lib/client.js
├── cordis.patch.yml      the bundle's one composition layer (the host row)
├── README.md
└── lib/
    ├── index.js          host half — six fenced routes under /dsh-file-menu
    └── client.js         browser half — hand-written `__ModuleLoader__.load` bundle
```

The two halves are independent by design:

* the **host half** imports nothing but Node built-ins and uses only the composed
  `webServer` + `connection` services, so a composition without them just leaves it inert;
* the **browser half** requires only the three platform seed modules
  (`react`, `react/jsx-runtime`, `@deepseek-ai/dsh-client-ui-primitives`) and reads every
  DSH capability through scoped injections, so a missing optional namespace degrades one
  menu row instead of the whole plugin.

## Host routes

All routes sit behind `ctx.connection.requestRejection(req)` (Host/Origin fence plus
browser authentication) and validate method, `application/json`, a 64 KiB body ceiling,
and absolute paths before touching the filesystem.

| Route | Purpose |
|---|---|
| `GET /dsh-file-menu/ping` | liveness probe the browser half can use to pick a strategy |
| `GET /dsh-file-menu/raw?path=` | raw bytes, for a browser-side Save As |
| `POST /dsh-file-menu/stat` | `{ path }` → `{ exists, kind, size, mtimeMs }` |
| `POST /dsh-file-menu/read` | `{ path }` → `{ text, binary, truncated, size }` (1 MiB cap) |
| `POST /dsh-file-menu/save-as` | `{ from, to }` → byte copy |
| `POST /dsh-file-menu/write-text` | `{ path, text }` → UTF-8 write (fallback path) |

## Install

Through the plugin manager:

```
plugin_manager  action: install_bundle  target: <absolute path to this directory>
```

which runs the profile's own pnpm and appends the package to `dsh.profile.bundles`.
The equivalent CLI, with DSH fully quit first:

```
dsh plugin --profile desktop add link:D:\Agent任务\DSH任务\dsh-file-context-menu
```

Verify afterwards:

* host half — `http://127.0.0.1:19387/dsh-file-menu/ping` answers `401` (fenced) rather
  than `404` (no such route);
* browser half — `cordis_inspect_query client Slots listSubTree { root: "shell.overlay" }`
  lists an occupant `file-context-menu`.

## Uninstall / rollback

`plugin_manager remove_bundle` with target `dsh-file-context-menu` deselects the bundle,
removes the dependency, and unloads it. Manually, that means removing
`dsh-file-context-menu` from `dsh.profile.bundles` and from `dependencies` in
`%USERPROFILE%\.dsh\profiles\desktop\package.json`, then restarting. No shipped file is
modified.

## Editing it while it runs

* `lib/client.js` is hand-written browser JavaScript — no build step. A **new** client row
  reaches an open page, but an already-loaded bundle needs a **page reload** (Ctrl+R);
  the bundle URL carries a revision derived from mtime/size, so a reload picks up edits.
* The **host half** is not re-imported by a page reload or by toggling the row: Node's ESM
  cache keeps the old module generation, so **restart the app** to load host-side edits.
* Rewriting browser code while a page is open is safe only after that reload — a stale
  bundle keeps running until then.

## Development note: nested Remote namespaces

Cordis resolves `ctx.remote.<namespace>` as the virtual service `remote.<namespace>`, and
its context proxy throws

```
cannot get property "remote.workspaceFiles" without inject
```

on any fiber that did not inject that dotted name. This plugin therefore binds each
namespace once, per namespace, through a scoped injection:

```js
ctx.inject(["remote", "remote.workspaceFiles"], (scope) => {
  remotes.files = scope.remote.workspaceFiles;
});
```

Doing it per namespace (rather than listing all of them in the plugin's `inject`) keeps one
absent namespace from parking the whole plugin fiber in a `pending` state. Plain service
properties are unaffected — `ctx.get("sessions").list` is a real property and needs no
injection.

## Known limitations

* **The chat surface is text heuristics.** A token must look like a path (absolute, or
  containing a separator, or a file name inside code markup, or a bare `name.ext`) *and*
  the Host must confirm it exists. A path the scanner cannot see (spaces without quotes, a
  path split across elements, text only in an `alt`/`title` attribute) is skipped.
* **A bare name that is not a workspace-root path** is resolved through the same `@file`
  search the composer uses; when that search has no candidate, the name is not offered.
* **The tree surface has no per-row extension point in DSH**, so this plugin keys a
  delegated `contextmenu` listener off the tree's DOM contract
  (`data-files-path` / `data-files-entry` / `data-files-root`). A markup change disables
  the tree surface only.
* **另存为 has no native DSH dialog to reuse.** It uses the browser's own Save-As picker
  when available, else the directory picker plus a host-side copy, so renaming is only
  possible in the first form.
* **`打开方式` lists the OS associations** the Host reports; a handler installed while the
  page is open appears after a reload (the same rule the shipped open-in-app controls
  follow).
* **Destructive rows are deliberately absent** — no rename, move, or delete.
* Reveal is labelled 在资源管理器中打开 on every platform: the Session Remote reports that a
  desktop exists, not which file manager it runs.

## Verified in this installation

Checked against DSH `0.2.0-rc.2` on Windows, profile `desktop`:

* file-tree rows and chat paths both open the menu;
* 复制路径, 复制文件内容, 在默认应用中打开, 在资源管理器中打开, 打开方式 ▸,
  另存为…, and 在 DSH 中预览 were each exercised successfully;
* right-clicks on non-file text keep the native browser menu.
