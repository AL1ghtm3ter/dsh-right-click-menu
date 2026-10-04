/**
 * Browser half of `dsh-right-click-menu`.
 *
 * A Codex-style right-click menu for files. Two surfaces are recognized:
 *
 * 1. A row of the right Sidebar's file tree — the row markup owns
 *    `data-files-path` (an absolute path) and `data-files-entry`, and the tree
 *    root carries `data-files-root`.
 * 2. A file path written in a chat message — the text under the pointer is
 *    scanned for one path-shaped token, and the menu only opens once the Host
 *    confirms that the path exists.
 *
 * Nothing else is intercepted: when no file target is resolved the native
 * browser menu is left alone, so ordinary right-clicks keep working.
 *
 * Every action is either an existing DSH capability (the `session` Remote for
 * open/reveal/associated applications, the `workspaceFiles` Remote for reads,
 * `sidebarRight.openResource` for the in-app preview, the `directoryPicker`
 * Remote for choosing a destination) or one of the small `/dsh-right-click-menu`
 * routes served by this package's host half.
 */
window.__ModuleLoader__.load({
  id: "dsh-right-click-menu",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const jsxRuntime = require("react/jsx-runtime");
    const jsx = jsxRuntime.jsx;
    const jsxs = jsxRuntime.jsxs;
    const P = require("@deepseek-ai/dsh-client-ui-primitives");

    //#region copy
    /** Dictionary namespace owned by this plugin. */
    const NS = "right-click-menu";

    const zh = {
      "menu.header.file": "文件",
      "menu.header.folder": "文件夹",
      "menu.preview": "在 DSH 中预览",
      "menu.expand": "在文件树中展开",
      "menu.openDefault": "在默认应用中打开",
      "menu.openFolder": "打开文件夹",
      "menu.openWith": "打开方式",
      "menu.reveal": "在资源管理器中打开",
      "menu.defaultApp": "{name}（默认）",
      "menu.copyPath": "复制路径",
      "menu.copyRelative": "复制相对路径",
      "menu.copyName": "复制文件名",
      "menu.copyContents": "复制文件内容",
      "menu.saveAs": "另存为…",
      "menu.noDesktop": "当前环境没有可用的桌面应用",
      "what.path": "路径",
      "what.relative": "相对路径",
      "what.name": "文件名",
      "what.link": "链接地址",
      "what.linkText": "链接文字",
      "what.markdown": "Markdown 链接",
      "notice.copied": "已复制{what}",
      "notice.copiedContents": "已复制文件内容（{size}）",
      "notice.copyFailed": "复制失败",
      "notice.readFailed": "无法读取文件内容",
      "notice.opened": "已交给系统打开",
      "notice.revealed": "已在资源管理器中显示",
      "notice.openFailed": "打开失败",
      "notice.previewUnavailable": "该文件无法在 DSH 中预览",
      "notice.saveCancelled": "已取消另存为",
      "notice.saved": "已另存到 {path}",
      "notice.saveFailed": "另存为失败",
      "notice.notFound": "工作区里没有找到 {path}",
      "menu.header.link": "链接",
      "menu.openLink": "打开链接",
      "menu.openLinkSidebar": "在侧边栏中打开",
      "menu.openLinkExternal": "在外部浏览器中打开",
      "menu.copyLink": "复制链接地址",
      "menu.copyLinkText": "复制链接文字",
      "menu.copyMarkdown": "复制为 Markdown 链接",
      "notice.openedLink": "已打开链接",
      "notice.openedSidebar": "已在侧边栏中打开",
      "notice.openedExternal": "已在外部浏览器中打开",
      "notice.linkFailed": "无法打开这个链接"
    };

    const en = {
      "menu.header.file": "File",
      "menu.header.folder": "Folder",
      "menu.preview": "Preview in DSH",
      "menu.expand": "Expand in file tree",
      "menu.openDefault": "Open in default app",
      "menu.openFolder": "Open folder",
      "menu.openWith": "Open with",
      "menu.reveal": "Show in file manager",
      "menu.defaultApp": "{name} (default)",
      "menu.copyPath": "Copy path",
      "menu.copyRelative": "Copy relative path",
      "menu.copyName": "Copy file name",
      "menu.copyContents": "Copy file contents",
      "menu.saveAs": "Save as…",
      "menu.noDesktop": "No desktop application is available here",
      "what.path": " path",
      "what.relative": " relative path",
      "what.name": " file name",
      "what.link": " link address",
      "what.linkText": " link text",
      "what.markdown": " Markdown link",
      "notice.copied": "Copied{what}",
      "notice.copiedContents": "Copied file contents ({size})",
      "notice.copyFailed": "Copy failed",
      "notice.readFailed": "Could not read the file",
      "notice.opened": "Handed to the system",
      "notice.revealed": "Revealed in the file manager",
      "notice.openFailed": "Open failed",
      "notice.previewUnavailable": "This file cannot be previewed in DSH",
      "notice.saveCancelled": "Save as cancelled",
      "notice.saved": "Saved to {path}",
      "notice.saveFailed": "Save as failed",
      "notice.notFound": "No such file in this workspace: {path}",
      "menu.header.link": "Link",
      "menu.openLink": "Open link",
      "menu.openLinkSidebar": "Open in sidebar",
      "menu.openLinkExternal": "Open in external browser",
      "menu.copyLink": "Copy link address",
      "menu.copyLinkText": "Copy link text",
      "menu.copyMarkdown": "Copy as Markdown link",
      "notice.openedLink": "Opened the link",
      "notice.openedSidebar": "Opened in the sidebar",
      "notice.openedExternal": "Opened in the external browser",
      "notice.linkFailed": "Could not open the link"
    };
    //#endregion

    //#region paths
    /** The scheme every in-app file address opens with. */
    const FILE_ADDRESS_PREFIX = "dsh-resource://file/";

    function encodeSegment(segment) {
      return encodeURIComponent(segment).replace(/%3A/gi, ":");
    }

    function encodePath(path) {
      return path.split("/").map(encodeSegment).join("/");
    }

    /** The `dsh-resource://file/session/<id>/<path>` address for one Session file. */
    function sessionFileAddress(sessionId, path) {
      const normalized = path.replace(/\\/g, "/").replace(/^(?:\.\/)+/, "");
      return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encodePath(normalized)}`;
    }

    function isWindowsStylePath(value) {
      return /^[A-Za-z]:[/\\]/.test(value) || value.startsWith("\\\\");
    }

    function isAbsolutePath(value) {
      return value.startsWith("/") || isWindowsStylePath(value);
    }

    /**
     * The address for a path as this plugin holds it: a workspace-relative path,
     * or an absolute path inside the workspace, becomes session-scoped.
     */
    function fileAddressFor(sessionId, cwd, path) {
      const normalized = path.replace(/\\/g, "/");
      if (!isAbsolutePath(normalized)) return sessionFileAddress(sessionId, normalized);
      const root = cwd === undefined || cwd === "" ? "" : cwd.replace(/\\/g, "/").replace(/\/+$/, "");
      if (root !== "" && normalized === root) return sessionFileAddress(sessionId, "");
      if (root !== "" && normalized.startsWith(`${root}/`)) {
        return sessionFileAddress(sessionId, normalized.slice(root.length + 1));
      }
      return sessionFileAddress(sessionId, normalized);
    }

    /** The platform's own separator, taken from a path the Host reported. */
    function separatorOf(path) {
      return path.includes("\\") ? "\\" : "/";
    }

    /** One path spelled with a single separator, whichever the platform uses. */
    function withSeparator(path, separator) {
      return separator === "\\" ? path.replace(/\//g, "\\") : path.replace(/\\/g, "/");
    }

    /** Join a directory and a name in that directory's own spelling. */
    function joinPath(directory, name) {
      const separator = separatorOf(directory);
      const base = directory.replace(/[/\\]+$/, "");
      return `${base}${separator}${withSeparator(name, separator)}`;
    }

    /** One path in a single separator spelling, for comparisons and display. */
    function normalizePath(path) {
      return path.replace(/\\/g, "/").replace(/^(?:\.\/)+/, "").replace(/\/+$/, "");
    }

    /** The last path segment of either separator spelling. */
    function baseName(path) {
      const normalized = path.replace(/[/\\]+$/, "");
      const at = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
      return at === -1 ? normalized : normalized.slice(at + 1);
    }

    /** A workspace-relative spelling of an absolute path, or undefined when it is outside. */
    function relativeTo(root, absolute) {
      if (root === undefined || root === "") return undefined;
      const normalizedRoot = normalizePath(root);
      const normalized = normalizePath(absolute);
      if (normalized === normalizedRoot) return "";
      if (!normalized.startsWith(`${normalizedRoot}/`)) return undefined;
      return normalized.slice(normalizedRoot.length + 1);
    }
    //#endregion

    //#region text candidates
    /** Characters a path token may contain: separators, name characters, CJK. */
    const PATH_CHAR = /[A-Za-z0-9_\-.\\/:@+~()\[\]{}#$%&=!,\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/;
    /** Punctuation never part of a path, stripped from both ends of a raw token. */
    const LEADING_JUNK = /^[\s"'`(\[{<（【《“‘]+/;
    const TRAILING_JUNK = /[\s"'`)\]}>，。；：！？、）】》”’…]+$/;
    /** A file-looking tail such as `.json`, `.tsx`, `.tar.gz`. */
    const FILE_TAIL = /\.[A-Za-z0-9]{1,8}$/;
    /** A stem carrying a letter or a CJK word, so `1.2` is not read as a file. */
    const STEM_LETTER = /[A-Za-z\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/;

    /** Whether a bare token reads as a file name (`production.json`, `README.md`). */
    function looksLikeFileName(token) {
      if (!FILE_TAIL.test(token)) return false;
      return STEM_LETTER.test(token.slice(0, token.lastIndexOf(".")));
    }

    /** The text node and offset under a viewport point, when the point is over text. */
    function caretAt(x, y) {
      if (typeof document.caretPositionFromPoint === "function") {
        const position = document.caretPositionFromPoint(x, y);
        if (position !== null && position.offsetNode !== null) {
          return { node: position.offsetNode, offset: position.offset };
        }
      }
      if (typeof document.caretRangeFromPoint === "function") {
        const range = document.caretRangeFromPoint(x, y);
        if (range !== null) return { node: range.startContainer, offset: range.startOffset };
      }
      return null;
    }

    /** The contiguous token around an offset inside one text node. */
    function tokenAround(text, offset) {
      let start = offset;
      let end = offset;
      while (start > 0 && PATH_CHAR.test(text[start - 1])) start -= 1;
      while (end < text.length && PATH_CHAR.test(text[end])) end += 1;
      return text.slice(start, end);
    }

    /** The content of a quoted path the offset sits inside, when there is one. */
    function quotedAround(text, offset) {
      for (const quote of ['"', "'"]) {
        const before = text.lastIndexOf(quote, Math.max(0, offset - 1));
        if (before === -1) continue;
        const after = text.indexOf(quote, offset);
        if (after === -1) continue;
        const inner = text.slice(before + 1, after);
        if (inner === "" || inner.length > 400 || inner.includes("\n")) continue;
        return inner;
      }
      return undefined;
    }

    /**
     * Decide whether a raw token is a file path worth offering a menu for.
     * `inCode` marks a token that sits inside code markup, which accepts a
     * wider range: a path is verified against the Host before the menu opens,
     * so the gate here only keeps ordinary prose out.
     */
    function classifyToken(raw, inCode) {
      const token = raw.replace(LEADING_JUNK, "").replace(TRAILING_JUNK, "");
      if (token.length < 3 || token.length > 400) return undefined;
      if (/\s/u.test(token)) return undefined;
      if (isAbsolutePath(token)) return { path: token, absolute: true };
      const separated = /[\\/]/.test(token);
      if (separated && (FILE_TAIL.test(token) || inCode || /^\.{1,2}[\\/]/.test(token))) {
        return { path: token, absolute: false };
      }
      if (looksLikeFileName(token)) return { path: token, absolute: false };
      if (inCode && token.length >= 2) return { path: token, absolute: false };
      return undefined;
    }

    /** Whether an element is rendered as code, where bare file names are meaningful. */
    function isCodeElement(element) {
      if (element === null || element === undefined) return false;
      return element.closest("code, pre, [data-code-block]") !== null;
    }

    /**
     * The path-shaped candidate under a pointer event: the inline code element
     * under the pointer first (highlighting may split a path across spans, so
     * the element's whole text is read), then the caret's token including a
     * quoted path, then an explicit selection.
     * @returns the candidate, or undefined when nothing path-shaped was found.
     */
    function candidateAtPoint(event) {
      const target = event.target instanceof Element ? event.target : null;
      const code = target === null ? null : target.closest("code");
      if (code !== null) {
        const whole = classifyToken(code.textContent ?? "", true);
        if (whole !== undefined) return whole;
      }
      const caret = caretAt(event.clientX, event.clientY);
      if (caret !== null && caret.node.nodeType === 3) {
        const text = caret.node.data;
        const inCode = isCodeElement(caret.node.parentElement);
        const quoted = quotedAround(text, caret.offset);
        if (quoted !== undefined) {
          const picked = classifyToken(quoted, inCode);
          if (picked !== undefined) return picked;
        }
        const picked = classifyToken(tokenAround(text, caret.offset), inCode);
        if (picked !== undefined) return picked;
        return undefined;
      }
      const selection = window.getSelection();
      const selected = selection === null ? "" : selection.toString().trim();
      if (selected !== "" && selected.length < 400 && !selected.includes("\n")) {
        const picked = classifyToken(selected, isCodeElement(target));
        if (picked !== undefined) return picked;
      }
      return undefined;
    }
    //#endregion

    //#region store
    /** A minimal external store: the menu state and the transient notice. */
    function createStore() {
      let state = { menu: null, notice: null, seq: 0 };
      const listeners = new Set();
      return {
        get: () => state,
        set(next) {
          state = next;
          for (const listener of [...listeners]) listener();
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        }
      };
    }
    //#endregion

    //#region helpers
    /** Remote calls answer `{ ok, value }`; local helpers answer the value itself. */
    function unwrap(result) {
      if (result === null || typeof result !== "object") return undefined;
      if (!("ok" in result)) return result;
      return result.ok ? result.value : undefined;
    }

    /** Compact byte text for the toast, matching the primitives' own formatting. */
    function sizeText(bytes) {
      if (typeof bytes !== "number" || Number.isNaN(bytes)) return "";
      if (bytes < 1024) return `${String(bytes)}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }
    //#endregion

    //#region menu items
    /**
     * Build the visible rows for one resolved target.
     *
     * A `link` target always offers its own rows; when the link names a file the
     * Host can reach (`dsh-resource://file/…`, `file://`, `api/file?path=…`) the
     * file rows follow in the same menu, so one gesture covers both readings.
     */
    function buildItems(menu, t) {
      const target = menu.target;
      const isLink = target.kind === "link";
      /** The file kind of this target: a link reports it only once resolved. */
      const kind = isLink ? target.fileKind : target.kind;
      const hasFile = kind !== undefined;
      const fileName = hasFile ? baseName(target.absolutePath) : target.name;
      const fileIcon = jsx(P.FileTypeIcon, { kind: P.classifyFileType(fileName), size: 16 });
      const items = [
        {
          id: "header",
          type: "label",
          text: isLink
            ? `${t("menu.header.link")} · ${target.name}`
            : `${kind === "directory" ? t("menu.header.folder") : t("menu.header.file")} · ${target.name}`
        },
        { id: "sep-head", type: "separator" }
      ];

      if (isLink) {
        if (target.scheme === "http:" || target.scheme === "https:") {
          items.push({
            id: "open-link-sidebar",
            label: t("menu.openLinkSidebar"),
            icon: jsx(P.IconPanelLeftOutlineRegular, {}),
            disabled: target.sidebarBrowser !== true
          });
          items.push({
            id: "open-link-external",
            label: t("menu.openLinkExternal"),
            icon: jsx(P.IconRightUpOutlineRegular, {})
          });
        } else {
          items.push({ id: "open-link", label: t("menu.openLink"), icon: jsx(P.IconRightUpOutlineRegular, {}) });
        }
        items.push({ id: "copy-link", label: t("menu.copyLink"), icon: jsx(P.IconLinkOutlineRegular, {}) });
        items.push({
          id: "copy-link-text",
          label: t("menu.copyLinkText"),
          icon: jsx(P.IconCopyOutlineRegular, {}),
          disabled: target.text === undefined || target.text === ""
        });
        items.push({ id: "copy-markdown", label: t("menu.copyMarkdown"), icon: jsx(P.IconCodeOutlineRegular, {}) });
        if (hasFile) items.push({ id: "sep-file", type: "separator" });
      }

      if (!isLink || hasFile) {
        if (target.rowButton !== undefined) {
          items.push({
            id: "preview",
            label: kind === "directory" ? t("menu.expand") : t("menu.preview"),
            icon: fileIcon
          });
        } else if (kind !== "directory") {
          items.push({ id: "preview", label: t("menu.preview"), icon: fileIcon });
        }
        if (menu.desktop === true) {
          const apps = Array.isArray(menu.apps) ? menu.apps : [];
          items.push({
            id: "open-default",
            label: kind === "directory" ? t("menu.openFolder") : t("menu.openDefault"),
            icon: jsx(P.IconRightUpOutlineRegular, {}),
            disabled: Array.isArray(menu.apps) && apps.length === 0
          });
          if (apps.length > 0) {
            items.push({
              id: "open-with",
              label: t("menu.openWith"),
              icon: jsx(P.IconLinkOutlineRegular, {}),
              submenu: apps.map((app) => ({
                id: `app:${app.id}`,
                label: app.default === true ? t("menu.defaultApp", { name: app.name }) : app.name
              }))
            });
          }
          items.push({ id: "reveal", label: t("menu.reveal"), icon: jsx(P.IconBrowseOutlineRegular, {}) });
        }
        items.push({ id: "sep-copy", type: "separator" });
        items.push({ id: "copy-path", label: t("menu.copyPath"), icon: jsx(P.IconCopyOutlineRegular, {}) });
        if (target.relativePath !== undefined && target.relativePath !== "") {
          items.push({ id: "copy-relative", label: t("menu.copyRelative"), icon: jsx(P.IconCopyOutlineRegular, {}) });
        }
        items.push({ id: "copy-name", label: t("menu.copyName"), icon: jsx(P.IconCopyOutlineRegular, {}) });
        if (kind === "file") {
          items.push({ id: "copy-contents", label: t("menu.copyContents"), icon: jsx(P.IconCodeOutlineRegular, {}) });
          items.push({ id: "sep-save", type: "separator" });
          items.push({ id: "save-as", label: t("menu.saveAs"), icon: jsx(P.IconDownloadOutlineRegular, {}) });
        }
      }

      if (menu.desktop === false && (isLink ? hasFile : true)) {
        items.push({ id: "sep-nodesktop", type: "separator" });
        items.push({ id: "no-desktop", type: "label", text: t("menu.noDesktop") });
      }
      return items;
    }
    //#endregion

    //#region component
    /**
     * The overlay occupant: renders the Menu at the captured pointer rect and
     * the transient toast reporting the last action's outcome.
     */
    function FileContextMenu(props) {
      const { open, run, t } = props;
      const state = React.useSyncExternalStore(open.subscribe, open.get, open.get);
      const menu = state.menu;
      const notice = state.notice;
      const children = [];
      if (notice !== null) {
        children.push(
          jsx(
            P.Toast,
            {
              text: notice.text,
              tone: notice.tone === "success" ? "success" : undefined,
              icon: notice.tone === "success" ? undefined : jsx(P.IconWarningOutlineRegular, {}),
              onDone: () => {
                const current = open.get();
                if (current.notice === notice) open.set({ ...current, notice: null });
              }
            },
            notice.id
          )
        );
      }
      if (menu !== null) {
        const rect = menu.rect;
        children.push(
          jsx(
            P.Menu,
            {
              open: true,
              portal: true,
              compact: true,
              align: "start",
              anchor: null,
              getAnchorRect: () => ({
                left: rect.x,
                right: rect.x,
                top: rect.y,
                bottom: rect.y
              }),
              items: buildItems(menu, t),
              onSelect: (id) => {
                void run(id);
              },
              onClose: () => {
                const current = open.get();
                if (current.menu === menu) open.set({ ...current, menu: null });
              }
            },
            `file-menu-${String(menu.seq)}`
          )
        );
      }
      return children.length === 0 ? null : jsx(React.Fragment, { children });
    }
    //#endregion

    //#region plugin
    /** Browser services this plugin requires: the slot registry and its copy. */
    const inject = ["slots", "locale"];

    /**
     * Client plugin body: dictionaries, the overlay occupant, and the one
     * document-level `contextmenu` listener that resolves a file target.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "right-click-menu: dictionaries");
      const t = ctx.locale.bind(NS);

      const store = createStore();
      /** Monotonic token: a newer right-click cancels an older resolution. */
      let pending = 0;

      /**
       * Remote namespaces, captured through scoped injections: Cordis refuses
       * `ctx.remote.workspaceFiles` on a fiber that did not inject the dotted
       * service name, and a scoped injection keeps one missing namespace from
       * disabling the whole plugin.
       */
      const remotes = { session: undefined, files: undefined, references: undefined, directoryPicker: undefined };
      const bindRemote = (key, assign) =>
        ctx.inject(["remote", `remote.${key}`], (scope) => {
          assign(scope.remote[key]);
        });
      bindRemote("session", (value) => {
        remotes.session = value;
      });
      bindRemote("workspaceFiles", (value) => {
        remotes.files = value;
      });
      bindRemote("fileReferences", (value) => {
        remotes.references = value;
      });
      bindRemote("directoryPicker", (value) => {
        remotes.directoryPicker = value;
      });

      const sessionRow = (sessionId) => {
        const rows = ctx.get("sessions")?.list?.getSnapshot?.().byId;
        return rows === undefined ? undefined : rows[sessionId];
      };

      /** Session id and workspace root for the element under the pointer. */
      const contextOf = (element) => {
        const owners = [
          element.closest("[data-conversation-session]"),
          element.closest("[data-sidebar-right-session]")
        ];
        for (const owner of owners) {
          if (owner === null) continue;
          const sessionId = owner.dataset.conversationSession ?? owner.dataset.sidebarRightSession;
          if (sessionId !== undefined && sessionId !== "") {
            return { sessionId, cwd: sessionRow(sessionId)?.cwd };
          }
        }
        const uiSession = ctx.get("uiSession")?.adapter?.current?.getSnapshot?.();
        const sessionId = uiSession?.key ?? uiSession?.props?.sessionId;
        if (typeof sessionId === "string" && sessionId !== "") {
          return { sessionId, cwd: sessionRow(sessionId)?.cwd };
        }
        const target = ctx.get("sidebarRight")?.commandTarget?.(element);
        if (target !== undefined && target !== null && typeof target.sessionId === "string") {
          return { sessionId: target.sessionId, cwd: sessionRow(target.sessionId)?.cwd };
        }
        return undefined;
      };

      /** Whether the right Sidebar can host a browser tab, i.e. the sidebar route exists. */
      const sidebarBrowserAvailable = () => {
        const tabs = ctx.get("sidebarRightTabs");
        if (tabs === undefined || typeof tabs.get !== "function") return false;
        try {
          return tabs.get("browser") !== undefined;
        } catch {
          return false;
        }
      };

      /** One call to this package's host half; undefined when the route is not served. */
      const hostPost = async (suffix, body) => {
        try {
          const response = await fetch(`/dsh-right-click-menu${suffix}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body)
          });
          if (!response.ok) return undefined;
          return await response.json();
        } catch {
          return undefined;
        }
      };

      /** Show one file in the in-app preview: the tree row's own gesture, or a resource address. */
      const openInDsh = (target) => {
        if (target.rowButton !== undefined) {
          if (!document.contains(target.rowButton)) return false;
          target.rowButton.click();
          return true;
        }
        const sidebarRight = ctx.get("sidebarRight");
        if (sidebarRight === undefined || target.sessionId === undefined) return false;
        const address = fileAddressFor(target.sessionId, target.cwd, target.absolutePath);
        try {
          if (typeof sidebarRight.openResource === "function") {
            sidebarRight.openResource(address);
            return true;
          }
        } catch {}
        if (typeof sidebarRight.openResourceIn === "function") {
          sidebarRight.openResourceIn(target.sessionId, address);
          return true;
        }
        return false;
      };

      /** Open or reveal one host path through the Session Remote the shipped controls use. */
      const openPath = async (target, action, application) => {
        const session = remotes.session;
        if (session === undefined) return false;
        const request =
          action === "reveal"
            ? { path: target.absolutePath, action }
            : { path: target.absolutePath, ...(application === undefined ? {} : { application }) };
        try {
          return unwrap(await session.openWorkspacePath(request)) !== undefined;
        } catch {
          return false;
        }
      };

      /** Associated applications and desktop availability, read once per menu. */
      const loadApplications = async (target) => {
        const session = remotes.session;
        if (session === undefined) return { desktop: false, apps: [] };
        const signal = new AbortController().signal;
        let desktop = false;
        try {
          desktop = unwrap(await session.canOpenWorkspacePath()) === true;
        } catch {}
        if (!desktop) return { desktop: false, apps: [] };
        try {
          const value = unwrap(await session.workspacePathApplications({ path: target.absolutePath }, signal));
          const list = Array.isArray(value) ? value : Array.isArray(value?.apps) ? value.apps : [];
          return {
            desktop: true,
            apps: list
              .filter((app) => app !== null && typeof app === "object" && typeof app.id === "string")
              .map((app) => ({
                id: app.id,
                name: typeof app.name === "string" && app.name !== "" ? app.name : app.id,
                default: app.default === true
              }))
          };
        } catch {
          return { desktop: true, apps: [] };
        }
      };

      /** Read one file as text: this package's route first, the Session Remote as the fallback. */
      const readContents = async (target) => {
        const host = await hostPost("/read", { path: target.absolutePath });
        if (host !== undefined) {
          if (host.binary === true) return { binary: true, size: host.size };
          if (typeof host.text !== "string") return undefined;
          return { text: host.text, truncated: host.truncated === true, size: host.size };
        }
        const sessionId = target.sessionId;
        const files = remotes.files;
        if (files === undefined || sessionId === undefined) return undefined;
        const signal = new AbortController().signal;
        const relative = target.relativePath ?? target.absolutePath;
        const parts = [];
        let offset = 1;
        let size;
        for (let page = 0; page < 12; page += 1) {
          let value;
          try {
            value = unwrap(await files.read(sessionId, relative, { offset }, signal));
          } catch {
            return undefined;
          }
          if (value === undefined || typeof value.text !== "string") return undefined;
          parts.push(value.text);
          size = value.bytes;
          if (value.eof === true || value.lines === 0) break;
          offset += value.lines;
        }
        return { text: parts.filter((part) => part !== "").join("\n"), size };
      };

      /** The raw bytes of one file, for a browser-side Save As. */
      const fetchBytes = async (target) => {
        try {
          const response = await fetch(`/dsh-right-click-menu/raw?path=${encodeURIComponent(target.absolutePath)}`);
          if (response.ok) return await response.blob();
        } catch {}
        try {
          const response = await fetch(`api/file?path=${encodeURIComponent(target.absolutePath)}`);
          if (response.ok) return await response.blob();
        } catch {}
        const files = remotes.files;
        if (files !== undefined && target.sessionId !== undefined) {
          try {
            const value = unwrap(
              await files.readBytes(
                target.sessionId,
                target.relativePath ?? target.absolutePath,
                {},
                new AbortController().signal
              )
            );
            if (value?.data !== undefined) return new Blob([value.data]);
          } catch {}
        }
        return undefined;
      };

      /** Write a copy of one file somewhere else, with a real Save-As dialog when the browser has one. */
      const saveAs = async (target) => {
        if (typeof window.showSaveFilePicker === "function") {
          let handle;
          try {
            handle = await window.showSaveFilePicker({ suggestedName: target.name });
          } catch (error) {
            if (error !== null && typeof error === "object" && error.name === "AbortError") return { cancelled: true };
            handle = undefined;
          }
          if (handle !== undefined) {
            const blob = await fetchBytes(target);
            if (blob === undefined) return { failed: true };
            try {
              const writable = await handle.createWritable();
              await writable.write(blob);
              await writable.close();
              return { path: handle.name };
            } catch {
              return { failed: true };
            }
          }
        }
        const picker = remotes.directoryPicker;
        if (picker !== undefined && typeof picker.pick === "function") {
          let directory;
          try {
            directory = unwrap(await picker.pick(new AbortController().signal));
          } catch {
            directory = undefined;
          }
          if (directory === null || directory === undefined) return { cancelled: true };
          const destination = joinPath(directory, target.name);
          const written = await hostPost("/save-as", { from: target.absolutePath, to: destination });
          return written === undefined ? { failed: true } : { path: destination };
        }
        return { failed: true };
      };

      /** Announce an outcome through the overlay's toast. */
      const notify = (text, tone) => {
        const current = store.get();
        store.set({ ...current, notice: { id: `notice-${String(current.seq + 1)}`, text, tone } });
      };
      const closeMenu = () => {
        const current = store.get();
        if (current.menu !== null) store.set({ ...current, menu: null, seq: current.seq + 1 });
      };

      /**
       * Open a link the way a left click would: the anchor's own handler is what
       * honours the rest of DSH's link behaviour, so clicking it is better than
       * guessing. Used for destinations the window-open handler refuses, such as
       * `mailto:`.
       */
      const openLink = (target) => {
        const anchor = target.anchor;
        if (anchor !== undefined && document.contains(anchor)) {
          try {
            anchor.click();
            return true;
          } catch {}
        }
        try {
          window.open(target.href, "_blank", "noopener,noreferrer");
          return true;
        } catch {
          return false;
        }
      };

      /**
       * Open an HTTP(S) link in the right Sidebar's browser tab, the same route
       * DSH takes when its own link preference is the sidebar.
       */
      const openLinkInSidebar = (target) => {
        const right = ctx.get("sidebarRight");
        if (right === undefined || typeof right.openTab !== "function") return false;
        if (sidebarBrowserAvailable() !== true) return false;
        try {
          right.openTab("browser", { params: { url: target.href } });
          return true;
        } catch {
          return false;
        }
      };

      /**
       * Open an HTTP(S) link in the system's default browser. The Desktop window
       * turns a renderer `window.open` into `shell.openExternal` and denies the
       * popup, so the call's return value says nothing — only a throw is a
       * failure. A destination the handler refuses falls back to the anchor.
       */
      const openLinkExternally = (target) => {
        if (target.scheme !== "http:" && target.scheme !== "https:") return openLink(target);
        try {
          window.open(target.href, "_blank", "noopener,noreferrer");
          return true;
        } catch {
          return openLink(target);
        }
      };

      /** Run one selected row against the menu's captured target. */
      const run = async (id) => {
        const menu = store.get().menu;
        if (menu === null) return;
        const target = menu.target;
        if (id === "header" || id === "no-desktop" || id.startsWith("sep-") || id === "open-with") return;
        if (id.startsWith("app:")) {
          closeMenu();
          const opened = await openPath(target, "open", id.slice(4));
          notify(opened ? t("notice.opened") : t("notice.openFailed"), opened ? "success" : "error");
          return;
        }
        switch (id) {
          case "open-link": {
            closeMenu();
            const opened = openLink(target);
            notify(opened ? t("notice.openedLink") : t("notice.linkFailed"), opened ? "success" : "error");
            return;
          }
          case "open-link-sidebar": {
            closeMenu();
            const opened = openLinkInSidebar(target);
            notify(opened ? t("notice.openedSidebar") : t("notice.linkFailed"), opened ? "success" : "error");
            return;
          }
          case "open-link-external": {
            closeMenu();
            const opened = openLinkExternally(target);
            notify(opened ? t("notice.openedExternal") : t("notice.linkFailed"), opened ? "success" : "error");
            return;
          }
          case "copy-link": {
            closeMenu();
            const copied = await P.writeClipboard(target.href);
            notify(copied ? t("notice.copied", { what: t("what.link") }) : t("notice.copyFailed"), copied ? "success" : "error");
            return;
          }
          case "copy-link-text": {
            closeMenu();
            const copied = await P.writeClipboard(target.text ?? "");
            notify(copied ? t("notice.copied", { what: t("what.linkText") }) : t("notice.copyFailed"), copied ? "success" : "error");
            return;
          }
          case "copy-markdown": {
            closeMenu();
            const label = target.text === undefined || target.text === "" ? target.href : target.text;
            const copied = await P.writeClipboard(`[${label}](${target.href})`);
            notify(copied ? t("notice.copied", { what: t("what.markdown") }) : t("notice.copyFailed"), copied ? "success" : "error");
            return;
          }
          case "preview": {
            closeMenu();
            if (!openInDsh(target)) notify(t("notice.previewUnavailable"), "error");
            return;
          }
          case "open-default": {
            closeMenu();
            const opened = await openPath(target, "open");
            notify(opened ? t("notice.opened") : t("notice.openFailed"), opened ? "success" : "error");
            return;
          }
          case "reveal": {
            closeMenu();
            const revealed = await openPath(target, "reveal");
            notify(revealed ? t("notice.revealed") : t("notice.openFailed"), revealed ? "success" : "error");
            return;
          }
          case "copy-path": {
            closeMenu();
            const what = t("what.path");
            const copied = await P.writeClipboard(target.absolutePath);
            notify(copied ? t("notice.copied", { what }) : t("notice.copyFailed"), copied ? "success" : "error");
            return;
          }
          case "copy-relative": {
            closeMenu();
            const what = t("what.relative");
            const copied = await P.writeClipboard(target.relativePath ?? target.absolutePath);
            notify(copied ? t("notice.copied", { what }) : t("notice.copyFailed"), copied ? "success" : "error");
            return;
          }
          case "copy-name": {
            closeMenu();
            const what = t("what.name");
            const copied = await P.writeClipboard(target.name);
            notify(copied ? t("notice.copied", { what }) : t("notice.copyFailed"), copied ? "success" : "error");
            return;
          }
          case "copy-contents": {
            closeMenu();
            const contents = await readContents(target);
            if (contents === undefined || contents.binary === true) {
              notify(t("notice.readFailed"), "error");
              return;
            }
            const copied = await P.writeClipboard(contents.text);
            notify(
              copied
                ? t("notice.copiedContents", { size: sizeText(contents.size ?? contents.text.length) })
                : t("notice.copyFailed"),
              copied ? "success" : "error"
            );
            return;
          }
          case "save-as": {
            const outcome = await saveAs(target);
            closeMenu();
            if (outcome.cancelled === true) notify(t("notice.saveCancelled"));
            else if (outcome.failed === true) notify(t("notice.saveFailed"), "error");
            else notify(t("notice.saved", { path: outcome.path }), "success");
            return;
          }
          default:
            return;
        }
      };

      /** Publish one resolved target as the open menu, then hydrate its Host facts. */
      const present = (event, target) => {
        const token = (pending += 1);
        const seq = store.get().seq + 1;
        store.set({
          ...store.get(),
          seq,
          menu: {
            seq,
            rect: { x: event.clientX, y: event.clientY },
            target,
            desktop: undefined,
            apps: undefined
          }
        });
        void (async () => {
          // A link that names no file has no file associations to read.
          if (target.absolutePath === undefined) return;
          const applications = await loadApplications(target);
          if (token !== pending) return;
          const live = store.get();
          if (live.menu === null || live.menu.target !== target) return;
          store.set({ ...live, menu: { ...live.menu, desktop: applications.desktop, apps: applications.apps } });
        })();
      };

      /**
       * Resolve a file-tree row: the row itself carries the absolute path, and
       * the tree root carries the workspace root, so no Host round trip is
       * needed to know that the file exists.
       */
      const treeTarget = (row) => {
        const path = row.getAttribute("data-files-path");
        if (path === null || path === "") return undefined;
        const root = row.closest("[data-files-state='tree']")?.getAttribute("data-files-root") ?? undefined;
        const separator = separatorOf(root ?? path);
        const absolutePath = isAbsolutePath(path)
          ? withSeparator(path, separator)
          : root === undefined
            ? path
            : joinPath(root, path);
        const context = contextOf(row);
        return {
          name: baseName(path),
          kind: row.getAttribute("data-files-entry") === "directory" ? "directory" : "file",
          absolutePath,
          relativePath: relativeTo(root ?? context?.cwd, absolutePath),
          sessionId: context?.sessionId,
          cwd: context?.cwd ?? root,
          rowButton: row.querySelector("button") ?? undefined
        };
      };

      /**
       * The same `@file` search the composer uses, for a bare name that is not
       * a workspace-root path: an exact candidate wins, then a candidate whose
       * path ends with the name.
       */
      const searchWorkspace = async (sessionId, token, signal) => {
        const references = remotes.references;
        if (references === undefined || typeof references.list !== "function") return undefined;
        let list;
        try {
          list = unwrap(await references.list(sessionId, token, signal));
        } catch {
          return undefined;
        }
        if (!Array.isArray(list) || list.length === 0) return undefined;
        const wanted = normalizePath(token);
        const usable = list.filter((item) => item !== null && typeof item === "object" && typeof item.path === "string");
        const picked =
          usable.find((item) => normalizePath(item.path) === wanted) ??
          usable.find((item) => normalizePath(item.path).endsWith(`/${wanted}`));
        if (picked === undefined) return undefined;
        return { path: picked.path, kind: picked.kind === "directory" ? "directory" : "file" };
      };

      /**
       * Resolve one path to an absolute path and a file kind, using every source
       * the Host offers: the `/stat` route for absolute paths anywhere it can
       * reach, the `workspaceFiles` Remote for workspace-relative ones (which
       * also reports the authoritative absolute path), and the composer's own
       * `@file` search for a bare name that is not a workspace-root path.
       * @returns `{ absolutePath, fileKind }`, or undefined when nothing proves
       * that the path exists.
       */
      const resolveFile = async (sessionId, path, cwd) => {
        const files = remotes.files;
        const signal = new AbortController().signal;
        if (isAbsolutePath(path)) {
          const host = await hostPost("/stat", { path });
          if (host !== undefined) {
            if (host.exists !== true) return undefined;
            return { absolutePath: path, fileKind: host.kind === "directory" ? "directory" : "file" };
          }
          // No route: an absolute path inside the workspace still resolves remotely.
          if (files === undefined || sessionId === undefined) return undefined;
          let value;
          try {
            value = unwrap(await files.stat(sessionId, path, signal));
          } catch {
            return undefined;
          }
          if (value === undefined || value === null || typeof value.absolutePath !== "string") return undefined;
          return { absolutePath: value.absolutePath, fileKind: "file" };
        }
        if (files !== undefined && sessionId !== undefined) {
          let value;
          try {
            value = unwrap(await files.stat(sessionId, path, signal));
          } catch {
            value = undefined;
          }
          if (value !== undefined && value !== null && typeof value.absolutePath === "string") {
            let fileKind = "file";
            if (!FILE_TAIL.test(path)) {
              try {
                const listing = unwrap(await files.list(sessionId, path, signal));
                if (listing !== undefined && listing !== null) fileKind = "directory";
              } catch {}
            }
            return { absolutePath: value.absolutePath, fileKind };
          }
          const found = await searchWorkspace(sessionId, path, signal);
          if (found !== undefined) {
            let resolved;
            try {
              const statValue = unwrap(await files.stat(sessionId, found.path, signal));
              if (statValue !== undefined && statValue !== null && typeof statValue.absolutePath === "string") {
                resolved = statValue.absolutePath;
              }
            } catch {}
            if (resolved === undefined && cwd !== undefined) resolved = joinPath(cwd, found.path);
            if (resolved !== undefined) return { absolutePath: resolved, fileKind: found.kind };
          }
        }
        if (cwd !== undefined) {
          const guess = joinPath(cwd, path);
          const host = await hostPost("/stat", { path: guess });
          if (host !== undefined && host.exists === true) {
            return { absolutePath: guess, fileKind: host.kind === "directory" ? "directory" : "file" };
          }
        }
        return undefined;
      };

      /** The Session context of an element, without failing the right-click when it is unavailable. */
      const contextOfSafe = (element) => {
        try {
          return contextOf(element);
        } catch {
          // A surface whose sidebar controller refuses an element: treat the
          // Session context as unknown rather than failing the right-click.
          return undefined;
        }
      };

      /** One resolved file, shaped as a menu target. */
      const fileTargetOf = (sessionId, cwd, resolved) => ({
        name: baseName(resolved.absolutePath),
        kind: resolved.fileKind,
        absolutePath: resolved.absolutePath,
        relativePath: cwd === undefined ? undefined : relativeTo(cwd, resolved.absolutePath),
        sessionId,
        cwd,
        rowButton: undefined
      });

      /** Confirm a scanned token against the Host before offering the menu. */
      const resolveToken = async (element, candidate) => {
        const context = contextOfSafe(element);
        const resolved = await resolveFile(context?.sessionId, candidate.path, context?.cwd);
        if (resolved === undefined) return undefined;
        return fileTargetOf(context?.sessionId, context?.cwd, resolved);
      };

      /**
       * The path a link names on the Host, for the three address forms the GUI
       * produces: a `dsh-resource://file/session/…` address, a `file://` URL, and
       * the authenticated `api/file?path=…` media route.
       * @returns `{ sessionId?, path }`, or undefined for a link that is not a
       * file at all (an external URL, mailto, a fragment).
       */
      const localPathOfLink = (url) => {
        if (url === undefined) return undefined;
        if (url.protocol === "dsh-resource:") {
          const parts = [url.host, ...url.pathname.split("/").filter((segment) => segment !== "")];
          if (parts[0] !== "file" || parts[1] !== "session" || parts.length < 4) return undefined;
          const sessionId = decodeURIComponent(parts[2]);
          const path = parts.slice(3).map((segment) => decodeURIComponent(segment)).join("/");
          return path === "" ? undefined : { sessionId, path };
        }
        if (url.protocol === "file:") {
          let path = decodeURIComponent(url.pathname);
          if (/^\/[A-Za-z]:/.test(path)) path = path.slice(1);
          return path === "" ? undefined : { path };
        }
        if (url.pathname.endsWith("/api/file")) {
          const path = url.searchParams.get("path");
          return path === null || path === "" ? undefined : { path };
        }
        return undefined;
      };

      /**
       * Resolve a link element. External links need no Host confirmation; a link
       * that names a file is resolved like a clicked path, and the file rows are
       * added only when the file is really there.
       */
      const resolveLink = async (anchor) => {
        const href = anchor.getAttribute("href") ?? "";
        let url;
        try {
          url = new URL(href, document.baseURI);
        } catch {
          url = undefined;
        }
        const text = (anchor.textContent ?? "").trim();
        const label = url === undefined || url.host === "" ? href : url.host;
        const base = {
          kind: "link",
          name: label,
          href: url === undefined ? href : url.href,
          scheme: url === undefined ? "" : url.protocol,
          sidebarBrowser: sidebarBrowserAvailable(),
          text,
          anchor
        };
        const local = localPathOfLink(url);
        if (local === undefined) return base;
        const context = contextOfSafe(anchor);
        const sessionId = local.sessionId ?? context?.sessionId;
        const resolved = await resolveFile(sessionId, local.path, context?.cwd);
        if (resolved === undefined) return base;
        return { ...fileTargetOf(sessionId, context?.cwd, resolved), ...base, kind: "link" };
      };

      /**
       * A file mention the chat renders: a button whose `title` carries the path
       * exactly as the tool spelled it, which keeps names with spaces working.
       */
      const mentionTargetOf = async (button) => {
        const path = (button.getAttribute("title") ?? "").trim();
        if (path === "") return undefined;
        const context = contextOfSafe(button);
        const resolved = await resolveFile(context?.sessionId, path, context?.cwd);
        if (resolved === undefined) return undefined;
        return fileTargetOf(context?.sessionId, context?.cwd, resolved);
      };

      /** Surfaces that own their own context menu: never hijacked. */
      const ownsContextMenu = (element) =>
        element.closest("[role='menu'], [data-json-copy-button], [data-files-reload], [data-files-auto-refresh]") !== null;

      /** One right-click: resolve the file under the pointer, then open the menu. */
      const handleContextMenu = (event) => {
        const raw = event.target;
        const element = raw instanceof Element ? raw : raw instanceof Node ? raw.parentElement : null;
        if (element === null) return;
        if (ownsContextMenu(element)) return;
        const row = element.closest("[data-files-path][data-files-entry]");
        if (row !== null) {
          const target = treeTarget(row);
          if (target === undefined) return;
          event.preventDefault();
          event.stopPropagation();
          present(event, target);
          return;
        }
        // A hyperlink: external URLs, mailto, and the in-app file addresses.
        const anchor = element.closest("a[href]");
        if (anchor !== null) {
          const href = anchor.getAttribute("href") ?? "";
          if (href !== "" && !href.startsWith("#")) {
            event.preventDefault();
            event.stopPropagation();
            const linkToken = (pending += 1);
            void (async () => {
              try {
                const target = await resolveLink(anchor);
                if (linkToken !== pending) return;
                present(event, target);
              } catch (error) {
                console.error("right-click-menu: resolving a link failed", error);
              }
            })();
            return;
          }
        }
        // A file mention the chat renders as a button, not an anchor.
        const mention = element.closest("button[class*='fileLink'], button[class*='fileMention']");
        if (mention !== null) {
          event.preventDefault();
          event.stopPropagation();
          const mentionToken = (pending += 1);
          void (async () => {
            try {
              const target = await mentionTargetOf(mention);
              if (mentionToken !== pending) return;
              if (target !== undefined) {
                present(event, target);
                return;
              }
              // Its `title` was empty (an image mention): fall back to the text.
              const candidate = candidateAtPoint(event);
              if (candidate === undefined) return;
              const resolved = await resolveToken(element, candidate);
              if (mentionToken !== pending) return;
              if (resolved === undefined) {
                notify(t("notice.notFound", { path: candidate.path }), "error");
                return;
              }
              present(event, resolved);
            } catch (error) {
              console.error("right-click-menu: resolving a file mention failed", error);
            }
          })();
          return;
        }
        const candidate = candidateAtPoint(event);
        if (candidate === undefined) return;
        event.preventDefault();
        event.stopPropagation();
        const token = (pending += 1);
        void (async () => {
          try {
            const target = await resolveToken(element, candidate);
            if (token !== pending) return;
            if (target === undefined) {
              // A path-shaped token the Host does not know: say so instead of
              // silently swallowing the right-click.
              notify(t("notice.notFound", { path: candidate.path }), "error");
              return;
            }
            present(event, target);
          } catch (error) {
            console.error("right-click-menu: resolving a file target failed", error);
          }
        })();
      };

      /** A throwing listener must not break the page's own context menu. */
      const onContextMenu = (event) => {
        try {
          handleContextMenu(event);
        } catch (error) {
          console.error("right-click-menu: context menu handler failed", error);
        }
      };

      ctx.effect(() => {
        document.addEventListener("contextmenu", onContextMenu, true);
        return () => {
          document.removeEventListener("contextmenu", onContextMenu, true);
        };
      }, "right-click-menu: contextmenu listener");
      ctx.effect(
        () =>
          ctx.slots.inject("shell.overlay", () =>
            ctx.slots.register(
              {
                name: "shell.overlay",
                id: "right-click-menu",
                order: 400,
                locale: NS,
                inject: () => ({ open: store, run, t })
              },
              FileContextMenu
            )
          ),
        "right-click-menu: overlay occupant"
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
