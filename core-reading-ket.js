/**
 * CORE READING ENGINE - KET A2 KEY
 * Contains all functionality for reading tests across all parts and tests
 * Compatible with KET 1 & KET 2, Tests 1-4, Parts 1-5
 * 
 * FIXED: Part 1 saving issue - use part-based question ranges
 */

class KETNoteManager {
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
            } catch (e) { }
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
            if (this.textarea.value && confirm('Bạn có chắc muốn xóa toàn bộ ghi chú?')) {
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

class MiniDashboardManager {
    constructor(core, skillType) {
        this.core = core;
        this.skillType = skillType;
        this.panel = null;
        this.isVisible = false;
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
            <div class="mini-dashboard-header">
                <h3>📊 <span id="mini-dashboard-title">Dashboard</span></h3>
                <button class="mini-dashboard-close" onclick="window.miniDashboard.hide()">✕</button>
            </div>
            <div class="mini-dashboard-content" id="mini-dashboard-content"></div>
            <div class="mini-dashboard-footer">
                <a href="dashboard.html" class="dashboard-link">Đến Dashboard ➝</a>
            </div>
        `;

        document.body.appendChild(this.panel);
        window.miniDashboard = this;
        this.contentArea = document.getElementById('mini-dashboard-content');
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

    // Bảng quy đổi điểm KET Reading chuẩn Cambridge (30 câu)
    ketReadingScoreMap() {
        return {
            30: { cambridge: 150, cefr: 'B1' },
            29: { cambridge: 145, cefr: 'B1' },
            28: { cambridge: 140, cefr: 'B1' },
            27: { cambridge: 138, cefr: 'A2' },
            26: { cambridge: 135, cefr: 'A2' },
            25: { cambridge: 133, cefr: 'A2' },
            24: { cambridge: 130, cefr: 'A2' },
            23: { cambridge: 128, cefr: 'A2' },
            22: { cambridge: 125, cefr: 'A2' },
            21: { cambridge: 123, cefr: 'A2' },
            20: { cambridge: 120, cefr: 'A2' },
            19: { cambridge: 117, cefr: 'A1' },
            18: { cambridge: 114, cefr: 'A1' },
            17: { cambridge: 111, cefr: 'A1' },
            16: { cambridge: 109, cefr: 'A1' },
            15: { cambridge: 106, cefr: 'A1' },
            14: { cambridge: 103, cefr: 'A1' },
            13: { cambridge: 100, cefr: 'A1' },
            12: { cambridge: 97, cefr: '-' },
            11: { cambridge: 94, cefr: '-' },
            10: { cambridge: 91, cefr: '-' },
            9: { cambridge: 88, cefr: '-' },
            8: { cambridge: 85, cefr: '-' },
            7: { cambridge: 82, cefr: '-' },
            6: { cambridge: 70, cefr: '-' },
            5: { cambridge: 59, cefr: '-' },
            4: { cambridge: 47, cefr: '-' },
            3: { cambridge: 35, cefr: '-' },
            2: { cambridge: 23, cefr: '-' },
            1: { cambridge: 12, cefr: '-' },
            0: { cambridge: 0, cefr: '-' }
        };
    }

    // Bảng quy đổi điểm KET Listening chuẩn Cambridge (25 câu)
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
        const parts = skill === 'reading' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];

        return parts.map(part => {
            let keyCompleted = `ket_${skill}_book${book}_test${test}_part${part}`;
            let keyDraft = keyCompleted + '_draft';

            let dataCompleted = localStorage.getItem(keyCompleted);
            let dataDraft = localStorage.getItem(keyDraft);

            if (dataCompleted) {
                try {
                    const parsed = JSON.parse(dataCompleted);
                    return { part, type: 'completed', value: parsed.correctCount || 0, total: parsed.totalQuestions || 0 };
                } catch (e) { }
            }

            if (dataDraft) {
                try {
                    const parsed = JSON.parse(dataDraft);
                    const answered = Object.values(parsed).filter(v => v !== null && v !== undefined && String(v).trim() !== '' && typeof v !== 'object').length;
                    return { part, type: 'draft', value: answered, total: 0 };
                } catch (e) { }
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
                    <a href="${url}" class="part-item ${currentClass}">
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
        try {
            this.channel = new BroadcastChannel('ket_update_channel');
            this.channel.addEventListener('message', () => {
                if (this.isVisible) this.refreshData();
            });
        } catch (e) {
            console.warn('BroadcastChannel not supported', e);
        }

        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith('ket_') && this.isVisible) {
                this.refreshData();
            }
        });
    }
}


class ReadingCore {
    constructor() {
        this.examSubmitted = false;
        this.explanationMode = false;
        this.currentTestData = null;
        this.currentSplit = false;
        this.slotState = {};

        this.highlightManager = new ReadingHighlightManager();
        this.storageManager = new ReadingStorageManager();
        this.uiManager = new ReadingUIManager();
        this.debounceTimer = null;
        this.DEBOUNCE_MS = 500;
        this._isResetting = false;

        this.personalHighlightsVisible = true;
    }

    initializeTest(testData) {
        this.currentTestData = testData;
        this.examSubmitted = false;
        this.explanationMode = false;
        this.currentSplit = false;

        this.setupUI();

        if (this.currentTestData.type === 'split-layout') {
            this.renderSingleColumn();
        } else if (this.currentTestData.type === 'drag-drop') {
            this.setupDragDropEvents();
        } else if (this.currentTestData.type === 'inline-radio') {
            this.renderInlineRadioQuestions();
        } else {
            this.renderQuestions();
        }

        this.loadHighlightDraft();

        if (this.currentTestData.type === 'split-layout') {
            this.attachInputEvents();
        }

        this.setupEventListeners();
        this.setupBeforeUnload();
        this.createNavigation();

        // KIỂM TRA VÀ KHÔI PHỤC TRẠNG THÁI SUBMITTED
        const submittedState = this.storageManager.loadSubmittedState(this.currentTestData);
        if (submittedState && submittedState.submitted) {
            console.log('[Init] Restoring submitted state...');
            this.restoreSubmittedState(submittedState);
        } else if (!this.isCompleted()) {
            this.loadDraft();
        }

        this.noteManager = new KETNoteManager(this);
        this.noteManager.init();

        this.miniDashboard = new MiniDashboardManager(this, 'reading');
        this.miniDashboard.init();

        this.createResetModal();

        this.updateAnswerCount();

        document.querySelectorAll('.eye-icon').forEach(icon => {
            icon.style.display = 'none';
        });

        console.log('Reading test initialized:', testData.title || `Part ${testData.part}`);
    }

    isCompleted() {
        if (!this.currentTestData) return false;
        const key = this.getStorageKey(false);
        return localStorage.getItem(key) !== null;
    }

    getStorageKey(isDraft = false) {
        const { book, test, part } = this.getTestMeta();
        let key = `ket_reading_book${book}_test${test}_part${part}`;
        if (isDraft) key += '_draft';
        return key;
    }

    getHighlightStorageKey() {
        return this.getStorageKey(false) + '_highlights';
    }

    saveHighlightDraft() {
        const potentialSelectors = [
            '#readingContent',
            '#questionsContainer',
            '.reading-content',
            '.questions-list',
            '.reading-card',
            '.single-col .reading-card',
            '.reading-passage'
        ];

        let foundData = [];
        potentialSelectors.forEach(selector => {
            const el = document.querySelector(selector);
            if (el && (el.innerHTML.includes('highlight-yellow') ||
                el.innerHTML.includes('highlight-green') ||
                el.innerHTML.includes('highlight-pink'))) {
                foundData.push({ selector, html: el.innerHTML });
            }
        });

        const key = this.getHighlightStorageKey();
        if (foundData.length > 0) {
            this._safeSetStorage(key, JSON.stringify({ containers: foundData, timestamp: Date.now() }));
            console.log('[Reading Highlight] Saved', foundData.length, 'containers to', key);
        } else {
            localStorage.removeItem(key);
            console.log('[Reading Highlight] No highlights – removed key:', key);
        }
    }

    loadHighlightDraft() {
        const key = this.getHighlightStorageKey();
        const savedData = localStorage.getItem(key);

        if (!savedData) {
            console.log('[Highlight] No saved data found for key:', key);
            return;
        }

        try {
            const parsed = JSON.parse(savedData);

            const captureInputValues = (container) => {
                const inputs = container.querySelectorAll('input, select, textarea');
                const values = [];
                inputs.forEach((input, index) => {
                    if (input.type === 'radio' || input.type === 'checkbox') {
                        values.push({ index, checked: input.checked, name: input.name, value: input.value });
                    } else {
                        values.push({ index, value: input.value, id: input.id });
                    }
                });
                return values;
            };

            const restoreInputValues = (container, savedValues) => {
                const inputs = container.querySelectorAll('input, select, textarea');
                savedValues.forEach(item => {
                    const input = inputs[item.index];
                    if (!input) return;
                    if (input.type === 'radio' || input.type === 'checkbox') {
                        input.checked = item.checked;
                    } else {
                        input.value = item.value;
                    }
                });
            };

            if (parsed.containers && Array.isArray(parsed.containers)) {
                console.log('[Highlight] Restoring', parsed.containers.length, 'containers');
                parsed.containers.forEach(item => {
                    const container = document.querySelector(item.selector);
                    if (container) {
                        const inputValues = captureInputValues(container);
                        container.innerHTML = item.html;
                        restoreInputValues(container, inputValues);
                        console.log('[Highlight] Restored container:', item.selector);
                    }
                });
            } else {
                const savedHtml = typeof parsed === 'object' ? parsed.html : parsed;
                if (!savedHtml) return;

                const container = document.getElementById('readingContent') ||
                    document.querySelector('.reading-card') ||
                    document.querySelector('.single-col .reading-card');
                if (container) {
                    const inputValues = captureInputValues(container);
                    container.innerHTML = savedHtml;
                    restoreInputValues(container, inputValues);
                    console.log('[Highlight] Restored using legacy logic');
                }
            }
        } catch (e) {
            console.error('[Highlight] Load error:', e);
            const container = document.getElementById('readingContent') || document.querySelector('.reading-card');
            if (container && savedData.includes('<span')) {
                const inputValues = captureInputValues(container);
                container.innerHTML = savedData;
                restoreInputValues(container, inputValues);
            }
        }
    }

    getTestMeta() {
        const d = this.currentTestData;
        if (!d) return { book: 1, test: 1, part: 1 };

        const meta = d.metadata || this.storageManager.parseTestInfo(
            document.querySelector('.candidate')?.textContent || document.title || ''
        );

        const book = meta.book || 1;
        const test = meta.test || 1;
        const part = d.part || meta.part || 1;

        return { book, test, part };
    }

    cleanup() {
        if (this._boundChangeHandler) {
            document.removeEventListener('change', this._boundChangeHandler);
            this._boundChangeHandler = null;
        }
        if (this._boundDocInputHandler) {
            document.removeEventListener('input', this._boundDocInputHandler);
            this._boundDocInputHandler = null;
        }
        if (this._boundInputHandler) {
            const container = document.querySelector('.single-col') || document.querySelector('.left-col') || document.getElementById('questionsContainer');
            if (container) container.removeEventListener('input', this._boundInputHandler);
            this._boundInputHandler = null;
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

        const targetUrl = `read-ket${book}-test${test}-part${targetPart}.html`;
        window.location.href = targetUrl;
    }

    getDraftData() {
        const questionRange = this.getQuestionRange();
        const draft = { type: this.currentTestData.type, slotState: { ...this.slotState } };
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            draft[`q${i}`] = this.getUserAnswer(i);
        }
        return draft;
    }

    _safeSetStorage(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.warn('[Storage] Quota exceeded! Running emergency cleanup...');

                // Dọn dẹp khẩn cấp – ưu tiên hàm toàn cục nếu có
                const removed = window.__petKetCleanStorage?.() ?? 0;
                if (removed === 0) this._cleanOldDrafts();

                // Hiện toast cảnh báo cho học sinh
                this._showEmergencyToast(removed);

                // Thử lưu lại lần 2
                try {
                    localStorage.setItem(key, value);
                    console.log('[Storage] Saved successfully after emergency cleanup.');
                } catch (e2) {
                    console.error('[Storage] Still failed after cleanup:', e2);
                    this._showCriticalStorageError();
                }
            } else {
                console.error('[Storage] Failed to save:', e);
            }
        }
    }

    _showEmergencyToast(removedCount) {
        if (document.getElementById('storageEmergencyToast')) return;
        const toast = document.createElement('div');
        toast.id = 'storageEmergencyToast';
        toast.style.cssText = 'position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #e65100; color: white; padding: 12px 22px; border-radius: 8px; z-index: 10001; font-family: sans-serif; font-size: 14px; box-shadow: 0 3px 14px rgba(0,0,0,0.35); text-align: center; min-width: 300px; animation: storageSlideUp 0.4s ease;';
        toast.innerHTML = removedCount > 0
            ? `⚠️ Bộ nhớ đầy! Đã tự dọn <strong>${removedCount}</strong> file cũ để tiếp tục lưu.`
            : `⚠️ Bộ nhớ đầy! Đang cố gắng giải phóng dung lượng...`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    _showCriticalStorageError() {
        if (document.getElementById('storageCriticalMsg')) return;
        const el = document.createElement('div');
        el.id = 'storageCriticalMsg';
        el.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #b71c1c; color: white; padding: 20px 30px; border-radius: 12px; z-index: 10002; font-family: sans-serif; font-size: 15px; box-shadow: 0 6px 24px rgba(0,0,0,0.5); text-align: center; max-width: 420px; border: 2px solid #ff5252;';
        el.innerHTML = `
            <div style="font-size: 28px; margin-bottom: 10px;">🚨</div>
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">Không thể lưu dữ liệu!</div>
            <div style="font-size: 13px; margin-bottom: 14px;">Bộ nhớ trình duyệt đã <strong>hoàn toàn đầy</strong>. Câu trả lời hiện tại có thể không được lưu.<br><br>Vui lòng vào một bài đã làm → nhấn <strong>Reset → Xóa hết</strong> để giải phóng bộ nhớ.</div>
            <button onclick="document.getElementById('storageCriticalMsg')?.remove()" style="background: white; color: #b71c1c; border: none; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">Đã hiểu</button>
        `;
        document.body.appendChild(el);
    }

    _cleanOldDrafts() {
        const prefixes = ['pet_reading_book', 'pet_listening_book', 'ket_reading_book', 'ket_listening_book'];
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && prefixes.some(p => key.startsWith(p)) && (key.endsWith('_draft') || key.endsWith('_highlights'))) {
                keys.push(key);
            }
        }
        if (keys.length > 10) {
            keys.sort();
            const toRemove = keys.slice(0, keys.length - 10);
            toRemove.forEach(k => {
                localStorage.removeItem(k);
                console.log('[Cleanup] Removed old draft/highlight:', k);
            });
            console.log(`[Cleanup] Freed ${toRemove.length} old item(s), kept ${Math.min(keys.length, 10)} recent.`);
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
            } catch (e) {
                console.error('[Reading Draft] FAILED to save:', e);
            }
        }, this.DEBOUNCE_MS);
    }

    saveDraftImmediate() {
        if (this._isResetting) return;
        if (this.examSubmitted || !this.currentTestData) return;

        clearTimeout(this.debounceTimer);

        try {
            const draft = this.getDraftData();
            const hasAnswers = this.draftHasAnswers(draft);
            if (!hasAnswers) return;

            const key = this.getStorageKey(true);
            this._safeSetStorage(key, JSON.stringify(draft));

            try {
                const channel = new BroadcastChannel('ket_update_channel');
                channel.postMessage({
                    action: 'status_updated',
                    type: 'reading',
                    book: this.currentTestData.book || 1,
                    test: this.currentTestData.test || 1,
                    part: this.currentTestData.part || 1,
                    status: 'in-progress'
                });
                channel.close();
            } catch (e) { }
        } catch (e) {
            console.error('[Reading Draft] Immediate save failed:', e);
        }
    }

    draftHasAnswers(draft) {
        const { type, slotState, ...answers } = draft;
        const radioAnswers = Object.entries(answers).some(([key, val]) => val !== null && val !== undefined && val !== '');
        if (slotState && Object.keys(slotState).length > 0) return true;
        return radioAnswers;
    }

    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            if (!this._isResetting) this.saveDraftImmediate();
        });
        window.addEventListener('pagehide', () => {
            if (!this._isResetting) this.saveDraftImmediate();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && !this._isResetting) {
                this.saveDraftImmediate();
            }
        });
    }

    loadDraft() {
        const key = this.getStorageKey(true);
        const draftJson = localStorage.getItem(key);
        if (!draftJson) return false;

        try {
            const draft = JSON.parse(draftJson);
            const questionRange = this.getQuestionRange();

            if (draft.type === 'multiple-choice' || draft.type === 'inline-radio') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const ans = draft[`q${i}`];
                    if (!ans) continue;
                    const radio = document.querySelector(`input[name="q${i}"][value="${ans}"]`);
                    if (radio) {
                        radio.checked = true;
                        if (draft.type === 'inline-radio') this.updateInlineSlotFromRadio(i);
                    }
                }
            } else if (draft.type === 'matching') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const ans = draft[`q${i}`];
                    if (!ans) continue;
                    const input = document.getElementById(`answer-${i}`);
                    if (input) input.value = ans;
                }
            } else if (draft.type === 'drag-drop') {
                const slotState = draft.slotState || {};
                for (const [qNumStr, value] of Object.entries(slotState)) {
                    const qNum = parseInt(qNumStr);
                    if (value && value.value) this.placeInSlot(qNum, value.value);
                }
            } else if (draft.type === 'split-layout') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const ans = draft[`q${i}`];
                    if (ans === undefined) continue;
                    const inp = document.getElementById(`q${i}`);
                    if (inp) inp.value = ans;
                }
            }

            this.updateAnswerCount();
            return true;
        } catch (e) {
            console.error('Load draft error:', e);
            return false;
        }
    }

    clearDraft() {
        const key = this.getStorageKey(true);
        localStorage.removeItem(key);
    }

    setupUI() {
        this.uiManager.injectHeaderControls(this);
        this.uiManager.injectModeToggle();
        this.injectNoteButton();

        this.uiManager.setupFontControls();
        this.uiManager.setupThemeToggle();
        this.uiManager.setupModeToggle();

        if (this.currentTestData.type !== 'split-layout') {
            this.uiManager.setupResizer();
            this.uiManager.setupExplanationPanel();
        }

        this.uiManager.setupAutoCollapse(this);
        this.uiManager.injectStorageIndicator();
    }

    injectNoteButton() {
        const bottomBar = document.querySelector('.bottom-bar');
        if (!bottomBar || bottomBar.querySelector('.note-toggle-btn')) return;

        const noteBtn = document.createElement('button');
        noteBtn.className = 'btn btn-primary note-toggle-btn';
        noteBtn.style.marginLeft = '8px';
        noteBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M15 3v6h6"/><path d="M9 13h6"/><path d="M9 17h3"/></svg>
            Ghi chú
        `;
        noteBtn.onclick = () => this.noteManager?.toggle();

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
            this.currentTestData.questions.forEach(q => {
                const div = document.createElement('div');
                div.className = 'question-item';
                div.id = `question-${q.num}`;

                const introHtml = (q.intro || q.text)
                    ? `<div class="question-intro">${q.num}. ${q.intro || q.text}</div>`
                    : `<div class="question-num-only">${q.num}.</div>`;

                div.innerHTML = `
                    ${introHtml}
                    <div class="options">
                        ${q.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    return `
                                <div class="option">
                                    <input type="radio" name="q${q.num}" value="${letter}" id="q${q.num}${letter}">
                                    <label for="q${q.num}${letter}"><strong>${letter}</strong>. ${opt}</label>
                                </div>
                            `;
                }).join('')}
                    </div>
                    <span class="eye-icon" data-question="${q.num}">👁️</span>
                `;

                container.appendChild(div);
            });
        } else if (this.currentTestData.type === 'matching') {
            this.currentTestData.questions.forEach(q => {
                const div = document.createElement('div');
                div.className = 'question-item';
                div.id = `question-${q.num}`;

                div.innerHTML = `
                    <div class="question-text">${q.num}. ${q.text}</div>
                    <div class="answer-input-area">
                        <label for="answer-${q.num}">Đáp án (A–H):</label>
                        <input type="text" id="answer-${q.num}" class="answer-input" maxlength="1" placeholder="A–H" autocomplete="off">
                        <span class="eye-icon" data-question="${q.num}">👁️</span>
                    </div>
                `;
                container.appendChild(div);

                const input = document.getElementById(`answer-${q.num}`);
                if (input) {
                    input.addEventListener('input', function () {
                        this.value = this.value.toUpperCase().replace(/[^A-H]/g, '');
                        this.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                }
            });
        } else if (this.currentTestData.type === 'matching-dropdown') {
            const options = this.currentTestData.dropdownOptions || [];
            this.currentTestData.questions.forEach(q => {
                const div = document.createElement('div');
                div.className = 'question-item';
                div.id = `question-${q.num}`;

                const optionsHtml = `
                    <option value="">-- Chọn đáp án --</option>
                    ${options.map(opt => {
                    const val = opt.charAt(0).toUpperCase();
                    return `<option value="${val}">${opt}</option>`;
                }).join('')}
                `;

                div.innerHTML = `
                    <div class="question-text">${q.num}. ${q.text}</div>
                    <div class="answer-input-area">
                        <select id="answer-${q.num}" class="answer-select">
                            ${optionsHtml}
                        </select>
                        <span class="eye-icon" data-question="${q.num}">👁️</span>
                    </div>
                `;
                container.appendChild(div);

                const select = document.getElementById(`answer-${q.num}`);
                if (select) {
                    select.addEventListener('change', () => {
                        this.updateAnswerCount();
                        this.saveDraftImmediate();
                    });
                }
            });
        }
    }

    setupDragDropEvents() {
        const sentenceEls = document.querySelectorAll('.sentence-item');
        let touchSelected = null;

        document.querySelectorAll('.sentence-item').forEach(item => {
            item.addEventListener('dragstart', e => {
                item.classList.add('dragging');
                e.dataTransfer.setData('text/plain', item.getAttribute('data-value'));
                e.dataTransfer.effectAllowed = 'move';
            });
            item.addEventListener('dragend', () => item.classList.remove('dragging'));
            item.addEventListener('click', () => {
                if (this.examSubmitted) return;
                if (touchSelected === item) {
                    touchSelected = null;
                    item.style.outline = '';
                    return;
                }
                if (touchSelected) touchSelected.style.outline = '';
                touchSelected = item;
                item.style.outline = '3px solid #e6b422';
            });
        });

        const allDropTargets = [
            ...document.querySelectorAll('.inline-drop-slot'),
            ...document.querySelectorAll('.drop-slot-panel')
        ];

        allDropTargets.forEach(slot => {
            slot.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                slot.classList.add('drag-over');
            });
            slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
            slot.addEventListener('drop', e => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                if (this.examSubmitted) return;
                const value = e.dataTransfer.getData('text/plain');
                const qNum = parseInt(slot.getAttribute('data-q'));
                if (value && qNum) this.placeInSlot(qNum, value);
            });
            slot.addEventListener('click', () => {
                if (this.examSubmitted) return;
                if (!touchSelected) return;
                const value = touchSelected.getAttribute('data-value');
                const qNum = parseInt(slot.getAttribute('data-q'));
                if (value && qNum) {
                    this.placeInSlot(qNum, value);
                    touchSelected.style.outline = '';
                    touchSelected = null;
                }
            });
        });

        document.querySelectorAll('.remove-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.examSubmitted) return;
                const slot = chip.closest('[data-q]');
                if (!slot) return;
                const qNum = parseInt(slot.getAttribute('data-q'));
                this.clearSlot(qNum);
            });
        });
    }

    getPart4Sentence(value) {
        return document.getElementById(`sent-${value}`);
    }

    setSlotContent(qNum, value, text) {
        const reading = document.getElementById(`readingSlot${qNum}`);
        const panel = document.getElementById(`panelSlot${qNum}`);
        const displayText = value ? `${value} – ${text}` : null;

        [reading, panel].forEach(slot => {
            if (!slot) return;
            const contentEl = slot.querySelector('.slot-content');
            const removeEl = slot.querySelector('.remove-chip');
            if (value) {
                if (contentEl) contentEl.textContent = displayText;
                slot.setAttribute('data-selected', value);
                if (removeEl) removeEl.style.display = 'inline';
            } else {
                if (contentEl) contentEl.textContent = slot.classList.contains('inline-drop-slot') ? `[ ${qNum} ]` : '';
                slot.removeAttribute('data-selected');
                if (removeEl) removeEl.style.display = 'none';
            }
        });

        this.slotState[qNum] = value ? { value, text } : null;
        this.saveDraftImmediate();
    }

    placeInSlot(qNum, value) {
        const sentEl = this.getPart4Sentence(value);
        const text = sentEl ? sentEl.querySelector('.sentence-text').textContent.trim() : value;

        for (const [key, state] of Object.entries(this.slotState)) {
            if (state && state.value === value && parseInt(key) !== qNum) {
                this.setSlotContent(parseInt(key), null, null);
            }
        }

        const prev = this.slotState[qNum];
        if (prev && prev.value !== value) {
            const prevEl = this.getPart4Sentence(prev.value);
            if (prevEl) prevEl.classList.remove('hidden');
        }

        this.setSlotContent(qNum, value, text);
        if (sentEl) sentEl.classList.add('hidden');
        this.updateAnswerCount();
        this.setActiveNavButton(qNum);
    }

    clearSlot(qNum) {
        const prev = this.slotState[qNum];
        if (prev) {
            const el = this.getPart4Sentence(prev.value);
            if (el) el.classList.remove('hidden');
        }
        this.setSlotContent(qNum, null, null);
        this.updateAnswerCount();
    }

    renderInlineRadioQuestions() {
        const container = document.getElementById('questionsContainer');
        if (!container) return;
        container.innerHTML = '';

        const optionsList = this.currentTestData.optionsList;
        const questionRange = this.getQuestionRange();

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const qDiv = document.createElement('div');
            qDiv.className = 'question-item';
            qDiv.id = `question-${i}`;

            const optionsHtml = optionsList[i].map(opt => {
                const letter = opt.charAt(0);
                const text = opt.substring(2);
                return `<label><input type="radio" name="q${i}" value="${letter}"> <strong>${letter}</strong>. ${text}</label>`;
            }).join('');

            qDiv.innerHTML = `
                <div class="question-text">${i}.</div>
                <div class="answer-input-area">
                    <div class="radio-group" id="radio-group-${i}">${optionsHtml}</div>
                    <span class="eye-icon" data-question="${i}">👁️</span>
                </div>
            `;
            container.appendChild(qDiv);

            const radios = qDiv.querySelectorAll(`input[name="q${i}"]`);
            radios.forEach(radio => {
                radio.addEventListener('change', () => {
                    this.updateInlineSlotFromRadio(i);
                    this.saveDraftImmediate();
                });
            });
        }
    }

    updateInlineSlotFromRadio(qNum) {
        const selectedLetter = this.getUserAnswer(qNum);
        const slot = document.getElementById(`readingSlot${qNum}`);
        if (!slot) return;
        const contentSpan = slot.querySelector('.slot-content') || slot;

        if (selectedLetter && this.currentTestData.wordMap && this.currentTestData.wordMap[qNum] && this.currentTestData.wordMap[qNum][selectedLetter]) {
            const word = this.currentTestData.wordMap[qNum][selectedLetter];
            contentSpan.textContent = word;
            this.slotState[qNum] = { value: selectedLetter, text: word };
        } else {
            contentSpan.textContent = `[${qNum}]`;
            this.slotState[qNum] = null;
        }
        this.updateAnswerCount();
    }

    renderSingleColumn() {
        const mainArea = document.getElementById('mainArea');
        if (!mainArea || !this.currentTestData.template) return;

        mainArea.innerHTML = `
            <div class="single-col">
                <div class="part-header">
                    <h3>Questions ${this.getQuestionRange().start}–${this.getQuestionRange().end}</h3>
                    <p>For each question, write the correct answer. Write <strong>ONE</strong> word for each gap.</p>
                </div>
                ${this.currentTestData.template}
            </div>
        `;
    }

    renderSplitColumn() {
        const mainArea = document.getElementById('mainArea');
        if (!mainArea || !this.currentTestData.template) return;

        mainArea.innerHTML = `
            <div class="split-container">
                <div class="left-col">
                    <div class="part-header">
                        <h3>Questions ${this.getQuestionRange().start}–${this.getQuestionRange().end}</h3>
                        <p>For each question, write the correct answer. Write <strong>ONE</strong> word for each gap.</p>
                    </div>
                    ${this.currentTestData.template}
                </div>
                <div class="right-col" id="rightCol">
                    <div class="explanation-header">
                        <span>Giải thích</span>
                        <span class="close-explanation-btn" id="closeRightExplain">✕ Đóng</span>
                    </div>
                    <div class="explanation-content" id="rightExplanationText">
                        Nhấn vào biểu tượng con mắt để xem giải thích.
                    </div>
                </div>
            </div>
        `;

        document.getElementById('closeRightExplain')?.addEventListener('click', () => {
            const col = document.getElementById('rightCol');
            if (col) col.classList.remove('show');
        });
    }

    attachInputEvents() {
        const container = document.querySelector('.single-col') || document.querySelector('.left-col') || document.getElementById('questionsContainer');
        if (container) {
            if (this._boundInputHandler) {
                container.removeEventListener('input', this._boundInputHandler);
            }

            this._boundInputHandler = (e) => {
                const target = e.target;
                if (target && target.matches('.gap-input')) {
                    this.updateAnswerCount();
                    this.saveDraft();
                }
            };
            container.addEventListener('input', this._boundInputHandler);

            container.querySelectorAll('.gap-input').forEach(inp => {
                if (this.examSubmitted) {
                    inp.disabled = true;
                    const val = inp.value.trim();
                    const correct = this.isAnswerCorrect(parseInt(inp.dataset.q), val);
                    inp.classList.add(correct ? 'correct' : 'incorrect');
                }
            });
        }

        document.querySelectorAll('.eye-icon').forEach(icon => {
            if (this.explanationMode || this.examSubmitted) {
                icon.style.display = 'inline-block';
            } else {
                icon.style.display = 'none';
            }

            icon.addEventListener('click', (e) => {
                const qNum = parseInt(e.currentTarget.dataset.q || e.currentTarget.dataset.question);
                this.showExplanation(qNum);
            });
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

        this._boundDocInputHandler = (e) => {
            if (this._isResetting) return;
            if (e.target && e.target.matches('.gap-input')) return;

            if (e.target && (e.target.matches('input[type="text"]') || e.target.matches('textarea'))) {
                this.updateAnswerCount();
                this.saveDraft();
            }
        };
        document.addEventListener('input', this._boundDocInputHandler);

        document.addEventListener('click', (e) => {
            const slot = e.target.closest('.reading-slot, .gap-input');
            if (slot) {
                const qNum = parseInt(slot.dataset.q);
                if (qNum) {
                    this.scrollToQuestion(qNum);
                    this.setActiveNavButton(qNum);
                }
            }

            if (e.target && e.target.classList.contains('eye-icon') && !e.target.dataset.q) {
                const qNum = e.target.dataset.question;
                if (qNum) this.showExplanation(parseInt(qNum));
            }
        });

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
            <span>Part trước</span>
        `;
        if (part <= 1) prevPartBtn.disabled = true;
        prevPartBtn.onclick = () => this.goToPart(-1);
        nav.appendChild(prevPartBtn);

        const questionRange = this.getQuestionRange();
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const btn = document.createElement('button');
            const ans = this.getUserAnswer(i);
            btn.className = 'nav-btn unanswered';
            if (ans !== null && ans !== "") btn.classList.add('answered');
            btn.textContent = i;
            btn.dataset.question = i;
            btn.dataset.q = i;
            btn.onclick = () => this.scrollToQuestion(i);
            nav.appendChild(btn);
        }

        const nextPartBtn = document.createElement('button');
        nextPartBtn.className = 'nav-arrow-btn nav-next-part';
        nextPartBtn.title = 'Part sau';
        nextPartBtn.innerHTML = `
            <span>Part sau</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        `;
        if (part >= 5) nextPartBtn.disabled = true;
        nextPartBtn.onclick = () => this.goToPart(1);
        nav.appendChild(nextPartBtn);

        this.injectHighlightToggle();
    }

    injectHighlightToggle() {
        const questionNav = document.querySelector('.question-nav');
        if (!questionNav) return;
        if (questionNav.querySelector('#highlightToggle')) return;

        const toggleWrapper = document.createElement('div');
        toggleWrapper.className = 'highlight-toggle-wrapper';
        toggleWrapper.title = 'Bật/tắt highlight cá nhân';
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
            document.getElementById('readingContent'),
            document.getElementById('questionsContainer'),
            document.querySelector('.questions-panel'),
            document.querySelector('.reading-card'),
            document.querySelector('.left-col'),
            document.querySelector('.single-col')
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

    // ==================== FIXED: Part-based question range ====================
    getQuestionRange() {
        if (!this.currentTestData) return { start: 1, end: 5 };
        const part = this.currentTestData.part || 1;
        switch(part) {
            case 1: return { start: 1, end: 6 };      // 6 questions
            case 2: return { start: 7, end: 13 };     // 7 questions
            case 3: return { start: 14, end: 18 };    // 5 questions
            case 4: return { start: 19, end: 24 };    // 6 questions
            case 5: return { start: 25, end: 30 };    // 6 questions
            default: return { start: 1, end: 5 };
        }
    }

    getUserAnswer(questionNum) {
        if (this.currentTestData.type === 'multiple-choice' || this.currentTestData.type === 'inline-radio') {
            const radios = document.getElementsByName(`q${questionNum}`);
            for (let radio of radios) if (radio.checked) return radio.value;
            return null;
        } else if (this.currentTestData.type === 'drag-drop') {
            return this.slotState[questionNum] ? this.slotState[questionNum].value : null;
        } else if (this.currentTestData.type === 'matching' || this.currentTestData.type === 'matching-dropdown') {
            const input = document.getElementById(`answer-${questionNum}`);
            if (!input) return null;
            let val = input.value.trim().toUpperCase();
            return (val.length === 1 && /[A-H]/.test(val)) ? val : null;
        } else if (this.currentTestData.type === 'split-layout') {
            const input = document.getElementById(`q${questionNum}`);
            return input ? input.value.trim() : "";
        }
        return null;
    }

    isAnswerCorrect(questionNum, userAnswer) {
        if (!userAnswer) return false;
        const keyMap = this.currentTestData.answerKey[`q${questionNum}`] || this.currentTestData.answerKey[questionNum];
        if (Array.isArray(keyMap)) return keyMap.some(correct => userAnswer.toLowerCase() === correct.toLowerCase());
        else if (typeof keyMap === 'string') return userAnswer.toLowerCase() === keyMap.toLowerCase();
        return false;
    }

    setActiveNavButton(questionNum) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.nav-btn[data-question="${questionNum}"]`) ||
            document.querySelector(`.nav-btn[data-q="${questionNum}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    scrollToQuestion(questionNum) {
        const type = this.currentTestData.type;
        const part = this.currentTestData.part || this.getTestMeta().part;

        if (type === 'inline-radio') {
            const slotElement = document.getElementById(`readingSlot${questionNum}`) ||
                document.querySelector(`[data-q="${questionNum}"]`);
            if (slotElement) slotElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            let questionElement = document.getElementById(`question-${questionNum}`);
            if (questionElement) questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (type === 'drag-drop') {
            const slotElement = document.getElementById(`readingSlot${questionNum}`) ||
                document.querySelector(`#passageCard [data-q="${questionNum}"]`);
            if (slotElement) slotElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const sentItem = document.getElementById(`sent-${this.getUserAnswer(questionNum) || ''}`);
            if (sentItem) sentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        if (type === 'multiple-choice' && part === 1) {
            let cardId = null;
            if (this.currentTestData.highlightMap && this.currentTestData.highlightMap[`q${questionNum}`]) {
                cardId = this.currentTestData.highlightMap[`q${questionNum}`].cardId;
            }
            if (!cardId) cardId = questionNum;
            const cardElement = document.querySelector(`.reading-card[data-text-id="${cardId}"]`);
            if (cardElement) cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        let questionElement = document.getElementById(`question-${questionNum}`);
        if (!questionElement && type === 'split-layout') {
            questionElement = document.getElementById(`q${questionNum}`);
        }
        if (questionElement) {
            questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (type === 'split-layout') questionElement.focus();
        }
    }

    updateAnswerCount() {
        const questionRange = this.getQuestionRange();
        let answered = 0;
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const ans = this.getUserAnswer(i);
            if (ans !== null && ans !== "") answered++;
        }
        const total = questionRange.end - questionRange.start + 1;
        if (this._lastAnsweredCount === answered) return;
        this._lastAnsweredCount = answered;

        const answeredBadge = document.getElementById('answeredCount');
        if (answeredBadge) answeredBadge.textContent = `${answered}/${total} answered`;
        const progressDisplay = document.getElementById('progressDisplay');
        if (progressDisplay) progressDisplay.textContent = `Đã làm: ${answered}/${total}`;

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const btn = document.querySelector(`.nav-btn[data-question="${i}"]`) ||
                document.querySelector(`.nav-btn[data-q="${i}"]`);
            if (btn) {
                const ans = this.getUserAnswer(i);
                btn.classList.remove('answered', 'unanswered');
                btn.classList.add((ans !== null && ans !== "") ? 'answered' : 'unanswered');
            }
        }
    }

    handleSubmit() {
        if (this.examSubmitted) return;
        const questionRange = this.getQuestionRange();
        const unanswered = [];
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const ans = this.getUserAnswer(i);
            if (ans === null || ans === "") unanswered.push(i);
        }
        if (unanswered.length > 0) {
            if (!confirm(`Bạn còn ${unanswered.length} câu chưa trả lời. Bạn có chắc muốn nộp bài?`)) return;
        }
        this.submitExam();
    }

    submitExam() {
        this.examSubmitted = true;
        document.querySelector('.ielts-header')?.classList.remove('collapsed');
        document.querySelector('.question-nav')?.classList.remove('collapsed');
        document.querySelector('.bottom-bar')?.classList.remove('collapsed');

        if (this.currentTestData.type === 'split-layout') {
            const questionRange = this.getQuestionRange();
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                const inp = document.getElementById(`q${i}`);
                if (inp) {
                    const correct = this.isAnswerCorrect(i, this.getUserAnswer(i));
                    inp.classList.add(correct ? 'correct' : 'incorrect');
                    inp.disabled = true;
                }
            }
        } else {
            this.markAnswers();
        }

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đã nộp bài'; }
        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) explainBtn.disabled = false;

        this.showResults();
        const userAnswers = this.getUserAnswers();
        this.storageManager.saveResults(this.currentTestData, userAnswers);
        // LƯU TRẠNG THÁI SUBMITTED
        this.storageManager.saveSubmittedState(this.currentTestData, userAnswers);

        try {
            const channel = new BroadcastChannel('ket_update_channel');
            channel.postMessage({
                action: 'status_updated',
                type: 'reading',
                book: this.currentTestData.book,
                test: this.currentTestData.test,
                part: this.currentTestData.part,
                status: 'completed'
            });
            channel.close();
        } catch (e) { }

        this.clearDraft();
        this.disableInputs();
    }

    markAnswers() {
        const questionRange = this.getQuestionRange();
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            if (this.currentTestData.type === 'drag-drop') {
                const reading = document.getElementById(`readingSlot${i}`);
                const panel = document.getElementById(`panelSlot${i}`);
                const isCorrect = this.isAnswerCorrect(i, this.getUserAnswer(i));
                [reading, panel].forEach(slot => {
                    if (!slot) return;
                    slot.classList.remove('correct', 'incorrect');
                    const oldBadge = slot.querySelector('.correct-answer-badge');
                    if (oldBadge) oldBadge.remove();
                    if (this.getUserAnswer(i)) {
                        slot.classList.add(isCorrect ? 'correct' : 'incorrect');
                        if (!isCorrect) {
                            const badge = document.createElement('span');
                            badge.className = 'correct-answer-badge';
                            badge.textContent = `✓ ${this.currentTestData.answerKey[`q${i}`] || this.currentTestData.answerKey[i]}`;
                            slot.appendChild(badge);
                        }
                    }
                });
                continue;
            } else if (this.currentTestData.type === 'matching' || this.currentTestData.type === 'matching-dropdown') {
                const input = document.getElementById(`answer-${i}`);
                if (input) {
                    const userAnswer = this.getUserAnswer(i);
                    const isCorrect = this.isAnswerCorrect(i, userAnswer);
                    input.classList.remove('correct', 'incorrect');
                    const oldBadge = input.parentNode.querySelector('.correct-answer-badge');
                    if (oldBadge) oldBadge.remove();
                    if (isCorrect) input.classList.add('correct');
                    else if (userAnswer) {
                        input.classList.add('incorrect');
                        const badge = document.createElement('span');
                        badge.className = 'correct-answer-badge';
                        badge.textContent = `✓ ${this.currentTestData.displayAnswers[`q${i}`] || this.currentTestData.displayAnswers[i]}`;
                        input.parentNode.appendChild(badge);
                    }
                }
                continue;
            }

            const questionDiv = document.getElementById(`question-${i}`);
            if (!questionDiv) continue;
            const userAnswer = this.getUserAnswer(i);
            const isCorrect = this.isAnswerCorrect(i, userAnswer);
            questionDiv.classList.remove('correct', 'incorrect');
            const oldBadge = questionDiv.querySelector('.correct-answer-badge');
            if (oldBadge) oldBadge.remove();
            if (isCorrect) questionDiv.classList.add('correct');
            else {
                questionDiv.classList.add('incorrect');
                const badge = document.createElement('span');
                badge.className = 'correct-answer-badge';
                badge.textContent = `Đáp án đúng: ${this.currentTestData.displayAnswers[`q${i}`] || this.currentTestData.displayAnswers[i]}`;
                questionDiv.appendChild(badge);
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
        if (this.currentTestData.type === 'split-layout') return;

        const explanationPanel = document.getElementById('explanationPanel');
        const explanationTitle = document.getElementById('explanationTitle');
        const explanationText = document.getElementById('explanationText');
        if (explanationPanel && explanationTitle && explanationText) {
            explanationPanel.classList.add('show');
            explanationTitle.textContent = 'KẾT QUẢ';
            explanationText.innerHTML = `
                <h4>Bạn đã nộp bài</h4>
                <p><strong>Đúng:</strong> ${correctCount}/${total}</p>
                <p>Nhấn vào nút <strong>Xem giải thích</strong> để xem hiệu ứng và đáp án đúng.</p>
            `;
        }
    }

    handleExplain() {
        if (!this.examSubmitted) return;
        this.explanationMode = true;
        // Chỉ hiện eye-icon, ẩn tất cả badge đáp án
        document.querySelectorAll('.eye-icon').forEach(el => el.style.display = 'inline-block');
        document.querySelectorAll('.correct-answer-badge').forEach(el => el.style.display = 'none');
        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) { explainBtn.disabled = true; explainBtn.textContent = 'Đang xem giải thích'; }

        if (this.currentTestData.type === 'split-layout') {
            if (!this.currentSplit) {
                this.currentSplit = true;
                const vals = this.getUserAnswers();
                this.renderSplitColumn();
                this.attachInputEvents();
                const questionRange = this.getQuestionRange();
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const el = document.getElementById(`q${i}`);
                    if (el) el.value = vals[i] || "";
                    // Không hiện badge ngay, chỉ tạo nhưng ẩn
                    this.addBadgeForQuestion(i);
                }
                // Ẩn tất cả badge, chỉ hiện eye-icon
                document.querySelectorAll('.correct-answer-badge').forEach(badge => badge.style.display = 'none');
            }
        } else {
            const explanationPanel = document.getElementById('explanationPanel');
            if (explanationPanel) explanationPanel.classList.remove('show');
        }
    }

    showExplanation(questionNum) {
        if (!this.explanationMode && !this.examSubmitted) return;

        if (this.currentTestData.type === 'split-layout') {
            if (!this.currentSplit) {
                this.currentSplit = true;
                const vals = this.getUserAnswers();
                this.renderSplitColumn();
                this.attachInputEvents();
                const questionRange = this.getQuestionRange();
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const el = document.getElementById(`q${i}`);
                    if (el) el.value = vals[i] || "";
                }
            }
            const rightCol = document.getElementById('rightCol');
            if (rightCol) rightCol.classList.add('show');
            const explanationDiv = document.getElementById('rightExplanationText');
            if (!explanationDiv) return;
            const customAnsDisplay = this.currentTestData.displayAnswers[`q${questionNum}`] || this.currentTestData.displayAnswers[questionNum];
            let html = this.currentTestData.detailedExplanations[`q${questionNum}`] ||
                this.currentTestData.detailedExplanations[questionNum] ||
                `<strong>Đáp án: ${customAnsDisplay}</strong>`;
            if (this.examSubmitted) {
                const user = this.getUserAnswer(questionNum) || "(trống)";
                const correct = this.isAnswerCorrect(questionNum, user);
                html += `<div class="answer-feedback ${correct ? 'correct' : 'incorrect'}" style="margin-top:10px;padding:8px;background:${correct ? '#e8f5e8' : '#ffebee'};border-radius:5px;">`;
                html += `<strong>Đáp án của bạn:</strong> "${user}" ${user ? (correct ? '✓' : '✗') : ''}<br>`;
                if (!correct) html += `<strong>Đáp án đúng:</strong> ${customAnsDisplay}`;
                else html += `Chính xác!`;
                html += `</div>`;
            }
            explanationDiv.innerHTML = html;
            if (this.examSubmitted) this.addBadgeForQuestion(questionNum);
        } else {
            this.highlightManager.highlightAnswerInReading(questionNum, this.currentTestData.highlightMap);
            const explanationPanel = document.getElementById('explanationPanel');
            const explanationTitle = document.getElementById('explanationTitle');
            const explanationText = document.getElementById('explanationText');
            if (explanationPanel && explanationTitle && explanationText) {
                explanationPanel.classList.add('show');
                explanationTitle.textContent = `Giải thích câu ${questionNum}`;
                const customAnsDisplay = this.currentTestData.displayAnswers[`q${questionNum}`] || this.currentTestData.displayAnswers[questionNum];
                let html = this.currentTestData.detailedExplanations[`q${questionNum}`] ||
                    this.currentTestData.detailedExplanations[questionNum] ||
                    `<strong>Đáp án: ${customAnsDisplay}</strong><br>`;
                if (this.examSubmitted) {
                    const userAnswer = this.getUserAnswer(questionNum) || '(chưa trả lời)';
                    const isCorrect = this.isAnswerCorrect(questionNum, userAnswer);
                    html += `<div style="margin-top:10px;padding:10px; background:${isCorrect ? '#e8f5e8' : '#ffebee'}; border-radius:5px;">`;
                    html += `<strong>Đáp án của bạn:</strong> ${userAnswer}<br>`;
                    if (!isCorrect) html += `<strong>Đáp án đúng:</strong> ${customAnsDisplay}`;
                    else html += `<strong>✅ Chính xác!</strong>`;
                    html += `</div>`;
                }
                explanationText.innerHTML = html;
            }
        }
    }

    addBadgeForQuestion(qNum) {
        const input = document.getElementById(`q${qNum}`);
        if (!input) return;
        const wrapper = input.parentNode;
        let existing = wrapper.querySelector('.correct-answer-badge');
        if (existing) existing.remove();
        const badge = document.createElement('span');
        badge.className = 'correct-answer-badge';
        badge.textContent = this.currentTestData.displayAnswers[`q${qNum}`] || this.currentTestData.displayAnswers[qNum];
        if (this.explanationMode) badge.style.display = 'inline-block';
        wrapper.appendChild(badge);
    }

    closeExplanation() {
        const explanationPanel = document.getElementById('explanationPanel');
        if (explanationPanel) explanationPanel.classList.remove('show');
        this.highlightManager.clearAllHighlights();
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
            display: 'none',
            opacity: '0',
            visibility: 'hidden',
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '9999',
            transition: 'opacity 0.2s ease'
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
        if (!confirm('Bạn có chắc chắn muốn reset toàn bộ kết quả của phần này?')) return;

        const completedKey = this.getStorageKey(false);
        const draftKey = this.getStorageKey(true);
        localStorage.removeItem(completedKey);
        localStorage.removeItem(draftKey);
        if (clearHighlights) localStorage.removeItem(this.getHighlightStorageKey());
        // XÓA TRẠNG THÁI SUBMITTED
        this.storageManager.clearSubmittedState(this.currentTestData);

        const testInfo = this.storageManager.parseTestInfo(document.querySelector('.candidate')?.textContent || '');
        const book = this.currentTestData.book || testInfo.book || 1;
        const test = this.currentTestData.test || testInfo.test || 1;
        const part = this.currentTestData.part || testInfo.part || 1;

        this._isResetting = true;

        this.examSubmitted = false;
        this.explanationMode = false;
        this.currentSplit = false;

        const questionRange = this.getQuestionRange();

        if (this.currentTestData.type === 'split-layout') {
            this.renderSingleColumn();
            this.attachInputEvents();
        } else {
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                if (this.currentTestData.type === 'multiple-choice' || this.currentTestData.type === 'inline-radio') {
                    const radios = document.getElementsByName(`q${i}`);
                    radios.forEach(radio => { radio.checked = false; radio.disabled = false; });
                    if (this.currentTestData.type === 'inline-radio') this.updateInlineSlotFromRadio(i);
                } else if (this.currentTestData.type === 'drag-drop') {
                    this.clearSlot(i);
                    const reading = document.getElementById(`readingSlot${i}`);
                    const panel = document.getElementById(`panelSlot${i}`);
                    [reading, panel].forEach(slot => {
                        if (slot) slot.classList.remove('correct', 'incorrect');
                        const b = slot && slot.querySelector('.correct-answer-badge');
                        if (b) b.remove();
                    });
                    this.slotState = {};
                } else if (this.currentTestData.type === 'matching') {
                    const input = document.getElementById(`answer-${i}`);
                    if (input) {
                        input.value = '';
                        input.disabled = false;
                        input.classList.remove('correct', 'incorrect');
                        const badge = input.parentNode?.querySelector('.correct-answer-badge');
                        if (badge) badge.remove();
                    }
                }

                const questionDiv = document.getElementById(`question-${i}`);
                if (questionDiv) {
                    questionDiv.classList.remove('correct', 'incorrect');
                    const badge = questionDiv.querySelector('.correct-answer-badge');
                    if (badge) badge.remove();
                }
            }
        }

        if (this.currentTestData.type === 'drag-drop') {
            document.querySelectorAll('.sentence-item').forEach(el => {
                el.classList.remove('hidden');
                el.setAttribute('draggable', 'true');
                el.style.cursor = 'grab';
            });
        }

        document.querySelectorAll('.eye-icon').forEach(icon => icon.style.display = 'none');

        if (clearHighlights) this.highlightManager.clearAllHighlights();

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Nộp bài'; }
        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) { explainBtn.disabled = true; explainBtn.textContent = 'Xem đáp án'; }
        const explanationPanel = document.getElementById('explanationPanel');
        if (explanationPanel) explanationPanel.classList.remove('show');

        window.dispatchEvent(new StorageEvent('storage', { key: completedKey }));
        window.dispatchEvent(new StorageEvent('storage', { key: draftKey }));

        try {
            const channel = new BroadcastChannel('ket_reset_channel');
            channel.postMessage({ action: 'reset', type: 'reading', book, test, part });
            channel.close();
        } catch (e) { }

        setTimeout(() => {
            this._isResetting = false;
        }, 100);

        this.updateAnswerCount();
        this.saveDraftImmediate();
    }

    disableInputs() {
        if (this.currentTestData.type === 'multiple-choice' || this.currentTestData.type === 'inline-radio') {
            document.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = true);
        } else if (this.currentTestData.type === 'drag-drop') {
            document.querySelectorAll('.sentence-item').forEach(el => {
                el.setAttribute('draggable', 'false');
                el.style.cursor = 'default';
            });
        } else if (this.currentTestData.type === 'matching' || this.currentTestData.type === 'matching-dropdown') {
            document.querySelectorAll('input[type="text"].answer-input, select.answer-select').forEach(input => input.disabled = true);
        }
    }

    getUserAnswers() {
        const answers = {};
        const questionRange = this.getQuestionRange();
        for (let i = questionRange.start; i <= questionRange.end; i++) answers[i] = this.getUserAnswer(i);
        return answers;
    }

    restoreSubmittedState(submittedState) {
        console.log('[Restore] Restoring submitted state with answers:', submittedState.answers);

        // Khôi phục câu trả lời
        const questionRange = this.getQuestionRange();

        if (this.currentTestData.type === 'split-layout') {
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                const inp = document.getElementById(`q${i}`);
                if (inp && submittedState.answers[i]) {
                    inp.value = submittedState.answers[i];
                }
            }
        } else if (this.currentTestData.type === 'multiple-choice' || this.currentTestData.type === 'inline-radio') {
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                const answer = submittedState.answers[i];
                if (answer) {
                    const radios = document.getElementsByName(`q${i}`);
                    radios.forEach(radio => {
                        if (radio.value === answer) {
                            radio.checked = true;
                        }
                    });
                    if (this.currentTestData.type === 'inline-radio') {
                        this.updateInlineSlotFromRadio(i);
                    }
                }
            }
        } else if (this.currentTestData.type === 'matching') {
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                const input = document.getElementById(`answer-${i}`);
                if (input && submittedState.answers[i]) {
                    input.value = submittedState.answers[i];
                }
            }
        } else if (this.currentTestData.type === 'drag-drop') {
            if (submittedState.answers.slotState) {
                this.slotState = { ...submittedState.answers.slotState };
                Object.keys(this.slotState).forEach(slotNum => {
                    const sentence = this.slotState[slotNum];
                    if (sentence) {
                        const readingSlot = document.getElementById(`readingSlot${slotNum}`);
                        const panelSlot = document.getElementById(`panelSlot${slotNum}`);
                        if (readingSlot) readingSlot.textContent = sentence;
                        if (panelSlot) panelSlot.textContent = sentence;

                        // Ẩn câu đã dùng
                        document.querySelectorAll('.sentence-item').forEach(item => {
                            if (item.textContent.trim() === sentence.trim()) {
                                item.classList.add('hidden');
                            }
                        });
                    }
                });
            }
        }

        // Gọi submitExam để hiển thị trạng thái đã nộp
        this.submitExam();

        console.log('[Restore] Submitted state restored successfully');
    }
}

