// 已装上的补丁的还原函数；重复注入时复用同一份补丁，避免原型方法被反复包装
let restore = null;

/**
 * 让页面察觉不到切后台：伪造 visibility 状态，并丢弃 visibilitychange 监听与隐藏时的暂停。
 * 这些补丁改的是页面共享的原型，必须能还原，否则同一份脚本重跑会层层包装。
 */
export default function disableBackgroundPause() {
    if (restore) return restore;

    // 强制为可见；configurable 才能被清理时删掉，露出原型上的原始 getter
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });

    const addEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        if (type === 'visibilitychange') return;
        return addEventListener.call(this, type, listener, options);
    };

    const pause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function () {
        if (document.hidden) return;
        return pause.apply(this, arguments);
    };

    restore = () => {
        delete document.hidden;
        delete document.visibilityState;
        EventTarget.prototype.addEventListener = addEventListener;
        HTMLMediaElement.prototype.pause = pause;
        restore = null;
    };
    return restore;
}
