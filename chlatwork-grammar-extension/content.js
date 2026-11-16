(() => {
  if (window.__chlatworkGrammarAssistantLoaded) return;
  window.__chlatworkGrammarAssistantLoaded = true;

  const style = `
    :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
    *, *::before, *::after { box-sizing: border-box; }

    /* In-field Grammarly-style floating badge */
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
      gap: 4px;
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
      <div class="cw-brand"><span class="cw-logo">✨</span> ChlatWork Grammar</div>
      <div class="cw-controls">
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

  const bodyEl = popover.querySelector('#cw-body');
  const grammarPill = popover.querySelector('#cw-mode-grammar');
  const polishPill = popover.querySelector('#cw-mode-polish');
  const settingsBtn = popover.querySelector('#cw-opt-btn');
  const closeBtn = popover.querySelector('#cw-close-btn');

  let activeEditable = null;
  let currentMode = 'grammar';
  let isChecking = false;
  let lastCheckedText = '';
  let lastSuggestion = null;

  const isPrivate = (element) => {
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
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return true;
    return Array.from(element.querySelectorAll('*')).every((child) => child.tagName === 'BR');
  }

  function updateBadgePosition() {
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
    if (!activeEditable || !activeEditable.isConnected || popover.hidden) return;
    const rect = activeEditable.getBoundingClientRect();
    const popoverWidth = Math.min(380, window.innerWidth - 32);
    popover.style.width = `${popoverWidth}px`;

    let left = rect.right - popoverWidth;
    if (left < 16) left = 16;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    popover.style.left = `${left}px`;

    const roomAbove = rect.top;
    const roomBelow = window.innerHeight - rect.bottom;
    const placeAbove = roomAbove > 260 || roomAbove > roomBelow;

    if (placeAbove) {
      popover.style.bottom = `${window.innerHeight - rect.top + 8}px`;
      popover.style.top = 'auto';
    } else {
      popover.style.top = `${rect.bottom + 8}px`;
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
  settingsBtn.addEventListener('click', () => { chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' }); });
  closeBtn.addEventListener('click', () => { popover.hidden = true; });

  async function checkGrammar() {
    if (!activeEditable || !activeEditable.isConnected) return;
    const text = readText(activeEditable).trim();
    if (!text) {
      bodyEl.innerHTML = `<div class="cw-perfect" style="color: #64748b;">Type something in the text field first.</div>`;
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
      });

      if (!result?.ok) {
        throw new Error(result?.error || 'Correction failed.');
      }

      const corrected = (result.corrected || '').trim();
      lastCheckedText = text;
      lastSuggestion = corrected;

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

      // Show Grammarly-style 1-click replacement UI
      const directApplyAllowed = canApply(activeEditable);
      bodyEl.innerHTML = `
        <div class="cw-card cw-card-original" title="Original text"><s>${escapeHtml(text)}</s></div>
        <div class="cw-card cw-card-suggestion" title="Suggested correction">${escapeHtml(corrected)}</div>
        <div class="cw-actions">
          <button class="cw-btn cw-btn-primary" id="cw-accept-btn" type="button" ${directApplyAllowed ? '' : 'disabled'}>
            ✓ Accept & Replace
          </button>
          <button class="cw-btn" id="cw-copy-btn" type="button" title="Copy to clipboard">Copy</button>
        </div>
        ${!directApplyAllowed ? '<p style="margin: 6px 0 0; font-size: 11px; color: #995c07;">Rich text editor: click Copy to preserve styles.</p>' : ''}
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
    // Brief visual feedback on badge
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
    const editor = activeEditable?.isConnected ? activeEditable : resolveEditable(document.activeElement);
    if (!editor) return;
    activeEditable = editor;
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

  document.addEventListener('pointerdown', (event) => {
    if (host.contains(event.target)) return;
    const editable = resolveEditable(event.target);
    if (editable) {
      activeEditable = editable;
      updateBadgePosition();
    } else {
      popover.hidden = true;
      badge.hidden = true;
      activeEditable = null;
    }
  }, true);

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'OPEN_GRAMMAR') {
      openDirectCorrection();
    }
  });
})();
