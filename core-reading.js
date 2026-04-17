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

/**
 * MiniDashboardManager - Popup showing progress across all parts with PET scores
 */
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

        // Restore position 
        const posStr = localStorage.getItem('mini-dashboard-pos');
        if (posStr) {
            try {
                const pos = JSON.parse(posStr);
                Object.assign(this.panel.style, pos);
            } catch (e) { }
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

    // Tính điểm PET scale (120-170) từ số câu đúng
    calculatePETScore(correct, maxQuestions) {
        if (correct === 0) return null;
        // PET scale approximation: 120 + (correct/max) * 50
        const percentage = correct / maxQuestions;
        let score = Math.round(120 + percentage * 50);
        return Math.min(170, Math.max(120, score));
    }

    refreshData() {
        const meta = this.core.getTestMeta();
        const book = meta.book;
        const test = meta.test;

        const titleEl = document.getElementById('mini-dashboard-title');
        if (titleEl) titleEl.textContent = `PET ${book} - Test ${test}`;

        const readingData = this.fetchSkillData('reading', book, test);
        const listeningData = this.fetchSkillData('listening', book, test);

        this.renderContent(readingData, listeningData);
    }

    fetchSkillData(skill, book, test) {
        const parts = skill === 'reading' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4];

        return parts.map(part => {
            let keyCompleted = `pet_${skill}_book${book}_test${test}_part${part}`;
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
        const totalAnswered = maxQuestions; // Total questions for this skill
        const hasAnyData = data.some(d => d.type !== 'empty');

        return {
            correct: totalCorrect,
            total: totalAnswered,
            hasData: hasAnyData,
            petScore: this.calculatePETScore(totalCorrect, totalAnswered)
        };
    }

    renderContent(readingData, listeningData) {
        if (!this.contentArea) return;

        const meta = this.core.getTestMeta();

        // Calculate stats for each skill
        const readingStats = this.calculateSkillStats(readingData, 35); // Reading: 35 questions total
        const listeningStats = this.calculateSkillStats(listeningData, 25); // Listening: 25 questions total

        const renderSection = (title, data, stats, isReading) => {
            // Determine score display
            let scoreHtml;
            if (!stats.hasData) {
                scoreHtml = '<span class="not-done">Chưa làm</span>';
            } else if (stats.petScore) {
                scoreHtml = `${stats.correct}/${stats.total} đúng → <strong>${stats.petScore}</strong> điểm`;
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
                let url = isReading ? `read-pet${meta.book}-test${meta.test}-part${d.part}.html` : `lis-pet${meta.book}-test${meta.test}-part${d.part}.html`;

                const isCurrent = Number(meta.part) === Number(d.part) && this.skillType === (isReading ? 'reading' : 'listening');
                const currentClass = isCurrent ? 'current' : '';

                if (isCurrent) {
                    sectionHtml += `
                        <div class="part-item ${currentClass}" title="Bạn đang ở Part này" style="cursor: default;">
                            <span>Part ${d.part}</span>
                            <span class="part-status ${statusClass}">${displayVal} ${statusIcon}</span>
                        </div>
                    `;
                } else {
                    sectionHtml += `
                        <a href="${url}" class="part-item ${currentClass}" target="_blank" onclick="return confirm('Mở Part ${d.part} trong tab mới?')">
                            <span>Part ${d.part}</span>
                            <span class="part-status ${statusClass}">${displayVal} ${statusIcon}</span>
                        </a>
                    `;
                }
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

        // Broadcast channel listener
        try {
            this.channel = new BroadcastChannel('pet_update_channel');
            this.channel.addEventListener('message', () => {
                if (this.isVisible) this.refreshData();
            });
        } catch (e) {
            console.warn('BroadcastChannel not supported', e);
        }

        // Window storage event
        window.addEventListener('storage', (e) => {
            if (e.key && (e.key.startsWith('pet_') || e.key === 'mini-dashboard-pos') && this.isVisible) {
                if (e.key === 'mini-dashboard-pos') {
                    try {
                        const pos = JSON.parse(e.newValue);
                        Object.assign(this.panel.style, pos);
                    } catch (err) { }
                } else {
                    this.refreshData();
                }
            }
        });
    }
}

/**
 * PETHelpManager - Floating guide panel for core interactions
 */
class PETHelpManager {
    constructor(core) {
        this.core = core;
        this.panel = null;
        this.isVisible = false;
        this.dragData = { isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 };
    }

    init() {
        if (document.getElementById('pet-help-panel')) return;
        this.createPanel();
        console.log('[Help] Initialized');
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'pet-help-panel';
        this.panel.className = 'pet-note-panel'; // Reuse sticky note style
        this.panel.style.display = 'none';
        this.panel.style.width = '350px';
        this.panel.style.height = 'auto';
        this.panel.style.maxHeight = '80vh';

        this.panel.innerHTML = `
            <div class="pet-note-header help-header" style="cursor: move; background: var(--header-bg) !important;">
                <div class="pet-note-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Hướng dẫn sử dụng
                </div>
                <div class="pet-note-controls">
                    <button class="pet-note-btn close-btn" onclick="window.readingCore.helpManager.hide()">✕</button>
                </div>
            </div>
            <div class="pet-note-content help-content" style="padding: 15px; overflow-y: auto; font-size: 14px; line-height: 1.6;">
                <div class="help-section" style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 8px 0; color: var(--primary); border-bottom: 1px solid var(--border-light); padding-bottom: 4px;">🖊️ Làm bài</h4>
                    <ul style="margin: 0; padding-left: 18px;">
                        <li>Nhấn chọn đáp án trực tiếp.</li>
                        <li>Gõ câu trả lời vào các ô trống (Part 6).</li>
                        <li>Kéo thả các lựa chọn vào vị trí trống (Part 4).</li>
                    </ul>
                </div>
                <div class="help-section" style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 8px 0; color: var(--primary); border-bottom: 1px solid var(--border-light); padding-bottom: 4px;">🖍️ Highlight (Bôi màu)</h4>
                    <ul style="margin: 0; padding-left: 18px;">
                        <li>Bôi đen văn bản và <b>Chuột phải</b> để chọn màu.</li>
                        <li>Dùng nút gạt <b>Highlight</b> ở thanh điều hướng để ẩn/hiện đánh dấu.</li>
                    </ul>
                </div>
                <div class="help-section" style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 8px 0; color: var(--primary); border-bottom: 1px solid var(--border-light); padding-bottom: 4px;">🛠️ Công cụ hỗ trợ</h4>
                    <ul style="margin: 0; padding-left: 18px;">
                        <li><b>Note</b>: Ghi chú nhanh các ý chính cho bài làm.</li>
                        <li><b>Tiến độ</b>: Xem trạng thái hoàn thành toàn bộ đề thi.</li>
                    </ul>
                </div>
                <div class="help-section">
                    <h4 style="margin: 0 0 8px 0; color: var(--primary); border-bottom: 1px solid var(--border-light); padding-bottom: 4px;">✅ Kết quả</h4>
                    <ul style="margin: 0; padding-left: 18px;">
                        <li>Nhấn <b>Submit</b> để nộp bài và xem đáp án giải thích.</li>
                        <li>Nhấn biểu tượng <b>👁️</b> bên cạnh câu hỏi để xem giải thích chi tiết.</li>
                    </ul>
                </div>
            </div>
        `;
        document.body.appendChild(this.panel);
        this.setupEvents();
    }

    setupEvents() {
        const header = this.panel.querySelector('.pet-note-header');

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
            this.dragData.isDragging = false;
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopDrag);
        };

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            this.dragData.isDragging = true;
            this.dragData.startX = e.clientX;
            this.dragData.startY = e.clientY;
            const rect = this.panel.getBoundingClientRect();
            this.dragData.initialX = rect.left;
            this.dragData.initialY = rect.top;
            this.panel.style.transition = 'none';
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
        });
    }

    toggle() {
        if (this.isVisible) this.hide();
        else this.show();
    }

    show() {
        if (!this.panel) this.createPanel();
        this.panel.style.display = 'flex';
        this.isVisible = true;
    }

    hide() {
        if (this.panel) this.panel.style.display = 'none';
        this.isVisible = false;
    }
}


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

        // State cho toggle highlight cá nhân
        this.personalHighlightsVisible = true;
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
        } else if (this.currentTestData.type === 'drag-drop') {
            this.setupDragDropEvents();
        } else if (this.currentTestData.type === 'inline-radio') {
            this.renderInlineRadioQuestions();
        } else {
            this.renderQuestions();
        }

        // === QUAN TRỌNG: Khôi phục highlight TRƯỚC khi load answers và attach events ===
        // Việc này tránh việc innerHTML ghi đè lên các input đã điền đáp án
        this.loadHighlightDraft();

        if (this.currentTestData.type === 'split-layout') {
            this.attachInputEvents(); // For inline gaps
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

        // === MỚI: Note Manager ===
        this.noteManager = new PETNoteManager(this);
        this.noteManager.init();

        // === MỚI: Mini Dashboard ===
        this.miniDashboard = new MiniDashboardManager(this, 'reading');
        this.miniDashboard.init();

        this.helpManager = new PETHelpManager(this);
        this.helpManager.init();

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
        const { book, test, part } = this.getTestMeta();

        let key = `pet_reading_book${book}_test${test}_part${part}`;
        if (isDraft) key += '_draft';
        console.log('[Reading Draft] Generated key:', key, '(isDraft:', isDraft, ')');
        return key;
    }

    getHighlightStorageKey() {
        return this.getStorageKey(false) + '_highlights';
    }

    saveHighlightDraft() {
        const potentialSelectors = [
            '#readingContent', '#transcriptContent', '#questionsContainer',
            '.reading-content', '.transcript-content', '.questions-list',
            '.reading-card', '.single-col', '.split-container'
        ];

        let foundData = [];
        potentialSelectors.forEach(selector => {
            const el = document.querySelector(selector);

            if (el && (el.innerHTML.includes('highlight-yellow') || el.innerHTML.includes('highlight-green') || el.innerHTML.includes('highlight-pink') || el.innerHTML.includes('highlight'))) {
                foundData.push({
                    selector: selector,
                    html: el.innerHTML
                });
            }
        });

        const key = this.getHighlightStorageKey();
        if (foundData.length > 0) {
            // ✅ THAY ĐỔI: Lưu mảng nhiều container thay vì chỉ 1 container đầu tiên
            this._safeSetStorage(key, JSON.stringify({ containers: foundData, timestamp: Date.now() }));
            console.log('[Highlight] Saved', foundData.length, 'containers to', key);
        } else {
            localStorage.removeItem(key);
            console.log('[Highlight] REMOVED (no highlights found) from key:', key);
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

            // Xử lý cả định dạng cũ (1 container) và định dạng mới (nhiều container)
            if (parsed.containers && Array.isArray(parsed.containers)) {
                console.log('[Highlight] Restoring', parsed.containers.length, 'containers');
                parsed.containers.forEach(item => {
                    const container = document.querySelector(item.selector);
                    if (container) {
                        container.innerHTML = item.html;
                        console.log('[Highlight] Restored container:', item.selector);
                    }
                });
            } else {
                // Fallback cho định dạng bản nháp cũ
                const savedHtml = typeof parsed === 'object' ? parsed.html : parsed;
                if (!savedHtml) return;

                const container = document.getElementById('readingContent') ||
                    document.querySelector('.reading-content') ||
                    document.querySelector('.reading-card') ||
                    document.querySelector('.single-col');
                if (container) {
                    container.innerHTML = savedHtml;
                    console.log('[Highlight] Restored using legacy logic');
                }
            }
        } catch (e) {
            console.error('[Highlight] Load error:', e);
            // Fallback cực hạn cho dữ liệu text thô
            if (typeof savedData === 'string' && savedData.includes('<span')) {
                const container = document.getElementById('readingContent') || document.querySelector('.reading-card');
                if (container) container.innerHTML = savedData;
            }
        }
    }

    /**
     * Lấy thông tin metadata của test hiện tại
     */
    getTestMeta() {
        const d = this.currentTestData;
        if (!d) return { book: 1, test: 1, part: 1 };

        const meta = d.metadata || this.storageManager.parseTestInfo(
            document.querySelector('.candidate')?.textContent || document.title || ''
        );

        // Diagnostic log
        if (!this._metaLogged) {
            console.log('[Metadata] Parsed:', meta, 'from source:', document.title);
            this._metaLogged = true;
        }

        const book = meta.book || 1;
        const test = meta.test || 1;
        const part = d.part || meta.part || 1;

        return { book, test, part };
    }

    cleanup() {
        // Gỡ bỏ các listener đã gắn trên document
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

        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        // Lưu draft lần cuối (nếu cần)
        this.saveDraftImmediate();
    }

    /**
     * Chuyển sang Part khác trong cùng Test
     */
    goToPart(direction) {
        const { book, test, part } = this.getTestMeta();
        const targetPart = part + direction;

        // Reading PET có 6 part
        if (targetPart < 1 || targetPart > 6) return;

        // === THÊM CLEANUP ===
        this.cleanup();

        const targetUrl = `read-pet${book}-test${test}-part${targetPart}.html`;
        console.log(`[Navigation] Redirecting to: ${targetUrl}`);
        window.location.href = targetUrl;
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
     * Lưu an toàn vào localStorage với xử lý lỗi quota
     */
    _safeSetStorage(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.warn('[Storage] Quota exceeded, cleaning old drafts...');
                this._cleanOldDrafts();
                try {
                    localStorage.setItem(key, value);
                } catch (e2) {
                    console.error('[Storage] Still failed after cleanup:', e2);
                }
            } else {
                console.error('[Storage] Failed to save:', e);
            }
        }
    }

    /**
     * Xóa các draft cũ hơn 30 ngày hoặc chỉ giữ lại 10 draft gần nhất
     */
    _cleanOldDrafts() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // ✅ FIX: Nhận diện cả _draft và _highlights để dọn dẹp khi bộ nhớ đầy
            if (key && key.startsWith('pet_reading_book') && (key.endsWith('_draft') || key.endsWith('_highlights'))) {
                keys.push(key);
            }
        }
        if (keys.length > 20) {
            keys.sort(); // Xóa các key cũ nhất
            for (let i = 0; i < keys.length - 20; i++) {
                localStorage.removeItem(keys[i]);
            }
        }
    }

    /**
     * ✅ FIX v2.1: Lưu nháp vào localStorage (có debounce)
     * Thêm kiểm tra: 1. _isResetting early return
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
                this._safeSetStorage(key, JSON.stringify(draft));
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
            this._safeSetStorage(key, JSON.stringify(draft));
            console.log('[Reading Draft] Saved immediately to key:', key);

            // Notify dashboard of draft update via BroadcastChannel
            try {
                const channel = new BroadcastChannel('pet_update_channel');
                channel.postMessage({
                    action: 'status_updated',
                    type: 'reading',
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
        // 1. Inject UI elements before setting up events
        this.uiManager.injectHeaderControls(this);
        this.uiManager.injectModeToggle();
        this.injectNoteButton();

        // 2. Setup behaviors
        this.uiManager.setupFontControls();
        this.uiManager.setupThemeToggle();
        this.uiManager.setupModeToggle();

        // Only set up standard resizers if not using split-layout dynamic generation
        if (this.currentTestData.type !== 'split-layout') {
            this.uiManager.setupResizer();
            this.uiManager.setupExplanationPanel();
        }

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
        noteBtn.onclick = () => this.noteManager?.toggle();

        // Insert before submit button if possible
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.parentNode.insertBefore(noteBtn, submitBtn);
        } else {
            bottomBar.appendChild(noteBtn);
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
                        <label for="answer-${q.num}">Your answer (letter A–H):</label>
                        <input type="text" id="answer-${q.num}" class="answer-input" maxlength="1" placeholder="A–H" autocomplete="off">
                        <span class="eye-icon" data-question="${q.num}">👁️</span>
                    </div>
                `;
                container.appendChild(div);

                // Add enforcing A-H formatting
                const input = document.getElementById(`answer-${q.num}`);
                if (input) {
                    input.addEventListener('input', function () {
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
        const container = document.querySelector('.single-col') || document.querySelector('.left-col') || document.getElementById('questionsContainer');
        if (container) {
            // Xóa listener cũ nếu có (để tránh duplicate)
            if (this._boundInputHandler) {
                container.removeEventListener('input', this._boundInputHandler);
            }

            // Tạo handler và lưu lại để có thể cleanup sau
            this._boundInputHandler = (e) => {
                const target = e.target;
                if (target && target.matches('.gap-input')) {
                    this.updateAnswerCount();
                    this.saveDraft();
                }
            };
            container.addEventListener('input', this._boundInputHandler);

            // Đánh dấu trạng thái disabled cho input nếu đã nộp bài
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

    /**
     * ✅ FIX v2.1: Setup event listeners - kiểm tra _isResetting
     */
    setupEventListeners() {
        // Tạo bound handler và lưu vào this
        this._boundChangeHandler = (e) => {
            if (this._isResetting) {
                console.log('[Reading Draft] change event blocked during reset');
                return;
            }
            if (e.target && e.target.matches('input[type="radio"]')) {
                this.updateAnswerCount();
                this.saveDraftImmediate();
            }
        };
        // Radio button changes
        document.addEventListener('change', this._boundChangeHandler);

        this._boundDocInputHandler = (e) => {
            if (this._isResetting) {
                console.log('[Reading Draft] input event blocked during reset');
                return;
            }
            // Ignore if handled by delegation in attachInputEvents
            if (e.target && e.target.matches('.gap-input')) return;

            if (e.target && (e.target.matches('input[type="text"]') || e.target.matches('textarea'))) {
                this.updateAnswerCount();
                this.saveDraft();
            }
        };
        // Input changes (for matching, split-layout, etc.)
        document.addEventListener('input', this._boundDocInputHandler);

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

        // PET logo - setup hover home icon and click to go home
        const logoEl = document.querySelector('.ielts-logo');
        if (logoEl) {
            // Inject PET text and home icon
            logoEl.innerHTML = `
                <span class="logo-text">PET</span>
                <span class="logo-home" style="display: none;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                </span>
            `;

            // Hover events to toggle PET text and home icon
            logoEl.addEventListener('mouseenter', () => {
                logoEl.querySelector('.logo-text')?.style.setProperty('display', 'none');
                logoEl.querySelector('.logo-home')?.style.setProperty('display', 'inline-flex');
            });
            logoEl.addEventListener('mouseleave', () => {
                logoEl.querySelector('.logo-text')?.style.setProperty('display', 'inline');
                logoEl.querySelector('.logo-home')?.style.setProperty('display', 'none');
            });

            // Click to go home
            logoEl.addEventListener('click', () => {
                if (confirm('Bạn có chắc muốn về trang chủ? Dữ liệu bài làm sẽ được tự động lưu.')) {
                    window.location.href = 'index.html';
                }
            });
        }

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

        // Xóa các nhãn văn bản không liên quan trong thanh điều hướng
        const parent = nav.parentElement;
        if (parent && parent.classList.contains('question-nav')) {
            parent.querySelectorAll('span').forEach(s => {
                // Giữ lại các badge thông tin quan trọng và toggle label
                if (!s.classList.contains('answer-badge') && !s.classList.contains('toggle-label')) {
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

            // Allow dataset match to Part 6 structure dataset.q setup
            btn.dataset.q = i;

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
        if (part >= 6) {
            nextPartBtn.disabled = true;
        } else {
            nextPartBtn.addEventListener('click', () => {
                if (confirm('Bạn có muốn chuyển sang Part tiếp theo không?')) {
                    this.goToPart(1);
                }
            });
        }
        nav.appendChild(nextPartBtn);

        // Nút Hướng dẫn (?) - Nằm giữa Next Part và Highlight
        const helpBtn = document.createElement('button');
        helpBtn.className = 'nav-arrow-btn nav-help-btn';
        helpBtn.title = 'Hướng dẫn';
        helpBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin: 0;"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        `;
        helpBtn.style.padding = '8px';
        helpBtn.style.minWidth = '40px';
        helpBtn.style.borderRadius = '50%';
        helpBtn.style.marginLeft = '12px';
        helpBtn.addEventListener('click', () => this.helpManager.toggle());
        nav.appendChild(helpBtn);

        // Inject highlight toggle into question-nav
        this.injectHighlightToggle();
    }

    /**
     * Inject highlight toggle switch into question navigation
     */
    injectHighlightToggle() {
        const questionNav = document.querySelector('.question-nav');
        if (!questionNav) return;

        // Check if toggle already exists
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

        // Initialize toggle functionality
        this.initHighlightToggle();
    }

    /**
     * Initialize highlight toggle functionality
     */
    initHighlightToggle() {
        const toggleCheckbox = document.getElementById('highlightToggle');
        if (!toggleCheckbox) return;

        // Set initial state
        this.personalHighlightsVisible = toggleCheckbox.checked;

        // Áp dụng trạng thái ngay sau khi khởi tạo (ẩn các highlight có sẵn nếu toggle OFF)
        this.togglePersonalHighlights(this.personalHighlightsVisible);

        toggleCheckbox.addEventListener('change', (e) => {
            this.personalHighlightsVisible = e.target.checked;
            this.togglePersonalHighlights(this.personalHighlightsVisible);
        });
    }

    /**
     * Ẩn/hiện tất cả personal highlights
     * @param {boolean} visible - true: hiện, false: ẩn
     */
    togglePersonalHighlights(visible) {
        // Tìm highlights trong cả reading content và questions
        const containers = [
            document.getElementById('readingContent'),
            document.getElementById('questionsContainer'),
            document.querySelector('.questions-panel'),
            document.querySelector('.reading-card'),
            document.querySelector('.left-col'),
            document.querySelector('.single-col')
        ].filter(Boolean); // Lọc bỏ null

        const allHighlights = new Set();

        containers.forEach(container => {
            const highlights = container.querySelectorAll(
                '.highlight-yellow, .highlight-green, .highlight-pink'
            );
            highlights.forEach(h => allHighlights.add(h));
        });

        allHighlights.forEach(highlight => {
            if (visible) {
                highlight.classList.remove('highlight-hidden');
            } else {
                highlight.classList.add('highlight-hidden');
            }
        });

        console.log(`[Reading] ${visible ? 'Hiện' : 'Ẩn'} ${allHighlights.size} highlights`);
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
     * UPDATED: Support synchronized scrolling for Part 1 and inline slot scrolling for Part 5
     */
    scrollToQuestion(questionNum) {
        const type = this.currentTestData.type;
        const part = this.currentTestData.part || this.getTestMeta().part;

        // Part 5 (inline-radio): Scroll to inline slot in reading panel
        if (type === 'inline-radio') {
            const slotElement = document.getElementById(`readingSlot${questionNum}`) ||
                document.querySelector(`[data-q="${questionNum}"]`);
            if (slotElement) {
                slotElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            // Also scroll questions panel to the question
            let questionElement = document.getElementById(`question-${questionNum}`);
            if (questionElement) {
                questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Part 4 (drag-drop): Scroll to slot in reading panel
        if (type === 'drag-drop') {
            const slotElement = document.getElementById(`readingSlot${questionNum}`) ||
                document.querySelector(`#passageCard [data-q="${questionNum}"]`);
            if (slotElement) {
                slotElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            // Highlight the corresponding sentence item in the bank
            const sentItem = document.getElementById(`sent-${this.getUserAnswer(questionNum) || ''}`);
            if (sentItem) {
                sentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            return;
        }

        // Part 1 (multiple-choice): Scroll both reading and questions panels
        if (type === 'multiple-choice' && part === 1) {
            // Find the corresponding card in reading panel via highlightMap or direct mapping
            let cardId = null;
            if (this.currentTestData.highlightMap && this.currentTestData.highlightMap[`q${questionNum}`]) {
                cardId = this.currentTestData.highlightMap[`q${questionNum}`].cardId;
            }
            // Fallback: assume question N maps to card N for Part 1
            if (!cardId) {
                cardId = questionNum;
            }

            // Scroll reading panel to the card
            const cardElement = document.querySelector(`.reading-card[data-text-id="${cardId}"]`);
            if (cardElement) {
                cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        // Default: Scroll questions panel to the question
        let questionElement = document.getElementById(`question-${questionNum}`);
        if (!questionElement && type === 'split-layout') {
            questionElement = document.getElementById(`q${questionNum}`);
        }

        if (questionElement) {
            questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (type === 'split-layout') {
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

        // Chỉ cập nhật DOM nếu số lượng thay đổi
        if (this._lastAnsweredCount === answered) return;
        this._lastAnsweredCount = answered;

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

        // Notify dashboard of status update via BroadcastChannel
        try {
            const channel = new BroadcastChannel('pet_update_channel');
            channel.postMessage({
                action: 'status_updated',
                type: 'reading',
                book: this.currentTestData.book,
                test: this.currentTestData.test,
                part: this.currentTestData.part,
                status: 'completed'
            });
            channel.close();
        } catch (e) {
            console.warn('BroadcastChannel error:', e);
        }

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

    /**
     * ✅ FIX v2.5: Handle reset button click with 3-option modal
     */
    handleReset() {
        console.log('[Reading handleReset] triggered');
        this.showResetChoiceModal();
    }

    /**
     * Show custom reset choice modal (Standardized for all PET Core)
     */
    showResetChoiceModal() {
        // Remove existing modal if any
        const existing = document.querySelector('.reset-modal-overlay');
        if (existing) existing.remove();

        const modalHtml = `
            <div class="reset-modal-overlay">
                <div class="reset-modal">
                    <h3>Lựa chọn Reset</h3>
                    <p>Bạn muốn thực hiện thao tác xóa nào? Lựa chọn "Chỉ xóa đáp án" sẽ giữ lại các phần highlight cá nhân của bạn.</p>
                    <div class="reset-modal-btns">
                        <button class="reset-modal-btn all" id="confirmResetAll">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            Xóa tất cả
                        </button>
                        <button class="reset-modal-btn content" id="confirmResetAnswers">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Chỉ xóa đáp án
                        </button>
                        <button class="reset-modal-btn cancel" id="cancelReset">Hủy</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const overlay = document.querySelector('.reset-modal-overlay');
        
        // Use timeout to trigger animation
        setTimeout(() => overlay.classList.add('show'), 10);

        document.getElementById('confirmResetAll').onclick = () => {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
                this.resetAll(true); // Clear everything
            }, 300);
        };

        document.getElementById('confirmResetAnswers').onclick = () => {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
                this.resetAll(false); // Only clear answers (keep highlights)
            }, 300);
        };

        document.getElementById('cancelReset').onclick = () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        };

        // Close on backdrop click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 300);
            }
        };
    }

    /**
     * ✅ FIX v2.5: Reset answers and state
     * @param {boolean} clearHighlights - Whether to also clear personal highlights
     */
    resetAll(clearHighlights = true) {
        console.log(`[Reading resetAll] started (clearHighlights: ${clearHighlights})`);

        const completedKey = this.getStorageKey(false);
        const draftKey = this.getStorageKey(true);

        // ✅ FIX: Xóa localStorage ngay (SKIP NOTE)
        localStorage.removeItem(completedKey);
        localStorage.removeItem(draftKey);
        
        if (clearHighlights) {
            // ✅ KHÔI PHỤC: Xóa highlight khi reset theo yêu cầu người dùng
            localStorage.removeItem(this.getHighlightStorageKey());
        }
        
        console.log('[Reset] Deleted keys using getStorageKey():', completedKey, draftKey);

        // ✅ FIX: Get book/test/part for BroadcastChannel
        const testInfo = this.storageManager.parseTestInfo(document.querySelector('.candidate')?.textContent || '');
        const book = this.currentTestData.book || testInfo.book || 1;
        const test = this.currentTestData.test || testInfo.test || 1;
        const part = this.currentTestData.part || testInfo.part || 1;

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
        } catch (e) { console.warn('BroadcastChannel error:', e); }

        // ✅ FIX: DELAY LÂU HƠN - 500ms thay vì 0ms
        setTimeout(() => {
            this._isResetting = false;
            // ✅ FIX: Xóa lần nữa để chắc chắn (defensive)
            localStorage.removeItem(draftKey);
            console.log('[Reset] Complete - _isResetting=false, draft key cleaned');
        }, 500);  // ✅ 500ms để đảm bảo event queue process hết

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
 * FIXED: Use event delegation, fallback selection, TreeWalker
 */
class ReadingHighlightManager {
    constructor() {
        this.selectedRange = null;  // ✅ Lưu range khi contextmenu
        this.setupContextMenu();
    }

    /**
     * Expose global helper interface bridging manual highlighting
     * FIXED: Use event delegation on document to handle dynamic DOM changes
     */
    setupContextMenu() {
        // Show context menu on right-click - Đơn giản hóa như code mẫu
        document.addEventListener('contextmenu', (e) => {
            const highlightArea = e.target.closest('.reading-content, .single-col, .left-col, .reading-card, .reading-passage, .questions-panel, #questionsContainer, .question-item, .questions-list');
            if (!highlightArea) return;

            const selection = window.getSelection();
            if (!selection || selection.toString().trim() === '' || selection.rangeCount === 0) return;

            e.preventDefault();
            this.selectedRange = selection.getRangeAt(0);
            this.showContextMenu(e.pageX, e.pageY);
            console.log('[ReadingHighlight] Range selected:', this.selectedRange.toString().substring(0, 30));
        });

        // FIXED: Prevent selection loss when clicking on context menu items
        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) {
            contextMenu.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent selection loss
            });
        }

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
                    } catch (e) { console.log("Tree span surround failed", e); }
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
     * Apply manual highlight (phiên bản hỗ trợ cross‑block selection)
     */
    applyHighlight(color) {
        if (!this.selectedRange) {
            console.warn('[ReadingHighlight] No selected range');
            this.hideContextMenu();
            return;
        }

        try {
            const range = this.selectedRange.cloneRange();

            // 1️⃣ Xóa highlight cũ trong vùng chọn (để lấy màu mới)
            this.removeExistingHighlightsInRange(range);

            // 2️⃣ Chọn strategy dựa trên complexity
            const isSimple = this.isSimpleRange(range);
            console.log('[ReadingHighlight] Using', isSimple ? 'SIMPLE' : 'COMPLEX', 'strategy');

            if (isSimple) {
                this.applyHighlightSimple(range, color);
            } else {
                this.applyHighlightComplex(range, color);
            }

        } catch (e) {
            console.log('[ReadingHighlight] Lỗi apply highlight:', e);
        }

        window.getSelection().removeAllRanges();
        this.hideContextMenu();
        this.selectedRange = null;

        // Gọi lưu draft
        if (window.readingCore) window.readingCore.saveHighlightDraft();
        else if (window.listeningCore) window.listeningCore.saveHighlightDraft();
    }

    // 🎯 SIMPLE: 1 text node, dùng surroundContents
    applyHighlightSimple(range, color) {
        try {
            const span = document.createElement('span');
            span.className = `highlight-${color}`;

            if (window.readingCore && !window.readingCore.personalHighlightsVisible) {
                span.classList.add('highlight-hidden');
            }

            range.surroundContents(span);
            console.log('[ReadingHighlight] Simple highlight applied:', span.textContent.substring(0, 30));
        } catch (e) {
            console.log('[ReadingHighlight] Simple failed, fallback to extract:', e);
            // Fallback: extract + insert
            const fragment = range.extractContents();
            const span = document.createElement('span');
            span.className = `highlight-${color}`;
            if (window.readingCore && !window.readingCore.personalHighlightsVisible) {
                span.classList.add('highlight-hidden');
            }
            span.appendChild(fragment);
            range.insertNode(span);
        }
    }

    // 🚀 COMPLEX: Nhiều nodes, dùng TreeWalker
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
                if (window.readingCore && !window.readingCore.personalHighlightsVisible) {
                    span.classList.add('highlight-hidden');
                }
                subRange.surroundContents(span);
            } catch (e) {
                const fragment = subRange.extractContents();
                const span = document.createElement('span');
                span.className = `highlight-${color}`;
                if (window.readingCore && !window.readingCore.personalHighlightsVisible) {
                    span.classList.add('highlight-hidden');
                }
                span.appendChild(fragment);
                subRange.insertNode(span);
            }
        });

        console.log('[ReadingHighlight] Complex highlight applied on', textNodes.length, 'nodes');
    }

    // Lấy tất cả text nodes trong range
    getTextNodesInRange(range) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    if (range.intersectsNode(node)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        return textNodes;
    }

    // Kiểm tra xem range có đơn giản (1 node) hay phức tạp (nhiều nodes)
    isSimpleRange(range) {
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;

        // Nếu cùng 1 text node -> đơn giản
        if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
            return true;
        }

        // Nếu cùng parent và không có element tags ở giữa -> đơn giản
        if (startContainer.parentNode === endContainer.parentNode) {
            // Kiểm tra xem có element node nào giữa start và end không
            const textNodes = this.getTextNodesInRange(range);
            return textNodes.length <= 1;
        }

        return false;
    }

    // Xóa highlight cũ trong vùng chọn (để thay thế bằng màu mới)
    removeExistingHighlightsInRange(range) {
        try {
            // Tìm tất cả highlight spans trong vùng chọn
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

            const toUnwrap = [];
            let node;
            while (node = walker.nextNode()) {
                if (range.intersectsNode(node)) {
                    toUnwrap.push(node);
                }
            }

            // Unwrap mà không làm mất text
            toUnwrap.forEach(span => {
                const parent = span.parentNode;
                while (span.firstChild) {
                    parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
            });

            console.log('[ReadingHighlight] Removed', toUnwrap.length, 'existing highlights');
        } catch (e) {
            console.log('[ReadingHighlight] Lỗi remove existing:', e);
        }
    }

    /**
     * Remove highlighting - Hỗ trợ cross-node
     */
    removeHighlight() {
        if (!this.selectedRange) {
            console.warn('[ReadingHighlight] No selected range to remove');
            this.hideContextMenu();
            return;
        }

        try {
            const range = this.selectedRange.cloneRange();

            // Tìm tất cả highlight spans trong vùng chọn
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

            // Xóa từng highlight
            toRemove.forEach(span => {
                const parent = span.parentNode;
                while (span.firstChild) {
                    parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
            });

            console.log('[ReadingHighlight] Removed', toRemove.length, 'highlights');
        } catch (e) {
            console.log('[ReadingHighlight] Lỗi remove highlight:', e);
        }

        window.getSelection().removeAllRanges();
        this.hideContextMenu();
        this.selectedRange = null;

        // Gọi lưu draft
        if (window.readingCore) window.readingCore.saveHighlightDraft();
        else if (window.listeningCore) window.listeningCore.saveHighlightDraft();
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
            Object.keys(testData.answerKey).map(k => ({ num: parseInt(k.replace('q', '')) })).filter(q => !isNaN(q.num));

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

        const bookMatch = title.match(/Preliminary\s+(\d+)/i) || title.match(/PET\s*(\d+)/i);
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

    /**
     * Inject header controls (Font buttons, Theme toggle)
     */
    injectHeaderControls(coreInstance) {
        const header = document.querySelector('.ielts-header');
        if (!header) return;

        // 1. Update Candidate Name from testData if possible
        const candidateEl = header.querySelector('.candidate');
        if (candidateEl && coreInstance.currentTestData) {
            let title = coreInstance.currentTestData.title;
            // Auto-generate title if missing
            if (!title) {
                const { part } = coreInstance.currentTestData;
                const meta = coreInstance.storageManager?.parseTestInfo(document.title || '') || { book: 1, test: 1 };
                const book = meta.book || 1;
                const test = meta.test || 1;
                title = `B1 Preliminary ${book} · Test ${test} · Part ${part}`;
            }
            candidateEl.textContent = title;
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
            const innerBrand = header.querySelector('.brand');
            if (innerBrand) {
                innerBrand.appendChild(fontControls);
            } else {
                header.appendChild(fontControls);
            }
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
            const innerBrand = header.querySelector('.brand');
            if (innerBrand) {
                innerBrand.appendChild(themeBtn);
            } else {
                header.appendChild(themeBtn);
            }
        }

        // Load saved theme
        const savedTheme = localStorage.getItem('pet-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
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

    /**
     * Inject mode toggle (classic/modern) into header
     */
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
        const testWrapper = document.getElementById('testWrapper');
        const html = document.documentElement;
        const storageKey = 'pet-mode'; // Unified key

        if (!modeToggle || !styleLink || !testWrapper) return;

        const setMode = (isClassic) => {
            if (isClassic) {
                styleLink.href = 'reading-pet-common1.css';
                testWrapper.classList.add('classic-mode');
                // Remove dark theme if switching to classic
                html.removeAttribute('data-theme');
            } else {
                styleLink.href = 'reading-pet-common.css';
                testWrapper.classList.remove('classic-mode');

                // Restore dark mode if it was enabled in modern mode
                const savedTheme = localStorage.getItem('pet-theme');
                if (savedTheme === 'dark') {
                    html.setAttribute('data-theme', 'dark');
                }
            }
            localStorage.setItem(storageKey, isClassic ? 'classic' : 'modern');
            // Force reflow
            void document.body.offsetHeight;
        };

        const savedMode = localStorage.getItem(storageKey);
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

// Export globally for the HTML wrappers
window.ReadingCore = ReadingCore;
window.ReadingHighlightManager = ReadingHighlightManager;
window.ReadingStorageManager = ReadingStorageManager;
window.ReadingUIManager = ReadingUIManager;
