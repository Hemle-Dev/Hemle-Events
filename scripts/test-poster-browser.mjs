import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";

const profile = await mkdtemp(join(tmpdir(), "hemle-poster-browser-"));
const browser = spawn(
  process.env.CHROME_BIN || "google-chrome",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);
let socket;
const startupTimeout = setTimeout(() => browser.kill(), 20000);
try {
  const endpoint = await new Promise((resolve, reject) => {
    browser.on("error", reject);
    browser.on("exit", () => reject(new Error("Chrome stopped before initialization")));
    browser.stderr.on("data", (chunk) => {
      const match = chunk.toString().match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve(match[1]);
    });
  });
  clearTimeout(startupTimeout);
  const debugging = new URL(endpoint);
  const target = await fetch(`http://${debugging.host}/json/new?about:blank`, {
    method: "PUT",
  }).then((r) => r.json());
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, "open");
  let sequence = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Runtime.exceptionThrown")
      errors.push(message.params.exceptionDetails.text);
    const task = pending.get(message.id);
    if (task) {
      pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
    }
  });
  const command = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await command("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (await evaluate(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out: ${expression}`);
  };
  const click = async (selector) => {
    const point = await evaluate(
      `(() => { const b = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`,
    );
    await command("Input.dispatchMouseEvent", {
      type: "mousePressed",
      ...point,
      button: "left",
      clickCount: 1,
    });
    await command("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      ...point,
      button: "left",
      clickCount: 1,
    });
  };
  await command("Runtime.enable");
  await command("Page.enable");
  const base = process.env.DEV_BASE_URL || "http://127.0.0.1:3108";
  for (const [width, height] of [
    [375, 812],
    [1280, 800],
    [812, 375],
  ]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width === 375,
    });
    await command("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    if (process.env.TEST_CAROUSEL === "1") {
      await command("Page.navigate", { url: `${base}/tests/browser/carousel.html` });
      const perPage = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
      const totalPages = 12 / perPage;
      await waitFor(
        `document.querySelector('[role=status]')?.textContent === '1 / ${totalPages}' && !!window.carouselQueries`,
      );
      assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
      const queries = await evaluate("window.carouselQueries");
      assert.equal(queries.all.length, 12);
      assert.ok(queries.diaspora.every((event) => event.audience === "diaspora"));
      assert.ok(queries.africa.every((event) => event.audience === "afrique"));
      assert.ok(
        queries.requests.some((query) => {
          const p = new URLSearchParams(query);
          return p.get("limit") === "12" && p.get("order") === "occurrence_start.asc,id.asc";
        }),
      );
      const visible = () =>
        evaluate(
          "[...document.querySelectorAll('article')].filter(e=>{const r=e.getBoundingClientRect(),t=e.closest('[tabindex]').getBoundingClientRect();return r.left>=t.left-2 && r.right<=t.right+2}).map(e=>e.querySelector('h3').textContent)",
        );
      assert.equal((await visible()).length, perPage);
      const initialScreenshot = await command("Page.captureScreenshot", { format: "png" });
      await writeFile(
        join(profile, `carousel-${width}.png`),
        Buffer.from(initialScreenshot.data, "base64"),
      );
      assert.deepEqual(
        await evaluate(
          "new Promise((resolve, reject) => { const image=new Image(); image.onload=()=>resolve([image.naturalWidth,image.naturalHeight]); image.onerror=()=>reject(new Error('Social image invalid')); image.src='/social-card.jpg'; })",
        ),
        [1280, 672],
      );
      await evaluate(
        "document.querySelector('button[aria-label$=suivants]').scrollIntoView({block:'center'})",
      );
      await click("button[aria-label$=suivants]");
      await waitFor(`document.querySelector('[role=status]').textContent === '2 / ${totalPages}'`);
      assert.equal((await visible())[0], `Événement ${perPage + 1}`);
      await evaluate("document.querySelector('[tabindex=\"0\"]').focus()");
      await command("Input.dispatchKeyEvent", { type: "keyDown", key: "End", code: "End" });
      await command("Input.dispatchKeyEvent", { type: "keyUp", key: "End", code: "End" });
      await waitFor(
        `document.querySelector('[role=status]').textContent === '${totalPages} / ${totalPages}'`,
      );
      assert.equal(
        await evaluate("document.querySelector('button[aria-label$=suivants]').disabled"),
        true,
      );
      assert.equal((await visible()).at(-1), "Événement 12");
      await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Home", code: "Home" });
      await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Home", code: "Home" });
      await waitFor(`document.querySelector('[role=status]').textContent === '1 / ${totalPages}'`);
      if (width === 375) {
        await command("Emulation.setTouchEmulationEnabled", { enabled: true });
        const point = await evaluate(
          "(() => {const r=document.querySelector('[tabindex=\"0\"]').getBoundingClientRect();return {x:r.right-30,y:Math.max(30,r.top+80)}})()",
        );
        await command("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
        for (let i = 1; i <= 8; i++) {
          await command("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ ...point, x: point.x - i * 30 }],
          });
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
        await command("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await waitFor(
          `document.querySelector('[role=status]').textContent !== '1 / ${totalPages}'`,
        );
        await command("Emulation.setTouchEmulationEnabled", { enabled: false });
      }
      for (const count of [1, 3, 4, 10]) {
        await command("Page.navigate", {
          url: `${base}/tests/browser/carousel.html?count=${count}`,
        });
        await waitFor(`document.querySelectorAll('article').length === ${count}`);
        const expectedPages = Math.ceil(count / perPage);
        if (expectedPages === 1) await waitFor("!document.querySelector('[role=status]')");
        else {
          await waitFor(
            `document.querySelector('[role=status]').textContent === '1 / ${expectedPages}'`,
          );
          await evaluate("document.querySelector('[tabindex=\"0\"]').focus()");
          await command("Input.dispatchKeyEvent", { type: "keyDown", key: "End", code: "End" });
          await command("Input.dispatchKeyEvent", { type: "keyUp", key: "End", code: "End" });
          await waitFor(
            `document.querySelector('[role=status]').textContent === '${expectedPages} / ${expectedPages}'`,
          );
          assert.equal((await visible()).at(-1), `Événement ${count}`);
        }
      }
      console.log(
        `PASS carousel ${width}×${height}: pages, order, editorial filters, keyboard, partial pages`,
      );
      continue;
    }
    if (process.env.TEST_EDITOR === "1") {
      await command("Page.navigate", { url: `${base}/tests/browser/editor.html` });
      await waitFor("document.querySelectorAll('button[aria-label^=Choisir]').length === 4");
      assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
      await evaluate(
        "window.__picked=[]; HTMLInputElement.prototype.showPicker = function() { window.__picked.push(this.type); }",
      );
      for (const label of [
        "Choisir la date de début",
        "Choisir la date de fin",
        "Choisir l’heure de début",
        "Choisir la publication",
      ]) {
        const selector = `button[aria-label="${label}"]`;
        assert.equal(
          await evaluate(
            `(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return r.width >= 44 && r.x >= 0 && r.right <= innerWidth; })()`,
          ),
          true,
        );
        await click(selector);
      }
      assert.deepEqual(await evaluate("window.__picked"), [
        "date",
        "date",
        "time",
        "datetime-local",
      ]);
      for (const [index, tag] of [
        [0, "strong"],
        [1, "em"],
        [2, "u"],
      ]) {
        await evaluate(
          "(() => { const t=document.querySelector('textarea'); t.focus(); t.setSelectionRange(0, t.value.length); })()",
        );
        await click(`[role=group] button:nth-child(${index + 1})`);
        await waitFor(`!!document.querySelector('details ${tag}')`);
      }
      await evaluate(
        "(() => { const t=document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t, 'Concert\\nRencontre'); t.dispatchEvent(new Event('input',{bubbles:true})); })()",
      );
      await waitFor("document.querySelector('textarea').value === 'Concert\\nRencontre'");
      await evaluate(
        "(() => { const t=document.querySelector('textarea'); t.focus(); t.select(); })()",
      );
      await click("[role=group] button:nth-child(4)");
      await waitFor("document.querySelectorAll('details ul li').length === 2");
      assert.equal(
        await evaluate("getComputedStyle(document.querySelector('details ul')).listStyleType"),
        "disc",
      );
      assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
      await click("[role=group] button:nth-child(1)");
      await waitFor("document.querySelectorAll('details li strong').length === 2");
      await click("[role=group] button:nth-child(4)");
      await waitFor("document.querySelectorAll('details ul').length === 0");
      await evaluate(
        "(() => { const t=document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t, '- <img src=x onerror=alert(1)>'); t.dispatchEvent(new Event('input',{bubbles:true})); })()",
      );
      await waitFor("document.querySelector('details').textContent.includes('<img src=x')");
      assert.equal(await evaluate("document.querySelectorAll('details img').length"), 0);
      console.log(
        `PASS editor ${width}×${height}: date buttons, formatting, bullet lists, safe preview`,
      );
      continue;
    }
    await command("Page.navigate", { url: `${base}/tests/browser/poster.html` });
    await waitFor("!!document.querySelector('button[aria-haspopup=\"dialog\"]')");
    await waitFor("document.querySelector('button[aria-haspopup=\"dialog\"] img').complete");
    const heroScreenshot = await command("Page.captureScreenshot", { format: "png" });
    await writeFile(join(profile, `hero-${width}.png`), Buffer.from(heroScreenshot.data, "base64"));
    assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
    const area =
      "document.querySelector('button[aria-haspopup=\"dialog\"]').parentElement.parentElement";
    const before = await evaluate(`${area}.getBoundingClientRect().height`);
    assert.equal(
      await evaluate("document.body.textContent.includes('Tirer pour agrandir')"),
      false,
    );
    assert.equal(
      await evaluate("getComputedStyle(document.querySelector('h1').parentElement).position"),
      "absolute",
    );
    const handle = 'button[aria-haspopup="dialog"]';
    const point = await evaluate(
      `(() => { const r = document.querySelector('${handle}').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
    );
    await command("Input.dispatchMouseEvent", {
      type: "mousePressed",
      ...point,
      button: "left",
      clickCount: 1,
    });
    await command("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: point.x,
      y: point.y + 80,
      button: "left",
      buttons: 1,
    });
    await command("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: point.x,
      y: point.y + 80,
      button: "left",
      clickCount: 1,
    });
    await waitFor(`${area}.getBoundingClientRect().height > ${before}`);
    assert.equal(
      await evaluate("!!document.querySelector('[role=dialog]')"),
      false,
      "drag must not open the viewer",
    );
    await evaluate("window.scrollTo(0, 0)");
    await click('button[aria-haspopup="dialog"]');
    await waitFor("!!document.querySelector('[role=dialog]')");
    assert.equal(
      await evaluate("getComputedStyle(document.querySelector('[role=dialog] img')).objectFit"),
      "contain",
    );
    await click('[role="dialog"] button[aria-pressed]');
    await waitFor(
      "document.querySelector('[role=dialog] button[aria-pressed]').getAttribute('aria-pressed') === 'true'",
    );
    await waitFor(
      "(() => { const v=document.querySelector('[aria-label=\"Affiche agrandie, zone défilante\"]'); return v.scrollWidth > v.clientWidth && v.scrollHeight > v.clientHeight; })()",
    );
    await click('[role="dialog"] button[aria-pressed]');
    await waitFor(
      "document.querySelector('[role=dialog] button[aria-pressed]').getAttribute('aria-pressed') === 'false'",
    );
    const screenshot = await command("Page.captureScreenshot", { format: "png" });
    await writeFile(join(profile, `poster-${width}.png`), Buffer.from(screenshot.data, "base64"));
    await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
    await waitFor("!document.querySelector('[role=dialog]')");
    assert.equal(await evaluate("document.activeElement.getAttribute('aria-haspopup')"), "dialog");
    // Real click + deterministic clipboard substitute: no interaction with the user's clipboard.
    await evaluate(
      "Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__copiedText = text; } } })",
    );
    await evaluate(
      "document.querySelector('[aria-label=\"Copier le lien\"]').scrollIntoView({block:'center'})",
    );
    await click('button[aria-label="Copier le lien"]');
    await waitFor("!!document.querySelector('button[aria-label=\"Lien copié\"]')");
    assert.equal(
      await evaluate("window.__copiedText"),
      "https://example.test/evenements/affiche-test",
    );
    assert.equal(
      await evaluate("document.querySelector('[role=status]').textContent"),
      "Lien copié !",
    );
    await waitFor("!!document.querySelector('button[aria-label=\"Copier le lien\"]')");
    await evaluate(
      "Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }); document.execCommand = () => true",
    );
    await click('button[aria-label="Copier le lien"]');
    await waitFor("!!document.querySelector('button[aria-label=\"Lien copié\"]')");
    await waitFor("!!document.querySelector('button[aria-label=\"Copier le lien\"]')");
    await evaluate("document.execCommand = () => false");
    await click('button[aria-label="Copier le lien"]');
    await waitFor(
      "document.querySelector('[role=status]').textContent.includes('Copie impossible')",
    );
    assert.equal(
      await evaluate("!!document.querySelector('button[aria-label=\"Lien copié\"]')"),
      false,
    );
    console.log(
      `PASS ${width}×${height}: original layout, drag, modal, zoom, Escape, focus, copy feedback/fallback/error`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(`Screenshots: ${profile}`);
} finally {
  clearTimeout(startupTimeout);
  socket?.close();
  browser.kill();
}