class ReadingHighlightManager {
    constructor() {
        this.selectedRange = null;
        this.setupContextMenu();
    }

    setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            const highlightArea = e.target.closest('.reading-content, .single-col, .left-col, .reading-card, .reading-passage, .questions-panel, #questionsContainer, .question-item, .questions-list');
            if (!highlightArea) return;
            const selection = window.getSelection();
            if (!selection || selection.toString().trim() === '' || selection.rangeCount === 0) return;
            e.preventDefault();
            this.selectedRange = selection.getRangeAt(0);
            this.showContextMenu(e.pageX, e.pageY);
        });

        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) {
            contextMenu.addEventListener('mousedown', (e) => e.preventDefault());
        }

        document.addEventListener('click', (e) => {
            const contextMenu = document.getElementById('contextMenu');
            if (contextMenu && !contextMenu.contains(e.target)) this.hideContextMenu();
        });
    }

    showContextMenu(x, y) {
        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) {
            contextMenu.style.left = x + 'px';
            contextMenu.style.top = y + 'px';
            contextMenu.style.display = 'block';
        }
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) contextMenu.style.display = 'none';
    }

    highlightAnswerInReading(questionNum, referenceMap) {
        this.clearAllHighlights();
        if (!referenceMap) return;
        const info = referenceMap[`q${questionNum}`] || referenceMap[questionNum];
        if (!info) return;
        let card;
        if (info.cardId) card = document.querySelector(`.reading-card[data-text-id="${info.cardId}"]`);
        else if (info.reviewId) card = document.querySelector(`.reading-card[data-review-id="${info.reviewId}"]`);
        if (!card) return;

        const qItem = document.getElementById(`question-${questionNum}`);
        if (qItem) qItem.classList.add('highlight-question');

        let firstSpan = null;
        const keywords = info.keywords || [];
        keywords.forEach(keyword => {
            const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                const idx = node.textContent.toLowerCase().indexOf(keyword.toLowerCase());
                if (idx !== -1) {
                    const range = document.createRange();
                    range.setStart(node, idx);
                    range.setEnd(node, idx + keyword.length);
                    const span = document.createElement('span');
                    span.className = 'dynamic-highlight';
                    try {
                        range.surroundContents(span);
                        if (!firstSpan) firstSpan = span;
                    } catch (e) { }
                    break;
                }
            }
        });
        if (firstSpan) firstSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    clearAllHighlights() {
        document.querySelectorAll('.dynamic-highlight').forEach(el => {
            const parent = el.parentNode;
            if (parent) {
                while (el.firstChild) parent.insertBefore(el.firstChild, el);
                parent.removeChild(el);
            }
        });
        document.querySelectorAll('.question-item.highlight-question').forEach(el => el.classList.remove('highlight-question'));

        const manualHighlights = document.querySelectorAll('.highlight-yellow, .highlight-green, .highlight-pink');
        manualHighlights.forEach(span => {
            const parent = span.parentNode;
            if (parent) {
                while (span.firstChild) parent.insertBefore(span.firstChild, span);
                parent.removeChild(span);
            }
        });
    }

    applyHighlight(color) {
        if (!this.selectedRange) { this.hideContextMenu(); return; }
        try {
            const range = this.selectedRange.cloneRange();
            this.removeExistingHighlightsInRange(range);
            const isSimple = this.isSimpleRange(range);
            if (isSimple) this.applyHighlightSimple(range, color);
            else this.applyHighlightComplex(range, color);
        } catch (e) { }
        window.getSelection().removeAllRanges();
        this.hideContextMenu();
        this.selectedRange = null;
        if (window.readingCore) window.readingCore.saveHighlightDraft();
    }

    applyHighlightSimple(range, color) {
        try {
            const span = document.createElement('span');
            span.className = `highlight-${color}`;
            if (window.readingCore && !window.readingCore.personalHighlightsVisible) span.classList.add('highlight-hidden');
            range.surroundContents(span);
        } catch (e) {
            const fragment = range.extractContents();
            const span = document.createElement('span');
            span.className = `highlight-${color}`;
            if (window.readingCore && !window.readingCore.personalHighlightsVisible) span.classList.add('highlight-hidden');
            span.appendChild(fragment);
            range.insertNode(span);
        }
    }

    applyHighlightComplex(range, color) {
        const textNodes = this.getTextNodesInRange(range);
        textNodes.forEach(textNode => {
            const startOffset = (range.startContainer === textNode) ? range.startOffset : 0;
            const endOffset = (range.endContainer === textNode) ? range.endOffset : textNode.length;
            if (startOffset === endOffset) return;
            const subRange = document.createRange();
            subRange.setStart(textNode, startOffset);
            subRange.setEnd(textNode, endOffset);
            try {
                const span = document.createElement('span');
                span.className = `highlight-${color}`;
                if (window.readingCore && !window.readingCore.personalHighlightsVisible) span.classList.add('highlight-hidden');
                subRange.surroundContents(span);
            } catch (e) {
                const fragment = subRange.extractContents();
                const span = document.createElement('span');
                span.className = `highlight-${color}`;
                if (window.readingCore && !window.readingCore.personalHighlightsVisible) span.classList.add('highlight-hidden');
                span.appendChild(fragment);
                subRange.insertNode(span);
            }
        });
    }

    getTextNodesInRange(range) {
        const textNodes = [];
        const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        });
        let node;
        while (node = walker.nextNode()) textNodes.push(node);
        return textNodes;
    }

    isSimpleRange(range) {
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;
        if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) return true;
        if (startContainer.parentNode === endContainer.parentNode) {
            const textNodes = this.getTextNodesInRange(range);
            return textNodes.length <= 1;
        }
        return false;
    }

    removeExistingHighlightsInRange(range) {
        try {
            const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_ELEMENT, {
                acceptNode: (node) => {
                    if (node.classList && (node.classList.contains('highlight-yellow') || node.classList.contains('highlight-green') || node.classList.contains('highlight-pink')))
                        return NodeFilter.FILTER_ACCEPT;
                    return NodeFilter.FILTER_SKIP;
                }
            });
            const toUnwrap = [];
            let node;
            while (node = walker.nextNode()) if (range.intersectsNode(node)) toUnwrap.push(node);
            toUnwrap.forEach(span => {
                const parent = span.parentNode;
                while (span.firstChild) parent.insertBefore(span.firstChild, span);
                parent.removeChild(span);
            });
        } catch (e) { }
    }

    removeHighlight() {
        if (!this.selectedRange) { this.hideContextMenu(); return; }
        try {
            const range = this.selectedRange.cloneRange();
            const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_ELEMENT, {
                acceptNode: (node) => {
                    if (node.classList && (node.classList.contains('highlight-yellow') || node.classList.contains('highlight-green') || node.classList.contains('highlight-pink')))
                        return NodeFilter.FILTER_ACCEPT;
                    return NodeFilter.FILTER_SKIP;
                }
            });
            const toRemove = [];
            let node;
            while (node = walker.nextNode()) if (range.intersectsNode(node)) toRemove.push(node);
            toRemove.forEach(span => {
                const parent = span.parentNode;
                while (span.firstChild) parent.insertBefore(span.firstChild, span);
                parent.removeChild(span);
            });
        } catch (e) { }
        window.getSelection().removeAllRanges();
        this.hideContextMenu();
        this.selectedRange = null;
        if (window.readingCore) window.readingCore.saveHighlightDraft();
    }
}

