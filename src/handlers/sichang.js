// 思畅 AI 的「朗读」按钮请求 POST /api/tts，拿回 24kHz 单声道 PCM16 流，
// 页面自己用 Web Audio 边下边播，所以 <audio> 元素里没有可下载的音频。
// 这里在 fetch 响应旁边克隆一份流，封装成 WAV 落到右下角面板，供试听和下载。
const TTS_PATH = '/api/tts';
const PANEL_ID = 'sichang-tts-capture';
const DEFAULT_SAMPLE_RATE = 24000;
const MAX_RECORDS = 20;
// 单条最长约 22 分钟；超出后继续把流读完（避免克隆分支积压），但不再保存
const MAX_PCM_BYTES = 64 * 1024 * 1024;

const PANEL_CSS = `
:host { all: initial; }
.panel {
    width: 300px;
    background: #16161a;
    color: #e8e8ea;
    border: 1px solid #2c2c33;
    border-radius: 12px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, .45);
    font: 13px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif;
    overflow: hidden;
}
.head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 10px 9px 12px;
    background: #1d1d22;
    border-bottom: 1px solid #2c2c33;
}
.title { font-weight: 600; }
.count {
    min-width: 20px;
    padding: 0 6px;
    height: 18px;
    line-height: 18px;
    text-align: center;
    border-radius: 9px;
    background: #3a3a44;
    color: #c9c9d1;
    font-size: 11px;
}
.spacer { flex: 1; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; }
button:disabled { opacity: .4; cursor: default; pointer-events: none; }
.head button {
    height: 22px;
    padding: 0 7px;
    border-radius: 6px;
    color: #a9a9b3;
    font-size: 12px;
}
.head button:hover { background: #2c2c33; color: #fff; }
.body { max-height: 340px; overflow: auto; }
.empty { padding: 16px 14px; color: #8a8a94; font-size: 12px; text-align: center; }
.item { display: flex; gap: 9px; padding: 9px 10px 9px 12px; border-bottom: 1px solid #232329; }
.item:last-child { border-bottom: 0; }
.meta { width: 38px; flex: none; padding-top: 1px; color: #80808a; font-size: 11px; }
.meta .dur { display: block; color: #b9b9c2; }
.item[data-live] .dur { color: #d8b46a; animation: tts-pulse 1.2s ease-in-out infinite; }
@keyframes tts-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
.mid { flex: 1; min-width: 0; }
.txt {
    margin-bottom: 6px;
    color: #c9c9d1;
    font-size: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.acts { display: flex; gap: 6px; }
.acts button {
    height: 24px;
    padding: 0 8px;
    border-radius: 6px;
    background: #2a2a32;
    color: #d5d5dd;
    font-size: 12px;
}
.acts button:hover { background: #35353f; color: #fff; }
.acts .del { padding: 0 6px; color: #8a8a94; }
.acts .del:hover { background: #3a2226; color: #ff9a9a; }
.acts .playing { background: #2d4a33; color: #a9e6b8; }
.bar {
    display: none;
    height: 3px;
    margin-top: 7px;
    border-radius: 2px;
    background: #2a2a32;
    overflow: hidden;
    cursor: pointer;
}
.bar.show { display: block; }
.bar .fill { height: 100%; width: 0; background: #5a9e6b; transition: width .15s linear; }
.item[data-live] .bar .fill { width: 35%; background: #d8b46a; animation: tts-slide 1.1s ease-in-out infinite; }
@keyframes tts-slide { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
@media (max-width: 480px) {
    .panel { width: calc(100vw - 24px); }
}
`;

