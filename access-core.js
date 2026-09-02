/**
 * ACCESS 4 CORE ENGINE - Standardized Home Button & Favicon
 * Injects the academic 'Tr' favicon and a premium Home navigation button.
 */
(function () {
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

    // 6. Transcript Panel: auto-inject close button & fix sticky scope
    const initTranscriptPanels = () => {
        document.querySelectorAll('.transcript-panel').forEach(panel => {
            // Skip if already processed
            if (panel.dataset.transcriptInit === '1') return;
            panel.dataset.transcriptInit = '1';

            // ── (a) Inject ✕ close button if not already present ──
            if (!panel.querySelector('.transcript-close-injected') &&
                !panel.querySelector('.close-transcript-btn')) {
                let header = panel.querySelector('h2, h3');
                if (header) {
                    const parent = header.parentElement;
                    // Skip if parent already has a button (close button already exists)
                    const parentHasClose = parent !== panel &&
                        parent.querySelector('button') !== null;

                    if (!parentHasClose) {
                        const isAlreadyFlex =
                            parent !== panel &&
                            (window.getComputedStyle(parent).display === 'flex' ||
                             parent.style.display === 'flex');

                        const closeBtn = document.createElement('button');
                        closeBtn.className = 'transcript-close-injected';
                        closeBtn.title = 'Đóng transcript';
                        closeBtn.innerHTML = '✕';
                        closeBtn.style.cssText = [
                            'background:none', 'border:none', 'cursor:pointer',
                            'font-size:1.3rem', 'color:var(--primary)', 'line-height:1',
                            'padding:2px 6px', 'border-radius:6px', 'flex-shrink:0',
                            'transition:background 0.2s', 'margin-left:auto'
                        ].join(';');
                        closeBtn.addEventListener('mouseover', () => closeBtn.style.background = 'var(--primary-light)');
                        closeBtn.addEventListener('mouseout',  () => closeBtn.style.background = 'none');
                        closeBtn.addEventListener('click', () => panel.classList.remove('active'));

                        if (isAlreadyFlex) {
                            parent.appendChild(closeBtn);
                        } else {
                            const row = document.createElement('div');
                            row.style.cssText = [
                                'display:flex', 'align-items:center',
                                'justify-content:space-between',
                                'border-bottom:2px solid var(--primary)',
                                'padding-bottom:10px', 'margin-bottom:20px'
                            ].join(';');
                            header.style.margin = '0';
                            header.style.border = 'none';
                            header.style.padding = '0';
                            header.parentNode.insertBefore(row, header);
                            row.appendChild(header);
                            row.appendChild(closeBtn);
                        }
                    }
                }
            }

            // ── (b) Fix sticky scope with position:fixed bounded to container ──
            const container = panel.closest('.reading-split-container');
            if (!container) return;

            // Placeholder keeps the flex layout width when panel goes fixed
            const placeholder = document.createElement('div');
            placeholder.style.cssText = 'flex-shrink:0;width:0;transition:width 0.3s;';
            container.insertBefore(placeholder, panel);

            // Force panel out of normal flow so sticky doesn't leak beyond container
            panel.style.position = 'fixed';
            panel.style.overflowY = 'auto';
            panel.style.zIndex = '200';
            panel.style.boxShadow = '2px 0 12px rgba(0,0,0,0.10)';
            panel.style.display = 'none'; // hidden until active

            const updateFixedPanel = () => {
                if (!panel.classList.contains('active')) {
                    panel.style.display = 'none';
                    placeholder.style.width = '0';
                    return;
                }

                const cRect = container.getBoundingClientRect();
                const vh = window.innerHeight;

                // If container is not visible at all, hide panel
                if (cRect.bottom < 0 || cRect.top > vh) {
                    panel.style.display = 'none';
                    return;
                }

                panel.style.display = '';

                // Clamp panel top/bottom inside viewport AND container bounds
                const panelTop = Math.max(cRect.top, 20);
                const panelBottom = Math.min(cRect.bottom, vh - 10);
                const panelH = Math.max(panelBottom - panelTop, 100);

                // Width: 45% of container, max 480px
                const panelW = Math.min(cRect.width * 0.45, 480);

                panel.style.top = panelTop + 'px';
                panel.style.left = cRect.left + 'px';
                panel.style.width = panelW + 'px';
                panel.style.height = panelH + 'px';
                // Ensure padding is set (CSS .active rule may not apply on fixed)
                if (!panel.style.padding) panel.style.padding = '25px';

                // Sync placeholder width to reserve space in the flex row
                placeholder.style.width = panelW + 'px';
            };

            // Watch active class changes
            const mo = new MutationObserver(updateFixedPanel);
            mo.observe(panel, { attributes: true, attributeFilter: ['class'] });

            // Update on scroll and resize
            window.addEventListener('scroll', updateFixedPanel, { passive: true });
            window.addEventListener('resize', updateFixedPanel, { passive: true });

            // Run once now
            updateFixedPanel();
        });
    };

    // Initialize on load
    const init = () => {
        injectFavicon();
        injectHomeBtn();
        injectThemeToggle();
        boldNumbers();
        initTranscriptPanels();

        // Watch for dynamic content (exercises rendered via JS)
        const observer = new MutationObserver((mutations) => {
            boldNumbers();
            // Re-scan for any newly added transcript panels
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    const panels = node.classList && node.classList.contains('transcript-panel')
                        ? [node]
                        : [...node.querySelectorAll('.transcript-panel')];
                    if (panels.length) initTranscriptPanels();
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();


/* ============================================================
   GAP-FILL DROP-ZONE ENGINE  (renderGapFillDrop)
   Replaces the old <input>-based renderGapFillWithWordBank.

   API:
     renderGapFillDrop(taskId, data, wordBank)
       taskId   – string, e.g. 't2'
       data     – array of { q, ans, hint, wordBankIndex? }
       wordBank – array of word strings (same index order as before)

   Exported globals:
     window._gapDrop.showAnswers(prefix)
     window._gapDrop.resetSection(prefix)
     window._gapDrop.toggleSingleAns(id)  → returns true if handled
     window._gapDrop.checkAll()
     window._gapDrop.hasTask(prefix)
============================================================ */

(function () {

    /* ── internal state ─────────────────────────────────────── */
    // Map: taskId → { wordBank[], gapStates: Map<gapId, word|null> }
    const _tasks = {};

    // track which gapId is being dragged (pill → pill transfer)
    let _draggingFromGap = null;  // gapId string or null
    let _draggingWord = null;  // the word string being dragged

    /* ── helpers ─────────────────────────────────────────────── */
    function _normWord(w) {
        return (w || '').toLowerCase().trim().replace(/\s+/g, ' ');
    }

    function _getBankItem(taskId, word) {
        const bank = document.getElementById(`bank-${taskId}`);
        if (!bank) return null;
        // Use querySelectorAll + filter to avoid CSS.escape issues with spaces/special chars
        return Array.from(bank.querySelectorAll('.word-item')).find(
            el => el.dataset.word === word
        ) || null;
    }

    function _refreshBank(taskId) {
        const state = _tasks[taskId];
        if (!state) return;
        // Build set of words currently used in gaps (normalized for comparison)
        const usedNorm = new Set(
            [...state.gapStates.values()].filter(Boolean).map(_normWord)
        );
        state.wordBank.forEach(w => {
            const el = _getBankItem(taskId, w);
            if (!el) return;
            if (usedNorm.has(_normWord(w))) {
                el.classList.add('used');
            } else {
                el.classList.remove('used');
            }
        });
    }

    /* build a pill element */
    function _makePill(word, gapId, taskId) {
        const pill = document.createElement('span');
        pill.className = 'gap-pill';
        pill.draggable = true;
        pill.dataset.word = word;
        pill.dataset.gapId = gapId;
        pill.dataset.taskId = taskId;

        const label = document.createElement('span');
        label.textContent = word;
        pill.appendChild(label);

        const removeBtn = document.createElement('span');
        removeBtn.className = 'pill-remove';
        removeBtn.textContent = '✕';
        removeBtn.title = 'Xóa';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            _clearGap(taskId, gapId);
            _refreshBank(taskId);
        });
        pill.appendChild(removeBtn);

        /* drag START from pill */
        pill.addEventListener('dragstart', (e) => {
            _draggingFromGap = gapId;
            _draggingWord = word;
            e.dataTransfer.setData('text/plain', word);
            e.dataTransfer.setData('source-gap', gapId);
            e.dataTransfer.setData('task-id', taskId);
            e.dataTransfer.effectAllowed = 'move';
            // show return-zone
            const rz = document.getElementById('_return-zone');
            if (rz) rz.classList.add('active');
            setTimeout(() => pill.style.opacity = '0.4', 0);
        });

        pill.addEventListener('dragend', () => {
            pill.style.opacity = '';
            _draggingFromGap = null;
            _draggingWord = null;
            const rz = document.getElementById('_return-zone');
            if (rz) { rz.classList.remove('active'); rz.classList.remove('drag-over'); }
        });

        return pill;
    }

    /* place a word into a gap */
    function _fillGap(taskId, gapId, word) {
        const state = _tasks[taskId];
        if (!state) return;
        // gapStates already has the old word at this point — just overwrite.
        // _refreshBank will recompute used/free correctly from the new state.
        state.gapStates.set(gapId, word);

        const zone = document.getElementById(gapId);
        if (!zone) return;
        zone.innerHTML = '';
        zone.classList.remove('correct', 'incorrect-marked', 'drag-over');
        zone.appendChild(_makePill(word, gapId, taskId));
    }

    /* clear a gap */
    function _clearGap(taskId, gapId) {
        const state = _tasks[taskId];
        if (state) state.gapStates.set(gapId, null);
        const zone = document.getElementById(gapId);
        if (zone) {
            zone.innerHTML = '';
            zone.classList.remove('correct', 'incorrect-marked');
        }
    }

    /* attach drop events to a gap zone */
    function _bindZone(zone, taskId, gapId) {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const word = e.dataTransfer.getData('text/plain');
            const sourceGap = e.dataTransfer.getData('source-gap');
            const srcTaskId = e.dataTransfer.getData('task-id') || taskId;

            if (!word) return;

            // if dragging from another gap in same task, clear the source gap
            if (sourceGap && sourceGap !== gapId && srcTaskId === taskId) {
                _clearGap(taskId, sourceGap);
            }

            _fillGap(taskId, gapId, word);
            _refreshBank(taskId);
        });

        // also allow click on empty zone to select from bank
        zone.addEventListener('click', () => {
            const state = _tasks[taskId];
            if (!state) return;
            // if already filled, do nothing (pill's ✕ handles clear)
            if (state.gapStates.get(gapId)) return;
            // find first unused word in bank and fill
            const usedWords = new Set(
                [...state.gapStates.values()].filter(Boolean).map(_normWord)
            );
            // we won't auto-fill on click of empty zone (could be confusing);
            // clicking a bank word auto-fills the first empty zone (see below)
        });
    }

    /* ── public: renderGapFillDrop ──────────────────────────── */
    window.renderGapFillDrop = function (taskId, data, wordBank) {
        const bankContainer = document.getElementById(`bank-${taskId}`);
        const qContainer = document.getElementById(`questions-${taskId}`);
        if (!bankContainer || !qContainer) return;

        // init state
        _tasks[taskId] = {
            wordBank: wordBank.slice(),
            gapStates: new Map(),
            data: data
        };

        /* ── render bank ── */
        bankContainer.innerHTML = '';
        wordBank.forEach((word, i) => {
            const item = document.createElement('div');
            item.className = 'word-item';
            item.id = `${taskId}-word-${i}`;
            item.dataset.word = word;
            item.draggable = true;
            item.textContent = word.toLowerCase();

            /* drag from bank */
            item.addEventListener('dragstart', (e) => {
                // If this word is already in a gap, mark the source gap so it gets cleared on drop
                let sourceGapId = null;
                const state = _tasks[taskId];
                if (state && item.classList.contains('used')) {
                    for (const [gid, val] of state.gapStates.entries()) {
                        if (val && _normWord(val) === _normWord(word)) {
                            sourceGapId = gid;
                            break;
                        }
                    }
                }
                _draggingFromGap = sourceGapId;
                _draggingWord = word;
                e.dataTransfer.setData('text/plain', word);
                e.dataTransfer.setData('task-id', taskId);
                if (sourceGapId) e.dataTransfer.setData('source-gap', sourceGapId);
                e.dataTransfer.effectAllowed = 'move';
                // Show return-zone only when dragging from a gap (via bank re-drag)
                if (sourceGapId) {
                    const rz = document.getElementById('_return-zone');
                    if (rz) rz.classList.add('active');
                }
                setTimeout(() => item.style.opacity = '0.4', 0);
            });
            item.addEventListener('dragend', () => {
                item.style.opacity = '';
                _draggingFromGap = null;
                _draggingWord = null;
                const rz = document.getElementById('_return-zone');
                if (rz) { rz.classList.remove('active'); rz.classList.remove('drag-over'); }
            });

            /* click bank word → fill first empty gap */
            item.addEventListener('click', () => {
                if (item.classList.contains('used')) return;
                const state = _tasks[taskId];
                for (const [gid, val] of state.gapStates.entries()) {
                    if (!val) {
                        _fillGap(taskId, gid, word);
                        _refreshBank(taskId);
                        return;
                    }
                }
            });

            bankContainer.appendChild(item);
        });

        /* ── render questions ── */
        qContainer.innerHTML = '';
        data.forEach((item, i) => {
            const gapId = `${taskId}-q${i}`;
            _tasks[taskId].gapStates.set(gapId, null);

            let sentence = item.q;
            let numberHtml = '';
            const numMatch = sentence.match(/^(\d+)\.\s+/);
            if (numMatch) {
                sentence = sentence.replace(/^\d+\.\s+/, '');
                numberHtml = `<span class="existing-number">${numMatch[1]}.</span>`;
            } else {
                numberHtml = `<span class="exercise-number">${i + 1}</span>`;
            }

            // split on ______
            const parts = sentence.split('______');
            let sentenceHtml = parts[0];
            sentenceHtml += `<span class="gap-drop-zone" id="${gapId}" data-task="${taskId}" data-ans="${item.ans}"></span>`;
            if (parts[1]) sentenceHtml += parts[1];

            const row = document.createElement('div');
            row.className = 'question-row';
            row.id = `${gapId}-row`;
            row.innerHTML = `
                ${numberHtml} ${sentenceHtml}
                <div class="row-btns">
                    <button class="btn-small" id="${gapId}-eye" onclick="toggleSingleAns('${gapId}')" title="Show/Hide">👁️</button>
                    <button class="info-btn" id="${gapId}-info" onclick="toggleHint('${gapId}')">i</button>
                </div>
                <div class="hint-box" id="${gapId}-hint">${item.hint || ''}</div>
            `;
            qContainer.appendChild(row);

            // bind drop zone
            const zone = document.getElementById(gapId);
            if (zone) _bindZone(zone, taskId, gapId);
        });

        /* ── global return-zone (drop pill here to return to bank) ── */
        let rz = document.getElementById('_return-zone');
        if (!rz) {
            rz = document.createElement('div');
            rz.id = '_return-zone';
            rz.className = 'return-to-bank-zone';
            rz.innerHTML = '↩ Thả để trả về Word Bank';
            document.body.appendChild(rz);

            rz.addEventListener('dragover', (e) => {
                e.preventDefault();
                rz.classList.add('drag-over');
            });
            rz.addEventListener('dragleave', () => {
                rz.classList.remove('drag-over');
            });
            rz.addEventListener('drop', (e) => {
                e.preventDefault();
                rz.classList.remove('drag-over');
                rz.classList.remove('active');
                const srcGap = e.dataTransfer.getData('source-gap');
                const srcTaskId = e.dataTransfer.getData('task-id');
                if (srcGap && srcTaskId) {
                    _clearGap(srcTaskId, srcGap);
                    _refreshBank(srcTaskId);
                }
            });
        }
    };

    /* ── expose public API via window._gapDrop ──────────────── */
    window._gapDrop = {

        showAnswers: function (prefix) {
            const state = _tasks[prefix];
            if (!state) return;
            state.data.forEach((item, i) => {
                const gapId = `${prefix}-q${i}`;
                const ans = item.ans ? item.ans.split('|')[0] : '';
                if (ans) {
                    _fillGap(prefix, gapId, ans);
                    const zone = document.getElementById(gapId);
                    if (zone) zone.classList.add('correct');
                    const pill = zone && zone.querySelector('.gap-pill');
                    if (pill) pill.classList.add('correct');
                }
                const eyeBtn = document.getElementById(`${gapId}-eye`);
                if (eyeBtn) eyeBtn.classList.add('active');
            });
            _refreshBank(prefix);
        },

        resetSection: function (prefix) {
            const state = _tasks[prefix];
            if (!state) return;
            state.gapStates.forEach((_, gapId) => _clearGap(prefix, gapId));
            _refreshBank(prefix);
            const qc = document.getElementById(`questions-${prefix}`);
            if (qc) {
                qc.querySelectorAll('.hint-box').forEach(h => h.style.display = 'none');
                qc.querySelectorAll('[id$="-eye"]').forEach(b => b.classList.remove('active'));
                qc.querySelectorAll('[id$="-info"]').forEach(b => b.classList.remove('active'));
            }
        },

        toggleSingleAns: function (id) {
            const taskId = id.split('-')[0];
            const state = _tasks[taskId];
            if (!state || !state.gapStates.has(id)) return false;

            const eyeBtn = document.getElementById(`${id}-eye`);
            const isShown = eyeBtn && eyeBtn.classList.contains('active');
            const zone = document.getElementById(id);
            const ans = zone && zone.dataset.ans ? zone.dataset.ans.split('|')[0] : '';

            if (isShown) {
                _clearGap(taskId, id);
                _refreshBank(taskId);
                if (eyeBtn) eyeBtn.classList.remove('active');
            } else if (ans) {
                _fillGap(taskId, id, ans);
                if (zone) zone.classList.add('correct');
                const pill = zone && zone.querySelector('.gap-pill');
                if (pill) pill.classList.add('correct');
                _refreshBank(taskId);
                if (eyeBtn) eyeBtn.classList.add('active');
            }
            return true; // handled
        },

        checkAll: function () {
            Object.entries(_tasks).forEach(([taskId, state]) => {
                state.gapStates.forEach((word, gapId) => {
                    const zone = document.getElementById(gapId);
                    if (!zone) return;
                    zone.classList.remove('correct', 'incorrect-marked');
                    const pill = zone.querySelector('.gap-pill');
                    if (pill) pill.classList.remove('correct', 'incorrect-marked');
                    if (!word) return;
                    const ans = zone.dataset.ans || '';
                    const correct = ans.split('|').some(a => _normWord(a) === _normWord(word));
                    zone.classList.add(correct ? 'correct' : 'incorrect-marked');
                    if (pill) pill.classList.add(correct ? 'correct' : 'incorrect-marked');
                });
            });
        },

        hasTask: function (prefix) {
            return !!_tasks[prefix];
        }
    };

})();


/* ============================================================
   SHARED INLINE-HINT TOOLTIP FIX (scroll/resize tracking)

   Every exercise file defines its own local `toggleHint(event, id)`
   in its own <script> block, BEFORE this file loads. Since
   `<script src="access-core.js">` always comes LAST in every file,
   assigning `window.toggleHint` here overrides that local (buggy)
   copy automatically — no need to edit each file individually.

   The bug being fixed: `.inline-hint` tooltips use
   `position: fixed`, with top/left computed once at click time.
   On scroll, the tooltip used to stay glued to the viewport instead
   of following its anchor button, making it appear to "float away"
   from the question it explains. This version recomputes the
   position on every scroll/resize while a tooltip is open.

   Files that only use `.hint-box` (not `.inline-hint`) are
   unaffected — this function preserves that original show/hide
   behavior unchanged.
============================================================ */
(function () {
    let activeInlineHint = null; // { hintEl, btnEl }

    function positionInlineHint(h, btn) {
        const rect = btn.getBoundingClientRect();
        const hintW = 260;
        let left = rect.left + rect.width / 2 - hintW / 2;
        if (left < 8) left = 8;
        if (left + hintW > window.innerWidth - 8) left = window.innerWidth - hintW - 8;
        h.style.left = left + 'px';
        h.style.top = (rect.top - h.offsetHeight - 12) + 'px';
    }

    window.toggleHint = function (id, eventOrWord) {
        // Back-compat: every info-btn across all files calls
        // toggleHint('${qid}') or toggleHint('${qid}', wordToSpeak) —
        // id is ALWAYS the first argument, never an Event. Grab the
        // real click event from window.event instead of expecting
        // it to be passed in.
        const event = window.event || null;
        if (event) event.stopPropagation();
        const h = document.getElementById(id + '-hint');
        if (!h) return;
        const isVisible = h.style.display === 'block';
        document.querySelectorAll('.hint-box, .inline-hint').forEach(el => el.style.display = 'none');
        activeInlineHint = null;
        if (!isVisible) {
            if (h.classList.contains('inline-hint')) {
                const btn = (event && event.currentTarget) ? event.currentTarget : document.getElementById(id + '-info');
                h.style.display = 'block';
                if (btn) {
                    positionInlineHint(h, btn);
                    activeInlineHint = { hintEl: h, btnEl: btn };
                }
            } else {
                h.style.display = 'block';
            }
        }
    };

    window.addEventListener('scroll', () => {
        if (activeInlineHint && activeInlineHint.hintEl.style.display === 'block') {
            positionInlineHint(activeInlineHint.hintEl, activeInlineHint.btnEl);
        }
    }, true);

    window.addEventListener('resize', () => {
        if (activeInlineHint && activeInlineHint.hintEl.style.display === 'block') {
            positionInlineHint(activeInlineHint.hintEl, activeInlineHint.btnEl);
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.hint-btn') && !e.target.closest('.eye-btn') && !e.target.closest('.hint-box') && !e.target.closest('.inline-hint')) {
            document.querySelectorAll('.hint-box, .inline-hint').forEach(el => el.style.display = 'none');
            activeInlineHint = null;
        }
    });
})();