class ReadingStorageManager {
    saveResults(testData, userAnswers) {
        const details = [];
        let correctCount = 0;
        const questions = testData.questions || Object.keys(testData.answerKey).map(k => ({ num: parseInt(k.replace('q', '')) })).filter(q => !isNaN(q.num));
        const questionRangeStart = Math.min(...questions.map(q => q.num));
        const questionRangeEnd = Math.max(...questions.map(q => q.num));

        for (let i = questionRangeStart; i <= questionRangeEnd; i++) {
            const userAnswer = userAnswers[i];
            const answerKeyRaw = testData.answerKey[`q${i}`] || testData.answerKey[i];
            let isCorrect = false;
            if (userAnswer) {
                if (Array.isArray(answerKeyRaw)) isCorrect = answerKeyRaw.some(correct => userAnswer.toLowerCase() === correct.toLowerCase());
                else if (typeof answerKeyRaw === 'string') isCorrect = userAnswer.toLowerCase() === answerKeyRaw.toLowerCase();
            }
            if (isCorrect) correctCount++;
            const correctAnswerString = testData.displayAnswers[`q${i}`] || testData.displayAnswers[i] || answerKeyRaw;
            details.push({ question: i, user: userAnswer || '(trống)', correct: correctAnswerString, isCorrect });
        }

        const partId = testData.part || this.parseTestInfo(document.title).part;
        const partData = { partId, name: `Part ${partId}`, totalQuestions: details.length, correctCount, details };
        const { book, test, part } = testData.metadata || this.parseTestInfo(document.querySelector('.candidate')?.textContent || document.title);
        const resolvedPart = testData.part || part;
        const key = `ket_reading_book${book}_test${test}_part${resolvedPart}`;
        localStorage.setItem(key, JSON.stringify(partData));
    }