function createPanel() {
    const host = document.createElement('div');
    host.id = PANEL_ID;
    host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;';
    const root = host.attachShadow({ mode: 'open' });
    // 构造式样式表不受页面 style-src 限制，站点收紧 CSP 时面板样式也不会失效
    if ('adoptedStyleSheets' in root) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(PANEL_CSS);
        root.adoptedStyleSheets = [sheet];
    } else {
        const style = document.createElement('style');
        style.textContent = PANEL_CSS;
        root.appendChild(style);
    }
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = `
        <div class="head">
            <span class="title">语音捕获</span>
            <span class="count">0</span>
            <span class="spacer"></span>
            <button class="clear" hidden>清空</button>
            <button class="fold" aria-label="收起">−</button>
        </div>
        <div class="body">
            <div class="empty">点击消息下的「朗读」，音频会自动出现在这里</div>
            <div class="list"></div>
        </div>
    `;
    root.appendChild(panel);
    document.documentElement.appendChild(host);
    return { host, list: panel.querySelector('.list'), empty: panel.querySelector('.empty'), count: panel.querySelector('.count'), clear: panel.querySelector('.clear') };
}

function pcmToWav(pcm, sampleRate) {
    const dataLength = pcm.byteLength;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    const write = (offset, text) => {
        for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
    };
    write(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, dataLength, true);
    new Uint8Array(buffer, 44).set(pcm);
    return new Blob([buffer], { type: 'audio/wav' });
}

