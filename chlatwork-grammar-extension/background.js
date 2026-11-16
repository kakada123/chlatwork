// Routes user-requested corrections through your existing ChlatWork API.
// Never store a Gemini API key in a browser extension.
function validateEndpoint(value) {
  try {
    const url = new URL(value);
    const isLocal = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal)) return null;
    if (url.username || url.password || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'OPEN_SETTINGS') {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (message?.type !== 'GRAMMAR_CORRECT') return;

  (async () => {
    try {
      if (!sender.tab || typeof message.text !== 'string' || !message.text.trim() || message.text.length > 10000) {
        throw new Error('Invalid text (limit: 10,000 characters).');
      }
      if (!['grammar', 'polish'].includes(message.mode)) throw new Error('Invalid correction mode.');

      const { apiEndpoint } = await chrome.storage.local.get('apiEndpoint');
      const { accessToken } = await chrome.storage.session.get('accessToken');
      const url = validateEndpoint(apiEndpoint);
      if (!url) throw new Error('Open extension settings and enter your ChlatWork API endpoint.');

      const originPattern = `${url.protocol}//${url.hostname}/*`;
      const permitted = await chrome.permissions.contains({ origins: [originPattern] });
      if (!permitted) throw new Error('API permission missing. Open settings and click Save & Grant Permission.');

      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 25000);
      let response;
      try {
        let requestUrl = url.href;
        const isLegacyKhmer = /\/khmer\/(grammar|rewrite)/.test(url.pathname);
        if (isLegacyKhmer) {
          if (message.mode === 'polish' && url.pathname.endsWith('/khmer/grammar')) {
            requestUrl = url.href.replace(/\/khmer\/grammar$/, '/khmer/rewrite');
          } else if (message.mode === 'grammar' && url.pathname.endsWith('/khmer/rewrite')) {
            requestUrl = url.href.replace(/\/khmer\/rewrite$/, '/khmer/grammar');
          }
        }

        const requestBody = isLegacyKhmer
          ? { content: message.text }
          : { text: message.text, content: message.text, mode: message.mode, language: 'en' };

        response = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(requestBody),
          signal: abort.signal,
          credentials: 'omit',
          redirect: 'error'
        });
      } finally {
        clearTimeout(timeout);
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        let messageText = `API error (${response.status})`;
        if (response.status === 401) {
          messageText = 'Not authenticated. Open settings and enter a valid session token.';
        } else if (response.status === 429) {
          messageText = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (Array.isArray(data.message)) {
          messageText = data.message.join(', ');
        } else if (typeof data.message === 'string') {
          messageText = data.message;
        }
        throw new Error(messageText);
      }

      // Supports both direct/extension contracts and the existing ChlatWork CreatorAi envelope:
      // 1. { original, corrected, changed }
      // 2. { corrected: string }
      // 3. { data: { corrected: string } }
      // 4. { data: { sections: [ { id: 'result', content: string } ] } }
      const corrected =
        data.corrected ??
        data.data?.corrected ??
        data.data?.sections?.find((s) => s.id === 'result')?.content ??
        data.result;

      if (typeof corrected !== 'string' || !corrected.trim()) {
        throw new Error('Your API returned an empty or invalid correction.');
      }
      sendResponse({ ok: true, corrected });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error?.name === 'AbortError'
          ? 'The request timed out. Please try again.'
          : (error?.message || 'Could not reach ChlatWork API.'),
      });
    }
  })();

  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_GRAMMAR' });
  } catch {
    // Browser internal pages and tabs not yet refreshed cannot receive content messages.
    await chrome.runtime.openOptionsPage();
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'correct-grammar') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_GRAMMAR' });
  } catch {
    // Chrome does not allow content scripts on privileged pages.
  }
});
