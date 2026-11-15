// 脚本图标（userscript 的 @icon 与站点 favicon 共用）。
// 不透明底图会被部分脚本面板在暗色主题下整体白化/垫成纯白圆，因此改用透明底 + 橙色描边（Pornhub 品牌色），
// 这样白底、暗底与反色剪影下都能看出轮廓；同时纯 path 绘制，不依赖 <text> 的字体。
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <g fill="none" stroke="#ff9000" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="32" cy="32" r="29"/>
        <path d="M18 42V22h6.5a6.5 6.5 0 0 1 0 13H18"/>
        <path d="M37 22v20M46 22v20M37 32h9"/>
    </g>
</svg>`;
