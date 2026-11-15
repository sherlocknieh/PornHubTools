// 脚本图标（userscript 的 @icon 与站点 favicon 共用）：黑圆 + 白色 PH 文字，保持原有外观。
// 圆的填充留 25% 透明：部分脚本面板在深色主题下会用 brightness(0) invert(1) 之类的滤镜把图标整体刷成纯白，
// 不透明的黑色圆会被刷成白圆、白字也变白，整片糊成一个白球；留出透明度差后，刷白时圆呈浅灰、字母仍是纯白，
// 字母轮廓得以保留。正常主题下这点透明肉眼几乎看不出，圆仍是黑的。
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <circle cx="32" cy="32" r="32" fill="#000" fill-opacity="0.75"/>
    <text x="32" y="32" text-anchor="middle" dominant-baseline="central" font-size="32" fill="#fff">PH</text>
</svg>`;
