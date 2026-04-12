/**
 * CORE LISTENING ENGINE - PET B1 PRELIMINARY
 * Contains all functionality for listening tests across all parts and tests
 * Compatible with PET 1 & PET 2, Tests 1-4, Parts 1-4
 * 
 * CHANGELOG:
 * - Added autosave draft feature (save progress automatically)
 * - Reset now also clears saved results and draft
 * - ✅ FIX v2.1: Fixed autosave issue when resetting (timeout 0→500, hasAnswers check)
 * - ✅ NEW: Added Floating Sticky Note feature
 */

/**
 * PETNoteManager - Handles the draggable, resizable sticky notes
 */
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

        // Restore position
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

        // === MỚI: Note Manager ===
        this.noteManager = new PETNoteManager(this);
        this.noteManager.init();
        
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
        const { book, test, part } = this.getTestMeta();
        
        let key = `pet_listening_book${book}_test${test}_part${part}`;
        if (isDraft) key += '_draft';
        
        console.log('[Draft] Generated key:', key, '(isDraft:', isDraft, ')');
        return key;
    }

    /**
     * Lấy thông tin metadata của test hiện tại
     */
    getTestMeta() {
        const d = this.currentTestData;
        if (!d) return { book: 1, test: 1, part: 1 };
        
        let book = d.book, test = d.test, part = d.part;
        
        // Nếu thiếu metadata, parse từ title
        if (!book || !test || !part) {
            const parsed = this.storageManager.parseTestInfo(d.title);
            book = book || parsed.book;
            test = test || parsed.test;
            part = part || parsed.part;
        }
        
        return { book, test, part };
    }

    /**
     * Chuyển sang Part khác trong cùng Test
     */
    goToPart(direction) {
        const { book, test, part } = this.getTestMeta();
        const targetPart = part + direction;
        
        // Listening PET có 4 part
        if (targetPart < 1 || targetPart > 4) return;
        
        const targetUrl = `lis-pet${book}-test${test}-part${targetPart}.html`;
        console.log(`[Navigation] Redirecting to: ${targetUrl}`);
        window.location.href = targetUrl;
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
     * ✅ FIX v2.1: Lưu nháp vào localStorage (có debounce)
     * Thêm kiểm tra: 1. _isResetting early return
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

            // Notify dashboard of draft update via BroadcastChannel
            try {
                const channel = new BroadcastChannel('pet_update_channel');
                channel.postMessage({
                    action: 'status_updated',
                    type: 'listening',
                    book: this.currentTestData.book,
                    test: this.currentTestData.test,
                    part: this.currentTestData.part,
                    status: 'in-progress'
                });
                channel.close();
            } catch (e) {
                console.warn('BroadcastChannel error:', e);
            }
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
        // 1. Inject UI elements before setting up events
        this.uiManager.injectHeaderControls(this);
        this.uiManager.injectModeToggle();
        this.injectNoteButton();

        // 2. Setup behaviors
        this.uiManager.setupFontControls();
        this.uiManager.setupThemeToggle();
        this.uiManager.setupModeToggle();
        this.uiManager.setupResizer();
        this.uiManager.setupExplanationPanel();
        
        // Setup auto-collapse for header/footer
        this.uiManager.setupAutoCollapse(this);
    }

    /**
     * Inject Note button into the bottom bar dynamically
     */
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
        
        // Insert before submit button if possible
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.parentNode.insertBefore(noteBtn, submitBtn);
        } else {
            bottomBar.appendChild(noteBtn);
        }
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
                console.log('[Draft] beforeunload blocked during reset');
            }
        });

        // 2. pagehide - iOS Safari, bfcache (Chrome/Firefox khi bấm Back)
        window.addEventListener('pagehide', () => {
            // ✅ FIX: Kiểm tra _isResetting
            if (!this._isResetting) {
                this.saveDraftImmediate();
            } else {
                console.log('[Draft] pagehide blocked during reset');
            }
        });

        // 3. visibilitychange - khi chuyển tab, minimize, hoặc app chuyển nền (mobile)
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
     * ✅ FIX v2.1: Setup event listeners - kiểm tra _isResetting
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
                this.saveDraft(); // Debounce: lưu sau 0.3s
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

        // Xóa các nhãn văn bản không liên quan trong thanh điều hướng
        const parent = nav.parentElement;
        if (parent && parent.classList.contains('question-nav')) {
            parent.querySelectorAll('span').forEach(s => {
                // Giữ lại các badge thông tin quan trọng nếu có (hiện tại PET không dùng nhiều)
                if (!s.classList.contains('answer-badge')) {
                    s.remove();
                }
            });
        }

        nav.innerHTML = '';
        
        const { part } = this.getTestMeta();
        
        // Nút Part trước
        const prevPartBtn = document.createElement('button');
        prevPartBtn.className = 'nav-arrow-btn nav-prev-part';
        prevPartBtn.title = 'Part trước';
        prevPartBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Previous Part</span>
        `;
        if (part <= 1) {
            prevPartBtn.disabled = true;
        } else {
            prevPartBtn.addEventListener('click', () => {
                if (confirm('Bạn có muốn chuyển sang Part trước đó không?')) {
                    this.goToPart(-1);
                }
            });
        }
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
        
        // Nút Part sau
        const nextPartBtn = document.createElement('button');
        nextPartBtn.className = 'nav-arrow-btn nav-next-part';
        nextPartBtn.title = 'Part tiếp theo';
        nextPartBtn.innerHTML = `
            <span>Next Part</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        `;
        if (part >= 4) {
            nextPartBtn.disabled = true;
        } else {
            nextPartBtn.addEventListener('click', () => {
                if (confirm('Bạn có muốn chuyển sang Part tiếp theo không?')) {
                    this.goToPart(1);
                }
            });
        }
        nav.appendChild(nextPartBtn);
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

        // Notify dashboard of status update via BroadcastChannel
        try {
            const channel = new BroadcastChannel('pet_update_channel');
            channel.postMessage({
                action: 'status_updated',
                type: 'listening',
                book: this.currentTestData.book,
                test: this.currentTestData.test,
                part: this.currentTestData.part,
                status: 'completed'
            });
            channel.close();
        } catch (e) {
            console.warn('BroadcastChannel error:', e);
        }

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
     * ✅ FIX v2.1: Handle reset button click
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

        const completedKey = this.getStorageKey(false);
        const draftKey = this.getStorageKey(true);

        // ✅ FIX: Xóa localStorage ngay (SKIP NOTE)
        localStorage.removeItem(completedKey);
        localStorage.removeItem(draftKey);
        console.log('[Reset] Deleted keys using getStorageKey():', completedKey, draftKey);

        // ✅ FIX: Get book/test/part for BroadcastChannel
        const d = this.currentTestData;
        let book = d.book, test = d.test, part = d.part;
        if (!book || !test || !part) {
            const parsed = this.storageManager.parseTestInfo(d.title);
            book = book || parsed.book;
            test = test || parsed.test;
            part = part || parsed.part;
        }

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

        // ✅ FIX: DELAY LÂU HƠN - 500ms thay vì 0ms
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
     * Inject header controls (Font buttons, Theme toggle)
     */
    injectHeaderControls(coreInstance) {
        const header = document.querySelector('.ielts-header');
        if (!header) return;

        // 1. Update Candidate Name from testData if possible
        const candidateEl = header.querySelector('.candidate');
        if (candidateEl && coreInstance.currentTestData && coreInstance.currentTestData.title) {
            candidateEl.textContent = coreInstance.currentTestData.title;
        }

        // 2. Inject Font Controls if not present
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

        // 3. Inject Theme Toggle if not present
        if (!document.getElementById('themeToggle')) {
            const themeBtn = document.createElement('button');
            themeBtn.className = 'theme-toggle-btn';
            themeBtn.id = 'themeToggle';
            themeBtn.title = 'Chuyển đổi Dark/Light mode';
            themeBtn.innerHTML = `
                <span class="icon-moon">🌙</span>
                <span class="icon-sun">☀️</span>
            `;
            header.appendChild(themeBtn);
        }

        // Load saved theme
        const savedTheme = localStorage.getItem('pet-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    /**
     * Setup theme toggle
     */
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        const html = document.documentElement;
        const testWrapper = document.getElementById('testWrapper');

        themeToggle.addEventListener('click', () => {
            // Dark mode is not allowed in classic mode
            if (testWrapper && testWrapper.classList.contains('classic-mode')) return;
            
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('pet-theme', newTheme);
        });

        // Load saved theme
        const savedTheme = localStorage.getItem('pet-theme') || 'light';
        // Only apply dark theme if not in classic mode
        if (savedTheme === 'dark' && testWrapper && !testWrapper.classList.contains('classic-mode')) {
            html.setAttribute('data-theme', 'dark');
        } else if (savedTheme === 'dark' && !testWrapper) {
            // Fallback for pages without testWrapper
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
        
        // Tìm vị trí chèn: sau font-controls hoặc ở cuối brand
        const fontControls = header.querySelector('.font-controls');
        if (fontControls) {
            fontControls.insertAdjacentElement('afterend', container);
        } else {
            header.appendChild(container);
        }
    }

    /**
     * Setup mode toggle (classic/modern) events and initial state
     */
    setupModeToggle() {
        const modeToggle = document.getElementById('modeToggle');
        const styleLink = document.getElementById('styleLink');
        const themeToggle = document.getElementById('themeToggle'); // Dark mode button
        const html = document.documentElement;
        const storageKey = 'pet-mode'; // Unified key

        if (!modeToggle || !styleLink) return;

        const setMode = (isClassic) => {
            if (isClassic) {
                // Switch to classic mode
                styleLink.href = styleLink.href.replace('listening-pet-common.css', 'listening-pet-common1.css');
                // Hide dark mode button in classic mode
                if (themeToggle) themeToggle.style.display = 'none';
                // Remove dark theme attribute
                html.removeAttribute('data-theme');
            } else {
                // Switch to modern mode
                styleLink.href = styleLink.href.replace('listening-pet-common1.css', 'listening-pet-common.css');
                // Show dark mode button in modern mode
                if (themeToggle) themeToggle.style.display = 'flex';
                
                // Restore saved dark mode preference if in modern mode
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme === 'dark') {
                    html.setAttribute('data-theme', 'dark');
                }
            }
            localStorage.setItem(storageKey, isClassic ? 'classic' : 'modern');
            // Force reflow
            void document.body.offsetHeight;
        };

        // Restore saved mode
        const savedMode = localStorage.getItem(storageKey);
        if (savedMode === 'classic') {
            modeToggle.checked = true;
            setMode(true);
        } else {
            modeToggle.checked = false;
            setMode(false);
        }

        // Handle toggle change
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