    parseTestInfo(title) {
        let book = 1, test = 1, part = 1;
        const bookMatch = title.match(/KET\s*(\d+)/i) || title.match(/A2\s*Key\s*(\d+)/i) || title.match(/Key\s+(\d+)/i);
        if (bookMatch) book = parseInt(bookMatch[1]);
        const testMatch = title.match(/Test\s+(\d+)/i);
        if (testMatch) test = parseInt(testMatch[1]);
        const partMatch = title.match(/Part\s+(\d+)/i);
        if (partMatch) part = parseInt(partMatch[1]);
        return { book, test, part };
    }

    saveSubmittedState(testData, userAnswers) {
        const { book, test, part } = testData.metadata || this.parseTestInfo(document.querySelector('.candidate')?.textContent || document.title);
        const resolvedPart = testData.part || part;
        const key = `ket_reading_book${book}_test${test}_part${resolvedPart}_submitted`;
        const submittedData = {
            timestamp: Date.now(),
            answers: userAnswers,
            submitted: true
        };
        localStorage.setItem(key, JSON.stringify(submittedData));
        console.log('[Storage] Saved submitted state:', key);
    }

    loadSubmittedState(testData) {
        const { book, test, part } = testData.metadata || this.parseTestInfo(document.querySelector('.candidate')?.textContent || document.title);
        const resolvedPart = testData.part || part;
        const key = `ket_reading_book${book}_test${test}_part${resolvedPart}_submitted`;
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                console.log('[Storage] Loaded submitted state:', key);
                return data;
            } catch (e) {
                console.error('[Storage] Error parsing submitted state:', e);
            }
        }
        return null;
    }

    clearSubmittedState(testData) {
        const { book, test, part } = testData.metadata || this.parseTestInfo(document.querySelector('.candidate')?.textContent || document.title);
        const resolvedPart = testData.part || part;
        const key = `ket_reading_book${book}_test${test}_part${resolvedPart}_submitted`;
        localStorage.removeItem(key);
        console.log('[Storage] Cleared submitted state:', key);
    }
}

