/**
 * CORE LISTENING ENGINE - KET A2 Key English Test
 * Phiên bản hoàn chỉnh - HighlightManagerHybrid + Context Menu
 *
 * Tính năng:
 * - Highlight thông minh (metadata + fallback innerHTML)
 * - Context menu chuột phải (Vàng, Xanh, Hồng, Xóa)
 * - Toggle ẩn/hiện highlight cá nhân
 * - Transcript chỉ hiện sau khi nộp bài
 * - Quick Note kéo thả, MiniDashboard tiến độ
 * - Tự động lưu draft, reset modal
 */

// ==================== HIGHLIGHT MANAGER HYBRID ====================
class HighlightManagerHybrid {
    constructor(core) {
        this.core = core;
        this.highlights = [];
        this.fallbacks = {};
        this.storageKey = '';
        this.VERSION = 3;
        this.selectedRange = null;

        this.colorClasses = {
            yellow: 'highlight-yellow',
            green: 'highlight-green',
            pink: 'highlight-pink'
        };

        this.containerSelectors = [
            '#transcriptContent',
            '#questionsContainer',
            '.transcript-content',
            '.questions-list',
            '#mainArea',
            '.single-col',
            '.left-col',
            '.questions-panel',
            '.reading-content',
            '.reading-card',
            '.question-item',
            '.options',
            'label'
        ];

        this.CONTEXT_LENGTH = 30;

        // Tạo context menu nếu chưa có
        this.ensureContextMenuExists();
        this.setupContextMenu();
    }

    // Đảm bảo context menu tồn tại trong DOM
    ensureContextMenuExists() {
        if (document.getElementById('contextMenu')) return;
        const menu = document.createElement('div');
        menu.id = 'contextMenu';
        menu.className = 'context-menu';
        menu.style.cssText = `
            display: none;
            position: absolute;
            background: white;
            border: 1px solid #ccc;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 4px 0;
            z-index: 10000;
            min-width: 140px;
        `;
        menu.innerHTML = `
            <div class="context-menu-item" data-color="yellow" style="padding: 8px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 16px; height: 16px; background: #fff3a1; border: 1px solid #e6b800; border-radius: 3px;"></span>
                <span>Highlight Vàng</span>
            </div>
            <div class="context-menu-item" data-color="green" style="padding: 8px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 16px; height: 16px; background: #b8e6b8; border: 1px solid #2e8b57; border-radius: 3px;"></span>
                <span>Highlight Xanh</span>
            </div>
            <div class="context-menu-item" data-color="pink" style="padding: 8px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 16px; height: 16px; background: #f9c6c9; border: 1px solid #c0504d; border-radius: 3px;"></span>
                <span>Highlight Hồng</span>
            </div>
            <div class="context-menu-divider" style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>
            <div class="context-menu-item remove-item" style="padding: 8px 16px; cursor: pointer; color: #c00;">
                <span>🗑️ Xóa highlight</span>
            </div>
        `;
        document.body.appendChild(menu);
    }

    setupContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (!menu) return;

        // Sự kiện chọn màu
        menu.querySelectorAll('[data-color]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = item.dataset.color;
                this.addHighlightFromSelection(color);
                this.hideContextMenu();
            });
        });

        // Sự kiện xóa
        const removeItem = menu.querySelector('.remove-item');
        if (removeItem) {
            removeItem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeHighlightFromSelection();
                this.hideContextMenu();
            });
        }

        // Ngăn menu tự đóng khi click bên trong
        menu.addEventListener('mousedown', (e) => e.preventDefault());

        // Đóng menu khi click ra ngoài
        document.addEventListener('click', () => this.hideContextMenu());

        // Xử lý chuột phải để mở menu
        document.addEventListener('contextmenu', (e) => {
            // Kiểm tra vùng được phép highlight
            const highlightArea = e.target.closest(this.containerSelectors.join(','));
            if (!highlightArea) return;

            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || selection.toString().trim() === '') return;

            e.preventDefault();
            this.selectedRange = selection.getRangeAt(0).cloneRange();
            this.showContextMenu(e.pageX, e.pageY);
        });
    }

    showContextMenu(x, y) {
        const menu = document.getElementById('contextMenu');
        if (!menu) return;
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';
    }

    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) menu.style.display = 'none';
        // Không xóa selectedRange ngay, chỉ khi áp dụng hoặc hủy
    }

    init(storageKey) {
        this.storageKey = storageKey;
        this.loadHighlights();
    }

    // ==================== TIỆN ÍCH DOM ====================
    getSelectorForElement(el) {
        if (el.id) return `#${el.id}`;
        if (el.className && typeof el.className === 'string') {
            return `.${el.className.split(' ')[0]}`;
        }
        return el.tagName.toLowerCase();
    }

    findContainerForNode(node) {
        for (const selector of this.containerSelectors) {
            const el = document.querySelector(selector);
            if (el && el.contains(node)) return el;
        }
        return null;
    }

    // ==================== TÌM KIẾM TEXT THÔNG MINH ====================
    findTextOccurrences(container, searchText) {
        const occurrences = [];
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            { acceptNode: node => node.nodeValue ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
        );

        const fullText = container.textContent;

        let node;
        while (node = walker.nextNode()) {
            const nodeText = node.nodeValue;
            let startIndex = 0;
            let index;
            while ((index = nodeText.indexOf(searchText, startIndex)) !== -1) {
                const range = document.createRange();
                range.setStart(node, index);
                range.setEnd(node, index + searchText.length);

                const rangeStartOffset = this.getAbsoluteOffset(container, range.startContainer, range.startOffset);
                const before = fullText.substring(
                    Math.max(0, rangeStartOffset - this.CONTEXT_LENGTH),
                    rangeStartOffset
                );
                const after = fullText.substring(
                    rangeStartOffset + searchText.length,
                    Math.min(fullText.length, rangeStartOffset + searchText.length + this.CONTEXT_LENGTH)
                );

                occurrences.push({ range, before, after });
                startIndex = index + searchText.length;
            }
        }
        return occurrences;
    }

    getAbsoluteOffset(container, node, offset) {
        let totalOffset = 0;
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            { acceptNode: () => NodeFilter.FILTER_ACCEPT }
        );
        let currentNode;
        while (currentNode = walker.nextNode()) {
            if (currentNode === node) {
                totalOffset += offset;
                break;
            }
            totalOffset += currentNode.nodeValue.length;
        }
        return totalOffset;
    }

    // ==================== SERIALIZE / DESERIALIZE ====================
    serializeRange(range, color) {
        try {
            const container = this.findContainerForNode(range.commonAncestorContainer);
            if (!container) return null;

            const text = range.toString();
            if (!text) return null;

            const containerSelector = this.getSelectorForElement(container);
            const fullText = container.textContent;
            const absoluteStart = this.getAbsoluteOffset(container, range.startContainer, range.startOffset);
            const before = fullText.substring(
                Math.max(0, absoluteStart - this.CONTEXT_LENGTH),
                absoluteStart
            );
            const after = fullText.substring(
                absoluteStart + text.length,
                Math.min(fullText.length, absoluteStart + text.length + this.CONTEXT_LENGTH)
            );

            return {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                containerSelector,
                text,
                color,
                before,
                after,
                timestamp: Date.now()
            };
        } catch (e) {
            console.error('[Hybrid] Serialize error:', e);
            return null;
        }
    }

    applyHighlight(metadata) {
        try {
            const container = document.querySelector(metadata.containerSelector);
            if (!container) return false;

            const occurrences = this.findTextOccurrences(container, metadata.text);
            if (occurrences.length === 0) return false;

            let targetRange;
            if (occurrences.length === 1) {
                targetRange = occurrences[0].range;
            } else {
                targetRange = this.selectBestMatch(occurrences, metadata.before, metadata.after);
                if (!targetRange) return false;
            }

            this.wrapRangeWithHighlight(targetRange, metadata.color);
            return true;
        } catch (e) {
            console.warn('[Hybrid] Apply error:', e);
            return false;
        }
    }

    selectBestMatch(occurrences, savedBefore, savedAfter) {
        let bestMatch = null;
        let bestScore = 0;

        for (const occ of occurrences) {
            let score = 0;
            if (savedBefore && occ.before) {
                score += this.stringSimilarity(savedBefore, occ.before);
            }
            if (savedAfter && occ.after) {
                score += this.stringSimilarity(savedAfter, occ.after);
            }
            if (score > bestScore) {
                bestScore = score;
                bestMatch = occ.range;
            }
        }
        return bestScore > 0.5 ? bestMatch : null;
    }

    stringSimilarity(a, b) {
        if (!a || !b) return 0;
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) return 1;
        const distance = this.levenshteinDistance(a, b);
        return 1 - distance / maxLen;
    }

    levenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    // ==================== HIGHLIGHT DOM ====================
    wrapRangeWithHighlight(range, color) {
        const className = this.colorClasses[color] || this.colorClasses.yellow;
        const textNodes = this.getTextNodesInRange(range);

        for (const textNode of textNodes) {
            let startOffset = 0;
            let endOffset = textNode.length;
            if (textNode === range.startContainer) startOffset = range.startOffset;
            if (textNode === range.endContainer) endOffset = range.endOffset;
            if (startOffset === endOffset) continue;

            const nodeRange = document.createRange();
            nodeRange.setStart(textNode, startOffset);
            nodeRange.setEnd(textNode, endOffset);

            try {
                const span = document.createElement('span');
                span.className = className;
                span.setAttribute('data-highlight-id', Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5));
                if (this.core && !this.core.personalHighlightsVisible) span.classList.add('highlight-hidden');
                nodeRange.surroundContents(span);
            } catch (e) {
                const fragment = nodeRange.extractContents();
                const span = document.createElement('span');
                span.className = className;
                span.setAttribute('data-highlight-id', Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5));
                if (this.core && !this.core.personalHighlightsVisible) span.classList.add('highlight-hidden');
                span.appendChild(fragment);
                nodeRange.insertNode(span);
            }
        }
    }

    getTextNodesInRange(range) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (range.intersectsNode(node) && node.nodeValue.trim() !== '') {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );
        let node;
        while (node = walker.nextNode()) textNodes.push(node);
        return textNodes;
    }

    // ==================== THÊM / XÓA HIGHLIGHT ====================
    addHighlightFromSelection(color) {
        if (!this.selectedRange) return false;

        const range = this.selectedRange;
        const metadata = this.serializeRange(range, color);
        if (!metadata) return false;

        const container = document.querySelector(metadata.containerSelector);
        const occurrences = this.findTextOccurrences(container, metadata.text);
        const needsFallback = occurrences.length > 1;

        if (needsFallback) {
            this.fallbacks[metadata.containerSelector] = container.innerHTML;
        }

        this.wrapRangeWithHighlight(range, color);
        this.highlights.push(metadata);
        this.saveHighlights();

        window.getSelection().removeAllRanges();
        this.selectedRange = null;
        return true;
    }

    removeHighlightFromSelection() {
        if (!this.selectedRange) return false;

        const range = this.selectedRange;
        const spans = this.getHighlightSpansInRange(range);

        if (spans.length === 0) {
            // Nếu không tìm thấy span, thử tìm theo metadata
            const text = range.toString();
            if (text) {
                // Xóa metadata khớp với văn bản và vị trí
                const toRemove = this.highlights.filter(h => h.text === text);
                toRemove.forEach(h => {
                    const index = this.highlights.indexOf(h);
                    if (index !== -1) this.highlights.splice(index, 1);
                });
                this.saveHighlights();
            }
        } else {
            spans.forEach(span => {
                const id = span.getAttribute('data-highlight-id');
                if (id) {
                    const index = this.highlights.findIndex(h => h.id === id);
                    if (index !== -1) this.highlights.splice(index, 1);
                }
                const parent = span.parentNode;
                if (parent) {
                    parent.replaceChild(document.createTextNode(span.textContent), span);
                    parent.normalize();
                }
            });
            this.saveHighlights();
        }

        window.getSelection().removeAllRanges();
        this.selectedRange = null;
        return true;
    }

    getHighlightSpansInRange(range) {
        const spans = [];
        const walker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => {
                    if (node.classList &&
                        (node.classList.contains('highlight-yellow') ||
                         node.classList.contains('highlight-green') ||
                         node.classList.contains('highlight-pink'))) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );
        let node;
        while (node = walker.nextNode()) {
            if (range.intersectsNode(node)) spans.push(node);
        }
        return spans;
    }

    clearAllHighlightSpans() {
        const spans = document.querySelectorAll('.highlight-yellow, .highlight-green, .highlight-pink');
        spans.forEach(span => {
            const parent = span.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(span.textContent), span);
                parent.normalize();
            }
        });
    }

    renderHighlights() {
        let successCount = 0;
        const failedContainers = new Set();

        for (const h of this.highlights) {
            if (this.applyHighlight(h)) {
                successCount++;
            } else {
                failedContainers.add(h.containerSelector);
            }
        }

        // Fallback innerHTML
        if (failedContainers.size > 0) {
            for (const selector of failedContainers) {
                const fallbackHTML = this.fallbacks[selector];
                if (fallbackHTML) {
                    const container = document.querySelector(selector);
                    if (container) {
                        const inputs = Array.from(container.querySelectorAll('input, select, textarea'));
                        const inputStates = inputs.map(input => ({
                            input,
                            checked: input.checked,
                            value: input.value
                        }));

                        container.innerHTML = fallbackHTML;

                        inputStates.forEach(({input, checked, value}) => {
                            const sameInput = container.querySelector(`#${input.id}`) ||
                                              container.querySelector(`[name="${input.name}"]`);
                            if (sameInput) {
                                sameInput.checked = checked;
                                sameInput.value = value;
                            }
                        });

                        console.log(`[Hybrid] Restored ${selector} from innerHTML fallback`);
                    }
                }
            }
        }

        console.log(`[Hybrid] Rendered ${successCount}/${this.highlights.length} highlights via metadata`);
    }

    // ==================== LƯU TRỮ ====================
    saveHighlights() {
        try {
            const data = {
                version: this.VERSION,
                highlights: this.highlights,
                fallbacks: this.fallbacks,
                timestamp: Date.now()
            };
            const json = JSON.stringify(data);
            console.log(`[Hybrid] Saved ${this.highlights.length} highlights (${json.length} bytes)`);
            this.core._safeSetStorage(this.storageKey, json);
        } catch (e) {
            console.error('[Hybrid] Save error:', e);
        }
    }

    loadHighlights() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return;

            const data = JSON.parse(saved);

            if (data.version === this.VERSION) {
                this.highlights = data.highlights || [];
                this.fallbacks = data.fallbacks || {};
                console.log('[Hybrid] Loaded', this.highlights.length, 'highlights');
            } else {
                console.log('[Hybrid] Old format detected, clearing');
                localStorage.removeItem(this.storageKey);
                return;
            }

            setTimeout(() => this.renderHighlights(), 100);
        } catch (e) {
            console.error('[Hybrid] Load error:', e);
        }
    }

    clearAll() {
        this.highlights = [];
        this.fallbacks = {};
        localStorage.removeItem(this.storageKey);
        this.clearAllHighlightSpans();
    }

    hasHighlights() {
        return this.highlights.length > 0;
    }
}

