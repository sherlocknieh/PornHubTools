// ==UserScript==
// @name         PornhubTools
// @namespace    https://github.com/sherlocknieh/
// @version      2026.11.25.1501
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
	}
	var host = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
	if (typeof host.__USERSCRIPT_TEARDOWN__ === "function") host.__USERSCRIPT_TEARDOWN__();
	initialize();
	host.__USERSCRIPT_TEARDOWN__ = dispose;
})();
