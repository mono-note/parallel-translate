const ids = ["method", "lang", "claudeKey", "openaiKey", "geminiKey"];
const el = Object.fromEntries(ids.map((i) => [i, document.getElementById(i)]));

const showKeys = () =>
  document.querySelectorAll(".keys").forEach((d) => (d.style.display = d.dataset.for === el.method.value ? "block" : "none"));

const replace = document.getElementById("replace");

chrome.storage.local.get({ method: "google", lang: "th", claudeKey: "", openaiKey: "", geminiKey: "", replace: false, scope: "page" }).then((s) => {
  ids.forEach((i) => (el[i].value = s[i]));
  replace.checked = s.replace;
  document.querySelector(`[name=scope][value="${s.scope}"]`).checked = true;
  showKeys();
});
el.method.onchange = showKeys;

document.getElementById("go").onclick = async () => {
  await chrome.storage.local.set({
    ...Object.fromEntries(ids.map((i) => [i, el[i].value.trim()])),
    replace: replace.checked,
    scope: document.querySelector("[name=scope]:checked").value,
  });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  window.close();
};
