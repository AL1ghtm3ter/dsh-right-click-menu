# 本地化 / Localization

## 它跟随用户的语言

菜单、提示条和卡片文案都走 DSH 自己的 locale 服务，本插件只注册两套字典：

```js
ctx.locale.register("right-click-menu", { zh, en });
```

读取时服务会沿**「当前语言 → 它声明的回退链 → en」**查表。于是：

| 用户界面语言 | 菜单显示 |
|---|---|
| 中文（`zh`） | 中文 |
| 英文（`en`） | 英文 |
| 其它语言，含第三方语言包（`ru`、`ja`…） | 英文 |
| 语言包已经翻译了本插件的命名空间 | 该语言包的译文 |

**不会漏出 `menu.copyPath` 这类原始键**：回退链一定终止在 `en`，而本插件的 `en` 字典覆盖了全部 44 个键（见下面的键表）。

在 **Settings → General → Language** 切换语言，菜单文案立即跟着变，不需要刷新页面 —— 菜单是槽位渲染的，翻译函数每次调用都读当前语言。

## 卡片标题与描述

插件卡片上的标题和描述来自本包的 `locale/zh.json` 与 `locale/en.json`（`meta.title` / `meta.description`）。当前语言没有对应文件时，Plugin Manager 回退到 `package.json` 的 `description`（英文）。

## 语言包作者：给本插件加翻译

本插件的命名空间是 **`right-click-menu`**。语言包用「逐语言」形式注册即可，语言定义与词典的注册顺序无关：

```js
export const inject = ['locale']

export function apply(ctx) {
  ctx.effect(
    () => ctx.locale.addLanguage({ id: 'ru', label: 'Русский', fallback: 'en' }),
    'my-pack: language',
  )
  ctx.effect(
    () => ctx.locale.register('right-click-menu', 'ru', {
      'menu.preview': 'Открыть предпросмотр в DSH',
      'menu.copyPath': 'Скопировать путь',
      // …按下面的键表逐条补
    }),
    'my-pack: right-click-menu dictionary',
  )
}
```

两点注意：

* **只翻一部分也行**：没翻的键会继续沿回退链落到英文，不会变成键名。
* **占位符必须保留**：`{what}`、`{path}`、`{name}`、`{size}` 是插值用的，删掉或改名会让那句话少一块。

## 键表（44 个）

| 键 | 中文 | English |
|---|---|---|
| `menu.header.file` | 文件 | File |
| `menu.header.folder` | 文件夹 | Folder |
| `menu.header.link` | 链接 | Link |
| `menu.preview` | 在 DSH 中预览 | Preview in DSH |
| `menu.expand` | 在文件树中展开 | Expand in file tree |
| `menu.openDefault` | 在默认应用中打开 | Open in default app |
| `menu.openFolder` | 打开文件夹 | Open folder |
| `menu.openWith` | 打开方式 | Open with |
| `menu.defaultApp` | {name}（默认） | {name} (default) |
| `menu.reveal` | 在资源管理器中打开 | Show in file manager |
| `menu.openLink` | 打开链接 | Open link |
| `menu.openLinkSidebar` | 在侧边栏中打开 | Open in sidebar |
| `menu.openLinkExternal` | 在外部浏览器中打开 | Open in external browser |
| `menu.copyPath` | 复制路径 | Copy path |
| `menu.copyRelative` | 复制相对路径 | Copy relative path |
| `menu.copyName` | 复制文件名 | Copy file name |
| `menu.copyContents` | 复制文件内容 | Copy file contents |
| `menu.copyLink` | 复制链接地址 | Copy link address |
| `menu.copyLinkText` | 复制链接文字 | Copy link text |
| `menu.copyMarkdown` | 复制为 Markdown 链接 | Copy as Markdown link |
| `menu.saveAs` | 另存为… | Save as… |
| `menu.noDesktop` | 当前环境没有可用的桌面应用 | No desktop application is available here |
| `what.path` | 路径 |  path |
| `what.relative` | 相对路径 |  relative path |
| `what.name` | 文件名 |  file name |
| `what.link` | 链接地址 |  link address |
| `what.linkText` | 链接文字 |  link text |
| `what.markdown` | Markdown 链接 |  Markdown link |
| `notice.copied` | 已复制{what} | Copied{what} |
| `notice.copiedContents` | 已复制文件内容（{size}） | Copied file contents ({size}) |
| `notice.copyFailed` | 复制失败 | Copy failed |
| `notice.readFailed` | 无法读取文件内容 | Could not read the file |
| `notice.opened` | 已交给系统打开 | Handed to the system |
| `notice.openedLink` | 已打开链接 | Opened the link |
| `notice.openedSidebar` | 已在侧边栏中打开 | Opened in the sidebar |
| `notice.openedExternal` | 已在外部浏览器中打开 | Opened in the external browser |
| `notice.revealed` | 已在资源管理器中显示 | Revealed in the file manager |
| `notice.openFailed` | 打开失败 | Open failed |
| `notice.linkFailed` | 无法打开这个链接 | Could not open the link |
| `notice.previewUnavailable` | 该文件无法在 DSH 中预览 | This file cannot be previewed in DSH |
| `notice.saveCancelled` | 已取消另存为 | Save as cancelled |
| `notice.saved` | 已另存到 {path} | Saved to {path} |
| `notice.saveFailed` | 另存为失败 | Save as failed |
| `notice.notFound` | 工作区里没有找到 {path} | No such file in this workspace: {path} |

---

## English

The plugin registers two dictionaries with DSH's own locale service
(`ctx.locale.register("right-click-menu", { zh, en })`) and reads through it. Lookup walks
**the active language → its declared fallback chain → `en`**, so the menu follows the UI
language: Chinese for `zh`, English for `en`, and English for any other language — including
one whose language pack has not translated this namespace yet. A raw key such as
`menu.copyPath` can never appear, because the chain always ends at `en` and the `en`
dictionary covers all 44 keys. Switching the language in **Settings → General → Language**
updates an open menu without a reload, since slot-rendered copy is re-read on every call.

Card titles and descriptions come from this package's `locale/zh.json` and `locale/en.json`;
for a language without such a file, Plugin Manager falls back to the English
`package.json` `description`.

**Language packs** translate the namespace `right-click-menu` with the per-locale form
(registration order between the language definition and its dictionaries does not matter):

```js
export const inject = ['locale']

export function apply(ctx) {
  ctx.effect(
    () => ctx.locale.addLanguage({ id: 'ru', label: 'Русский', fallback: 'en' }),
    'my-pack: language',
  )
  ctx.effect(
    () => ctx.locale.register('right-click-menu', 'ru', { 'menu.copyPath': 'Скопировать путь' }),
    'my-pack: right-click-menu dictionary',
  )
}
```

A partial dictionary is fine — untranslated keys keep falling back to English. Keep the
`{what}`, `{path}`, `{name}` and `{size}` placeholders; they interpolate the sentence.
The complete key list is the table above.
