/**
 * CORE READING ENGINE - PET B1 PRELIMINARY
 * Contains all functionality for reading tests across all parts and tests
 * Compatible with PET 1 & PET 2, Tests 1-4, Parts 1-6
 * 
 * CHANGELOG:
 * - Added autosave draft feature (save progress automatically)
 * - Reset now also clears saved results and draft
 * - FIXED: matching support in markAnswers, reset badge
 * - FIXED: highlight manager uses event delegation, fallback selection
 * - FIXED: force reflow in mode toggle
 * - ✅ FIX v2.1: Fixed autosave issue when resetting (timeout 0→500, hasAnswers check)
 */

class ReadingCore {
    constructor() {
        this.examSubmitted = false;
        this.explanationMode = false;
        this.currentTestData = null;
        this.currentSplit = false; // Used for Part 6 split layout
        this.slotState = {}; // Used for Part 4 & 5

        this.highlightManager = new ReadingHighlightManager();
        this.storageManager = new ReadingStorageManager();
        this.uiManager = new ReadingUIManager();
        this.debounceTimer = null;
        this.DEBOUNCE_MS = 500;
        this._isResetting = false;
    }

    /**
     * Initialize reading test with configuration data
     * @param {Object} testData - Test configuration including answers, text matching, and questions
     */
    initializeTest(testData) {
        this.currentTestData = testData;
        this.examSubmitted = false;
        this.explanationMode = false;
        this.currentSplit = false;
        
        // Setup UI components
        this.setupUI();
        
        // Render questions based on test type (or setup initial split layout)
        if (this.currentTestData.type === 'split-layout') {
            this.renderSingleColumn();
            this.attachInputEvents(); // For inline gaps
        } else if (this.currentTestData.type === 'drag-drop') {
            this.setupDragDropEvents();
        } else if (this.currentTestData.type === 'inline-radio') {
            this.renderInlineRadioQuestions();
        } else {
            this.renderQuestions();
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // === MỚI: Lưu draft khi rời trang ===
        this.setupBeforeUnload();
        
        // Initialize navigation
        this.createNavigation();
        
        // === MỚI: Khôi phục draft nếu chưa nộp bài ===
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

    /**
     * Kiểm tra xem bài này đã được nộp (có kết quả lưu) chưa
     */
    isCompleted() {
        if (!this.currentTestData) {
            console.log('[Reading Draft] isCompleted: no test data');
            return false;
        }
        const key = this.getStorageKey(false);
        const completed = localStorage.getItem(key) !== null;
        console.log('[Reading Draft] isCompleted check - key:', key, 'completed:', completed);
        return completed;
    }

    /**
     * Lấy storage key (có hoặc không có hậu tố _draft)
     */
    getStorageKey(isDraft = false) {
        const meta = this.currentTestData.metadata || this.storageManager.parseTestInfo(
            document.querySelector('.candidate')?.textContent || ''
        );
        const book = meta.book || 1;
        const test = meta.test || 1;
        const part = this.currentTestData.part || meta.part || 1;
        let key = `pet_reading_book${book}_test${test}_part${part}`;
        if (isDraft) key += '_draft';
        console.log('[Reading Draft] Generated key:', key, '(isDraft:', isDraft, ')');
        return key;
    }

    /**
     * Lấy dữ liệu nháp hiện tại từ giao diện
     */
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

    /**
     * Lưu nháp vào localStorage (có debounce)
     */
    saveDraft() {
        if (this.examSubmitted || this._isResetting) {
            console.log('[Reading Draft] Skip: exam already submitted or resetting');
            return;
        }
        if (!this.currentTestData) {
            console.log('[Reading Draft] Skip: no test data');
            return;
        }
        
        clearTimeout(this.debounceTimer);
        console.log('[Reading Draft] Scheduled save in', this.DEBOUNCE_MS, 'ms');
        
        this.debounceTimer = setTimeout(() => {
            try {
                const draft = this.getDraftData();
                const key = this.getStorageKey(true);
                localStorage.setItem(key, JSON.stringify(draft));
                console.log('[Reading Draft] SAVED to key:', key, 'data:', draft);
            } catch (e) {
                console.error('[Reading Draft] FAILED to save:', e);
            }
        }, this.DEBOUNCE_MS);
    }

    /**
     * ✅ FIX v2.1: Lưu nháp ngay lập tức (không debounce) - dùng khi rời trang hoặc radio change
     * Thêm kiểm tra: 1. _isResetting early return 2. Kiểm tra hasAnswers trước khi lưu
     */
    saveDraftImmediate() {
        // ✅ FIX: Kiểm tra _isResetting TRƯỚC (early return)
        if (this._isResetting) {
            console.log('[Reading Draft] Blocked: currently resetting');
            return;
        }
        
        if (this.examSubmitted || !this.currentTestData) {
            console.log('[Reading Draft] Blocked: exam submitted or no test data');
            return;
        }
        
        clearTimeout(this.debounceTimer);
        
        try {
            const draft = this.getDraftData();
            
            // ✅ FIX: Kiểm tra xem draft có câu trả lời thực không
            const hasAnswers = this.draftHasAnswers(draft);
            
            if (!hasAnswers) {
                console.log('[Reading Draft] No answers to save, skipping immediate save');
                return;  // ✅ Không lưu nếu trống!
            }
            
            const key = this.getStorageKey(true);
            localStorage.setItem(key, JSON.stringify(draft));
            console.log('[Reading Draft] Saved immediately to key:', key);
        } catch (e) {
            console.error('[Reading Draft] Immediate save failed:', e);
        }
    }

    /**
     * ✅ FIX v2.1: Helper function - check if draft has real answers
     */
    draftHasAnswers(draft) {
        // Loại bỏ 'type' key, chỉ kiểm tra câu trả lời thực
        const { type, slotState, ...answers } = draft;
        
        // Kiểm tra multiple-choice / inline-radio
        const radioAnswers = Object.entries(answers).some(([key, val]) => {
            return val !== null && val !== undefined && val !== '';
        });
        
        // Kiểm tra drag-drop
        if (slotState && Object.keys(slotState).length > 0) {
            return true;
        }
        
        return radioAnswers;
    }

    /**
     * Setup handlers để lưu draft khi rời trang
     * ✅ FIX v2.1: Thêm kiểm tra _isResetting vào mỗi listener
     * Dùng nhiều event vì beforeunload không đáng tin trên mobile/bfcache
     */
    setupBeforeUnload() {
        // 1. beforeunload - desktop browsers
        window.addEventListener('beforeunload', () => {
            // ✅ FIX: Kiểm tra _isResetting
            if (!this._isResetting) {
                this.saveDraftImmediate();
            } else {
                console.log('[Reading Draft] beforeunload blocked during reset');
            }
        });

        // 2. pagehide - iOS Safari, bfcache (Chrome/Firefox khi bấm Back)
        window.addEventListener('pagehide', () => {
            // ✅ FIX: Kiểm tra _isResetting
            if (!this._isResetting) {
                this.saveDraftImmediate();
            } else {
                console.log('[Reading Draft] pagehide blocked during reset');
            }
        });

        // 3. visibilitychange - khi chuyển tab, minimize, hoặc app chuyển nền (mobile)
        document.addEventListener('visibilitychange', () => {
            // ✅ FIX: Kiểm tra visibility STATE và _isResetting
            if (document.visibilityState === 'hidden' && !this._isResetting) {
                this.saveDraftImmediate();
            } else if (this._isResetting) {
                console.log('[Reading Draft] visibilitychange blocked during reset');
            }
        });
    }

    /**
     * Khôi phục nháp từ localStorage và áp dụng vào giao diện
     */
    loadDraft() {
        const key = this.getStorageKey(true);
        console.log('[Reading Draft] Attempting to load from key:', key);
        
        const draftJson = localStorage.getItem(key);
        if (!draftJson) {
            console.log('[Reading Draft] No draft found for key:', key);
            return false;
        }
        
        try {
            const draft = JSON.parse(draftJson);
            console.log('[Reading Draft] Loaded data:', draft);
            
            const questionRange = this.getQuestionRange();
            
            // Load multiple-choice / inline-radio
            if (this.currentTestData.type === 'multiple-choice' || this.currentTestData.type === 'inline-radio') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const ans = draft[`q${i}`];
                    if (ans === undefined || ans === null) continue;
                    
                    const radio = document.querySelector(`input[name="q${i}"][value="${ans}"]`);
                    if (radio) radio.checked = true;
                }
            } else if (this.currentTestData.type === 'matching') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const ans = draft[`q${i}`];
                    if (ans === undefined || ans === null) continue;
                    
                    const input = document.getElementById(`answer-${i}`);
                    if (input) input.value = ans;
                }
            } else if (this.currentTestData.type === 'split-layout') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const ans = draft[`q${i}`];
                    if (ans === undefined || ans === null) continue;
                    
