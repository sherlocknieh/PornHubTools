import ElementTracker from '../core/ElementTracker.js';

// 各站点只登记图库容器：脚本用绝对定位/内联宽高砌砖，靠共享样式强制改列。
const GALLERIES = [
    // .static 排除首页的 slider/轮播，只处理静态图库列表
    { host: 'elitebabes.com', containers: ['.list-gallery.css.static'] },
    { host: 'hotnakedwomen.com', containers: ['#main-grid'] },
    { host: 'hdpornpictures.com', containers: ['#main-thumbs-grid'] },
    { host: 'pornpics.com', containers: ['#tiles'] },
];

const GRID_ATTR = 'data-photo-grid';

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

function matchSite(host) {
    return GALLERIES.find(site => host === site.host || host.endsWith(`.${site.host}`));
}

export default function initPhotoGridHandler() {
    const site = matchSite(window.location.hostname);
    if (!site) return;

    const style = document.createElement('style');
    style.textContent = STYLE_TEXT;
    (document.head || document.documentElement).appendChild(style);

    const tracker = new ElementTracker();
    site.containers.forEach(selector => {
        tracker.track(selector, el => el.setAttribute(GRID_ATTR, ''));
    });
}
