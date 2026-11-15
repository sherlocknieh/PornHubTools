# PornHubTool 项目索引

## 快速命令

```bash
npm run dev                  # 开发调试（浏览器打开 http://localhost:5173）
npm run build                # 只构建，不动版本号
npm run hooks                # 启用 .dev/githooks（提交前自动升版本 + 构建）
npm run release "feat: xxx"  # 升版本 → 构建 → commit → tag（--push 推送，--dry-run 预览）
```

版本号由 `.dev/bump-and-build.mjs` 按本地时间写入 `vite.config.js`，格式 `YYYY.MM.DD.HHmm`，不要手改，也不要手改 `dist`。

## 项目概览

这是一个使用 Vite 构建的浏览器用户脚本，用于增强 PornHub 及其他目标站点的浏览体验。源码为原生 JavaScript ES modules，不使用前端框架。

## 目录与职责

- `src/main.js`：唯一运行入口，按顺序初始化所有 handler。
- `src/core/ElementTracker.js`：基于 `MutationObserver` 的动态 DOM 元素跟踪器；当前实现为单例，避免各 handler 重复监听。
- `src/assets/icon.js`：脚本图标 SVG，`@icon` 与站点 favicon 共用；纯 path 绘制，不依赖 `<text>`（部分扩展面板的 SVG 渲染会丢弃文本元素）。
- `src/handlers/video.js`：通用 `<video>` 处理；将视频音量设为 50%、取消静音，并在 Musedam 页面尝试自动播放。
- `src/handlers/pornhub/index.js`：PornHub handler 的聚合入口；负责域名判断，并组合年龄验证、背景播放、favicon、标题、GIF 链接和搜索切换功能。
- `src/handlers/pornhub/`：
  - `backgroundPlayback.js`：阻止页面因切后台而暂停媒体。
  - `favicon.js`：替换 favicon。
  - `videoEnhancements.js`：移除年龄验证、取消 GIF 静音、显示原始标题。
  - `gifLink.js`：为带 `data-gif` 的元素添加 GIF 链接。
  - `searchSwitch.js`：在 Video/GIF 搜索页之间跳转或添加切换按钮；跳转 GIF 搜索页时把搜索词清理为字母、数字和空格。
- `src/handlers/greasyfork.js`：在 GreasyFork 与 SleazyFork 页面之间添加互链。
- `src/handlers/tekjam.js`：在 Tekjam 相册页恢复移动端视图切换控件，并让图片列表使用响应式多列瀑布流（默认 4 列，中等宽度 3 列，窄屏 2 列）；选择 Large photos 时尊重页面的 `data-aview="large"` 状态并恢复单列。
- `src/core/sites.js`：`@match` 列表的唯一真源；构建时供 `vite.config.js` 生成元数据，运行期用 `isSupportedUrl()` 判断当前页面是否受支持，新增站点只改这一处。
- `src/handlers/photoGrid.js`：通用图库窄屏多列（≤767px 变两列）；不登记站点或容器 id，只要页面在 `@match` 内就在整页按结构特征识别图库（容器或子项被砌砖脚本写了内联定位，且子项成片是图片链接），命中后由共享样式统一覆盖。
- `vite.config.js`：userscript 元数据、匹配域名和构建产物配置；`match` 直接引用 `src/core/sites.js`。
- `dist/pornhub-tools.user.js`：构建生成的 userscript 产物；修改源码后通过构建命令更新，不要手工编辑。
- `.dev/`：一切开发构建相关代码。
  - `bump-and-build.mjs`：升版本 + 构建，提交前钩子调用。
  - `release.mjs`：发布（升版本 → 构建 → commit → tag）。
  - `githooks/pre-commit`：提交前自动升版本 + 构建并 `git add vite.config.js dist`。
  - `build/`：调试构建产物，已在 `.gitignore` 中。

## 运行与验证

```bash
npm install
npm run hooks   # 克隆后执行一次，启用提交前自动升版本 + 构建
npm run build
```

`npm run dev` 启动 Vite 开发服务，`npm run preview` 预览构建结果。仓库当前没有单元测试脚本；完成修改后至少运行 `npm run build`，并在目标站点确认控制台无报错、功能可用。

## 开发约定

- 新增站点功能时优先在 `src/handlers/` 下增加或扩展现有 handler，并在 `src/main.js` 注册初始化函数。
- 站点专属 handler 应自行判断当前 URL，不要让不匹配的站点执行 DOM 修改。
- 页面可能动态加载内容；处理动态元素时复用 `ElementTracker` 的 `track(selector, callback)`，并保证回调可重复触发而不会重复插入 UI。
- 保持现有的 ES module 写法和单引号风格，避免引入框架或新的运行时依赖。
- 修改 userscript 匹配域名时改 `src/core/sites.js`（`vite.config.js` 会自动引用），不要只修改生成的 `dist/` 文件。
- 版本号、`dist` 产物由 `.dev/githooks/pre-commit`（或 `npm run release`）统一生成；源码、版本号与产物在同一提交里。
