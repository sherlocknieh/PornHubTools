# 代码约定

改 `src/` 之前先读这一页；它记录的是代码里看不出来的约定，不是文件清单（文件清单见 `architecture.md`）。

## 新增功能

- 在 `src/handlers/` 下新增或扩展现有 handler，并在 `src/main.js` 的 `initialize()` 里注册；通用 `<video>` 逻辑归 `video.js`，图库布局归 `photoGrid.js`。
- 每个 handler 的初始化函数返回清理函数：自己添加的事件监听、observer、定时器、注入节点和改过的原型方法都要能撤销。入口按注册逆序调用，`ElementTracker` 只由入口释放。
- 站点专属 handler 先判断当前 URL，不匹配就直接返回，不执行 DOM 修改。
- 同一个功能只保留一处实现：能扩展已有 handler 就不新建文件。

## 选择器

- 选择器集中成契约：PornHub 的混淆 class 写在 `src/handlers/pornhub/dom.js`，其它站点的放在对应 handler 顶部的常量里。
- 业务逻辑里直接写 class 选择器会让改版时漏改，新增控件一律先加到契约文件。

## 动态 DOM

- 页面内容随时会插入，动态元素统一用 `ElementTracker` 的 `track(selector, callback)` 处理，不各自开 observer。
- 回调会重复触发，插入 UI 前先判断是否已存在，保证幂等。

## 语言与风格

- 原生 ES module、单引号、无框架、无新增运行时依赖。
- 注释写目的与约束（为什么这样做、改版时注意什么），不写步骤复述。

## 配置与产物

- 匹配域名改 `src/core/sites.js`，`vite.config.js` 会自动引用；产物 `dist/` 由构建脚本生成。
- 版本号由 `.dev/bump-and-build.mjs` 写入 `vite.config.js`，格式 `YYYY.MM.DD.HHmm`；源码、版本号与 `dist` 在同一提交里。
