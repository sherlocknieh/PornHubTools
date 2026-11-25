# PornHubTool 项目索引

> 本文件是定位文件的速查表，不是项目介绍。新增文件、调整职责或改动选择器契约时，同步更新这里。

## 常见任务 → 先读哪些文件

| 任务 | 先读 |
| --- | --- |
| 新增站点适配 | `src/core/sites.js`（`@match` 真源）→ `src/handlers/` 里的同类 handler → `src/main.js` |
| 改 PornHub 的某个控件 | `src/handlers/pornhub/dom.js`（选择器契约）→ 对应 handler |
| 处理动态插入的元素 | `src/core/ElementTracker.js` → `src/handlers/photoGrid.js`（结构型跟踪的用法） |
| 调图库窄屏布局 | `src/handlers/photoGrid.js`（装箱算法、样式、清理都在这一处） |
| 改版本号 / 发布 | 只跑 `npm run release`，细节看 `.dev/bump-and-build.mjs` 与 `.dev/release.mjs` |
| 脚本不生效、控制台没日志 | `src/main.js` 的初始化与 teardown，再按 `README-dev.md` 查 CSP |

## 快速命令

```bash
npm run dev                  # 开发调试（浏览器打开 http://localhost:5173）
npm run build                # 只构建，不动版本号
npm run hooks                # 启用 .dev/githooks（提交前自动升版本 + 构建）
npm run release "feat: xxx"  # 升版本 → 构建 → commit → tag → push（--no-push 只本地提交，--dry-run 预览）
```

版本号由 `.dev/bump-and-build.mjs` 按本地时间写入 `vite.config.js`，格式 `YYYY.MM.DD.HHmm`，不要手改，也不要手改 `dist`。

## 项目概览

这是一个使用 Vite 构建的浏览器用户脚本，用于增强 PornHub 及其他目标站点的浏览体验。源码为原生 JavaScript ES modules，不使用前端框架。

## 目录与职责

- `src/main.js`：唯一运行入口；登记各 handler 返回的清理函数，脚本被重复注入时先执行 teardown 再初始化。
- `src/core/ElementTracker.js`：基于 `MutationObserver` 的动态 DOM 元素跟踪器；单例，避免各 handler 重复监听；实例由入口调 `disposeInstance()` 统一释放，handler 不要自己关。
- `src/assets/icon.js`：脚本图标 SVG，`@icon` 与站点 favicon 共用；黑圆白字，圆的填充留 25% 透明（部分扩展面板会把图标整体刷白，不透明黑圆会变成白球、字母一起消失）。
- `src/handlers/video.js`：通用 `<video>` 处理；将视频音量设为 50%、取消静音，并在 Musedam 页面尝试自动播放。
- `src/handlers/pornhub/index.js`：PornHub handler 的聚合入口；负责域名判断，并组合年龄验证、背景播放、favicon、标题、GIF 链接和搜索切换功能。
- `src/handlers/pornhub/`：
  - `dom.js`：PornHub 的选择器契约；站点 class 名是混淆产物，改版时只改这里。
  - `backgroundPlayback.js`：阻止页面因切后台而暂停媒体；改的是页面共享原型，可还原。
  - `favicon.js`：替换 favicon，清理时写回原图标。
  - `videoEnhancements.js`：移除年龄验证、取消 GIF 静音、显示原始标题。
  - `gifLink.js`：为带 `data-gif` 的元素添加 GIF 链接。
  - `searchSwitch.js`：在 Video/GIF 搜索页之间跳转或添加切换按钮；跳转 GIF 搜索页时把搜索词清理为字母、数字和空格。
