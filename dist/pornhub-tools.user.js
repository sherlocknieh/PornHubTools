// ==UserScript==
// @name         PornhubTools
// @namespace    https://github.com/sherlocknieh/
// @version      2026.11.25.1639
// @description  增强一些XX网站的浏览体验
// @icon         data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%20width%3D%2264%22%20height%3D%2264%22%3E%0A%20%20%20%20%3Ccircle%20cx%3D%2232%22%20cy%3D%2232%22%20r%3D%2232%22%20fill%3D%22%23000%22%20fill-opacity%3D%220.75%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%2232%22%20y%3D%2232%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22central%22%20font-size%3D%2232%22%20fill%3D%22%23fff%22%3EPH%3C%2Ftext%3E%0A%3C%2Fsvg%3E
// @match        https://greasyfork.org/*
// @match        https://sleazyfork.org/*
// @match        https://*.pornhub.com/*
// @match        https://musedam.cc/*
// @match        https://nsfw.xxx/*
// @match        https://rule34.xxx/*
// @match        https://anacams.com/post/*
// @match        https://www.tekjam.com/album/*
// @match        https://*.elitebabes.com/*
// @match        https://*.hotnakedwomen.com/*
// @match        https://*.hdpornpictures.com/*
// @match        https://*.pornpics.com/*
// @match        https://sichang.xyz/*
// @grant        none
// ==/UserScript==

