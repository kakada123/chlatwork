const form = document.querySelector('#settings-form');
const endpointInput = document.querySelector('#apiEndpoint');
const tokenInput = document.querySelector('#accessToken');
const statusEl = document.querySelector('#status');

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.style.color = error ? '#9d273c' : '#15734b';
}

function normalizeEndpoint(input) {
  const url = new URL(input.trim());
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new Error('Use HTTPS, or HTTP localhost for development.');
  }
  if (url.username || url.password || url.hash) {
    throw new Error('Do not put credentials or fragments in the URL.');
  }
  return url;
}

async function initialize() {
  const settings = await chrome.storage.local.get('apiEndpoint');
  endpointInput.value = settings.apiEndpoint || '';
  const auth = await chrome.storage.session.get('accessToken');
  tokenInput.value = auth.accessToken || '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const url = normalizeEndpoint(endpointInput.value);
    // Request permission only for the explicitly chosen API origin.
    const origin = `${url.protocol}//${url.hostname}/*`;
    const allowed = await chrome.permissions.request({ origins: [origin] });
    if (!allowed) {
      setStatus('Permission denied. The extension cannot contact this API.', true);
      return;
    }
    await chrome.storage.local.set({ apiEndpoint: url.href });
    const token = tokenInput.value.trim();
    if (token) await chrome.storage.session.set({ accessToken: token });
    else await chrome.storage.session.remove('accessToken');
    setStatus('Saved. Open a website, focus a text field, and click ✨ Fix grammar.');
  } catch (error) {
    setStatus(error.message || 'Could not save settings.', true);
  }
});

document.querySelector('#clearToken').addEventListener('click', async () => {
  await chrome.storage.session.remove('accessToken');
  tokenInput.value = '';
  setStatus('Session token cleared.');
});

initialize().catch((error) => setStatus(error.message, true));
