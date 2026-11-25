# PornHubTools

Vite 构建的浏览器用户脚本（原生 ES modules，无框架），增强 PornHub、GreasyFork、Tekjam 等站点；产物 `dist/pornhub-tools.user.js`。

## 文档地图

| 要知道什么 | 去哪里 |
| --- | --- |
| 目录、文件职责、入口生命周期、受支持站点 | `docs/architecture.md` |
| 改代码的写法约定（handler、清理、选择器、动态 DOM） | `docs/conventions.md` |
| 开发环境、热更新、版本号与发布机制 | `docs/development.md` |
| 站点改版、选择器失效、脚本不生效 | `docs/known-issues.md` |
| 新功能与机制的来龙去脉 | `docs/features/`、`docs/logic/`（首次记录时创建） |

## 开工流程

1. 定位：按文档地图找承载文件，只动相关文件。
2. 约定：改源码前读 `docs/conventions.md`。
3. 实现：取最小完整集，能改现有 handler 就不新增文件。
4. 验证：`npm run build` 通过；站点行为在目标页实测。
5. 记录：按「记忆落点」更新文档。
6. 提交：`npm run release "<type>: <说明>"`。

## 记忆落点

| 发生了什么 | 写到哪里 |
| --- | --- |
| 新增站点或功能 | `docs/features/<域>.md` |
| 机制、根因 | `docs/logic/<机制>.md` |
| 架构取舍 | `docs/decisions/NNNN-<主题>.md` |
| 站点改版、选择器失效 | `docs/known-issues.md` |
| 文件职责或约定变化 | 同轮改 `docs/architecture.md` / `docs/conventions.md` |

## 自动提交

每轮对话后自行提交（除非只有单处微小细节改动）；仓库有发布脚本时走发布脚本，不先单独 `git commit`；发现会话外改动先弹框问用户如何提交。

## 维护

目录、职责、命令变化时同步更新 `docs/` 并在本文件更新指针。
