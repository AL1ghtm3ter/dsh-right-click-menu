# dsh-right-click-menu

给 DSH 网页界面加一个 Codex 风格的右键菜单：**文件**、**对话里的文件路径**、**超链接**。

中文 | [English](README.en.md)

> **给 Agent 的一句话**
>
> 给 DSH 装上文件右键菜单：调用 `plugin_manager`，`action` 填 `install_bundle`，`target` 填
> `github:AL1ghtm3ter/dsh-right-click-menu`；装好以后，我就能在 DSH 里对着文件或链接右键了。
>
> 具体规格、命令行写法和验证步骤见[给 Agent 的说明](#给-agent-的说明)。

---

## 能做什么

在 DSH 里对着文件、文件路径或链接点右键，弹出的菜单只给这一类对象真正能做的事。

| 在哪右键 | 怎么认出来的 | 菜单里有什么 |
|---|---|---|
| 右侧栏「文件」标签里的一行 | 该行自带的 `data-files-path` / `data-files-entry` 标记 | 文件动作 |
| 对话消息里的文件路径（行内代码、正文都行） | 指针下的那段文字，先问过宿主、确认文件真在 | 文件动作 |
| 聊天渲染出来的文件提及 | 提及按钮的 `title` 属性 | 文件动作 |
| 超链接 | 锚点的 `href` | 链接动作；链接本身指向文件时，再补上文件动作 |

**文件动作**

| 菜单项 | 点了会怎样 |
|---|---|
| 在 DSH 中预览 / 在文件树中展开 | 用 DSH 自带的预览打开文件；文件夹则是展开 |
| 在默认应用中打开 | 交给系统默认程序（`session.openWorkspacePath`） |
| 打开方式 ▸ | 列出宿主查到的关联程序，一个一个点 |
| 在资源管理器中打开 | 在文件管理器里定位到这个文件 |
| 复制路径 | 绝对路径进剪贴板 |
| 复制相对路径 | 相对当前会话工作区的路径 |
| 复制文件名 | 路径最后一段 |
| 复制文件内容 | 读出文件内容进剪贴板（上限 1 MiB，二进制文件会拒绝） |
| 另存为… | 能用浏览器保存对话框就用；否则让你选个目录，再由宿主拷过去 |

**链接动作**

| 菜单项 | 点了会怎样 |
|---|---|
| 在侧边栏中打开 | 在右侧栏的浏览器标签页里打开 |
| 在外部浏览器中打开 | 交给系统默认浏览器 |
| 复制链接地址 | 复制 `href` |
| 复制链接文字 | 复制链接显示出来的那段文字 |
| 复制为 Markdown 链接 | 复制成 `[文字](href)`，可以直接粘进文档或提示词 |

链接指向文件时——`dsh-resource://file/…`、`file://`、`api/file?path=…` 这类地址——同一个菜单里既有链接动作，也有完整的文件动作。

**其它位置一律不管。** 既不是文件也不是链接的地方点右键，照样弹浏览器原生菜单：选文字、消息操作、代码块、JSON 复制按钮全都照旧。碰到长得像路径、但宿主查不到的内容，会直接告诉你「工作区里没有找到 <路径>」，不会把这次右键悄悄吞掉。

## 安装

在网页界面里：侧栏 **Plugins → Add plugin**，粘贴下面任意一条，点 **Install**。

| 来源 | 粘贴这个 |
|---|---|
| GitHub | `github:AL1ghtm3ter/dsh-right-click-menu` |
| Release 压缩包 | `https://github.com/AL1ghtm3ter/dsh-right-click-menu/releases/latest/download/dsh-right-click-menu.tgz` |
| 本地目录 | 该目录的绝对路径，或者打好的 `.tgz` |

这个包**还没发到 npm**。`dsh-right-click-menu` 是它将来用的包名，发布只要两条命令，见[发布](#发布)。

命令行装法（先把 DSH 退干净）：

```sh
dsh plugin --profile <profile> add github:AL1ghtm3ter/dsh-right-click-menu
```

### 给 Agent 的说明

一句话，用户可以直接丢进对话：

> 给 DSH 装上文件右键菜单：调用 `plugin_manager`，`action` 填 `install_bundle`，`target` 填
> `github:AL1ghtm3ter/dsh-right-click-menu`。

Agent 照着这几步做：

1. **装。** `plugin_manager` 的 `action: install_bundle`、`target: github:AL1ghtm3ter/dsh-right-click-menu`。它会用 profile 自己的 pnpm 装好，并把包名写进 `dsh.profile.bundles`。看返回值里的 `application` 字段判断有没有生效：`applied` 是已经跑起来了，`restart-required` 要等下次启动应用。
2. **验宿主半。** 用需要走路由的那几项来验（复制文件内容、另存为…）。匿名请求 `http://<主机>/dsh-right-click-menu/ping` 会先被信任围栏拦下、根本到不了路由，所以它的状态码不能当作路由测试：按路由拦的部署返回 `401`，整台服务器都拦的部署一律 `403`（连不存在的路径也是 `403`）。
3. **验浏览器半。** 用 `cordis_inspect_query` 查 client 的 `Slots`，`listSubTree` 传 `{"root": "shell.overlay"}`，占用列表里应该出现 `right-click-menu`。
4. **告诉用户去哪右键。** 右侧栏「文件」标签、对话消息里的文件路径，或者任意超链接。改过 `lib/client.js` 要刷新页面（Ctrl+R）；改**宿主半**要重启应用。

装的时候不用构建，也没有安装脚本，所以不会弹 `allowBuilds` 授权。

## 用法

### 文件树里的文件

1. 打开右侧栏，切到「**文件**」标签。
2. 在哪一行右键都行。文件夹给的是「在文件树中展开」；文件还会多出复制、另存为那几项。
3. 点一项。菜单收起，底部弹一条提示告诉你结果，比如「已复制路径」「已另存到 <路径>」「打开失败」。

### 对话里的文件路径

消息里的路径——模型写在行内代码里也好，写在正文里也好——都会**先按会话工作区核实文件在不在**，再决定弹不弹菜单。所以不会对着一个不存在的文件给你一堆操作。

* `src/index.ts` 按会话的工作目录解析成相对路径。
* `D:\projects\app\main.py` 按绝对路径解析。
* `production.json` 这种只有文件名的，会走输入框补全用的同一套 `@file` 搜索，所以藏在子目录里的文件也找得到。
* 带空格、加了引号的路径（`"C:\My Projects\a b.txt"`）会整段当成一个路径来读。

要是都没找到，提示里会点名它试过的那个词：`工作区里没有找到 <路径>`。

### 超链接

任何链接都能右键：模型用 Markdown 写的、工具结果里的、DSH 界面自己的。**在侧边栏中打开**留在 DSH 里看，**在外部浏览器中打开**交给系统浏览器。`http`/`https` 才会同时给出这两项；其它目标（`mailto:`、应用内的文件地址）保留一项「打开链接」，指向文件时再补上文件动作。

## 语言

菜单和提示跟随 **DSH 的界面语言**（Settings → General → Language，切换后立即生效，不用刷新）。中文界面显示中文，其它语言显示英文——包括装了语言包、但那个语言包还没翻译本插件的情况；不会出现 `menu.copyPath` 这种原始键。

要给你的语言加翻译（或写语言包），命名空间是 `right-click-menu`，注册示例和 **44 个键的完整键表**见 [LOCALIZATION.md](LOCALIZATION.md)。

## 怎么实现的

```
dsh-right-click-menu/
├── package.json          name = Loader 行名 = lib/client.js 里的注册 id
├── cordis.patch.yml      这个 bundle 唯一的组成层，用来插入宿主插件那一行
├── lib/index.js          宿主半：/dsh-right-click-menu 下 6 条带信任围栏的路由
├── lib/client.js         浏览器半：手写的 __ModuleLoader__ 包
├── icon.svg              Plugin Manager 卡片上显示的图标
└── locale/{en,zh}.json   卡片的标题和描述
```

**宿主半**（`lib/index.js`）：路由挂在 `webServer` 的 `/dsh-right-click-menu` 下。每条路由都先问 `connection.requestRejection`（Host/Origin 围栏加浏览器认证），再校验请求方法、媒体类型、64 KiB 请求体上限和绝对路径。

| 路由 | 用途 |
|---|---|
| `GET /ping` | 看它还活着没有 |
| `GET /raw?path=` | 原始字节，给浏览器侧的「另存为」用 |
| `POST /stat` | `{ path }` → `{ exists, kind, size, mtimeMs }` |
| `POST /read` | `{ path }` → `{ text, binary, truncated, size }`，上限 1 MiB |
| `POST /save-as` | `{ from, to }` 拷贝字节 |
| `POST /write-text` | `{ path, text }` 写入 UTF-8，兜底用 |

它只 import Node 内置模块，不依赖应用自带的 `@deepseek-ai/*` 依赖图也能跑起来。

**浏览器半**（`lib/client.js`）：一个挂在 document 上、捕获阶段的 `contextmenu` 监听，加一个 `shell.overlay` 占位。菜单原语画在指针位置，提示条也归它管。它只 require 平台的种子模块（`react`、`react/jsx-runtime`、`@deepseek-ai/dsh-client-ui-primitives`），其它 DSH 能力都通过 scoped injection 拿。

### 开发备忘：嵌套 Remote 命名空间

Cordis 把 `ctx.remote.workspaceFiles` 当成虚拟服务 `remote.workspaceFiles`。没注入这个点号全名的 fiber，只要碰一下属性就会抛：

```
cannot get property "remote.workspaceFiles" without inject
```

所以本插件**一个命名空间一条** scoped injection：

```js
ctx.inject(["remote", "remote.workspaceFiles"], (scope) => {
  remotes.files = scope.remote.workspaceFiles;
});
```

一条一条注，而不是把它们全堆进插件的 `inject` 列表——这样某个命名空间缺失时，只影响对应那几项功能，不会把整个插件 fiber 卡在 `pending`。普通服务属性不受影响，`ctx.get("sessions").list` 不需要注入。

## 常见问题

| 现象 | 原因和处理 |
|---|---|
| 右键没反应 | 那个位置既不是文件也不是链接，所以按设计弹了原生菜单。如果是文件路径，看提示条——宿主查不到的那个词会被点名。 |
| 文件树能用、对话里不行 | 浏览器半还是旧版本。刷新页面（Ctrl+R）。 |
| 「在 DSH 中预览」说没法预览 | 侧栏文档预览只认会话文件地址；它渲染不了的类型就没有预览，其它项照常能用。 |
| 「在默认应用中打开」是灰的 | 宿主报告这个文件类型没有关联程序。「打开方式 ▸」会列出它实际找到的程序。 |
| 宿主路由返回 `404` | 宿主半没加载。安装或换包之后，新的 JavaScript 模块代要等**应用下次启动**才载入。 |
| 「另存为…」改不了名字 | 只有浏览器的保存对话框（`showSaveFilePicker`）能改名；兜底方案是拷进你选的那个目录。 |

## 卸载 / 回滚

用 `plugin_manager` 的 `action: remove_bundle`、`target: dsh-right-click-menu`：取消选择这个 bundle、删掉依赖、卸载掉。

手工做法：去 profile 的 `package.json` 里，把 `dsh.profile.bundles` 和 `dependencies` 中的这个名字删掉，然后重启。DSH 自带的文件一个都不会动。

## 开发

没有构建步骤：`lib/client.js` 就是 DSH 直接加载的包，宿主半是普通 ESM。

| 改了什么 | 怎么生效 |
|---|---|
| `lib/client.js` | 刷新页面（包的 URL 带着按 mtime/size 算出来的修订号） |
| `lib/index.js` | 重启应用——Node 的 ESM 缓存会留住旧的模块代 |
| `package.json` 里的展示信息 | 刷新页面，Plugin Manager 会重读清单 |

本地改着玩就用路径安装，改完不用重装：

```sh
dsh plugin --profile <profile> add link:/绝对/路径/dsh-right-click-menu
```

### 发布

发布就两条命令：

```sh
npm login      # 第一次，用拥有这个包名的账号
npm publish    # 在本目录执行
```

社区目录（`awesome-dsh-plugin`）的那条条目，发新版本时**不用改**：它指向 `releases/latest/download/dsh-right-click-menu.tgz`，这个资产名不带版本号。

## 许可证

[MIT](LICENSE)
