(() => {
  if (window.__chlatworkGrammarAssistantLoaded) return;
  window.__chlatworkGrammarAssistantLoaded = true;

  const style = `
    :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
    *, *::before, *::after { box-sizing: border-box; }

    /* In-field & selection Grammarly-style floating badge */
    .cw-badge {
      position: fixed;
      z-index: 2147483646;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: linear-gradient(135deg, #B60081 0%, #8c0063 100%);
      color: #ffffff;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 10px rgba(182, 0, 129, 0.38), 0 1px 3px rgba(0, 0, 0, 0.12);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
      outline: none;
      user-select: none;
    }
    .cw-badge:hover {
      transform: scale(1.12);
      box-shadow: 0 4px 14px rgba(182, 0, 129, 0.5);
    }
    .cw-badge:active {
      transform: scale(0.96);
    }
    .cw-badge svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
    .cw-badge.busy {
      animation: cw-pulse 1.2s infinite ease-in-out;
    }
    @keyframes cw-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.15); opacity: 0.8; }
    }

    /* Floating Grammarly-style inline popover */
    .cw-popover {
      position: fixed;
      z-index: 2147483647;
      width: min(390px, calc(100vw - 32px));
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 16px 42px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(15, 23, 42, 0.08);
      padding: 14px 16px;
      font-size: 13px;
      line-height: 1.45;
      color: #1e293b;
      opacity: 1;
      transition: opacity 0.12s ease;
    }

    .cw-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 11px;
      padding-bottom: 9px;
      border-bottom: 1px solid #f1f5f9;
    }
    .cw-brand {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      font-size: 13px;
      color: #0f172a;
    }
    .cw-brand span.cw-logo {
      color: #B60081;
      font-size: 15px;
    }
    .cw-controls {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .cw-icon-btn {
      background: transparent;
      border: 0;
      color: #64748b;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 14px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cw-icon-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .cw-lang-select {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
      padding: 3px 6px;
      cursor: pointer;
      outline: none;
    }
    .cw-lang-select:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    /* Mode pill switch */
    .cw-mode-switch {
      display: flex;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
      margin-bottom: 12px;
    }
    .cw-mode-pill {
      flex: 1;
      border: 0;
      background: transparent;
      padding: 5px 8px;
      font-size: 11.5px;
      font-weight: 600;
      border-radius: 6px;
      color: #64748b;
      cursor: pointer;
      text-align: center;
      transition: background 0.12s ease, color 0.12s ease;
    }
    .cw-mode-pill.active {
      background: #ffffff;
      color: #B60081;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    /* Content cards */
    .cw-card {
      border-radius: 9px;
      padding: 10px 12px;
      margin-bottom: 10px;
      font-size: 13px;
      line-height: 1.5;
      word-break: break-word;
    }
    .cw-card-original {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      color: #64748b;
      max-height: 90px;
      overflow-y: auto;
    }
    .cw-card-original s {
      color: #dc2626;
      text-decoration-color: #dc2626;
    }
    .cw-card-suggestion {
      background: #fdf2f8;
      border: 1px solid #fbcfe8;
      color: #831843;
      font-weight: 500;
      max-height: 140px;
      overflow-y: auto;
    }
    .cw-card-suggestion b {
      color: #9d174d;
      background: #fce7f3;
      padding: 1px 3px;
      border-radius: 4px;
    }

    /* States */
    .cw-loading {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 8px;
      color: #475569;
      font-size: 12.5px;
    }
    .cw-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid #f1f5f9;
      border-top-color: #B60081;
      border-radius: 50%;
      animation: cw-spin 0.7s linear infinite;
    }
    @keyframes cw-spin {
      to { transform: rotate(360deg); }
    }

    .cw-perfect {
      padding: 16px 8px;
      text-align: center;
      color: #047857;
      font-weight: 600;
      font-size: 13px;
    }

    .cw-error {
      padding: 10px 12px;
      border-radius: 8px;
      background: #fef2f2;
      border: 1px solid #fee2e2;
      color: #991b1b;
      font-size: 12px;
      margin-bottom: 10px;
    }

    /* Actions */
    .cw-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
    }
    .cw-btn {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      padding: 7px 13px;
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
      cursor: pointer;
      transition: all 0.12s ease;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .cw-btn:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .cw-btn-primary {
      background: #B60081;
      border-color: #B60081;
      color: #ffffff;
      flex: 1;
      justify-content: center;
    }
    .cw-btn-primary:hover {
      background: #98006D;
      border-color: #98006D;
    }
    .cw-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    [hidden] { display: none !important; }
  `;

  const host = document.createElement('div');
  host.setAttribute('data-chlatwork-grammar-host', '');
  const root = host.attachShadow({ mode: 'closed' });
  const sheet = document.createElement('style');
  sheet.textContent = style;
  root.append(sheet);

  // Floating Grammarly Badge
  const badge = document.createElement('button');
  badge.className = 'cw-badge';
  badge.type = 'button';
  badge.title = 'ChlatWork Grammar (Alt+Shift+G)';
  badge.setAttribute('aria-label', 'ChlatWork Grammar');
  badge.hidden = true;
  badge.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
    </svg>
  `;

  // Inline Popover
  const popover = document.createElement('section');
  popover.className = 'cw-popover';
  popover.hidden = true;
  popover.innerHTML = `
    <div class="cw-top">
      <div class="cw-brand"><span class="cw-logo">✨</span> <span id="cw-header-title">ChlatWork Grammar</span></div>
      <div class="cw-controls">
        <select class="cw-lang-select" id="cw-lang-select" title="Correction Language">
          <option value="en" selected>English</option>
          <option value="km">ខ្មែរ (Khmer)</option>
        </select>
        <button class="cw-icon-btn" id="cw-opt-btn" type="button" title="Settings">⚙</button>
        <button class="cw-icon-btn" id="cw-close-btn" type="button" title="Close">×</button>
      </div>
    </div>
    <div class="cw-mode-switch">
      <button class="cw-mode-pill active" id="cw-mode-grammar" type="button">Grammar only</button>
      <button class="cw-mode-pill" id="cw-mode-polish" type="button">Polish</button>
    </div>
    <div id="cw-body"></div>
  `;

  root.append(badge, popover);
  (document.documentElement || document.body).appendChild(host);

  const headerTitle = popover.querySelector('#cw-header-title');
  const bodyEl = popover.querySelector('#cw-body');
  const grammarPill = popover.querySelector('#cw-mode-grammar');
  const polishPill = popover.querySelector('#cw-mode-polish');
  const langSelect = popover.querySelector('#cw-lang-select');
  const settingsBtn = popover.querySelector('#cw-opt-btn');
  const closeBtn = popover.querySelector('#cw-close-btn');

  let activeEditable = null;
  let selectionContext = null;
  let currentMode = 'grammar';
  let currentLanguage = 'en';
  let isChecking = false;
  let lastCheckedText = '';
  let lastSuggestion = null;
  const correctionCache = new Map();

  const isPrivate = (element) => {
    if (!element || !(element instanceof HTMLElement)) return false;
    const tags = [element.name, element.id, element.getAttribute('autocomplete')].join(' ').toLowerCase();
    return /password|passcode|one-time-code|\botp\b|\bpin\b|cc-number|cc-csc|credit.?card/i.test(tags)
      || element.closest('[data-private], [data-sensitive], [contenteditable="false"]') !== null;
  };

  function resolveEditable(element) {
    if (!(element instanceof HTMLElement) || isPrivate(element)) return null;
    if (element instanceof HTMLTextAreaElement) return element;
    if (element instanceof HTMLInputElement) {
      return ['text', 'search', 'email', 'url'].includes(element.type) ? element : null;
    }
    const editable = element.closest('[contenteditable="true"], [contenteditable="plaintext-only"]');
    return editable && !isPrivate(editable) ? editable : null;
  }

  function readText(element) {
    if (!element) return '';
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value;
    }
    return element.innerText || '';
  }

  function canApply(element) {
    if (!element) return false;
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return true;
    return Array.from(element.querySelectorAll('*')).every((child) => child.tagName === 'BR');
  }

  function getSelectionContext(mousePos) {
    // Check if active input/textarea has highlighted text
    if (activeEditable instanceof HTMLInputElement || activeEditable instanceof HTMLTextAreaElement) {
      const start = activeEditable.selectionStart;
      const end = activeEditable.selectionEnd;
      if (typeof start === 'number' && typeof end === 'number' && end > start) {
        const text = activeEditable.value.substring(start, end).trim();
        if (text) {
          return {
            text,
            isSelection: true,
            target: activeEditable,
            start,
            end,
            mousePos,
          };
        }
      }
    }

    // Check general DOM / contenteditable selection
    const sel = window.getSelection();
    const selText = sel ? sel.toString().trim() : '';
    if (selText && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const node = range.commonAncestorContainer;
        const targetEl = node instanceof HTMLElement ? node : node.parentElement;
        const target = resolveEditable(targetEl);
        return {
          text: selText,
          isSelection: true,
          target,
          range: range.cloneRange(),
          rect,
          mousePos,
        };
      }
    }

    return null;
  }

  function updateBadgePosition() {
    // Priority 1: Floating right over highlighted text selection
    if (selectionContext?.rect) {
      badge.hidden = false;
      const rect = selectionContext.rect;
      const top = rect.top > 34 ? rect.top - 30 : rect.bottom + 6;
      const left = Math.min(window.innerWidth - 34, Math.max(8, rect.right + 4));
      badge.style.top = `${Math.max(4, top)}px`;
      badge.style.left = `${Math.max(4, left)}px`;
      return;
    }

    if (selectionContext?.mousePos) {
      badge.hidden = false;
      const top = Math.max(4, selectionContext.mousePos.y - 32);
      const left = Math.min(window.innerWidth - 34, Math.max(8, selectionContext.mousePos.x + 8));
      badge.style.top = `${top}px`;
      badge.style.left = `${left}px`;
      return;
    }

    // Priority 2: In-field badge on active input/textarea
    if (!activeEditable || !activeEditable.isConnected) {
      badge.hidden = true;
      return;
    }
    const rect = activeEditable.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
      badge.hidden = true;
      return;
    }

    badge.hidden = false;
    const isSingleLine = rect.height < 45;
    const top = isSingleLine
      ? rect.top + (rect.height - 26) / 2
      : Math.min(rect.bottom - 32, rect.top + rect.height - 32);
    const left = rect.right - 32;

    badge.style.top = `${Math.max(4, top)}px`;
    badge.style.left = `${Math.max(4, left)}px`;
  }

  function updatePopoverPosition() {
    if (popover.hidden) return;

    let anchor = null;
    if (selectionContext?.rect) {
      anchor = selectionContext.rect;
    } else if (activeEditable?.isConnected) {
      anchor = activeEditable.getBoundingClientRect();
    } else {
      anchor = badge.getBoundingClientRect();
    }

    const popoverWidth = Math.min(380, window.innerWidth - 32);
    popover.style.width = `${popoverWidth}px`;

    let left = anchor.right - popoverWidth;
    if (left < 16) left = 16;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    popover.style.left = `${left}px`;

    const roomAbove = anchor.top;
    const roomBelow = window.innerHeight - anchor.bottom;
    const placeAbove = roomAbove > 260 || roomAbove > roomBelow;

    if (placeAbove) {
      popover.style.bottom = `${window.innerHeight - anchor.top + 8}px`;
      popover.style.top = 'auto';
    } else {
      popover.style.top = `${anchor.bottom + 8}px`;
      popover.style.bottom = 'auto';
    }
  }

  function updateAllPositions() {
    updateBadgePosition();
    updatePopoverPosition();
  }

  window.addEventListener('scroll', updateAllPositions, { passive: true, capture: true });
  window.addEventListener('resize', updateAllPositions, { passive: true });

  function setMode(mode) {
    currentMode = mode;
    grammarPill.classList.toggle('active', mode === 'grammar');
    polishPill.classList.toggle('active', mode === 'polish');
    if (!popover.hidden) checkGrammar();
  }

  grammarPill.addEventListener('click', () => setMode('grammar'));
  polishPill.addEventListener('click', () => setMode('polish'));
  langSelect.addEventListener('change', () => {
    currentLanguage = langSelect.value;
    if (!popover.hidden) checkGrammar();
  });
  settingsBtn.addEventListener('click', () => { chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' }); });
  closeBtn.addEventListener('click', () => { popover.hidden = true; });

  function renderResult(text, corrected) {
    headerTitle.textContent = selectionContext?.isSelection
      ? 'ChlatWork (Selected)'
      : 'ChlatWork Grammar';

    if (!corrected || corrected === text) {
      bodyEl.innerHTML = `
        <div class="cw-perfect">✨ Looking good! No grammar errors found.</div>
        <div class="cw-actions">
          <button class="cw-btn" style="flex: 1; justify-content: center;" id="cw-dismiss-btn" type="button">Close</button>
        </div>
      `;
      popover.querySelector('#cw-dismiss-btn')?.addEventListener('click', () => {
        popover.hidden = true;
      });
      return;
    }

    const target = selectionContext?.target || activeEditable;
    const directApplyAllowed = canApply(target);
    const isSelection = Boolean(selectionContext?.isSelection);

    bodyEl.innerHTML = `
      <div class="cw-card cw-card-original" title="Original text"><s>${escapeHtml(text)}</s></div>
      <div class="cw-card cw-card-suggestion" title="Suggested correction">${escapeHtml(corrected)}</div>
      <div class="cw-actions">
        <button class="cw-btn cw-btn-primary" id="cw-accept-btn" type="button" ${directApplyAllowed ? '' : 'disabled'}>
          ✓ ${isSelection ? 'Replace Selected' : 'Accept & Replace'}
        </button>
        <button class="cw-btn" id="cw-copy-btn" type="button" title="Copy to clipboard">Copy</button>
      </div>
      ${!directApplyAllowed && target ? '<p style="margin: 6px 0 0; font-size: 11px; color: #995c07;">Rich text editor: click Copy to preserve styles.</p>' : ''}
    `;

    popover.querySelector('#cw-accept-btn')?.addEventListener('click', () => {
      applyDirectly(corrected);
    });

    popover.querySelector('#cw-copy-btn')?.addEventListener('click', async () => {
      await navigator.clipboard.writeText(corrected).catch(() => {});
      const copyBtn = popover.querySelector('#cw-copy-btn');
      if (copyBtn) copyBtn.textContent = 'Copied!';
      setTimeout(() => { popover.hidden = true; }, 700);
    });
  }

  async function checkGrammar() {
    let text = '';
    if (selectionContext?.text) {
      text = selectionContext.text;
    } else if (activeEditable && activeEditable.isConnected) {
      text = readText(activeEditable).trim();
    }

    if (!text) {
      bodyEl.innerHTML = `<div class="cw-perfect" style="color: #64748b;">Type or select text first.</div>`;
      return;
    }

    const cacheKey = `${currentLanguage}:${currentMode}:${text}`;
    if (correctionCache.has(cacheKey)) {
      renderResult(text, correctionCache.get(cacheKey));
      updatePopoverPosition();
      return;
    }

    isChecking = true;
    badge.classList.add('busy');
    bodyEl.innerHTML = `
      <div class="cw-loading">
        <div class="cw-spinner"></div>
        <span>Checking with ChlatWork AI…</span>
      </div>
    `;

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'GRAMMAR_CORRECT',
        text,
        mode: currentMode,
        language: currentLanguage,
      });

      if (!result?.ok) {
        throw new Error(result?.error || 'Correction failed.');
      }

      const corrected = (result.corrected || '').trim();
      lastCheckedText = text;
      lastSuggestion = corrected;
      correctionCache.set(cacheKey, corrected);

      renderResult(text, corrected);
    } catch (error) {
      bodyEl.innerHTML = `
        <div class="cw-error">${escapeHtml(error?.message || 'Could not connect to grammar API.')}</div>
        <div class="cw-actions">
          <button class="cw-btn cw-btn-primary" id="cw-retry-btn" type="button">Retry</button>
          <button class="cw-btn" id="cw-cancel-btn" type="button">Close</button>
        </div>
      `;
      popover.querySelector('#cw-retry-btn')?.addEventListener('click', checkGrammar);
      popover.querySelector('#cw-cancel-btn')?.addEventListener('click', () => { popover.hidden = true; });
    } finally {
      isChecking = false;
      badge.classList.remove('busy');
      updatePopoverPosition();
    }
  }

  function applyDirectly(corrected) {
    // Case 1: Replace selected text only
    if (selectionContext?.isSelection) {
      const { target, start, end, range } = selectionContext;
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        const proto = target instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
        const val = target.value;
        const nextVal = val.slice(0, start) + corrected + val.slice(end);
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(target, nextVal);
        target.selectionStart = start + corrected.length;
        target.selectionEnd = start + corrected.length;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (range) {
        range.deleteContents();
        const textNode = range.startContainer.ownerDocument.createTextNode(corrected);
        range.insertNode(textNode);
        if (target) {
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      popover.hidden = true;
      selectionContext = null;
      badge.title = 'Selected text corrected!';
      updateBadgePosition();
      return;
    }

    // Case 2: Replace whole active editable
    if (!activeEditable || !activeEditable.isConnected || !canApply(activeEditable)) return;

    if (activeEditable instanceof HTMLTextAreaElement || activeEditable instanceof HTMLInputElement) {
      const proto = activeEditable instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(activeEditable, corrected);
      activeEditable.dispatchEvent(new Event('input', { bubbles: true }));
      activeEditable.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      activeEditable.focus();
      const selection = activeEditable.ownerDocument.getSelection();
      const range = activeEditable.ownerDocument.createRange();
      range.selectNodeContents(activeEditable);
      selection.removeAllRanges();
      selection.addRange(range);
      if (!activeEditable.ownerDocument.execCommand('insertText', false, corrected)) {
        range.deleteContents();
        range.insertNode(activeEditable.ownerDocument.createTextNode(corrected));
        activeEditable.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    popover.hidden = true;
    badge.title = 'Grammar corrected!';
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openDirectCorrection() {
    const selCtx = getSelectionContext();
    if (selCtx && selCtx.text.length > 0) {
      selectionContext = selCtx;
    } else {
      const editor = activeEditable?.isConnected ? activeEditable : resolveEditable(document.activeElement);
      if (editor) activeEditable = editor;
    }

    if (!selectionContext && !activeEditable) return;

    updateBadgePosition();
    popover.hidden = false;
    updatePopoverPosition();
    checkGrammar();
  }

  badge.addEventListener('mousedown', (e) => e.preventDefault());
  badge.addEventListener('click', openDirectCorrection);

  document.addEventListener('focusin', (event) => {
    const editable = resolveEditable(event.target);
    if (editable) {
      activeEditable = editable;
      updateBadgePosition();
    }
  }, true);

  document.addEventListener('input', (event) => {
    if (event.target === activeEditable) {
      updateBadgePosition();
    }
  }, true);

  // Mouse selection trigger
  document.addEventListener('mouseup', (event) => {
    if (host.contains(event.target)) return;
    setTimeout(() => {
      const selCtx = getSelectionContext({ x: event.clientX, y: event.clientY });
      if (selCtx && selCtx.text.length > 1) {
        selectionContext = selCtx;
        updateBadgePosition();
      } else if (!selCtx && selectionContext) {
        selectionContext = null;
        updateBadgePosition();
      }
    }, 15);
  }, true);

  // Keyboard selection trigger (Shift + Arrow keys)
  document.addEventListener('keyup', (event) => {
    if (event.key === 'Shift' || event.key.startsWith('Arrow')) {
      const selCtx = getSelectionContext();
      if (selCtx && selCtx.text.length > 1) {
        selectionContext = selCtx;
        updateBadgePosition();
      }
    }
  }, true);

  document.addEventListener('pointerdown', (event) => {
    if (host.contains(event.target)) return;
    const editable = resolveEditable(event.target);
    if (editable) {
      activeEditable = editable;
      updateBadgePosition();
    } else {
      setTimeout(() => {
        const selCtx = getSelectionContext();
        if (!selCtx) {
          popover.hidden = true;
          badge.hidden = true;
          activeEditable = null;
          selectionContext = null;
        }
      }, 20);
    }
  }, true);

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'OPEN_GRAMMAR') {
      openDirectCorrection();
    }
  });
})();
