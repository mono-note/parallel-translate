const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const source = readFileSync(`${__dirname}/content.js`, "utf8");

class Element {
  constructor(text = "", tag = "p") {
    this.innerText = text;
    this.tag = tag;
    this.dataset = {};
    this.style = {};
    this.children = [];
  }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  closest() { return null; }
  matches() { return this.tag === "p"; }
  append(...elements) { this.children.push(...elements); }
  remove() { this.removed = true; }
  focus() {}
  getBoundingClientRect() { return { left: 1, top: 2, width: 30, height: 40 }; }
}

async function check(scope, action) {
  const selected = new Element("Selected text");
  const other = new Element("Other text");
  const handlers = new Map();
  const messages = [];
  const document = {
    documentElement: new Element(),
    createElement: (tag) => new Element("", tag),
    querySelectorAll: () => [selected, other],
    addEventListener: (name, handler) => handlers.set(name, handler),
    removeEventListener: (name) => handlers.delete(name),
  };
  const context = {
    Element, document,
    chrome: {
      storage: { local: { get: async () => ({ method: "google", lang: "th", replace: false, scope }) } },
      runtime: { sendMessage: async ({ text }) => { messages.push(text); return "Translated"; } },
    },
  };
  const done = runInNewContext(source, context);
  await new Promise(setImmediate);
  if (scope === "element") {
    const event = { target: selected, preventDefault() { this.prevented = true; }, stopImmediatePropagation() {} };
    handlers.get("pointermove")(event);
    assert.equal(document.documentElement.children[0].style.width, "30px");
    if (action === "escape") handlers.get("keydown")({ ...event, key: "Escape" });
    else if (action === "cancel") handlers.get("click")({ ...event, target: document.documentElement.children[1] });
    else {
      handlers.get("click")(event);
      assert.equal(event.prevented, true);
    }
  }
  await done;
  assert.deepEqual(messages, scope === "page" ? ["Selected text", "Other text"] : action === "pick" ? ["Selected text"] : []);
  assert.equal(handlers.size, 0);
  assert.ok(document.documentElement.children.every((element) => element.removed));
  assert.equal(context.xtCancelPicker, undefined);
}

(async () => {
  await check("page");
  await check("element", "pick");
  await check("element", "escape");
  await check("element", "cancel");
  console.log("Page translation, element selection, and cancellation passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