                    const inp = document.getElementById(`q${i}`);
                    if (inp) inp.value = ans;
                }
            } else if (this.currentTestData.type === 'drag-drop' && draft.slotState) {
                this.slotState = { ...draft.slotState };
                // Restore drag-drop state
                this.restoreDragDropState();
            }
            
            console.log('[Reading Draft] SUCCESSFULLY loaded for', this.currentTestData.title || this.currentTestData.part);
            this.updateAnswerCount();
            return true;
        } catch (e) {
            console.warn('Failed to load reading draft', e);
            return false;
        }
    }

    /**
     * Xóa nháp khỏi localStorage
     */
    clearDraft() {
        const key = this.getStorageKey(true);
        localStorage.removeItem(key);
    }

    /**
     * Setup UI components and interactions
     */
    setupUI() {
        // Setup font size controls
        this.uiManager.setupFontControls();
        
        // Setup theme toggle
        this.uiManager.setupThemeToggle();
        
        // Setup mode toggle (classic/modern)
        this.uiManager.setupModeToggle();
        
        // Setup resizer for text/questions
        this.uiManager.setupResizer();
        
        // Setup explanation panel
        this.uiManager.setupExplanationPanel();
        
        // Setup auto-collapse for header/footer
        this.uiManager.setupAutoCollapse(this);
    }

    /**
     * Get question range for current part
     */
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

    /**
     * Render questions based on test type
     */
    renderQuestions() {
        // This would be implemented by subclass or via the rendering template
        console.log('Render questions for type:', this.currentTestData.type);
    }

    /**
     * Render split layout (Part 6)
     */
    renderSingleColumn() {
        // This would be implemented by subclass
        console.log('Render single column for split layout');
    }

    /**
     * Attach input events for split layout
     */
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

    /**
     * Render inline radio questions
     */
    renderInlineRadioQuestions() {
        console.log('Render inline radio questions');
    }

    /**
     * Setup drag drop events
     */
    setupDragDropEvents() {
        console.log('Setup drag drop events');
    }

    /**
     * ✅ FIX v2.1: Setup event listeners - kiểm tra _isResetting
     */
    setupEventListeners() {
        // Radio button changes
        document.addEventListener('change', (e) => {
            // ✅ FIX: Kiểm tra _isResetting (thêm log)
            if (this._isResetting) {
                console.log('[Reading Draft] change event blocked during reset');
                return;
            }
            
            if (e.target && e.target.matches('input[type="radio"]')) {
                this.updateAnswerCount();
                this.saveDraftImmediate(); // Radio: lưu ngay
            }
        });

        // Input changes (for matching, split-layout, etc.)
        document.addEventListener('input', (e) => {
            // ✅ FIX: Kiểm tra _isResetting (thêm log)
            if (this._isResetting) {
                console.log('[Reading Draft] input event blocked during reset');
                return;
            }
            
            if (e.target && (e.target.matches('input[type="text"]') || e.target.matches('textarea'))) {
                this.updateAnswerCount();
                this.saveDraft(); // Debounce: lưu sau 0.5s
            }
        });

        // Submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                console.log('[Reading UI] Submit button clicked');
                this.handleSubmit();
            });
        }

        // Explain button
        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) {
            explainBtn.addEventListener('click', () => {
                console.log('[Reading UI] Explain button clicked');
                this.handleExplain();
            });
        }

        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                console.log('[Reading UI] Reset button clicked');
                this.handleReset();
            });
        }

        // Eye icon clicks for explanations
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('eye-icon')) {
                const questionNum = e.target.dataset.question;
                this.showExplanation(questionNum);
            }
        });

        // Close explanation
        const closeExplanation = document.getElementById('closeExplanation');
        if (closeExplanation) {
            closeExplanation.addEventListener('click', () => {
                this.closeExplanation();
            });
        }
    }

    /**
     * Get user answer for specific question
     */
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

    /**
     * Update answer count display
     */
    updateAnswerCount() {
        const questionRange = this.getQuestionRange();
        let answeredCount = 0;
        
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const answer = this.getUserAnswer(i);
            if (answer && answer !== '') {
                answeredCount++;
            }
        }
        
        const total = questionRange.end - questionRange.start + 1;
        const answerCountDisplay = document.getElementById('answerCount');
        if (answerCountDisplay) {
            answerCountDisplay.textContent = `${answeredCount}/${total}`;
        }
    }

    /**
     * Handle submit button click
     */
    handleSubmit() {
        console.log('[Reading handleSubmit] called');
        
        if (this.examSubmitted) {
            console.log('[Submit] Already submitted');
            return;
        }

        const answers = this.collectAnswers();
        
        // Mark as submitted
        this.examSubmitted = true;

        // Save result to localStorage
        const resultData = {
            title: this.currentTestData.title,
            part: this.currentTestData.part,
            answers: answers,
            correctCount: this.calculateCorrectCount(answers),
            totalQuestions: this.currentTestData.questions ? this.currentTestData.questions.length : this.getQuestionRange().end - this.getQuestionRange().start + 1,
            timestamp: new Date().toISOString()
        };

        const key = this.getStorageKey(false);
        localStorage.setItem(key, JSON.stringify(resultData));
        console.log('[Reading Submit] Result saved to key:', key);

        // Remove draft after submission
        this.clearDraft();

        // Show results
        this.showResults(answers);

        // Enable explain button
        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) {
            explainBtn.disabled = false;
            explainBtn.textContent = 'Xem giải thích';
        }

        // Disable submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đã nộp bài';
        }

        // Send broadcast to update other tabs
        try {
            const channel = new BroadcastChannel('pet_reset_channel');
            const d = this.currentTestData;
            channel.postMessage({ action: 'submit', type: 'reading', book: d.book, test: d.test, part: d.part });
            channel.close();
        } catch(e) {
            console.warn('BroadcastChannel error:', e);
        }
    }

    /**
     * Collect all user answers
     */
    collectAnswers() {
        const questionRange = this.getQuestionRange();
        const answers = {};
        
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            answers[i] = this.getUserAnswer(i);
        }
        
        return answers;
    }

    /**
     * Calculate correct count
     */
    calculateCorrectCount(userAnswers) {
        let correctCount = 0;
        
        if (this.currentTestData.questions) {
            for (const q of this.currentTestData.questions) {
                const userAnswer = userAnswers[q.num];
                if (this.currentTestData.type === 'matching') {
                    if (userAnswer && userAnswer === q.correctAnswer?.toUpperCase()) {
                        correctCount++;
                    }
                } else {
                    if (userAnswer === q.correctAnswer) {
                        correctCount++;
                    }
                }
            }
        }
        
        return correctCount;
    }

    /**
     * Show results after submission
     */
    showResults(userAnswers) {
        const questionRange = this.getQuestionRange();

        if (this.currentTestData.questions) {
            for (let i of this.currentTestData.questions) {
                const userAnswer = userAnswers[i.num];
                let isCorrect = false;
                
                if (this.currentTestData.type === 'matching') {
                    isCorrect = userAnswer && userAnswer === i.correctAnswer?.toUpperCase();
                } else {
                    isCorrect = userAnswer === i.correctAnswer;
                }
                
                const questionDiv = document.getElementById(`question-${i.num}`);
                
                if (questionDiv) {
                    questionDiv.classList.add(isCorrect ? 'correct' : 'incorrect');
                    
                    const badge = document.createElement('span');
                    badge.className = 'correct-answer-badge';
                    badge.innerHTML = `✓ ${i.correctAnswer}`;
                    questionDiv.appendChild(badge);
                }
                
                // Mark inputs
                if (this.currentTestData.type === 'matching') {
                    const input = document.getElementById(`answer-${i.num}`);
                    if (input) {
                        input.classList.add(isCorrect ? 'correct' : 'incorrect');
                    }
                } else if (this.currentTestData.type === 'drag-drop') {
                    const readingSlot = document.getElementById(`readingSlot${i.num}`);
                    const panelSlot = document.getElementById(`panelSlot${i.num}`);
                    [readingSlot, panelSlot].forEach(slot => {
                        if (slot) slot.classList.add(isCorrect ? 'correct' : 'incorrect');
                    });
                }
            }
        }

        // Update explanation mode
        this.explanationMode = true;
    }

    /**
     * Handle explain button click
     */
    handleExplain() {
        if (!this.examSubmitted) return;

        this.explanationMode = true;
        
        document.querySelectorAll('.eye-icon, .correct-answer-badge').forEach(el => {
            el.style.display = 'inline-block';
        });

        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) {
            explainBtn.disabled = true;
            explainBtn.textContent = 'Đang xem giải thích';
        }

        const explanationPanel = document.getElementById('explanationPanel');
        if (explanationPanel) {
            explanationPanel.classList.remove('show');
        }
    }

    /**
     * Handle reset button click
     */
    handleReset() {
        console.log('[Reading handleReset] called');
        this.resetAll();
    }

    /**
     * ✅ FIX v2.1: Reset all answers and state
     * CHANGES:
     * 1. Removed function override method - using flag instead
     * 2. Changed setTimeout delay from 0 to 500ms
     * 3. Added defensive: removeItem again after delay
     * 4. All event listeners check _isResetting early return
     */
    resetAll() {
        console.log('[Reading resetAll] started');
        if (!confirm('Reset tất cả câu trả lời của part này?')) return;

        const book = this.currentTestData.book || 1;
        const test = this.currentTestData.test || 1;
        const part = this.currentTestData.part || 1;

        const completedKey = `pet_reading_book${book}_test${test}_part${part}`;
        const draftKey = completedKey + '_draft';

        // ✅ FIX: Xóa localStorage ngay
        localStorage.removeItem(completedKey);
        localStorage.removeItem(draftKey);
        console.log('[Reset] Deleted keys:', completedKey, draftKey);

        // ✅ FIX: SET FLAG TRƯỚC KHI LÀM ĐIỀU GÌ KHÁC
        this._isResetting = true;

        // === Reset UI ===
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
                    radios.forEach(radio => {
                        radio.checked = false;
                        radio.disabled = false;
                    });
                    if (this.currentTestData.type === 'inline-radio') {
                        this.updateInlineSlotFromRadio(i);
                    }
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

        document.querySelectorAll('.eye-icon').forEach(icon => {
            icon.style.display = 'none';
        });

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

        const explanationPanel = document.getElementById('explanationPanel');
        if (explanationPanel) {
            explanationPanel.classList.remove('show');
        }

        // Gửi sự kiện storage (để tab index ở chế độ nền nhận được)
        window.dispatchEvent(new StorageEvent('storage', { key: completedKey }));
        window.dispatchEvent(new StorageEvent('storage', { key: draftKey }));

        // Gửi broadcast (để index ở bất kỳ tab nào cũng nhận)
        try {
            const channel = new BroadcastChannel('pet_reset_channel');
            channel.postMessage({ action: 'reset', type: 'reading', book, test, part });
            channel.close();
        } catch(e) { console.warn('BroadcastChannel error:', e); }

        // ✅ FIX: DELAY LÂUHƠN - 500ms thay vì 0ms
        setTimeout(() => {
            this._isResetting = false;
            // ✅ FIX: Xóa lần nữa để chắc chắn (defensive)
            localStorage.removeItem(draftKey);
            console.log('[Reset] Complete - _isResetting=false, draft key cleaned');
        }, 500);  // ✅ 500ms để đảm bảo event queue process hết

        this.updateAnswerCount();
    }

    /**
     * Clear a specific slot
     */
    clearSlot(slotNum) {
        if (this.slotState[slotNum]) {
            delete this.slotState[slotNum];
        }
    }

    /**
     * Update inline slot from radio
     */
    updateInlineSlotFromRadio(questionNum) {
        // Subclass implementation
    }

    /**
     * Restore drag-drop state
     */
    restoreDragDropState() {
        // Subclass implementation
    }

    /**
     * Show explanation for specific question
     */
    showExplanation(questionNum) {
        if (!this.explanationMode && !this.examSubmitted) return;

        const question = this.currentTestData.questions?.find(q => q.num === parseInt(questionNum));
        if (!question) return;

        const explanationPanel = document.getElementById('explanationPanel');
        const explanationContent = document.getElementById('explanationContent');
        
        if (explanationPanel && explanationContent) {
            explanationContent.innerHTML = `
                <div class="explanation-item">
                    <div class="explanation-header">
                        <span class="question-num">Câu ${questionNum}</span>
                        <span class="correct-answer">Đáp án đúng: <strong>${question.correctAnswer}</strong></span>
                    </div>
                    <div class="explanation-text">
                        ${question.explanation || 'Chưa có giải thích cho câu hỏi này.'}
                    </div>
                </div>
            `;
            explanationPanel.classList.add('show');
        }
    }

    /**
     * Close explanation panel
     */
    closeExplanation() {
        const explanationPanel = document.getElementById('explanationPanel');
        if (explanationPanel) {
            explanationPanel.classList.remove('show');
        }
    }

    /**
     * Disable all inputs
     */
    disableInputs() {
        if (this.currentTestData.type === 'multiple-choice' || this.currentTestData.type === 'inline-radio') {
            document.querySelectorAll('input[type="radio"]').forEach(input => {
                input.disabled = true;
            });
        } else if (this.currentTestData.type === 'drag-drop') {
            document.querySelectorAll('.sentence-item').forEach(el => {
                el.setAttribute('draggable', 'false');
                el.style.cursor = 'default';
            });
        } else if (this.currentTestData.type === 'matching') {
            document.querySelectorAll('input[type="text"]').forEach(input => {
                input.disabled = true;
            });
        }
    }

    /**
     * Create navigation between questions
     */
    createNavigation() {
        const questionRange = this.getQuestionRange();
        const navContainer = document.getElementById('questionNav');
        
        if (!navContainer) return;

        navContainer.innerHTML = '';
        
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const navBtn = document.createElement('button');
            navBtn.className = 'nav-btn';
            navBtn.textContent = i;
            navBtn.dataset.question = i;
            
            navBtn.addEventListener('click', () => {
                const questionDiv = document.getElementById(`question-${i}`);
                if (questionDiv) {
                    questionDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
            
            navContainer.appendChild(navBtn);
        }

        // Update nav buttons as user answers questions
        document.addEventListener('change', () => this.updateNavButtons());
        document.addEventListener('input', () => this.updateNavButtons());
    }

    /**
     * Update navigation buttons to show answered/unanswered status
     */
    updateNavButtons() {
        const questionRange = this.getQuestionRange();
        
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const answer = this.getUserAnswer(i);
            const navBtn = document.querySelector(`[data-question="${i}"]`);
            
            if (navBtn) {
                if (answer && answer !== '') {
                    navBtn.classList.add('answered');
                } else {
                    navBtn.classList.remove('answered');
                }
            }
        }
    }
}

// Export for use in HTML files
window.ReadingCore = ReadingCore;
