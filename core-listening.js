/**
 * CORE LISTENING ENGINE - PET B1 PRELIMINARY
 * Contains all functionality for listening tests across all parts and tests
 * Compatible with PET 1 & PET 2, Tests 1-4, Parts 1-4
 * 
 * CHANGELOG:
 * - Added autosave draft feature (save progress automatically)
 * - Reset now also clears saved results and draft
 * - ✅ FIX: Fixed autosave issue when resetting (v2.1)
 */

class ListeningCore {
    constructor() {
        this.examSubmitted = false;
        this.explanationMode = false;
        this.currentTestData = null;
        this.audio = null;
        this.speedSelect = null;
        this.highlightManager = new HighlightManager();
        this.storageManager = new StorageManager();
        this.uiManager = new UIManager();
        this.debounceTimer = null;
        this.DEBOUNCE_MS = 300; // Lưu sau 0.3s không thay đổi
        this._isResetting = false;
    }

    /**
     * Initialize listening test with configuration data
     * @param {Object} testData - Test configuration including answers, transcript, questions
     */
    initializeTest(testData) {
        this.currentTestData = testData;
        this.examSubmitted = false;
        this.explanationMode = false;
        
        // Setup audio controls
        this.setupAudioControls();
        
        // Setup UI components
        this.setupUI();
        
        // Render questions based on test type
        this.renderQuestions();
        
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
        
        console.log('Listening test initialized:', testData.title);
    }

    /**
     * Kiểm tra xem bài này đã được nộp (có kết quả lưu) chưa
     */
    isCompleted() {
        if (!this.currentTestData) {
            console.log('[Draft] isCompleted: no test data');
            return false;
        }
        const key = this.getStorageKey(false);
        const completed = localStorage.getItem(key) !== null;
        console.log('[Draft] isCompleted check - key:', key, 'completed:', completed);
        return completed;
    }

    /**
     * Lấy storage key (có hoặc không có hậu tố _draft)
     */
    getStorageKey(isDraft = false) {
        const d = this.currentTestData;
        let book = d.book, test = d.test, part = d.part;
        
        // Nếu thiếu metadata, parse từ title
        if (!book || !test || !part) {
            const parsed = this.storageManager.parseTestInfo(d.title);
            book = book || parsed.book;
            test = test || parsed.test;
            part = part || parsed.part;
        }
        
        let key = `pet_listening_book${book}_test${test}_part${part}`;
        if (isDraft) key += '_draft';
        
        console.log('[Draft] Generated key:', key, '(isDraft:', isDraft, ')');
        return key;
    }

