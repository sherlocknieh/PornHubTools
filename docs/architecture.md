# 架构与文件职责

用户脚本由 `src/main.js` 按顺序初始化各 handler，handler 直接操作页面 DOM；没有框架、没有状态管理，也没有常驻后台。

## 入口与生命周期

- `src/main.js` 是唯一运行入口，按 `video → pornhub → greasyfork → tekjam → photoGrid` 顺序初始化。
- 每个 handler 的初始化函数返回清理函数，入口把它们登记进 `disposers`，重复注入时按注册逆序执行清理，最后释放 `ElementTracker` 单例。
- 入口把清理函数挂到 `unsafeWindow.__USERSCRIPT_TEARDOWN__`；脚本管理器重新执行同一份脚本时先调用它，避免观察器、监听器、注入节点和原型包装叠加成多份。
- `runtime.initialized` 只表示当前是否已初始化，重复调用 `initialize()` 会先 `dispose()` 再重建。

## 目录与职责

- `src/core/ElementTracker.js`：基于 `MutationObserver` 的动态 DOM 跟踪器；单例，所有 handler 共用一条监听；实例只由入口调 `disposeInstance()` 释放。
- `src/core/sites.js`：`@match` 列表的唯一真源；构建时 `vite.config.js` 直接引用，运行期各 handler 用 `isSupportedUrl()` 判断当前页是否受支持。
- `src/assets/icon.js`：脚本图标 SVG，`@icon` 与站点 favicon 共用；黑圆白字，圆的填充留 25% 透明（原因见 `known-issues.md`）。
- `src/handlers/video.js`：通用 `<video>` 处理；音量设为 50%、取消静音，并在 Musedam 页面尝试自动播放。
- `src/handlers/pornhub/index.js`：PornHub handler 聚合入口；判断域名后组合年龄验证、背景播放、favicon、标题、GIF 链接与搜索切换。
- `src/handlers/pornhub/dom.js`：PornHub 选择器契约；站点 class 名是混淆产物，改版时只改这里。
- `src/handlers/pornhub/backgroundPlayback.js`：阻止页面因切后台而暂停媒体；改的是页面共享原型，清理时可还原。
- `src/handlers/pornhub/favicon.js`：替换 favicon，清理时写回原图标。
- `src/handlers/pornhub/videoEnhancements.js`：移除年龄验证、取消 GIF 静音、显示原始标题。
- `src/handlers/pornhub/gifLink.js`：为带 `data-gif` 的元素添加 GIF 链接。
- `src/handlers/pornhub/searchSwitch.js`：在 Video/GIF 搜索页之间跳转或添加切换按钮；跳转 GIF 搜索页时把搜索词清理为字母、数字和空格。
- `src/handlers/greasyfork.js`：在 GreasyFork 与 SleazyFork 页面之间添加互链。
- `src/handlers/tekjam.js`：在 Tekjam 相册页恢复移动端视图切换控件，并让图片列表使用响应式多列瀑布流（默认 4 列，中等宽度 3 列，窄屏 2 列）；选择 Large photos 时尊重页面的 `data-aview="large"` 状态并恢复单列。
- `src/handlers/photoGrid.js`：通用图库窄屏多列（≤767px 两列）；不登记站点或容器 id，只在整页按结构特征识别图库（容器或子项被砌砖脚本写了内联定位，且子项成片是图片链接），命中后由共享样式统一覆盖。窄屏布局由脚本接管：每张图仅在插入时算一次位置（`--pg-x/--pg-y`），新格子放进当前较矮的一列，已有格子不复排；高度按站点的 `--ratio` 或图片固有比例提前占位（兜底 2:3）；桌面交回站点自己的砌砖脚本。
- `vite.config.js`：userscript 元数据、匹配域名与构建产物配置；`match` 引用 `src/core/sites.js`。
- `dist/pornhub-tools.user.js`：构建产物，由构建脚本生成。
- `.dev/`：开发构建相关代码。
  - `bump-and-build.mjs`：升版本 + 构建，提交前钩子调用。
  - `release.mjs`：发布（升版本 → 构建 → commit → tag → push）。
  - `githooks/pre-commit`：提交前自动升版本 + 构建并 `git add vite.config.js dist`。
  - `build/`：调试构建产物，已在 `.gitignore` 中。

## 受支持的站点

`src/core/sites.js` 的 `MATCH_PATTERNS` 是唯一真源，当前覆盖：

| 站点 | 匹配 |
| --- | --- |
| GreasyFork / SleazyFork | `greasyfork.org`、`sleazyfork.org` |
| PornHub 及子域 | `*.pornhub.com` |
| Musedam | `musedam.cc` |
| NSFW / rule34 | `nsfw.xxx`、`rule34.xxx` |
| Anacams 帖子页 | `anacams.com/post/*` |
| Tekjam 相册页 | `www.tekjam.com/album/*` |
| Elite Babes / Hot Naked Women / HD Porn Pictures / PornPics 及子域 | 对应域名 |

新增站点只改 `MATCH_PATTERNS`，元数据与运行时判断会同时生效。

## 构建、版本与发布

机制细节见 `README-dev.md`（开发环境、热更新、CSP 调试、版本号规则），此处只记边界：

- `vite.config.js` 的 `userscript.version` 由 `.dev/bump-and-build.mjs` 按本地时间写入，格式 `YYYY.MM.DD.HHmm`。
- `npm run build` 只构建；`npm run release "<msg>"` 升版本、构建、commit、tag、push。
- 源码、版本号与 `dist/pornhub-tools.user.js` 始终在同一个提交里。
