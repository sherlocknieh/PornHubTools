import ElementTracker from '../core/ElementTracker.js';

// 不再登记站点或容器 id：脚本管理器的 @match 决定作用域，页面内自动检测图库结构。
const GRID_ATTR = 'data-photo-grid';
// 格子太少的容器更可能是推荐位、广告位，不当图库处理
const MIN_ITEMS = 6;

// 只在窄屏接管布局；桌面让站点自己的砌砖脚本继续工作
const NARROW_QUERY = '(max-width: 767px)';
const COLUMNS = 2;
const GAP = 6;
// 既拿不到站点比例、也量不到预留高度时的兜底：按常见竖图 2:3 占位，图片解码后立刻换成真实比例
const FALLBACK_RATIO = 2 / 3;
// 标记「高度还是按兜底比例估的」，图片加载完要换成真实比例
const GUESS_ATTR = 'data-pg-guess';

/*
 * 为什么是自己装箱而不是 column-count：
 * 多列布局按整列填充，格子高度一变（图片陆续下载）或末尾追加新格子，浏览器都会重新平衡列高，
 * 于是已有图片在列间来回跳。这里给每张图只在插入时算一次位置（--pg-x/--pg-y），
 * 新格子放进当前较矮的一列，已有格子永不移动；图片高度靠 --pg-ratio 提前占位，下载完成也不撑动布局。
 */
