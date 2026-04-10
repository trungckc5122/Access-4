/**
 * CORE LISTENING ENGINE - PET B1 PRELIMINARY
 * Contains all functionality for listening tests across all parts and tests
 * Compatible with PET 1 & PET 2, Tests 1-4, Parts 1-4
 * 
 * CHANGELOG:
 * - Added autosave draft feature (save progress automatically)
 * - Reset now also clears saved results and draft
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
        if (this.examSubmitted) {
            console.log('[Draft] Skip: exam already submitted');
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
     * Lưu nháp ngay lập tức (không debounce) - dùng khi rời trang
     */
    saveDraftImmediate() {
        if (this.examSubmitted || !this.currentTestData) return;
        clearTimeout(this.debounceTimer);
        try {
            const draft = this.getDraftData();
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
     * Render fill-in-the-blank questions (Part 3)
     */
    renderFillBlankQuestions(container) {
        const template = this.currentTestData.template;
        container.innerHTML = template;

        // Add eye icons to existing inputs (only if not already present)
        container.querySelectorAll('.fill-input').forEach(input => {
            const questionNum = input.id.replace('q', '');
            const parent = input.parentNode;

            // Check if eye icon already exists
            if (!parent.querySelector('.eye-icon')) {
                const eyeIcon = document.createElement('span');
                eyeIcon.className = 'eye-icon';
                eyeIcon.setAttribute('data-question', questionNum);
                eyeIcon.textContent = '👁️';
                parent.appendChild(eyeIcon);
            }
        });
    }

    /**
     * Setup handlers để lưu draft khi rời trang
     * Dùng nhiều event vì beforeunload không đáng tin trên mobile/bfcache
     */
    setupBeforeUnload() {
        // 1. beforeunload - desktop browsers thông thường
        window.addEventListener('beforeunload', () => {
            this.saveDraftImmediate();
        });

        // 2. pagehide - iOS Safari, bfcache (Chrome/Firefox khi bấm Back)
        window.addEventListener('pagehide', () => {
            this.saveDraftImmediate();
        });

        // 3. visibilitychange - khi chuyển tab, minimize, hoặc app chuyển nền (mobile)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveDraftImmediate();
            }
        });
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Radio button changes - lưu NGAY, không debounce
        document.addEventListener('change', (e) => {
            if (e.target && e.target.matches('input[type="radio"]')) {
                this.updateAnswerCount();
                this.saveDraftImmediate();
            }
        });

        // Input field changes (for fill-in-blank)
        document.addEventListener('input', (e) => {
            if (e.target && e.target.matches('.fill-input')) {
                this.updateAnswerCount();
                this.saveDraft(); // <-- MỚI
            }
        });

        // Submit button
        document.getElementById('submitBtn')?.addEventListener('click', () => {
            this.handleSubmit();
        });

        // Explain button
        document.getElementById('explainBtn')?.addEventListener('click', () => {
            this.handleExplain();
        });

        // Reset button
        document.getElementById('resetBtn')?.addEventListener('click', () => {
            this.handleReset();
        });

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
     * Create navigation buttons
     */
    createNavigation() {
        const nav = document.getElementById('navButtons');
        if (!nav || !this.currentTestData) return;

        nav.innerHTML = '';
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
    }

    /**
     * Get question range based on current test
     */
    getQuestionRange() {
        if (!this.currentTestData) return { start: 1, end: 7 };
        
        const questions = this.currentTestData.questions;
        const numbers = questions.map(q => q.num).sort((a, b) => a - b);
        return {
            start: numbers[0] || 1,
            end: numbers[numbers.length - 1] || 7
        };
    }

    /**
     * Scroll to specific question
     */
    scrollToQuestion(questionNum) {
        const questionElement = document.getElementById(`question-${questionNum}`);
        if (questionElement) {
            questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Set active navigation button
     */
    setActiveNavButton(questionNum) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`.nav-btn[data-question="${questionNum}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    /**
     * Get user's answer for a question
     */
    getUserAnswer(questionNum) {
        if (this.currentTestData.type === 'multiple-choice') {
            const radios = document.getElementsByName(`q${questionNum}`);
            for (let radio of radios) {
                if (radio.checked) return radio.value;
            }
            return null;
        } else if (this.currentTestData.type === 'fill-blank') {
            const input = document.getElementById(`q${questionNum}`);
            return input ? input.value.trim().toLowerCase() : null;
        }
        return null;
    }

    /**
     * Check if answer is correct
     */
    isAnswerCorrect(questionNum, userAnswer) {
        const correctAnswer = this.currentTestData.answerKey[`q${questionNum}`];
        
        if (Array.isArray(correctAnswer)) {
            // Handle multiple possible answers
            return correctAnswer.includes(userAnswer);
        } else {
            return userAnswer === correctAnswer;
        }
    }

    /**
     * Update answer count and navigation colors
     */
    updateAnswerCount() {
        const questionRange = this.getQuestionRange();
        let answered = 0;

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            if (this.getUserAnswer(i)) answered++;
        }

        const total = questionRange.end - questionRange.start + 1;
        
        // Update badges
        const answeredBadge = document.getElementById('answeredCount');
        if (answeredBadge) {
            answeredBadge.textContent = `${answered}/${total} answered`;
        }

        const progressDisplay = document.getElementById('progressDisplay');
        if (progressDisplay) {
            progressDisplay.textContent = `Đã làm: ${answered}/${total}`;
        }

        // Update navigation buttons
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const btn = document.querySelector(`.nav-btn[data-question="${i}"]`);
            if (btn) {
                btn.classList.remove('answered', 'unanswered');
                btn.classList.add(this.getUserAnswer(i) ? 'answered' : 'unanswered');
            }
        }
    }

    /**
     * Handle submit button click
     */
    handleSubmit() {
        if (this.examSubmitted) return;

        const questionRange = this.getQuestionRange();
        const unanswered = [];

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            if (!this.getUserAnswer(i)) {
                unanswered.push(i);
            }
        }

        if (unanswered.length > 0) {
            if (!confirm(`Bạn còn ${unanswered.length} câu chưa chọn. Nộp bài?`)) {
                return;
            }
        }

        this.submitExam();
    }

    /**
     * Submit the exam
     */
    submitExam() {
        this.examSubmitted = true;

        // Expand header/footer when submitted (don't auto-collapse)
        document.querySelector('.ielts-header')?.classList.remove('collapsed');
        document.querySelector('.question-nav')?.classList.remove('collapsed');
        document.querySelector('.bottom-bar')?.classList.remove('collapsed');

        // Show transcript
        this.showTranscript();

        // Mark answers
        this.markAnswers();

        // Update UI
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đã nộp';
        }

        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) {
            explainBtn.disabled = false;
        }

        // Calculate and show results
        this.showResults();

        // Save to dashboard
        this.storageManager.saveResults(this.currentTestData, this.getUserAnswers());
        
        // === MỚI: Xóa draft sau khi nộp bài ===
        this.clearDraft();

        // Disable inputs
        this.disableInputs();
    }

    /**
     * Show transcript panel
     */
    showTranscript() {
        const mainArea = document.getElementById('mainArea');
        const transcriptContent = document.getElementById('transcriptContent');
        
        if (mainArea && transcriptContent && this.currentTestData.transcript) {
            mainArea.classList.add('show-transcript');
            transcriptContent.innerHTML = this.currentTestData.transcript;
        }
    }

    /**
     * Mark answers as correct/incorrect
     */
    markAnswers() {
        const questionRange = this.getQuestionRange();

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const userAnswer = this.getUserAnswer(i);
            const isCorrect = this.isAnswerCorrect(i, userAnswer);

            // Handle multiple-choice questions
            const questionDiv = document.getElementById(`question-${i}`);
            if (questionDiv) {
                questionDiv.classList.remove('correct', 'incorrect');
                
                // Remove existing badge
                const oldBadge = questionDiv.querySelector('.correct-answer-badge');
                if (oldBadge) oldBadge.remove();

                if (isCorrect) {
                    questionDiv.classList.add('correct');
                } else {
                    questionDiv.classList.add('incorrect');
                    
                    // Show correct answer badge
                    const badge = document.createElement('span');
                    badge.className = 'correct-answer-badge';
                    const correctAnswer = this.currentTestData.displayAnswers[`q${i}`];
                    badge.textContent = correctAnswer;
                    questionDiv.appendChild(badge);
                }
            }

            // Handle fill-in-the-blank questions
            const input = document.getElementById(`q${i}`);
            if (input) {
                input.classList.remove('correct', 'incorrect');
                const wrapper = input.closest('.blank-line');
                
                // Remove existing badge from wrapper
                if (wrapper) {
                    const oldBadge = wrapper.querySelector('.correct-answer-badge');
                    if (oldBadge) oldBadge.remove();
                }

                if (isCorrect) {
                    input.classList.add('correct');
                } else {
                    input.classList.add('incorrect');
                    if (wrapper) {
                        // Show correct answer badge next to input
                        const badge = document.createElement('span');
                        badge.className = 'correct-answer-badge';
                        const correctAnswer = this.currentTestData.displayAnswers[`q${i}`];
                        badge.textContent = correctAnswer;
                        wrapper.appendChild(badge);
                    }
                }
            }
        }
    }

    /**
     * Show results panel
     */
    showResults() {
        const questionRange = this.getQuestionRange();
        let correctCount = 0;

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            if (this.isAnswerCorrect(i, this.getUserAnswer(i))) {
                correctCount++;
            }
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
        if (confirm('Reset all answers?')) {
            this.resetAll();
        }
    }

    /**
     * Reset all answers and state
     */
    resetAll() {
        this.examSubmitted = false;
        this.explanationMode = false;

        const questionRange = this.getQuestionRange();

        // Clear answers
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

            // Remove question styling for multiple-choice
            const questionDiv = document.getElementById(`question-${i}`);
            if (questionDiv) {
                questionDiv.classList.remove('correct', 'incorrect');
                const badge = questionDiv.querySelector('.correct-answer-badge');
                if (badge) badge.remove();
            }

            // Remove badge from blank-line wrapper for fill-blank
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

        // Clear highlights
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

        // === MỚI: Xóa cả kết quả đã lưu và nháp ===
        if (this.currentTestData) {
            const completedKey = this.getStorageKey(false);
            localStorage.removeItem(completedKey);
            const draftKey = this.getStorageKey(true);
            localStorage.removeItem(draftKey);

            window.dispatchEvent(new StorageEvent('storage', { key: completedKey }));
            window.dispatchEvent(new StorageEvent('storage', { key: draftKey }));

            // Gửi thông báo qua BroadcastChannel để index cập nhật
            try {
                const channel = new BroadcastChannel('pet_reset_channel');
                channel.postMessage({ action: 'reset', type: 'listening', part: this.currentTestData.part });
                channel.close();
            } catch(e) { console.warn('BroadcastChannel error:', e); }
        } else {
            this.clearDraft();
        }

        this.updateAnswerCount();
    }

    /**
     * Show explanation for specific question
     */
    showExplanation(questionNum) {
        if (!this.explanationMode && !this.examSubmitted) return;

        // Clear previous highlights
        this.highlightManager.clearAllHighlights();

        // Highlight transcript sections
        this.highlightManager.highlightQuestion(questionNum);

        // Show explanation panel
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
                if (!isCorrect) {
                    html += `<strong>Đáp án đúng:</strong> ${this.currentTestData.displayAnswers[`q${questionNum}`]}`;
                } else {
                    html += `<strong>Đúng!</strong>`;
                }
                html += `</div>`;
            }
            
            explanationText.innerHTML = html;
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
        
        this.highlightManager.clearAllHighlights();
    }

    /**
     * Disable all input elements
     */
    disableInputs() {
        if (this.currentTestData.type === 'multiple-choice') {
            document.querySelectorAll('input[type="radio"]').forEach(input => {
                input.disabled = true;
            });
        } else if (this.currentTestData.type === 'fill-blank') {
            document.querySelectorAll('.fill-input').forEach(input => {
                input.disabled = true;
            });
        }
    }

    /**
     * Get all user answers
     */
    getUserAnswers() {
        const answers = {};
        const questionRange = this.getQuestionRange();

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            answers[i] = this.getUserAnswer(i);
        }

        return answers;
    }
}

/**
 * Highlight Manager - Handles transcript highlighting
 */
class HighlightManager {
    constructor() {
        this.setupContextMenu();
    }

    /**
     * Setup context menu for manual highlighting
     * FIXED: Use event delegation to handle dynamic DOM changes and allow highlighting in questions
     */
    setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            // Kiểm tra target có nằm trong vùng transcript hoặc vùng câu hỏi không
            const highlightArea = e.target.closest('#transcriptContent, .transcript-content, .reading-content, #questionsContainer, .questions-panel, .question-item, .questions-list, #mainArea');
            if (highlightArea) {
                const selection = window.getSelection();
                if (selection.toString().trim()) {
                    e.preventDefault();
                    // Save the selection to use when applying highlight
                    this.savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
                    this.showContextMenu(e.pageX, e.pageY);
                }
            }
        });

        document.addEventListener('click', (e) => {
            const contextMenu = document.getElementById('contextMenu');
            if (contextMenu && !contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
            }
        });
    }

    /**
     * Show context menu
     */
    showContextMenu(x, y) {
        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) {
            contextMenu.style.left = x + 'px';
            contextMenu.style.top = y + 'px';
            contextMenu.style.display = 'block';
        }
    }

    /**
     * Highlight question in transcript
     */
    highlightQuestion(questionNum) {
        const highlightSpans = document.querySelectorAll(`.highlightable[data-q="${questionNum}"]`);
        
        highlightSpans.forEach(span => {
            const parentP = span.closest('p');
            if (parentP) {
                parentP.classList.add('transcript-highlight');
            }
            
            span.classList.add('keyword-highlight');
            span.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add scroll highlight effect
            span.classList.add('scroll-highlight');
            setTimeout(() => {
                span.classList.remove('scroll-highlight');
            }, 1000);
        });
    }

    /**
     * Clear all highlights
     */
    clearAllHighlights() {
        document.querySelectorAll('.transcript-highlight').forEach(el => {
            el.classList.remove('transcript-highlight');
        });
        
        document.querySelectorAll('.keyword-highlight').forEach(el => {
            el.classList.remove('keyword-highlight');
        });
    }

    /**
     * Apply manual highlight
     * FIXED: Use saved range when available
     */
    applyHighlight(color) {
        let range = this.savedRange;
        if (!range) {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            range = selection.getRangeAt(0);
        }

        const span = document.createElement('span');
        span.className = `highlight-${color}`;
        
        try {
            range.surroundContents(span);
        } catch (e) {
            // Handle complex selections
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
        }
        
        window.getSelection().removeAllRanges();
        this.hideContextMenu();
        this.savedRange = null;
    }

    /**
     * Remove manual highlight
     * FIXED: Use saved range and TreeWalker on commonAncestorContainer
     */
    removeHighlight() {
        let range = this.savedRange;
        if (!range) {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            range = selection.getRangeAt(0);
        }

        // Tìm tất cả các highlight span nằm trong range
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

        const toRemove = [];
        let node;
        while (node = walker.nextNode()) {
            if (range.intersectsNode(node)) {
                toRemove.push(node);
            }
        }

        toRemove.forEach(span => {
            const parent = span.parentNode;
            while (span.firstChild) {
                parent.insertBefore(span.firstChild, span);
            }
            parent.removeChild(span);
        });

        window.getSelection().removeAllRanges();
        this.hideContextMenu();
        this.savedRange = null;
    }

    /**
     * Hide context menu
     */
    hideContextMenu() {
        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
    }
}

/**
 * Storage Manager - Handles saving results to localStorage
 */
class StorageManager {
    /**
     * Save test results to localStorage
     */
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
                isCorrect: isCorrect
            });
        }

        const partData = {
            partId: testData.part,
            name: `Part ${testData.part}`,
            totalQuestions: details.length,
            correctCount: correctCount,
            details: details
        };

        const { book, test, part } = this.parseTestInfo(testData.title);
        const key = `pet_listening_book${book}_test${test}_part${part}`;
        
        localStorage.setItem(key, JSON.stringify(partData));
        console.log(`Results saved with key: ${key}`);
    }

    /**
     * Get question range from test data
     */
    getQuestionRange(testData) {
        const questions = testData.questions;
        const numbers = questions.map(q => q.num).sort((a, b) => a - b);
        return {
            start: numbers[0] || 1,
            end: numbers[numbers.length - 1] || 7
        };
    }

    /**
     * Check if answer is correct
     */
    checkAnswer(userAnswer, correctAnswer) {
        if (!userAnswer) return false;
        
        if (Array.isArray(correctAnswer)) {
            return correctAnswer.includes(userAnswer.toLowerCase());
        } else {
            return userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        }
    }

    /**
     * Parse test information from title
     */
    parseTestInfo(title) {
        let book = 1, test = 1, part = 1;
        
        const bookMatch = title.match(/Preliminary\s+(\d+)/i);
        if (bookMatch) book = parseInt(bookMatch[1]);
        
        const testMatch = title.match(/Test\s+(\d+)/i);
        if (testMatch) test = parseInt(testMatch[1]);
        
        const partMatch = title.match(/Part\s+(\d+)/i);
        if (partMatch) part = parseInt(partMatch[1]);
        
        return { book, test, part };
    }
}

/**
 * UI Manager - Handles UI interactions and controls
 */
class UIManager {
    /**
     * Setup font size controls
     */
    setupFontControls() {
        const fontButtons = {
            fontSmall: 'small',
            fontMedium: 'medium', 
            fontLarge: 'large'
        };

        Object.entries(fontButtons).forEach(([id, size]) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => this.setFontSize(size));
            }
        });

        // Set default large font
        this.setFontSize('large');
    }

    /**
     * Set font size
     */
    setFontSize(size) {
        // Update button states
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`font${size.charAt(0).toUpperCase() + size.slice(1)}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Update content font sizes
        document.querySelectorAll('.transcript-content, .questions-list').forEach(el => {
            el.className = `transcript-content font-${size}`;
            if (el.classList.contains('questions-list')) {
                el.classList.add('centered');
            }
        });
    }

    /**
     * Setup theme toggle
     */
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    /**
     * Setup mode toggle (classic/modern)
     */
    setupModeToggle() {
        const modeToggle = document.getElementById('modeToggle');
        const styleLink = document.getElementById('styleLink');
        const themeToggle = document.getElementById('themeToggle');
        const html = document.documentElement;

        if (!modeToggle || !styleLink) return;

        function setMode(isClassic) {
            if (isClassic) {
                // Switch to classic mode
                styleLink.href = styleLink.href.replace('listening-pet-common.css', 'listening-pet-common1.css');
                // Hide theme toggle in classic mode
                if (themeToggle) themeToggle.style.display = 'none';
                // Remove dark theme
                html.removeAttribute('data-theme');
                localStorage.removeItem('pet-theme');
            } else {
                // Switch to modern mode
                styleLink.href = styleLink.href.replace('listening-pet-common1.css', 'listening-pet-common.css');
                // Show theme toggle in modern mode
                if (themeToggle) themeToggle.style.display = 'flex';
            }
            localStorage.setItem('pet-mode', isClassic ? 'classic' : 'modern');
        }

        // Restore saved mode
        const savedMode = localStorage.getItem('pet-mode');
        if (savedMode === 'classic') {
            modeToggle.checked = true;
            setMode(true);
        } else {
            modeToggle.checked = false;
            setMode(false);
        }

        modeToggle.addEventListener('change', () => {
            setMode(modeToggle.checked);
        });
    }

    /**
     * Setup resizer for transcript panel
     */
    setupResizer() {
        const transcriptPanel = document.getElementById('transcriptPanel');
        const questionsPanel = document.getElementById('questionsPanel');
        const resizer = document.getElementById('resizer');
        
        if (!transcriptPanel || !questionsPanel || !resizer) return;

        let isResizing = false;

        resizer.addEventListener('mousedown', () => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
        });

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

        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = 'default';
        });
    }

    /**
     * Setup explanation panel
     */
    setupExplanationPanel() {
        const explanationPanel = document.getElementById('explanationPanel');
        const explanationResizer = document.getElementById('explanationResizer');
        
        if (!explanationPanel || !explanationResizer) return;

        let isResizing = false;

        explanationResizer.addEventListener('mousedown', () => {
            isResizing = true;
            document.body.style.cursor = 'ns-resize';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const rect = explanationPanel.getBoundingClientRect();
            let newHeight = e.clientY - rect.top;
            
            if (newHeight < 150) newHeight = 150;
            if (newHeight > 500) newHeight = 500;
            
            explanationPanel.style.height = newHeight + 'px';
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = 'default';
        });
    }

    /**
     * Setup auto-collapse for header and footer after 5s of mouse leave
     */
    setupAutoCollapse(coreInstance) {
        const header = document.querySelector('.ielts-header');
        const footer = document.querySelector('.bottom-bar');
        const questionNav = document.querySelector('.question-nav');
        
        if (!header && !footer) return;

        // Add toggle button to header
        this.addAutoCollapseToggle(header, coreInstance);

        let headerTimer = null;
        let footerTimer = null;
        const COLLAPSE_DELAY = 5000; // 5 seconds

        const isAutoCollapseEnabled = () => {
            return localStorage.getItem('pet-autocollapse-enabled') !== 'false';
        };

        const collapseHeader = () => {
            if (coreInstance.examSubmitted) return;
            if (!isAutoCollapseEnabled()) return;
            header?.classList.add('collapsed');
        };

        const expandHeader = () => {
            header?.classList.remove('collapsed');
        };

        const collapseFooter = () => {
            if (coreInstance.examSubmitted) return;
            if (!isAutoCollapseEnabled()) return;
            footer?.classList.add('collapsed');
        };

        const expandFooter = () => {
            footer?.classList.remove('collapsed');
        };

        // Header hover handling
        if (header) {
            header.addEventListener('mouseenter', () => {
                clearTimeout(headerTimer);
                expandHeader();
            });
            header.addEventListener('mouseleave', () => {
                if (isAutoCollapseEnabled()) {
                    headerTimer = setTimeout(collapseHeader, COLLAPSE_DELAY);
                }
            });
        }

        // Question nav hover handling - hover to expand header, but don't collapse question nav itself
        if (questionNav) {
            questionNav.addEventListener('mouseenter', () => {
                clearTimeout(headerTimer);
                expandHeader();
            });
            questionNav.addEventListener('mouseleave', () => {
                if (!header?.matches(':hover') && isAutoCollapseEnabled()) {
                    headerTimer = setTimeout(collapseHeader, COLLAPSE_DELAY);
                }
            });
        }

        // Footer hover handling
        if (footer) {
            footer.addEventListener('mouseenter', () => {
                clearTimeout(footerTimer);
                expandFooter();
            });
            footer.addEventListener('mouseleave', () => {
                if (isAutoCollapseEnabled()) {
                    footerTimer = setTimeout(collapseFooter, COLLAPSE_DELAY);
                }
            });
        }

        // Start collapsed after initial delay only if enabled
        setTimeout(() => {
            if (!coreInstance.examSubmitted && isAutoCollapseEnabled()) {
                collapseHeader();
                collapseFooter();
            }
        }, COLLAPSE_DELAY);
    }

    /**
     * Add auto-collapse toggle button to header
     */
    addAutoCollapseToggle(header, coreInstance) {
        if (!header) return;
        
        // Check if toggle already exists
        if (header.querySelector('.autocollapse-toggle')) return;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'autocollapse-toggle';
        toggleBtn.title = 'Bật/Tắt tự động thu gọn header/footer';
        
        // SVG icons: active = auto-collapse (shrink icon), inactive = fixed (fullscreen icon)
        const iconShrink = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 14h6v6M4 10h6V4M14 20v-6h6M14 4v6h6"/>
        </svg>`;
        const iconExpand = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>`;
        
        const isEnabled = localStorage.getItem('pet-autocollapse-enabled') !== 'false';
        toggleBtn.innerHTML = isEnabled ? iconShrink : iconExpand;
        toggleBtn.classList.toggle('active', isEnabled);

        toggleBtn.addEventListener('click', () => {
            const currentlyEnabled = localStorage.getItem('pet-autocollapse-enabled') !== 'false';
            const newEnabled = !currentlyEnabled;
            localStorage.setItem('pet-autocollapse-enabled', newEnabled.toString());
            
            toggleBtn.classList.toggle('active', newEnabled);
            toggleBtn.innerHTML = newEnabled ? iconShrink : iconExpand;
            
            if (!newEnabled) {
                // Expand header and footer when disabled (keep question-nav visible)
                header?.classList.remove('collapsed');
                document.querySelector('.bottom-bar')?.classList.remove('collapsed');
            }
        });

        // Find a good place to insert the button - right after mode toggle (modern/classic)
        const modeToggle = header.querySelector('#modeToggleContainer');
        const themeToggle = header.querySelector('.theme-toggle-btn');
        
        if (modeToggle) {
            modeToggle.insertAdjacentElement('afterend', toggleBtn);
        } else if (themeToggle) {
            themeToggle.insertAdjacentElement('afterend', toggleBtn);
        } else {
            header.appendChild(toggleBtn);
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