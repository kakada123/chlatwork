(() => {
  if (window.__chlatworkGrammarAssistantLoaded) return;
  window.__chlatworkGrammarAssistantLoaded = true;

  const style = `
    :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #18212f; }
    *, *::before, *::after { box-sizing: border-box; }
    .launcher { position: fixed; z-index: 2147483646; right: 22px; bottom: 22px; border: 0;
      border-radius: 999px; background: #B60081; color: white; padding: 11px 16px;
      box-shadow: 0 8px 24px rgba(29, 18, 61, .27); font: 600 13px/1.2 inherit;
      font-family: inherit; cursor: pointer; }
    .launcher:hover { background: #98006D; }
    .panel { position: fixed; z-index: 2147483647; right: 22px; bottom: 75px;
      width: min(390px, calc(100vw - 30px)); max-height: calc(100vh - 95px); overflow-y: auto;
      border: 1px solid #e1e4eb; border-radius: 16px; background: #fff;
      box-shadow: 0 18px 60px rgba(10, 18, 30, .26); padding: 18px; }
    .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    h2 { font-size: 17px; font-weight: 700; line-height: 1.3; margin: 0; }
    label { display: block; font: 600 12px/1.4 inherit; font-family: inherit; margin-bottom: 5px; }
    select, textarea { width: 100%; border: 1px solid #d6dbe5; border-radius: 9px; padding: 9px 10px;
      font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff;
      color: #18212f; }
    textarea { min-height: 86px; max-height: 165px; resize: vertical; }
    select { margin-bottom: 14px; }
    .field { margin: 0 0 12px; }
    .actions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 11px; }
    button { border: 1px solid #d6dbe5; border-radius: 9px; background: white; cursor: pointer;
      font: 600 12px/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 9px 12px; color: #18212f; }
    button.primary { border-color: #B60081; background: #B60081; color: white; }
    button:disabled { opacity: .45; cursor: not-allowed; }
    .close { padding: 4px 8px; font-size: 19px; border: 0; }
    .status { margin: 8px 0 0; font: 12px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #546277; min-height: 17px; }
    .warn { color: #995c07; }
    [hidden] { display: none !important; }
  `;

  const host = document.createElement('div');
  host.setAttribute('data-chlatwork-grammar-host', '');
  const root = host.attachShadow({ mode: 'closed' });
  const sheet = document.createElement('style');
  sheet.textContent = style;
  root.append(sheet);

  const launcher = document.createElement('button');
  launcher.className = 'launcher';
  launcher.type = 'button';
  launcher.textContent = '✨ Fix grammar';
  launcher.hidden = true;

  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="top"><h2>✨ ChlatWork Grammar</h2><div><button id="cw-settings" type="button" aria-label="API settings" title="API settings">⚙</button><button class="close" type="button" aria-label="Close">×</button></div></div>
    <label for="cw-mode">Correction style</label>
    <select id="cw-mode">
      <option value="grammar">Grammar only — keep my style</option>
      <option value="polish">Polish — clear and professional</option>
    </select>
    <div class="field"><label for="cw-before">Your text</label><textarea id="cw-before" readonly></textarea></div>
    <div class="field"><label for="cw-after">Suggested correction</label><textarea id="cw-after" placeholder="Click Correct grammar" disabled></textarea></div>
    <div class="actions">
      <button class="primary" id="cw-correct" type="button">Correct grammar</button>
      <button id="cw-apply" type="button" disabled>Apply</button>
      <button id="cw-copy" type="button" disabled>Copy</button>
    </div>
    <p class="status" aria-live="polite"></p>
  `;
  root.append(launcher, panel);
  (document.documentElement || document.body).appendChild(host);

  const find = (selector) => panel.querySelector(selector);
  const before = find('#cw-before');
  const after = find('#cw-after');
  const mode = find('#cw-mode');
  const correctButton = find('#cw-correct');
  const applyButton = find('#cw-apply');
  const copyButton = find('#cw-copy');
  const status = find('.status');

  let activeEditable = null;
  let sourceText = '';
  let target = null;
  let busy = false;

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
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value;
    }
    return element.innerText;
  }

  function canApply(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return true;
    // Rich text editors may contain formatting, images, mentions, or embedded controls.
    // Only allow direct replacement in simple plain text contenteditables.
    return Array.from(element.querySelectorAll('*')).every((child) => child.tagName === 'BR');
  }

  function setStatus(message, warning = false) {
    status.textContent = message;
    status.classList.toggle('warn', warning);
  }

  function openPanel() {
    const editor = activeEditable?.isConnected ? activeEditable : resolveEditable(document.activeElement);
    if (!editor) {
      panel.hidden = false;
      before.value = '';
      after.value = '';
      setStatus('Click inside a text box first, then try again.', true);
      correctButton.disabled = true;
      applyButton.disabled = true;
      copyButton.disabled = true;
      return;
    }
    target = editor;
    sourceText = readText(editor);
    panel.hidden = false;
    before.value = sourceText;
    after.value = '';
    after.disabled = true;
    correctButton.disabled = !sourceText.trim() || busy;
    applyButton.disabled = true;
    copyButton.disabled = true;
    setStatus(sourceText.trim()
      ? 'Nothing is sent until you click Correct grammar.'
      : 'Type something into the text box first.');
  }

  async function correct() {
    if (busy || !target?.isConnected) return;
    if (readText(target) !== sourceText) {
      openPanel();
      setStatus('Your text changed. Review it before correcting again.', true);
      return;
    }
    if (!sourceText.trim()) return;

    busy = true;
    correctButton.disabled = true;
    applyButton.disabled = true;
    copyButton.disabled = true;
    after.disabled = true;
    setStatus('Correcting with ChlatWork AI…');

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'GRAMMAR_CORRECT', text: sourceText, mode: mode.value,
      });
      if (!result?.ok) throw new Error(result?.error || 'Correction failed.');
      after.value = result.corrected;
      after.disabled = false;
      applyButton.disabled = !canApply(target);
      copyButton.disabled = false;
      setStatus(canApply(target)
        ? 'Review the suggestion, then Apply or Copy.'
        : 'Rich text editor detected: Copy the correction to avoid losing formatting.');
    } catch (error) {
      setStatus(error?.message || 'Could not connect to the grammar API.', true);
    } finally {
      busy = false;
      correctButton.disabled = false;
    }
  }

  function applyCorrection() {
    if (!target?.isConnected || !canApply(target) || !after.value) return;
    if (readText(target) !== sourceText) {
      setStatus('The text on the website changed. Correction not applied.', true);
      return;
    }

    const corrected = after.value;
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      const proto = target instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(target, corrected);
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      target.focus();
      const selection = target.ownerDocument.getSelection();
      const range = target.ownerDocument.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      if (!target.ownerDocument.execCommand('insertText', false, corrected)) {
        range.deleteContents();
        range.insertNode(target.ownerDocument.createTextNode(corrected));
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    sourceText = corrected;
    before.value = corrected;
    applyButton.disabled = true;
    setStatus('Correction applied.');
  }

  document.addEventListener('focusin', (event) => {
    const editable = resolveEditable(event.target);
    if (editable) {
      activeEditable = editable;
      launcher.hidden = false;
    }
  }, true);

  document.addEventListener('pointerdown', (event) => {
    if (host.contains(event.target)) return;
    if (!resolveEditable(event.target)) {
      launcher.hidden = true;
      if (panel.hidden) activeEditable = null;
    }
  }, true);

  // Keep the current input focused when opening the assistant.
  launcher.addEventListener('mousedown', (event) => event.preventDefault());
  launcher.addEventListener('click', openPanel);
  find('#cw-settings').addEventListener('click', () => { chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' }); });
  find('.close').addEventListener('click', () => { panel.hidden = true; });
  correctButton.addEventListener('click', correct);
  applyButton.addEventListener('click', applyCorrection);
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(after.value);
      setStatus('Correction copied.');
    } catch {
      after.focus();
      after.select();
      setStatus('Select the correction and copy manually.', true);
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'OPEN_GRAMMAR') openPanel();
  });
})();
