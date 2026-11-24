// Board v5 end-to-end test (Playwright) — acts as a non-technical director against the fake db in test-harness.html.
// Usage (repo root): node documentation/board/v5/run-tests.cjs [screenshotDir]
// Seeds from board-data/*.json when that folder exists (served at /__seed), else from fixtures/seed.json.
const http = require("http"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "../../..");
const SHOTS = process.argv[2] || path.join(__dirname, "screens");
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const ok = (name, pass, info = "") => { results.push({ name, pass: !!pass, info }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`); };

function boardDataSeed() {
  const dir = path.join(ROOT, "board-data");
  if (!fs.existsSync(dir)) return null;
  const docs = {};
  const wj = path.join(dir, "writes.json");
  if (fs.existsSync(wj)) {
    for (const w of JSON.parse(fs.readFileSync(wj, "utf8"))) { const f = path.isAbsolute(w.file_path) ? w.file_path : path.join(ROOT, w.file_path); docs[`${w.collection}/${w.doc_id}`] = JSON.parse(fs.readFileSync(f, "utf8")); }
  } else {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json") && x.includes("__"))) { const parts = f.replace(/\.json$/, "").split("__"); const id = parts.pop(); docs[`${parts.join("/")}/${id}`] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); }
  }
  return Object.keys(docs).length ? { _source: "board-data", docs } : null;
}
const TYPES = { ".html": "text/html", ".json": "application/json", ".mp4": "video/mp4", ".webm": "video/webm", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg" };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const u = decodeURIComponent(req.url.split("?")[0]);
      if (u === "/__seed") { const s = boardDataSeed(); if (!s) { rsp.writeHead(404); return rsp.end(); } rsp.writeHead(200, { "content-type": "application/json" }); return rsp.end(JSON.stringify(s)); }
      const f = path.join(ROOT, path.normalize(u));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      const size = fs.statSync(f).size, type = TYPES[path.extname(f)] || "application/octet-stream", range = req.headers.range;
      if (range) { const [a, b] = range.replace("bytes=", "").split("-"); const s = +a, e = b ? +b : size - 1; rsp.writeHead(206, { "content-type": type, "content-range": `bytes ${s}-${e}/${size}`, "accept-ranges": "bytes", "content-length": e - s + 1 }); return fs.createReadStream(f, { start: s, end: e }).pipe(rsp); }
      rsp.writeHead(200, { "content-type": type, "content-length": size, "accept-ranges": "bytes" }); fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0, () => res(srv));
  });
}

(async () => {
  if (!boardDataSeed()) execFileSync("node", [path.join(__dirname, "fixtures/make-fixture.mjs")], { stdio: "inherit" });
  const srv = await serve();
  const base = `http://localhost:${srv.address().port}/documentation/board/v5/test-harness.html`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "dark" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text() + " " + (m.location().url || "")); });
  const overflow = async () => page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth);
  const shot = async (name) => page.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: false });
  const writes = () => page.evaluate(() => window.__fakeDb.writes);

  try {
    // 1. Overview
    await page.goto(base.replace("test-harness.html", "test-harness.html?delay=1500") + "#overview");
    const skeleton = await page.locator('[aria-busy="true"]').first().waitFor({ timeout: 3000 }).then(() => true, () => false);
    ok("skeleton shown while data loads", skeleton);
    await page.getByRole("heading", { name: "Next best action" }).waitFor({ timeout: 8000 });
    ok("overview renders with Next Best Action", true, "seed: " + (await page.evaluate(() => window.__fakeDb.source)));
    ok("freshness shows 'Last verified update'", await page.getByText("Last verified update").isVisible());
    ok("active production hero shows stages", await page.locator(".hero .steps li").count() > 3);
    await shot("01-overview-1440-dark");
    await page.evaluate(() => window.scrollTo(0, 99999)); await shot("01b-overview-1440-dark-bottom"); await page.evaluate(() => window.scrollTo(0, 0));

    // 2. Follow the Next Best Action
    await page.locator(".nba a.btn.primary").click();
    await page.waitForFunction(() => location.hash.startsWith("#review/"));
    ok("Next Best Action navigates to Review Centre", true, await page.evaluate(() => location.hash));
    const video = page.locator(".pl video").first();
    await video.waitFor();
    await page.waitForFunction(() => document.querySelector(".pl video").readyState >= 1, null, { timeout: 10000 });
    ok("review copy loads metadata", true, "duration " + (await video.evaluate((v) => v.duration.toFixed(1))));

    // 3. Play
    await page.getByRole("button", { name: "Play" }).click();
    await page.waitForTimeout(1500);
    const playing = await video.evaluate((v) => ({ t: v.currentTime, paused: v.paused }));
    ok("video plays", !playing.paused && playing.t > 0.5, `t=${playing.t.toFixed(2)}`);
    await page.getByRole("button", { name: "Pause" }).click();

    // 4. Seek via scene marker
    const sm = page.locator(".mk.sc").nth(2);
    const label = await sm.getAttribute("aria-label");
    await sm.click();
    await page.waitForTimeout(300);
    const tc = await page.locator("#tc-now").textContent();
    const expected = label.match(/at (\S+)$/)[1];
    ok("scene marker seeks to scene start", tc.startsWith(expected.slice(0, 5)), `${label} → timecode ${tc}`);
    await shot("02-review-1440-dark");

    // 5. Keyboard
    await page.locator("h1").click();
    const t0 = await video.evaluate((v) => v.currentTime);
    await page.keyboard.press("l"); await page.waitForTimeout(250);
    const t1 = await video.evaluate((v) => v.currentTime);
    await page.keyboard.press(","); await page.waitForTimeout(250);
    const t2 = await video.evaluate((v) => v.currentTime);
    ok("keyboard L = +5 s, comma = −1 frame", Math.abs(t1 - t0 - 5) < 0.3 && Math.abs(t1 - t2 - 1 / 30) < 0.03, `${t0.toFixed(2)} → ${t1.toFixed(2)} → ${t2.toFixed(3)}`);
    await page.keyboard.press(" "); await page.waitForTimeout(600);
    const sp = await video.evaluate((v) => !v.paused); await page.keyboard.press("k");
    ok("space toggles playback", sp);

    // 6. Comment
    const before = (await writes()).length;
    await page.locator("#cmt-text").fill("Test: hold the pillar title a beat longer.");
    const stampTxt = await page.locator("#stamp").textContent();
    await page.getByRole("button", { name: "Add comment at this time" }).click();
    await page.getByText(/^Saved/).first().waitFor({ timeout: 4000 });
    const w = (await writes()).slice(before);
    const cw = w.find((x) => x.path.startsWith("comments/"));
    ok("comment write reached fake db with timecode/scene/version/chapter", cw && cw.data.text.includes("pillar title") && typeof cw.data.atSec === "number" && cw.data.sceneId && cw.data.version && cw.data.chapterId && cw.data.status === "new" && cw.data.by === "u-director", JSON.stringify(cw && { atSec: cw.data.atSec, sceneId: cw.data.sceneId, version: cw.data.version, chapterId: cw.data.chapterId }) + " | " + stampTxt);
    await page.locator("#cmt-list").getByText("hold the pillar title").waitFor({ timeout: 4000 });
    ok("comment appears in the list and as a timeline marker", (await page.locator(".mk.cm").count()) >= 1);
    // click-to-seek from list
    await page.locator("h1").click(); await page.keyboard.press("l"); await page.keyboard.press("l"); await page.waitForTimeout(200);
    await page.locator("#cmt-list .cmt").filter({ hasText: "hold the pillar title" }).click();
    await page.waitForTimeout(300);
    const tcAfter = await page.locator("#tc-now").textContent();
    const want = `${String(Math.floor(cw.data.atSec / 60)).padStart(2, "0")}:${(cw.data.atSec % 60 < 10 ? "0" : "") + (cw.data.atSec % 60).toFixed(1)}`;
    ok("clicking a comment seeks to its time", tcAfter === want, `${tcAfter} vs ${want}`);

    // 7. Request changes without note (blocked)
    const n0 = (await writes()).length;
    await page.getByRole("button", { name: "Request changes" }).click();
    await page.waitForTimeout(400);
    const blockedMsg = await page.getByText("Add a note so the studio knows what to change").isVisible();
    ok("Request changes without a note is blocked", blockedMsg && (await writes()).length === n0);

    // 8. Approve with note
    await page.locator("#dec-note").fill("Approved — pillars land on cue.");
    await page.getByRole("button", { name: "Approve chapter" }).click();
    await page.getByText(/Saved: Approved/).waitFor({ timeout: 4000 });
    const aw = (await writes()).find((x) => x.path.startsWith("approvals/"));
    ok("approve with note writes approvals", aw && aw.data.decision === "approve" && aw.data.note.includes("pillars") && /^lesson:.*:chapter:/.test(aw.data.itemRef), aw && aw.data.itemRef);

    // 9. Error path: failed write keeps text and shows the error
    await page.evaluate(() => { window.__fakeDb.failNext = { code: "quota_exceeded", message: "collection full (test)" }; });
    await page.locator("#cmt-text").fill("This one should fail.");
    await page.getByRole("button", { name: "Add comment at this time" }).click();
    await page.getByText(/Not saved/).waitFor({ timeout: 4000 });
    ok("failed write shows the real error and keeps the text", (await page.locator("#cmt-text").inputValue()) === "This one should fail.");
    await page.locator("#cmt-text").fill("");

    // 10. Compare
    await page.goto(base + "#review/lifelink-course-L01/v004/sec-01-welcome");
    await page.locator(".pl video").first().waitFor();
    const opts = await page.locator('select[aria-label="Compare with another version"] option').allTextContents();
    await page.selectOption('select[aria-label="Compare with another version"]', "v003");
    await page.waitForTimeout(800);
    const nVid = await page.locator(".players.cmp .pl video").count();
    ok("version compare shows side-by-side players", nVid === 2, opts.join(" | "));
    await page.getByRole("button", { name: "Play" }).click(); await page.waitForTimeout(1500);
    const sync = await page.evaluate(() => [...document.querySelectorAll(".pl video")].map((v) => v.currentTime));
    await page.getByRole("button", { name: "Pause" }).click();
    ok("compare players stay in sync", Math.abs(sync[0] - sync[1]) < 0.35, sync.map((x) => x.toFixed(2)).join(" vs "));
    await shot("03-review-compare-1440");
    // version without media
    await page.goto(base + "#review/lifelink-course-L01/v002/");
    ok("version without media shows honest empty state", await page.getByText("No review copies uploaded yet for this version").isVisible());

    // 11. Queue retry request
    await page.goto(base + "#queue");
    await page.getByRole("button", { name: /^Retry: Automatic QA on v003/ }).click();
    await page.getByText("Request sent — the studio acts on it at its next check.").waitFor({ timeout: 4000 });
    const rw = (await writes()).find((x) => x.path.startsWith("requests/"));
    ok("queue retry writes a request", rw && rw.data.jobId === "t-qa-v003" && rw.data.action === "retry" && rw.data.status === "new");
    await page.evaluate((p) => window.__fakeDb.studioMerge(p, { status: "accepted", result: "re-queued" }), rw.path);
    await page.waitForTimeout(500);
    ok("request status updates when the studio accepts it", await page.locator('[data-job="t-qa-v003"]').getByText("Accepted").first().isVisible());
    await shot("04-queue-1440");

    // 12. Approvals view
    await page.goto(base + "#approvals/limiter");
    await page.locator('[data-ref="limiter"]').waitFor();
    await page.locator('[data-ref="limiter"]').getByRole("button", { name: "Reject" }).click();
    ok("Reject without note blocked on approvals", await page.locator('[data-ref="limiter"]').getByText("Add a note").isVisible());
    await shot("05-approvals-1440");

    // 13. Technical mode
    await page.goto(base + "#lesson-lifelink-course-L01");
    await page.locator(".chap").first().waitFor();
    const techHidden = await page.locator(".tech").first().isHidden();
    await page.getByRole("button", { name: "Technical" }).click();
    const techShown = await page.locator(".tech").first().isVisible();
    ok("Technical mode reveals ids/sources (hidden in Director)", techHidden && techShown);
    await shot("06-lesson-technical-1440");
    await page.getByRole("button", { name: "Director" }).click();

    // 14. Collapse sidebar (persisted)
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    const col = await page.evaluate(() => document.getElementById("app").classList.contains("collapsed") && localStorage.getItem("ll.nav"));
    await page.reload(); await page.locator("h1").waitFor();
    const col2 = await page.evaluate(() => document.getElementById("app").classList.contains("collapsed"));
    ok("sidebar collapses and stays collapsed after reload", col === "collapsed" && col2);
    await page.goto(base + "#efficiency"); await page.getByText("Insights, biggest impact first").waitFor();
    await shot("07-efficiency-collapsed-1440");
    await page.getByRole("button", { name: "Expand sidebar" }).click();

    // 15. Theme
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    ok("theme switches to light", (await page.evaluate(() => document.documentElement.dataset.theme)) === "light");
    await shot("08-efficiency-light-1440");
    await page.goto(base + "#overview"); await page.getByRole("heading", { name: "Next best action" }).waitFor();
    await shot("09-overview-light-1440");
    await page.goto(base + "#review/lifelink-course-L01/v004/sec-04"); await page.locator(".pl video").waitFor(); await page.waitForTimeout(800);
    await shot("10-review-light-1440");

    // 16. Widths × views: overflow
    const views = ["overview", "courses", "lesson-lifelink-course-L01", "review/lifelink-course-L01/v004/sec-04", "approvals", "queue", "agents", "efficiency", "memory", "library"];
    for (const [wd, ht] of [[1440, 900], [1024, 768], [390, 844]]) {
      await page.setViewportSize({ width: wd, height: ht });
      const bad = [];
      for (const v of views) { await page.goto(base + "#" + v); await page.locator("h1").waitFor(); await page.waitForTimeout(350); if (!(await overflow())) bad.push(v); }
      ok(`no horizontal page scroll at ${wd}px (10 views)`, !bad.length, bad.join(", "));
      if (wd !== 1440) for (const v of ["overview", "review/lifelink-course-L01/v004/sec-04", "queue"]) { await page.goto(base + "#" + v); await page.locator("h1").waitFor(); await page.waitForTimeout(500); await shot(`11-${v.split("/")[0]}-${wd}-light`); }
    }
    await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; localStorage.setItem("ll.theme", "dark"); });
    await page.goto(base + "#overview"); await page.reload(); await page.locator("h1").waitFor(); await page.waitForTimeout(400);
    await shot("12-overview-390-dark"); await page.evaluate(() => window.scrollTo(0, 1200)); await shot("12b-overview-390-dark-scrolled");
    await page.setViewportSize({ width: 1440, height: 900 });

    // 17. Read-only viewer
    const ro = await ctx.newPage();
    await ro.goto(base.replace("test-harness.html", "test-harness.html?readonly=1") + "#review/lifelink-course-L01/v004/sec-04");
    await ro.locator(".pl video").waitFor();
    ok("read-only viewer: actions disabled with explanation", (await ro.getByRole("button", { name: "Approve chapter" }).isDisabled()) && (await ro.getByText("You have view-only access").first().isVisible()));
    await ro.close();
    const nd = await ctx.newPage();
    await nd.goto(base.replace("test-harness.html", "test-harness.html?nodb=1") + "#overview"); await nd.locator("h1").waitFor(); await nd.waitForTimeout(300);
    ok("db unavailable: says so, no fake data", await nd.getByText("Live studio data isn't connected").first().isVisible());
    await nd.close();

    // 18. Basic a11y: accessible names, focus ring, token contrast
    await page.goto(base + "#review/lifelink-course-L01/v004/sec-04"); await page.locator(".pl video").waitFor();
    const unnamed = await page.evaluate(() => [...document.querySelectorAll("button, select, textarea, input, a[href], [role=slider]")].filter((el) => {
      if (el.offsetParent === null && el.getClientRects().length === 0) return false;
      const name = el.getAttribute("aria-label") || el.getAttribute("title") || (el.labels && [...el.labels].map((l) => l.textContent).join("")) || el.textContent.trim() || el.getAttribute("placeholder");
      return !name || !name.trim();
    }).map((el) => el.outerHTML.slice(0, 80)));
    ok("every visible control has an accessible name", !unnamed.length, unnamed.join(" | "));
    await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
    const focusOk = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2; });
    ok("keyboard focus is visible (2px outline)", focusOk);
    const contrast = await page.evaluate(() => {
      const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g).map(Number).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const tok = (n) => { const d = document.createElement("div"); d.style.color = `var(${n})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
      const out = {};
      for (const th of ["dark", "light"]) {
        document.documentElement.dataset.theme = th;
        const bgs = ["--bg", "--surface", "--raised"], fgs = ["--ink", "--muted", "--faint", "--royal", "--ok", "--warn", "--fail", "--burgundy-ink"];
        let min = 99, worst = "";
        for (const b of bgs) for (const f of fgs) { const r = ratio(tok(f), tok(b)); if (r < min) { min = r; worst = `${f} on ${b}`; } }
        const btn = ratio(tok("--on-burgundy"), tok("--burgundy"));
        out[th] = { min: +min.toFixed(2), worst, button: +btn.toFixed(2) };
      }
      document.documentElement.dataset.theme = "dark";
      return out;
    });
    ok("WCAG AA (4.5:1) for all text tokens on all surfaces, both themes", contrast.dark.min >= 4.5 && contrast.light.min >= 4.5 && contrast.dark.button >= 4.5 && contrast.light.button >= 4.5, JSON.stringify(contrast));
    ok("no page errors", !errors.filter((e) => !/favicon|fonts\.g|__seed/.test(e)).length, errors.join(" | ").slice(0, 400));
  } catch (e) {
    ok("test run completed without exception", false, e.message.split("\n")[0]);
    await shot("zz-failure");
  }
  await browser.close(); srv.close();
  const failed = results.filter((r) => !r.pass);
  fs.writeFileSync(path.join(SHOTS, "results.json"), JSON.stringify(results, null, 1));
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
