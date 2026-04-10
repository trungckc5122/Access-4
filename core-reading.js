/**
 * CORE READING ENGINE - PET B1 PRELIMINARY
 * Contains all functionality for reading tests across all parts and tests
 * Compatible with PET 1 & PET 2, Tests 1-4, Parts 1-6
 * 
 * CHANGELOG:
 * - Added autosave draft feature (save progress automatically)
 * - Reset now also clears saved results and draft
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
            
            if (draft.type === 'multiple-choice' || draft.type === 'inline-radio') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const ans = draft[`q${i}`];
                    if (!ans) continue;
                    const radio = document.querySelector(`input[name="q${i}"][value="${ans}"]`);
                    if (radio) {
                        radio.checked = true;
                        if (draft.type === 'inline-radio') {
                            this.updateInlineSlotFromRadio(i);
                        }
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
                // Khôi phục drag-drop
                const slotState = draft.slotState || {};
                for (const [qNumStr, value] of Object.entries(slotState)) {
                    const qNum = parseInt(qNumStr);
                    if (value && value.value) {
                        this.placeInSlot(qNum, value.value);
                    }
                }
            } else if (draft.type === 'split-layout') {
                for (let i = questionRange.start; i <= questionRange.end; i++) {
                    const ans = draft[`q${i}`];
                    if (ans === undefined) continue;
                    const inp = document.getElementById(`q${i}`);
                    if (inp) inp.value = ans;
                }
            }
            
            console.log('[Reading Draft] SUCCESSFULLY loaded for', this.currentTestData?.title || 'reading test');
            this.updateAnswerCount();
            return true;
        } catch (e) {
            console.warn('[Reading Draft] FAILED to load:', e);
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
        this.uiManager.setupFontControls();
        this.uiManager.setupThemeToggle();
        this.uiManager.setupModeToggle();
        
        // Only set up standard resizers if not using split-layout dynamic generation
        if (this.currentTestData.type !== 'split-layout') {
            this.uiManager.setupResizer();
            this.uiManager.setupExplanationPanel();
        }
    }

    /**
     * Render questions based on standard test types
     */
    renderQuestions() {
        const container = document.getElementById('questionsContainer');
        if (!container) return;

        container.innerHTML = '';

        if (this.currentTestData.type === 'multiple-choice') {
            this.currentTestData.questions.forEach(q => {
                const div = document.createElement('div');
                div.className = 'question-item';
                div.id = `question-${q.num}`;
                
                const introHtml = q.intro
                    ? `<div class="question-intro">${q.num}. ${q.intro}</div>`
                    : `<div class="question-num-only">${q.num}.</div>`;
                    
                div.innerHTML = `
                    ${introHtml}
                    <div class="options">
                        ${q.options.map((opt, idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            return `
                                <div class="option">
                                    <input type="radio" name="q${q.num}" value="${letter}" id="q${q.num}${letter}">
                                    <label for="q${q.num}${letter}">${letter} ${opt}</label>
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
                        <label for="answer-${q.num}">Your answer (letter A–H):</label>
                        <input type="text" id="answer-${q.num}" class="answer-input" maxlength="1" placeholder="A–H" autocomplete="off">
                        <span class="eye-icon" data-question="${q.num}">👁️</span>
                    </div>
                `;
                container.appendChild(div);
                
                // Add enforcing A-H formatting
                const input = document.getElementById(`answer-${q.num}`);
                if (input) {
                    input.addEventListener('input', function() {
                        this.value = this.value.toUpperCase().replace(/[^A-H]/g, '');
                        // Force a dispatch to update the answer count via the global listener
                        this.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                }
            });
        }
    }

    // ==================== PART 4: DRAG & DROP ====================
    setupDragDropEvents() {
        const sentenceEls = document.querySelectorAll('.sentence-item');
        let touchSelected = null;

        document.querySelectorAll('.sentence-item').forEach(item => {
            item.addEventListener('dragstart', e => {
                item.classList.add('dragging');
                e.dataTransfer.setData('text/plain', item.getAttribute('data-value'));
                e.dataTransfer.effectAllowed = 'move';
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
            // Touch/Click to select support
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

        // Setup remove chips
        document.querySelectorAll('.remove-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent bubbling to drop target
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
                if(contentEl) contentEl.textContent = displayText;
                slot.setAttribute('data-selected', value);
                if(removeEl) removeEl.style.display = 'inline';
            } else {
                if(contentEl) contentEl.textContent = slot.classList.contains('inline-drop-slot') ? `[ ${qNum} ]` : '';
                slot.removeAttribute('data-selected');
                if(removeEl) removeEl.style.display = 'none';
            }
        });

        this.slotState[qNum] = value ? { value, text } : null;
        this.saveDraftImmediate(); // Drag-drop: save immediately
    }

    placeInSlot(qNum, value) {
        const sentEl = this.getPart4Sentence(value);
        const text = sentEl ? sentEl.querySelector('.sentence-text').textContent.trim() : value;

        // If this sentence is already in another slot, clear that slot first
        for (const [key, state] of Object.entries(this.slotState)) {
            if (state && state.value === value && parseInt(key) !== qNum) {
                this.setSlotContent(parseInt(key), null, null);
            }
        }

        // Return old sentence to bank
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

    // ==================== PART 5: INLINE RADIO ====================
    renderInlineRadioQuestions() {
        const container = document.getElementById('questionsContainer');
        if (!container) return;
        container.innerHTML = '';
        
        const optionsList = this.currentTestData.optionsList;
        const qRange = this.getQuestionRange();

        for (let i = qRange.start; i <= qRange.end; i++) {
            const qDiv = document.createElement('div');
            qDiv.className = 'question-item';
            qDiv.id = `question-${i}`;
            
            const optionsHtml = optionsList[i].map(opt => {
                const letter = opt.charAt(0);
                return `<label><input type="radio" name="q${i}" value="${letter}"> ${opt}</label>`;
            }).join('');
            
            qDiv.innerHTML = `
                <div class="question-text">${i}.</div>
                <div class="answer-input-area">
                    <div class="radio-group" id="radio-group-${i}">${optionsHtml}</div>
                    <span class="eye-icon" data-question="${i}">👁️</span>
                </div>
            `;
            container.appendChild(qDiv);

            // Add listener to update inline gap
            const radios = qDiv.querySelectorAll(`input[name="q${i}"]`);
            radios.forEach(radio => {
                radio.addEventListener('change', () => {
                    this.updateInlineSlotFromRadio(i);
                    this.saveDraftImmediate(); // Radio change: save immediately
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

    /**
     * Render single column layout for fill-in-the-blank text (Part 6)
     */
    renderSingleColumn() {
        const mainArea = document.getElementById('mainArea');
        if (!mainArea || !this.currentTestData.template) return;
        
        mainArea.innerHTML = `
            <div class="single-col">
                <div class="part-header">
                    <h3>Questions ${this.getQuestionRange().start}-${this.getQuestionRange().end}</h3>
                    <p>For each question, write the correct answer. Write one word for each gap.</p>
                </div>
                ${this.currentTestData.template}
            </div>
        `;
    }

    /**
     * Render split column layout for fill-in-the-blank text (Part 6)
     */
    renderSplitColumn() {
        const mainArea = document.getElementById('mainArea');
        if (!mainArea || !this.currentTestData.template) return;
        
        mainArea.innerHTML = `
            <div class="split-container">
                <div class="left-col">
                    <div class="part-header">
                        <h3>Questions ${this.getQuestionRange().start}-${this.getQuestionRange().end}</h3>
                        <p>For each question, write the correct answer. Write one word for each gap.</p>
                    </div>
                    ${this.currentTestData.template}
                </div>
                <div class="right-col" id="rightCol">
                    <div class="explanation-header">
                        <span>Giải thích</span>
                        <span class="close-explanation-btn" id="closeRightExplain">✕ Đóng</span>
                    </div>
                    <div class="explanation-content" id="rightExplanationText">
                        Nhấn vào biểu tượng con mắt bên cạnh mỗi câu để xem giải thích.
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('closeRightExplain')?.addEventListener('click', () => {
            const col = document.getElementById('rightCol');
            if (col) col.classList.remove('show');
        });
    }

    /**
     * Setup event listeners for forms and interaction inside custom template (Part 6)
     */
    attachInputEvents() {
        document.querySelectorAll('.gap-input').forEach(inp => {
            if (this.examSubmitted) {
                inp.disabled = true;
                const val = inp.value.trim();
                const correct = this.isAnswerCorrect(parseInt(inp.dataset.q), val);
                inp.classList.add(correct ? 'correct' : 'incorrect');
            }
            inp.addEventListener('input', () => {
                this.updateAnswerCount();
                this.saveDraft(); // Text input: debounced save
            });
        });
        
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

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Form input states - radio buttons lưu NGAY, text input lưu debounced
        document.addEventListener('change', (e) => {
            if (e.target && e.target.matches('input[type="radio"]')) {
                this.updateAnswerCount();
                this.saveDraftImmediate(); // Radio: lưu ngay
            } else if (e.target && e.target.matches('input[type="text"]')) {
                this.updateAnswerCount();
                this.saveDraft(); // Text: debounce
            }
        });
        
        // Input event cho text fields (real-time save)
        document.addEventListener('input', (e) => {
            if (e.target && (e.target.matches('input[type="text"]') || e.target.matches('.gap-input') || e.target.matches('.answer-input'))) {
                this.updateAnswerCount();
                this.saveDraft(); // Debounced
            }
        });
        
        // Eye icon click handler for standard types
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('eye-icon') && !e.target.dataset.q) {
                const qNum = e.target.dataset.question;
                if (qNum) {
                    this.showExplanation(parseInt(qNum));
                }
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

        // Close explanation panel for standard layout
        document.getElementById('closeExplanation')?.addEventListener('click', () => {
            this.closeExplanation();
        });
    }

    /**
     * Build navigation controls map
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
            
            // Allow dataset match to Part 6 structure dataset.q setup
            btn.dataset.q = i;
            
            btn.addEventListener('click', () => {
                this.scrollToQuestion(i);
                this.setActiveNavButton(i);
            });
            
            nav.appendChild(btn);
        }
    }

    /**
     * Discover question range dynamically
     */
    getQuestionRange() {
        if (!this.currentTestData) return { start: 1, end: 5 };
        
        if (this.currentTestData.questions) {
            const numbers = this.currentTestData.questions.map(q => q.num).sort((a, b) => a - b);
            return {
                start: numbers[0] || 1,
                end: numbers[numbers.length - 1] || 5
            };
        }
        
        if (this.currentTestData.answerKey) {
            const keys = Object.keys(this.currentTestData.answerKey)
                .map(k => parseInt(k.replace('q', '')))
                .filter(n => !isNaN(n))
                .sort((a, b) => a - b);
            if (keys.length > 0) {
                return { start: keys[0], end: keys[keys.length - 1] };
            }
        }
        
        return { start: 1, end: 5 };
    }

    /**
     * Retrieve the user's answer
     */
    getUserAnswer(questionNum) {
        if (this.currentTestData.type === 'multiple-choice' || this.currentTestData.type === 'inline-radio') {
            const radios = document.getElementsByName(`q${questionNum}`);
            for (let radio of radios) {
                if (radio.checked) return radio.value;
            }
            return null;
        } else if (this.currentTestData.type === 'drag-drop') {
            return this.slotState[questionNum] ? this.slotState[questionNum].value : null;
        } else if (this.currentTestData.type === 'matching') {
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

    /**
     * Verification check against answerKey
     */
    isAnswerCorrect(questionNum, userAnswer) {
        if (!userAnswer) return false;
        
        const keyMap = this.currentTestData.answerKey[`q${questionNum}`] || this.currentTestData.answerKey[questionNum];
        
        if (Array.isArray(keyMap)) {
            // Support multiple correct alternatives (e.g. ['every', 'each'])
            return keyMap.some(correct => userAnswer.toLowerCase() === correct.toLowerCase());
        } else if (typeof keyMap === 'string') {
            return userAnswer.toLowerCase() === keyMap.toLowerCase();
        }
        return false;
    }

    /**
     * Set active nav class
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
     * Scroll into view for a question
     */
    scrollToQuestion(questionNum) {
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
                           `<strong>Đáp án: ${customAnsDisplay}</strong><br>`;
                
                if (this.examSubmitted) {
                    const userAnswer = this.getUserAnswer(questionNum) || '(chưa chọn/điền)';
                    const isCorrect = this.isAnswerCorrect(questionNum, userAnswer);
                    
                    html += `<div style="margin-top:10px;padding:10px; background:${isCorrect ? '#e8f5e8' : '#ffebee'}; border-radius:5px;">`;
                    html += `<strong>Câu trả lời của bạn:</strong> ${userAnswer}<br>`;
                    if (!isCorrect) {
                        html += `<strong>Đáp án đúng:</strong> ${customAnsDisplay}`;
                    } else {
                        html += `<strong>✅ Đúng!</strong>`;
                    }
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
        if (explanationPanel) {
            explanationPanel.classList.remove('show');
        }
        this.highlightManager.clearAllHighlights();
    }

    handleReset() {
        if (confirm('Reset tất cả câu trả lời?')) {
            this.resetAll();
        }
    }

    resetAll() {
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

        // === MỚI: Xóa cả kết quả đã lưu và nháp ===
        const completedKey = this.getStorageKey(false);
        localStorage.removeItem(completedKey);
        this.clearDraft();

        this.updateAnswerCount();
    }

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
            document.querySelectorAll('input[type="text"].answer-input').forEach(input => {
                input.disabled = true;
            });
        }
        // Split-layout handles disabled fields directly within submit hook
    }

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
 * Highlighting functionalities inside the text content pane
 */
class ReadingHighlightManager {
    constructor() {
        this.selectedRange = null;
        this.setupContextMenu();
    }

    /**
     * Expose global helper interface bridging manual highlighting
     */
    setupContextMenu() {
        const attachMenu = (el) => {
            if (!el) return;
            el.addEventListener('contextmenu', (e) => {
                const target = e.target.closest('.reading-card') || e.target.closest('.reading-content');
                if (target) {
                    const sel = window.getSelection();
                    if (sel.toString().trim()) {
                        e.preventDefault();
                        this.selectedRange = sel.getRangeAt(0);
                        this.showContextMenu(e.pageX, e.pageY);
                    }
                }
            });
        };

        // Delay attaching to ensure DOM load
        setTimeout(() => {
            attachMenu(document.getElementById('readingContent'));
            attachMenu(document.getElementById('mainArea')); // Fallback for Part 6
        }, 500);

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

    applyHighlight(color) {
        if (!this.selectedRange) return;
        try {
            const span = document.createElement('span');
            span.className = `highlight-${color}`;
            // Use extract/append approach to avoid element-breaking surround failures
            span.appendChild(this.selectedRange.extractContents());
            this.selectedRange.insertNode(span);
        } catch(e) { 
            console.log("Could not highlight element bound properly.", e); 
        }
        this.hideContextMenu();
        this.selectedRange = null;
    }

    removeHighlight() {
        if (!this.selectedRange) return;
        // Target specifically our custom highlight spans
        document.querySelectorAll('.highlight-yellow,.highlight-green,.highlight-pink').forEach(h => {
             if (this.selectedRange.intersectsNode(h)) {
                 const parent = h.parentNode;
                 while (h.firstChild) {
                     parent.insertBefore(h.firstChild, h);
                 }
                 parent.removeChild(h);
             }
        });
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
            const userAnswer = userAnswers[i];
            const answerKeyRaw = testData.answerKey[`q${i}`] || testData.answerKey[i];
            
            // Revalidate internally
            let isCorrect = false;
            if (userAnswer) {
                if (Array.isArray(answerKeyRaw)) {
                    isCorrect = answerKeyRaw.some(correct => userAnswer.toLowerCase() === correct.toLowerCase());
                } else if (typeof answerKeyRaw === 'string') {
                    isCorrect = userAnswer.toLowerCase() === answerKeyRaw.toLowerCase();
                }
            }
            
            if (isCorrect) correctCount++;

            const correctAnswerString = testData.displayAnswers[`q${i}`] || testData.displayAnswers[i] || answerKeyRaw;

            details.push({
                question: i,
                user: userAnswer || '(trống)',
                correct: correctAnswerString,
                isCorrect: isCorrect
            });
        }

        const partId = testData.part || this.parseTestInfo(document.title).part;
        const partData = {
            partId: partId,
            name: `Part ${partId}`,
            totalQuestions: details.length,
            correctCount: correctCount,
            details: details
        };

        const { book, test, part } = testData.metadata || this.parseTestInfo(document.querySelector('.candidate')?.textContent || document.title);
        const resolvedPart = testData.part || part;
        
        const key = `pet_reading_book${book}_test${test}_part${resolvedPart}`;
        
        localStorage.setItem(key, JSON.stringify(partData));
        console.log(`Results saved with key: ${key}`);
    }

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
 * Interactive DOM controls manipulation
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
