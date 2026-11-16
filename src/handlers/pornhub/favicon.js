import { ICON_SVG } from '../../assets/icon.js';

const FAVICON_URL = 'data:image/svg+xml;base64,' + btoa(ICON_SVG);

// 替换现有 favicon 并返回还原函数：清理时把原始地址写回去，避免重跑后站点自己的图标丢失
export default function replaceFavicon() {
    const links = [...document.querySelectorAll('link[rel*="icon"]')];
    const originals = links.map(link => ({ href: link.href, type: link.type }));

    for (const link of links) {
        link.href = FAVICON_URL;
        link.type = 'image/svg+xml';
    }

    return () => {
        links.forEach((link, index) => {
            if (!link.isConnected) return;
            link.href = originals[index].href;
            link.type = originals[index].type;
        });
    };
}
