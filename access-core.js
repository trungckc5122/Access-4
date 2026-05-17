/**
 * ACCESS 4 CORE ENGINE - Standardized Home Button & Favicon
 * Injects the academic 'Tr' favicon and a premium Home navigation button.
 */
(function() {
    // 1. Premium 'Tr' Favicon Data URI
    const faviconUri = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOSIgZmlsbD0iIzBkOTQ4OCIvPjxwYXRoIGQ9Ik02IDEwaDEydjNoLTQuNXYxMWgtM3YtMTFINnYtM3ptMTQgNnY4aC0zdi01YzAtMS41IDEtMi41IDIuNS0yLjVoMi41djNoLTJ6IiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMjYiIGN5PSI2IiByPSIzIiBmaWxsPSIjZmJiZjI0Ii8+PC9zdmc+";

    const injectFavicon = () => {
        if (!document.querySelector('link[rel*="icon"]')) {
            const link = document.createElement('link');
            link.rel = 'icon';
            link.type = 'image/svg+xml';
            link.href = faviconUri;
            document.head.appendChild(link);
        }
        if (!document.querySelector('link[rel="apple-touch-icon"]')) {
            const link = document.createElement('link');
            link.rel = 'apple-touch-icon';
            link.href = faviconUri;
            document.head.appendChild(link);
        }
    };

    // 2. Home Button Injection
    const injectHomeBtn = () => {
        const h1 = document.querySelector('h1');
        if (h1 && !document.querySelector('.home-btn')) {
            const homeBtn = document.createElement('a');
            
            // Logic: 
            // - If on a lesson/review page: Link to access 4/index.html
            // - If on access 4/index.html: Link to main root index.html
            const filename = window.location.pathname.split('/').pop().toLowerCase();
            const isIndex = filename === 'index.html' || filename === '';
            
            if (isIndex) {
                homeBtn.href = '../index.html';
                homeBtn.title = 'Về trang chủ chính';
            } else {
                homeBtn.href = 'index.html'; 
                homeBtn.title = 'Về danh sách bài học';
            }
            
            homeBtn.className = 'home-btn';
            homeBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
            `;

            h1.style.display = 'flex';
            h1.style.alignItems = 'center';
            h1.style.justifyContent = 'center';
            h1.style.gap = '16px';
            h1.style.position = 'relative';
            h1.style.paddingLeft = '60px';

            h1.prepend(homeBtn);
        }
    };

    // 3. Theme Toggle Injection & Logic
    const injectThemeToggle = () => {
        if (!document.getElementById('theme-toggle')) {
            const btn = document.createElement('button');
            btn.id = 'theme-toggle';
            btn.className = 'theme-toggle-btn';
            btn.title = 'Chế độ Sáng/Tối';
            
            // Set initial theme from localStorage or default
            const savedTheme = localStorage.getItem('access-theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            btn.innerHTML = savedTheme === 'dark' ? '☀️' : '🌙';

            btn.onclick = () => {
                const current = document.documentElement.getAttribute('data-theme');
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                btn.innerHTML = next === 'dark' ? '☀️' : '🌙';
                localStorage.setItem('access-theme', next);
            };
            
            document.body.prepend(btn);
        }
    };

    // 4. Global Enter Key Listener for checkAll
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (typeof window.checkAll === 'function') {
                window.checkAll();
            }
        }
    });

    // 4. Auto-bold Question Numbers
    const boldNumbers = () => {
        const targets = document.querySelectorAll('.question-row, .ex4-question, .par-num, .dialogue-line, .syn-opp-label, .row-number');
        targets.forEach(el => {
            if (el.dataset.numbered === "true" || el.querySelector('.q-number')) return;
            
            let first = el.firstChild;
            if (first && first.nodeType === 3) {
                const m = first.nodeValue.match(/^\s*(\d+[\.\)]?\s*)/);
                if (m) {
                    const numText = m[1];
                    first.nodeValue = first.nodeValue.replace(numText, "");
                    const span = document.createElement('span');
                    span.className = 'q-number';
                    span.textContent = numText;
                    el.insertBefore(span, first);
                    el.dataset.numbered = "true";
                }
            } else if (first && first.nodeType === 1 && (first.tagName === 'SPAN' || first.tagName === 'STRONG')) {
                const text = first.textContent.trim();
                if (/^\d+[\.\)]?$/.test(text)) {
                    first.classList.add('q-number');
                    el.dataset.numbered = "true";
                }
            }
        });
    };

    // 5. Global Input Listener to clear feedback styling on user correction
    document.addEventListener('input', (e) => {
        const target = e.target;
        if (target && target.tagName === 'INPUT') {
            target.classList.remove('correct', 'incorrect-marked');
        }
    });

    // Initialize on load
    const init = () => {
        injectFavicon();
        injectHomeBtn();
        injectThemeToggle();
        boldNumbers();
        
        // Watch for dynamic content (exercises rendered via JS)
        const observer = new MutationObserver(() => {
            boldNumbers();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