// ==================== PETNOTE MANAGER ====================
class PETNoteManager {
    constructor(core) {
        this.core = core;
        this.panel = null;
        this.textarea = null;
        this.isMinimized = false;
        this.dragData = { isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 };
        this.resizeData = { isResizing: false, startWidth: 0, startHeight: 0, startX: 0, startY: 0 };
    }

    getNoteKey() {
        return this.core.getStorageKey() + '_note';
    }

    init() {
        if (document.querySelector('.pet-note-panel')) return;
        this.createPanel();
        this.loadNote();
        this.setupEvents();
        console.log('[Note] Initialized');
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.className = 'pet-note-panel';
        panel.innerHTML = `
            <div class="pet-note-header">
                <div class="pet-note-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M15 3v6h6"/><path d="M9 13h6"/><path d="M9 17h3"/></svg>
                    Quick Note
                </div>
                <div class="pet-note-controls">
                    <button class="pet-note-btn clear-btn" title="Xóa toàn bộ">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                    <button class="pet-note-btn minimize-btn" title="Thu nhỏ/Mở rộng">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                    </button>
                    <button class="pet-note-btn close-btn" title="Đóng">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>
            <div class="pet-note-content">
                <textarea class="pet-note-textarea" placeholder="Ghi chú tại đây..."></textarea>
            </div>
            <div class="pet-note-resize-handle"></div>
        `;
        document.body.appendChild(panel);
        this.panel = panel;
        this.textarea = panel.querySelector('.pet-note-textarea');

        const posStr = localStorage.getItem(this.getNoteKey() + '_pos');
        if (posStr) {
            try {
                const pos = JSON.parse(posStr);
                Object.assign(this.panel.style, pos);
            } catch(e) {}
        }
    }

