const fs = require('fs');
const path = require('path');

const files = [
    "core-reading.js",
    "core-listening.js",
    "core-reading-ket.js",
    "core-listening-ket.js"
];

const tour_code = `
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
        footer.insertBefore(btn, footer.firstChild);

        if (!document.getElementById('introjs-styles')) {
            const link = document.createElement('link');
            link.id = 'introjs-styles';
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/intro.js/7.2.0/introjs.min.css';
            document.head.appendChild(link);

            const customStyle = document.createElement('style');
            customStyle.innerHTML = \`
                .introjs-tooltip { border-radius: 12px !important; font-family: inherit !important; color: #333 !important; background-color: #fff !important; }
                .introjs-tooltip * { color: #333 !important; }
                .introjs-button { border-radius: 8px !important; font-weight: 600 !important; color: #333 !important; text-shadow: none !important; }
                .introjs-nextbutton { background: var(--primary, #0d9488) !important; color: white !important; }
                .introjs-skipbutton { color: #666 !important; position: absolute !important; right: 8px !important; top: 8px !important; width: 30px !important; height: 30px !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 20px !important; padding: 0 !important; text-decoration: none !important; line-height: 1 !important; z-index: 10 !important; background: transparent !important; }
                .introjs-skipbutton:hover { color: #000 !important; }
                body.introjs-showElement .ielts-header, body:has(.introjs-overlay) .ielts-header { transform: translateY(0) !important; opacity: 1 !important; visibility: visible !important; top: 0 !important; display: flex !important; }
                body.introjs-showElement .bottom-bar, body:has(.introjs-overlay) .bottom-bar { transform: translateY(0) !important; opacity: 1 !important; visibility: visible !important; bottom: 0 !important; display: flex !important; }
                .introjs-fixParent { z-index: 1000001 !important; }
                .introjs-showElement { z-index: 1000002 !important; position: relative !important; }
            \`;
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
            const header = document.querySelector('.ielts-header') || document.querySelector('header');
            const leftCol = document.querySelector('.left-col') || document.querySelector('.reading-card') || document.querySelector('.audio-section') || document.querySelector('.transcript-panel');
            const rightCol = document.querySelector('.right-col') || document.querySelector('.questions-list') || document.querySelector('.questions-container') || document.querySelector('.questions-panel');
            const submitBtn = document.getElementById('submitBtn');
            const dashboardBtn = document.getElementById('mini-dashboard-toggle');
            const noteBtn = document.querySelector('.note-toggle-btn');
            const timer = document.getElementById('timerDisplay') || document.querySelector('.timer');
            const storageContainer = document.getElementById('storageContainer') || document.getElementById('storageIndicator');

            const steps = [];
            if (header) steps.push({ element: header, title: 'ℹ️ Thông tin bài thi', intro: 'Khu vực hiển thị tiêu đề bài thi và các thông tin cơ bản.' });
            if (timer) steps.push({ element: timer, title: '⏱️ Đồng hồ đếm ngược', intro: 'Theo dõi thời gian làm bài còn lại.' });
            if (leftCol) steps.push({ element: leftCol, title: '📖 Nội dung bài', intro: 'Nội dung bài đọc/nghe nằm ở đây. Bạn có thể bôi đen văn bản để highlight.' });
            if (rightCol) steps.push({ element: rightCol, title: '📝 Danh sách câu hỏi', intro: 'Trả lời các câu hỏi tại khu vực này. Trạng thái sẽ được lưu tự động.' });
            if (noteBtn) steps.push({ element: noteBtn, title: '🗒️ Ghi chú nhanh', intro: 'Mở popup ghi chú để nháp thông tin trong lúc làm bài.' });
            if (dashboardBtn) steps.push({ element: dashboardBtn, title: '📊 Tiến độ bài thi', intro: 'Mở bảng theo dõi số lượng câu đã làm ở các Part khác.' });
            if (storageContainer) steps.push({ element: storageContainer, title: '💾 Lưu trữ & Đồng bộ', intro: 'Theo dõi chế độ lưu dữ liệu (Cloud/Hybrid) và quản lý bộ nhớ của bài làm.' });
            if (submitBtn) steps.push({ element: submitBtn, title: '✅ Nộp bài', intro: 'Khi hoàn thành, nhấn Nộp bài để xem điểm số và giải thích chi tiết.' });

            if (steps.length === 0) return;

            const tour = introJs().setOptions({
                steps: steps,
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
            tour.onexit(() => { if(helpBtn) helpBtn.style.display = 'flex'; });
            tour.oncomplete(() => { if(helpBtn) helpBtn.style.display = 'flex'; });
            tour.start();
        });
    }
}
`;

const baseDir = __dirname;

files.forEach(f => {
    const filePath = path.join(baseDir, f);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        if (!content.includes("class TestTourManager")) {
            if (content.includes("class ReadingCore {")) {
                content = content.replace("class ReadingCore {", tour_code + "\\nclass ReadingCore {");
            } else if (content.includes("class ListeningCore {")) {
                content = content.replace("class ListeningCore {", tour_code + "\\nclass ListeningCore {");
            }
            
            content = content.replace(/this\.updateAnswerCount\(\);/g, "this.updateAnswerCount();\\n        if (typeof TestTourManager !== 'undefined') new TestTourManager().init();");
            
            fs.writeFileSync(filePath, content, 'utf8');
            console.log("Updated " + f);
        } else {
            console.log("Already updated " + f);
        }
    }
});