    /**
     * Lấy dữ liệu nháp hiện tại từ giao diện
     */
    getDraftData() {
        const questionRange = this.getQuestionRange();
        const answers = {};
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            answers[`q${i}`] = this.getUserAnswer(i);
        }
        return answers;
    }

    /**
     * Lưu nháp vào localStorage (có debounce)
     */
    saveDraft() {
        if (this.examSubmitted || this._isResetting) {
            console.log('[Draft] Skip: exam already submitted or resetting');
            return;
        }
        if (!this.currentTestData) {
            console.log('[Draft] Skip: no test data');
            return;
        }
        
        clearTimeout(this.debounceTimer);
        console.log('[Draft] Scheduled save in', this.DEBOUNCE_MS, 'ms');
        
        this.debounceTimer = setTimeout(() => {
            try {
                const draft = this.getDraftData();
                const key = this.getStorageKey(true);
                localStorage.setItem(key, JSON.stringify(draft));
                console.log('[Draft] SAVED to key:', key, 'data:', draft);
            } catch (e) {
                console.error('[Draft] FAILED to save:', e);
            }
        }, this.DEBOUNCE_MS);
    }

    /**
     * ✅ FIX v2.1: Lưu nháp ngay lập tức (không debounce) - dùng khi rời trang
     * Thêm kiểm tra: 1. _isResetting early return 2. Kiểm tra hasAnswers trước khi lưu
     */
    saveDraftImmediate() {
        // ✅ FIX: Kiểm tra _isResetting TRƯỚC (early return)
        if (this._isResetting) {
            console.log('[Draft] Blocked: currently resetting');
            return;
        }
        
        if (this.examSubmitted || !this.currentTestData) {
            console.log('[Draft] Blocked: exam submitted or no test data');
            return;
        }
        
        clearTimeout(this.debounceTimer);
        
        try {
            const draft = this.getDraftData();
            
            // ✅ FIX: Kiểm tra xem draft có câu trả lời thực không
            // Nếu tất cả answer đều null/undefined/'' thì không lưu
            const hasAnswers = Object.values(draft).some(v => {
                return v !== null && v !== undefined && v !== '';
            });
            
            if (!hasAnswers) {
                console.log('[Draft] No answers to save, skipping immediate save');
                return;  // ✅ Không lưu nếu trống!
            }
            
            const key = this.getStorageKey(true);
            localStorage.setItem(key, JSON.stringify(draft));
            console.log('[Draft] SAVED IMMEDIATELY to key:', key);
        } catch (e) {
            console.error('[Draft] Immediate save failed:', e);
        }
    }

    /**
     * Khôi phục nháp từ localStorage và áp dụng vào giao diện
     */
    loadDraft() {
        const key = this.getStorageKey(true);
        console.log('[Draft] Attempting to load from key:', key);
        
        const draftJson = localStorage.getItem(key);
        if (!draftJson) {
            console.log('[Draft] No draft found for key:', key);
            return false;
        }
        
        try {
            const draft = JSON.parse(draftJson);
            console.log('[Draft] Loaded data:', draft);
            
            const questionRange = this.getQuestionRange();
            
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                const ans = draft[`q${i}`];
                if (ans === undefined || ans === null) continue;
                
                if (this.currentTestData.type === 'multiple-choice') {
                    const radio = document.querySelector(`input[name="q${i}"][value="${ans}"]`);
                    if (radio) radio.checked = true;
                } else if (this.currentTestData.type === 'fill-blank') {
                    const input = document.getElementById(`q${i}`);
                    if (input) input.value = ans;
                }
            }
            console.log('[Draft] SUCCESSFULLY loaded for', this.currentTestData.title);
            this.updateAnswerCount();
            return true;
        } catch (e) {
            console.warn('Failed to load listening draft', e);
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
     * Setup audio playback controls
     */
    setupAudioControls() {
        this.audio = document.getElementById('listeningAudio');
        this.speedSelect = document.getElementById('speedSelect');
        
        if (this.audio && this.speedSelect) {
            this.speedSelect.addEventListener('change', () => {
                this.audio.playbackRate = parseFloat(this.speedSelect.value);
            });
        }
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
        
        // Setup resizer for transcript panel
        this.uiManager.setupResizer();
        
        // Setup explanation panel
        this.uiManager.setupExplanationPanel();
        
        // Setup auto-collapse for header/footer
        this.uiManager.setupAutoCollapse(this);
    }

    /**
     * Render questions based on test type
     */
    renderQuestions() {
        const container = document.getElementById('questionsContainer');
        if (!container) return;

        container.innerHTML = '';

        if (this.currentTestData.type === 'multiple-choice') {
            this.renderMultipleChoiceQuestions(container);
        } else if (this.currentTestData.type === 'fill-blank') {
            this.renderFillBlankQuestions(container);
        }
    }

    /**
     * Render multiple choice questions (Parts 1, 2, 4)
     */
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
                            <label for="q${q.num}${String.fromCharCode(65 + index)}">${String.fromCharCode(65 + index)}. ${opt}</label>
                        </div>
                    `).join('')}
                </div>
                <span class="eye-icon" data-question="${q.num}">👁️</span>
            `;
            
            container.appendChild(div);
        });
    }

    /**
     * Render fill blank questions (Part 3)
     */
    renderFillBlankQuestions(container) {
        this.currentTestData.questions.forEach(q => {
            const div = document.createElement('div');
            div.className = 'question-item';
            div.id = `question-${q.num}`;
            
            div.innerHTML = `
                <div class="question-text">${q.num}. ${q.text}</div>
                <div class="blank-line">
                    <input type="text" id="q${q.num}" class="fill-input" placeholder="Nhập câu trả lời...">
                    <span class="eye-icon" data-question="${q.num}">👁️</span>
                </div>
            `;
            
            container.appendChild(div);
        });
    }

    /**
     * Get question range for current part
     */
    getQuestionRange() {
        const part = this.currentTestData.part;
        
        if (this.currentTestData.type === 'multiple-choice') {
            switch(part) {
                case 1: return { start: 1, end: 7 };
                case 2: return { start: 8, end: 13 };
                case 4: return { start: 25, end: 30 };
                default: return { start: 1, end: 30 };
            }
        } else if (this.currentTestData.type === 'fill-blank') {
            return { start: 14, end: 24 };
        }
        
        return { start: 1, end: 30 };
    }

    /**
     * ✅ FIX v2.1: Setup before unload - kiểm tra _isResetting trong mỗi listener
     */
    setupBeforeUnload() {
        // 1. beforeunload - desktop browsers
        window.addEventListener('beforeunload', () => {
            // ✅ FIX: Kiểm tra _isResetting
            if (!this._isResetting) {
                this.saveDraftImmediate();
            } else {
                console.log('[Draft] beforeunload blocked during reset');
            }
        });

        // 2. pagehide - iOS Safari, bfcache
        window.addEventListener('pagehide', () => {
            // ✅ FIX: Kiểm tra _isResetting
            if (!this._isResetting) {
                this.saveDraftImmediate();
            } else {
                console.log('[Draft] pagehide blocked during reset');
            }
        });

        // 3. visibilitychange - chuyển tab, minimize, mobile app background
        document.addEventListener('visibilitychange', () => {
            // ✅ FIX: Kiểm tra visibility STATE và _isResetting
            if (document.visibilityState === 'hidden' && !this._isResetting) {
                this.saveDraftImmediate();
            } else if (this._isResetting) {
                console.log('[Draft] visibilitychange blocked during reset');
            }
        });
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Radio button changes - lưu NGAY, không debounce
        document.addEventListener('change', (e) => {
            // ✅ FIX: Kiểm tra _isResetting (thêm log)
            if (this._isResetting) {
                console.log('[Draft] change event blocked during reset');
                return;
            }
            if (e.target && e.target.matches('input[type="radio"]')) {
                this.updateAnswerCount();
                this.saveDraftImmediate();
            }
        });

        // Input field changes (for fill-in-blank)
        document.addEventListener('input', (e) => {
            // ✅ FIX: Kiểm tra _isResetting (thêm log)
            if (this._isResetting) {
                console.log('[Draft] input event blocked during reset');
                return;
            }
            if (e.target && e.target.matches('.fill-input')) {
                this.updateAnswerCount();
                this.saveDraft();
            }
        });

        // Submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                console.log('[UI] Submit button clicked');
                this.handleSubmit();
            });
            console.log('[UI] Submit event attached');
        } else {
            console.error('[UI] submitBtn not found');
        }

        // Explain button
        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) {
            explainBtn.addEventListener('click', () => {
                console.log('[UI] Explain button clicked');
                this.handleExplain();
            });
            console.log('[UI] Explain event attached');
        } else {
            console.error('[UI] explainBtn not found');
        }

        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                console.log('[UI] Reset button clicked');
                this.handleReset();
            });
            console.log('[UI] Reset event attached');
        } else {
            console.error('[UI] resetBtn not found');
        }

        // Eye icon clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('eye-icon')) {
                const questionNum = e.target.dataset.question;
                this.showExplanation(questionNum);
            }
        });

        // Close explanation
        document.getElementById('closeExplanation')?.addEventListener('click', () => {
            this.closeExplanation();
        });
    }

    /**
     * Get user answer for specific question
     */
    getUserAnswer(questionNum) {
        if (this.currentTestData.type === 'multiple-choice') {
            const radio = document.querySelector(`input[name="q${questionNum}"]:checked`);
            return radio ? radio.value : null;
        } else if (this.currentTestData.type === 'fill-blank') {
            const input = document.getElementById(`q${questionNum}`);
            return input ? input.value.trim() : null;
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
            if (answer !== null && answer !== '') {
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
        console.log('[handleSubmit] called');
        
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
            answers: answers,
            correctCount: this.calculateCorrectCount(answers),
            totalQuestions: this.currentTestData.questions.length,
            timestamp: new Date().toISOString()
        };

        const key = this.getStorageKey(false);
        localStorage.setItem(key, JSON.stringify(resultData));
        console.log('[Submit] Result saved to key:', key);

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
            channel.postMessage({ action: 'submit', type: 'listening', book: d.book, test: d.test, part: d.part });
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
        
        for (const q of this.currentTestData.questions) {
            const userAnswer = userAnswers[q.num];
            if (userAnswer === q.correctAnswer) {
                correctCount++;
            }
        }
        
        return correctCount;
    }

    /**
     * Show results after submission
     */
    showResults(userAnswers) {
        const questionRange = this.getQuestionRange();

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const userAnswer = userAnswers[i];
            const question = this.currentTestData.questions.find(q => q.num === i);
            
            if (!question) continue;
            
            const isCorrect = userAnswer === question.correctAnswer;
            const questionDiv = document.getElementById(`question-${i}`);
            
            if (questionDiv) {
                // Add correct/incorrect class
                questionDiv.classList.add(isCorrect ? 'correct' : 'incorrect');
                
                // Add correct answer badge
                const badge = document.createElement('span');
                badge.className = 'correct-answer-badge';
                badge.innerHTML = `✓ ${question.correctAnswer}`;
                
                if (this.currentTestData.type === 'multiple-choice') {
                    questionDiv.appendChild(badge);
                } else if (this.currentTestData.type === 'fill-blank') {
                    const input = document.getElementById(`q${i}`);
                    if (input) {
                        input.classList.add(isCorrect ? 'correct' : 'incorrect');
                        const wrapper = input.closest('.blank-line');
                        if (wrapper) {
                            wrapper.appendChild(badge);
                        }
                    }
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
        
        // Show eye icons and answer badges
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
        console.log('[handleReset] called');
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
        console.log('[resetAll] started');
        if (!confirm('Reset tất cả câu trả lời của part này?')) return;

        const book = this.currentTestData.book || 1;
        const test = this.currentTestData.test || 1;
        const part = this.currentTestData.part || 1;

        const completedKey = `pet_listening_book${book}_test${test}_part${part}`;
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

        const questionRange = this.getQuestionRange();

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            if (this.currentTestData.type === 'multiple-choice') {
                const radios = document.getElementsByName(`q${i}`);
                radios.forEach(radio => {
                    radio.checked = false;
                    radio.disabled = false;
                });
            } else if (this.currentTestData.type === 'fill-blank') {
                const input = document.getElementById(`q${i}`);
                if (input) {
                    input.value = '';
                    input.disabled = false;
                }
            }

            // Xóa class correct/incorrect và badge
            const questionDiv = document.getElementById(`question-${i}`);
            if (questionDiv) {
                questionDiv.classList.remove('correct', 'incorrect');
                const badge = questionDiv.querySelector('.correct-answer-badge');
                if (badge) badge.remove();
            }

            if (this.currentTestData.type === 'fill-blank') {
                const input = document.getElementById(`q${i}`);
                if (input) {
                    input.classList.remove('correct', 'incorrect');
                    const wrapper = input.closest('.blank-line');
                    if (wrapper) {
                        const badge = wrapper.querySelector('.correct-answer-badge');
                        if (badge) badge.remove();
                    }
                }
            }
        }

        // Hide transcript
        const mainArea = document.getElementById('mainArea');
        const transcriptContent = document.getElementById('transcriptContent');
        if (mainArea && transcriptContent) {
            mainArea.classList.remove('show-transcript');
            transcriptContent.innerHTML = '';
        }

        // Hide eye icons
        document.querySelectorAll('.eye-icon').forEach(icon => {
            icon.style.display = 'none';
        });

        this.highlightManager.clearAllHighlights();

        // Reset buttons
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

        // Gửi BroadcastChannel
        try {
            const channel = new BroadcastChannel('pet_reset_channel');
            channel.postMessage({ action: 'reset', type: 'listening', book, test, part });
            channel.close();
        } catch(e) {
            console.warn('BroadcastChannel error:', e);
        }

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
     * Show explanation for specific question
     */
    showExplanation(questionNum) {
        if (!this.explanationMode && !this.examSubmitted) return;

        const question = this.currentTestData.questions.find(q => q.num === parseInt(questionNum));
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

// Global functions for context menu
window.applyHighlight = function(color) {
    if (window.listeningCore && window.listeningCore.highlightManager) {
        window.listeningCore.highlightManager.applyHighlight(color);
    }
};

window.removeHighlight = function() {
    if (window.listeningCore && window.listeningCore.highlightManager) {
        window.listeningCore.highlightManager.removeHighlight();
    }
};

// Export for use in HTML files
window.ListeningCore = ListeningCore;