    setupEvents() {
        const header = this.panel.querySelector('.pet-note-header');
        const minBtn = this.panel.querySelector('.minimize-btn');
        const closeBtn = this.panel.querySelector('.close-btn');
        const handle = this.panel.querySelector('.pet-note-resize-handle');

        const onDrag = (e) => {
            if (!this.dragData.isDragging) return;
            const dx = e.clientX - this.dragData.startX;
            const dy = e.clientY - this.dragData.startY;
            this.panel.style.left = `${this.dragData.initialX + dx}px`;
            this.panel.style.top = `${this.dragData.initialY + dy}px`;
            this.panel.style.right = 'auto';
        };

        const onResize = (e) => {
            if (!this.resizeData.isResizing) return;
            const dw = e.clientX - this.resizeData.startX;
            const dh = e.clientY - this.resizeData.startY;
            const newW = Math.max(200, this.resizeData.startWidth + dw);
            const newH = Math.max(100, this.resizeData.startHeight + dh);
            this.panel.style.width = `${newW}px`;
            this.panel.style.height = `${newH}px`;
        };

        const stopActions = () => {
            if (this.dragData.isDragging || this.resizeData.isResizing) {
                this.dragData.isDragging = false;
                this.resizeData.isResizing = false;
                this.panel.style.transition = '';
                document.removeEventListener('mousemove', onDrag);
                document.removeEventListener('mousemove', onResize);
                document.removeEventListener('mouseup', stopActions);

                const rect = this.panel.getBoundingClientRect();
                localStorage.setItem(this.getNoteKey() + '_pos', JSON.stringify({
                    left: `${rect.left}px`,
                    top: `${rect.top}px`,
                    width: `${this.panel.style.width}`,
                    height: `${this.panel.style.height}`
                }));
            }
        };

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.pet-note-btn')) return;
            this.dragData.isDragging = true;
            this.dragData.startX = e.clientX;
            this.dragData.startY = e.clientY;
            const rect = this.panel.getBoundingClientRect();
            this.dragData.initialX = rect.left;
            this.dragData.initialY = rect.top;
            this.panel.style.transition = 'none';
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopActions);
        });

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.resizeData.isResizing = true;
            this.resizeData.startX = e.clientX;
            this.resizeData.startY = e.clientY;
            this.resizeData.startWidth = this.panel.offsetWidth;
            this.resizeData.startHeight = this.panel.offsetHeight;
            document.addEventListener('mousemove', onResize);
            document.addEventListener('mouseup', stopActions);
        });

        minBtn.addEventListener('click', () => {
            this.isMinimized = !this.isMinimized;
            this.panel.classList.toggle('minimized', this.isMinimized);
        });

        closeBtn.addEventListener('click', () => {
            this.panel.style.display = 'none';
        });

        this.textarea.addEventListener('input', () => {
            this.saveNote();
            this.autoExpand();
            this.updateBadge();
        });

        const clearBtn = this.panel.querySelector('.clear-btn');
        clearBtn.addEventListener('click', () => {
            if (this.textarea.value && confirm('Xóa toàn bộ nội dung ghi chú?')) {
                this.textarea.value = '';
                this.saveNote();
                this.autoExpand();
                this.updateBadge();
                console.log('[Note] Content cleared');
            }
        });
    }

    autoExpand() {
        if (this.isMinimized) return;
        this.textarea.style.height = 'auto';
        this.textarea.style.height = (this.textarea.scrollHeight) + 'px';
        if (this.panel.offsetHeight < this.textarea.scrollHeight + 50) {
            this.panel.style.height = (this.textarea.scrollHeight + 100) + 'px';
        }
    }

    saveNote() {
        localStorage.setItem(this.getNoteKey(), this.textarea.value);
    }

    loadNote() {
        const saved = localStorage.getItem(this.getNoteKey());
        if (saved) {
            this.textarea.value = saved;
            this.autoExpand();
        }
        this.updateBadge();
    }

    updateBadge() {
        const toggleBtn = document.querySelector('.note-toggle-btn');
        if (!toggleBtn) return;
        const hasContent = this.textarea.value.trim().length > 0;
        toggleBtn.classList.toggle('has-content', hasContent);
    }

    toggle() {
        if (this.panel.style.display === 'flex') {
            this.panel.style.display = 'none';
        } else {
            this.panel.style.display = 'flex';
            this.autoExpand();
        }
    }
}

// ==================== MINI DASHBOARD MANAGER ====================
class MiniDashboardManager {
    constructor(core, skillType) {
        this.core = core;
        this.skillType = skillType;
        this.panel = null;
        this.isVisible = false;
        this.dragData = { isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 };
    }

    init() {
        this.createPanel();
        this.injectToggleButton();
        this.setupEvents();
        console.log('[MiniDashboard] Initialized for', this.skillType);
    }

    createPanel() {
        if (document.getElementById('mini-dashboard-panel')) return;

        this.panel = document.createElement('div');
        this.panel.id = 'mini-dashboard-panel';

        this.panel.innerHTML = `
            <div class="mini-dashboard-header" id="mini-dashboard-header" style="cursor: move; user-select: none;">
                <h3><span id="mini-dashboard-title">Dashboard</span></h3>
                <button class="mini-dashboard-close" onclick="window.miniDashboard.hide()">✕</button>
            </div>
            <div class="mini-dashboard-content" id="mini-dashboard-content"></div>
            <div class="mini-dashboard-footer">
                <a href="dashboard.html" class="dashboard-link" target="_blank" onclick="return confirm('Mở trang Dashboard tổng trong tab mới?')">Đến Dashboard ➝</a>
            </div>
        `;

        document.body.appendChild(this.panel);
        window.miniDashboard = this;
        this.contentArea = document.getElementById('mini-dashboard-content');

        const posStr = localStorage.getItem('mini-dashboard-pos');
        if (posStr) {
            try {
                const pos = JSON.parse(posStr);
                Object.assign(this.panel.style, pos);
            } catch(e) {}
        }
    }

