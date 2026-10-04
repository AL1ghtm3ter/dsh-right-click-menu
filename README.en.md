# dsh-right-click-menu

A Codex-style right-click menu for the DSH web UI: **files**, **chat file paths**, and **hyperlinks**.

[中文](README.md) | English

> **For agents — one line:** *"Install the DSH right-click menu: call `plugin_manager` with `action: install_bundle` and `target: github:AL1ghtm3ter/dsh-right-click-menu`, then tell me to right-click a file or a link in the DSH web UI."*
> See [For agents](#for-agents) for the exact specs, the shell equivalent, and how to verify.

---

## What it does

Right-click a file, a file path, or a link anywhere in the DSH web UI and a menu opens
with the actions that object actually supports.

| You right-click | How it is recognized | What you get |
|---|---|---|
| A row in the right Sidebar's **文件** tab | the row's own `data-files-path` / `data-files-entry` markup | file rows |
| A **file path in a chat message** (inline code or prose) | the token under the pointer, confirmed against the Host first | file rows |
| A **file mention the chat renders** | the mention button's `title` attribute | file rows |
| A **hyperlink** | the anchor's `href` | link rows (+ file rows when the link names a file) |

**File rows**

| Row | What it does |
|---|---|
| 在 DSH 中预览 / 在文件树中展开 | opens the file in DSH's own preview (or expands the folder) |
| 在默认应用中打开 | `session.openWorkspacePath` — the OS default application |
| 打开方式 ▸ | the associated applications the Host reports, one entry each |
| 在资源管理器中打开 | reveals the file in the file manager |
| 复制路径 | absolute path to the clipboard |
| 复制相对路径 | workspace-relative path |
| 复制文件名 | the last path segment |
| 复制文件内容 | reads the file and copies its text (1 MiB cap, binary is refused) |
| 另存为… | the browser's Save-As dialog when available, otherwise the directory picker plus a host-side copy |

**Link rows**

| Row | What it does |
|---|---|
| 在侧边栏中打开 | opens the link in the right Sidebar's browser tab |
| 在外部浏览器中打开 | hands the link to the system's default browser |
| 复制链接地址 | the `href` |
| 复制链接文字 | the anchor's visible text |
| 复制为 Markdown 链接 | `[text](href)`, ready to paste into a document or a prompt |

A link that names a file — a `dsh-resource://file/…` address, a `file://` URL, or the
`api/file?path=…` media route — gets the link rows **and** the file rows in one menu.

**Nothing else is intercepted.** A right-click that is not on a file or a link keeps the
browser's own menu, so text selection, message actions, code blocks, and the JSON copy
control keep working exactly as before. A path-shaped token the Host does not recognize
answers `工作区里没有找到 <path>` instead of silently swallowing the click.

---

## Install

In the Web UI: sidebar **Plugins → Add plugin**, paste a spec, **Install**.

| Source | Spec to paste |
|---|---|
| GitHub | `github:AL1ghtm3ter/dsh-right-click-menu` |
| Release tarball | `https://github.com/AL1ghtm3ter/dsh-right-click-menu/releases/latest/download/dsh-right-click-menu.tgz` |
| A local checkout | the absolute path of the checkout, or a packed `.tgz` |

The package is **not on npm yet**; `dsh-right-click-menu` is the name it will publish
under, and [Publishing](#publishing) has the two commands that do it.

Command line, with DSH fully quit first:

```sh
dsh plugin --profile <profile> add github:AL1ghtm3ter/dsh-right-click-menu
```

### For agents

One line, for a user to paste into a chat:

> Install the DSH right-click menu: call `plugin_manager` with `action: install_bundle` and
> `target: github:AL1ghtm3ter/dsh-right-click-menu`.

What an agent does with it:

1. **Install** — `plugin_manager` `action: install_bundle`, `target:
   github:AL1ghtm3ter/dsh-right-click-menu`. The call runs the profile's own pnpm and
   appends the package to `dsh.profile.bundles`; the result's `application` field decides
   whether it is live (`applied`) or needs a restart (`restart-required`).
2. **Verify the Host half** — use a row that needs a route (复制文件内容 or 另存为…). An
   anonymous probe of `http://<host>/dsh-right-click-menu/ping` is answered by the
   connection fence before routing, so its status is not a route test: `401` where the fence
   runs per route, `403` — including for paths that do not exist — where the whole server is
   gated.
3. **Verify the browser half** — `cordis_inspect_query` on the client `Slots` provider,
   `listSubTree` with `{"root": "shell.overlay"}`, lists an occupant `right-click-menu`.
4. **Tell the user** where to right-click: the right Sidebar's 文件 tab, a file path in a
   chat message, or a hyperlink. A page reload (Ctrl+R) is needed after a change to
   `lib/client.js`; a **Host**-half change needs the application restarted.

The package installs from source with no build step and no install scripts, so no
`allowBuilds` approval is involved.

---

## Usage

### A file in the file tree

1. Open the right Sidebar and switch to the **文件** tab.
2. Right-click any row. Folders offer 在文件树中展开; files also offer the copy and
   save-as rows.
3. Pick a row. The menu closes and a toast reports the outcome
   (`已复制路径`, `已另存到 <path>`, `打开失败`, …).

### A file path in a conversation

Paths in a message — whether the model wrote them in inline code or in plain prose — are
resolved against the Session workspace before the menu opens, so the menu never offers
actions for a file that is not there.

* `src/index.ts` resolves relative to the Session's working directory.
* `D:\projects\app\main.py` resolves as an absolute path.
* A bare name such as `production.json` is looked up through the same `@file` search the
  composer uses, so a file that lives in a subdirectory is still found.
* A quoted path with spaces (`"C:\My Projects\a b.txt"`) is read as one path.

If nothing is found, the toast names the token it tried: `工作区里没有找到 <path>`.

### A hyperlink

Right-click any link — one the model wrote in Markdown, a link in a tool result, or a
link in DSH's own chrome. **在侧边栏中打开** keeps you in DSH; **在外部浏览器中打开**
hands the URL to your system browser. Both rows appear for `http`/`https`; other
destinations (`mailto:`, in-app file addresses) keep a single 打开链接 row plus the file
rows when they name a file.

---

## How it works

```
dsh-right-click-menu/
├── package.json          name = Loader row name = the id in lib/client.js
├── cordis.patch.yml      the bundle's one composition layer (the Host row)
├── lib/index.js          Host half — six fenced routes under /dsh-right-click-menu
├── lib/client.js         Browser half — a hand-written __ModuleLoader__ bundle
├── icon.svg              the card artwork Plugin Manager renders
└── locale/{en,zh}.json   the card title and description
```

**Host half** (`lib/index.js`) — `webServer` routes under `/dsh-right-click-menu`, each behind
`connection.requestRejection` (the Host/Origin fence plus browser authentication) and each
validating method, media type, a 64 KiB body ceiling, and absolute paths:

| Route | Purpose |
|---|---|
| `GET /ping` | liveness probe |
| `GET /raw?path=` | raw bytes, for a browser-side Save As |
| `POST /stat` | `{ path }` → `{ exists, kind, size, mtimeMs }` |
| `POST /read` | `{ path }` → `{ text, binary, truncated, size }` (1 MiB cap) |
| `POST /save-as` | `{ from, to }` → byte copy |
| `POST /write-text` | `{ path, text }` → UTF-8 write (fallback path) |

It imports nothing but Node built-ins, so it resolves with no dependency on the app's own
`@deepseek-ai/*` graph.

**Browser half** (`lib/client.js`) — one document-level `contextmenu` listener in the
capture phase, plus a `shell.overlay` occupant that renders the Menu primitive at the
pointer and the toast. It requires only the platform seed modules (`react`,
`react/jsx-runtime`, `@deepseek-ai/dsh-client-ui-primitives`) and reaches every DSH
capability through scoped injections.

### Development note: nested Remote namespaces

Cordis treats `ctx.remote.workspaceFiles` as the virtual service `remote.workspaceFiles`,
and its context proxy throws

```
cannot get property "remote.workspaceFiles" without inject
```

on any fiber that did not inject that dotted name. This plugin binds each namespace once,
per namespace, through a scoped injection:

```js
ctx.inject(["remote", "remote.workspaceFiles"], (scope) => {
  remotes.files = scope.remote.workspaceFiles;
});
```

One injection per namespace — rather than listing all of them in the plugin's `inject` —
keeps a single absent namespace from parking the whole plugin fiber in a `pending` state.
Plain service properties are unaffected: `ctx.get("sessions").list` needs no injection.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Nothing happens on right-click | The click was not on a file or a link, so the native menu is shown on purpose. On a file path, check the toast: a token the Host cannot resolve is reported by name. |
| The tree works, the chat does not | The bundle is stale. Reload the page (Ctrl+R); a modified `lib/client.js` is not hot-reloaded by every composition. |
| `在 DSH 中预览` says the file cannot be previewed | The Sidebar's document preview claims session file addresses; a file type it cannot render has no preview. The other rows still work. |
| `在默认应用中打开` is disabled | The Host reported no associated application for that file type. `打开方式 ▸` lists whatever it did report. |
| The Host routes answer `404` | The Host half did not load. Installing or replacing a package loads a fresh JavaScript module generation only on the next application start. |
| A rename is impossible in 另存为… | The browser's own Save-As dialog (`showSaveFilePicker`) is the only form that can rename; the fallback copies the file into a directory you pick. |

---

## Uninstall / rollback

`plugin_manager` `action: remove_bundle`, `target: dsh-right-click-menu` deselects the
bundle, removes the dependency, and unloads it. Manually: remove the name from
`dsh.profile.bundles` and from `dependencies` in the profile's `package.json`, then
restart. No file shipped with DSH is modified.

---

## Developing

There is no build step: `lib/client.js` is the bundle DSH serves, and the Host half is
plain ESM.

| Change | What makes it live |
|---|---|
| `lib/client.js` | reload the page (the bundle URL carries a revision derived from mtime/size) |
| `lib/index.js` | restart the application — Node's ESM cache keeps the old module generation |
| `package.json` display metadata | reload the page; Plugin Manager re-reads the manifest |

Local iteration installs the package by path, so edits are picked up without reinstalling:

```sh
dsh plugin --profile <profile> add link:/absolute/path/to/dsh-right-click-menu
```

Publishing is two commands:

```sh
npm login      # once, as the account that owns the name
npm publish    # from this directory
```

The community catalog entry (`awesome-dsh-plugin`) needs no change when a release is cut:
it points at `releases/latest/download/dsh-right-click-menu.tgz`, an asset name that
carries no version.

---

## License

[MIT](LICENSE)
