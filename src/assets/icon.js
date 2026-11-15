// 脚本图标（userscript 的 @icon 与站点 favicon 共用）。
// 黑圆 + 白色 PH 是脚本的标志性外观；PH 用纯 path 笔画而非 <text>，避免部分渲染环境丢弃文本元素后只剩一个空圆。
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <circle cx="32" cy="32" r="32" fill="#000"/>
    <g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 44V22h9a7.5 7.5 0 0 1 0 15h-9"/>
        <path d="M37 22v22M50 22v22M37 33h13"/>
    </g>
</svg>`;