    injectToggleButton() {
        const bottomBar = document.querySelector('.bottom-bar') || document.querySelector('.ielts-header');
        if (!bottomBar || document.getElementById('mini-dashboard-toggle')) return;

        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'mini-dashboard-toggle';
        toggleBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            Tiến độ
        `;
        toggleBtn.onclick = () => this.toggle();

        const noteBtn = document.querySelector('.note-toggle-btn');
        const submitBtn = document.getElementById('submitBtn');

        if (noteBtn) {
            noteBtn.parentNode.insertBefore(toggleBtn, noteBtn);
        } else if (submitBtn) {
            submitBtn.parentNode.insertBefore(toggleBtn, submitBtn);
        } else {
            bottomBar.appendChild(toggleBtn);
        }
    }

    ketReadingScoreMap() {
        return {
            30: 150, 29: 145, 28: 140, 27: 138, 26: 135, 25: 133, 24: 130, 23: 128,
            22: 125, 21: 123, 20: 120, 19: 117, 18: 114, 17: 111, 16: 109, 15: 106,
            14: 103, 13: 100, 12: 97, 11: 94, 10: 91, 9: 88, 8: 85, 7: 82,
            6: 70, 5: 59, 4: 47, 3: 35, 2: 23, 1: 12, 0: 0
        };
    }

    ketListeningScoreMap() {
        return {
            25: { cambridge: 150, cefr: 'B1' },
            24: { cambridge: 145, cefr: 'B1' },
            23: { cambridge: 140, cefr: 'B1' },
            22: { cambridge: 137, cefr: 'A2' },
            21: { cambridge: 133, cefr: 'A2' },
            20: { cambridge: 130, cefr: 'A2' },
            19: { cambridge: 127, cefr: 'A2' },
            18: { cambridge: 123, cefr: 'A2' },
            17: { cambridge: 120, cefr: 'A2' },
            16: { cambridge: 117, cefr: 'A1' },
            15: { cambridge: 113, cefr: 'A1' },
            14: { cambridge: 110, cefr: 'A1' },
            13: { cambridge: 107, cefr: 'A1' },
            12: { cambridge: 103, cefr: 'A1' },
            11: { cambridge: 100, cefr: 'A1' },
            10: { cambridge: 96, cefr: '-' },
            9: { cambridge: 93, cefr: '-' },
            8: { cambridge: 89, cefr: '-' },
            7: { cambridge: 86, cefr: '-' },
            6: { cambridge: 82, cefr: '-' },
            5: { cambridge: 68, cefr: '-' },
            4: { cambridge: 55, cefr: '-' },
            3: { cambridge: 41, cefr: '-' },
            2: { cambridge: 27, cefr: '-' },
            1: { cambridge: 14, cefr: '-' },
            0: { cambridge: 0, cefr: '-' }
        };
    }

    calculateKETScore(correct, isReading) {
        if (correct < 0) correct = 0;
        const max = isReading ? 30 : 25;
        if (correct > max) correct = max;
        const map = isReading ? this.ketReadingScoreMap() : this.ketListeningScoreMap();
        return map[correct] || { cambridge: 0, cefr: '-' };
    }

    refreshData() {
        const meta = this.core.getTestMeta();
        const book = meta.book;
        const test = meta.test;

        const titleEl = document.getElementById('mini-dashboard-title');
        if (titleEl) titleEl.textContent = `KET ${book} - Test ${test}`;

        const readingData = this.fetchSkillData('reading', book, test);
        const listeningData = this.fetchSkillData('listening', book, test);

        this.renderContent(readingData, listeningData);
    }

    fetchSkillData(skill, book, test) {
        const parts = skill === 'reading' ? [1,2,3,4,5] : [1,2,3,4,5];

        return parts.map(part => {
            let keyCompleted = `ket_${skill}_book${book}_test${test}_part${part}`;
            let keyDraft = keyCompleted + '_draft';

            let dataCompleted = localStorage.getItem(keyCompleted);
            let dataDraft = localStorage.getItem(keyDraft);

            if (dataCompleted) {
                try {
                    const parsed = JSON.parse(dataCompleted);
                    return { part, type: 'completed', value: parsed.correctCount || 0, total: parsed.totalQuestions || 0 };
                } catch(e) {}
            }

            if (dataDraft) {
                try {
                    const parsed = JSON.parse(dataDraft);
                    const answered = Object.values(parsed).filter(v => v !== null && v !== undefined && String(v).trim() !== '' && typeof v !== 'object').length;
                    return { part, type: 'draft', value: answered, total: 0 };
                } catch(e) {}
            }
            return { part, type: 'empty', value: 0, total: 0 };
        });
    }

    calculateSkillStats(data, maxQuestions) {
        const completedParts = data.filter(d => d.type === 'completed');
        const totalCorrect = completedParts.reduce((sum, d) => sum + d.value, 0);
        const hasAnyData = data.some(d => d.type !== 'empty');
        const scoreData = this.calculateKETScore(totalCorrect, maxQuestions === 30);

        return {
            correct: totalCorrect,
            total: maxQuestions,
            hasData: hasAnyData,
            ketScore: scoreData.cambridge,
            cefr: scoreData.cefr
        };
    }

    renderContent(readingData, listeningData) {
        if (!this.contentArea) return;

        const meta = this.core.getTestMeta();

        const readingStats = this.calculateSkillStats(readingData, 30);
        const listeningStats = this.calculateSkillStats(listeningData, 25);

        const renderSection = (title, data, stats, isReading) => {
            let scoreHtml;
            if (!stats.hasData) {
                scoreHtml = '<span class="not-done">Chưa làm</span>';
            } else if (stats.ketScore) {
                const cefrBadge = stats.cefr && stats.cefr !== '-' ? ` <span class="cefr-badge">${stats.cefr}</span>` : '';
                scoreHtml = `${stats.correct}/${stats.total} đúng → <strong>${stats.ketScore}</strong> điểm${cefrBadge}`;
            } else {
                scoreHtml = '<span class="not-done">Chưa hoàn thành</span>';
            }

            let sectionHtml = `
                <div class="skill-section">
                    <div class="skill-header">
                        <span class="skill-title">${title}</span>
                        <span class="skill-score">${scoreHtml}</span>
                    </div>
                    <div class="part-list">
            `;

            data.forEach(d => {
                let statusClass = d.type === 'completed' ? 'status-completed' : d.type === 'draft' && d.value > 0 ? 'status-draft' : 'status-empty';
                let statusIcon = d.type === 'completed' ? '✓' : d.type === 'draft' && d.value > 0 ? '⏳' : '○';
                let displayVal = d.type === 'completed' ? `${d.value}/${d.total}` : (d.type === 'draft' ? `${d.value} câu` : `--`);
                let url = isReading ? `read-ket${meta.book}-test${meta.test}-part${d.part}.html` : `lis-ket${meta.book}-test${meta.test}-part${d.part}.html`;

                const isCurrent = meta.part === d.part && this.skillType === (isReading ? 'reading' : 'listening');
                const currentClass = isCurrent ? 'current' : '';

                sectionHtml += `
                    <a href="${url}" class="part-item ${currentClass}" target="_blank" onclick="return confirm('Mở Part ${d.part} trong tab mới?')">
                        <span>Part ${d.part}</span>
                        <span class="part-status ${statusClass}">${displayVal} ${statusIcon}</span>
                    </a>
                `;
            });
            sectionHtml += '</div></div>';
            return sectionHtml;
        }

        let html = renderSection('Reading', readingData, readingStats, true);
        html += `<div style="height: 1px; background: var(--border, #e2e8f0); margin: 4px 0;"></div>`;
        html += renderSection('Listening', listeningData, listeningStats, false);

        this.contentArea.innerHTML = html;
    }

    toggle() {
        if (this.isVisible) this.hide();
        else this.show();
    }

    show() {
        if (!this.panel) this.createPanel();
        this.refreshData();
        this.panel.style.display = 'flex';
        this.isVisible = true;
    }

    hide() {
        if (this.panel) this.panel.style.display = 'none';
        this.isVisible = false;
    }

    setupEvents() {
        const header = document.getElementById('mini-dashboard-header');

        const onDrag = (e) => {
            if (!this.dragData.isDragging) return;
            const dx = e.clientX - this.dragData.startX;
            const dy = e.clientY - this.dragData.startY;
            this.panel.style.left = `${this.dragData.initialX + dx}px`;
            this.panel.style.top = `${this.dragData.initialY + dy}px`;
            this.panel.style.right = 'auto';
            this.panel.style.bottom = 'auto';
        };

        const stopDrag = () => {
            if (this.dragData.isDragging) {
                this.dragData.isDragging = false;
                document.removeEventListener('mousemove', onDrag);
                document.removeEventListener('mouseup', stopDrag);

                const rect = this.panel.getBoundingClientRect();
                localStorage.setItem('mini-dashboard-pos', JSON.stringify({
                    left: `${rect.left}px`,
                    top: `${rect.top}px`
                }));
            }
        };

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            this.dragData.isDragging = true;
            this.dragData.startX = e.clientX;
            this.dragData.startY = e.clientY;
            const rect = this.panel.getBoundingClientRect();
            this.dragData.initialX = rect.left;
            this.dragData.initialY = rect.top;
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
        });

        try {
            this.channel = new BroadcastChannel('ket_update_channel');
            this.channel.addEventListener('message', () => {
                if (this.isVisible) this.refreshData();
            });
        } catch (e) {
            console.warn('BroadcastChannel not supported', e);
        }

        window.addEventListener('storage', (e) => {
            if (e.key && (e.key.startsWith('ket_') || e.key.startsWith('pet_') || e.key === 'mini-dashboard-pos') && this.isVisible) {
                if (e.key === 'mini-dashboard-pos') {
                    try {
                        const pos = JSON.parse(e.newValue);
                        Object.assign(this.panel.style, pos);
                    } catch(err) {}
                } else {
                    this.refreshData();
                }
            }
        });
    }
}

// ==================== STORAGE MANAGER ====================
class StorageManager {
    saveResults(testData, userAnswers) {
        const details = [];
        let correctCount = 0;
        const questionRange = this.getQuestionRange(testData);

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const userAnswer = userAnswers[i];
            const correctAnswer = testData.answerKey[`q${i}`];
            const isCorrect = this.checkAnswer(userAnswer, correctAnswer);
            if (isCorrect) correctCount++;
            details.push({
                question: i,
                user: userAnswer || '(empty)',
                correct: testData.displayAnswers[`q${i}`] || correctAnswer,
                isCorrect
            });
        }

        const partData = {
            partId: testData.part,
            name: `Part ${testData.part}`,
            totalQuestions: details.length,
            correctCount,
            details
        };

        const { book, test, part } = this.parseTestInfo(testData.title);
        const key = `ket_listening_book${book}_test${test}_part${part}`;
        localStorage.setItem(key, JSON.stringify(partData));
    }

    getQuestionRange(testData) {
        const questions = testData.questions;
        const numbers = questions.map(q => q.num).sort((a, b) => a - b);
        return { start: numbers[0] || 1, end: numbers[numbers.length - 1] || 7 };
    }

    checkAnswer(userAnswer, correctAnswer) {
        if (!userAnswer) return false;
        if (Array.isArray(correctAnswer)) return correctAnswer.includes(userAnswer.toLowerCase());
        else return userAnswer.toLowerCase() === correctAnswer.toLowerCase();
    }

    parseTestInfo(title) {
        let book = 1, test = 1, part = 1;
        const ketBookMatch = title.match(/KET\s+(\d+)/i);
        if (ketBookMatch) book = parseInt(ketBookMatch[1]);
        const testMatch = title.match(/Test\s+(\d+)/i);
        if (testMatch) test = parseInt(testMatch[1]);
        const partMatch = title.match(/Part\s+(\d+)/i);
        if (partMatch) part = parseInt(partMatch[1]);
        return { book, test, part };
    }
}

// ==================== UI MANAGER ====================
class UIManager {
    setupFontControls() {
        const fontButtons = { fontSmall: 'small', fontMedium: 'medium', fontLarge: 'large' };
        Object.entries(fontButtons).forEach(([id, size]) => {
            const button = document.getElementById(id);
            if (button) button.addEventListener('click', () => this.setFontSize(size));
        });
        this.setFontSize('large');
    }

    setFontSize(size) {
        document.querySelectorAll('.font-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`font${size.charAt(0).toUpperCase() + size.slice(1)}`);
        if (activeBtn) activeBtn.classList.add('active');
        document.querySelectorAll('.transcript-content, .questions-list').forEach(el => {
            el.className = `transcript-content font-${size}`;
            if (el.classList.contains('questions-list')) el.classList.add('centered');
        });
    }

    injectHeaderControls(coreInstance) {
        const header = document.querySelector('.ielts-header');
        if (!header) return;

        const candidateEl = header.querySelector('.candidate');
        if (candidateEl && coreInstance.currentTestData && coreInstance.currentTestData.title) {
            candidateEl.textContent = coreInstance.currentTestData.title;
        }

        if (!header.querySelector('.font-controls')) {
            const fontControls = document.createElement('div');
            fontControls.className = 'font-controls';
            fontControls.innerHTML = `
                <button class="font-btn" id="fontSmall">A-</button>
                <button class="font-btn" id="fontMedium">A</button>
                <button class="font-btn active" id="fontLarge">A+</button>
            `;
            header.appendChild(fontControls);
        }

        if (!document.getElementById('themeToggle')) {
            const themeBtn = document.createElement('button');
            themeBtn.className = 'theme-toggle-btn';
            themeBtn.id = 'themeToggle';
            themeBtn.title = 'Chuyển đổi Dark/Light mode';
            themeBtn.innerHTML = `<span class="icon-moon">🌙</span><span class="icon-sun">☀️</span>`;
            header.appendChild(themeBtn);
        }

        const savedTheme = localStorage.getItem('pet-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;
        const html = document.documentElement;
        const testWrapper = document.getElementById('testWrapper');

        themeToggle.addEventListener('click', () => {
            if (testWrapper && testWrapper.classList.contains('classic-mode')) return;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('pet-theme', newTheme);
        });

        const savedTheme = localStorage.getItem('pet-theme') || 'light';
        if (savedTheme === 'dark' && testWrapper && !testWrapper.classList.contains('classic-mode')) {
            html.setAttribute('data-theme', 'dark');
        } else if (savedTheme === 'dark' && !testWrapper) {
            html.setAttribute('data-theme', 'dark');
        } else {
            html.setAttribute('data-theme', 'light');
        }
    }

    injectModeToggle() {
        const header = document.querySelector('.ielts-header .brand') || document.querySelector('.ielts-header');
        if (!header) return;
        if (document.getElementById('modeToggleContainer')) return;

        const container = document.createElement('div');
        container.className = 'mode-toggle';
        container.id = 'modeToggleContainer';
        container.innerHTML = `
            <span class="mode-label">Hiện đại</span>
            <label class="mode-switch" title="Chuyển đổi giao diện Cổ điển/Hiện đại">
                <input type="checkbox" id="modeToggle">
                <span class="mode-slider"></span>
            </label>
            <span class="mode-label">Cổ điển</span>
        `;
        const fontControls = header.querySelector('.font-controls');
        if (fontControls) fontControls.insertAdjacentElement('afterend', container);
        else header.appendChild(container);
    }

    setupModeToggle() {
        const modeToggle = document.getElementById('modeToggle');
        const styleLink = document.getElementById('styleLink');
        const themeToggle = document.getElementById('themeToggle');
        const html = document.documentElement;
        const storageKey = 'pet-mode';

        if (!modeToggle || !styleLink) return;

        const setMode = (isClassic) => {
            if (isClassic) {
                styleLink.href = styleLink.href.replace('listening-pet-common.css', 'listening-pet-common1.css');
                if (themeToggle) themeToggle.style.display = 'none';
                html.removeAttribute('data-theme');
            } else {
                styleLink.href = styleLink.href.replace('listening-pet-common1.css', 'listening-pet-common.css');
                if (themeToggle) themeToggle.style.display = 'flex';
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme === 'dark') html.setAttribute('data-theme', 'dark');
            }
            localStorage.setItem(storageKey, isClassic ? 'classic' : 'modern');
        };

        const savedMode = localStorage.getItem(storageKey);
        if (savedMode === 'classic') { modeToggle.checked = true; setMode(true); }
        else { modeToggle.checked = false; setMode(false); }

        modeToggle.addEventListener('change', () => setMode(modeToggle.checked));
    }

    setupResizer() {
        const transcriptPanel = document.getElementById('transcriptPanel');
        const questionsPanel = document.getElementById('questionsPanel');
        const resizer = document.getElementById('resizer');
        if (!transcriptPanel || !questionsPanel || !resizer) return;

        let isResizing = false;
        resizer.addEventListener('mousedown', () => { isResizing = true; document.body.style.cursor = 'col-resize'; });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const mainArea = document.getElementById('mainArea');
            if (!mainArea) return;
            const rect = mainArea.getBoundingClientRect();
            let leftWidth = e.clientX - rect.left - 4;
            if (leftWidth < 250) leftWidth = 250;
            if (leftWidth > rect.width - 250) leftWidth = rect.width - 250;
            transcriptPanel.style.width = leftWidth + 'px';
            questionsPanel.style.width = (rect.width - leftWidth - 8) + 'px';
        });
        document.addEventListener('mouseup', () => { isResizing = false; document.body.style.cursor = 'default'; });
    }

    setupExplanationPanel() {
        const explanationPanel = document.getElementById('explanationPanel');
        const explanationResizer = document.getElementById('explanationResizer');
        if (!explanationPanel || !explanationResizer) return;

        let isResizing = false;
        explanationResizer.addEventListener('mousedown', () => { isResizing = true; document.body.style.cursor = 'ns-resize'; });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const rect = explanationPanel.getBoundingClientRect();
            let newHeight = e.clientY - rect.top;
            if (newHeight < 150) newHeight = 150;
            if (newHeight > 500) newHeight = 500;
            explanationPanel.style.height = newHeight + 'px';
        });
        document.addEventListener('mouseup', () => { isResizing = false; document.body.style.cursor = 'default'; });
    }

    setupAutoCollapse(coreInstance) {
        const header = document.querySelector('.ielts-header');
        const footer = document.querySelector('.bottom-bar');
        const questionNav = document.querySelector('.question-nav');
        if (!header && !footer) return;
        this.addAutoCollapseToggle(header, coreInstance);

        let headerTimer = null, footerTimer = null;
        const COLLAPSE_DELAY = 5000;
        const isAutoCollapseEnabled = () => localStorage.getItem('pet-autocollapse-enabled') !== 'false';

        const collapseHeader = () => { if (!coreInstance.examSubmitted && isAutoCollapseEnabled()) header?.classList.add('collapsed'); };
        const expandHeader = () => header?.classList.remove('collapsed');
        const collapseFooter = () => { if (!coreInstance.examSubmitted && isAutoCollapseEnabled()) footer?.classList.add('collapsed'); };
        const expandFooter = () => footer?.classList.remove('collapsed');

        if (header) {
            header.addEventListener('mouseenter', () => { clearTimeout(headerTimer); expandHeader(); });
            header.addEventListener('mouseleave', () => { if (isAutoCollapseEnabled()) headerTimer = setTimeout(collapseHeader, COLLAPSE_DELAY); });
        }
        if (questionNav) {
            questionNav.addEventListener('mouseenter', () => { clearTimeout(headerTimer); expandHeader(); });
            questionNav.addEventListener('mouseleave', () => { if (!header?.matches(':hover') && isAutoCollapseEnabled()) headerTimer = setTimeout(collapseHeader, COLLAPSE_DELAY); });
        }
        if (footer) {
            footer.addEventListener('mouseenter', () => { clearTimeout(footerTimer); expandFooter(); });
            footer.addEventListener('mouseleave', () => { if (isAutoCollapseEnabled()) footerTimer = setTimeout(collapseFooter, COLLAPSE_DELAY); });
        }
        setTimeout(() => { if (!coreInstance.examSubmitted && isAutoCollapseEnabled()) { collapseHeader(); collapseFooter(); } }, COLLAPSE_DELAY);
    }

    addAutoCollapseToggle(header, coreInstance) {
        if (!header) return;
        if (header.querySelector('.autocollapse-toggle')) return;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'autocollapse-toggle';
        toggleBtn.title = 'Bật/Tắt tự động thu gọn header/footer';
        const iconShrink = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M4 10h6V4M14 20v-6h6M14 4v6h6"/></svg>`;
        const iconExpand = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
        const isEnabled = localStorage.getItem('pet-autocollapse-enabled') !== 'false';
        toggleBtn.innerHTML = isEnabled ? iconShrink : iconExpand;
        toggleBtn.classList.toggle('active', isEnabled);
        toggleBtn.addEventListener('click', () => {
            const currentlyEnabled = localStorage.getItem('pet-autocollapse-enabled') !== 'false';
            const newEnabled = !currentlyEnabled;
            localStorage.setItem('pet-autocollapse-enabled', newEnabled.toString());
            toggleBtn.classList.toggle('active', newEnabled);
            toggleBtn.innerHTML = newEnabled ? iconShrink : iconExpand;
            if (!newEnabled) { header?.classList.remove('collapsed'); document.querySelector('.bottom-bar')?.classList.remove('collapsed'); }
        });

        const modeToggle = header.querySelector('#modeToggleContainer');
        const themeToggle = header.querySelector('.theme-toggle-btn');
        if (modeToggle) modeToggle.insertAdjacentElement('afterend', toggleBtn);
        else if (themeToggle) themeToggle.insertAdjacentElement('afterend', toggleBtn);
        else header.appendChild(toggleBtn);
    }
}

