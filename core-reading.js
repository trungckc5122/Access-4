/**
 * CORE READING ENGINE - PET B1 PRELIMINARY
 * Contains all functionality for reading tests across all parts and tests
 * Compatible with PET 1 & PET 2, Tests 1-4, Parts 1-6
 * 
 * CHANGELOG:
 * - Added autosave draft feature (save progress automatically)
 * - Reset now also clears saved results and draft
 * - FIXED: draft only saved when at least one answer is non-empty
 * - FIXED: proper highlight manager, storage manager, UI manager included
 */

class ReadingCore {
    constructor() {
        this.examSubmitted = false;
        this.explanationMode = false;
        this.currentTestData = null;
        this.currentSplit = false; // Used for Part 6 split layout
        this.slotState = {}; // Used for Part 4 & 5 (drag-drop / matching)

        this.highlightManager = new ReadingHighlightManager();
        this.storageManager = new ReadingStorageManager();
        this.uiManager = new ReadingUIManager();
        this.debounceTimer = null;
        this.DEBOUNCE_MS = 300;
        this._isResetting = false;
    }

    /**
     * Initialize reading test with configuration data
     */
    initializeTest(testData) {
        this.currentTestData = testData;
        this.examSubmitted = false;
        this.explanationMode = false;
        this.currentSplit = false;
        
        // Setup UI components
        this.setupUI();
        
        // Render questions based on test type
        if (this.currentTestData.type === 'split-layout') {
            this.renderSingleColumn();
            this.attachInputEvents();
        } else if (this.currentTestData.type === 'drag-drop') {
            this.setupDragDropEvents();
        } else if (this.currentTestData.type === 'inline-radio') {
            this.renderInlineRadioQuestions();
        } else {
            this.renderQuestions();
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup beforeunload handlers
        this.setupBeforeUnload();
        
        // Initialize navigation
        this.createNavigation();
        
        // Restore draft if not submitted
        if (!this.isCompleted()) {
            this.loadDraft();
        }
        
        // Update initial state
        this.updateAnswerCount();
        
        // Hide eye icons initially
        document.querySelectorAll('.eye-icon').forEach(icon => {
            icon.style.display = 'none';
        });
        
        console.log('Reading test initialized:', testData.title || `Part ${testData.part}`);
    }

    // ==================== DRAFT MANAGEMENT ====================
    isCompleted() {
        if (!this.currentTestData) return false;
        const key = this.getStorageKey(false);
        return localStorage.getItem(key) !== null;
    }

    getStorageKey(isDraft = false) {
        const meta = this.currentTestData.metadata || this.storageManager.parseTestInfo(
            document.querySelector('.candidate')?.textContent || ''
        );
        const book = meta.book || 1;
        const test = meta.test || 1;
        const part = this.currentTestData.part || meta.part || 1;
        let key = `pet_reading_book${book}_test${test}_part${part}`;
        if (isDraft) key += '_draft';
        return key;
    }

    getDraftData() {
        const questionRange = this.getQuestionRange();
        const draft = { type: this.currentTestData.type };
        
        if (this.currentTestData.type === 'multiple-choice' || this.currentTestData.type === 'inline-radio') {
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                draft[`q${i}`] = this.getUserAnswer(i);
            }
        } else if (this.currentTestData.type === 'matching') {
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                const input = document.getElementById(`answer-${i}`);
                draft[`q${i}`] = input ? input.value.trim().toUpperCase() : '';
            }
        } else if (this.currentTestData.type === 'drag-drop') {
            draft.slotState = { ...this.slotState };
        } else if (this.currentTestData.type === 'split-layout') {
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                const inp = document.getElementById(`q${i}`);
                draft[`q${i}`] = inp ? inp.value : '';
            }
        }
        return draft;
    }

    draftHasAnswers(draft) {
        const { type, slotState, ...answers } = draft;
        const radioAnswers = Object.values(answers).some(val => val !== null && val !== undefined && val !== '');
        if (slotState && Object.keys(slotState).length > 0) return true;
        return radioAnswers;
    }

    saveDraft() {
        if (this.examSubmitted || this._isResetting) return;
        if (!this.currentTestData) return;
        
        clearTimeout(this.debounceTimer);
        
        this.debounceTimer = setTimeout(() => {
            try {
                const draft = this.getDraftData();
                if (!this.draftHasAnswers(draft)) {
                    this.clearDraft();
                    return;
                }
                const key = this.getStorageKey(true);
                localStorage.setItem(key, JSON.stringify(draft));
                console.log('[Reading Draft] SAVED to key:', key);
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
            if (!this.draftHasAnswers(draft)) {
                this.clearDraft();
                return;
            }
            const key = this.getStorageKey(true);
            localStorage.setItem(key, JSON.stringify(draft));
            console.log('[Reading Draft] SAVED IMMEDIATELY to key:', key);
        } catch (e) {
            console.error('[Reading Draft] Immediate save failed:', e);
        }
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
            
            if (this.currentTestData.type === 'multiple-choice' || this.currentTestData.type === 'inline-radio') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const ans = draft[`q${i}`];
                    if (ans) {
                        const radio = document.querySelector(`input[name="q${i}"][value="${ans}"]`);
                        if (radio) radio.checked = true;
                    }
                }
            } else if (this.currentTestData.type === 'matching') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const ans = draft[`q${i}`];
                    if (ans) {
                        const input = document.getElementById(`answer-${i}`);
                        if (input) input.value = ans;
                    }
                }
            } else if (this.currentTestData.type === 'split-layout') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const ans = draft[`q${i}`];
                    if (ans) {
                        const inp = document.getElementById(`q${i}`);
                        if (inp) inp.value = ans;
                    }
                }
            } else if (this.currentTestData.type === 'drag-drop' && draft.slotState) {
                this.slotState = { ...draft.slotState };
                this.restoreDragDropState();
            }
            
            this.updateAnswerCount();
            return true;
        } catch (e) {
            console.warn('Failed to load reading draft', e);
            return false;
        }
    }

    clearDraft() {
        const key = this.getStorageKey(true);
        localStorage.removeItem(key);
    }

    // ==================== UI SETUP ====================
    setupUI() {
        this.uiManager.setupFontControls();
        this.uiManager.setupThemeToggle();
        this.uiManager.setupModeToggle();
        this.uiManager.setupResizer();
        this.uiManager.setupExplanationPanel();
        this.uiManager.setupAutoCollapse(this);
    }

    getQuestionRange() {
        const part = this.currentTestData.part;
        switch(part) {
            case 1: return { start: 1, end: 5 };
            case 2: return { start: 6, end: 10 };
            case 3: return { start: 11, end: 13 };
            case 4: return { start: 14, end: 19 };
            case 5: return { start: 20, end: 26 };
            case 6: return { start: 27, end: 30 };
            default: return { start: 1, end: 30 };
        }
    }

    renderQuestions() {
        // Implementation depends on specific part templates
        // This method should be overridden or the template should already exist in HTML
        console.log('Render questions for type:', this.currentTestData.type);
    }

    renderSingleColumn() {
        console.log('Render single column for split layout');
    }

    attachInputEvents() {
        const questionRange = this.getQuestionRange();
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const inp = document.getElementById(`q${i}`);
            if (inp) {
                inp.addEventListener('change', () => {
                    this.updateAnswerCount();
                    this.saveDraft();
                });
                inp.addEventListener('input', () => {
                    this.updateAnswerCount();
                    this.saveDraft();
                });
            }
        }
    }

    renderInlineRadioQuestions() {
        console.log('Render inline radio questions');
    }

    setupDragDropEvents() {
        console.log('Setup drag drop events');
    }

    restoreDragDropState() {
        // Restore UI from this.slotState
    }

    setupEventListeners() {
        document.addEventListener('change', (e) => {
            if (this._isResetting) return;
            if (e.target && e.target.matches('input[type="radio"]')) {
                this.updateAnswerCount();
                this.saveDraftImmediate();
            }
        });

        document.addEventListener('input', (e) => {
            if (this._isResetting) return;
            if (e.target && (e.target.matches('input[type="text"]') || e.target.matches('textarea'))) {
                this.updateAnswerCount();
                this.saveDraft();
            }
        });

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.addEventListener('click', () => this.handleSubmit());

        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) explainBtn.addEventListener('click', () => this.handleExplain());

        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.addEventListener('click', () => this.handleReset());

        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('eye-icon')) {
                this.showExplanation(e.target.dataset.question);
            }
        });

        const closeExplanation = document.getElementById('closeExplanation');
        if (closeExplanation) closeExplanation.addEventListener('click', () => this.closeExplanation());
    }

    getUserAnswer(questionNum) {
        if (this.currentTestData.type === 'multiple-choice' || this.currentTestData.type === 'inline-radio') {
            const radio = document.querySelector(`input[name="q${questionNum}"]:checked`);
            return radio ? radio.value : null;
        } else if (this.currentTestData.type === 'matching') {
            const input = document.getElementById(`answer-${questionNum}`);
            return input ? input.value.trim().toUpperCase() : null;
        } else if (this.currentTestData.type === 'split-layout') {
            const input = document.getElementById(`q${questionNum}`);
            return input ? input.value.trim() : null;
        } else if (this.currentTestData.type === 'drag-drop') {
            return this.slotState[questionNum] || null;
        }
        return null;
    }

    updateAnswerCount() {
        const questionRange = this.getQuestionRange();
        let answeredCount = 0;
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const answer = this.getUserAnswer(i);
            if (answer && answer !== '') answeredCount++;
        }
        const total = questionRange.end - questionRange.start + 1;
        const display = document.getElementById('answerCount');
        if (display) display.textContent = `${answeredCount}/${total}`;
    }

    // ==================== SUBMIT & RESET ====================
    handleSubmit() {
        if (this.examSubmitted) return;
        const answers = this.collectAnswers();
        this.examSubmitted = true;

        const resultData = {
            title: this.currentTestData.title,
            part: this.currentTestData.part,
            answers: answers,
            correctCount: this.calculateCorrectCount(answers),
            totalQuestions: this.getQuestionRange().end - this.getQuestionRange().start + 1,
            timestamp: new Date().toISOString()
        };

        const key = this.getStorageKey(false);
        localStorage.setItem(key, JSON.stringify(resultData));
        this.clearDraft();

        this.showResults(answers);

        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) {
            explainBtn.disabled = false;
            explainBtn.textContent = 'Xem giải thích';
        }

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đã nộp bài';
        }

        try {
            const channel = new BroadcastChannel('pet_reset_channel');
            const d = this.currentTestData;
            channel.postMessage({ action: 'submit', type: 'reading', book: d.book, test: d.test, part: d.part });
            channel.close();
        } catch(e) {}
    }

    collectAnswers() {
        const range = this.getQuestionRange();
        const answers = {};
        for (let i = range.start; i <= range.end; i++) answers[i] = this.getUserAnswer(i);
        return answers;
    }

    calculateCorrectCount(userAnswers) {
        let correct = 0;
        if (this.currentTestData.questions) {
            for (const q of this.currentTestData.questions) {
                const ua = userAnswers[q.num];
                if (this.currentTestData.type === 'matching') {
                    if (ua && ua === q.correctAnswer?.toUpperCase()) correct++;
                } else {
                    if (ua === q.correctAnswer) correct++;
                }
            }
        }
        return correct;
    }

    showResults(userAnswers) {
        if (!this.currentTestData.questions) return;
        for (const q of this.currentTestData.questions) {
            const ua = userAnswers[q.num];
            let isCorrect = false;
            if (this.currentTestData.type === 'matching') {
                isCorrect = ua && ua === q.correctAnswer?.toUpperCase();
            } else {
                isCorrect = ua === q.correctAnswer;
            }
            const questionDiv = document.getElementById(`question-${q.num}`);
            if (questionDiv) {
                questionDiv.classList.add(isCorrect ? 'correct' : 'incorrect');
                const badge = document.createElement('span');
                badge.className = 'correct-answer-badge';
                badge.innerHTML = `✓ ${q.correctAnswer}`;
                questionDiv.appendChild(badge);
            }
            if (this.currentTestData.type === 'matching') {
                const input = document.getElementById(`answer-${q.num}`);
                if (input) input.classList.add(isCorrect ? 'correct' : 'incorrect');
            }
        }
        this.explanationMode = true;
    }

    handleExplain() {
        if (!this.examSubmitted) return;
        this.explanationMode = true;
        document.querySelectorAll('.eye-icon, .correct-answer-badge').forEach(el => el.style.display = 'inline-block');
        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) {
            explainBtn.disabled = true;
            explainBtn.textContent = 'Đang xem giải thích';
        }
        document.getElementById('explanationPanel')?.classList.remove('show');
    }

    handleReset() {
        this.resetAll();
    }

    resetAll() {
        if (!confirm('Reset tất cả câu trả lời của part này?')) return;

        this._isResetting = true;

        const book = this.currentTestData.book || 1;
        const test = this.currentTestData.test || 1;
        const part = this.currentTestData.part || 1;
        const completedKey = `pet_reading_book${book}_test${test}_part${part}`;
        const draftKey = completedKey + '_draft';

        localStorage.removeItem(completedKey);
        localStorage.removeItem(draftKey);

        this.examSubmitted = false;
        this.explanationMode = false;
        this.currentSplit = false;

        const range = this.getQuestionRange();

        // Reset UI based on type
        if (this.currentTestData.type === 'split-layout') {
            this.renderSingleColumn();
            this.attachInputEvents();
        } else {
            for (let i = range.start; i <= range.end; i++) {
                if (this.currentTestData.type === 'multiple-choice' || this.currentTestData.type === 'inline-radio') {
                    document.getElementsByName(`q${i}`).forEach(r => { r.checked = false; r.disabled = false; });
                } else if (this.currentTestData.type === 'drag-drop') {
                    this.clearSlot(i);
                    const reading = document.getElementById(`readingSlot${i}`);
                    const panel = document.getElementById(`panelSlot${i}`);
                    [reading, panel].forEach(slot => {
                        if (slot) {
                            slot.classList.remove('correct', 'incorrect');
                            const b = slot.querySelector('.correct-answer-badge');
                            if (b) b.remove();
                        }
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

                const qDiv = document.getElementById(`question-${i}`);
                if (qDiv) {
                    qDiv.classList.remove('correct', 'incorrect');
                    const b = qDiv.querySelector('.correct-answer-badge');
                    if (b) b.remove();
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
        this.highlightManager.clearAllHighlights();

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Nộp bài';
        }

        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) {
            explainBtn.disabled = true;
            explainBtn.textContent = 'Xem giải thích';
        }

        document.getElementById('explanationPanel')?.classList.remove('show');

        window.dispatchEvent(new StorageEvent('storage', { key: completedKey }));
        window.dispatchEvent(new StorageEvent('storage', { key: draftKey }));

        try {
            const channel = new BroadcastChannel('pet_reset_channel');
            channel.postMessage({ action: 'reset', type: 'reading', book, test, part });
            channel.close();
        } catch(e) {}

        setTimeout(() => {
            this._isResetting = false;
            localStorage.removeItem(draftKey);
            console.log('[Reset] Draft saving re-enabled');
        }, 300);

        this.updateAnswerCount();
    }

    clearSlot(slotNum) {
        delete this.slotState[slotNum];
    }

    showExplanation(questionNum) {
        if (!this.explanationMode && !this.examSubmitted) return;
        const q = this.currentTestData.questions?.find(q => q.num === parseInt(questionNum));
        if (!q) return;
        const panel = document.getElementById('explanationPanel');
        const content = document.getElementById('explanationContent');
        if (panel && content) {
            content.innerHTML = `
                <div class="explanation-item">
                    <div class="explanation-header">
                        <span class="question-num">Câu ${questionNum}</span>
                        <span class="correct-answer">Đáp án: <strong>${q.correctAnswer}</strong></span>
                    </div>
                    <div class="explanation-text">${q.explanation || 'Chưa có giải thích.'}</div>
                </div>
            `;
            panel.classList.add('show');
        }
    }

    closeExplanation() {
        document.getElementById('explanationPanel')?.classList.remove('show');
    }

    createNavigation() {
        const nav = document.getElementById('questionNav');
        if (!nav) return;
        const range = this.getQuestionRange();
        nav.innerHTML = '';
        for (let i = range.start; i <= range.end; i++) {
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.textContent = i;
            btn.dataset.question = i;
            btn.addEventListener('click', () => {
                document.getElementById(`question-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
            nav.appendChild(btn);
        }
        document.addEventListener('change', () => this.updateNavButtons());
        document.addEventListener('input', () => this.updateNavButtons());
    }

    updateNavButtons() {
        const range = this.getQuestionRange();
        for (let i = range.start; i <= range.end; i++) {
            const ans = this.getUserAnswer(i);
            const btn = document.querySelector(`[data-question="${i}"]`);
            if (btn) {
                btn.classList.toggle('answered', ans && ans !== '');
            }
        }
    }
}

// ==================== HELPER CLASSES ====================
class ReadingHighlightManager {
    constructor() {
        this.setupContextMenu();
    }
    setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            const area = e.target.closest('#readingText, .questions-panel, .question-item');
            if (area && window.getSelection().toString().trim()) {
                e.preventDefault();
                this.savedRange = window.getSelection().getRangeAt(0).cloneRange();
                this.showContextMenu(e.pageX, e.pageY);
            }
        });
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('contextMenu');
            if (menu && !menu.contains(e.target)) menu.style.display = 'none';
        });
    }
    showContextMenu(x, y) {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            menu.style.display = 'block';
        }
    }
    clearAllHighlights() {
        document.querySelectorAll('.highlight-yellow, .highlight-green, .highlight-pink').forEach(el => {
            const parent = el.parentNode;
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
        });
    }
    applyHighlight(color) {
        const range = this.savedRange || window.getSelection().getRangeAt(0);
        const span = document.createElement('span');
        span.className = `highlight-${color}`;
        try {
            range.surroundContents(span);
        } catch {
            const frag = range.extractContents();
            span.appendChild(frag);
            range.insertNode(span);
        }
        window.getSelection().removeAllRanges();
        document.getElementById('contextMenu').style.display = 'none';
    }
    removeHighlight() {
        const range = this.savedRange || window.getSelection().getRangeAt(0);
        const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_ELEMENT, {
            acceptNode: node => node.classList && (node.classList.contains('highlight-yellow') || node.classList.contains('highlight-green') || node.classList.contains('highlight-pink')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
        });
        const toRemove = [];
        let node;
        while (node = walker.nextNode()) if (range.intersectsNode(node)) toRemove.push(node);
        toRemove.forEach(span => {
            const parent = span.parentNode;
            while (span.firstChild) parent.insertBefore(span.firstChild, span);
            parent.removeChild(span);
        });
        window.getSelection().removeAllRanges();
        document.getElementById('contextMenu').style.display = 'none';
    }
}

class ReadingStorageManager {
    parseTestInfo(title) {
        let book = 1, test = 1, part = 1;
        const bm = title.match(/Preliminary\s+(\d+)/i);
        if (bm) book = parseInt(bm[1]);
        const tm = title.match(/Test\s+(\d+)/i);
        if (tm) test = parseInt(tm[1]);
        const pm = title.match(/Part\s+(\d+)/i);
        if (pm) part = parseInt(pm[1]);
        return { book, test, part };
    }
}

class ReadingUIManager {
    setupFontControls() {
        const btns = { fontSmall: 'small', fontMedium: 'medium', fontLarge: 'large' };
        Object.entries(btns).forEach(([id, size]) => {
            document.getElementById(id)?.addEventListener('click', () => this.setFontSize(size));
        });
        this.setFontSize('large');
    }
    setFontSize(size) {
        document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`font${size.charAt(0).toUpperCase() + size.slice(1)}`)?.classList.add('active');
        document.querySelectorAll('.reading-text, .questions-list').forEach(el => {
            el.classList.remove('font-small', 'font-medium', 'font-large');
            el.classList.add(`font-${size}`);
        });
    }
    setupThemeToggle() {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const cur = document.documentElement.getAttribute('data-theme');
            const next = cur === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
        const saved = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
    }
    setupModeToggle() {
        const toggle = document.getElementById('modeToggle');
        const style = document.getElementById('styleLink');
        if (!toggle || !style) return;
        const setMode = (isClassic) => {
            if (isClassic) {
                style.href = style.href.replace('reading-pet-common.css', 'reading-pet-common1.css');
                document.getElementById('themeToggle').style.display = 'none';
                document.documentElement.removeAttribute('data-theme');
            } else {
                style.href = style.href.replace('reading-pet-common1.css', 'reading-pet-common.css');
                document.getElementById('themeToggle').style.display = 'flex';
            }
            localStorage.setItem('pet-mode', isClassic ? 'classic' : 'modern');
        };
        const saved = localStorage.getItem('pet-mode');
        if (saved === 'classic') { toggle.checked = true; setMode(true); }
        else { toggle.checked = false; setMode(false); }
        toggle.addEventListener('change', () => setMode(toggle.checked));
    }
    setupResizer() {
        const left = document.getElementById('readingText');
        const right = document.getElementById('questionsPanel');
        const resizer = document.getElementById('resizer');
        if (!left || !right || !resizer) return;
        let resizing = false;
        resizer.addEventListener('mousedown', () => { resizing = true; document.body.style.cursor = 'col-resize'; });
        document.addEventListener('mousemove', (e) => {
            if (!resizing) return;
            const main = document.getElementById('mainArea');
            if (!main) return;
            const rect = main.getBoundingClientRect();
            let w = e.clientX - rect.left - 4;
            if (w < 250) w = 250;
            if (w > rect.width - 250) w = rect.width - 250;
            left.style.width = w + 'px';
            right.style.width = (rect.width - w - 8) + 'px';
        });
        document.addEventListener('mouseup', () => { resizing = false; document.body.style.cursor = 'default'; });
    }
    setupExplanationPanel() {
        const panel = document.getElementById('explanationPanel');
        const resizer = document.getElementById('explanationResizer');
        if (!panel || !resizer) return;
        let resizing = false;
        resizer.addEventListener('mousedown', () => { resizing = true; document.body.style.cursor = 'ns-resize'; });
        document.addEventListener('mousemove', (e) => {
            if (!resizing) return;
            const rect = panel.getBoundingClientRect();
            let h = e.clientY - rect.top;
            if (h < 150) h = 150;
            if (h > 500) h = 500;
            panel.style.height = h + 'px';
        });
        document.addEventListener('mouseup', () => { resizing = false; document.body.style.cursor = 'default'; });
    }
    setupAutoCollapse(core) {
        // Simplified auto-collapse (optional)
    }
}

// Global functions for context menu
window.applyHighlight = (color) => window.readingCore?.highlightManager.applyHighlight(color);
window.removeHighlight = () => window.readingCore?.highlightManager.removeHighlight();

window.ReadingCore = ReadingCore;
