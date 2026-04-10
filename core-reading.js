/**
 * CORE READING ENGINE - PET B1 PRELIMINARY
 * Contains all functionality for reading tests across all parts and tests
 * Compatible with PET 1 & PET 2, Tests 1-4, Parts 1-6
 * 
 * CHANGELOG:
 * - Added autosave draft feature (save progress automatically)
 * - Reset now also clears saved results and draft
 * - FIXED: Manual highlighting context menu and removeHighlight() logic
 * - FIXED: Matching support in markAnswers, draft save, badge cleanup, force reflow
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
        if (this.examSubmitted) {
            console.log('[Reading Draft] Skip: exam already submitted');
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
     * Lưu nháp ngay lập tức (không debounce) - dùng khi rời trang hoặc radio change
     */
    saveDraftImmediate() {
        if (this.examSubmitted || !this.currentTestData) return;
        clearTimeout(this.debounceTimer);
        try {
            const draft = this.getDraftData();
            const key = this.getStorageKey(true);
            localStorage.setItem(key, JSON.stringify(draft));
            console.log('[Reading Draft] Saved immediately to key:', key);
        } catch (e) {
            console.error('[Reading Draft] Immediate save failed:', e);
        }
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

            if (this.currentTestData.type === 'multiple-choice' || this.currentTestData.type === 'inline-radio') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const ans = draft[`q${i}`];
                    if (ans) {
                        const radio = document.querySelector(`input[name="q${i}"][value="${ans}"]`);
                        if (radio) {
                            radio.checked = true;
                            console.log(`[Reading Draft] Restored q${i}=${ans}`);
                        }
                    }
                }
            } else if (this.currentTestData.type === 'matching') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const val = draft[`q${i}`];
                    if (val) {
                        const input = document.getElementById(`answer-${i}`);
                        if (input) input.value = val;
                    }
                }
            } else if (this.currentTestData.type === 'drag-drop') {
                if (draft.slotState) {
                    this.slotState = draft.slotState;
                    console.log('[Reading Draft] Restored drag-drop state');
                }
            } else if (this.currentTestData.type === 'split-layout') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const val = draft[`q${i}`];
                    if (val) {
                        const inp = document.getElementById(`q${i}`);
                        if (inp) inp.value = val;
                    }
                }
            }

            this.updateAnswerCount();
            return true;
        } catch (e) {
            console.error('[Reading Draft] Failed to parse draft:', e);
            return false;
        }
    }

    /**
     * Xóa draft khỏi localStorage
     */
    clearDraft() {
        const key = this.getStorageKey(true);
        try {
            localStorage.removeItem(key);
            console.log('[Reading Draft] Cleared draft for key:', key);
        } catch (e) {
            console.error('[Reading Draft] Failed to clear draft:', e);
        }
    }

    /**
     * Determine the range of question numbers in this test
     */
    getQuestionRange() {
        const questions = this.currentTestData.questions || [];
        if (questions.length === 0) {
            return { start: 1, end: 5 }; // Default to 1-5
        }
        const nums = questions.map(q => q.num).filter(n => !isNaN(n)).sort((a, b) => a - b);
        return { start: nums[0], end: nums[nums.length - 1] };
    }

    /**
     * Get global question list (not part-specific)
     */
    getGlobalQuestionRange() {
        return { start: 1, end: 300 };
    }

    /**
     * Setup UI components (progress display, controls)
     */
    setupUI() {
        const submitBtn = document.getElementById('submitBtn');
        const explainBtn = document.getElementById('explainBtn');
        const resetBtn = document.getElementById('resetBtn');

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.handleSubmit());
        }
        if (explainBtn) {
            explainBtn.addEventListener('click', () => this.handleExplain());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleReset());
        }

        this.setupResizers();
        this.setupExplanationPanel();
        this.setupAutoCollapse(this);
    }

    /**
     * Render all questions in the test
     */
    renderQuestions() {
        const questionsContainer = document.getElementById('questionsContainer');
        if (!questionsContainer) return;

        questionsContainer.innerHTML = '';
        const questionRange = this.getQuestionRange();

        this.currentTestData.questions.forEach((qData) => {
            const questionNum = qData.num;
            if (questionNum < questionRange.start || questionNum > questionRange.end) return;

            const questionDiv = document.createElement('div');
            questionDiv.id = `question-${questionNum}`;
            questionDiv.className = 'question-item';

            // Question text (handle null text)
            const qText = document.createElement('p');
            qText.className = 'question-text';
            const questionTitle = qData.text || qData.intro || '';
            qText.innerHTML = `<strong>${questionNum}. ${questionTitle}</strong>`;
            questionDiv.appendChild(qText);

            // Options
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'options';

            const options = qData.options || [];
            options.forEach((optionText, idx) => {
                const optionLabel = document.createElement('label');
                optionLabel.className = 'option-label';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `q${questionNum}`;
                radio.value = String.fromCharCode(65 + idx); // A, B, C...
                radio.addEventListener('change', () => {
                    this.updateAnswerCount();
                    this.saveDraft(); // Save on change
                    this.saveDraftImmediate(); // Immediate save
                });

                const optionSpan = document.createElement('span');
                optionSpan.textContent = `${String.fromCharCode(65 + idx)}. ${optionText}`;

                optionLabel.appendChild(radio);
                optionLabel.appendChild(optionSpan);
                optionsDiv.appendChild(optionLabel);
            });

            questionDiv.appendChild(optionsDiv);
            questionsContainer.appendChild(questionDiv);
        });
    }

    /**
     * Render inline-radio questions (all options on one line)
     */
    renderInlineRadioQuestions() {
        const questionsContainer = document.getElementById('questionsContainer');
        if (!questionsContainer) return;

        questionsContainer.innerHTML = '';
        const questionRange = this.getQuestionRange();

        this.currentTestData.questions.forEach((qData) => {
            const questionNum = qData.num;
            if (questionNum < questionRange.start || questionNum > questionRange.end) return;

            const questionDiv = document.createElement('div');
            questionDiv.id = `question-${questionNum}`;
            questionDiv.className = 'question-item inline-radio-item';

            // Question text (handle null text)
            const qText = document.createElement('p');
            qText.className = 'question-text';
            const questionTitle = qData.text || qData.intro || '';
            qText.innerHTML = `<strong>${questionNum}. ${questionTitle}</strong>`;
            questionDiv.appendChild(qText);

            // Options on one line
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'options inline-options';

            const options = qData.options || [];
            options.forEach((optionText, idx) => {
                const optionLabel = document.createElement('label');
                optionLabel.className = 'option-label inline';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `q${questionNum}`;
                radio.value = String.fromCharCode(65 + idx);
                radio.addEventListener('change', () => {
                    this.updateAnswerCount();
                    this.saveDraft();
                    this.saveDraftImmediate();
                });

                const optionSpan = document.createElement('span');
                optionSpan.textContent = optionText;

                optionLabel.appendChild(radio);
                optionLabel.appendChild(optionSpan);
                optionsDiv.appendChild(optionLabel);
            });

            questionDiv.appendChild(optionsDiv);
            questionsContainer.appendChild(questionDiv);
        });
    }

    /**
     * Render Part 6 split layout: left reading, right answers
     */
    renderSingleColumn() {
        const mainArea = document.getElementById('mainArea');
        if (!mainArea) return;

        mainArea.innerHTML = `
            <div id="leftCol" class="split-col">
                <div class="panel-header"><span>READING PASSAGE</span></div>
                <div class="reading-content font-large" id="readingContent"></div>
            </div>
            <div id="rightCol" class="split-col">
                <div class="panel-header"><span>QUESTIONS & ANSWERS</span></div>
                <div class="questions-list font-large">
                    <div id="questionsContainer"></div>
                </div>
                <div id="rightExplanationText" class="explanation-content"></div>
            </div>
        `;

        // Copy reading content
        const readingContent = document.getElementById('readingContent');
        if (readingContent && this.currentTestData.readingContent) {
            readingContent.innerHTML = this.currentTestData.readingContent;
        }

        // Render questions
        const questionsContainer = document.getElementById('questionsContainer');
        if (questionsContainer) {
            questionsContainer.innerHTML = '';
            const questionRange = this.getQuestionRange();

            this.currentTestData.questions.forEach((qData) => {
                const questionNum = qData.num;
                if (questionNum < questionRange.start || questionNum > questionRange.end) return;

                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-item';

                const qText = document.createElement('p');
                qText.className = 'question-text';
                qText.innerHTML = `<strong>${questionNum}. ${qData.text}</strong>`;
                questionDiv.appendChild(qText);

                const inputDiv = document.createElement('div');
                inputDiv.style.marginLeft = '20px';
                inputDiv.style.marginBottom = '10px';

                const inp = document.createElement('input');
                inp.id = `q${questionNum}`;
                inp.type = 'text';
                inp.placeholder = 'Your answer';
                inp.style.width = '100%';
                inp.style.padding = '8px';
                inp.style.border = '1px solid #ccc';
                inp.style.borderRadius = '4px';
                inp.addEventListener('input', () => {
                    this.updateAnswerCount();
                    this.saveDraft();
                });
                inp.addEventListener('click', () => this.showExplanation(questionNum));

                inputDiv.appendChild(inp);
                questionDiv.appendChild(inputDiv);
                questionsContainer.appendChild(questionDiv);
            });
        }
    }

    /**
     * Render split column for explanation view (Part 6)
     */
    renderSplitColumn() {
        const mainArea = document.getElementById('mainArea');
        if (!mainArea) return;

        mainArea.innerHTML = `
            <div id="leftCol" class="split-col">
                <div class="panel-header"><span>READING PASSAGE</span></div>
                <div class="reading-content font-large" id="readingContent"></div>
            </div>
            <div id="rightCol" class="split-col">
                <div class="panel-header"><span>QUESTIONS & ANSWERS</span></div>
                <div class="questions-list font-large">
                    <div id="questionsContainer"></div>
                </div>
                <div id="rightExplanationText" class="explanation-content"></div>
            </div>
        `;

        // Copy reading content
        const readingContent = document.getElementById('readingContent');
        if (readingContent && this.currentTestData.readingContent) {
            readingContent.innerHTML = this.currentTestData.readingContent;
        }

        // Render questions
        const questionsContainer = document.getElementById('questionsContainer');
        if (questionsContainer) {
            questionsContainer.innerHTML = '';
            const questionRange = this.getQuestionRange();

            this.currentTestData.questions.forEach((qData) => {
                const questionNum = qData.num;
                if (questionNum < questionRange.start || questionNum > questionRange.end) return;

                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-item';

                const qText = document.createElement('p');
                qText.className = 'question-text';
                qText.innerHTML = `<strong>${questionNum}. ${qData.text}</strong>`;
                questionDiv.appendChild(qText);

                const inputDiv = document.createElement('div');
                inputDiv.style.marginLeft = '20px';
                inputDiv.style.marginBottom = '10px';

                const inp = document.createElement('input');
                inp.id = `q${questionNum}`;
                inp.type = 'text';
                inp.placeholder = 'Your answer';
                inp.style.width = '100%';
                inp.style.padding = '8px';
                inp.style.border = '1px solid #ccc';
                inp.style.borderRadius = '4px';
                inp.addEventListener('click', () => this.showExplanation(questionNum));

                inputDiv.appendChild(inp);
                questionDiv.appendChild(inputDiv);
                questionsContainer.appendChild(questionDiv);
            });
        }
    }

    /**
     * Render drag-drop part (Part 4 & 5)
     */
    setupDragDropEvents() {
        const dragItems = document.querySelectorAll('[draggable="true"]');
        const slots = document.querySelectorAll('[data-slot-id]');

        dragItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', item.innerHTML);
            });
        });

        slots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                slot.style.backgroundColor = '#f0f0f0';
            });

            slot.addEventListener('dragleave', () => {
                slot.style.backgroundColor = '';
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                const html = e.dataTransfer.getData('text/html');
                slot.innerHTML = html;
                slot.style.backgroundColor = '';
                
                // Extract which item was dropped
                const questNum = parseInt(slot.getAttribute('data-slot-id'));
                const draggedId = e.dataTransfer.getData('item-id') || 'unknown';
                this.slotState[questNum] = draggedId;
                this.saveDraft();
                this.updateAnswerCount();
            });
        });
    }

    /**
     * Attach event listeners for split-layout input fields
     */
    attachInputEvents() {
        const questionRange = this.getQuestionRange();
        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const inp = document.getElementById(`q${i}`);
            if (inp) {
                inp.addEventListener('input', () => {
                    this.updateAnswerCount();
                    this.saveDraft();
                });
                inp.addEventListener('click', () => this.showExplanation(i));
            }
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[type="radio"]')) {
                this.updateAnswerCount();
                this.saveDraft();
                this.saveDraftImmediate();
            }
        });

        // Lưu draft cho matching input (A-H) khi gõ
        document.addEventListener('input', (e) => {
            if (e.target && e.target.matches('.answer-input')) {
                this.updateAnswerCount();
                this.saveDraft(); // debounced
            }
        });

        // Explanation close button
        const closeExplanationBtn = document.getElementById('closeExplanation');
        if (closeExplanationBtn) {
            closeExplanationBtn.addEventListener('click', () => {
                const explanationPanel = document.getElementById('explanationPanel');
                if (explanationPanel) {
                    explanationPanel.classList.remove('show');
                }
            });
        }
    }

    /**
     * Get the answer for a specific question (returns option letter or text value)
     */
    getUserAnswer(questionNum) {
        if (this.currentTestData.type === 'split-layout') {
            const inp = document.getElementById(`q${questionNum}`);
            return inp ? inp.value.trim() : null;
        } else if (this.currentTestData.type === 'drag-drop') {
            return this.slotState[questionNum] || null;
        } else if (this.currentTestData.type === 'matching') {
            const input = document.getElementById(`answer-${questionNum}`);
            if (!input) return null;
            let val = input.value.trim().toUpperCase();
            return (val.length === 1 && /[A-H]/.test(val)) ? val : null;
        } else {
            const radio = document.querySelector(`input[name="q${questionNum}"]:checked`);
            return radio ? radio.value : null;
        }
    }

    /**
     * Get all answers for the test
     */
    getUserAnswers() {
        const answers = {};
        const questionRange = this.getQuestionRange();

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            answers[i] = this.getUserAnswer(i);
        }

        return answers;
    }

    /**
     * Check if an answer is correct
     */
    isAnswerCorrect(questionNum, userAnswer) {
        if (!userAnswer || userAnswer === '') return false;

        const key = this.currentTestData.answerKey[`q${questionNum}`] || 
                    this.currentTestData.answerKey[questionNum];
        
        return userAnswer.toString().toUpperCase() === key.toString().toUpperCase();
    }

    /**
     * Create navigation buttons for questions
     */
    createNavigation() {
        const navButtons = document.getElementById('navButtons');
        if (!navButtons) return;

        navButtons.innerHTML = '';
        const questionRange = this.getQuestionRange();

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.dataset.question = i;
            btn.dataset.q = i;
            btn.textContent = i;
            btn.addEventListener('click', () => this.navigateToQuestion(i));
            navButtons.appendChild(btn);
        }
    }

    /**
     * Navigate to a specific question
     */
    navigateToQuestion(questionNum) {
        let questionElement = document.getElementById(`question-${questionNum}`);
        if (!questionElement && this.currentTestData.type === 'split-layout') {
            questionElement = document.getElementById(`q${questionNum}`);
        }

        if (questionElement) {
            questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (this.currentTestData.type === 'split-layout') {
                questionElement.focus();
            }
        }

        // Update active nav button
        this.setActiveNavButton(questionNum);
    }

    /**
     * Set active nav button
     */
    setActiveNavButton(questionNum) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`.nav-btn[data-question="${questionNum}"]`) ||
                          document.querySelector(`.nav-btn[data-q="${questionNum}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    /**
     * Evaluates total answered items and updates nav bar representation
     */
    updateAnswerCount() {
        const questionRange = this.getQuestionRange();
        let answered = 0;

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const ans = this.getUserAnswer(i);
            if (ans !== null && ans !== "") answered++;
        }

        const total = questionRange.end - questionRange.start + 1;
        
        const answeredBadge = document.getElementById('answeredCount');
        if (answeredBadge) {
            answeredBadge.textContent = `${answered}/${total} answered`;
        }

        const progressDisplay = document.getElementById('progressDisplay');
        if (progressDisplay) {
            progressDisplay.textContent = `Đã làm: ${answered}/${total}`;
        }

        // Apply visual updates to nav numbers
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

    /**
     * Submit action wrapper
     */
    handleSubmit() {
        if (this.examSubmitted) return;

        const questionRange = this.getQuestionRange();
        const unanswered = [];

        for (let i = questionRange.start; i <= questionRange.end; i++) {
            const ans = this.getUserAnswer(i);
            if (ans === null || ans === "") {
                unanswered.push(i);
            }
        }

        if (unanswered.length > 0) {
            if (!confirm(`Bạn còn ${unanswered.length} câu chưa chọn/điền. Nộp bài?`)) {
                return;
            }
        }

        this.submitExam();
    }

    /**
     * Core submission logic
     */
    submitExam() {
        this.examSubmitted = true;

        // Expand header/footer when submitted (don't auto-collapse)
        document.querySelector('.ielts-header')?.classList.remove('collapsed');
        document.querySelector('.question-nav')?.classList.remove('collapsed');
        document.querySelector('.bottom-bar')?.classList.remove('collapsed');

        if (this.currentTestData.type === 'split-layout') {
            // Apply correct styling directly on the inputs
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
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đã nộp bài';
        }

        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) {
            explainBtn.disabled = false;
        }

        // Show generic results popup directly in explanation
        this.showResults();

        // Local storage saving
        this.storageManager.saveResults(this.currentTestData, this.getUserAnswers());
        
        // === MỚI: Xóa draft sau khi nộp ===
        this.clearDraft();
        
        this.disableInputs();
    }

    /**
     * Decorates the question areas with answer badges
     */
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
            } else if (this.currentTestData.type === 'matching') {
                const input = document.getElementById(`answer-${i}`);
                if (input) {
                    const userAnswer = this.getUserAnswer(i);
                    const isCorrect = this.isAnswerCorrect(i, userAnswer);
                    input.classList.remove('correct', 'incorrect');
                    const oldBadge = input.parentNode.querySelector('.correct-answer-badge');
                    if (oldBadge) oldBadge.remove();
                    if (isCorrect) {
                        input.classList.add('correct');
                    } else if (userAnswer) {
                        input.classList.add('incorrect');
                        const badge = document.createElement('span');
                        badge.className = 'correct-answer-badge';
                        const ansStr = this.currentTestData.displayAnswers[`q${i}`] || this.currentTestData.displayAnswers[i];
                        badge.textContent = `✓ ${ansStr}`;
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

            if (isCorrect) {
                questionDiv.classList.add('correct');
            } else {
                questionDiv.classList.add('incorrect');
                const badge = document.createElement('span');
                badge.className = 'correct-answer-badge';
                const ansStr = this.currentTestData.displayAnswers[`q${i}`] || this.currentTestData.displayAnswers[i];
                badge.textContent = `Đáp án đúng: ${ansStr}`;
                questionDiv.appendChild(badge);
            }
        }
    }

    /**
     * Generates standard final result overview in the explanation pane
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

        if (this.currentTestData.type === 'split-layout') return; // For part 6 just wait for them to click Explain

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

    /**
     * Switch context into Explanation mode globally
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

        if (this.currentTestData.type === 'split-layout') {
            if (!this.currentSplit) {
                this.currentSplit = true;
                
                // Keep input values while shifting layout
                const vals = this.getUserAnswers();
                this.renderSplitColumn();
                this.attachInputEvents(); // Rebind since DOM replaced
                
                const questionRange = this.getQuestionRange();
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const el = document.getElementById(`q${i}`);
                    if (el) el.value = vals[i] || "";
                    this.addBadgeForQuestion(i);
                }
                
                document.querySelectorAll('.correct-answer-badge').forEach(badge => badge.style.display = 'inline-block');
            }
        } else {
            const explanationPanel = document.getElementById('explanationPanel');
            if (explanationPanel) {
                explanationPanel.classList.remove('show');
            }
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
                const user = this.getUserAnswer(questionNum) || "(chưa điền)";
                const correct = this.isAnswerCorrect(questionNum, user);
                html += `<div class="answer-feedback ${correct ? 'correct' : 'incorrect'}" style="margin-top:10px;padding:8px;background:${correct ? '#e8f5e8' : '#ffebee'};border-radius:5px;">`;
                html += `<strong>Câu trả lời của bạn:</strong> "${user}" ${user ? (correct ? '✓' : '✗') : ''}<br>`;
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
                           `<strong>Đáp án: ${customAnsDisplay}</strong>`;
                
                if (this.examSubmitted) {
                    const user = this.getUserAnswer(questionNum) || "(chưa chọn)";
                    const correct = this.isAnswerCorrect(questionNum, user);
                    html += `<div class="answer-feedback ${correct ? 'correct' : 'incorrect'}" style="margin-top:10px;padding:8px;background:${correct ? '#e8f5e8' : '#ffebee'};border-radius:5px;">`;
                    html += `<strong>Câu trả lời của bạn:</strong> "${user}" ${user ? (correct ? '✓' : '✗') : ''}<br>`;
                    if (!correct) html += `<strong>Đáp án đúng:</strong> ${customAnsDisplay}`;
                    else html += `Chính xác!`;
                    html += `</div>`;
                }
                
                explanationText.innerHTML = html;
            }
        }
    }

    /**
     * Add correction badge next to an answer (for Part 6 split view)
     */
    addBadgeForQuestion(questionNum) {
        const inp = document.getElementById(`q${questionNum}`);
        if (!inp) return;

        inp.classList.remove('correct', 'incorrect');
        const correct = this.isAnswerCorrect(questionNum, this.getUserAnswer(questionNum));
        inp.classList.add(correct ? 'correct' : 'incorrect');
        inp.disabled = true;
    }

    /**
     * Handle reset
     */
    handleReset() {
        if (confirm('Bạn chắc chắn muốn reset tất cả câu trả lời? Không thể hoàn tác.')) {
            this.resetExam();
        }
    }

    /**
     * Reset exam state
     */
    resetExam() {
        // Clear all answer selections
        const questionRange = this.getQuestionRange();

        if (this.currentTestData.type === 'split-layout') {
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                const inp = document.getElementById(`q${i}`);
                if (inp) {
                    inp.value = '';
                    inp.disabled = false;
                    inp.classList.remove('correct', 'incorrect');
                }
            }
        } else {
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                const radios = document.querySelectorAll(`input[name="q${i}"]`);
                radios.forEach(r => r.checked = false);
            }
            
            // Xóa badge matching
            document.querySelectorAll('.answer-input').forEach(input => {
                input.classList.remove('correct', 'incorrect');
                const badge = input.parentNode?.querySelector('.correct-answer-badge');
                if (badge) badge.remove();
            });
            
            document.querySelectorAll('.correct-answer-badge').forEach(badge => badge.remove());
            document.querySelectorAll('.question-item').forEach(el => {
                el.classList.remove('correct', 'incorrect', 'highlight-question');
            });
        }

        // Reset button states
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Nộp bài';
        }

        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) {
            explainBtn.disabled = true;
        }

        // Reset global state
        this.examSubmitted = false;
        this.explanationMode = false;
        this.slotState = {};
        this.currentSplit = false;

        // Clear highlights
        this.highlightManager.clearAllHighlights();

        // Clear and re-render
        const explanationPanel = document.getElementById('explanationPanel');
        if (explanationPanel) {
            explanationPanel.classList.remove('show');
        }

        this.updateAnswerCount();
        
        // === MỚI: Xóa draft khi reset ===
        this.clearDraft();
    }

    /**
     * Disable all inputs after submission
     */
    disableInputs() {
        if (this.currentTestData.type === 'split-layout') {
            const questionRange = this.getQuestionRange();
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                const inp = document.getElementById(`q${i}`);
                if (inp) inp.disabled = true;
            }
        } else if (this.currentTestData.type === 'matching') {
            document.querySelectorAll('.answer-input').forEach(input => {
                input.disabled = true;
            });
        } else {
            const radios = document.querySelectorAll('input[type="radio"]');
            radios.forEach(r => r.disabled = true);
        }
    }

    /**
     * Setup resizable panels
     */
    setupResizers() {
        const resizer = document.getElementById('resizer');
        const readingPanel = document.getElementById('readingPanel');
        const questionsPanel = document.getElementById('questionsPanel');

        if (!resizer || !readingPanel || !questionsPanel) return;

        let isResizing = false;

        resizer.addEventListener('mousedown', () => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

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

        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = 'default';
        });
    }

    setupExplanationPanel() {
        const explanationPanel = document.getElementById('explanationPanel');
        const explanationResizer = document.getElementById('explanationResizer');
        
        if (!explanationPanel || !explanationResizer) return;

        let isResizing = false;
        let startY, startHeight;

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

        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
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

// ============= READING HIGHLIGHT MANAGER - FIXED =============
class ReadingHighlightManager {
    constructor() {
        this.selectedRange = null;
        this.setupContextMenu();
    }

    /**
     * Expose global helper interface bridging manual highlighting
     * FIXED: Use event delegation to handle dynamic DOM changes
     */
    setupContextMenu() {
        // Sử dụng event delegation trên document để bắt contextmenu trong vùng đọc và câu hỏi
        document.addEventListener('contextmenu', (e) => {
            // Kiểm tra target có nằm trong vùng đọc hoặc vùng câu hỏi không
            const highlightArea = e.target.closest('.reading-content, .single-col, .left-col, .reading-card, .reading-passage, .questions-panel, #questionsContainer, .question-item, .questions-list');
            if (highlightArea) {
                const selection = window.getSelection();
                if (selection.toString().trim()) {
                    e.preventDefault();
                    this.selectedRange = selection.getRangeAt(0);
                    this.showContextMenu(e.pageX, e.pageY);
                }
            }
        });

        document.addEventListener('click', (e) => {
            const contextMenu = document.getElementById('contextMenu');
            if (contextMenu && !contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
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
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
    }

    /**
     * Programatically inject spans capturing the text using TreeWalker
     */
    highlightAnswerInReading(questionNum, referenceMap) {
        this.clearAllHighlights();

        if (!referenceMap) return;
        const info = referenceMap[`q${questionNum}`] || referenceMap[questionNum];
        if (!info) return;
        
        let card;
        if (info.cardId) {
            card = document.querySelector(`.reading-card[data-text-id="${info.cardId}"]`);
        } else if (info.reviewId) {
            card = document.querySelector(`.reading-card[data-review-id="${info.reviewId}"]`);
        }
        
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
                    } catch(e) { console.log("Tree span surround failed", e); }
                    break;
                }
            }
        });
        
        if (firstSpan) {
            firstSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            // Scroll to the card containing it at least
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    clearAllHighlights() {
        document.querySelectorAll('.dynamic-highlight').forEach(el => {
            const parent = el.parentNode;
            if (parent) {
                while (el.firstChild) {
                    parent.insertBefore(el.firstChild, el);
                }
                parent.removeChild(el);
            }
        });
        document.querySelectorAll('.question-item.highlight-question').forEach(el => {
            el.classList.remove('highlight-question');
        });
    }

    /**
     * FIXED: Apply manual highlighting with saved range
     */
    applyHighlight(color) {
        let range = this.selectedRange;
        if (!range) {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            range = selection.getRangeAt(0);
        }
        try {
            const span = document.createElement('span');
            span.className = `highlight-${color}`;
            span.appendChild(range.extractContents());
            range.insertNode(span);
        } catch(e) {
            console.log("Could not highlight", e);
        }
        // Xóa selection và đóng menu
        window.getSelection().removeAllRanges();
        this.hideContextMenu();
        this.selectedRange = null;
    }

    /**
     * FIXED: Remove highlighting with saved range and TreeWalker
     */
    removeHighlight() {
        let range = this.selectedRange;
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
        this.selectedRange = null;
    }
}

/**
 * Storage extraction for the PET module architecture
 */
class ReadingStorageManager {
    saveResults(testData, userAnswers) {
        const details = [];
        let correctCount = 0;

        const questions = testData.questions || 
                          Object.keys(testData.answerKey).map(k => ({ num: parseInt(k.replace('q','')) })).filter(q => !isNaN(q.num));
                          
        const questionRangeStart = Math.min(...questions.map(q => q.num));
        const questionRangeEnd = Math.max(...questions.map(q => q.num));
        
        for (let i = questionRangeStart; i <= questionRangeEnd; i++) {
            const userAns = userAnswers[i];
            const keyAns = testData.answerKey[`q${i}`] || testData.answerKey[i];
            const correct = userAns && userAns.toString().toUpperCase() === keyAns.toString().toUpperCase();
            
            if (correct) correctCount++;
            
            details.push({
                num: i,
                userAnswer: userAns || '-',
                correctAnswer: keyAns,
                correct: correct
            });
        }

        const metadata = this.parseTestInfo(document.querySelector('.candidate')?.textContent || '');
        const resultKey = `pet_reading_book${metadata.book}_test${metadata.test}_part${metadata.part}`;
        
        const result = {
            timestamp: new Date().toISOString(),
            part: testData.part,
            correctCount: correctCount,
            total: details.length,
            details: details
        };

        try {
            localStorage.setItem(resultKey, JSON.stringify(result));
            console.log('Results saved:', resultKey, result);
        } catch(e) {
            console.error('Failed to save results:', e);
        }
    }

    parseTestInfo(candidateText) {
        // Example: "B1 Preliminary 1 · Test 1 · Part 1 (Reading)"
        const parts = candidateText.split('·');
        let book = 1, test = 1, part = 1;
        
        if (parts.length >= 1) {
            const match1 = parts[0].match(/Preliminary (\d+)/);
            if (match1) book = parseInt(match1[1]);
        }
        if (parts.length >= 2) {
            const match2 = parts[1].match(/Test (\d+)/);
            if (match2) test = parseInt(match2[1]);
        }
        if (parts.length >= 3) {
            const match3 = parts[2].match(/Part (\d+)/);
            if (match3) part = parseInt(match3[1]);
        }
        
        return { book, test, part };
    }
}

/**
 * UI Manager for Reading tests
 */
class ReadingUIManager {
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
    }

    setFontSize(size) {
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`font${size.charAt(0).toUpperCase() + size.slice(1)}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Target content directly instead of overriding classes fully
        document.querySelectorAll('.reading-content, .questions-list, #testWrapper').forEach(el => {
            el.classList.remove('font-small', 'font-medium', 'font-large');
            el.classList.add(`font-${size}`);
        });
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        // Restore
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

    setupModeToggle() {
        const modeToggle = document.getElementById('modeToggle');
        const styleLink = document.getElementById('styleLink');
        const testWrapper = document.getElementById('testWrapper');
        
        if (!modeToggle || !styleLink || !testWrapper) return;

        const setMode = (isClassic) => {
            if (isClassic) {
                styleLink.href = 'reading-pet-common1.css';
                testWrapper.classList.add('classic-mode');
                document.documentElement.removeAttribute('data-theme');
                localStorage.removeItem('pet-theme');
            } else {
                styleLink.href = 'reading-pet-common.css';
                testWrapper.classList.remove('classic-mode');
            }
            localStorage.setItem('pet-mode', isClassic ? 'classic' : 'modern');
            // Force reflow để áp dụng style ngay
            void document.body.offsetHeight;
        };

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

    setupResizer() {
        const readingPanel = document.getElementById('readingPanel');
        const questionsPanel = document.getElementById('questionsPanel');
        const resizer = document.getElementById('resizer');
        
        if (!readingPanel || !questionsPanel || !resizer) return;

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
            
            readingPanel.style.width = leftWidth + 'px';
            questionsPanel.style.width = (rect.width - leftWidth - 8) + 'px';
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = 'default';
        });
    }

    setupExplanationPanel() {
        const explanationPanel = document.getElementById('explanationPanel');
        const explanationResizer = document.getElementById('explanationResizer');
        
        if (!explanationPanel || !explanationResizer) return;

        let isResizing = false;
        let startY, startHeight;

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

        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
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

// Ensure the context menu functions are mapped globally so the HTML onclick="applyHighlight('yellow')" handlers still fire correctly.
window.applyHighlight = function(color) {
    if (window.readingCore && window.readingCore.highlightManager) {
        window.readingCore.highlightManager.applyHighlight(color);
    }
};

window.removeHighlight = function() {
    if (window.readingCore && window.readingCore.highlightManager) {
        window.readingCore.highlightManager.removeHighlight();
    }
};

// Export globally for the HTML wrappers
window.ReadingCore = ReadingCore;
window.ReadingHighlightManager = ReadingHighlightManager;
window.ReadingStorageManager = ReadingStorageManager;
window.ReadingUIManager = ReadingUIManager;
