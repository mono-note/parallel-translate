(async () => {
  globalThis.xtCancelPicker?.();
  const s = await chrome.storage.local.get({ method: "google", lang: "th", replace: false, scope: "page" });
  let root = document;
  if (s.scope === "element") {
    root = await new Promise((resolve) => {
      const outline = document.createElement("div");
      outline.style.cssText = "position:fixed;pointer-events:none;border:2px solid #4f46e5;background:#4f46e522;z-index:2147483647;display:none";
      const cancel = document.createElement("button");
      cancel.textContent = "คลิกส่วนที่ต้องการแปล · Esc หรือคลิกที่นี่เพื่อยกเลิก";
      cancel.style.cssText = "position:fixed;top:12px;right:12px;z-index:2147483647;padding:12px;border:0;border-radius:8px;background:#4f46e5;color:white;font:14px system-ui;cursor:pointer";
      document.documentElement.append(outline, cancel);
      const finish = (element = null) => {
        document.removeEventListener("pointermove", hover, true);
        document.removeEventListener("click", pick, true);
        document.removeEventListener("keydown", escape, true);
        outline.remove();
        cancel.remove();
        if (globalThis.xtCancelPicker === finish) delete globalThis.xtCancelPicker;
        resolve(element);
      };
      const eligible = (target) => target instanceof Element && target !== cancel &&
        !target.closest(".xt-out,script,style,input,textarea,select,[contenteditable]:not([contenteditable='false'])") && target.innerText?.trim().length > 1;
      const hover = (event) => {
        outline.style.display = eligible(event.target) ? "block" : "none";
        if (!eligible(event.target)) return;
        const rect = event.target.getBoundingClientRect();
        Object.assign(outline.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      };
      const pick = (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.target === cancel) finish();
        else if (eligible(event.target)) finish(event.target);
      };
      const escape = (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        finish();
      };
      globalThis.xtCancelPicker = finish;
      document.addEventListener("pointermove", hover, true);
      document.addEventListener("click", pick, true);
      document.addEventListener("keydown", escape, true);
      cancel.focus();
    });
    if (!root) return;
  }
  const key = [s.method, s.lang, s.replace].join(":"); // re-translate when any changes
  const SEL = "p,li,h1,h2,h3,h4,h5,h6,blockquote,dt,dd,figcaption,td,th";
  const candidates = [...root.querySelectorAll(SEL)];
  if (root !== document && (root.matches(SEL) || !candidates.length)) candidates.unshift(root);
  const blocks = candidates.filter(
    (el) => el.dataset.xt !== key && !el.querySelector(SEL) && !el.closest(".xt-out") && el.innerText?.trim().length > 1
  );
  for (const el of blocks) {
    // undo the previous run: restore replaced original, drop appended translation
    if ("xtOrig" in el.dataset) {
      el.innerHTML = el.dataset.xtOrig;
      delete el.dataset.xtOrig;
    }
    el.querySelector(":scope > .xt-out")?.remove();
    el.dataset.xt = key;
    if (s.replace) {
      // swap text inside each text node, so <a>text</a> stays <a>translated</a>
      // ponytail: nodes translated one by one, so context across inline tags is lost
      el.dataset.xtOrig = el.innerHTML;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes = [];
      for (let n; (n = walker.nextNode()); ) if (n.nodeValue.trim() && !/^(SCRIPT|STYLE)$/.test(n.parentNode.tagName)) nodes.push(n);
      for (const n of nodes) {
        const [, pre, core, post] = n.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
        const out = await chrome.runtime.sendMessage({ text: core });
        if (out && out !== core) n.nodeValue = pre + out + post;
      }
      continue;
    }
    const text = el.innerText.trim();
    const out = await chrome.runtime.sendMessage({ text });
    if (!out || out === text) continue;
    const d = document.createElement("div");
    d.className = "xt-out";
    d.textContent = out;
    d.style.cssText = "color:inherit;margin:4px";
    el.append(d);
  }
})();
