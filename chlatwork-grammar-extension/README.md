# ChlatWork Grammar Assistant (Chrome extension MVP)

This is a standalone Chrome Manifest V3 **extension only**. It reuses your current ChlatWork AI/Telegram grammar correction service through **an HTTP endpoint on your existing backend**. You do not need a new NestJS app or Google Gemini key.

## 1. Integrated ChlatWork AI grammar endpoints

Your ChlatWork API now provides dedicated endpoints that connect directly to the existing `CreatorGenerationService` (the exact same Google Gemini service used by your Telegram bot):

- `POST /creator-ai/grammar/correct` (standard endpoint on port 3002)
- `POST /v1/ai/grammar/correct` (extension compatibility route on port 3002)
- `POST /creator-ai/khmer/grammar` (legacy endpoint, also fully supported)

### Flow:
`Chrome extension -> ChlatWork API -> CreatorGenerationService -> Gemini AI -> JSON -> Chrome extension`

### Request:
```json
{
  "text": "I has meeting today.",
  "mode": "grammar",
  "language": "en"
}
```

Supported modes:
- `grammar` (Grammar correction — uses `AiFeature.KHMER_GRAMMAR`)
- `polish` (Polish text — uses `AiFeature.KHMER_REWRITE`)

### Response:
```json
{
  "original": "I has meeting today.",
  "corrected": "I have a meeting today.",
  "changed": true
}
```

The extension also seamlessly accepts the standard NestJS envelope:
`{ "data": { "corrected": "..." } }` or `{ "data": { "sections": [{ "id": "result", "content": "..." }] } }`.

## 2. Install extension in Chrome

1. Unzip the package.
2. Go to `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder (the one containing `manifest.json`).
5. Click **Details -> Extension options**, or right-click the extension icon and choose **Options**.
6. Fill in your actual ChlatWork grammar API URL, not the Telegram bot token URL.
7. Click **Save & Grant Permission**. Chrome will ask to grant access to that API origin.
8. Refresh your target site, click into a normal input/textarea, then click **✨ Fix grammar** or press `Alt+Shift+G`.
9. Click **Correct grammar**, then **Apply** or **Copy**.

The plugin works without a separate build command or npm dependencies.

## 3. Authentication

- The Options page has a temporary Bearer access token field for **personal testing**, stored in `chrome.storage.session` (cleared on extension reload/update/browser restart).
- Do **not** put a Google Gemini API key, Telegram bot token, or hardcoded service credentials in the extension.
- For public production use, integrate your ChlatWork sign-in with browser-based OAuth Authorization Code + PKCE and short-lived per-user tokens, rather than manual token copying.
- Use HTTPS in production. Local HTTP is allowed for `localhost`/`127.0.0.1` only.

## 4. MVP boundaries and privacy

- Works best on regular HTML input / textarea fields. Plain-text contenteditable can be supported, but rich editors should use **Copy** to preserve formatting.
- Only sends text when **Correct grammar** is clicked. It does not run continuously or transmit keystrokes.
- Some pages, privileged Chrome pages, and custom editors are unsupported.
- `content_scripts` runs broadly on regular web pages, while the host permission for the API is requested for the configured origin at setup. Before Chrome Web Store release, assess narrower site access, a privacy policy, and the Chrome Web Store's disclosure requirements.
- Avoid storing raw text or sending confidential/customer data to the AI provider without permission.

## 5. Files

- `manifest.json` - MV3 manifest + content script, permissions, and shortcut
- `content.js` - floating launcher, correction panel, copy/apply
- `background.js` - fetches only the configured ChlatWork API
- `options.html` / `options.css` / `options.js` - API URL settings and session token
- `icons/*` - extension icon

## 6. Troubleshooting

- **Invalid correction received**: return `{"corrected":"..."}` from the backend (or `{"data":{"corrected":"..."}}`).
- **401**: provide a valid ChlatWork user access token for dev; don't use the Telegram bot token.
- **403**: check your existing auth guard/authorization rules.
- **Network / permission**: set the right endpoint in Options and grant access. Check TLS and reachability.
- **No button**: refresh the site after installing, and focus a text input. Browser internal pages and some custom editors are unsupported.
- **Correction doesn't apply**: in rich editors use Copy; other sites may require a dedicated editor adapter.
