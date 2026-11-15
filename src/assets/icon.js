// 脚本图标（userscript 的 @icon 与站点 favicon 共用）：黑圆底 + 白色 PH 文字。
// 注意：文字依赖字体渲染，部分脚本面板/扩展的 SVG 渲染会丢弃 <text>，只剩一个圆。
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <circle cx="32" cy="32" r="32" fill="#000"/>
    <text x="32" y="42" text-anchor="middle" font-size="32" fill="#fff">PH</text>
</svg>`;
