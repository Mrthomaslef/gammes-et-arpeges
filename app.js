/* Gammes & Arpèges — app statique, 100 % hors-ligne (données dans data/embedded_data.js) */
(() => {
  "use strict";
  const D = window.GAMMES_DATA;
  const G = Object.fromEntries(D.gammes.map(g => [g.id, g]));
  const E = Object.fromEntries(D.entities.map(e => [e.id, e]));
  const CAT = Object.fromEntries(D.cats.map(c => [c.id, c]));
  const $ = s => document.querySelector(s);
  const view = $("#view"), qInput = $("#q"), qClear = $("#qClear");

  // ------------------------------------------------------------ utilitaires
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
  const terms = q => norm(q).split(" ").filter(t => t.length > 1 || /\d/.test(t));

  // surlignage insensible aux accents : table d'index caractère normalisé → caractère source
  function highlight(text, ts) {
    if (!ts || !ts.length) return esc(text);
    const src = String(text);
    let n = "", map = [];
    for (let i = 0; i < src.length; i++) {
      const c = norm(src[i]) || (src[i] === " " ? " " : "");
      for (const ch of c) { n += ch; map.push(i); }
    }
    const marks = new Array(src.length).fill(false);
    for (const t of ts) {
      let from = 0, k;
      while ((k = n.indexOf(t, from)) !== -1) {
        for (let j = k; j < k + t.length; j++) marks[map[j]] = true;
        from = k + t.length;
      }
    }
    let out = "", open = false;
    for (let i = 0; i < src.length; i++) {
      if (marks[i] && !open) { out += "<mark>"; open = true; }
      if (!marks[i] && open) { out += "</mark>"; open = false; }
      out += esc(src[i]);
    }
    return out + (open ? "</mark>" : "");
  }

  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem("gea:" + k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("gea:" + k, JSON.stringify(v)); } catch {} },
  };
  let favs = new Set(store.get("favs", []));
  let recents = store.get("recents", []);
  const haptic = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

  function lines(g) {
    const out = [];
    for (const b of g.blocks) {
      if (b.type === "list") b.items.forEach(i => out.push(i.t));
      else if (b.type === "table") b.rows.forEach(r => r.forEach(c => c && c.split("\n").forEach(x => out.push(x))));
    }
    return out;
  }
  const LINES = Object.fromEntries(D.gammes.map(g => [g.id, lines(g)]));
  const MSK = D.gammes.filter(g => !g.horsMsk);

  // ------------------------------------------------------------ thème
  const root = document.documentElement;
  const applyTheme = t => { root.dataset.theme = t; document.querySelector('meta[name="theme-color"]').content = t === "dark" ? "#0b0a16" : "#1e1b4b"; };
  applyTheme(store.get("theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  $("#themeBtn").onclick = () => { const t = root.dataset.theme === "dark" ? "light" : "dark"; applyTheme(t); store.set("theme", t); };

  // ------------------------------------------------------------ icônes
  const IC = window.GEA_ICONS;
  const col = c => (IC.COLORS[c] || IC.COLORS.classif);
  const cvar = c => `--c:${col(c)[0]};--c2:${col(c)[1]}`;
  const tile = (c, size = 22) => `<span class="tile" style="${cvar(c)}">${IC.svg(c, size)}</span>`;
  const hIco = (name, c) => `<span class="h-ico" style="${cvar(c)}">${IC.svg(name, 20)}</span>`;
  document.querySelectorAll(".tabbar a").forEach(a => { a.querySelector("span").innerHTML = IC.svg(a.dataset.tab === "home" ? "gammes" : a.dataset.tab, 22); });

  // ------------------------------------------------------------ composants
  const catChips = g => g.cats.map(c => `<a class="tag ctag" style="${cvar(c)}" href="#/cat/${c}">${IC.svg(c, 14)} ${esc(CAT[c].label)}</a>`).join("");
  // texte avec diagnostics cliquables (+ surlignage éventuel)
  function rich(t, spans, ts) {
    const hl = x => ts ? highlight(x, ts) : esc(x);
    if (!spans || !spans.length) return hl(t);
    let out = "", pos = 0;
    for (const [a, b, id] of spans) {
      if (!E[id] || a < pos) continue;
      out += hl(t.slice(pos, a)) + `<a class="dx" href="#/d/${id}">${hl(t.slice(a, b))}</a>`;
      pos = b;
    }
    return out + hl(t.slice(pos));
  }
  function renderBody(g, ts) {
    let body = "";
    for (const b of g.blocks) {
      if (b.type === "list") body += `<ul class="tree">${b.items.map(i => `<li class="${i.k} l${Math.min(i.l, 4)}${i.b ? " b" : ""}">${rich(i.t, i.e, ts)}</li>`).join("")}</ul>`;
      else if (b.type === "table") body += renderTable(b.rows, b.links);
      else if (b.type === "images") body += `<div class="imgs${b.schema ? " schema" : ""}">${b.src.map(s => `<img src="${s}" loading="lazy" alt="" data-zoom>`).join("")}</div>`;
    }
    return body;
  }
  // bouton de gamme qui se déroule : titre + exemple caricatural (+ schéma pour Lodwick)
  function rowGamme(g, opts = {}) {
    const ts = opts.ts && opts.ts.length ? opts.ts : null;
    let snip = "";
    if (ts && !opts.noSnip) {
      const tl = ts.join("").length;
      const hit = [...new Set(LINES[g.id])].find(l => ts.every(t => norm(l).includes(t)) && norm(l).length - tl > 18);
      if (hit) snip = `<span class="snip1">${highlight(hit, ts)}</span>`;
    }
    return `<details class="card acc" data-id="${g.id}" data-q="${esc(opts.q || "")}" style="${cvar(g.cats[0])}">
      <summary>${opts.tile ? tile(g.cats[0], 18) : ""}<span class="t"><b>${ts && !opts.noSnip ? highlight(g.title, ts) : esc(g.title)}</b>${g.ex ? `<span class="ex">${esc(g.ex)}</span>` : ""}${snip}</span>${g.thumb ? `<img class="thumb" src="${g.thumb}" alt="">` : ""}<span class="chev">›</span></summary>
      <div class="acc-b"></div></details>`;
  }
  view.addEventListener("toggle", e => {
    const d = e.target;
    if (!d.classList || !d.classList.contains("acc") || !d.open) return;
    const g = G[d.dataset.id], box = d.querySelector(".acc-b");
    if (!box.dataset.done) {
      const ts = d.dataset.q ? terms(d.dataset.q) : null;
      box.innerHTML = renderBody(g, ts) + `<div class="acc-f"><button class="fav${favs.has(g.id) ? " on" : ""}" data-fav="${g.id}">${favs.has(g.id) ? "★ Favori" : "☆ Favori"}</button><a href="#/g/${g.id}">Plein écran ›</a></div>`;
      box.dataset.done = "1";
      recents = [g.id, ...recents.filter(x => x !== g.id)].slice(0, 12); store.set("recents", recents);
    }
    haptic(6);
  }, true);
  view.addEventListener("click", e => {
    const b = e.target.closest("[data-fav]"); if (!b) return;
    const id = b.dataset.fav; favs.has(id) ? favs.delete(id) : favs.add(id); store.set("favs", [...favs]); haptic(12);
    b.classList.toggle("on", favs.has(id)); b.textContent = favs.has(id) ? "★ Favori" : "☆ Favori";
  });

  // ------------------------------------------------------------ recherche
  function search(q) {
    const ts = terms(q);
    if (!ts.length) return { ts, gammes: [], ents: [] };
    const res = [];
    for (const g of D.gammes) {
      if (!ts.every(t => g.q.includes(t))) continue;
      const tn = norm(g.title + " " + (g.sub || ""));
      let score = 0;
      ts.forEach(t => { if (tn.includes(t)) score += 10; if (tn.startsWith(t)) score += 5; });
      LINES[g.id].forEach(l => { const ln = norm(l); ts.forEach(t => { if (ln.includes(t)) score += 1; }); });
      if (g.horsMsk) score -= 8;
      if (g.cats.includes("classif")) score -= 4;
      res.push([score, g]);
    }
    res.sort((a, b) => b[0] - a[0]);
    const ents = D.entities.filter(e => ts.every(t => norm(e.label).includes(t)));
    return { ts, gammes: res.map(r => r[1]), ents };
  }

  function renderSearch(q) {
    const { ts, gammes, ents } = search(q);
    let h = "";
    if (ents.length) {
      h += `<div class="chips" style="margin-top:6px">${ents.map(e => `<a class="chip ent" href="#/d/${e.id}">${esc(e.label)} · voir les ${e.gammes.length} gammes ›</a>`).join("")}</div>`;
    }
    h += `<h2>${gammes.length} gamme${gammes.length > 1 ? "s" : ""}</h2>`;
    h += gammes.length ? `<div class="list">${gammes.slice(0, 80).map(g => rowGamme(g, { ts, q, tile: true })).join("")}</div>`
      : `<div class="empty">Aucun résultat pour « ${esc(q)} ».<br>Essayez un terme plus court (ex. « ewing », « epiphys », « T2 »).</div>`;
    view.innerHTML = h;
  }

  let searchTimer;
  qInput.addEventListener("input", () => {
    qClear.hidden = !qInput.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (qInput.value.trim()) { if (!location.hash.startsWith("#/search")) history.replaceState(null, "", "#/search"); renderSearch(qInput.value); setTab("home"); }
      else route();
    }, 120);
  });
  qInput.addEventListener("keydown", e => { if (e.key === "Enter") qInput.blur(); });
  qClear.onclick = () => { qInput.value = ""; qClear.hidden = true; location.hash = "#/"; route(); };

  // ------------------------------------------------------------ vues
  function home() {
    let h = `<section class="card hero"><img class="hero-logo" src="assets/logo.svg" alt=""><h1>Des gammes et des arpèges</h1>
      <p>Les gammes diagnostiques ostéo-articulaires</p></section>`;
    const rec = recents.filter(id => G[id]).slice(0, 4);
    if (rec.length) h += `<h2>Récemment</h2><div class="chips">${rec.map(id => `<a class="chip" href="#/g/${id}">${esc(G[id].title)}</a>`).join("")}</div>`;
    h += `<h2>Thèmes</h2><div class="grid">${D.cats.map(c => {
      const n = D.gammes.filter(g => g.cats.includes(c.id)).length;
      return `<a class="card cat" href="#/cat/${c.id}" style="${cvar(c.id)}"><span class="cat-top">${tile(c.id, 26)}<span class="n">${n}</span></span><b>${esc(c.label)}</b></a>`;
    }).join("")}</div>`;
    h += `<p class="foot">Dr Grégoire Attané</p>`;
    view.innerHTML = h;
  }

  function catView(id) {
    const c = CAT[id]; if (!c) return notFound();
    const list = D.gammes.filter(g => g.cats.includes(id));
    view.innerHTML = `<h1 class="hh">${hIco(id, id)}${esc(c.label)}</h1><p class="sub">${list.length} gammes</p>
      <div class="list">${list.map(g => rowGamme(g)).join("")}</div>`;
  }

  function renderTable(rows, links) {
    const cell = (c, i, j) => rich(c, links && links[i] && links[i][j]);
    if (!rows.length) return "";
    const head = rows[0], body = rows.slice(1);
    const maxc = Math.max(...rows.map(r => r.length));
    const wide = maxc >= 3;
    let h = `<div class="tbl-wrap${wide ? " wide" : ""}"><table><thead><tr>${head.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r, i) => `<tr>${r.map((c, j) => `<td>${cell(c, i + 1, j)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    if (wide) {
      h += `<div class="stack">${body.map((r, i) => `<div class="sc">${r.map((c, j) => c ? `${j && head[j] ? `<div class="k">${esc(head[j])}</div>` : ""}<div class="v">${cell(c, i + 1, j)}</div>` : "").join("")}</div>`).join("")}</div>`;
    }
    return h;
  }

  function gammeView(id, q) {
    const g = G[id]; if (!g) return notFound();
    recents = [id, ...recents.filter(x => x !== id)].slice(0, 12); store.set("recents", recents);
    const ts = q ? terms(q) : null;
    const body = renderBody(g, ts);
    const cat = g.cats[0], sib = D.gammes.filter(x => x.cats.includes(cat)), k = sib.findIndex(x => x.id === id);
    const prev = sib[k - 1], next = sib[k + 1];
    view.innerHTML = `
      <div class="g-head"><div class="t"><h1>${esc(g.title)}</h1>${g.sub ? `<p class="sub">${esc(g.sub)}</p>` : ""}${g.ex ? `<p class="ex1">${esc(g.ex)}</p>` : ""}</div>
        <button class="star${favs.has(id) ? " on" : ""}" id="favBtn" aria-label="Favori">${favs.has(id) ? "★" : "☆"}</button></div>
      <div class="meta">${catChips({ cats: [g.cats[0]] })}<span class="dia">diapo ${g.slide}</span></div>
      <section class="card pad gcard" style="${cvar(g.cats[0])}">${body}</section>
      <div class="pn">${prev ? `<a class="card prev" href="#/g/${prev.id}"><small>‹ Précédente</small><span>${esc(prev.title)}</span></a>` : "<span style='flex:1'></span>"}
        ${next ? `<a class="card next" href="#/g/${next.id}"><small>Suivante ›</small><span>${esc(next.title)}</span></a>` : "<span style='flex:1'></span>"}</div>`;
    $("#favBtn").onclick = () => {
      favs.has(id) ? favs.delete(id) : favs.add(id); store.set("favs", [...favs]); haptic(12);
      const b = $("#favBtn"); b.classList.toggle("on", favs.has(id)); b.textContent = favs.has(id) ? "★" : "☆";
    };
  }

  function diagnostics() {
    const letters = [...new Set(D.entities.map(e => norm(e.label)[0].toUpperCase()))];
    let cur = "";
    view.innerHTML = `<h1 class="hh">${hIco("diagnostics", "axial")}Diagnostics</h1><p class="sub">Toutes les gammes où apparaît un diagnostic.</p>
      <div class="az">${letters.map(l => `<a href="#" data-az="${l}">${l}</a>`).join("")}</div>
      <div class="list">${D.entities.map(e => {
        const L = norm(e.label)[0].toUpperCase(); let anchor = "";
        if (L !== cur) { cur = L; anchor = ` id="az-${L}"`; }
        return `<a class="card row"${anchor} href="#/d/${e.id}"><div class="t"><b>${esc(e.label)}</b></div><span class="cnt">${e.gammes.length}</span><span class="arrow">›</span></a>`;
      }).join("")}</div>`;
    view.querySelectorAll("[data-az]").forEach(a => a.onclick = ev => { ev.preventDefault(); const t = document.getElementById("az-" + a.dataset.az); t && window.scrollTo({ top: t.getBoundingClientRect().top + scrollY - 120, behavior: "smooth" }); });
  }

  function entityView(id) {
    const e = E[id]; if (!e) return notFound();
    const ts = terms(e.label.split(/[\/(]/)[0]).filter(t => t.length > 3).slice(0, 3);
    const gs = e.gammes.map(x => G[x]);
    const byCat = {};
    gs.forEach(g => (byCat[g.cats[0]] ||= []).push(g));
    view.innerHTML = `<h1>${esc(e.label)}</h1><p class="sub">${gs.length} gammes</p>
      ${D.cats.filter(c => byCat[c.id]).map(c => `<h2 class="hh2">${tile(c.id, 14)} ${esc(c.label)}</h2><div class="list">${byCat[c.id].map(g => rowGamme(g, { ts, q: ts.join(" "), noSnip: true })).join("")}</div>`).join("")}`;
  }

  // ---- démarche + croiseur
  let crossSel = [];
  function demarche() {
    let h = `<h1 class="hh">${hIco("demarche", "diffus")}Démarche</h1><p class="sub">De ce que l'on voit à la bonne gamme.</p>`;
    const GC = ["os", "perioste", "axial", "diffus", "tm", "pedia"];
    h += D.guide.map((sec, i) => `<details class="card gsec" style="${cvar(GC[i])}"><summary class="gsec-h">${tile(GC[i], 20)}<b>${esc(sec.title)}</b><span class="chev">›</span></summary><div class="gsec-b">
      ${sec.steps.map(st => `<div class="step"><div class="lab">${esc(st.label)}</div><div class="chips">${st.ids.map(id => `<a class="chip" href="#/g/${id}">${esc(G[id].title)}</a>`).join("")}</div></div>`).join("")}</div></details>`).join("");
    h += `<section class="card pad" id="cross" style="margin-top:14px"><div class="gsec-h">${tile("aspect", 20)}<b>Croiser des gammes</b></div>
      <p class="sub" style="margin-top:4px">2 ou 3 gammes → les diagnostics communs.</p>
      <input id="crossQ" type="search" placeholder="Ajouter un critère (filtrer les gammes)…" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:16px">
      <div class="chips" id="crossPick" style="margin-top:8px"></div>
      <div class="chips" id="crossSel" style="margin-top:10px"></div>
      <div class="cross-res" id="crossRes"></div></section>`;
    view.innerHTML = h;
    const pick = $("#crossPick"), sel = $("#crossSel"), res = $("#crossRes"), cq = $("#crossQ");
    const pool = MSK.filter(g => g.ents.length >= 2 && !g.cats.includes("classif"));
    function draw() {
      const ts = terms(cq.value);
      const cand = pool.filter(g => !crossSel.includes(g.id) && (!ts.length || ts.every(t => norm(g.title + " " + (g.sub || "")).includes(t)))).slice(0, ts.length ? 12 : 0);
      pick.innerHTML = cand.map(g => `<button class="chip" data-add="${g.id}">＋ ${esc(g.title)}</button>`).join("");
      sel.innerHTML = crossSel.map(id => `<button class="chip acc" data-rm="${id}">${esc(G[id].title)} ✕</button>`).join("");
      if (crossSel.length < 2) { res.innerHTML = crossSel.length ? `<p class="sub">Ajoutez un 2ᵉ critère…</p>` : ""; return; }
      const common = D.entities.filter(e => crossSel.every(id => G[id].ents.includes(e.id)));
      res.innerHTML = common.length
        ? `<div class="lab" style="font-weight:700;margin-bottom:6px">${common.length} diagnostic${common.length > 1 ? "s" : ""} commun${common.length > 1 ? "s" : ""}</div><div class="chips">${common.map(e => `<a class="chip ent" href="#/d/${e.id}">${esc(e.label)}</a>`).join("")}</div>`
        : `<div class="empty">Aucun diagnostic commun à toutes ces gammes.</div>`;
    }
    pick.onclick = ev => { const b = ev.target.closest("[data-add]"); if (!b) return; if (crossSel.length < 3) crossSel.push(b.dataset.add); haptic(8); cq.value = ""; draw(); };
    sel.onclick = ev => { const b = ev.target.closest("[data-rm]"); if (!b) return; crossSel = crossSel.filter(x => x !== b.dataset.rm); draw(); };
    cq.oninput = draw;
    draw();
  }

  // ---- révision (flashcards)
  let rev = null;
  function revision() {
    const scores = store.get("scores", {});
    const scope = store.get("revScope", "all");
    const pool = MSK.filter(g => !g.cats.includes("classif") && g.blocks.some(b => b.type === "list" && b.items.filter(i => i.k === "li").length >= 3))
      .filter(g => scope === "all" || (scope === "favs" ? favs.has(g.id) : g.cats.includes(scope)));
    const known = pool.filter(g => (scores[g.id] || 0) > 0).length;
    if (!rev || rev.scope !== scope || !pool.find(g => g.id === rev.id)) rev = { scope, id: null, shown: false };
    if (!rev.id && pool.length) {
      // priorité aux cartes « à revoir » puis jamais vues
      const w = pool.map(g => [g, (scores[g.id] ?? 0) < 0 ? 3 : scores[g.id] === undefined ? 2 : 1]);
      const tot = w.reduce((a, x) => a + x[1], 0); let r = Math.random() * tot;
      for (const [g, p] of w) { r -= p; if (r <= 0) { rev.id = g.id; break; } }
      rev.id ||= pool[0].id;
    }
    const g = G[rev.id];
    const opts = [["all", "Tout"], ["favs", "★ Favoris"], ...D.cats.filter(c => c.id !== "classif").map(c => [c.id, c.label])];
    let h = `<h1 class="hh">${hIco("revision", "tm")}Révision</h1><p class="sub">Retrouvez de mémoire le contenu de la gamme, puis révélez.</p>
      <select id="scopeSel" class="scope">${opts.map(([k, l]) => `<option value="${k}"${k === scope ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>
      <div class="sub" style="font-size:13px">${known}/${pool.length} gammes maîtrisées</div><div class="progress"><i style="width:${pool.length ? (100 * known / pool.length) : 0}%"></i></div>`;
    if (!g) { view.innerHTML = h + `<div class="empty">Aucune gamme dans cette sélection.</div>`; bindScope(); return; }
    const n = g.blocks.filter(b => b.type === "list").reduce((a, b) => a + b.items.filter(i => i.k === "li").length, 0);
    h += `<section class="card pad flash"><div class="meta" style="margin:0">${catChips(g)}</div>
      <div class="q">${esc(g.title)}</div>${g.sub ? `<div class="sub">${esc(g.sub)}</div>` : ""}
      <div class="sub" style="font-size:13px">≈ ${n} éléments</div>
      ${rev.shown ? `<div id="ans"></div>` : ""}
      <div class="actions">${rev.shown
        ? `<button class="btn ko" data-r="-1">↻ À revoir</button><button class="btn ok" data-r="1">✓ Je savais</button>`
        : `<button class="btn ghost" data-skip>Passer</button><button class="btn" data-show>Révéler</button>`}</div></section>`;
    view.innerHTML = h;
    if (rev.shown) {
      const tmp = document.createElement("div");
      tmp.innerHTML = g.blocks.filter(b => b.type !== "images").map(b => b.type === "list"
        ? `<ul class="tree">${b.items.map(i => `<li class="${i.k} l${Math.min(i.l, 4)}">${esc(i.t)}</li>`).join("")}</ul>` : renderTable(b.rows)).join("");
      $("#ans").append(...tmp.childNodes);
      $("#ans").insertAdjacentHTML("beforeend", `<p><a class="tag" href="#/g/${g.id}">Ouvrir la fiche ›</a></p>`);
    }
    bindScope();
    view.querySelector("[data-show]")?.addEventListener("click", () => { rev.shown = true; haptic(8); revision(); });
    view.querySelector("[data-skip]")?.addEventListener("click", () => { rev = null; revision(); });
    view.querySelectorAll("[data-r]").forEach(b => b.onclick = () => {
      const sc = store.get("scores", {}); sc[g.id] = +b.dataset.r; store.set("scores", sc); haptic(15);
      rev = null; revision(); window.scrollTo({ top: 0 });
    });
    function bindScope() {
      $("#scopeSel").onchange = ev => { store.set("revScope", ev.target.value); rev = null; revision(); };
    }
  }

  function favoris() {
    const list = [...favs].map(id => G[id]).filter(Boolean);
    view.innerHTML = `<h1 class="hh">${hIco("favoris", "perioste")}Favoris</h1>${list.length ? `<div class="list">${list.map(g => rowGamme(g, { tile: true })).join("")}</div>`
      : `<div class="empty">Aucun favori pour l'instant.<br>Touchez ☆ sur une gamme pour l'épingler ici.</div>`}`;
  }
  function notFound() { view.innerHTML = `<div class="empty">Page introuvable. <a href="#/">Accueil</a></div>`; }

  // ------------------------------------------------------------ routeur
  function setTab(t) { document.querySelectorAll(".tabbar a").forEach(a => a.classList.toggle("on", a.dataset.tab === t)); }
  function route() {
    const [path, qs] = (location.hash.slice(1) || "/").split("?");
    const parts = path.split("/").filter(Boolean);
    const q = new URLSearchParams(qs || "").get("q");
    $("#backBtn").hidden = !parts.length;
    if (parts[0] !== "search" && qInput.value) { qInput.value = ""; qClear.hidden = true; }
    switch (parts[0]) {
      case undefined: setTab("home"); home(); break;
      case "search": setTab("home"); qInput.value ? renderSearch(qInput.value) : home(); break;
      case "cat": setTab("home"); catView(parts[1]); break;
      case "g": setTab(""); gammeView(parts[1], q); break;
      case "d": setTab("diagnostics"); entityView(parts[1]); break;
      case "diagnostics": setTab("diagnostics"); diagnostics(); break;
      case "demarche": setTab("demarche"); demarche(); break;
      case "revision": setTab("revision"); revision(); break;
      case "favoris": setTab("favoris"); favoris(); break;
      default: notFound();
    }
  }
  window.addEventListener("hashchange", () => { route(); window.scrollTo({ top: 0 }); });
  $("#backBtn").onclick = () => history.length > 1 ? history.back() : (location.hash = "#/");

  // ------------------------------------------------------------ lightbox
  const lb = $("#lightbox");
  view.addEventListener("click", e => {
    const img = e.target.closest("img[data-zoom]"); if (!img) return;
    lb.querySelector("img").src = img.src; lb.hidden = false; document.body.style.overflow = "hidden";
  });
  lb.addEventListener("click", e => { if (e.target.tagName !== "IMG" || e.target.closest(".lb-close")) { lb.hidden = true; document.body.style.overflow = ""; } });
  lb.querySelector(".lb-close").onclick = () => { lb.hidden = true; document.body.style.overflow = ""; };
  addEventListener("keydown", e => { if (e.key === "Escape" && !lb.hidden) { lb.hidden = true; document.body.style.overflow = ""; } });

  // ------------------------------------------------------------ pull-to-refresh (tactile + souris)
  const ptr = $("#ptr"); let y0 = null, dy = 0, armed = false;
  const start = y => { if (scrollY <= 0 && lb.hidden) { y0 = y; dy = 0; armed = false; } };
  const move = y => {
    if (y0 === null) return; dy = y - y0;
    if (dy <= 0) { ptr.style.transform = ""; return; }
    const p = Math.min(dy, 120);
    ptr.style.transform = `translate(-50%,${p - 80}px)`;
    if (p >= 80 && !armed) { armed = true; haptic(10); ptr.querySelector(".ptr-txt").textContent = "Relâcher pour actualiser"; }
    if (p < 80 && armed) { armed = false; ptr.querySelector(".ptr-txt").textContent = "Tirer pour actualiser"; }
  };
  const end = async () => {
    if (y0 === null) return; y0 = null;
    if (!armed) { ptr.style.transform = ""; return; }
    ptr.classList.add("go"); ptr.querySelector(".ptr-txt").textContent = "Actualisation…"; haptic([10, 40, 10]);
    try { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); } catch {}
    setTimeout(() => location.reload(), 350);
  };
  addEventListener("touchstart", e => start(e.touches[0].clientY), { passive: true });
  addEventListener("touchmove", e => move(e.touches[0].clientY), { passive: true });
  addEventListener("touchend", end);
  addEventListener("mousedown", e => { if (e.button === 0 && !e.target.closest("input,button,a,img")) start(e.clientY); });
  addEventListener("mousemove", e => { if (y0 !== null) move(e.clientY); });
  addEventListener("mouseup", end);

  // ------------------------------------------------------------ PWA
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  route();
})();