class ReadingUIManager {
    setupFontControls() {
        const fontButtons = { fontSmall: 'small', fontMedium: 'medium', fontLarge: 'large' };
        Object.entries(fontButtons).forEach(([id, size]) => {
            const button = document.getElementById(id);
            if (button) button.addEventListener('click', () => this.setFontSize(size));
        });
    }

    setFontSize(size) {
        document.querySelectorAll('.font-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`font${size.charAt(0).toUpperCase() + size.slice(1)}`);
        if (activeBtn) activeBtn.classList.add('active');
        document.querySelectorAll('.reading-content, .questions-list, #testWrapper').forEach(el => {
            el.classList.remove('font-small', 'font-medium', 'font-large');
            el.classList.add(`font-${size}`);
        });
    }

    injectHeaderControls(coreInstance) {
        const header = document.querySelector('.ielts-header');
        if (!header) return;

        const candidateEl = header.querySelector('.candidate');
        if (candidateEl && coreInstance.currentTestData) {
            let title = coreInstance.currentTestData.title;
            if (!title) {
                const { part } = coreInstance.currentTestData;
                const meta = coreInstance.storageManager?.parseTestInfo(document.title || '') || { book: 1, test: 1 };
                title = `A2 Key ${meta.book} · Test ${meta.test} · Part ${part}`;
            }
            candidateEl.textContent = title;
        }

        if (!header.querySelector('.font-controls')) {
            const fontControls = document.createElement('div');
            fontControls.className = 'font-controls';
            fontControls.innerHTML = `
                <button class="font-btn" id="fontSmall">A-</button>
                <button class="font-btn" id="fontMedium">A</button>
                <button class="font-btn active" id="fontLarge">A+</button>
            `;
            const innerBrand = header.querySelector('.brand');
            if (innerBrand) innerBrand.appendChild(fontControls);
            else header.appendChild(fontControls);
        }

        if (!document.getElementById('themeToggle')) {
            const themeBtn = document.createElement('button');
            themeBtn.className = 'theme-toggle-btn';
            themeBtn.id = 'themeToggle';
            themeBtn.title = 'Chuyển đổi Dark/Light mode';
            themeBtn.innerHTML = `<span class="icon-moon">🌙</span><span class="icon-sun">☀️</span>`;
            const innerBrand = header.querySelector('.brand');
            if (innerBrand) innerBrand.appendChild(themeBtn);
            else header.appendChild(themeBtn);
        }

        const savedTheme = localStorage.getItem('pet-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;
        const testWrapper = document.getElementById('testWrapper');
        const savedTheme = localStorage.getItem('pet-theme');
        if (savedTheme === 'dark' && testWrapper && !testWrapper.classList.contains('classic-mode')) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        themeToggle.addEventListener('click', () => {
            if (testWrapper && testWrapper.classList.contains('classic-mode')) return;
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('pet-theme', newTheme);
        });
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
        const testWrapper = document.getElementById('testWrapper');
        const html = document.documentElement;
        const storageKey = 'pet-mode';
        if (!modeToggle || !styleLink || !testWrapper) return;

        const setMode = (isClassic) => {
            if (isClassic) {
                styleLink.href = 'reading-pet-common1.css';
                testWrapper.classList.add('classic-mode');
                html.removeAttribute('data-theme');
            } else {
                styleLink.href = 'reading-pet-common.css';
                testWrapper.classList.remove('classic-mode');
                const savedTheme = localStorage.getItem('pet-theme');
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
        const readingPanel = document.getElementById('readingPanel');
        const questionsPanel = document.getElementById('questionsPanel');
        const resizer = document.getElementById('resizer');
        if (!readingPanel || !questionsPanel || !resizer) return;
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
            readingPanel.style.width = leftWidth + 'px';
            questionsPanel.style.width = (rect.width - leftWidth - 8) + 'px';
        });
        document.addEventListener('mouseup', () => { isResizing = false; document.body.style.cursor = 'default'; });
    }

    setupExplanationPanel() {
        const explanationPanel = document.getElementById('explanationPanel');
        const explanationResizer = document.getElementById('explanationResizer');
        if (!explanationPanel || !explanationResizer) return;
        let isResizing = false, startY, startHeight;
        explanationResizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = explanationPanel.offsetHeight;
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const dy = startY - e.clientY;
            const newHeight = startHeight + dy;
            if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
                explanationPanel.style.height = newHeight + 'px';
                explanationPanel.style.maxHeight = newHeight + 'px';
            }
        });
        document.addEventListener('mouseup', () => { isResizing = false; document.body.style.cursor = 'default'; document.body.style.userSelect = 'auto'; });
    }

    setupAutoCollapse(coreInstance) {
        const header = document.querySelector('.ielts-header');
        const footer = document.querySelector('.bottom-bar');
        const questionNav = document.querySelector('.question-nav');
        if (!header && !footer) return;
        this.addAutoCollapseToggle(header, coreInstance);

        let headerTimer = null, footerTimer = null;
        const COLLAPSE_DELAY = 5000;
        const isAutoCollapseEnabled = () => localStorage.getItem('ket-autocollapse-enabled') !== 'false';

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
        const isEnabled = localStorage.getItem('ket-autocollapse-enabled') !== 'false';
        toggleBtn.innerHTML = isEnabled ? iconShrink : iconExpand;
        toggleBtn.classList.toggle('active', isEnabled);
        toggleBtn.addEventListener('click', () => {
            const currentlyEnabled = localStorage.getItem('ket-autocollapse-enabled') !== 'false';
            const newEnabled = !currentlyEnabled;
            localStorage.setItem('ket-autocollapse-enabled', newEnabled.toString());
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

    injectStorageIndicator() {
        const bottomBar = document.querySelector('.bottom-bar');
        const resetBtn = document.getElementById('resetBtn');
        if (!bottomBar || !resetBtn || document.getElementById('storageIndicator')) return;

        const indicator = document.createElement('div');
        indicator.id = 'storageIndicator';
        indicator.className = 'storage-indicator';
        indicator.style.cssText = 'display: inline-flex; align-items: center; margin-left: 10px; font-size: 13px; font-weight: 600; border-radius: 6px; padding: 5px 10px; cursor: help; transition: all 0.3s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.05);';

        resetBtn.parentNode.insertBefore(indicator, resetBtn.nextSibling);

        // Đăng ký hàm dọn dẹp toàn cục (cross-module: pet & ket, reading & listening)
        window.__petKetCleanStorage = () => {
            const prefixes = ['pet_reading_book', 'pet_listening_book', 'ket_reading_book', 'ket_listening_book'];
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && prefixes.some(p => key.startsWith(p)) && (key.endsWith('_draft') || key.endsWith('_highlights'))) {
                    keys.push(key);
                }
            }
            keys.sort();
            // Giữ lại 10 mục mới nhất, xóa phần còn lại
            const toRemove = keys.length > 10 ? keys.slice(0, keys.length - 10) : [];
            toRemove.forEach(k => {
                localStorage.removeItem(k);
                console.log('[Auto-Clean] Removed:', k);
            });
            console.log(`[Auto-Clean] Cleaned ${toRemove.length} item(s). Kept ${Math.min(keys.length, 10)} recent draft(s).`);
            return toRemove.length;
        };

        this.updateStorageIndicator();
        setInterval(() => this.updateStorageIndicator(), 5000);
        window.addEventListener('storage', () => this.updateStorageIndicator());
    }

    updateStorageIndicator() {
        const indicator = document.getElementById('storageIndicator');
        if (!indicator) return;

        let total = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                total += (localStorage.getItem(key).length + key.length) * 2;
            }
        } catch(e) {}

        const limit = 5 * 1024 * 1024;
        const usedPercentage = (total / limit) * 100;
        const remainingMB = Math.max(0, (limit - total) / (1024 * 1024)).toFixed(2);

        let color = '#2e8b57';
        let bgColor = '#e8f5e8';

        if (usedPercentage > 90) {
            color = '#c00';
            bgColor = '#ffebee';
        } else if (usedPercentage > 70) {
            color = '#b08d00';
            bgColor = '#fff3a1';
        }

        indicator.style.color = color;
        indicator.style.backgroundColor = bgColor;
        indicator.title = `Đã dùng: ${usedPercentage.toFixed(1)}%`;
        indicator.innerHTML = `💾 Trống: ${remainingMB}MB`;

        let warningEl = document.getElementById('storageWarningMsg');
        if (usedPercentage > 90) {
            if (!warningEl) {
                warningEl = document.createElement('div');
                warningEl.id = 'storageWarningMsg';
                warningEl.style.cssText = 'position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #b71c1c; color: white; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.45); z-index: 10000; font-family: sans-serif; font-size: 14px; text-align: center; border: 2px solid #ff5252; animation: storageSlideUp 0.4s ease; min-width: 340px;';
                warningEl.innerHTML = `
                    <div style="margin-bottom: 12px; font-weight: bold; font-size: 15px;">⚠️ Bộ nhớ trình duyệt sắp đầy!<br><span style="font-weight:normal;font-size:13px;">Draft và highlight cũ sẽ bị mất nếu không dọn dẹp.</span></div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="storageAutoCleanBtn" style="background: #fff176; border: none; color: #5d4037; padding: 7px 18px; cursor: pointer; border-radius: 5px; font-weight: bold; font-size: 13px;">🧹 Tự dọn dẹp</button>
                        <button onclick="document.getElementById('storageWarningMsg')?.remove()" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.5); color: white; padding: 7px 18px; cursor: pointer; border-radius: 5px; font-size: 13px;">Đã hiểu</button>
                    </div>
                `;
                document.body.appendChild(warningEl);

                // Gắn sự kiện nút Tự dọn dẹp
                const cleanBtn = document.getElementById('storageAutoCleanBtn');
                if (cleanBtn) {
                    cleanBtn.addEventListener('click', () => {
                        const removed = window.__petKetCleanStorage?.() ?? 0;
                        document.getElementById('storageWarningMsg')?.remove();
                        this.updateStorageIndicator();
                        // Toast xác nhận
                        const toast = document.createElement('div');
                        toast.style.cssText = 'position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #1b5e20; color: white; padding: 10px 22px; border-radius: 8px; z-index: 10000; font-family: sans-serif; font-size: 14px; box-shadow: 0 3px 12px rgba(0,0,0,0.3); animation: storageSlideUp 0.4s ease;';
                        toast.textContent = removed > 0
                            ? `✅ Đã dọn ${removed} file cũ. Bộ nhớ được giải phóng!`
                            : `ℹ️ Không có file cũ nào cần dọn.`;
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 3500);
                    });
                }

                if (!document.getElementById('storageWarningStyles')) {
                    const style = document.createElement('style');
                    style.id = 'storageWarningStyles';
                    style.innerHTML = `@keyframes storageSlideUp { from { bottom: 50px; opacity: 0; } to { bottom: 80px; opacity: 1; } } #storageWarningMsg button:hover { opacity: 0.85; }`;
                    document.head.appendChild(style);
                }
            }
        } else {
            if (warningEl) warningEl.remove();
        }
    }
}

window.applyHighlight = function (color) {
    if (window.readingCore && window.readingCore.highlightManager) {
        window.readingCore.highlightManager.applyHighlight(color);
    }
};
window.removeHighlight = function () {
    if (window.readingCore && window.readingCore.highlightManager) {
        window.readingCore.highlightManager.removeHighlight();
    }
};

window.ReadingCore = ReadingCore;
window.ReadingHighlightManager = ReadingHighlightManager;
window.ReadingStorageManager = ReadingStorageManager;
window.ReadingUIManager = ReadingUIManager;