- `src/handlers/greasyfork.js`：在 GreasyFork 与 SleazyFork 页面之间添加互链。
- `src/handlers/tekjam.js`：在 Tekjam 相册页恢复移动端视图切换控件，并让图片列表使用响应式多列瀑布流（默认 4 列，中等宽度 3 列，窄屏 2 列）；选择 Large photos 时尊重页面的 `data-aview="large"` 状态并恢复单列。
- `src/core/sites.js`：`@match` 列表的唯一真源；构建时供 `vite.config.js` 生成元数据，运行期用 `isSupportedUrl()` 判断当前页面是否受支持，新增站点只改这一处。
- `src/handlers/photoGrid.js`：通用图库窄屏多列（≤767px 变两列）；不登记站点或容器 id，只要页面在 `@match` 内就在整页按结构特征识别图库（容器或子项被砌砖脚本写了内联定位，且子项成片是图片链接），命中后由共享样式统一覆盖。窄屏布局由脚本接管：每张图只在插入时算一次位置（`--pg-x/--pg-y`），新格子放进当前较矮的一列、已有格子永不复排；高度按站点的 `--ratio`（或图片固有比例，兜底 2:3）提前占位，图片下载完成也不改变布局；不用 `column-count`，因为它会随内容变化重新平衡列高；桌面交回站点自己的砌砖脚本。
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
- handler 的初始化函数负责返回清理函数：自己添加的事件监听、observer、定时器、注入的节点和改过的原型方法都要能撤销，入口会按注册逆序调用；共享的 `ElementTracker` 只在入口释放。
- 选择器集中成契约：PornHub 的混淆 class 写在 `src/handlers/pornhub/dom.js`，其它站点的也放在对应 handler 顶部的常量里，不要散落在业务逻辑中。
- 站点专属 handler 应自行判断当前 URL，不要让不匹配的站点执行 DOM 修改。
- 页面可能动态加载内容；处理动态元素时复用 `ElementTracker` 的 `track(selector, callback)`，并保证回调可重复触发而不会重复插入 UI。
- 保持现有的 ES module 写法和单引号风格，避免引入框架或新的运行时依赖。
- 修改 userscript 匹配域名时改 `src/core/sites.js`（`vite.config.js` 会自动引用），不要只修改生成的 `dist/` 文件。
- 版本号、`dist` 产物由 `.dev/githooks/pre-commit`（或 `npm run release`）统一生成；源码、版本号与产物在同一提交里。

## 开工流程

1. 定位：按「常见任务 → 先读哪些文件」找承载文件；不改无关文件。
2. 核对约定：只读与本次改动相关的条目。
3. 实现：取最小完整集，能改现有 handler 就不新增文件。
4. 验证：跑 `npm run build`，结果如实报告；仓库无测试脚本，功能需在目标站点实测。
5. 记录：按「记忆落点」更新文档。
6. 提交：走 `npm run release`，不先单独 `git commit`。

## 记忆落点

| 发生了什么 | 写到哪里 | 判据 |
| --- | --- | --- |
| 新增站点或功能 | `docs/features/<域>.md`（首次记录时创建） | 含日期、需求、实现要点与文件 |
| 机制与根因 | `docs/logic/<机制>.md`（首次记录时创建） | 讲清现状逻辑，如砌砖布局、原型改写 |
| 架构取舍 | `docs/decisions/NNNN-<主题>.md`（首次记录时创建） | 背景、选项、结论、影响 |
| 站点改版与选择器失效 | `docs/known-issues.md`（首次记录时创建） | 现象、原因、规避方式 |

- 只记现状：行为变化直接改写原条目，不留变更史。
- 代码与文档同一轮完成；删功能就删对应文档。

## 验证

| 改动范围 | 命令 | 基线结果 |
| --- | --- | --- |
| 任意源码改动 | `npm run build` | 通过，`dist/pornhub-tools.user.js` 约 24.6 kB |
| 站点功能 | 装 `dist/pornhub-tools.user.js` 到管理器，目标页看控制台 | 需人工确认，无自动化测试 |
| 发布 | `npm run release "feat: xxx"` | 升版本 → 构建 → commit → tag → push |

## 自动提交

每轮对话后自行提交（除非只有单处微小细节改动）；仓库有发布脚本时走发布脚本，不先单独 `git commit`；发现会话外改动先弹框问用户如何提交。
