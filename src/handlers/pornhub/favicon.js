import { ICON_SVG } from '../../assets/icon.js';

const favicon = 'data:image/svg+xml;base64,' + btoa(ICON_SVG);

export default function replaceFavicon() {
    document.querySelectorAll('link[rel*="icon"]').forEach(link => {
        link.href = favicon;
        link.type = 'image/svg+xml';
    });
}