function formatDuration(seconds) {
    const total = Math.max(0, Math.round(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function previewText(text) {
    return text.replace(/\[[^\]]{1,10}\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

function joinedPcm(chunks, length) {
    const pcm = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        if (offset >= length) break;
        const part = chunk.subarray(0, Math.min(chunk.length, length - offset));
        pcm.set(part, offset);
        offset += part.length;
    }
    return pcm;
}

export default function initSichangHandler() {
    if (window.location.hostname !== 'sichang.xyz') return;

    const ui = createPanel();
    const records = [];
    let activeAudio = null;

    function updateCount() {
        ui.count.textContent = String(records.length);
        ui.clear.hidden = records.length === 0;
        ui.empty.style.display = records.length ? 'none' : '';
    }

    function stopActive() {
        if (activeAudio && !activeAudio.paused) activeAudio.pause();
    }

    // 单条播放结束或被打断时，把按钮文字和状态一起改回来
    function syncPlayState() {
        for (const record of records) {
            const playing = Boolean(record.audio && !record.audio.paused);
            if (!record.playButton) continue;
            record.playButton.textContent = playing ? '暂停' : '播放';
            record.playButton.classList.toggle('playing', playing);
        }
    }

    function removeRecord(record) {
        const index = records.indexOf(record);
        if (index >= 0) records.splice(index, 1);
        if (record.audio === activeAudio) activeAudio = null;
        record.audio?.pause();
        if (record.url) URL.revokeObjectURL(record.url);
        // 还在传输中的记录要主动断开克隆分支，否则读循环会一直挂着
        try {
            record.reader?.cancel().catch(() => {});
        } catch {}
        record.row.remove();
        updateCount();
    }

    // 请求一返回就先占一行，流还在传时显示「捕获中」，结束时再补齐时长和按钮
    function beginRecord(text) {
        const record = {
            text,
            time: Date.now(),
            state: 'capturing',
            chunks: [],
            bytes: 0,
            seconds: 0,
            url: null,
        };

        const row = document.createElement('div');
        row.className = 'item';
        row.setAttribute('data-live', '');
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = new Date(record.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const duration = document.createElement('span');
        duration.className = 'dur';
        duration.textContent = '捕获中';
        meta.appendChild(duration);

        const mid = document.createElement('div');
        mid.className = 'mid';
        const txt = document.createElement('div');
        txt.className = 'txt';
        txt.textContent = previewText(text) || '（无文本）';
        txt.title = text;

        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.setAttribute('role', 'progressbar');
        const fill = document.createElement('div');
        fill.className = 'fill';
        bar.appendChild(fill);

        const acts = document.createElement('div');
        acts.className = 'acts';
        const playButton = document.createElement('button');
        playButton.textContent = '播放';
        playButton.setAttribute('aria-label', '播放');
        playButton.disabled = true;
        const downloadButton = document.createElement('button');
        downloadButton.textContent = '下载';
        downloadButton.setAttribute('aria-label', '下载 WAV');
        downloadButton.disabled = true;
        const deleteButton = document.createElement('button');
        deleteButton.className = 'del';
        deleteButton.textContent = '✕';
        deleteButton.setAttribute('aria-label', '删除');
        acts.append(playButton, downloadButton, deleteButton);
        mid.append(txt, acts, bar);
        row.append(meta, mid);
        ui.list.insertBefore(row, ui.list.firstChild);
        bar.classList.add('show');

        Object.assign(record, { row, duration, playButton, downloadButton, bar, fill });

        playButton.addEventListener('click', () => {
            if (record.audio && !record.audio.paused) {
                record.audio.pause();
                return;
            }
            if (!record.url) return;
            // 同一时间只放一条，避免边听边叠音
            stopActive();
            if (!record.audio) {
                const audio = new Audio(record.url);
                record.audio = audio;
                audio.addEventListener('pause', syncPlayState);
                audio.addEventListener('ended', () => {
                    fill.style.width = '0%';
                    bar.classList.remove('show');
                    syncPlayState();
                });
                audio.addEventListener('timeupdate', () => {
                    if (!Number.isFinite(audio.duration) || !audio.duration) return;
                    fill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
                });
                bar.addEventListener('click', event => {
                    if (!Number.isFinite(audio.duration) || !audio.duration) return;
                    const rect = bar.getBoundingClientRect();
                    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
                    audio.currentTime = ratio * audio.duration;
                    fill.style.width = `${ratio * 100}%`;
                });
            }
            activeAudio = record.audio;
            bar.classList.add('show');
            record.audio.play().then(syncPlayState, syncPlayState);
        });
        downloadButton.addEventListener('click', () => {
            if (!record.url) return;
            const link = document.createElement('a');
            link.href = record.url;
            link.download = `sichang-tts-${new Date(record.time).toISOString().replace(/[:.]/g, '-')}.wav`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        });
        deleteButton.addEventListener('click', () => removeRecord(record));

        records.push(record);
        while (records.length > MAX_RECORDS) removeRecord(records[0]);
        updateCount();
        return record;
    }

    function finalizeRecord(record, sampleRate) {
        // 捕获中被删掉或被挤出列表的记录不再落盘
        if (!records.includes(record)) return;
        const evenLength = record.bytes - (record.bytes % 2);
        if (!evenLength) {
            removeRecord(record);
            return;
        }
        const pcm = joinedPcm(record.chunks, evenLength);
        record.chunks = [];
        record.reader = null;
        record.url = URL.createObjectURL(pcmToWav(pcm, sampleRate));
        record.seconds = evenLength / 2 / sampleRate;
        record.state = 'ready';
        record.row.removeAttribute('data-live');
        record.bar.classList.remove('show');
        record.duration.textContent = formatDuration(record.seconds);
        record.playButton.disabled = false;
        record.downloadButton.disabled = false;
    }

    ui.clear.addEventListener('click', () => {
        for (const record of [...records]) removeRecord(record);
        activeAudio = null;
    });

    async function capture(response, text) {
        const sampleRate = Number(response.headers.get('X-Sample-Rate')) || DEFAULT_SAMPLE_RATE;
        let reader;
        try {
            reader = response.clone().body?.getReader();
        } catch {
            return;
        }
        if (!reader) return;

        const record = beginRecord(text);
        record.reader = reader;
        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!records.includes(record)) break;
                if (!value?.length) continue;
                if (record.bytes + value.length > MAX_PCM_BYTES) continue;
                record.chunks.push(value);
                record.bytes += value.length;
            }
        } catch {
            // 页面停止播放会取消流，已读到的部分照常保存
        }
        finalizeRecord(record, sampleRate);
    }

    function requestText(init) {
        if (!init || typeof init.body !== 'string') return '';
        try {
            return JSON.parse(init.body).text || '';
        } catch {
            return '';
        }
    }

    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        const pending = originalFetch.apply(this, arguments);
        const url = typeof input === 'string' ? input : input?.url || '';
        if (!url.includes(TTS_PATH)) return pending;
        return pending.then(response => {
            if (response.ok) capture(response, requestText(init)).catch(() => {});
            return response;
        });
    };

    return () => {
        window.fetch = originalFetch;
        for (const record of [...records]) removeRecord(record);
        activeAudio = null;
        ui.host.remove();
    };
}
