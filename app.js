/* Gammes & Arpèges — app statique, 100 % hors-ligne (données dans data/embedded_data.js) */
(() => {
  "use strict";
  const D = window.GAMMES_DATA;
  const G = Object.fromEntries(D.gammes.map(g => [g.id, g]));
  const E = Object.fromEntries(D.entities.map(e => [e.id, e]));
  const GRP = Object.fromEntries(D.groups.map(c => [c.id, c]));
  const SUB = {};
  D.groups.forEach(gr => gr.subs.forEach(sb => { SUB[sb.id] = { ...sb, gid: gr.id }; }));
  const MAIN = D.groups.filter(gr => gr.id !== "ref");
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
  const IC = window.GEA_ICONS, PX = window.GEA_PICTOS;
  const col = c => (IC.COLORS[c] || IC.COLORS.classif);
  const px = (name, gid, size = 48) => `<span class="pxw" style="${cvar(gid)}">${PX.svg(name, size)}</span>`;
  const home1 = g => g.path[0]; // [groupe, sous-choix] principal
  const cvar = c => `--c:${col(c)[0]};--c2:${col(c)[1]}`;
  const tile = (c, size = 22) => `<span class="tile" style="${cvar(c)}">${IC.svg(c, size)}</span>`;
  const hIco = (name, c) => `<span class="h-ico" style="${cvar(c)}">${IC.svg(name, 20)}</span>`;
  document.querySelectorAll(".tabbar a").forEach(a => { a.querySelector("span").innerHTML = IC.svg(a.dataset.tab === "home" ? "gammes" : a.dataset.tab, 22); });
  const crumb = (gid, sid) => {
    const gr = GRP[gid], sb = SUB[sid];
    return `<nav class="crumb" style="${cvar(gid)}"><a href="#/c/${gid}">${esc(gr.label)}</a>${sb && gr.subs.length > 1 ? ` › <a href="#/c/${gid}/${sid}">${esc(sb.label)}</a>` : ""}</nav>`;
  };

  // ------------------------------------------------------------ composants
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
    let body = g.resume ? `<p class="resume">${esc(g.resume)}<span class="src">${esc(g.src || "")}</span></p>` : "";
    for (const b of g.blocks) {
      if (b.type === "list") body += `<ul class="tree">${b.items.map(i => `<li class="${i.k} l${Math.min(i.l, 4)}${i.b ? " b" : ""}${i.a ? " ag" : ""}">${rich(i.t, i.e, ts)}</li>`).join("")}</ul>`;
      else if (b.type === "table") body += renderTable(b.rows, b.links);
      else if (b.type === "images") body += `<div class="imgs${b.schema ? " schema" : ""}${b.small ? " small" : ""}">${b.src.map(s => `<img src="${s}" loading="lazy" alt="" data-zoom>`).join("")}</div>`;
    }
    return body;
  }
  // bouton de gamme qui se déroule : titre + image (schéma de la gamme, sinon picto du sous-choix en liste mixte)
  function rowGamme(g, opts = {}) {
    const ts = opts.ts && opts.ts.length ? opts.ts : null;
    const [gid, sid] = home1(g);
    let snip = "";
    if (ts && !opts.noSnip) {
      const tl = ts.join("").length;
      const hit = [...new Set(LINES[g.id])].find(l => ts.every(t => norm(l).includes(t)) && norm(l).length - tl > 18);
      if (hit) snip = `<span class="snip1">${highlight(hit, ts)}</span>`;
    }
    const vis = g.thumb ? `<img class="thumb" src="${g.thumb}" alt="" loading="lazy">` : opts.mixed ? px(sid, gid, 34) : "";
    return `<details class="card acc" data-id="${g.id}" data-q="${esc(opts.q || "")}" style="${cvar(gid)}">
      <summary>${vis}<span class="t"><b>${ts && !opts.noSnip ? highlight(g.title, ts) : esc(opts.short ? g.title.replace(...opts.short) : g.title)}</b>${g.aggr ? `<span class="aggr" title="Signe d'agressivité">agressif</span>` : ""}${snip}</span><span class="chev">›</span></summary>
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
      if (g.cats[0] === "ref") score -= 4;
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
    h += gammes.length ? `<div class="list">${gammes.slice(0, 80).map(g => rowGamme(g, { ts, q, mixed: true })).join("")}</div>`
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
  // ------------------------------------------------------------ orientation décisionnelle (accueil)
  // chaque étape = un critère ; chaque réponse = une gamme (ou une région = union de gammes).
  // Le diagnostic restant = intersection des diagnostics des réponses choisies ; une réponse
  // n'est proposée que si elle laisse au moins un diagnostic.
  const W = {
    os: { label: "Os", px: "os", gid: "os", steps: [
      { t: "Nombre de lésions", o: [["u", "Lésion unique", []], ["s052", "Ostéolyses plurifocales"], ["s095", "Condensation diffuse ou multifocale"],
        ["s053", "Stries intracorticales"], ["s139", "Atteinte osseuse + tissus mous"]] },
      { t: "Localisation", o: [["s301", "Épiphysaire"], ["s302", "Métaphysaire"], ["s303", "Diaphysaire"], ["s311", "Surface de l'os"],
        ["s018", "Corticale"], ["vertebre", "Vertèbre", ["s141", "s145", "s036", "s041", "s034", "s038"]],
        ["sacrum", "Sacrum", ["s146", "s178"]], ["crane", "Crâne", ["s305", "s309"]], ["s039", "Côte"], ["s142", "Doigts"]] },
      { t: "Aspect vertébral", if: "vertebre", o: [["s141", "Ostéolyse vertébrale unique"], ["s036", "Vertèbre ivoire"], ["s145", "Vertèbre évidée (« mini-brain »)"],
        ["s041", "Forme anormale (H, rostre, plana)"], ["s034", "Franchit le disque"], ["s038", "Pseudo-spondylodiscite"]] },
      { t: "Sacrum", if: "sacrum", o: [["s146", "Ostéolyse sacrée"], ["s178", "Masse pré-sacrée"]] },
      { t: "Contours (Lodwick)", o: [["s012", "IA1 — liseré net"], ["s013", "IA2 — condensation dégressive"], ["s014", "IB — sans sclérose"],
        ["s015", "IC, II, III — mal limitée, mitée, perméative"]] },
      { t: "Aspect & contenu", o: [["s138", "Soufflante (coque)"], ["s144", "« In and out »"], ["s032", "Réaction inflammatoire"],
        ["s030", "Niveaux liquide-liquide"], ["s028", "Trabéculations"], ["s101", "Séquestre"], ["s010", "Sinueuse"]] },
      { t: "Périoste", o: [["s020", "Unilamellaire continue"], ["s022", "Plurilamellaire ou spiculée"], ["s021", "Compacte"],
        ["s024", "Encoches endostées ± hyperostose"], ["s023", "Appositions diffuses"]] },
    ] },
    tm: { label: "Parties molles", px: "tm", gid: "tm", steps: [
      { t: "Nombre de lésions", o: [["u", "Masse unique", []], ["s174", "Masses multiples"]] },
      { t: "Siège", o: [["s151", "Superficielle (sous-cutanée)"], ["s155", "Musculaire"], ["s153", "Juxta-articulaire ou tendineuse"],
        ["s157", "Nerf, pédicule vasculo-nerveux"], ["s175", "Paravertébrale"], ["s178", "Pré-sacrée"]] },
      { t: "Signal IRM", o: [["s310", "Hypersignal T1"], ["s167", "Hypersignal T2 liquidien ou myxoïde"], ["s168", "Hyposignal T1 et T2"],
        ["s158", "Triple signal T2"], ["s164", "Structure stratifiée"]] },
      { t: "Contenu", o: [["s049", "Calcifications"], ["s162", "Hypervasculaire (flow voids)"], ["s171", "Hémorragique"], ["s170", "« Fascial tail sign »"]] },
    ] },
  };
  const optIds = o => o[2] || [o[0]];
  const entsOf = ids => new Set(ids.flatMap(id => (G[id] ? G[id].ents : [])));
  const inter = (a, b) => new Set([...a].filter(x => b.has(x)));
  function wizard(dom, picks) {
    const w = W[dom]; if (!w) return home();
    let pool = entsOf(w.steps.flatMap(st => st.o.flatMap(optIds)));
    const chosen = []; // [étape, réponse]
    const steps = w.steps.filter(st => !st.if || picks.includes(st.if));
    let i = 0;
    for (; i < steps.length && i < picks.length; i++) {
      const o = steps[i].o.find(x => x[0] === picks[i]);
      if (o && optIds(o).length) pool = inter(pool, entsOf(optIds(o)));
      chosen.push([steps[i], o]);
    }
    const base = `#/o/${dom}`;
    let h = `<div class="wz-head" style="${cvar(w.gid)}">${PX.svg(w.px, 40)}<div><b>${esc(w.label)}</b><span>${pool.size} diagnostic${pool.size > 1 ? "s" : ""} possible${pool.size > 1 ? "s" : ""}</span></div><a class="wz-reset" href="#/">Recommencer</a></div>`;
    if (chosen.length) h += `<ol class="wz-path">${chosen.map(([st, o], k) => `<li><a href="${base}/${picks.slice(0, k).join("/")}"><span>${esc(st.t)}</span><b>${o ? esc(o[1]) : "—"}</b></a></li>`).join("")}</ol>`;
    // prochaine étape utile : on saute celles dont aucune réponse ne réduit la liste
    let next = null;
    for (let k = i; k < steps.length && pool.size > 1; k++) {
      const opts = steps[k].o.map(o => [o, optIds(o).length ? inter(pool, entsOf(optIds(o))).size : pool.size]).filter(([, n]) => n > 0);
      if (opts.some(([o, n]) => optIds(o).length && n < pool.size)) { next = [k, opts]; break; }
    }
    const ents = [...pool].map(id => E[id]).filter(Boolean).sort((a, b) => norm(a.label).localeCompare(norm(b.label)));
    const first = t => { const m = String(t || "").match(/^.{20,}?[.;](\s|$)/); return (m ? m[0] : String(t || "").slice(0, 120)).replace(/[.;]\s*$/, ""); };
    const res = ents.length <= 30 ? `<h2 class="hh2">${ents.length > 1 ? `${ents.length} réponses possibles` : "Réponse"}</h2><div class="wz-res">${ents.map(e =>
      `<a class="wz-dx" href="#/d/${e.id}"><b>${esc(e.label)}</b>${e.resume ? `<small>${esc(first(e.resume))}</small>` : ""}</a>`).join("")}</div>` : "";
    let q = "";
    if (next) {
      const [k, opts] = next;
      const hrefK = key => `${base}/${[...picks.slice(0, i), ...Array(k - i).fill("_"), key].join("/")}`;
      q = `<h2 class="hh2">Affiner : ${esc(steps[k].t)}</h2><div class="wz-opts">${opts.map(([o, n]) => {
        const g = o[2] ? null : G[o[0]];
        return `<a class="wz-opt" href="${hrefK(o[0])}"><span>${esc(o[1])}${g && g.aggr ? ` <span class="aggr">agressif</span>` : ""}</span>${optIds(o).length ? `<span class="n">${n}</span>` : ""}</a>`;
      }).join("")}<a class="wz-opt skip" href="${hrefK("_")}"><span>Je ne sais pas / passer</span></a></div>`;
    }
    // peu de réponses : on les montre d'abord ; sinon la question d'abord
    h += ents.length <= 8 ? res + q : q + res;
    view.innerHTML = h;
  }

  function home() {
    let h = "";
    const rec = recents.filter(id => G[id]).slice(0, 3);
    if (rec.length) h += `<div class="chips recent">${rec.map(id => `<a class="chip" href="#/g/${id}">${esc(G[id].title)}</a>`).join("")}</div>`;
    h += `<h2 class="hh2">Orienter une lésion</h2><div class="grid big">${Object.entries(W).map(([k, w]) => `<a class="card grp wz" href="#/o/${k}" style="${cvar(w.gid)}">${PX.svg(w.px, 64)}<b>${esc(w.label)}</b></a>`).join("")}</div>`;
    h += `<h2 class="hh2">Toutes les gammes</h2><div class="list">${MAIN.map(gr => `<a class="row" href="#/c/${gr.id}" style="${cvar(gr.id)}">${px(gr.id, gr.id, 32)}<b>${esc(gr.label)}</b></a>`).join("")}</div>`;
    h += `<p class="foot">Dr Grégoire Attané</p>`;
    view.innerHTML = h;
  }

  // niveau 2 : les sous-choix d'un groupe (ou directement la liste s'il n'y en a qu'un)
  function groupView(gid) {
    const gr = GRP[gid]; if (!gr) return notFound();
    if (gr.subs.length === 1) return subView(gid, gr.subs[0].id);
    view.innerHTML = `<h1 class="hh">${px(gid, gid, 40)}${esc(gr.label)}</h1>
      <div class="grid subs">${gr.subs.map(sb => `<a class="card sub-t" href="#/c/${gid}/${sb.id}" style="${cvar(gid)}">${PX.svg(sb.id, 56)}<b>${esc(sb.label)}</b></a>`).join("")}</div>`;
  }

  // titres raccourcis quand le sous-choix porte déjà l'information
  const SHORT = { lodwick: [/^Lodwick (?=I)/, ""], enfant: [/ (chez|de) l['’]enfant/i, ""] };
  // niveau 3 : les gammes d'un sous-choix
  function subView(gid, sid) {
    const gr = GRP[gid], sb = SUB[sid]; if (!gr || !sb || sb.gid !== gid) return notFound();
    const list = sb.ids.map(id => G[id]).filter(Boolean);
    const one = gr.subs.length === 1;
    const short = SHORT[sid];
    view.innerHTML = `<h1 class="hh">${px(sid, gid, 40)}${esc(one ? gr.label : sb.label)}</h1>
      <div class="list">${list.map(g => rowGamme(g, { short })).join("")}</div>`;
    if (list.length === 1) view.querySelector("details.acc")?.setAttribute("open", ""); // une seule gamme : déjà ouverte
  }

  function renderTable(rows, links) {
    const cell = (c, i, j) => rich(c, links && links[i] && links[i][j]);
    if (!rows.length) return "";
    const head = rows[0], body = rows.slice(1);
    const maxc = Math.max(...rows.map(r => r.length));
    const wide = maxc >= 3;
    let h = `<div class="tbl-wrap${wide ? " wide" : ""}"><table><thead><tr>${head.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r, i) => `<tr>${r.map((c, j) => `<td>${cell(c, i + 1, j)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    if (wide) {
      // mobile : un intertitre par ligne, puis « – colonne : valeur » (pas de cartes)
      h += `<div class="stack">${body.map((r, i) => `<div class="sc">${r[0] ? `<div class="sh">${cell(r[0], i + 1, 0)}</div>` : ""}<ul>${r.slice(1).map((c, j) => c ? `<li>${head[j + 1] ? `<span class="k">${esc(head[j + 1])}</span> : ` : ""}<span class="v">${cell(c, i + 1, j + 1)}</span></li>` : "").join("")}</ul></div>`).join("")}</div>`;
    }
    return h;
  }

  function gammeView(id, q) {
    const g = G[id]; if (!g) return notFound();
    recents = [id, ...recents.filter(x => x !== id)].slice(0, 12); store.set("recents", recents);
    const ts = q ? terms(q) : null;
    const body = renderBody(g, ts);
    const [gid, sid] = home1(g), sib = SUB[sid].ids.map(x => G[x]), k = sib.findIndex(x => x.id === id);
    const prev = sib[k - 1], next = sib[k + 1];
    view.innerHTML = `
      ${crumb(gid, sid)}
      <div class="g-head"><div class="t"><h1>${esc(g.title)}${g.aggr ? `<span class="aggr" title="Signe d'agressivité">agressif</span>` : ""}</h1>${g.sub ? `<p class="sub">${esc(g.sub)}</p>` : ""}</div>
        <button class="star${favs.has(id) ? " on" : ""}" id="favBtn" aria-label="Favori">${favs.has(id) ? "★" : "☆"}</button></div>
      <section class="card pad gcard" style="${cvar(gid)}">${body}</section>
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
    view.innerHTML = `<h1 class="hh">${hIco("diagnostics", "axial")}Diagnostics</h1>
      <details class="card gsec" id="cross"${crossSel.length ? " open" : ""} style="${cvar("aspect")}"><summary class="gsec-h">${tile("aspect", 20)}<b>Croiser des gammes</b><span class="chev">›</span></summary><div class="gsec-b">
      <input id="crossQ" type="search" placeholder="Chercher une gamme à croiser…" class="cq">
      <div class="chips" id="crossPick" style="margin-top:8px"></div>
      <div class="chips" id="crossSel" style="margin-top:10px"></div>
      <div class="cross-res" id="crossRes"></div></div></details>
      <div class="az">${letters.map(l => `<a href="#" data-az="${l}">${l}</a>`).join("")}</div>
      <div class="list">${D.entities.map(e => {
        const L = norm(e.label)[0].toUpperCase(); let anchor = "";
        if (L !== cur) { cur = L; anchor = ` id="az-${L}"`; }
        return `<a class="card row"${anchor} href="#/d/${e.id}"><div class="t"><b>${esc(e.label)}</b></div><span class="cnt">${e.gammes.length}</span><span class="arrow">›</span></a>`;
      }).join("")}</div>`;
    crossInit();
    view.querySelectorAll("[data-az]").forEach(a => a.onclick = ev => { ev.preventDefault(); const t = document.getElementById("az-" + a.dataset.az); t && window.scrollTo({ top: t.getBoundingClientRect().top + scrollY - 120, behavior: "smooth" }); });
  }

  function entityView(id) {
    const e = E[id]; if (!e) return notFound();
    const q = encodeURIComponent(e.label.split(/[\/(]/)[0].trim());
    const fiches = D.gammes.filter(g => (g.fiche || []).includes(id));
    // description = caractéristiques de la maladie, une ligne par sous-choix ; chaque mot-clé ouvre la gamme
    const lines = [];
    MAIN.forEach(gr => gr.subs.forEach(sb => {
      const gs = sb.ids.map(x => G[x]).filter(g => g.ents.includes(id) && home1(g)[1] === sb.id && g.kw);
      if (gs.length) lines.push(`<li><span class="dk-k">${esc(sb.kw || sb.label)}</span> : ${gs.map(g => `<a class="kw${g.aggr ? " ag" : ""}" href="#/g/${g.id}?q=${q}">${esc(g.kw)}</a>`).join(", ")}</li>`);
    }));
    view.innerHTML = `<h1>${esc(e.label)}</h1>
      ${e.resume ? `<p class="resume">${esc(e.resume)}<span class="src">${esc(e.src || "")}</span></p>` : ""}
      ${lines.length ? `<ul class="desc">${lines.join("")}</ul>` : ""}
      ${fiches.length ? `<h2 class="hh2">Fiche</h2><div class="list">${fiches.map(g => rowGamme(g, { noSnip: true, mixed: true })).join("")}</div>` : ""}`;
  }

  // ---- croiseur de gammes (dans Diagnostics)
  let crossSel = [];
  function crossInit() {
    const pick = $("#crossPick"), sel = $("#crossSel"), res = $("#crossRes"), cq = $("#crossQ");
    const pool = MSK.filter(g => g.ents.length >= 2 && g.cats[0] !== "ref");
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
    const pool = MSK.filter(g => g.cats[0] !== "ref" && g.blocks.some(b => b.type === "list" && b.items.filter(i => i.k === "li").length >= 3))
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
    const opts = [["all", "Tout"], ["favs", "★ Favoris"], ...MAIN.map(c => [c.id, c.label])];
    let h = `<h1 class="hh">${hIco("revision", "tm")}Révision</h1><p class="sub">Retrouvez de mémoire le contenu de la gamme, puis révélez.</p>
      <select id="scopeSel" class="scope">${opts.map(([k, l]) => `<option value="${k}"${k === scope ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>
      <div class="sub" style="font-size:13px">${known}/${pool.length} gammes maîtrisées</div><div class="progress"><i style="width:${pool.length ? (100 * known / pool.length) : 0}%"></i></div>`;
    if (!g) { view.innerHTML = h + `<div class="empty">Aucune gamme dans cette sélection.</div>`; bindScope(); return; }
    const n = g.blocks.filter(b => b.type === "list").reduce((a, b) => a + b.items.filter(i => i.k === "li").length, 0);
    h += `<section class="card pad flash" style="${cvar(home1(g)[0])}"><div class="meta" style="margin:0">${crumb(...home1(g))}</div>
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
    view.innerHTML = `<h1 class="hh">${hIco("favoris", "perioste")}Favoris</h1>${list.length ? `<div class="list">${list.map(g => rowGamme(g, { mixed: true })).join("")}</div>`
      : `<div class="empty">Aucun favori pour l'instant.<br>Touchez ☆ sur une gamme pour l'épingler ici.</div>`}`;
  }
  function notFound() { view.innerHTML = `<div class="empty">Page introuvable. <a href="#/">Accueil</a></div>`; }

  // ------------------------------------------------------------ routeur
  function setTab(t) { document.querySelectorAll(".tabbar a").forEach(a => a.classList.toggle("on", a.dataset.tab === t)); }
  function route() {
    const [path, qs] = (location.hash.slice(1) || "/").split("?");
    const parts = path.split("/").filter(Boolean);
    const q = new URLSearchParams(qs || "").get("q");
    $("#backBtn").hidden = !parts.length || (parts[0] === "c" && parts[1] === "ref" && !parts[2]) || ["diagnostics", "revision", "favoris"].includes(parts[0]);
    if (parts[0] !== "search" && qInput.value) { qInput.value = ""; qClear.hidden = true; }
    switch (parts[0]) {
      case undefined: setTab("home"); home(); break;
      case "search": setTab("home"); qInput.value ? renderSearch(qInput.value) : home(); break;
      case "c": if (parts[2] === "demarche" || parts[2] === "unique") { location.replace("#/c/os"); break; } setTab(parts[1] === "ref" ? "ref" : "home"); parts[2] ? subView(parts[1], parts[2]) : groupView(parts[1]); break;
      case "cat": location.replace("#/"); break;
      case "g": { const mv = ({ s029: "s301", s042: "s302", s011: "s303", s031: "s304", s161: "s304", ...(D.moved || {}) })[parts[1]]; if (mv) { location.replace("#/g/" + mv); break; } setTab(""); gammeView(parts[1], q); break; }
      case "o": setTab("home"); wizard(parts[1], parts.slice(2)); break;
      case "d": setTab("diagnostics"); entityView(parts[1]); break;
      case "diagnostics": setTab("diagnostics"); diagnostics(); break;
      case "demarche": location.replace("#/diagnostics"); break;
      case "revision": location.replace("#/"); break; // onglet Révision retiré pour le moment (code conservé)
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
    if (p >= 80 && !armed) { armed = true; haptic(10); }
    if (p < 80 && armed) armed = false;
    ptr.style.opacity = Math.min(1, p / 60); ptr.querySelector(".ptr-ico").style.transform = `rotate(${p * 3}deg)`;
  };
  const end = async () => {
    if (y0 === null) return; y0 = null;
    if (!armed) { ptr.style.transform = ""; ptr.style.opacity = 0; return; }
    ptr.classList.add("go"); haptic([10, 40, 10]);
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
