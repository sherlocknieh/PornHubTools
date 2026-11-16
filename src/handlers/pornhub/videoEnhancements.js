import {
    AGE_DISCLAIMER,
    AGE_ENTER_BUTTON,
    VOLUME_TOGGLE,
    TITLE_CONTAINER,
    TITLE_TEXT,
    ORIGINAL_TITLE_BUTTON,
    TRANSLATED_TITLE,
} from './dom.js';

export function dismissAgeDisclaimer(tracker) {
    tracker.track(AGE_DISCLAIMER, modal => {
        const enterButton = modal.querySelector(AGE_ENTER_BUTTON);
        if (enterButton) enterButton.click();
        modal.style.display = 'none';
        modal.remove();
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
    });
}

export function unmuteGif(tracker) {
    tracker.track(VOLUME_TOGGLE, volumeButton => {
        volumeButton.classList.remove('muted');
    });
}

export function showOriginalTitle(tracker) {
    tracker.track(TITLE_CONTAINER, container => {
        const title = container.querySelector(TITLE_TEXT);
        const button = container.querySelector(ORIGINAL_TITLE_BUTTON);
        const translatedTitle = button ? button.querySelector(TRANSLATED_TITLE) : null;

        if (window.VIDEO_SHOW?.videoTitleOriginal && title) {
            const originalTitle = window.VIDEO_SHOW.videoTitleOriginal.trim();
            const currentTitle = title.innerHTML.trim();
            document.title = originalTitle;
            if (currentTitle !== originalTitle) {
                title.innerHTML = originalTitle;
                window.titleWrapper = title;
                if (button) button.classList.add('original');
                if (translatedTitle) {
                    translatedTitle.textContent = window.VIDEO_SHOW.seeTranslatedTitle || '查看翻译标题';
                }
            }
        }
    });
}
