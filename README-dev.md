# PornHubTool（开发目录）

源码在 `src/main.js`，用 [vite-plugin-monkey](https://vite-plugin-monkey.pages.dev/) 调试和构建，原生 ES module + 单引号风格，不引入前端框架。

## 开发环境

- [Node.js](https://nodejs.org/) 与 npm
- 依赖只有 `vite` 与 `vite-plugin-monkey`，由 `npm install` 安装

```shell
npm install
npm run hooks   # 指向 .dev/githooks，启用提交前自动升版本 + 构建
npm run dev
```

把终端输出的 `http://localhost:5173/__vite-plugin-monkey.install.user.js` 装进脚本管理器，打开目标站点，改源码保存即热更新。

严格 CSP 的站点会拦掉 localhost 注入，这时把 userscript-dev 技能里的 `dev-kit.mjs` 拷到 `.dev/`，用它拉取构建产物再注入：

```shell
node .dev/dev-kit.mjs --bundle .dev/build/pornhub-tool.user.js --build "vite build --watch --outDir .dev/build"
```

`dev-kit.mjs` 是按需拷贝的调试工具，不属于本仓库源码；调试产物写进 `.dev/build/`（已在 `.gitignore` 里），不覆盖要提交的 `dist/`。

## 版本号与发布

版本号在 `vite.config.js` 的 `userscript.version`，由脚本按本地时间生成 `YYYY.MM.DD.HHmm`，**不要手改，也不要手改 `dist`**。

- 提交前钩子 `.dev/githooks/pre-commit` → `.dev/bump-and-build.mjs`：升版本 → 构建 → 核对产物 `@version`，失败还原配置并中断提交
- `npm run release "feat: …"`：升版本 → 构建 → commit → tag → push；`--no-push` 只做本地提交与标签，`--dry-run` 只预览版本号
- `npm run build`：只构建，不改版本号

源码、版本号与 `dist/pornhub-tools.user.js` 永远在同一个提交里。

## 结构

- `src/main.js`：唯一入口，按顺序初始化所有 handler
- `src/core/`、`src/handlers/`：通用能力与各站点 handler，职责见 [AGENTS.md](./AGENTS.md)
- `.dev/`：版本/发布脚本、提交前钩子、调试产物目录
- `vite.config.js`：userscript 元数据与构建输出