(function() {
	"use strict";
	var ElementTracker = class ElementTracker {
		constructor() {
			if (ElementTracker.instance) return ElementTracker.instance;
			ElementTracker.instance = this;
			this.root = document.body;
			this.seen = new WeakSet();
			this.selectorMap = new Map();
			this.structuralHandlers = [];
			this.seenStructural = new WeakSet();
			this.candidates = new Set();
			this.scanTimer = null;
			this.observer = new MutationObserver(this._handleMutations.bind(this));
			this.observer.observe(this.root, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["style"]
			});
		}
		track(selector, callback) {
			this.selectorMap.set(selector, callback);
			this.root.querySelectorAll(selector).forEach((el) => {
				if (!this.seen.has(el)) {
					this.seen.add(el);
					callback(el);
				}
			});
			return this;
		}
		trackStructure(test, callback, selector = "*") {
			this.structuralHandlers.push({
				test,
				callback,
				selector
			});
			this.structureSelector = null;
			this._scheduleStructuralScan();
			return this;
		}
		dispose() {
			this.observer.disconnect();
			clearTimeout(this.scanTimer);
			this.scanTimer = null;
			this.selectorMap.clear();
			this.structuralHandlers.length = 0;
			this.candidates.clear();
			this.structureSelector = null;
			this.seen = new WeakSet();
			this.seenStructural = new WeakSet();
			if (ElementTracker.instance === this) ElementTracker.instance = null;
		}
		static disposeInstance() {
			ElementTracker.instance?.dispose();
		}
		_selectorForStructure() {
			if (!this.structureSelector) this.structureSelector = [...new Set(this.structuralHandlers.map((h) => h.selector))].join(",");
			return this.structureSelector;
		}
		_scheduleStructuralScan() {
			if (this.scanTimer) return;
			this.scanTimer = setTimeout(() => {
				this.scanTimer = null;
				this._scanStructure();
			}, 150);
		}
		_scanStructure() {
			const batch = [...this.candidates];
			this.candidates.clear();
			if (!this.scannedOnce) {
				this.scannedOnce = true;
				this.root.querySelectorAll(this._selectorForStructure()).forEach((el) => batch.push(el));
			}
			if (!batch.length) return;
			for (const { test, callback } of this.structuralHandlers) for (const el of batch) {
				if (!el.isConnected || this.seenStructural.has(el)) continue;
				if (!test(el)) continue;
				this.seenStructural.add(el);
				callback(el);
			}
		}
		_collectCandidates(node, deep = false) {
			if (node.nodeType !== 1) return;
			this.candidates.add(node);
			let parent = node.parentElement;
			for (let i = 0; i < 2 && parent && parent !== this.root; i++) {
				this.candidates.add(parent);
				parent = parent.parentElement;
			}
			if (deep) node.querySelectorAll(this._selectorForStructure()).forEach((el) => this.candidates.add(el));
		}
		_handleMutations(mutationsList) {
			const structural = this.structuralHandlers.length > 0;
			for (const mutation of mutationsList) {
				if (structural) this._collectCandidates(mutation.target);
				for (const node of mutation.addedNodes) if (node.nodeType === 1) {
					this.selectorMap.forEach((callback, selector) => {
						if (node.matches?.(selector) && !this.seen.has(node)) {
							this.seen.add(node);
							callback(node);
						}
						node.querySelectorAll?.(selector)?.forEach((elem) => {
							if (!this.seen.has(elem)) {
								this.seen.add(elem);
								callback(elem);
							}
						});
					});
					if (structural) this._collectCandidates(node, true);
				}
			}
			if (structural) this._scheduleStructuralScan();
		}
	};
	function initVideoHandler() {
		new ElementTracker().track("video", (v) => {
			v.volume = .5;
			v.muted = false;
			if (window.location.href.includes("musedam.cc")) v.play();
		});
	}
	var restore = null;
	function disableBackgroundPause() {
		if (restore) return restore;
		Object.defineProperty(document, "hidden", {
			configurable: true,
			get: () => false
		});
		Object.defineProperty(document, "visibilityState", {
			configurable: true,
			get: () => "visible"
		});
		const addEventListener = EventTarget.prototype.addEventListener;
		EventTarget.prototype.addEventListener = function(type, listener, options) {
			if (type === "visibilitychange") return;
			return addEventListener.call(this, type, listener, options);
		};
		const pause = HTMLMediaElement.prototype.pause;
		HTMLMediaElement.prototype.pause = function() {
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
	var FAVICON_URL = "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <circle cx="32" cy="32" r="32" fill="#000" fill-opacity="0.75"/>
    <text x="32" y="32" text-anchor="middle" dominant-baseline="central" font-size="32" fill="#fff">PH</text>
</svg>`);
	function replaceFavicon() {
		const links = [...document.querySelectorAll("link[rel*=\"icon\"]")];
		const originals = links.map((link) => ({
			href: link.href,
			type: link.type
		}));
		for (const link of links) {
			link.href = FAVICON_URL;
			link.type = "image/svg+xml";
		}
		return () => {
			links.forEach((link, index) => {
				if (!link.isConnected) return;
				link.href = originals[index].href;
				link.type = originals[index].type;
			});
		};
	}
	var AGE_DISCLAIMER = ".modalMTubes.ageDisclaimer";
	var AGE_ENTER_BUTTON = ".buttonOver18, .js-closeAgeModal";
	var VOLUME_TOGGLE = "#js-volumeToggle";
	var TITLE_CONTAINER = ".title-container, .headerWrap";
	var TITLE_TEXT = "h1 .inlineFree, .inlineFree";
	var ORIGINAL_TITLE_BUTTON = ".js-originalTranslation";
	var TRANSLATED_TITLE = ".swapTitle";
	var GIF_WRAPPER = "div[data-gif]";
	var GIF_LINK_BUTTON_CLASS = "custom-gif-link-btn";
	var GIF_LINK_BUTTON = `.${GIF_LINK_BUTTON_CLASS}`;
	function dismissAgeDisclaimer(tracker) {
		tracker.track(AGE_DISCLAIMER, (modal) => {
			const enterButton = modal.querySelector(AGE_ENTER_BUTTON);
			if (enterButton) enterButton.click();
			modal.style.display = "none";
			modal.remove();
			document.body.style.overflow = "auto";
			document.documentElement.style.overflow = "auto";
		});
	}
	function unmuteGif(tracker) {
		tracker.track(VOLUME_TOGGLE, (volumeButton) => {
			volumeButton.classList.remove("muted");
		});
	}
	function showOriginalTitle(tracker) {
		tracker.track(TITLE_CONTAINER, (container) => {
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
					if (button) button.classList.add("original");
					if (translatedTitle) translatedTitle.textContent = window.VIDEO_SHOW.seeTranslatedTitle || "查看翻译标题";
				}
			}
		});
	}
	function addGifLink(tracker) {
		const pendingTimers = new Set();
		tracker.track(GIF_WRAPPER, (wrapper) => {
			if (wrapper.querySelector(".custom-gif-link-btn")) return;
			const button = document.createElement("a");
			button.href = wrapper.getAttribute("data-gif");
			button.target = "_blank";
			button.innerText = "GIF";
			button.className = GIF_LINK_BUTTON_CLASS;
			Object.assign(button.style, {
				position: "absolute",
				right: "2px",
				bottom: "2px",
				width: "auto",
				backgroundColor: "rgba(0, 0, 0, 0.6)",
				color: "#fff",
				padding: "2px 4px",
				borderRadius: "3px",
				fontSize: "12px",
				zIndex: "10",
				pointerEvents: "auto"
			});
			wrapper.parentElement?.appendChild(button);
			const timer = setTimeout(() => {
				pendingTimers.delete(timer);
				if (wrapper.isConnected && !wrapper.contains(button)) wrapper.appendChild(button);
			}, 1500);
			pendingTimers.add(timer);
		});
		return () => {
			pendingTimers.forEach(clearTimeout);
			pendingTimers.clear();
			document.querySelectorAll(GIF_LINK_BUTTON).forEach((button) => button.remove());
		};
	}
	function cleanSearchTerm(term) {
		return term.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
	}
	function cleanGifSearch(pageUrl) {
		const term = pageUrl.searchParams.get("search");
		if (!term) return false;
		const cleaned = cleanSearchTerm(term);
		if (cleaned === term) return false;
		pageUrl.searchParams.set("search", cleaned);
		return true;
	}
	function toSearchUrl(pageUrl, type) {
		pageUrl.pathname = `/${type}/search`;
		if (type.startsWith("gif")) cleanGifSearch(pageUrl);
		return pageUrl;
	}
	function createSwitchButton(pageUrl, isVideo) {
		const button = document.createElement("a");
		button.textContent = isVideo ? "ToGIF" : "ToVideo";
		button.href = pageUrl.href;
		Object.assign(button.style, {
			position: "fixed",
			bottom: "20px",
			right: "20px",
			padding: "6px 8px",
			zIndex: 10,
			backgroundColor: "#ff9900",
			color: "white",
			border: "none",
			borderRadius: "999px",
			cursor: "pointer",
			fontSize: "14px",
			boxShadow: "0 2px 5px rgba(0,0,0,0.3)"
		});
		document.body.appendChild(button);
		return button;
	}
	function addSearchSwitch(url) {
		if (!url.includes("search")) return;
		const pageUrl = new URL(url);
		if (/^\/gifs?\/search\/?$/.test(pageUrl.pathname) && cleanGifSearch(pageUrl)) {
			window.location.replace(pageUrl.href);
			return;
		}
		const pageType = pageUrl.pathname.match(/^\/(video|gif|gifs)$/)?.[1];
		if (pageType) {
			window.location.replace(toSearchUrl(pageUrl, pageType).href);
			return;
		}
		const isVideo = pageUrl.pathname.startsWith("/video");
		const button = createSwitchButton(toSearchUrl(pageUrl, isVideo ? "gif" : "video"), isVideo);
		return () => button.remove();
	}
	function initPornhubHandler() {
		const url = window.location.href;
		if (!url.includes("pornhub.com")) return;
		const tracker = new ElementTracker();
		const restoreBackground = disableBackgroundPause();
		const restoreFavicon = replaceFavicon();
		dismissAgeDisclaimer(tracker);
		unmuteGif(tracker);
		showOriginalTitle(tracker);
		const removeGifLinks = addGifLink(tracker);
		const removeSearchSwitch = addSearchSwitch(url);
		return () => {
			restoreBackground();
			restoreFavicon();
			removeGifLinks();
			removeSearchSwitch?.();
		};
	}
	function initGreasyforkHandler() {
		const url = window.location.href;
		const isGreasy = url.includes("greasyfork.org");
		const isSleazy = url.includes("sleazyfork.org");
		if (!isGreasy && !isSleazy) return;
		const target = url.replace(isGreasy ? "greasyfork" : "sleazyfork", isGreasy ? "sleazyfork" : "greasyfork");
		const nav = document.querySelector("#site-nav > nav");
		const li = document.createElement("li");
		const link = document.createElement("a");
		link.href = target;
		link.textContent = isGreasy ? "SleazyFork" : "GreasyFork";
		li.appendChild(link);
		if (nav.firstChild) nav.insertBefore(li, nav.firstChild);
		else nav.appendChild(li);
		return () => li.remove();
	}
	function initTekjamHandler() {
		const url = new URL(window.location.href);
		if (url.hostname !== "www.tekjam.com" || !url.pathname.startsWith("/album/")) return;
		const style = document.createElement("style");
		style.textContent = `
        .photos-list {
            column-count: 4 !important;
        }

        [data-aview="large"] .photos-list {
            column-count: auto !important;
        }

        .photos-list > * {
            break-inside: avoid;
        }

        @media (max-width: 1199px) {
            .photos-list {
                column-count: 3 !important;
            }

            [data-aview="large"] .photos-list {
                column-count: auto !important;
            }
        }

        @media (max-width: 991px) {
            span.view-toggle.d-only {
                display: inline-flex !important;
            }
        }

        @media (max-width: 767px) {
            .photos-list {
                column-count: 2 !important;
            }

            [data-aview="large"] .photos-list {
                column-count: auto !important;
            }
        }
    `;
		(document.head || document.documentElement).appendChild(style);
		return () => style.remove();
	}
	var GRID_ATTR = "data-photo-grid";
	var MIN_ITEMS = 6;
	var NARROW_QUERY = "(max-width: 767px)";
	var COLUMNS = 2;
	var GAP = 6;
	var FALLBACK_RATIO = 2 / 3;
	var GUESS_ATTR = "data-pg-guess";
	var STYLE_TEXT = `
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
	function isMasonryItem(el) {
		if (!el.matches("a, figure, div, li")) return false;
		const style = el.getAttribute("style") || "";
		return /position\s*:\s*(absolute|fixed)/.test(style) || /translate/.test(style) || /--(?:w|h)\s*:/.test(style);
	}
	function hasImageLinks(container) {
		const items = [...container.children];
		if (items.length < MIN_ITEMS) return false;
		const linked = items.filter((item) => item.querySelector("a img, a picture img, img"));
		return linked.length >= MIN_ITEMS && linked.length / items.length >= .6;
	}
	function isGalleryContainer(el) {
		if (!el.matches("div, ul, section, main")) return false;
		if (el.hasAttribute(GRID_ATTR)) return false;
		if (el.querySelector(`[${GRID_ATTR}]`)) return false;
		const style = el.getAttribute("style") || "";
		if (!(/position\s*:\s*(absolute|fixed)/.test(style) || /translate/.test(style)) && ![...el.children].some(isMasonryItem)) return false;
		return hasImageLinks(el);
	}
	var GALLERY_SELECTOR = "div, ul, section, main";
	var states = new WeakMap();
	var containerCleanups = new WeakMap();
	function isNarrow() {
		return window.matchMedia(NARROW_QUERY).matches;
	}
	function ratioOf(item) {
		const raw = item.style.getPropertyValue("--ratio") || getComputedStyle(item).getPropertyValue("--ratio");
		const ratio = parseFloat(raw);
		if (ratio > 0) return ratio;
		const image = item.querySelector("img");
		if (image && image.naturalWidth && image.naturalHeight) return image.naturalWidth / image.naturalHeight;
		const width = parseFloat(image?.getAttribute("width"));
		const height = parseFloat(image?.getAttribute("height"));
		return width > 0 && height > 0 ? width / height : 0;
	}
	function containerHeight(state) {
		const total = Math.max(0, ...state.heights);
		return total > 0 ? total - GAP : 0;
	}
	function syncHeight(el, state) {
		el.style.setProperty("--pg-height", `${containerHeight(state)}px`);
	}
	function place(el, state, item) {
		const ratio = ratioOf(item);
		item.style.setProperty("--pg-ratio", String(ratio || FALLBACK_RATIO));
		if (ratio) item.removeAttribute(GUESS_ATTR);
		else item.setAttribute(GUESS_ATTR, "");
		const height = Math.max(state.colWidth / (ratio || FALLBACK_RATIO), item.offsetHeight);
		const col = state.heights[0] <= state.heights[1] ? 0 : 1;
		const top = state.heights[col];
		item.style.setProperty("--pg-x", `${col * (state.colWidth + GAP)}px`);
		item.style.setProperty("--pg-y", `${top}px`);
		state.placed.set(item, {
			col,
			top,
			height
		});
		state.heights[col] = top + height + GAP;
		resizeObserver.observe(item);
	}
	function needsRepack(state, items) {
		const known = [...state.placed.keys()];
		const kept = items.filter((item) => state.placed.has(item));
		return kept.length !== known.length || kept.some((item, i) => item !== known[i]);
	}
	function layout(el) {
		if (!isNarrow()) return;
		const width = el.clientWidth;
		if (width <= 0) return;
		const colWidth = (width - 6) / COLUMNS;
		let state = states.get(el);
		if (!state) {
			state = {
				colWidth: 0,
				heights: new Array(COLUMNS).fill(0),
				placed: new Map()
			};
			states.set(el, state);
		}
		const items = [...el.children];
		if (needsRepack(state, items) || Math.abs(state.colWidth - colWidth) > .5) {
			for (const item of state.placed.keys()) if (!item.isConnected) resizeObserver.unobserve(item);
			state.placed.clear();
			state.heights.fill(0);
			state.colWidth = colWidth;
		}
		for (const item of items) item.style.setProperty("--pg-w", `${colWidth}px`);
		for (const item of items) if (!state.placed.has(item)) place(el, state, item);
		syncHeight(el, state);
	}
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
			other.style.setProperty("--pg-y", `${position.top}px`);
		}
		state.heights[placed.col] += delta;
		syncHeight(el, state);
	}
	var resizeObserver = new ResizeObserver((entries) => {
		for (const { target } of entries) {
			const container = target.closest(`[${GRID_ATTR}]`);
			const state = container && states.get(container);
			if (state) applyMeasuredHeight(container, state, target);
		}
	});
	function refineRatio(el, item) {
		if (!item.hasAttribute(GUESS_ATTR)) return;
		const image = item.querySelector("img");
		if (!image || !image.naturalWidth || !image.naturalHeight) return;
		item.removeAttribute(GUESS_ATTR);
		item.style.setProperty("--pg-ratio", String(image.naturalWidth / image.naturalHeight));
		const state = states.get(el);
		if (state) applyMeasuredHeight(el, state, item);
	}
	var containerObserver = new ResizeObserver((entries) => {
		for (const { target } of entries) layout(target);
	});
	function observeContainer(el) {
		if (containerCleanups.has(el)) {
			layout(el);
			return;
		}
		el.setAttribute(GRID_ATTR, "");
		layout(el);
		const childObserver = new MutationObserver(() => layout(el));
		childObserver.observe(el, { childList: true });
		containerObserver.observe(el);
		const onLoad = (event) => {
			const image = event.target;
			if (!(image instanceof HTMLImageElement)) return;
			const item = image.closest(`[${GRID_ATTR}] > *`);
			if (item) refineRatio(el, item);
		};
		el.addEventListener("load", onLoad, true);
		containerCleanups.set(el, {
			childObserver,
			onLoad
		});
	}
	var resizeTimer = null;
	var resizeHandler = null;
	var styleElement = null;
	function relayoutAll() {
		document.querySelectorAll(`[${GRID_ATTR}]`).forEach((el) => layout(el));
	}
	function teardown() {
		window.removeEventListener("resize", resizeHandler);
		resizeHandler = null;
		clearTimeout(resizeTimer);
		resizeTimer = null;
		containerObserver.disconnect();
		resizeObserver.disconnect();
		document.querySelectorAll(`[${GRID_ATTR}]`).forEach((container) => {
			const tracked = containerCleanups.get(container);
			if (tracked) {
				tracked.childObserver.disconnect();
				container.removeEventListener("load", tracked.onLoad, true);
				containerCleanups.delete(container);
			}
			container.removeAttribute(GRID_ATTR);
			container.style.removeProperty("--pg-height");
			for (const item of container.children) {
				for (const name of [
					"--pg-x",
					"--pg-y",
					"--pg-w",
					"--pg-ratio"
				]) item.style.removeProperty(name);
				item.removeAttribute(GUESS_ATTR);
			}
		});
		styleElement?.remove();
		styleElement = null;
		states = new WeakMap();
	}
	function initPhotoGridHandler() {
		const style = document.createElement("style");
		style.textContent = STYLE_TEXT;
		(document.head || document.documentElement).appendChild(style);
		styleElement = style;
		new ElementTracker().trackStructure(isGalleryContainer, observeContainer, GALLERY_SELECTOR);
		resizeHandler = () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(relayoutAll, 150);
		};
		window.addEventListener("resize", resizeHandler);
		return teardown;
	}
	var TTS_PATH = "/api/tts";
	var PANEL_ID = "sichang-tts-capture";
	var DEFAULT_SAMPLE_RATE = 24e3;
	var MAX_RECORDS = 20;
	var MAX_SEGMENT_CHARS = 160;
	var MAX_ATTEMPTS = 2;
	var MAX_PCM_BYTES = 67108864;
	var SEGMENT_HEADER = "X-Sichang-Segment";
	var MIN_START_SECONDS = .5;
	var VOICE_GROUPS = [{
		label: "中文",
		voices: [
			{
				id: "mimo_default",
				label: "默认"
			},
			{
				id: "冰糖",
				label: "冰糖（女声）"
			},
			{
				id: "茉莉",
				label: "茉莉（女声）"
			},
			{
				id: "苏打",
				label: "苏打（男声）"
			},
			{
				id: "白桦",
				label: "白桦（男声）"
			}
		]
	}, {
		label: "English",
		voices: [
			{
				id: "Mia",
				label: "Mia（女声）"
			},
			{
				id: "Chloe",
				label: "Chloe（女声）"
			},
			{
				id: "Milo",
				label: "Milo（男声）"
			},
			{
				id: "Dean",
				label: "Dean（男声）"
			}
		]
	}];
	var DEFAULT_VOICE = "mimo_default";
	var VOICE_STORE_KEY = "sichang-tts-voice";
	var RATE_STORE_KEY = "sichang-tts-rate";
	var FOLD_STORE_KEY = "sichang-tts-folded";
	var PANEL_CSS = `
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
.compose { display: flex; flex-direction: column; gap: 6px; padding: 9px 10px; border-bottom: 1px solid #232329; }
.compose textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    max-height: 132px;
    padding: 7px 8px;
    border: 1px solid #2c2c33;
    border-radius: 7px;
    background: #101014;
    color: #e8e8ea;
    font: 12px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif;
    resize: vertical;
}
.compose textarea:focus, .compose select:focus, .compose input:focus { outline: 1px solid #4a4a56; border-color: #4a4a56; }
.compose textarea::placeholder { color: #6f6f79; }
.compose .row { display: flex; align-items: center; gap: 6px; }
.compose select, .compose input {
    height: 26px;
    padding: 0 6px;
    border: 1px solid #2c2c33;
    border-radius: 6px;
    background: #1d1d22;
    color: #d5d5dd;
    font: 12px system-ui, -apple-system, 'Segoe UI', sans-serif;
}
.compose select { flex: 1; min-width: 0; }
.compose input.rate { width: 48px; text-align: center; }
.compose .go {
    height: 26px;
    padding: 0 14px;
    border-radius: 6px;
    background: #2d4a33;
    color: #a9e6b8;
    font-size: 12px;
}
.compose .go:hover { background: #3a5f43; color: #fff; }
.panel.folded { width: auto; }
.panel.folded .compose, .panel.folded .body { display: none; }
.panel.folded .head { border-bottom: 0; }
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
.item[data-live] .bar.determinate .fill { animation: none; }
@keyframes tts-slide { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
@media (max-width: 480px) {
    .panel { width: calc(100vw - 24px); }
}
`;
	function createPanel() {
		const host = document.createElement("div");
		host.id = PANEL_ID;
		host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647;";
		const root = host.attachShadow({ mode: "open" });
		if ("adoptedStyleSheets" in root) {
			const sheet = new CSSStyleSheet();
			sheet.replaceSync(PANEL_CSS);
			root.adoptedStyleSheets = [sheet];
		} else {
			const style = document.createElement("style");
			style.textContent = PANEL_CSS;
			root.appendChild(style);
		}
		const panel = document.createElement("div");
		panel.className = "panel";
		panel.innerHTML = `
        <div class="head">
            <span class="title">语音捕获</span>
            <span class="count">0</span>
            <span class="spacer"></span>
            <button class="clear" hidden>清空</button>
            <button class="fold" aria-label="收起">−</button>
        </div>
        <div class="compose">
            <textarea class="input" rows="2" placeholder="输入或粘贴文本，Ctrl+Enter 合成"></textarea>
            <div class="row">
                <select class="voice" aria-label="音色">${VOICE_GROUPS.map((group) => `
        <optgroup label="${group.label}">
            ${group.voices.map((voice) => `<option value="${voice.id}">${voice.label}</option>`).join("")}
        </optgroup>
    `).join("")}</select>
                <input class="rate" type="number" min="0.5" max="2" step="0.1" value="1" aria-label="语速" title="语速">
                <button class="go">合成</button>
            </div>
        </div>
        <div class="body">
            <div class="empty">点消息下的「朗读」，或在上方输入文本合成</div>
            <div class="list"></div>
        </div>
    `;
		root.appendChild(panel);
		document.documentElement.appendChild(host);
		return {
			host,
			panel,
			list: panel.querySelector(".list"),
			empty: panel.querySelector(".empty"),
			count: panel.querySelector(".count"),
			clear: panel.querySelector(".clear"),
			fold: panel.querySelector(".fold"),
			compose: panel.querySelector(".compose"),
			input: panel.querySelector(".input"),
			voice: panel.querySelector(".voice"),
			rate: panel.querySelector(".rate"),
			go: panel.querySelector(".go")
		};
	}
	function pcmToWav(pcm, sampleRate) {
		const dataLength = pcm.byteLength;
		const buffer = new ArrayBuffer(44 + dataLength);
		const view = new DataView(buffer);
		const write = (offset, text) => {
			for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
		};
		write(0, "RIFF");
		view.setUint32(4, 36 + dataLength, true);
		write(8, "WAVE");
		write(12, "fmt ");
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true);
		view.setUint16(22, 1, true);
		view.setUint32(24, sampleRate, true);
		view.setUint32(28, sampleRate * 2, true);
		view.setUint16(32, 2, true);
		view.setUint16(34, 16, true);
		write(36, "data");
		view.setUint32(40, dataLength, true);
		new Uint8Array(buffer, 44).set(pcm);
		return new Blob([buffer], { type: "audio/wav" });
	}
	function formatDuration(seconds) {
		const total = Math.max(0, Math.round(seconds));
		return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
	}
	function previewText(text) {
		return text.replace(/\[[^\]]{1,10}\]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
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
	function splitText(text) {
		const normalized = String(text || "").replace(/\r/g, "").trim();
		if (!normalized) return [];
		const parts = normalized.split(/(?<=[。！？!?；;…\n])/).filter((part) => part.trim());
		const chunks = [];
		let current = "";
		const flush = () => {
			if (current.trim()) chunks.push(current.trim());
			current = "";
		};
		for (let part of parts) {
			while (part.length > MAX_SEGMENT_CHARS) {
				flush();
				chunks.push(part.slice(0, MAX_SEGMENT_CHARS));
				part = part.slice(MAX_SEGMENT_CHARS);
			}
			if (current.length + part.length > MAX_SEGMENT_CHARS) flush();
			current += part;
		}
		flush();
		return chunks;
	}
	function splitInHalf(text) {
		if (text.length < 40) return null;
		const middle = Math.floor(text.length / 2);
		const before = text.lastIndexOf("，", middle);
		const cut = before > text.length * .3 ? before + 1 : middle;
		return [text.slice(0, cut), text.slice(cut)];
	}
	function initSichangHandler() {
		if (window.location.hostname !== "sichang.xyz") return;
		const ui = createPanel();
		function placePanel() {
			const box = [...document.querySelectorAll("textarea, [contenteditable=\"true\"]")].find((element) => {
				const rect = element.getBoundingClientRect();
				return rect.width > 160 && rect.bottom > window.innerHeight - 160;
			});
			const bottom = box ? Math.max(16, window.innerHeight - box.getBoundingClientRect().top + 12) : 16;
			ui.host.style.bottom = `${Math.round(bottom)}px`;
		}
		placePanel();
		window.addEventListener("resize", placePanel);
		function applyFold(folded) {
			ui.panel.classList.toggle("folded", folded);
			ui.fold.textContent = folded ? "+" : "−";
			ui.fold.setAttribute("aria-label", folded ? "展开" : "收起");
			try {
				localStorage.setItem(FOLD_STORE_KEY, folded ? "1" : "0");
			} catch {}
		}
		ui.fold.addEventListener("click", () => applyFold(!ui.panel.classList.contains("folded")));
		try {
			if (localStorage.getItem(FOLD_STORE_KEY) === "1") applyFold(true);
		} catch {}
		const records = [];
		let activeAudio = null;
		let activeSession = null;
		let activeTimeline = null;
		let audioContext = null;
		function ensureAudioContext() {
			if (!audioContext || audioContext.state === "closed") audioContext = new (window.AudioContext || window.webkitAudioContext)();
			if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
			return audioContext;
		}
		function updateCount() {
			ui.count.textContent = String(records.length);
			ui.clear.hidden = records.length === 0;
			ui.empty.style.display = records.length ? "none" : "";
		}
		function stopActive() {
			if (activeAudio && !activeAudio.paused) activeAudio.pause();
		}
		function stopTimeline(record) {
			if (!record || record.state !== "playing") return;
			clearTimeout(record.timelineTimer);
			clearInterval(record.timelineTicker);
			record.timelineTimer = null;
			record.timelineTicker = null;
			record.session?.abort();
			if (activeSession && activeSession.record === record) activeSession = null;
			record.session = null;
			if (activeTimeline === record) activeTimeline = null;
			record.state = "ready";
			record.playButton.textContent = "播放";
			record.playButton.classList.remove("playing");
			record.bar.classList.remove("show");
			record.fill.style.width = "0%";
			record.duration.textContent = formatDuration(record.seconds);
		}
		function startTimelineTicker(record, session) {
			const total = session.playhead - session.timelineStart;
			const tick = () => {
				if (record.state !== "playing") return;
				const elapsed = session.context.currentTime - session.timelineStart;
				const ratio = Math.min(1, Math.max(0, elapsed / total));
				record.fill.style.width = `${ratio * 100}%`;
			};
			tick();
			record.timelineTicker = setInterval(tick, 250);
			record.timelineTimer = setTimeout(() => stopTimeline(record), Math.max(0, session.playhead - session.context.currentTime) * 1e3 + 80);
		}
		function syncPlayState() {
			for (const record of records) {
				if (record.state !== "ready" || !record.playButton) continue;
				const playing = Boolean(record.audio && !record.audio.paused);
				record.playButton.textContent = playing ? "暂停" : "播放";
				record.playButton.classList.toggle("playing", playing);
			}
		}
		function removeRecord(record) {
			const index = records.indexOf(record);
			if (index >= 0) records.splice(index, 1);
			if (record.audio === activeAudio) activeAudio = null;
			if (activeTimeline === record) activeTimeline = null;
			clearTimeout(record.timelineTimer);
			clearInterval(record.timelineTicker);
			record.audio?.pause();
			record.session?.abort();
			if (activeSession?.record === record) activeSession = null;
			if (record.url) URL.revokeObjectURL(record.url);
			record.row.remove();
			updateCount();
		}
		function beginRecord(text) {
			const record = {
				text,
				time: Date.now(),
				state: "capturing",
				chunks: [],
				bytes: 0,
				seconds: 0,
				url: null,
				sampleRate: DEFAULT_SAMPLE_RATE
			};
			const row = document.createElement("div");
			row.className = "item";
			row.setAttribute("data-live", "");
			const meta = document.createElement("div");
			meta.className = "meta";
			meta.textContent = new Date(record.time).toLocaleTimeString("zh-CN", {
				hour: "2-digit",
				minute: "2-digit"
			});
			const duration = document.createElement("span");
			duration.className = "dur";
			duration.textContent = "捕获中";
			meta.appendChild(duration);
			const mid = document.createElement("div");
			mid.className = "mid";
			const txt = document.createElement("div");
			txt.className = "txt";
			txt.textContent = previewText(text) || "（无文本）";
			txt.title = text;
			const bar = document.createElement("div");
			bar.className = "bar";
			bar.setAttribute("role", "progressbar");
			const fill = document.createElement("div");
			fill.className = "fill";
			bar.appendChild(fill);
			const acts = document.createElement("div");
			acts.className = "acts";
			const playButton = document.createElement("button");
			playButton.textContent = "停止";
			playButton.setAttribute("aria-label", "停止合成");
			const downloadButton = document.createElement("button");
			downloadButton.textContent = "下载";
			downloadButton.setAttribute("aria-label", "下载 WAV");
			downloadButton.disabled = true;
			const deleteButton = document.createElement("button");
			deleteButton.className = "del";
			deleteButton.textContent = "✕";
			deleteButton.setAttribute("aria-label", "删除");
			acts.append(playButton, downloadButton, deleteButton);
			mid.append(txt, acts, bar);
			row.append(meta, mid);
			ui.list.insertBefore(row, ui.list.firstChild);
			bar.classList.add("show");
			Object.assign(record, {
				row,
				duration,
				playButton,
				downloadButton,
				bar,
				fill
			});
			playButton.addEventListener("click", () => {
				if (record.state === "capturing") {
					record.session?.stop();
					return;
				}
				if (record.state === "playing") {
					stopTimeline(record);
					return;
				}
				if (record.audio && !record.audio.paused) {
					record.audio.pause();
					return;
				}
				if (!record.url) return;
				stopActive();
				stopTimeline(activeTimeline);
				if (!record.audio) {
					const audio = new Audio(record.url);
					record.audio = audio;
					audio.addEventListener("pause", syncPlayState);
					audio.addEventListener("ended", () => {
						fill.style.width = "0%";
						bar.classList.remove("show");
						syncPlayState();
					});
					audio.addEventListener("timeupdate", () => {
						if (!Number.isFinite(audio.duration) || !audio.duration) return;
						fill.style.width = `${audio.currentTime / audio.duration * 100}%`;
					});
					bar.addEventListener("click", (event) => {
						if (!Number.isFinite(audio.duration) || !audio.duration) return;
						const rect = bar.getBoundingClientRect();
						const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
						audio.currentTime = ratio * audio.duration;
						fill.style.width = `${ratio * 100}%`;
					});
				}
				activeAudio = record.audio;
				bar.classList.add("show");
				record.audio.play().then(syncPlayState, syncPlayState);
			});
			downloadButton.addEventListener("click", () => {
				if (!record.url) return;
				const link = document.createElement("a");
				link.href = record.url;
				link.download = `sichang-tts-${new Date(record.time).toISOString().replace(/[:.]/g, "-")}.wav`;
				document.body.appendChild(link);
				link.click();
				link.remove();
			});
			deleteButton.addEventListener("click", () => removeRecord(record));
			records.push(record);
			while (records.length > MAX_RECORDS) removeRecord(records[0]);
			updateCount();
			return record;
		}
		function updateProgress(record, done, total) {
			if (!records.includes(record)) return;
			if (total > 1) {
				record.bar.classList.add("determinate");
				record.duration.textContent = `${done}/${total}`;
				record.fill.style.width = `${done / total * 100}%`;
			}
		}
		function markFailed(record) {
			if (!records.includes(record)) return;
			record.state = "failed";
			record.session = null;
			record.row.removeAttribute("data-live");
			record.bar.classList.remove("show");
			record.duration.textContent = "失败";
			record.playButton.textContent = "播放";
			record.playButton.disabled = true;
			record.downloadButton.disabled = true;
		}
		function finalizeRecord(record) {
			if (!records.includes(record) || record.state !== "capturing") return;
			const evenLength = record.bytes - record.bytes % 2;
			const session = record.session;
			record.session = null;
			if (!evenLength) {
				markFailed(record);
				return;
			}
			const pcm = joinedPcm(record.chunks, evenLength);
			record.chunks = [];
			record.url = URL.createObjectURL(pcmToWav(pcm, record.sampleRate));
			record.seconds = evenLength / 2 / record.sampleRate;
			record.state = "ready";
			record.row.removeAttribute("data-live");
			record.bar.classList.remove("show");
			record.bar.classList.remove("determinate");
			record.duration.textContent = formatDuration(record.seconds);
			record.playButton.textContent = "播放";
			record.playButton.disabled = false;
			record.downloadButton.disabled = false;
			if (session && !session.stopped && session.sources.length && session.playhead > session.context.currentTime + .05) {
				if (activeTimeline && activeTimeline !== record) stopTimeline(activeTimeline);
				record.state = "playing";
				record.session = session;
				activeTimeline = record;
				record.playButton.textContent = "停止";
				record.bar.classList.add("show");
				record.bar.classList.add("determinate");
				startTimelineTicker(record, session);
			}
		}
		try {
			const savedVoice = localStorage.getItem(VOICE_STORE_KEY);
			if (savedVoice && [...ui.voice.options].some((option) => option.value === savedVoice)) ui.voice.value = savedVoice;
			const savedRate = Number(localStorage.getItem(RATE_STORE_KEY));
			if (savedRate >= .5 && savedRate <= 2) ui.rate.value = String(savedRate);
		} catch {}
		function submitCompose() {
			const text = ui.input.value.trim();
			if (!text) {
				ui.input.focus();
				return;
			}
			const voice = ui.voice.value || DEFAULT_VOICE;
			const rate = Math.min(2, Math.max(.5, Number(ui.rate.value) || 1));
			try {
				localStorage.setItem(VOICE_STORE_KEY, voice);
				localStorage.setItem(RATE_STORE_KEY, String(rate));
			} catch {}
			ui.input.value = "";
			startSession({
				text,
				voice,
				rate,
				format: "pcm16"
			});
		}
		ui.go.addEventListener("click", submitCompose);
		ui.compose.addEventListener("keydown", (event) => {
			event.stopPropagation();
			if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
				event.preventDefault();
				submitCompose();
			}
		});
		ui.compose.addEventListener("keyup", (event) => event.stopPropagation());
		ui.clear.addEventListener("click", () => {
			for (const record of [...records]) removeRecord(record);
			activeAudio = null;
		});
		function startSource(session, bytes) {
			const count = bytes.byteLength / 2;
			if (!count) return;
			const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
			const samples = new Float32Array(count);
			for (let i = 0; i < count; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
			const context = ensureAudioContext();
			session.context = context;
			const buffer = context.createBuffer(1, count, session.sampleRate);
			buffer.copyToChannel(samples, 0);
			const source = context.createBufferSource();
			source.buffer = buffer;
			source.connect(context.destination);
			const startAt = Math.max(session.playhead, context.currentTime + .06);
			source.start(startAt);
			if (session.timelineStart === null) session.timelineStart = startAt;
			session.playhead = startAt + buffer.duration;
			source.onended = () => {
				const index = session.sources.indexOf(source);
				if (index >= 0) session.sources.splice(index, 1);
			};
			session.sources.push(source);
		}
		function flushPending(session) {
			if (session.stopped || session.started || !session.pendingBytes) return;
			const merged = new Uint8Array(session.pendingBytes);
			let offset = 0;
			for (const part of session.pending) {
				merged.set(part, offset);
				offset += part.length;
			}
			session.pending = [];
			session.pendingBytes = 0;
			session.started = true;
			startSource(session, merged);
		}
		function schedulePcm(session, bytes) {
			if (!session.started) {
				session.pending.push(bytes);
				session.pendingBytes += bytes.length;
				if (session.pendingBytes < session.sampleRate * 2 * MIN_START_SECONDS) return;
				flushPending(session);
				return;
			}
			startSource(session, bytes);
		}
		function stopSources(session) {
			for (const source of session.sources) try {
				source.stop();
			} catch {}
			session.sources.length = 0;
		}
		function startSession({ text, voice, rate, format }) {
			stopTimeline(activeTimeline);
			activeSession?.stop();
			stopActive();
			const tasks = splitText(text);
			if (!tasks.length) return null;
			const record = beginRecord(text);
			ensureAudioContext();
			const session = {
				record,
				stopped: false,
				playhead: 0,
				started: false,
				pending: [],
				pendingBytes: 0,
				timelineStart: null,
				context: null,
				sources: [],
				sampleRate: DEFAULT_SAMPLE_RATE,
				controller: new AbortController(),
				total: tasks.length,
				done: 0
			};
			record.session = session;
			activeSession = session;
			updateProgress(record, 0, session.total);
			const requestSegment = (segmentText) => window.fetch(TTS_PATH, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					[SEGMENT_HEADER]: "1"
				},
				body: JSON.stringify({
					text: segmentText,
					voice,
					rate,
					format
				}),
				signal: session.controller.signal
			}).then((response) => {
				if (!response.ok) throw new Error(`tts ${response.status}`);
				const sampleRate = Number(response.headers.get("X-Sample-Rate")) || DEFAULT_SAMPLE_RATE;
				session.sampleRate = sampleRate;
				record.sampleRate = sampleRate;
				return response;
			});
			let prefetch = null;
			const startPrefetch = (piece) => {
				if (prefetch) return;
				const promise = requestSegment(piece);
				promise.catch(() => {});
				prefetch = {
					piece,
					promise
				};
			};
			const takePrefetch = (piece) => {
				if (prefetch && prefetch.piece === piece) {
					const { promise } = prefetch;
					prefetch = null;
					return promise;
				}
				return requestSegment(piece);
			};
			const consume = async (response) => {
				const reader = response.body.getReader();
				let leftover = new Uint8Array(0);
				for (;;) {
					const { done, value } = await reader.read();
					if (done) break;
					if (!value || !value.length || session.stopped) continue;
					if (record.bytes + value.length > MAX_PCM_BYTES) continue;
					record.chunks.push(value);
					record.bytes += value.length;
					let data = value;
					if (leftover.length) {
						data = new Uint8Array(leftover.length + value.length);
						data.set(leftover);
						data.set(value, leftover.length);
					}
					const evenLength = data.length - data.length % 2;
					if (evenLength) schedulePcm(session, data.subarray(0, evenLength));
					leftover = data.subarray(evenLength);
				}
				flushPending(session);
			};
			const speak = async (piece) => {
				const bytesBefore = record.bytes;
				for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) try {
					const response = await takePrefetch(piece);
					if (session.stopped) return "done";
					if (tasks.length) startPrefetch(tasks[0]);
					await consume(response);
					return "done";
				} catch (error) {
					if (session.stopped || session.controller.signal.aborted) return "done";
				}
				if (record.bytes > bytesBefore) return "done";
				const halves = splitInHalf(piece);
				if (!halves) return "failed";
				tasks.unshift(...halves);
				session.total += halves.length - 1;
				return "split";
			};
			(async () => {
				startPrefetch(tasks[0]);
				while (tasks.length && !session.stopped) {
					const piece = tasks.shift();
					const result = await speak(piece);
					if (session.stopped) break;
					if (result !== "split") session.done += 1;
					updateProgress(record, session.done, session.total);
				}
				if (session.stopped) return;
				finalizeRecord(record);
			})().catch(() => {
				if (!session.stopped) finalizeRecord(record);
			});
			session.stop = () => {
				if (session.stopped) return;
				session.stopped = true;
				try {
					session.controller.abort();
				} catch {}
				stopSources(session);
				if (activeSession === session) activeSession = null;
				if (record.state === "playing") {
					stopTimeline(record);
					return;
				}
				finalizeRecord(record);
			};
			session.abort = () => {
				session.stopped = true;
				try {
					session.controller.abort();
				} catch {}
				stopSources(session);
				if (activeSession === session) activeSession = null;
			};
			return session;
		}
		function parseRequest(init) {
			if (!init || typeof init.body !== "string") return null;
			try {
				const data = JSON.parse(init.body);
				return {
					text: data.text || "",
					voice: data.voice,
					rate: data.rate,
					format: data.format || "pcm16"
				};
			} catch {
				return null;
			}
		}
		function isSegmentRequest(init) {
			const headers = init && init.headers;
			if (!headers) return false;
			if (typeof headers.get === "function") return headers.get(SEGMENT_HEADER) === "1";
			return headers[SEGMENT_HEADER] === "1";
		}
		function silentResponse() {
			const stream = new ReadableStream({ start(controller) {
				controller.enqueue(new Uint8Array(2));
				controller.close();
			} });
			return new Response(stream, {
				status: 200,
				headers: {
					"Content-Type": "audio/pcm",
					"X-Sample-Rate": String(DEFAULT_SAMPLE_RATE)
				}
			});
		}
		const originalFetch = window.fetch;
		window.fetch = function(input, init) {
			if (!(typeof input === "string" ? input : input?.url || "").includes(TTS_PATH) || isSegmentRequest(init)) return originalFetch.apply(this, arguments);
			const request = parseRequest(init);
			if (request && request.text) startSession(request);
			return Promise.resolve(silentResponse());
		};
		return () => {
			window.removeEventListener("resize", placePanel);
			window.fetch = originalFetch;
			for (const record of [...records]) removeRecord(record);
			activeAudio = null;
			activeSession = null;
			activeTimeline = null;
			if (audioContext && audioContext.state !== "closed") try {
				audioContext.close();
			} catch {}
			ui.host.remove();
		};
	}
	var disposers = [];
	var runtime = { initialized: false };
	function run(init) {
		const cleanup = init();
		if (typeof cleanup === "function") disposers.push(cleanup);
	}
	function dispose() {
		for (const cleanup of disposers.splice(0).reverse()) try {
			cleanup();
		} catch (error) {
			console.warn("[PornhubTools] 清理失败", error);
		}
		ElementTracker.disposeInstance();
		runtime.initialized = false;
	}
	function initialize() {
		if (runtime.initialized) dispose();
		runtime.initialized = true;
		run(initVideoHandler);
		run(initPornhubHandler);
		run(initGreasyforkHandler);
		run(initTekjamHandler);
		run(initPhotoGridHandler);
		run(initSichangHandler);
	}
	var host = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
	if (typeof host.__USERSCRIPT_TEARDOWN__ === "function") host.__USERSCRIPT_TEARDOWN__();
	initialize();
	host.__USERSCRIPT_TEARDOWN__ = dispose;
})();
