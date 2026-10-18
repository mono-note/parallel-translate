# Parallel Translate

Chrome extension (Manifest V3) that translates a page in place: append the translation after each paragraph, or replace the original text.

Providers: Google Translate (no key), Claude, OpenAI, Gemini. API keys are entered in the popup and stored locally via `chrome.storage`.

## Install (unpacked)

1. Open `chrome://extensions` and enable **Developer mode**.
2. **Load unpacked** and select this folder.

## Test

```
node content.test.cjs
```

## License

MIT
