# dsh-file-context-menu

给 DSH Web 界面加上 Codex 风格的右键菜单：**文件**、**对话里的文件路径**、**超链接**。

[English](README.md) | 中文

> **给 Agent 的一句话：** *「给 DSH 装上文件右键菜单：调用 `plugin_manager`，`action: install_bundle`，`target: github:AL1ghtm3ter/dsh-file-context-menu`，装完告诉我可以在 DSH 界面上右键文件或链接。」*
> 具体规格、命令行等价写法与验证方法见[给 Agent 的说明](#给-agent-的说明)。

---

## 它能做什么

在 DSH 界面里对着**文件**、**文件路径**或**超链接**右键，就会弹出与这个对象真正匹配的菜单。

| 你在哪右键 | 如何识别 | 得到什么 |
|---|---|---|
| 右侧栏「**文件**」标签的一行 | 该行自身的 `data-files-path` / `data-files-entry` 标记 | 文件动作 |
| **对话消息里的文件路径**（行内代码或正文） | 指针下的 token，先向宿主核实存在 | 文件动作 |
| **聊天渲染出的文件提及** | 提及按钮的 `title` 属性 | 文件动作 |
| **超链接** | 锚点的 `href` | 链接动作（若链接指向文件，再追加文件动作） |

**文件动作**

| 菜单项 | 作用 |
|---|---|
| 在 DSH 中预览 / 在文件树中展开 | 用 DSH 自己的预览打开文件（文件夹则展开） |
| 在默认应用中打开 | `session.openWorkspacePath`，交给系统默认程序 |
| 打开方式 ▸ | 宿主报告的文件关联程序，逐个列出 |
| 在资源管理器中打开 | 在文件管理器中定位该文件 |
| 复制路径 | 绝对路径进剪贴板 |
| 复制相对路径 | 相对会话工作区的路径 |
| 复制文件名 | 路径最后一段 |
| 复制文件内容 | 读取文件并复制文本（上限 1 MiB，二进制会拒绝） |
| 另存为… | 有浏览器保存对话框就调用它，否则用目录选择器 + 宿主拷贝 |

**链接动作**

| 菜单项 | 作用 |
|---|---|
| 在侧边栏中打开 | 在右侧栏的浏览器标签页里打开 |
| 在外部浏览器中打开 | 交给系统默认浏览器 |
| 复制链接地址 | `href` |
| 复制链接文字 | 锚点可见文字 |
| 复制为 Markdown 链接 | `[文字](href)`，可直接粘进文档或提示词 |

若链接指向文件——`dsh-resource://file/…` 地址、`file://` URL、或 `api/file?path=…`
媒体路由——同一个菜单里既有链接动作**也有**完整文件动作。

**其它位置一概不拦截。** 在非文件、非链接处右键仍然弹出浏览器原生菜单，文字选择、
消息操作、代码块、JSON 复制控件全部照常。识别成路径但宿主查不到时，会明确提示
`工作区里没有找到 <path>`，而不是把这次右键悄悄吞掉。

---

## 安装

在 Web 界面里：侧栏 **Plugins → Add plugin**，粘贴下面任一条，点 **Install**。

| 来源 | 粘贴内容 |
|---|---|
| GitHub | `github:AL1ghtm3ter/dsh-file-context-menu` |
| Release 压缩包 | `https://github.com/AL1ghtm3ter/dsh-file-context-menu/releases/latest/download/dsh-file-context-menu.tgz` |
| 本地目录 | 该目录的绝对路径，或打包好的 `.tgz` |

本包**尚未发布到 npm**；`dsh-file-context-menu` 是它将使用的包名，发布只需两条命令，
见[发布](#发布)。

命令行方式（先把 DSH 完全退出）：

```sh
dsh plugin --profile <profile> add github:AL1ghtm3ter/dsh-file-context-menu
```

### 给 Agent 的说明

一句话，用户可以直接粘进对话：

> 给 DSH 装上文件右键菜单：调用 `plugin_manager`，`action: install_bundle`，
> `target: github:AL1ghtm3ter/dsh-file-context-menu`。

Agent 拿到这句话后要做的：

1. **安装** —— `plugin_manager` 的 `action: install_bundle`、`target:
   github:AL1ghtm3ter/dsh-file-context-menu`。该调用会用 profile 自己的 pnpm 安装并把包
   追加进 `dsh.profile.bundles`；返回值的 `application` 字段决定是已生效（`applied`）
   还是需要重启（`restart-required`）。
2. **验证宿主半** —— `GET http://<host>/dsh-file-menu/ping` 应返回 `401`（信任围栏），
   而不是 `404`（没有这条路由）。
3. **验证浏览器半** —— 用 `cordis_inspect_query` 查 client 的 `Slots` 提供方，
   `listSubTree` 传 `{"root": "shell.overlay"}`，占用列表里应出现 `file-context-menu`。
4. **告诉用户去哪右键** —— 右侧栏「文件」标签、对话消息里的文件路径、或超链接。改过
   `lib/client.js` 后需要刷新页面（Ctrl+R）；改**宿主半**需要重启应用。

本包从源码安装**无需构建、无安装脚本**，因此不涉及 `allowBuilds` 授权。

---

## 使用教程

### 文件树里的文件

1. 打开右侧栏，切到「**文件**」标签。
2. 在任意一行右键。文件夹提供「在文件树中展开」；文件还有复制与另存为相关项。
3. 点某一项。菜单关闭，底部弹出提示告知结果（`已复制路径`、`已另存到 <路径>`、
   `打开失败` …）。

### 对话里的文件路径

消息里的路径——无论是模型写在行内代码里还是写在正文里——都会**先按会话工作区核实存在**，
再弹菜单，所以不会对不存在的文件给出动作。

* `src/index.ts` 按会话工作目录解析为相对路径。
* `D:\projects\app\main.py` 按绝对路径解析。
* `production.json` 这种裸文件名，会走编辑器补全用的同一套 `@file` 搜索，因此位于子目录
  的文件也能找到。
* 带空格且加了引号的路径（`"C:\My Projects\a b.txt"`）会整体当作一个路径读取。

若都没找到，提示里会点名它试过的那个 token：`工作区里没有找到 <路径>`。

### 超链接

对任意链接右键——模型用 Markdown 写的链接、工具结果里的链接、DSH 界面自身的链接都算。
**在侧边栏中打开**留在 DSH 里；**在外部浏览器中打开**把网址交给系统浏览器。
`http`/`https` 会同时给出这两项；其它目标（`mailto:`、应用内文件地址）保留一项
「打开链接」，指向文件时再追加文件动作。

---

## 工作原理

```
dsh-file-context-menu/
├── package.json          name = Loader 行名 = lib/client.js 里的注册 id
├── cordis.patch.yml      bundle 的唯一组成层（插入宿主插件那一行）
├── lib/index.js          宿主半：/dsh-file-menu 下 6 条带信任围栏的路由
├── lib/client.js         浏览器半：手写的 __ModuleLoader__ 包
├── icon.svg              Plugin Manager 卡片用的图标
└── locale/{en,zh}.json   卡片标题与描述
```

**宿主半**（`lib/index.js`）—— `webServer` 路由挂在 `/dsh-file-menu` 下，每条都先过
`connection.requestRejection`（Host/Origin 围栏 + 浏览器认证），并校验方法、媒体类型、
64 KiB 请求体上限与绝对路径：

| 路由 | 用途 |
|---|---|
| `GET /ping` | 存活探针 |
| `GET /raw?path=` | 原始字节，供浏览器侧「另存为」 |
| `POST /stat` | `{ path }` → `{ exists, kind, size, mtimeMs }` |
| `POST /read` | `{ path }` → `{ text, binary, truncated, size }`（上限 1 MiB） |
| `POST /save-as` | `{ from, to }` → 字节拷贝 |
| `POST /write-text` | `{ path, text }` → 写入 UTF-8（兜底路径） |

它只 import Node 内置模块，因此不依赖应用自带的 `@deepseek-ai/*` 依赖图就能解析。

**浏览器半**（`lib/client.js`）—— 一个 document 级、捕获阶段的 `contextmenu` 监听，
加一个 `shell.overlay` 占位，负责在指针位置渲染 Menu 原语与提示条。它只 require 平台的
种子模块（`react`、`react/jsx-runtime`、`@deepseek-ai/dsh-client-ui-primitives`），
其余 DSH 能力都通过 scoped injection 取得。

### 开发注意：嵌套 Remote 命名空间

Cordis 把 `ctx.remote.workspaceFiles` 视作虚拟服务 `remote.workspaceFiles`，未注入该点号
全名的 fiber 上做属性访问会抛：

```
cannot get property "remote.workspaceFiles" without inject
```

本插件因此**按命名空间分别**做一次 scoped injection：

```js
ctx.inject(["remote", "remote.workspaceFiles"], (scope) => {
  remotes.files = scope.remote.workspaceFiles;
});
```

一个命名空间一条注入（而不是把它们全塞进插件的 `inject` 列表），可以让某一个命名空间
缺失时只降级对应功能，而不会把整个插件 fiber 卡在 `pending`。普通服务属性不受影响：
`ctx.get("sessions").list` 无需注入。

---

## 常见问题

| 现象 | 原因与处理 |
|---|---|
| 右键没反应 | 该位置不是文件也不是链接，所以按设计弹的是原生菜单。若是文件路径，看提示条：宿主查不到的 token 会被点名。 |
| 文件树能用、对话里不行 | 浏览器半是旧版本。刷新页面（Ctrl+R）；不同组成下 `lib/client.js` 的改动未必热重载。 |
| 「在 DSH 中预览」提示无法预览 | 侧栏文档预览只认会话文件地址；它渲染不了的类型就没有预览，其它项照常可用。 |
| 「在默认应用中打开」是灰的 | 宿主报告该文件类型没有关联程序；「打开方式 ▸」会列出它实际报告的程序。 |
| 宿主路由返回 `404` | 宿主半没加载。安装或替换包后，新的 JavaScript 模块代只在**应用下次启动**时载入。 |
| 「另存为…」不能改名 | 只有浏览器的保存对话框（`showSaveFilePicker`）能改名；兜底方案是拷进你选的目录。 |

---

## 卸载 / 回滚

`plugin_manager` 的 `action: remove_bundle`、`target: dsh-file-context-menu`：取消选择该
bundle、移除依赖并卸载。手工做法是从 profile 的 `package.json` 里删掉
`dsh.profile.bundles` 与 `dependencies` 中的这个名字，然后重启。不会修改 DSH 自带的任何
文件。

---

## 开发

没有构建步骤：`lib/client.js` 就是 DSH 直接加载的包，宿主半是普通 ESM。

| 改动 | 生效方式 |
|---|---|
| `lib/client.js` | 刷新页面（包 URL 带按 mtime/size 生成的修订号） |
| `lib/index.js` | 重启应用 —— Node 的 ESM 缓存会保留旧的模块代 |
| `package.json` 展示元数据 | 刷新页面，Plugin Manager 会重读清单 |

本地迭代用路径安装，改完不必重装：

```sh
dsh plugin --profile <profile> add link:/绝对/路径/dsh-file-context-menu
```

## 发布

发布只有两条命令：

```sh
npm login      # 首次，用拥有该包名的账号
npm publish    # 在本目录执行
```

社区目录（`awesome-dsh-plugin`）的条目在发新版本时**无需改动**：它指向
`releases/latest/download/dsh-file-context-menu.tgz`，这个资产名不带版本号。

---

## 许可证

[MIT](LICENSE)
