import ElementTracker from '../../core/ElementTracker.js';
import disableBackgroundPause from './backgroundPlayback.js';
import replaceFavicon from './favicon.js';
import { dismissAgeDisclaimer, showOriginalTitle, unmuteGif } from './videoEnhancements.js';
import addGifLink from './gifLink.js';
import addSearchSwitch from './searchSwitch.js';

export default function initPornhubHandler() {
    const url = window.location.href;
    if (!url.includes('pornhub.com')) return;

    const tracker = new ElementTracker();
    const restoreBackground = disableBackgroundPause();
    const restoreFavicon = replaceFavicon();
    dismissAgeDisclaimer(tracker);
    unmuteGif(tracker);
    showOriginalTitle(tracker);
    const removeGifLinks = addGifLink(tracker);
    const removeSearchSwitch = addSearchSwitch(url);

    // 原型补丁、favicon 和注入的按钮都由本模块还原，跟踪器交给入口统一释放
    return () => {
        restoreBackground();
        restoreFavicon();
        removeGifLinks();
        removeSearchSwitch?.();
    };
}
