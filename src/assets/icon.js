// 脚本图标（userscript 的 @icon 与站点 favicon 共用）。
// 用纯 path 绘制 PH，不依赖 <text>：扩展面板等环境会用简化 SVG 渲染，文本元素会被丢弃，只剩一个黑圆。
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <circle cx="32" cy="32" r="32" fill="#000"/>
    <g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 44V22h9a7.5 7.5 0 0 1 0 15h-9"/>
        <path d="M37 22v22M50 22v22M37 33h13"/>
    </g>
</svg>`;
