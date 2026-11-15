// 动态元素跟踪器
export default class ElementTracker {
    constructor() {
        // 单例模式
        if (ElementTracker.instance) {
            return ElementTracker.instance;
        }
        ElementTracker.instance = this;

        this.root = document.body;
        this.seen = new WeakSet();
        this.selectorMap = new Map();
        // 结构型跟踪：没有稳定选择器、只能看内部结构才能认出的容器（如图库）
        this.structuralHandlers = [];
        this.seenStructural = new WeakSet();
        // 只记变动涉及的候选容器，避免大页面反复全文档扫描
        this.candidates = new Set();
        this.scanTimer = null;
        this.observer = new MutationObserver(this._handleMutations.bind(this));
        // 结构型容器靠内联 style 判定，砌砖脚本常在插入后再写定位，因此也要观察 style 变化
        this.observer.observe(this.root, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    }

    track(selector, callback) {
        this.selectorMap.set(selector, callback);
        this.root.querySelectorAll(selector).forEach(el => {
            if (!this.seen.has(el)) {
                this.seen.add(el);
                callback(el);
            }
        });
        return this;
    }

    /**
     * 跟踪一批「结构特征」而非固定选择器的容器。
     * 图库容器常由站点脚本异步填充、改版后选择器失效，这里只在 DOM 变动后合并扫描一次，
     * 逐个调用 test(el) 判定，命中后交给 callback。callback 需可重复触发而无副作用。
     */
    trackStructure(test, callback, selector = '*') {
        this.structuralHandlers.push({ test, callback, selector });
        this.structureSelector = null;
        this._scheduleStructuralScan();
        return this;
    }

    _selectorForStructure() {
        if (!this.structureSelector) {
            this.structureSelector = [...new Set(this.structuralHandlers.map(h => h.selector))].join(',');
        }
        return this.structureSelector;
    }

    _scheduleStructuralScan() {
        if (this.scanTimer) return;
        // 合并同一轮批量插入（列表页一次插入几十个格子）产生的多次变动
        this.scanTimer = setTimeout(() => {
            this.scanTimer = null;
            this._scanStructure();
        }, 150);
    }

    _scanStructure() {
        const batch = [...this.candidates];
        this.candidates.clear();
        // 首轮按候选标签扫一遍整页，之后只处理变动涉及的节点
        if (!this.scannedOnce) {
            this.scannedOnce = true;
            this.root.querySelectorAll(this._selectorForStructure()).forEach(el => batch.push(el));
        }
        if (!batch.length) return;
        for (const { test, callback } of this.structuralHandlers) {
            for (const el of batch) {
                if (!el.isConnected || this.seenStructural.has(el)) continue;
                if (!test(el)) continue;
                this.seenStructural.add(el);
                callback(el);
            }
        }
    }

    _collectCandidates(node, deep = false) {
        if (node.nodeType !== 1) return;
        this.candidates.add(node);
        // 判定只看容器自身与其直接子项，向上取有限层即可覆盖「先插入子项、后写容器样式」的情况
        let parent = node.parentElement;
        for (let i = 0; i < 2 && parent && parent !== this.root; i++) {
            this.candidates.add(parent);
            parent = parent.parentElement;
        }
        // 只有新增子树才需要往下找已成型的内层容器；style 变动只影响该节点及其外层
        if (deep) node.querySelectorAll(this._selectorForStructure()).forEach(el => this.candidates.add(el));
    }

    _handleMutations(mutationsList) {
        const structural = this.structuralHandlers.length > 0;
        for (const mutation of mutationsList) {
            if (structural) this._collectCandidates(mutation.target);
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) {
                    this.selectorMap.forEach((callback, selector) => {
                        if (node.matches?.(selector) && !this.seen.has(node)) {
                            this.seen.add(node);
                            callback(node);
                        }
                        node.querySelectorAll?.(selector)?.forEach(elem => {
                            if (!this.seen.has(elem)) {
                                this.seen.add(elem);
                                callback(elem);
                            }
                        });
                    });
                    if (structural) this._collectCandidates(node, true);
                }
            }
        }
        // 结构型容器往往整块异步插入、随后才被脚本写定位，变动结束后统一判定
        if (structural) this._scheduleStructuralScan();
    }
}

// 使用示例
// const tracker = new ElementTracker();
// tracker.track('img[data-testid="pin-carousel-image"]', img => {
//     // 处理图片元素
// });