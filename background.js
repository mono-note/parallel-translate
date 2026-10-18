const DEFAULTS = { method: "google", lang: "th", claudeKey: "", openaiKey: "", geminiKey: "" };

const prompt = (text, s) =>
  `Translate into ${new Intl.DisplayNames(["en"], { type: "language" }).of(s.lang)}. Output only the translation.\n\n${text}`;

// parse JSON, but surface the API's own error message instead of a vague TypeError
const ok = async (r) => {
  const j = await r.json();
  if (!r.ok) throw new Error(r.status + " " + JSON.stringify(j.error ?? j));
  return j;
};

const providers = {
  // ponytail: unofficial free endpoint, may rate-limit
  async google(text, s) {
    const r = await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=" +
      s.lang + "&q=" + encodeURIComponent(text));
    return (await r.json())[0].map((x) => x[0]).join("");
  },

  async claude(text, s) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": s.claudeKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt(text, s) }],
      }),
    });
    return (await ok(r)).content[0].text;
  },

  async openai(text, s) {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.openaiKey },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt(text, s) }] }),
    });
    return (await ok(r)).choices[0].message.content;
  },

  async gemini(text, s) {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": s.geminiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt(text, s) }] }],
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } }, // plain translation, skip thinking latency
      }),
    });
    return (await ok(r)).candidates[0].content.parts[0].text;
  },
};

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  chrome.storage.local.get(DEFAULTS).then((s) =>
    providers[s.method](msg.text, s)
      .then(reply)
      .catch((e) => {
        // one JSON string so it copies out of the console readable (an object pastes as [object Object])
        console.error(`[${new Date().toISOString()}] ${s.method} -> ${s.lang} failed ` + JSON.stringify({
          error: `${e.name}: ${e.message}`, // API errors carry "<status> <json>" from ok()
          stack: e.stack,
          text: msg.text.slice(0, 100),
          length: msg.text.length,
          sender: _sender.tab?.url,
        }, null, 2));
        reply(null);
      })
  );
  return true; // async reply
});
