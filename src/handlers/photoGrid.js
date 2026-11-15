import ElementTracker from '../core/ElementTracker.js';
import { isSupportedUrl } from '../core/sites.js';

// 不再登记站点或容器 id：@match 覆盖的页面都会自动检测图库结构。
const GRID_ATTR = 'data-photo-grid';
// 格子太少的容器更可能是推荐位、广告位，不当图库处理
const MIN_ITEMS = 6;

// 窄屏两列；桌面保持站点原布局，不受影响。
const STYLE_TEXT = `
    @media (max-width: 767px) {
        [${GRID_ATTR}] {
            display: block !important;
            position: static !important;
            /* 站点把容器内联 translate 到屏幕外，不清掉整块图库会跑到视口右侧 */
            transform: none !important;
            translate: none !important;
            left: auto !important;
            right: auto !important;
            top: auto !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding: 0 !important;
            column-count: 2 !important;
            column-gap: 6px !important;
        }

        /* 覆盖砌砖脚本写入的 position/left/top/width/opacity */
        [${GRID_ATTR}] > * {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            float: none !important;
            display: block !important;
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            aspect-ratio: auto !important;
            margin: 0 0 6px !important;
            padding: 0 !important;
            border: 0 !important;
            transform: none !important;
            opacity: 1 !important;
            visibility: visible !important;
            break-inside: avoid;
            box-sizing: border-box;
        }

        [${GRID_ATTR}] > * a,
        [${GRID_ATTR}] > * figure {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
        }

        [${GRID_ATTR}] > * img {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            max-width: none !important;
        }
    }
`;

/**
 * 图库容器与单张卡片都是站点的砌砖脚本定位的，因此判定依据是「被脚本接管」的痕迹：
 * 容器自身或子项带内联 position/transform，且子项里成片是图片链接。
 * 这样首页图库、相册页底部相关图库、以后新增的区块都能认出来。
 */
function isMasonryItem(el) {
    if (!el.matches('a, figure, div, li')) return false;
    const style = el.getAttribute('style') || '';
    return /position\s*:\s*(absolute|fixed)/.test(style) || /translate/.test(style);
}

function hasImageLinks(container) {
    const items = [...container.children];
    if (items.length < MIN_ITEMS) return false;
    const linked = items.filter(item => item.querySelector('a img, a picture img, img'));
    return linked.length >= MIN_ITEMS && linked.length / items.length >= 0.6;
}

function isGalleryContainer(el) {
    if (!el.matches('div, ul, section, main')) return false;
    if (el.hasAttribute(GRID_ATTR)) return false;
    // 容器自己就被脚本内联定位（含 translate 到屏幕外的隐藏手法）
    const style = el.getAttribute('style') || '';
    const takenOver = /position\s*:\s*(absolute|fixed)/.test(style) || /translate/.test(style);
    if (!takenOver && ![...el.children].some(isMasonryItem)) return false;
    return hasImageLinks(el);
}

const GALLERY_SELECTOR = 'div, ul, section, main';

export default function initPhotoGridHandler() {
    if (!isSupportedUrl()) return;

    const style = document.createElement('style');
    style.textContent = STYLE_TEXT;
    (document.head || document.documentElement).appendChild(style);

    new ElementTracker().trackStructure(isGalleryContainer, el => el.setAttribute(GRID_ATTR, ''), GALLERY_SELECTOR);
}