const STYLE_TEXT = `
    @media ${NARROW_QUERY} {
        [${GRID_ATTR}] {
            display: block !important;
            /* 绝对定位的参照物；位置写进 --pg-* 变量，站点砌砖脚本再改内联 top/left 也盖不过 !important 的 var */
            position: relative !important;
            /* 站点把容器内联 translate 到屏幕外，不清掉整块图库会跑到视口右侧 */
            transform: none !important;
            translate: none !important;
            left: auto !important;
            right: auto !important;
            top: auto !important;
            /* 绝对定位的子项不贡献高度，总高由脚本算出写进变量，保证滚动条长度与无限滚动的判定正确 */
            height: var(--pg-height, auto) !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        /* 覆盖砌砖脚本写入的 position/left/top/width/opacity */
        [${GRID_ATTR}] > * {
            position: absolute !important;
            left: var(--pg-x, 0px) !important;
            top: var(--pg-y, 0px) !important;
            width: var(--pg-w, 100%) !important;
            float: none !important;
            display: block !important;
            min-width: 0 !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            /* 格子高度完全由图片决定，忽略站点给格子设的比例，避免与图片尺寸打架出现叠图 */
            aspect-ratio: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            transform: none !important;
            opacity: 1 !important;
            visibility: visible !important;
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

        /* 已知比例时提前占住高度（--pg-ratio 继承自格子），没下载完也不改变布局；比例不准时裁切而非拉伸 */
        [${GRID_ATTR}] > * img {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            max-width: none !important;
            aspect-ratio: var(--pg-ratio, auto) !important;
            object-fit: cover !important;
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
    return /position\s*:\s*(absolute|fixed)/.test(style)
        || /translate/.test(style)
        || /--(?:w|h)\s*:/.test(style);
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
    // 已接管图库的祖先不再当成另一个图库，避免嵌套布局
    if (el.querySelector(`[${GRID_ATTR}]`)) return false;
    // 容器自己就被脚本内联定位（含 translate 到屏幕外的隐藏手法）
    const style = el.getAttribute('style') || '';
    const takenOver = /position\s*:\s*(absolute|fixed)/.test(style) || /translate/.test(style);
    if (!takenOver && ![...el.children].some(isMasonryItem)) return false;
    return hasImageLinks(el);
}

const GALLERY_SELECTOR = 'div, ul, section, main';

// 容器 -> 布局状态：列宽、每列已占用的高度、每个格子的列与顶端位置
const states = new WeakMap();

function isNarrow() {
    return window.matchMedia(NARROW_QUERY).matches;
}

// 站点常把缩略图宽高比写在格子的自定义属性上（如 elitebabes 的 --ratio），用它就能在下载前算准高度；
// 没有的话退到图片自身信息：已解码用自然尺寸，未解码用 width/height 属性
function ratioOf(item) {
    const raw = item.style.getPropertyValue('--ratio')
        || getComputedStyle(item).getPropertyValue('--ratio');
    const ratio = parseFloat(raw);
    if (ratio > 0) return ratio;

    const image = item.querySelector('img');
    if (image && image.naturalWidth && image.naturalHeight) {
        return image.naturalWidth / image.naturalHeight;
    }
    const width = parseFloat(image?.getAttribute('width'));
    const height = parseFloat(image?.getAttribute('height'));
    return width > 0 && height > 0 ? width / height : 0;
}

function containerHeight(state) {
    const total = Math.max(0, ...state.heights);
    return total > 0 ? total - GAP : 0;
}

function syncHeight(el, state) {
    el.style.setProperty('--pg-height', `${containerHeight(state)}px`);
}

// 单张格子：优先用比例算高度；比例未知时先按兜底比例占位，避免图片加载前整页塌成一条
function place(el, state, item) {
    const ratio = ratioOf(item);
    // 比例写在格子上（img 继承），图片按此提前占位，下载完成也不会撑动布局
    item.style.setProperty('--pg-ratio', String(ratio || FALLBACK_RATIO));
    if (ratio) item.removeAttribute(GUESS_ATTR);
    else item.setAttribute(GUESS_ATTR, '');
    const height = Math.max(state.colWidth / (ratio || FALLBACK_RATIO), item.offsetHeight);

    // 放进当前较矮的一列；并列时取左列，顺序可预期
    const col = state.heights[0] <= state.heights[1] ? 0 : 1;
    const top = state.heights[col];
    item.style.setProperty('--pg-x', `${col * (state.colWidth + GAP)}px`);
    item.style.setProperty('--pg-y', `${top}px`);

    state.placed.set(item, { col, top, height });
    state.heights[col] = top + height + GAP;
    resizeObserver.observe(item);
}

// 格子被移除或被重新排序时，保留的旧位置全部失效，只能整体重排
function needsRepack(state, items) {
    const known = [...state.placed.keys()];
    const kept = items.filter(item => state.placed.has(item));
    return kept.length !== known.length || kept.some((item, i) => item !== known[i]);
}

function layout(el) {
    // 宽屏交回站点自己的砌砖脚本，这里只负责窄屏
    if (!isNarrow()) return;
    const width = el.clientWidth;
    if (width <= 0) return;

    const colWidth = (width - GAP * (COLUMNS - 1)) / COLUMNS;
    let state = states.get(el);
    if (!state) {
        state = { colWidth: 0, heights: new Array(COLUMNS).fill(0), placed: new Map() };
        states.set(el, state);
    }

    const items = [...el.children];
    if (needsRepack(state, items) || Math.abs(state.colWidth - colWidth) > 0.5) {
        for (const item of state.placed.keys()) {
            if (!item.isConnected) resizeObserver.unobserve(item);
        }
        state.placed.clear();
        state.heights.fill(0);
        state.colWidth = colWidth;
    }

    // 先统一列宽，量高度时才是最终尺寸
    for (const item of items) item.style.setProperty('--pg-w', `${colWidth}px`);
    for (const item of items) {
        if (!state.placed.has(item)) place(el, state, item);
    }
    syncHeight(el, state);
}

// 图片下载完才露出真实高度（站点没给比例的情况）：只把同列后面的格子跟着挪，前面的和另一列都不动
function applyMeasuredHeight(el, state, item) {
    const placed = state.placed.get(item);
    if (!placed) return;
    const height = item.offsetHeight;
    const delta = height - placed.height;
    if (Math.abs(delta) < 1) return;

    placed.height = height;
    for (const [other, position] of state.placed) {
        if (position.col !== placed.col || position.top <= placed.top) continue;
        position.top += delta;
        other.style.setProperty('--pg-y', `${position.top}px`);
    }
    state.heights[placed.col] += delta;
    syncHeight(el, state);
}

const resizeObserver = new ResizeObserver(entries => {
    for (const { target } of entries) {
        const container = target.closest(`[${GRID_ATTR}]`);
        const state = container && states.get(container);
        if (state) applyMeasuredHeight(container, state, target);
    }
});

// 兜底比例只是占位：图片解码后换成真实比例，高度变化交给 applyMeasuredHeight，仍只挪同列后面的格子
function refineRatio(el, item) {
    if (!item.hasAttribute(GUESS_ATTR)) return;
    const image = item.querySelector('img');
    if (!image || !image.naturalWidth || !image.naturalHeight) return;
    item.removeAttribute(GUESS_ATTR);
    item.style.setProperty('--pg-ratio', String(image.naturalWidth / image.naturalHeight));
    const state = states.get(el);
    if (state) applyMeasuredHeight(el, state, item);
}

// 容器宽度变了（滚动条出现、旋转、窗口缩放）列宽就变了，只能整体重排
const containerObserver = new ResizeObserver(entries => {
    for (const { target } of entries) layout(target);
});

// 无限滚动会不断追加格子：追加多少就只排多少，已有格子不动
function observeContainer(el) {
    el.setAttribute(GRID_ATTR, '');
    layout(el);
    new MutationObserver(() => layout(el)).observe(el, { childList: true });
    containerObserver.observe(el);
    // 图片懒加载，解码完成才知道真实比例；capture 才能收到不冒泡的 load
    el.addEventListener('load', event => {
        const image = event.target;
        if (!(image instanceof HTMLImageElement)) return;
        const item = image.closest(`[${GRID_ATTR}] > *`);
        if (item) refineRatio(el, item);
    }, true);
}

let resizeTimer = null;

function relayoutAll() {
    document.querySelectorAll(`[${GRID_ATTR}]`).forEach(el => layout(el));
}

export default function initPhotoGridHandler() {
    const style = document.createElement('style');
    style.textContent = STYLE_TEXT;
    (document.head || document.documentElement).appendChild(style);

    new ElementTracker().trackStructure(isGalleryContainer, observeContainer, GALLERY_SELECTOR);

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(relayoutAll, 150);
    });
}