// ==================== LISTENING CORE ====================
class ListeningCore {
    constructor() {
        this.examSubmitted = false;
        this.explanationMode = false;
        this.currentTestData = null;
        this.audio = null;
        this.speedSelect = null;
        this.highlightManager = new HighlightManagerHybrid(this);
        this.storageManager = new StorageManager();
        this.uiManager = new UIManager();
        this.debounceTimer = null;
        this.DEBOUNCE_MS = 300;
        this._isResetting = false;
        this.personalHighlightsVisible = true;
    }

    initializeTest(testData) {
        this.currentTestData = testData;
        this.examSubmitted = false;
        this.explanationMode = false;

        this.setupAudioControls();
        this.setupUI();
        this.renderQuestions();

        this.highlightManager.init(this.getHighlightStorageKey());

        this.setupEventListeners();
        this.setupBeforeUnload();
        this.createNavigation();

        if (!this.isCompleted()) {
            this.loadDraft();
        }

        this.noteManager = new PETNoteManager(this);
        this.noteManager.init();

        this.miniDashboard = new MiniDashboardManager(this, 'listening');
        this.miniDashboard.init();

        this.createResetModal();

        this.updateAnswerCount();
        console.log('Listening test initialized:', testData.title);
    }

    isCompleted() {
        if (!this.currentTestData) return false;
        const key = this.getStorageKey(false);
        return localStorage.getItem(key) !== null;
    }

    getStorageKey(isDraft = false) {
        const { book, test, part } = this.getTestMeta();
        let key = `ket_listening_book${book}_test${test}_part${part}`;
        if (isDraft) key += '_draft';
        return key;
    }

    getHighlightStorageKey() {
        return this.getStorageKey(false) + '_highlights';
    }

    saveHighlightDraft() {
        this.highlightManager.saveHighlights();
    }

    loadHighlightDraft() {
        this.highlightManager.loadHighlights();
    }

    getTestMeta() {
        const d = this.currentTestData;
        if (!d) return { book: 1, test: 1, part: 1 };
        let book = d.book, test = d.test, part = d.part;
        if (!book || !test || !part) {
            const parsed = this.storageManager.parseTestInfo(d.title);
            book = book || parsed.book;
            test = test || parsed.test;
            part = part || parsed.part;
        }
        return { book, test, part };
    }

    cleanup() {
        if (this._boundChangeHandler) {
            document.removeEventListener('change', this._boundChangeHandler);
            this._boundChangeHandler = null;
        }
        if (this._boundInputHandler) {
            document.removeEventListener('input', this._boundInputHandler);
            this._boundInputHandler = null;
        }
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.saveHighlightDraft();
        this.saveDraftImmediate();
    }

    goToPart(direction) {
        const { book, test, part } = this.getTestMeta();
        const targetPart = part + direction;
        if (targetPart < 1 || targetPart > 5) return;
        this.cleanup();
        const targetUrl = `lis-ket${book}-test${test}-part${targetPart}.html`;
        window.location.href = targetUrl;
    }

