import { GIF_WRAPPER, GIF_LINK_BUTTON, GIF_LINK_BUTTON_CLASS } from './dom.js';

// 为带 data-gif 的元素补一个 GIF 链接按钮，返回清理函数
export default function addGifLink(tracker) {
    // 按钮先挂到父元素占位、稍后才挪进 GIF 元素，期间可能被清理，需要能撤销
    const pendingTimers = new Set();

    tracker.track(GIF_WRAPPER, wrapper => {
        if (wrapper.querySelector(GIF_LINK_BUTTON)) return;   // 防止重复添加按钮

        const button = document.createElement('a');
        button.href = wrapper.getAttribute('data-gif'); // 获取 GIF 链接
        button.target = '_blank';
        button.innerText = 'GIF';
        button.className = GIF_LINK_BUTTON_CLASS;
        // 设置按钮样式
        Object.assign(button.style, {
            position: 'absolute',
            right: '2px',
            bottom: '2px',
            width: 'auto',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: '#fff',
            padding: '2px 4px',
            borderRadius: '3px',
            fontSize: '12px',
            zIndex: '10',
            pointerEvents: 'auto'
        });
        // 先放在 GIF 父元素里，等 GIF 元素撑开后（加音频等）再挪进去
        wrapper.parentElement?.appendChild(button);
        const timer = setTimeout(() => {
            pendingTimers.delete(timer);
            // 清理过或站点已改版就不要硬塞
            if (wrapper.isConnected && !wrapper.contains(button)) wrapper.appendChild(button);
        }, 1500);
        pendingTimers.add(timer);
    });

    return () => {
        pendingTimers.forEach(clearTimeout);
        pendingTimers.clear();
        document.querySelectorAll(GIF_LINK_BUTTON).forEach(button => button.remove());
    };
}
