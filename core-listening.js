/**
 * CORE LISTENING ENGINE - PET B1 PRELIMINARY
 * Premium 'Tr' Favicon System
 */
(function () {
    const faviconUri = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOSIgZmlsbD0iIzBkOTQ4OCIvPjxwYXRoIGQ9Ik02IDEwaDEydjNoLTQuNXYxMWgtM3YtMTFINnYtM3ptMTQgNnY4aC0zdi01YzAtMS41IDEtMi41IDIuNS0yLjVoMi41djNoLTJ6IiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMjYiIGN5PSI2IiByPSIzIiBmaWxsPSIjZmJiZjI0Ii8+PC9zdmc+";
    const inject = () => {
        if (!document.querySelector('link[rel*="icon"]')) {
            const link = document.createElement('link');
            link.rel = 'icon'; link.type = 'image/svg+xml'; link.href = faviconUri;
            document.head.appendChild(link);
        }
        if (!document.querySelector('link[rel="apple-touch-icon"]')) {
            const link = document.createElement('link');
            link.rel = 'apple-touch-icon'; link.href = faviconUri;
            document.head.appendChild(link);
        }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
    else inject();
})();

/**
 * CORE LISTENING ENGINE - PET B1 PRELIMINARY
 * Contains all functionality for listening tests across all parts and tests
 * Compatible with PET 1 & PET 2, Tests 1-4, Parts 1-4
 */
class TestTourManager {
    constructor() {
        this.tourLoaded = false;
    }

    init() {
        if (document.getElementById('test-tour-btn')) return;

        const footer = document.querySelector('.bottom-bar');
        if (!footer) return;

        const btn = document.createElement('div');
        btn.id = 'test-tour-btn';
        btn.className = 'help-button test-tour-btn';
        btn.innerHTML = '<span>?</span>';
        btn.title = 'Xem hướng dẫn làm bài';
        btn.style.cssText = 'width:28px;height:28px;background:var(--primary,#0d9488);color:#fff;border-radius:50%;display:flex !important;align-items:center;justify-content:center;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);margin-right:12px;user-select:none;flex-shrink:0;';

        btn.addEventListener('click', () => this.startTour());

        // Prepend to footer so it's on the left
        footer.insertBefore(btn, footer.firstChild);

        if (!document.getElementById('introjs-styles')) {
            const link = document.createElement('link');
            link.id = 'introjs-styles';
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/intro.js/7.2.0/introjs.min.css';
            document.head.appendChild(link);

            const customStyle = document.createElement('style');
            customStyle.innerHTML = `
                .introjs-tooltip { border-radius: 12px !important; font-family: inherit !important; color: #333 !important; background-color: #fff !important; }
                .introjs-tooltip * { color: #333 !important; }
                .introjs-button { border-radius: 8px !important; font-weight: 600 !important; color: #333 !important; text-shadow: none !important; }
                .introjs-nextbutton { background: var(--primary, #0d9488) !important; color: white !important; }
                .introjs-skipbutton { color: #666 !important; position: absolute !important; right: 8px !important; top: 8px !important; width: 30px !important; height: 30px !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 20px !important; padding: 0 !important; text-decoration: none !important; line-height: 1 !important; z-index: 10 !important; background: transparent !important; }
                .introjs-skipbutton:hover { color: #000 !important; }
                body.introjs-showElement .ielts-header, body:has(.introjs-overlay) .ielts-header { 
                    transform: translateY(0) !important; 
                    opacity: 1 !important; 
                    visibility: visible !important; 
                    top: 0 !important; 
                    display: flex !important; 
                }
                body.introjs-showElement .bottom-bar, body:has(.introjs-overlay) .bottom-bar { 
                    transform: translateY(0) !important; 
                    opacity: 1 !important; 
                    visibility: visible !important; 
                    bottom: 0 !important; 
                    display: flex !important; 
                }
                body.introjs-showElement .question-nav, 
                body:has(.introjs-overlay) .question-nav,
                .question-nav.collapsed { 
                    transform: none !important; 
                    opacity: 1 !important; 
                    visibility: visible !important; 
                    display: flex !important;
                    height: auto !important;
                    margin: 0 !important;
                }
            `;
            document.head.appendChild(customStyle);
        }
    }

    loadIntroJs(callback) {
        if (typeof introJs !== 'undefined') {
            callback();
            return;
        }
        if (this.tourLoaded) return;
        this.tourLoaded = true;
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/intro.js/7.2.0/intro.min.js';
        script.onload = callback;
        document.body.appendChild(script);
    }

    startTour() {
        this.loadIntroJs(() => {
            const steps = [];
            const selectors = [
                { el: '.ielts-header', title: 'ℹ️ Thông tin bài thi', intro: 'Khu vực hiển thị tiêu đề bài thi và các thông tin cơ bản.' },
                { el: '#timerDisplay', title: '⏱️ Đồng hồ đếm ngược', intro: 'Theo dõi thời gian làm bài còn lại.' },
                { el: '.theme-toggle-btn', title: '🌓 Giao diện', intro: 'Bật/tắt chế độ sáng tối để bảo vệ mắt.' },
                { el: '.autocollapse-toggle', title: '↕️ Ẩn/hiện Header', intro: 'Tự động ẩn thanh tiêu đề khi cuộn trang để mở rộng không gian.' },
                { el: '.font-controls', title: '🔠 Cỡ chữ', intro: 'Thay đổi kích thước chữ cho phù hợp.' },
                { el: '.audio-controls', title: '🔊 Điều khiển Audio', intro: 'Phát, tạm dừng và điều chỉnh tốc độ bài nghe.' },
                { el: '.left-col, .audio-section, .transcript-panel', title: '📖 Nội dung bài', intro: 'Nội dung bài nghe nằm ở đây. Bạn có thể bôi đen văn bản để highlight.' },
                { el: '.highlight-toggle-wrapper', title: '🖍️ Bật/tắt Highlight', intro: 'Ẩn hoặc hiện các phần văn bản mà bạn đã tự highlight.' },
                { el: '.right-col, .questions-list', title: '📝 Danh sách câu hỏi', intro: 'Trả lời các câu hỏi tại khu vực này.' },
                { el: '.note-toggle-btn', title: '🗒️ Ghi chú nhanh', intro: 'Mở popup ghi chú để nháp thông tin.' },
                { el: '#mini-dashboard-toggle', title: '📊 Tiến độ bài thi', intro: 'Theo dõi số lượng câu đã làm ở các Part khác.' },
                { el: '#storageIndicator', title: '💾 Dung lượng trống', intro: 'Hiển thị dung lượng lưu trữ còn lại của trình duyệt.' },
                { el: '.nav-prev-part', title: '⬅️ Part trước', intro: 'Chuyển về Part trước đó.' },
                { el: '.nav-next-part', title: '➡️ Part tiếp theo', intro: 'Chuyển sang Part tiếp theo.' },
                { el: '#submitBtn', title: '✅ Nộp bài', intro: 'Nhấn Nộp bài để xem điểm số và giải thích chi tiết.' }
            ];

            selectors.forEach(s => {
                const target = document.querySelector(s.el);
                if (target && target.offsetParent !== null) steps.push({ element: target, title: s.title, intro: s.intro });
            });

            if (steps.length === 0) return;

            const tour = introJs().setOptions({
                steps,
                nextLabel: 'Tiếp →',
                prevLabel: '← Quay lại',
                skipLabel: '×',
                doneLabel: 'Hoàn tất',
                showProgress: true,
                showBullets: false,
                scrollToElement: true,
                scrollPadding: 100
            });

            const helpBtn = document.getElementById('test-tour-btn');
            if (helpBtn) helpBtn.style.display = 'none';
            tour.onexit(() => { if (helpBtn) helpBtn.style.display = 'flex'; });
            tour.oncomplete(() => { if (helpBtn) helpBtn.style.display = 'flex'; });
            tour.start();
        });
    }
}


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
        const key = this.getNoteKey();
        const content = this.textarea.value;
        localStorage.setItem(key, content);
        if (window.CloudStorage) {
            window.CloudStorage.save(key, content);
        }
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

    petListeningScoreMap = {
        25: { cambridge: 170, cefr: 'B2' },
        24: { cambridge: 168, cefr: 'B2' },
        23: { cambridge: 163, cefr: 'B2' },
        22: { cambridge: 157, cefr: 'B1' },
        21: { cambridge: 152, cefr: 'B1' },
        20: { cambridge: 149, cefr: 'B1' },
        19: { cambridge: 145, cefr: 'B1' },
        18: { cambridge: 142, cefr: 'B1' },
        17: { cambridge: 138, cefr: 'A2' },
        16: { cambridge: 135, cefr: 'A2' },
        15: { cambridge: 132, cefr: 'A2' },
        14: { cambridge: 129, cefr: 'A2' },
        13: { cambridge: 126, cefr: 'A2' },
        12: { cambridge: 123, cefr: 'A2' },
        11: { cambridge: 120, cefr: 'A2' },
        10: { cambridge: 117, cefr: '-' },
        9: { cambridge: 114, cefr: '-' },
        8: { cambridge: 111, cefr: '-' },
        7: { cambridge: 108, cefr: '-' },
        6: { cambridge: 105, cefr: '-' },
        5: { cambridge: 102, cefr: '-' },
        4: { cambridge: 82, cefr: '-' },
        3: { cambridge: 61, cefr: '-' },
        2: { cambridge: 41, cefr: '-' },
        1: { cambridge: 20, cefr: '-' },
        0: { cambridge: 0, cefr: '-' }
    };

    calculatePETScore(correct) {
        if (correct < 0) correct = 0;
        if (correct > 25) correct = 25;
        return this.petListeningScoreMap[correct] || { cambridge: 0, cefr: '-' };
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
        const hasAnyData = data.some(d => d.type !== 'empty');
        const scoreData = this.calculatePETScore(totalCorrect);

        return {
            correct: totalCorrect,
            total: maxQuestions,
            hasData: hasAnyData,
            petScore: scoreData.cambridge,
            cefr: scoreData.cefr
        };
    }

    renderContent(readingData, listeningData) {
        if (!this.contentArea) return;

        const meta = this.core.getTestMeta();

        const readingStats = this.calculateSkillStats(readingData, 35);
        const listeningStats = this.calculateSkillStats(listeningData, 25);

        const renderSection = (title, data, stats, isReading) => {
            let scoreHtml;
            if (!stats.hasData) {
                scoreHtml = '<span class="not-done">Chưa làm</span>';
            } else if (stats.petScore) {
                const cefrBadge = stats.cefr && stats.cefr !== '-' ? ` <span class="cefr-badge">${stats.cefr}</span>` : '';
                scoreHtml = `${stats.correct}/${stats.total} đúng → <strong>${stats.petScore}</strong> điểm${cefrBadge}`;
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

                const isCurrent = meta.part === d.part && this.skillType === (isReading ? 'reading' : 'listening');
                const currentClass = isCurrent ? 'current' : '';

                sectionHtml += `
                    <a href="#" class="part-item ${currentClass}" data-url="${url}">
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

        // Gắn sự kiện xác nhận chuyển Part
        this.contentArea.querySelectorAll('.part-item[data-url]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetUrl = link.getAttribute('data-url');
                if (confirm('Mở Part mới trong tab mới? Dữ liệu hiện tại sẽ được lưu.')) {
                    window.open(targetUrl, '_blank');
                }
            });
        });
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
            this.channel = new BroadcastChannel('pet_update_channel');
            this.channel.addEventListener('message', () => {
                if (this.isVisible) this.refreshData();
            });
        } catch (e) {
            console.warn('BroadcastChannel not supported', e);
        }

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
        this.DEBOUNCE_MS = 300;
        this._isResetting = false;
        this.personalHighlightsVisible = true;
        this.cloudSupportInitialized = false;
    }

    async initializeTest(testData) {
        this.currentTestData = testData;
        this.examSubmitted = false;
        this.explanationMode = false;

        this.setupAudioControls();
        this.setupUI();
        this.renderQuestions();

        this.loadHighlightDraft();
        this.setupEventListeners();
        this.setupBeforeUnload();
        this.createNavigation();

        // Khởi tạo Cloud Support
        await this.initCloudSupport();

        // KIỂM TRA VÀ KHÔI PHỤC TRẠNG THÁI SUBMITTED
        const submittedState = this.storageManager.loadSubmittedState(this.currentTestData);
        if (submittedState && submittedState.submitted) {
            console.log('[Init] Restoring submitted state...');
            this.restoreSubmittedState(submittedState);
        } else if (!this.isCompleted()) {
            this.loadDraft();
        }

        this.noteManager = new PETNoteManager(this);
        this.noteManager.init();

        this.miniDashboard = new MiniDashboardManager(this, 'listening');
        this.miniDashboard.init();

        this.createResetModal();

        this.updateAnswerCount();

        // Initialize Guided Tour
        if (typeof TestTourManager !== 'undefined') {
            new TestTourManager().init();
        }

        console.log('Listening test initialized:', testData.title);
    }

    async initCloudSupport() {
        if (this.cloudSupportInitialized) return;
        try {
            // Xác định base path bằng cách tìm script core-listening.js
            const script = document.querySelector('script[src*="core-listening.js"]');
            let basePath = './';
            if (script && script.src) {
                const url = new URL(script.src);
                basePath = url.origin + url.pathname.replace('core-listening.js', '');
            }
            
            const { AuthUI } = await import(basePath + 'js/auth-ui.js');
            const { CloudStorage } = await import(basePath + 'js/cloud-storage.js');
            
            window.CloudStorage = CloudStorage;
            this._authUI = new AuthUI();
            await this._authUI.init();

            if (await CloudStorage.shouldMigrate()) {
                CloudStorage.migrateLocalStorageToCloud();
            }
            this.cloudSupportInitialized = true;
            console.log('[Cloud] Support initialized at:', basePath);
        } catch (e) {
            console.warn('[Cloud] Failed to init:', e);
        }
    }

    isCompleted() {
        if (!this.currentTestData) return false;
        const key = this.getStorageKey(false);
        return localStorage.getItem(key) !== null;
    }

    getStorageKey(isDraft = false) {
        const { book, test, part } = this.getTestMeta();
        let key = `pet_listening_book${book}_test${test}_part${part}`;
        if (isDraft) key += '_draft';
        return key;
    }

    getHighlightStorageKey() {
        return this.getStorageKey(false) + '_highlights';
    }

    saveHighlightDraft() {
        const potentialSelectors = [
            '#transcriptContent',
            '#questionsContainer',
            '.transcript-content',
            '.questions-list',
            '.reading-card',
            '.reading-passage',
            '.single-col',
            '.split-container'
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
            console.log('[Listening Highlight] Saved', foundData.length, 'containers to', key);
        } else {
            localStorage.removeItem(key);
            console.log('[Listening Highlight] No highlights – removed key:', key);
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

                const container = document.getElementById('transcriptContent') ||
                    document.querySelector('.transcript-content');
                if (container) {
                    const inputValues = captureInputValues(container);
                    container.innerHTML = savedHtml;
                    restoreInputValues(container, inputValues);
                    console.log('[Highlight] Restored using legacy logic');
                }
            }
        } catch (e) {
            console.error('[Highlight] Load error:', e);
            if (typeof savedData === 'string' && savedData.includes('<span')) {
                const container = document.getElementById('transcriptContent') || document.querySelector('.transcript-content');
                if (container) {
                    const inputs = container.querySelectorAll('input, select, textarea');
                    const values = [];
                    inputs.forEach((input, index) => {
                        if (input.type === 'radio' || input.type === 'checkbox') {
                            values.push({ index, checked: input.checked });
                        } else {
                            values.push({ index, value: input.value });
                        }
                    });
                    container.innerHTML = savedData;
                    const newInputs = container.querySelectorAll('input, select, textarea');
                    values.forEach(item => {
                        const input = newInputs[item.index];
                        if (!input) return;
                        if (input.type === 'radio' || input.type === 'checkbox') {
                            input.checked = item.checked;
                        } else {
                            input.value = item.value;
                        }
                    });
                }
            }
        }
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
        if (targetPart < 1 || targetPart > 4) return;

        this.cleanup();

        const targetUrl = `lis-pet${book}-test${test}-part${targetPart}.html`;
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
            // Sync to Cloud
            if (window.CloudStorage) {
                try {
                    const obj = JSON.parse(value);
                    window.CloudStorage.save(key, obj);
                } catch (e) {
                    window.CloudStorage.save(key, value);
                }
            }
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
                // Cloud sync (fire-and-forget)
                if (this._cloudStorage) this._cloudStorage.save(key, draft).catch(() => {});
            } catch (e) {
                console.error('[Draft] FAILED to save:', e);
            }
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
            } catch (e) { }
        } catch (e) {
            console.error('[Draft] Immediate save failed:', e);
        }
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
                } else if (this.currentTestData.type === 'fill-blank') {
                    const input = document.getElementById(`q${i}`);
                    if (input) input.value = ans;
                }
            }
            this.updateAnswerCount();
            return true;
        } catch (e) {
            return false;
        }
    }

    clearDraft() {
        const key = this.getStorageKey(true);
        localStorage.removeItem(key);
        // Cloud sync
        if (this._cloudStorage) this._cloudStorage.remove(key).catch(() => {});
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

                if (this.audio) {
                    controlsContainer.insertBefore(btnBack, this.audio);
                    this.audio.after(btnForward);
                }
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
                <span class="logo-text">PET</span>
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
                if (confirm('Bạn có chắc muốn về trang chủ? Dữ liệu bài làm sẽ được tự động lưu.')) {
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
        if (part >= 4) nextPartBtn.disabled = true;
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
        this.markAnswers();

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đã nộp'; }
        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) explainBtn.disabled = false;

        this.showResults();
        const userAnswers = this.getUserAnswers();
        this.storageManager.saveResults(this.currentTestData, userAnswers);
        // LƯU TRẠNG THÁI SUBMITTED
        this.storageManager.saveSubmittedState(this.currentTestData, userAnswers);

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
        } catch (e) { }

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
                const wrapper = input.closest('.blank-line');
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
        // Chỉ hiện eye-icon, ẩn tất cả badge đáp án
        document.querySelectorAll('.eye-icon').forEach(el => el.style.display = 'inline-block');
        document.querySelectorAll('.correct-answer-badge').forEach(el => el.style.display = 'none');
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
        if (!confirm('Reset tất cả câu trả lời của part này?')) return;

        const completedKey = this.getStorageKey(false);
        const draftKey = this.getStorageKey(true);
        localStorage.removeItem(completedKey);
        localStorage.removeItem(draftKey);
        if (clearHighlights) localStorage.removeItem(this.getHighlightStorageKey());
        // Cloud sync
        if (this._cloudStorage) {
            this._cloudStorage.remove(draftKey).catch(() => {});
            this._cloudStorage.remove(completedKey).catch(() => {});
        }
        // XÓA TRẠNG THÁI SUBMITTED
        this.storageManager.clearSubmittedState(this.currentTestData);

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
            } else if (this.currentTestData.type === 'fill-blank') {
                const input = document.getElementById(`q${i}`);
                if (input) { input.value = ''; input.disabled = false; }
            }

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

        const mainArea = document.getElementById('mainArea');
        const transcriptContent = document.getElementById('transcriptContent');
        if (mainArea && transcriptContent) {
            mainArea.classList.remove('show-transcript');
            transcriptContent.innerHTML = '';
        }

        document.querySelectorAll('.eye-icon').forEach(icon => icon.style.display = 'none');

        if (clearHighlights) this.highlightManager.clearAllHighlights();

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Nộp bài'; }
        const explainBtn = document.getElementById('explainBtn');
        if (explainBtn) { explainBtn.disabled = true; explainBtn.textContent = 'Xem giải thích'; }
        const explanationPanel = document.getElementById('explanationPanel');
        if (explanationPanel) explanationPanel.classList.remove('show');

        try {
            const channel = new BroadcastChannel('pet_reset_channel');
            channel.postMessage({ action: 'reset', type: 'listening', book, test, part });
            channel.close();
        } catch (e) { }

        setTimeout(() => {
            this._isResetting = false;
            localStorage.removeItem(draftKey);
        }, 500);

        this.updateAnswerCount();
    }

    showExplanation(questionNum) {
        if (!this.explanationMode && !this.examSubmitted) return;

        this.highlightManager.clearAllHighlights();
        this.highlightManager.highlightQuestion(questionNum);

        // Hiện badge đáp án cho câu hỏi được click
        const questionDiv = document.getElementById(`question-${questionNum}`);
        if (questionDiv) {
            const badge = questionDiv.querySelector('.correct-answer-badge');
            if (badge) badge.style.display = 'inline-block';
        }
        // Cho fill-blank và match-pairs
        document.querySelectorAll('.blank-line, .ket-match-row').forEach(wrapper => {
            const input = wrapper.querySelector('input');
            if (input && input.id === `q${questionNum}`) {
                const badge = wrapper.querySelector('.correct-answer-badge');
                if (badge) badge.style.display = 'inline-block';
            }
        });

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
        this.highlightManager.clearAllHighlights();
    }

    disableInputs() {
        if (this.currentTestData.type === 'multiple-choice') {
            document.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = true);
        } else if (this.currentTestData.type === 'fill-blank') {
            document.querySelectorAll('.fill-input').forEach(input => input.disabled = true);
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

        if (this.currentTestData.type === 'multiple-choice') {
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                const answer = submittedState.answers[i];
                if (answer) {
                    const radios = document.getElementsByName(`q${i}`);
                    radios.forEach(radio => {
                        if (radio.value === answer) {
                            radio.checked = true;
                        }
                    });
                }
            }
        } else if (this.currentTestData.type === 'fill-in' || this.currentTestData.type === 'matching') {
            for (let i = questionRange.start; i <= questionRange.end; i++) {
                const input = document.getElementById(`q${i}`);
                if (input && submittedState.answers[i]) {
                    input.value = submittedState.answers[i];
                }
            }
        }

        // Gọi submitExam để hiển thị trạng thái đã nộp
        this.submitExam();

        console.log('[Restore] Submitted state restored successfully');
    }
}

/**
 * Highlight Manager - Handles transcript highlighting
 */
class HighlightManager {
    constructor() {
        this.selectedRange = null;
        this.setupContextMenu();
    }

    setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            const highlightArea = e.target.closest('#transcriptContent, .transcript-content, .reading-content, #questionsContainer, .questions-panel, .question-item, .questions-list, #mainArea');
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

    highlightQuestion(questionNum) {
        const highlightSpans = document.querySelectorAll(`.highlightable[data-q="${questionNum}"]`);
        highlightSpans.forEach(span => {
            const parentP = span.closest('p');
            if (parentP) parentP.classList.add('transcript-highlight');
            span.classList.add('keyword-highlight');
            span.scrollIntoView({ behavior: 'smooth', block: 'center' });
            span.classList.add('scroll-highlight');
            setTimeout(() => span.classList.remove('scroll-highlight'), 1000);
        });
    }

    clearAllHighlights() {
        document.querySelectorAll('.transcript-highlight').forEach(el => el.classList.remove('transcript-highlight'));
        document.querySelectorAll('.keyword-highlight').forEach(el => el.classList.remove('keyword-highlight'));

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
        if (window.listeningCore) window.listeningCore.saveHighlightDraft();
    }

    applyHighlightSimple(range, color) {
        try {
            const span = document.createElement('span');
            span.className = `highlight-${color}`;
            if (window.listeningCore && !window.listeningCore.personalHighlightsVisible) span.classList.add('highlight-hidden');
            range.surroundContents(span);
        } catch (e) {
            const fragment = range.extractContents();
            const span = document.createElement('span');
            span.className = `highlight-${color}`;
            if (window.listeningCore && !window.listeningCore.personalHighlightsVisible) span.classList.add('highlight-hidden');
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
                if (window.listeningCore && !window.listeningCore.personalHighlightsVisible) span.classList.add('highlight-hidden');
                subRange.surroundContents(span);
            } catch (e) {
                const fragment = subRange.extractContents();
                const span = document.createElement('span');
                span.className = `highlight-${color}`;
                if (window.listeningCore && !window.listeningCore.personalHighlightsVisible) span.classList.add('highlight-hidden');
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
        if (window.listeningCore) window.listeningCore.saveHighlightDraft();
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) contextMenu.style.display = 'none';
    }
}

/**
 * Storage Manager - Handles saving results to localStorage
 */
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

        const book = testData.book || this.parseTestInfo(testData.title).book;
        const test = testData.test || this.parseTestInfo(testData.title).test;
        const part = testData.part || this.parseTestInfo(testData.title).part;
        const key = `pet_listening_book${book}_test${test}_part${part}`;
        
        // Save to localStorage (fallback)
        localStorage.setItem(key, JSON.stringify(partData));

        // Sync to Cloud
        if (window.CloudStorage) {
            window.CloudStorage.save(key, partData).then(res => {
                if (res.synced) console.log('[Cloud] Synced results for:', key);
            });
        }
    }

    saveSubmittedState(testData, userAnswers) {
        const book = testData.book || this.parseTestInfo(testData.title).book;
        const test = testData.test || this.parseTestInfo(testData.title).test;
        const part = testData.part || this.parseTestInfo(testData.title).part;
        const key = `pet_listening_book${book}_test${test}_part${part}_submitted`;
        const submittedData = {
            timestamp: Date.now(),
            answers: userAnswers,
            submitted: true
        };
        
        // Save to localStorage
        localStorage.setItem(key, JSON.stringify(submittedData));

        // Sync to Cloud
        if (window.CloudStorage) {
            window.CloudStorage.save(key, submittedData).then(res => {
                if (res.synced) console.log('[Cloud] Synced submitted state for:', key);
            });
        }
        console.log('[Storage] Saved submitted state:', key);
    }

    loadSubmittedState(testData) {
        const book = testData.book || this.parseTestInfo(testData.title).book;
        const test = testData.test || this.parseTestInfo(testData.title).test;
        const part = testData.part || this.parseTestInfo(testData.title).part;
        const key = `pet_listening_book${book}_test${test}_part${part}_submitted`;
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
        const book = testData.book || this.parseTestInfo(testData.title).book;
        const test = testData.test || this.parseTestInfo(testData.title).test;
        const part = testData.part || this.parseTestInfo(testData.title).part;
        const key = `pet_listening_book${book}_test${test}_part${part}_submitted`;
        
        localStorage.removeItem(key);

        if (window.CloudStorage) {
            window.CloudStorage.remove(key);
        }
        console.log('[Storage] Cleared submitted state:', key);
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
        } catch (e) { }

        const limit = 7 * 1024 * 1024;
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

// Global functions
window.applyHighlight = function (color) {
    if (window.listeningCore && window.listeningCore.highlightManager) {
        window.listeningCore.highlightManager.applyHighlight(color);
    }
};
window.removeHighlight = function () {
    if (window.listeningCore && window.listeningCore.highlightManager) {
        window.listeningCore.highlightManager.removeHighlight();
    }
};

window.ListeningCore = ListeningCore;