    getDraftData() {
        const questionRange = this.getQuestionRange();
        const answers = {};
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            answers[`q${i}`] = this.getUserAnswer(i);
        }
        return answers;
    }

    _safeSetStorage(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.warn('[Storage] Quota exceeded, cleaning old drafts...');
                this._cleanOldDrafts();
                try { localStorage.setItem(key, value); } catch (e2) {}
            }
        }
    }

    _cleanOldDrafts() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ket_listening_book') && (key.endsWith('_draft') || key.endsWith('_highlights'))) {
                keys.push(key);
            }
        }
        if (keys.length > 20) {
            keys.sort();
            for (let i = 0; i < keys.length - 20; i++) localStorage.removeItem(keys[i]);
        }
    }

    saveDraft() {
        if (this.examSubmitted || this._isResetting) return;
        if (!this.currentTestData) return;
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            try {
                const draft = this.getDraftData();
                const key = this.getStorageKey(true);
                this._safeSetStorage(key, JSON.stringify(draft));
            } catch (e) {}
        }, this.DEBOUNCE_MS);
    }

    saveDraftImmediate() {
        if (this._isResetting) return;
        if (this.examSubmitted || !this.currentTestData) return;
        clearTimeout(this.debounceTimer);
        try {
            const draft = this.getDraftData();
            const hasAnswers = Object.values(draft).some(v => v !== null && v !== undefined && v !== '');
            if (!hasAnswers) return;
            const key = this.getStorageKey(true);
            this._safeSetStorage(key, JSON.stringify(draft));
            try {
                const channel = new BroadcastChannel('ket_update_channel');
                channel.postMessage({ action: 'status_updated', type: 'listening', book: this.currentTestData.book, test: this.currentTestData.test, part: this.currentTestData.part, status: 'in-progress' });
                channel.close();
            } catch (e) {}
        } catch (e) {}
    }

    loadDraft() {
        const key = this.getStorageKey(true);
        const draftJson = localStorage.getItem(key);
        if (!draftJson) return false;
        try {
            const draft = JSON.parse(draftJson);
            const questionRange = this.getQuestionRange();
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                const ans = draft[`q${i}`];
                if (ans === undefined || ans === null) continue;
                if (this.currentTestData.type === 'multiple-choice') {
                    const radio = document.querySelector(`input[name="q${i}"][value="${ans}"]`);
                    if (radio) radio.checked = true;
                } else {
                    const input = document.getElementById(`q${i}`);
                    if (input) input.value = ans;
                }
            }
            this.updateAnswerCount();
            return true;
        } catch (e) { return false; }
    }

    clearDraft() {
        localStorage.removeItem(this.getStorageKey(true));
    }

    setupAudioControls() {
        this.audio = document.getElementById('listeningAudio');
        this.speedSelect = document.getElementById('speedSelect');

        if (this.audio && this.speedSelect) {
            const controlsContainer = this.audio.parentElement;
            if (controlsContainer && !controlsContainer.querySelector('.skip-btn')) {
                const btnBack = document.createElement('button');
                btnBack.className = 'skip-btn skip-back';
                btnBack.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg><span>5s</span>`;
                btnBack.title = 'Lùi lại 5 giây';
                btnBack.onclick = (e) => { e.preventDefault(); this.skipAudio(-5); };

                const btnForward = document.createElement('button');
                btnForward.className = 'skip-btn skip-forward';
                btnForward.innerHTML = `<span>5s</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>`;
                btnForward.title = 'Tua nhanh 5 giây';
                btnForward.onclick = (e) => { e.preventDefault(); this.skipAudio(5); };

                controlsContainer.insertBefore(btnBack, this.audio);
                this.audio.after(btnForward);
            }

            this.speedSelect.addEventListener('change', () => {
                this.audio.playbackRate = parseFloat(this.speedSelect.value);
            });
        }
    }

    skipAudio(seconds) {
        if (!this.audio) return;
        let newTime = this.audio.currentTime + seconds;
        if (newTime < 0) newTime = 0;
        if (this.audio.duration && newTime > this.audio.duration) newTime = this.audio.duration;
        this.audio.currentTime = newTime;
    }

    setupUI() {
        this.uiManager.injectHeaderControls(this);
        this.uiManager.injectModeToggle();
        this.injectNoteButton();
        this.uiManager.setupFontControls();
        this.uiManager.setupThemeToggle();
        this.uiManager.setupModeToggle();
        this.uiManager.setupResizer();
        this.uiManager.setupExplanationPanel();
        this.uiManager.setupAutoCollapse(this);
    }

    injectNoteButton() {
        const bottomBar = document.querySelector('.bottom-bar');
        if (!bottomBar || bottomBar.querySelector('.note-toggle-btn')) return;

        const noteBtn = document.createElement('button');
        noteBtn.className = 'btn btn-primary note-toggle-btn';
        noteBtn.style.marginLeft = '8px';
        noteBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M15 3v6h6"/><path d="M9 13h6"/><path d="M9 17h3"/></svg>
            Note
        `;
        noteBtn.onclick = () => this.noteManager.toggle();

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.parentNode.insertBefore(noteBtn, submitBtn);
        } else {
            bottomBar.appendChild(noteBtn);
        }
    }

    renderQuestions() {
        const container = document.getElementById('questionsContainer');
        if (!container) return;

        container.innerHTML = '';

        if (this.currentTestData.type === 'multiple-choice') {
            this.renderMultipleChoiceQuestions(container);
        } else if (this.currentTestData.type === 'fill-blank') {
            this.renderFillBlankQuestions(container);
        } else if (this.currentTestData.type === 'match-pairs') {
            this.renderMatchPairsQuestions(container);
        }
    }

    renderMultipleChoiceQuestions(container) {
        this.currentTestData.questions.forEach(q => {
            const div = document.createElement('div');
            div.className = 'question-item';
            div.id = `question-${q.num}`;

            div.innerHTML = `
                <div class="question-text">${q.num}. ${q.text}</div>
                <div class="options">
                    ${q.options.map((opt, index) => `
                        <div class="option">
                            <input type="radio" name="q${q.num}" value="${String.fromCharCode(65 + index)}" id="q${q.num}${String.fromCharCode(65 + index)}">
                            <label for="q${q.num}${String.fromCharCode(65 + index)}"><strong>${String.fromCharCode(65 + index)}</strong>. ${opt}</label>
                        </div>
                    `).join('')}
                </div>
                <span class="eye-icon" data-question="${q.num}">👁️</span>
            `;

            container.appendChild(div);
        });
    }

    renderFillBlankQuestions(container) {
        const template = this.currentTestData.template;
        container.innerHTML = template;

        container.querySelectorAll('.fill-input').forEach(input => {
            const questionNum = input.id.replace('q', '');
            const parent = input.parentNode;

            if (!parent.querySelector('.eye-icon')) {
                const eyeIcon = document.createElement('span');
                eyeIcon.className = 'eye-icon';
                eyeIcon.setAttribute('data-question', questionNum);
                eyeIcon.textContent = '👁️';
                parent.appendChild(eyeIcon);
            }
        });
    }

    renderMatchPairsQuestions(container) {
        const data = this.currentTestData;
        const places = data.places || [];
        const things = data.things || [];
        const example = data.example || null;

        let html = `<div class="ket-match-layout">`;

        html += `<div class="ket-match-left">`;
        html += `<div class="ket-match-col-header">Places</div>`;

        if (example) {
            html += `<div class="ket-match-row ket-match-example">
                <span class="ket-match-num ket-example-num">0</span>
                <span class="ket-match-place">${example.place}</span>
                <span class="ket-match-box ket-example-box">${example.letter}</span>
            </div>`;
        }

        places.forEach(p => {
            html += `
            <div class="ket-match-row" id="question-${p.num}">
                <span class="ket-match-num">${p.num}</span>
                <span class="ket-match-place">${p.label}</span>
                <span class="ket-match-input-wrap">
                    <input type="text" id="q${p.num}" class="fill-input ket-match-input" maxlength="1" autocomplete="off" title="Nhập một chữ cái (A–H)">
                </span>
                <span class="eye-icon" data-question="${p.num}">👁️</span>
            </div>`;
        });

        html += `</div>`;
        html += `<div class="ket-match-divider"></div>`;
        html += `<div class="ket-match-right">`;
        html += `<div class="ket-match-col-header">Things</div>`;

        things.forEach(t => {
            html += `<div class="ket-match-thing">
                <span class="ket-match-letter">${t.letter}</span>
                <span class="ket-match-thing-label">${t.label}</span>
            </div>`;
        });

        html += `</div></div>`;

        container.innerHTML = html;

        container.querySelectorAll('.ket-match-input').forEach(input => {
            input.addEventListener('input', () => {
                input.value = input.value.toUpperCase().replace(/[^A-H]/g, '');
            });
        });
    }

    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => { if (!this._isResetting) this.saveDraftImmediate(); });
        window.addEventListener('pagehide', () => { if (!this._isResetting) this.saveDraftImmediate(); });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && !this._isResetting) this.saveDraftImmediate();
        });
    }

    setupEventListeners() {
        this._boundChangeHandler = (e) => {
            if (this._isResetting) return;
            if (e.target && e.target.matches('input[type="radio"]')) {
                this.updateAnswerCount();
                this.saveDraftImmediate();
            }
        };
        document.addEventListener('change', this._boundChangeHandler);

        this._boundInputHandler = (e) => {
            if (this._isResetting) return;
            if (e.target && e.target.matches('.fill-input')) {
                this.updateAnswerCount();
                this.saveDraft();
            }
        };
        document.addEventListener('input', this._boundInputHandler);

        document.getElementById('submitBtn')?.addEventListener('click', () => this.handleSubmit());
        document.getElementById('explainBtn')?.addEventListener('click', () => this.handleExplain());
        document.getElementById('resetBtn')?.addEventListener('click', () => this.handleReset());

        const logoEl = document.querySelector('.ielts-logo');
        if (logoEl) {
            logoEl.innerHTML = `
                <span class="logo-text">KET</span>
                <span class="logo-home" style="display: none;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                </span>
            `;

            logoEl.addEventListener('mouseenter', () => {
                logoEl.querySelector('.logo-text')?.style.setProperty('display', 'none');
                logoEl.querySelector('.logo-home')?.style.setProperty('display', 'inline-flex');
            });
            logoEl.addEventListener('mouseleave', () => {
                logoEl.querySelector('.logo-text')?.style.setProperty('display', 'inline');
                logoEl.querySelector('.logo-home')?.style.setProperty('display', 'none');
            });

            logoEl.addEventListener('click', () => {
                if (confirm('Quay lại trang chủ? Tiến độ của bạn sẽ được lưu.')) {
                    window.location.href = 'index.html';
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('eye-icon')) {
                const questionNum = e.target.dataset.question;
                this.showExplanation(questionNum);
            }
        });

        document.getElementById('closeExplanation')?.addEventListener('click', () => this.closeExplanation());
    }

    createNavigation() {
        const nav = document.getElementById('navButtons');
        if (!nav || !this.currentTestData) return;

        const parent = nav.parentElement;
        if (parent && parent.classList.contains('question-nav')) {
            parent.querySelectorAll('span').forEach(s => {
                if (!s.classList.contains('answer-badge') && !s.classList.contains('toggle-label')) s.remove();
            });
        }

        nav.innerHTML = '';

        const { part } = this.getTestMeta();

        const prevPartBtn = document.createElement('button');
        prevPartBtn.className = 'nav-arrow-btn nav-prev-part';
        prevPartBtn.title = 'Part trước';
        prevPartBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Previous Part</span>
        `;
        if (part <= 1) prevPartBtn.disabled = true;
        else prevPartBtn.addEventListener('click', () => { if (confirm('Chuyển sang Part trước?')) this.goToPart(-1); });
        nav.appendChild(prevPartBtn);

        const questionRange = this.getQuestionRange();
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const btn = document.createElement('button');
            btn.className = 'nav-btn unanswered';
            btn.textContent = i;
            btn.dataset.question = i;
            btn.addEventListener('click', () => {
                this.scrollToQuestion(i);
                this.setActiveNavButton(i);
            });
            nav.appendChild(btn);
        }

        const nextPartBtn = document.createElement('button');
        nextPartBtn.className = 'nav-arrow-btn nav-next-part';
        nextPartBtn.title = 'Part tiếp theo';
        nextPartBtn.innerHTML = `
            <span>Next Part</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        `;
        if (part >= 5) nextPartBtn.disabled = true;
        else nextPartBtn.addEventListener('click', () => { if (confirm('Chuyển sang Part tiếp theo?')) this.goToPart(1); });
        nav.appendChild(nextPartBtn);

        this.injectHighlightToggle();
    }

    injectHighlightToggle() {
        const questionNav = document.querySelector('.question-nav');
        if (!questionNav) return;
        if (questionNav.querySelector('#highlightToggle')) return;

        const toggleWrapper = document.createElement('div');
        toggleWrapper.className = 'highlight-toggle-wrapper';
        toggleWrapper.title = 'Ẩn/hiện highlight cá nhân (không ảnh hưởng highlight đáp án)';
        toggleWrapper.innerHTML = `
            <label class="toggle-switch">
                <input type="checkbox" id="highlightToggle" checked>
                <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">Highlight</span>
        `;
        questionNav.appendChild(toggleWrapper);
        this.initHighlightToggle();
    }

    initHighlightToggle() {
        const toggleCheckbox = document.getElementById('highlightToggle');
        if (!toggleCheckbox) return;
        this.personalHighlightsVisible = toggleCheckbox.checked;
        this.togglePersonalHighlights(this.personalHighlightsVisible);
        toggleCheckbox.addEventListener('change', (e) => {
            this.personalHighlightsVisible = e.target.checked;
            this.togglePersonalHighlights(this.personalHighlightsVisible);
        });
    }

    togglePersonalHighlights(visible) {
        const containers = [
            document.getElementById('transcriptContent'),
            document.getElementById('questionsContainer'),
            document.querySelector('.questions-panel'),
            document.querySelector('.reading-content')
        ].filter(Boolean);

        const allHighlights = new Set();
        containers.forEach(container => {
            const highlights = container.querySelectorAll('.highlight-yellow, .highlight-green, .highlight-pink');
            highlights.forEach(h => allHighlights.add(h));
        });

        allHighlights.forEach(highlight => {
            if (visible) highlight.classList.remove('highlight-hidden');
            else highlight.classList.add('highlight-hidden');
        });
    }

    getQuestionRange() {
        if (!this.currentTestData) return { start: 1, end: 7 };
        const questions = this.currentTestData.questions;
        const numbers = questions.map(q => q.num).sort((a, b) => a - b);
        return { start: numbers[0] || 1, end: numbers[numbers.length - 1] || 7 };
    }

    scrollToQuestion(questionNum) {
        const questionElement = document.getElementById(`question-${questionNum}`);
        if (questionElement) questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setActiveNavButton(questionNum) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.nav-btn[data-question="${questionNum}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    getUserAnswer(questionNum) {
        if (this.currentTestData.type === 'multiple-choice') {
            const radios = document.getElementsByName(`q${questionNum}`);
            for (let radio of radios) if (radio.checked) return radio.value;
            return null;
        } else if (this.currentTestData.type === 'fill-blank') {
            const input = document.getElementById(`q${questionNum}`);
            return input ? input.value.trim().toLowerCase() : null;
        } else if (this.currentTestData.type === 'match-pairs') {
            const input = document.getElementById(`q${questionNum}`);
            return input ? input.value.trim().toUpperCase() : null;
        }
        return null;
    }

    isAnswerCorrect(questionNum, userAnswer) {
        const correctAnswer = this.currentTestData.answerKey[`q${questionNum}`];
        if (Array.isArray(correctAnswer)) return correctAnswer.includes(userAnswer);
        else return userAnswer === correctAnswer;
    }

    updateAnswerCount() {
        const questionRange = this.getQuestionRange();
        let answered = 0;
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            if (this.getUserAnswer(i)) answered++;
        }
        const total = questionRange.end - questionRange.start + 1;
        if (this._lastAnsweredCount === answered) return;
        this._lastAnsweredCount = answered;

        const answeredBadge = document.getElementById('answeredCount');
        if (answeredBadge) answeredBadge.textContent = `${answered}/${total} answered`;
        const progressDisplay = document.getElementById('progressDisplay');
        if (progressDisplay) progressDisplay.textContent = `Đã làm: ${answered}/${total}`;

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const btn = document.querySelector(`.nav-btn[data-question="${i}"]`);
            if (btn) {
                btn.classList.remove('answered', 'unanswered');
                btn.classList.add(this.getUserAnswer(i) ? 'answered' : 'unanswered');
            }
        }
    }

    handleSubmit() {
        if (this.examSubmitted) return;
        const questionRange = this.getQuestionRange();
        const unanswered = [];
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            if (!this.getUserAnswer(i)) unanswered.push(i);
        }
        if (unanswered.length > 0) {
            if (!confirm(`Bạn còn ${unanswered.length} câu chưa chọn. Nộp bài?`)) return;
        }
        this.submitExam();
    }

    submitExam() {
        this.examSubmitted = true;
        document.querySelector('.ielts-header')?.classList.remove('collapsed');
        document.querySelector('.question-nav')?.classList.remove('collapsed');
        document.querySelector('.bottom-bar')?.classList.remove('collapsed');

        this.showTranscript();
        this.highlightManager.renderHighlights();

        this.markAnswers();

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đã nộp'; }
        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) explainBtn.disabled = false;

        this.showResults();
        this.storageManager.saveResults(this.currentTestData, this.getUserAnswers());

        try {
            const channel = new BroadcastChannel('ket_update_channel');
            channel.postMessage({ action: 'status_updated', type: 'listening', book: this.currentTestData.book, test: this.currentTestData.test, part: this.currentTestData.part, status: 'completed' });
            channel.close();
        } catch (e) {}

        this.clearDraft();
        this.disableInputs();
    }

    showTranscript() {
        const mainArea = document.getElementById('mainArea');
        const transcriptContent = document.getElementById('transcriptContent');
        if (mainArea && transcriptContent && this.currentTestData.transcript) {
            mainArea.classList.add('show-transcript');
            transcriptContent.innerHTML = this.currentTestData.transcript;
        }
    }

    markAnswers() {
        const questionRange = this.getQuestionRange();
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const userAnswer = this.getUserAnswer(i);
            const isCorrect = this.isAnswerCorrect(i, userAnswer);

            const questionDiv = document.getElementById(`question-${i}`);
            if (questionDiv) {
                questionDiv.classList.remove('correct', 'incorrect');
                const oldBadge = questionDiv.querySelector('.correct-answer-badge');
                if (oldBadge) oldBadge.remove();

                if (isCorrect) questionDiv.classList.add('correct');
                else {
                    questionDiv.classList.add('incorrect');
                    const badge = document.createElement('span');
                    badge.className = 'correct-answer-badge';
                    badge.textContent = this.currentTestData.displayAnswers[`q${i}`];
                    questionDiv.appendChild(badge);
                }
            }

            const input = document.getElementById(`q${i}`);
            if (input) {
                input.classList.remove('correct', 'incorrect');
                const wrapper = input.closest('.blank-line') || input.closest('.ket-match-row');
                if (wrapper) {
                    const oldBadge = wrapper.querySelector('.correct-answer-badge');
                    if (oldBadge) oldBadge.remove();
                }

                if (isCorrect) input.classList.add('correct');
                else {
                    input.classList.add('incorrect');
                    if (wrapper) {
                        const badge = document.createElement('span');
                        badge.className = 'correct-answer-badge';
                        badge.textContent = this.currentTestData.displayAnswers[`q${i}`];
                        wrapper.appendChild(badge);
                    }
                }
            }
        }
    }

    showResults() {
        const questionRange = this.getQuestionRange();
        let correctCount = 0;
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            if (this.isAnswerCorrect(i, this.getUserAnswer(i))) correctCount++;
        }
        const total = questionRange.end - questionRange.start + 1;

        const explanationPanel = document.getElementById('explanationPanel');
        const explanationTitle = document.getElementById('explanationTitle');
        const explanationText = document.getElementById('explanationText');
        if (explanationPanel && explanationTitle && explanationText) {
            explanationPanel.classList.add('show');
            explanationTitle.textContent = 'KẾT QUẢ';
            explanationText.innerHTML = `
                <h4>Đã nộp bài</h4>
                <p><strong>Đúng:</strong> ${correctCount}/${total}</p>
                <p>Click <strong>Xem giải thích</strong> để xem giải thích chi tiết.</p>
            `;
        }
    }

    handleExplain() {
        if (!this.examSubmitted) return;
        this.explanationMode = true;
        document.querySelectorAll('.eye-icon, .correct-answer-badge').forEach(el => el.style.display = 'inline-block');
        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) { explainBtn.disabled = true; explainBtn.textContent = 'Đang xem giải thích'; }
        const explanationPanel = document.getElementById('explanationPanel');
        if (explanationPanel) explanationPanel.classList.remove('show');
    }

    handleReset() {
        this.showResetModal();
    }

    createResetModal() {
        const existingModal = document.getElementById('resetModalOverlay');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'resetModalOverlay';
        overlay.className = 'reset-modal-overlay';
        Object.assign(overlay.style, {
            display: 'none', opacity: '0', visibility: 'hidden',
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
            zIndex: '9999', transition: 'opacity 0.2s ease'
        });

        overlay.innerHTML = `
            <div class="reset-modal">
                <h3>Xác nhận Reset</h3>
                <p>Bạn muốn reset những gì?</p>
                <div class="reset-modal-btns">
                    <button class="reset-modal-btn all" id="resetAllBtn">🗑️ Xóa hết (đáp án & highlight)</button>
                    <button class="reset-modal-btn content" id="resetAnswersOnlyBtn">📝 Xóa nội dung (chỉ đáp án)</button>
                    <button class="reset-modal-btn cancel" id="cancelResetBtn">❌ Hủy</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('resetAllBtn').addEventListener('click', () => {
            this.hideResetModal();
            this.resetAll(true);
        });
        document.getElementById('resetAnswersOnlyBtn').addEventListener('click', () => {
            this.hideResetModal();
            this.resetAll(false);
        });
        document.getElementById('cancelResetBtn').addEventListener('click', () => this.hideResetModal());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) this.hideResetModal(); });
    }

    showResetModal() {
        const overlay = document.getElementById('resetModalOverlay');
        if (!overlay) { this.createResetModal(); return this.showResetModal(); }
        overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.style.visibility = 'visible';
        });
    }

    hideResetModal() {
        const overlay = document.getElementById('resetModalOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            setTimeout(() => overlay.style.display = 'none', 200);
        }
    }

    resetAll(clearHighlights = true) {
        if (!confirm('Reset tất cả câu trả lời của part này?')) return;

        const completedKey = this.getStorageKey(false);
        const draftKey = this.getStorageKey(true);
        localStorage.removeItem(completedKey);
        localStorage.removeItem(draftKey);
        if (clearHighlights) {
            this.highlightManager.clearAll();
        }

        const d = this.currentTestData;
        let book = d.book, test = d.test, part = d.part;
        if (!book || !test || !part) {
            const parsed = this.storageManager.parseTestInfo(d.title);
            book = book || parsed.book;
            test = test || parsed.test;
            part = part || parsed.part;
        }

        this._isResetting = true;
        this.examSubmitted = false;
        this.explanationMode = false;

        const questionRange = this.getQuestionRange();
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            if (this.currentTestData.type === 'multiple-choice') {
                const radios = document.getElementsByName(`q${i}`);
                radios.forEach(radio => { radio.checked = false; radio.disabled = false; });
            } else {
                const input = document.getElementById(`q${i}`);
                if (input) { input.value = ''; input.disabled = false; }
            }

            const questionDiv = document.getElementById(`question-${i}`);
            if (questionDiv) {
                questionDiv.classList.remove('correct', 'incorrect');
                const badge = questionDiv.querySelector('.correct-answer-badge');
                if (badge) badge.remove();
            }

            if (this.currentTestData.type !== 'multiple-choice') {
                const input = document.getElementById(`q${i}`);
                if (input) {
                    input.classList.remove('correct', 'incorrect');
                    const wrapper = input.closest('.blank-line, .ket-match-row');
                    if (wrapper) {
                        const badge = wrapper.querySelector('.correct-answer-badge');
                        if (badge) badge.remove();
                    }
                }
            }
        }

        const mainArea = document.getElementById('mainArea');
        const transcriptContent = document.getElementById('transcriptContent');
        if (mainArea && transcriptContent) {
            mainArea.classList.remove('show-transcript');
            transcriptContent.innerHTML = '';
        }

        document.querySelectorAll('.eye-icon').forEach(icon => icon.style.display = 'none');

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Nộp bài'; }
        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) { explainBtn.disabled = true; explainBtn.textContent = 'Xem giải thích'; }
        const explanationPanel = document.getElementById('explanationPanel');
        if (explanationPanel) explanationPanel.classList.remove('show');

        try {
            const channel = new BroadcastChannel('ket_reset_channel');
            channel.postMessage({ action: 'reset', type: 'listening', book, test, part });
            channel.close();
        } catch(e) {}

        setTimeout(() => {
            this._isResetting = false;
            localStorage.removeItem(draftKey);
        }, 500);

        this.updateAnswerCount();
    }

    showExplanation(questionNum) {
        if (!this.explanationMode && !this.examSubmitted) return;

        this.highlightManager.clearAllHighlightSpans();

        const explanationPanel = document.getElementById('explanationPanel');
        const explanationTitle = document.getElementById('explanationTitle');
        const explanationText = document.getElementById('explanationText');

        if (explanationPanel && explanationTitle && explanationText) {
            explanationPanel.classList.add('show');
            explanationTitle.textContent = `Giải thích Câu ${questionNum}`;

            let html = this.currentTestData.detailedExplanations[`q${questionNum}`] ||
                      `<strong>Đáp án:</strong> ${this.currentTestData.displayAnswers[`q${questionNum}`]}</strong><br>`;

            if (this.examSubmitted) {
                const userAnswer = this.getUserAnswer(questionNum) || '(chưa trả lời)';
                const isCorrect = this.isAnswerCorrect(questionNum, userAnswer);

                html += `<div style="margin-top:10px;padding:10px; background:${isCorrect ? '#e8f5e8' : '#ffebee'}; border-radius:5px;">`;
                html += `<strong>Đáp án của bạn:</strong> ${userAnswer}<br>`;
                if (!isCorrect) html += `<strong>Đáp án đúng:</strong> ${this.currentTestData.displayAnswers[`q${questionNum}`]}`;
                else html += `<strong>Đúng!</strong>`;
                html += `</div>`;
            }

            explanationText.innerHTML = html;
        }
    }

    closeExplanation() {
        const explanationPanel = document.getElementById('explanationPanel');
        if (explanationPanel) explanationPanel.classList.remove('show');
        this.highlightManager.clearAllHighlightSpans();
    }

    disableInputs() {
        if (this.currentTestData.type === 'multiple-choice') {
            document.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = true);
        } else {
            document.querySelectorAll('.fill-input, .ket-match-input').forEach(input => input.disabled = true);
        }
    }

    getUserAnswers() {
        const answers = {};
        const questionRange = this.getQuestionRange();
        for (let i = questionRange.start; i <= questionRange.end; i++) answers[i] = this.getUserAnswer(i);
        return answers;
    }
}

// ==================== GLOBAL FUNCTIONS ====================
window.applyHighlight = function(color) {
    if (window.listeningCore && window.listeningCore.highlightManager) {
        // Sử dụng selectedRange hiện tại (nếu có) hoặc selection hiện tại
        const selection = window.getSelection();
        if (!selection.isCollapsed) {
            window.listeningCore.highlightManager.selectedRange = selection.getRangeAt(0).cloneRange();
        }
        window.listeningCore.highlightManager.addHighlightFromSelection(color);
    }
};

window.removeHighlight = function() {
    if (window.listeningCore && window.listeningCore.highlightManager) {
        const selection = window.getSelection();
        if (!selection.isCollapsed) {
            window.listeningCore.highlightManager.selectedRange = selection.getRangeAt(0).cloneRange();
        }
        window.listeningCore.highlightManager.removeHighlightFromSelection();
    }
};

window.ListeningCore = ListeningCore;