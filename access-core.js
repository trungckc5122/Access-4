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

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectFavicon();
            injectHomeBtn();
        });
    } else {
        injectFavicon();
        injectHomeBtn();
    }
})();
