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

    // track pill being dragged out of a gap
    let _draggingFromGap = null;  // gapId string or null
    let _draggingWord    = null;  // the word string being dragged
    let _dropWasHandled  = false; // set true by any valid drop target

    /* ── document-level catch-all: thả pill ra ngoài → về bank ── */
    // Only attached once, handles the case where user drops on non-drop-target area
    let _docDropBound = false;
    function _ensureDocDrop() {
        if (_docDropBound) return;
        _docDropBound = true;

        // Accept dragover everywhere so drop fires even outside defined zones
        document.addEventListener('dragover', (e) => {
            if (_draggingFromGap !== null) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }
        });

        // Drop anywhere on page = return to bank (zones stop propagation if they handle it)
        document.addEventListener('drop', (e) => {
            if (_draggingFromGap === null) return;
            e.preventDefault();
            // If a zone/bank handler already ran, it set _dropWasHandled and stopped propagation
            // This handler only reaches here when dropped on a non-zone area
            const srcGap    = _draggingFromGap;
            const srcTaskId = e.dataTransfer.getData('task-id');
            if (srcGap && srcTaskId && !_dropWasHandled) {
                _clearGap(srcTaskId, srcGap);
                _refreshBank(srcTaskId);
            }
            _dropWasHandled = false;
        });
    }

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
        // Prevent browser from treating drag as text-selection drag
        pill.style.userSelect = 'none';
        pill.style.webkitUserSelect = 'none';
        pill.style.cursor = 'grab';

        const label = document.createElement('span');
        label.textContent = word;
        label.style.pointerEvents = 'none'; // clicks/drags pass through to pill
        pill.appendChild(label);

        const removeBtn = document.createElement('span');
        removeBtn.className = 'pill-remove';
        removeBtn.textContent = '✕';
        removeBtn.title = 'Xóa';
        removeBtn.style.pointerEvents = 'auto'; // keep click working
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            _clearGap(taskId, gapId);
            _refreshBank(taskId);
        });
        pill.appendChild(removeBtn);

        /* drag START from pill */
        pill.addEventListener('dragstart', (e) => {
            _draggingFromGap = gapId;
            _draggingWord    = word;
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
            pill.style.cursor = 'grab';
            const rz = document.getElementById('_return-zone');
            if (rz) { rz.classList.remove('active'); rz.classList.remove('drag-over'); }
            // Note: actual "return to bank" logic lives in the document-level drop handler
            _dropWasHandled  = false;
            _draggingFromGap = null;
            _draggingWord    = null;
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
            _dropWasHandled = true;
            zone.classList.remove('drag-over');
            const word      = e.dataTransfer.getData('text/plain');
            const sourceGap = e.dataTransfer.getData('source-gap');
            const srcTaskId = e.dataTransfer.getData('task-id') || taskId;

            if (!word) return;

            // dropped back onto its own gap → no-op (pill stays, nothing changes)
            if (sourceGap === gapId) {
                // Re-render pill to restore it (dragend may have faded opacity)
                _fillGap(taskId, gapId, word);
                _refreshBank(taskId);
                return;
            }

            const state      = _tasks[taskId];
            const targetWord = state ? state.gapStates.get(gapId) : null;

            // dragging from another gap in the same task
            if (sourceGap && srcTaskId === taskId) {
                if (targetWord) {
                    // target gap already has a word → SWAP the two gaps
                    _fillGap(taskId, sourceGap, targetWord);
                } else {
                    // target gap empty → just move (clear the source)
                    _clearGap(taskId, sourceGap);
                }
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
        const qContainer    = document.getElementById(`questions-${taskId}`);
        if (!bankContainer || !qContainer) return;

        // Ensure document-level catch-all drop is bound (once per page)
        _ensureDocDrop();

        // init state
        _tasks[taskId] = {
            wordBank: wordBank.slice(),
            gapStates: new Map(),
            data: data
        };

        /* ── render bank ── */
        bankContainer.innerHTML = '';

        // allow dropping a gap's pill directly back onto the bank itself
        // (in addition to the floating return-zone) to return it
        if (!bankContainer.dataset.dropBound) {
            bankContainer.dataset.dropBound = 'true';
            bankContainer.addEventListener('dragover', (e) => {
                // types is DOMStringList in some browsers — use Array.from for .includes compatibility
                const types = Array.from(e.dataTransfer.types);
                if (!types.includes('source-gap')) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                bankContainer.classList.add('drag-over');
            });
            bankContainer.addEventListener('dragleave', (e) => {
                // only remove highlight when truly leaving the bank container
                if (!bankContainer.contains(e.relatedTarget)) {
                    bankContainer.classList.remove('drag-over');
                }
            });
            bankContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                _dropWasHandled = true;
                bankContainer.classList.remove('drag-over');
                const srcGap    = e.dataTransfer.getData('source-gap');
                const srcTaskId = e.dataTransfer.getData('task-id');
                if (!srcGap || !srcTaskId) return;
                _clearGap(srcTaskId, srcGap);
                _refreshBank(srcTaskId);
            });
        }

        wordBank.forEach((word, i) => {
            const item = document.createElement('div');
            item.className = 'word-item';
            item.id        = `${taskId}-word-${i}`;
            item.dataset.word = word;
            item.draggable   = true;
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
                _draggingWord    = word;
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
                sentence   = sentence.replace(/^\d+\.\s+/, '');
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
            rz.id        = '_return-zone';
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
                _dropWasHandled = true;
                rz.classList.remove('drag-over');
                rz.classList.remove('active');
                const srcGap    = e.dataTransfer.getData('source-gap');
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
                const ans   = item.ans ? item.ans.split('|')[0] : '';
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
            const state  = _tasks[taskId];
            if (!state || !state.gapStates.has(id)) return false;

            const eyeBtn  = document.getElementById(`${id}-eye`);
            const isShown = eyeBtn && eyeBtn.classList.contains('active');
            const zone    = document.getElementById(id);
            const ans     = zone && zone.dataset.ans ? zone.dataset.ans.split('|')[0] : '';

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
   INPUT-BASED WORD-BANK ENGINE (shared by 5b / 10a / 10b style pages)
   Renders an <input> per gap plus a draggable/clickable word bank.
   Pages only need to keep their own: adjustWidth(), normalizeAnswer(),
   toggleHint(), toggleMultiGapAns() — everything about how the word
   bank itself is filled, dragged, swapped, and returned lives here.

   Exported globals:
     window.renderGapFill(id, data, bankId)
     window.allowDrop(ev)
     window.drag(ev)
     window.dragFromGap(ev)
     window.drop(ev)
     window.dropToBank(ev)
     window.clickSelect(el)
     window.updateWordBank()
============================================================ */

(function () {

    let selectedWordEl  = null;
    let dragSourceEl    = null;   // element the current drag started from (word-item OR a filled gap input)
    let dragSourceType  = null;   // 'bank' | 'gap'

    function allowDrop(ev) {
        ev.preventDefault();
    }

    // Drag start from a word-bank pill
    function drag(ev) {
        ev.dataTransfer.setData("text", ev.target.innerText);
        dragSourceEl = ev.target;
        dragSourceType = 'bank';
        selectedWordEl = ev.target;
    }

    // Drag start from a filled gap (dragging the answer back out)
    function dragFromGap(ev) {
        if (!ev.target.value || !ev.target.value.trim()) {
            ev.preventDefault();
            return;
        }
        ev.dataTransfer.setData("text", ev.target.value);
        dragSourceEl = ev.target;
        dragSourceType = 'gap';
    }

    function drop(ev) {
        ev.preventDefault();
        const data = ev.dataTransfer.getData("text");
        if (!data) return;

        if (ev.target.tagName === 'INPUT') {
            const targetOldValue = ev.target.value;
            ev.target.value = data;
            if (typeof window.adjustWidth === 'function') window.adjustWidth(ev.target);

            if (dragSourceType === 'gap' && dragSourceEl && dragSourceEl !== ev.target) {
                // Dragging gap → gap: if the target already had an answer, swap it
                // back into the source gap; otherwise the source is simply moved (cleared).
                dragSourceEl.value = targetOldValue;
                if (typeof window.adjustWidth === 'function') window.adjustWidth(dragSourceEl);
            }

            updateWordBank();
        }

        dragSourceEl = null;
        dragSourceType = null;
    }

    // Drop target: the word bank itself — dragging a filled gap here returns it
    function dropToBank(ev) {
        ev.preventDefault();
        if (dragSourceType === 'gap' && dragSourceEl) {
            dragSourceEl.value = '';
            if (typeof window.adjustWidth === 'function') window.adjustWidth(dragSourceEl);
        }
        dragSourceEl = null;
        dragSourceType = null;
        updateWordBank();
    }

    function clickSelect(el) {
        if (selectedWordEl) {
            selectedWordEl.style.background = "#eef2f7";
        }
        selectedWordEl = el;
        el.style.background = "#ffeaa7";
    }

    // Handle word bank click to input
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT' && selectedWordEl) {
            e.target.value = selectedWordEl.innerText;
            if (typeof window.adjustWidth === 'function') window.adjustWidth(e.target);
            selectedWordEl.style.background = "#eef2f7";
            selectedWordEl = null;
            updateWordBank();
        }
    });

    function updateWordBank() {
        const normalize = typeof window.normalizeAnswer === 'function'
            ? window.normalizeAnswer
            : (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,;:!?]$/, '');
        const inputs = Array.from(document.querySelectorAll('input[data-type="input"]')).map(i => normalize(i.value));
        document.querySelectorAll('.word-item').forEach(item => {
            const word = item.innerText.toLowerCase().trim();
            const usedCount = inputs.filter(v => v === word).length;
            item.classList.toggle('used', usedCount >= 1);
        });
    }

    function renderGapFill(id, data, bankId) {
        const container = document.getElementById(`questions-${id}`);
        const bank = document.getElementById(bankId);
        if (!container || !bank) return;

        container.innerHTML = '';
        bank.innerHTML = '';

        // Allow dragging a filled gap and dropping it back onto the word bank to return it
        bank.ondragover = allowDrop;
        bank.ondrop = dropToBank;

        const words = [...new Set(data.map(item => item.ans.toLowerCase()))].sort();
        words.forEach(w => {
            bank.innerHTML += `<div class="word-item" draggable="true" ondragstart="drag(event)" onclick="clickSelect(this)">${w}</div>`;
        });

        data.forEach((it, i) => {
            const qid = `${id}-q${i}`;

            let sentence = it.q;
            let numberHtml = '';
            const numberMatch = sentence.match(/^(\d+)\.\s+/);

            if (numberMatch) {
                sentence = sentence.replace(/^\d+\.\s+/, '');
                numberHtml = `<span class="existing-number">${numberMatch[1]}.</span>`;
            } else {
                numberHtml = `<span class="exercise-number">${i + 1}</span>`;
            }

            const gapCount = (sentence.match(/_{2,}/g) || []).length;
            let inputIndex = 0;

            sentence = sentence.replace(/_{2,}/g, () => {
                const inputId = `${qid}-${inputIndex}`;
                inputIndex++;
                return `<input type="text" class="word-input" id="${inputId}" data-type="input" data-parent="${qid}" data-gap-index="${inputIndex - 1}" draggable="true" oninput="adjustWidth(this)" ondragstart="dragFromGap(event)" ondrop="drop(event)" ondragover="allowDrop(event)">`;
            });

            container.innerHTML += `
            <div class="question-row" id="${qid}-row">
                ${numberHtml} ${sentence}
                <div class="row-btns">
                    <button class="btn-small" id="${qid}-eye" onclick="toggleMultiGapAns('${qid}', ${gapCount}, '${it.ans}')">👁️</button>
                    <button class="info-btn" id="${qid}-info" onclick="toggleHint('${qid}')">i</button>
                </div>
                <div class="hint-box" id="${qid}-hint">${it.hint}</div>
            </div>`;

            setTimeout(() => {
                for (let j = 0; j < gapCount; j++) {
                    const input = document.getElementById(`${qid}-${j}`);
                    if (input && it.ans) {
                        input.setAttribute('data-ans', it.ans);
                    }
                }
            }, 0);
        });
    }

    window.allowDrop = allowDrop;
    window.drag = drag;
    window.dragFromGap = dragFromGap;
    window.drop = drop;
    window.dropToBank = dropToBank;
    window.clickSelect = clickSelect;
    window.updateWordBank = updateWordBank;
    window.renderGapFill = renderGapFill;

})();