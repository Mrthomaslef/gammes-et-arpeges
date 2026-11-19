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
  function renderBody(g, ts, noResume) {
    let body = g.resume && !noResume ? `<p class="resume">${resumeHtml(g.resume)}<span class="src">${esc(g.src || "")}</span></p>` : "";
    for (const b of g.blocks) {
      if (b.type === "list") body += `<ul class="tree">${b.items.map(i => `<li class="${i.k} l${Math.min(i.l, 4)}${i.b ? " b" : ""}${i.a ? " ag" : ""}">${rich(i.t, i.e, ts)}</li>`).join("")}</ul>`;
      else if (b.type === "table") body += renderTable(b.rows, b.links);
      else if (b.type === "images") body += `<div class="imgs${b.schema ? " schema" : ""}${b.small ? " small" : ""}">${b.src.map(s => `<img src="${s}" loading="lazy" alt="" data-zoom>`).join("")}</div>`;
    }
    return body;
  }
  // bouton de gamme qui se déroule : titre + image (schéma de la gamme, sinon picto du sous-choix en liste mixte)
  // résumé : une phrase par ligne, une ligne par technique d'imagerie (Radio, TDM, IRM…)
  const IMG = "(?:Radio(?:graphie)?s?|TDM|Scanner|IRM|[ÉE]chographie|[ÉE]cho|Scintigraphie|Scinti|TEP|Biologie|Clinique|Histologie)";
  function resumeHtml(t) {
    const parts = String(t || "").split(new RegExp(`(?<=[.!?])\\s+(?=[A-ZÉÈÀÂÎÔÛÇ«])|\\s*;\\s+(?=${IMG}\\b)`));
    return parts.filter(Boolean).map(x => `<span class="rl">${esc(x).replace(new RegExp(`^(${IMG}[^:]{0,25} :)`), "<b>$1</b>")}</span>`).join("");
  }
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
    if (!d.classList || !d.classList.contains("acc") || !d.dataset.id || !d.open) return;
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
  // ---- arbre de décision (council R1, Cotten/Laredo)
  // réponse = gamme ("s012"), intertitre d'une gamme ("s322#0" = 1re rubrique) ou union de gammes.
  // étape « soft » : un diagnostic absent de toutes les réponses de l'étape (âge, matrice… non précisés) n'est pas éliminé.
  const LYT = ["s301", "s012", "s013", "s014", "s015", "s052", "s138", "s141", "s146", "s142", "s145"];
  const OSLONG = ["s301", "s302", "s303", "s320", "s311", "s018"];
  const VERT = ["s141", "s329", "s145", "s036", "s041", "s034", "s038"];
  const W = {
    os: { label: "Os", px: "os", gid: "os", steps: [
      { t: "Densité", multi: 1, o: [["lyt", "Lytique (ostéolyse)", LYT], ["cond", "Condensante (ostéocondensation)", ["s316", "s095", "s036"]]] },
      { t: "Nombre de lésions", multi: 1, o: [["u", "Lésion unique", "UNI", null, 0, "os"], ["s052", "Lésions multiples : ostéolyses plurifocales", null, "!cond"],
        ["s095", "Lésions multiples : condensation diffuse ou multifocale", null, "!lyt"], ["s023", "Appositions périostées sur plusieurs os"]] },
      { t: "Âge", soft: 1, o: [["s322#0", "Avant 40 ans"], ["s322#1", "Après 40 ans"]] },
      { t: "Os atteint", if: "!s095", o: [["oslong", "Os long", OSLONG], ["vertebre", "Vertèbre", VERT], ["sacrum", "Sacrum", ["s146"]],
        ["crane", "Crâne", ["s305", "s309"]], ["s039", "Côte"], ["s142", "Doigts"]] },
      { t: "Hauteur sur l'os long", if: "oslong", o: [["s301", "Épiphysaire"], ["s302", "Métaphysaire"], ["s303", "Diaphysaire"]] },
      { t: "Position dans l'os", if: ["oslong", "!s301"], soft: 1, o: [["s320#0", "Centrée (médullaire)"], ["s320#1", "Excentrée"],
        ["s018", "Corticale"], ["s311", "Surface de l'os"]] },
      { t: "Aspect vertébral", if: "vertebre", o: [["s329", "Arc postérieur"], ["s145", "Vertèbre évidée (« mini-brain »)", null, "!cond"],
        ["s028", "Trabéculations (travées épaisses)"], ["s036", "Vertèbre ivoire, condensation localisée", null, "!lyt"], ["s041", "Forme anormale (H, rostre, plana)"], ["s034", "Franchit le disque"],
        ["s038", "Atteinte disco-vertébrale (pseudo-spondylodiscite)"]] },
      { t: "Bords (crâne)", if: ["crane", "!cond"], o: [["s305#0", "Limites nettes scléreuses"], ["s305#1", "Sclérose dégressive"],
        ["s305#2", "À l'emporte-pièce (sans sclérose)"], ["s305#3", "Limites floues, mitées ou perméatives", null, null, 1]] },
      { t: "Agressivité (Lodwick)", if: ["!cond", "!crane"], o: [["lq", "Quiescente (IA)", ["s012", "s013"]], ["li", "Intermédiaire (IB)", ["s014"]],
        ["la", "Agressive (IC à III)", ["s015"], null, 1]] },
      { t: "Matrice", if: "!s095", o: [["s325#0", "Chondroïde (arcs et anneaux)"], ["s325#1", "Ostéoïde (nuageuse)"], ["s325#2", "Verre dépoli"],
        ["s325#3", "Graisseuse"]] },
      { t: "Aspect & contenu", o: [["s138", "Soufflante (coque)", null, "!cond"], ["s144", "« In and out »"], ["s032", "Œdème péri-lésionnel marqué (IRM)"],
        ["s030", "Niveaux liquide-liquide", null, "!cond"], ["s028", "Trabéculations", null, "!vertebre"], ["s101", "Séquestre"], ["s010", "Contours serpigineux"]] },
      { t: "Corticale & périoste", o: [["s053", "Stries intracorticales"], ["s020", "Périoste unilamellaire continu"], ["s022", "Périoste plurilamellaire ou spiculé"],
        ["s021", "Périoste compact (endoste normal)"], ["s024", "Encoches endostées ± hyperostose"]] },
    ] },
    tm: { label: "Parties molles", px: "tm", gid: "tm", steps: [
      { t: "Nombre de lésions", multi: 1, o: [["u", "Masse unique", "UNI", null, 0, "tm"], ["s174", "Masses multiples (maladie générale)"]] },
      { t: "Siège", o: [["s151", "Superficielle (sous-cutanée)"], ["s155", "Musculaire"], ["s153", "Juxta-articulaire ou tendineuse"],
        ["s157", "Nerf, pédicule vasculo-nerveux"], ["s175", "Paravertébrale"], ["s178", "Pré-sacrée"]] },
      { t: "Signal T1", o: [["s310#0", "Hypersignal T1 graisseux (s'efface en saturation de graisse)"], ["s310#1", "Hypersignal T1 non graisseux (sang, protéines, mélanine)"]] },
      { t: "Signal T2", o: [["s167", "Hypersignal T2 liquidien ou myxoïde"], ["s168", "Hyposignal T2 (fibrose, hémosidérine, calcium)"],
        ["s158", "Triple signal T2"], ["s164", "Structure stratifiée (bandes alternées)"]] },
      { t: "Contenu", o: [["s049", "Calcifications"], ["s162", "Hypervasculaire (flow voids)"], ["s171", "Hémorragique"], ["s170", "« Fascial tail sign »"]] },
    ] },
    osm: { label: "Os + parties molles", px: "osmou", gid: "tm", steps: [
      { t: "Atteinte associée", o: [["s139", "Une même maladie touche l'os et les tissus mous"]] },
    ] },
    art: { label: "Articulation & tendons", px: "art", gid: "art", steps: [
      { t: "Structure atteinte", o: [["artic", "Articulation, synoviale", ["s159", "s333", "s332", "s055", "s090", "s074", "s050", "s330"]],
        ["tend", "Tendon, gaine, enthèse", ["s312", "s313", "s314", "s315"]]] },
      { t: "Distribution", if: "artic", soft: 1, o: [["s330#0", "Mono-articulaire"], ["s330#1", "Polyarticulaire"]] },
      { t: "Atteinte articulaire", if: "artic", o: [["s159", "Érosions marginales (synovite)"], ["s333", "Érosions à l'emporte-pièce (bords nets)"],
        ["s332", "Calcifications articulaires"], ["s055", "Dactylite"], ["s090", "Synoviale hypointense en T2"], ["s074", "Hémarthrose"],
        ["s050", "Arthropathie destructrice (neurogène)"]] },
      { t: "Autre signe associé", if: "artic", o: [["s159", "Érosions marginales (synovite)", null, "!s159"], ["s333", "Érosions à l'emporte-pièce (bords nets)", null, "!s333"],
        ["s332", "Calcifications articulaires", null, "!s332"], ["s055", "Dactylite", null, "!s055"], ["s090", "Synoviale hypointense en T2", null, "!s090"],
        ["s074", "Hémarthrose", null, "!s074"], ["s050", "Arthropathie destructrice (neurogène)", null, "!s050"]] },
      { t: "Tendon, gaine, enthèse", if: "tend", o: [["s312", "Tendon épaissi ou rompu sans traumatisme"], ["s313", "Calcification tendineuse"],
        ["s314", "Ténosynovite"], ["s315", "Enthèse : œdème, érosion, ossification"]] },
      { t: "Signe associé", if: "tend", o: [["s313", "Calcifications"], ["s090", "Hyposignal T2 (dépôts, hémosidérine)"], ["s159", "Érosions osseuses adjacentes"]] },
    ] },
  };
  // diagnostics d'une rubrique de gamme (n-ième intertitre de 1er niveau)
  function secEnts(g, k) {
    const out = []; let n = -1;
    g.blocks.forEach(b => (b.items || []).forEach(it => {
      if (it.k === "h" && it.l === 0) { n++; return; }
      if (n === k) (it.e || []).forEach(x => out.push(x[2]));
    }));
    return out;
  }
  // « lésion unique » : toutes les gammes du domaine sauf celles des atteintes multiples/diffuses
  const MULTI = ["s052", "s095", "s023", "s053", "s174"];
  const UNI = dom => [...new Set(W[dom].steps.flatMap(st => st.o.flatMap(o => Array.isArray(o[2]) ? o[2] : o[2] ? [] : [o[0]])))]
    .filter(id => !MULTI.includes(id) && !id.includes("#"));
  const UNIC = {};
  const optIds = o => o[2] === "UNI" ? (UNIC[o[5]] ||= UNI(o[5])) : (o[2] || [o[0]]);
  const MULTIK = ["s052", "s095", "s023", "s174"];
  const okIf = (c, picks) => !c || [].concat(c).every(x => x[0] === "!" ? !picks.includes(x.slice(1)) : picks.includes(x));
  // lésions multiples = maladie générale : on ne décrit plus la lésion (seules les étapes « multi » restent)
  const okStep = (st, picks) => okIf(st.if, picks) && (st.multi || !picks.some(p => MULTIK.includes(p)));
  const entsOf = ids => new Set(ids.flatMap(id => {
    if (id[0] === "@") return E[id.slice(1)] ? [id.slice(1)] : [];
    const [gid, k] = id.split("#"); const g = G[gid]; if (!g) return [];
    return k === undefined ? g.ents : secEnts(g, +k);
  }));
  const inter = (a, b) => new Set([...a].filter(x => b.has(x)));
  // ensemble retenu par une réponse (étape « soft » : les diagnostics non couverts par l'étape restent)
  function keep(st, o, pool) {
    const ids = optIds(o); if (!ids.length) return pool;
    let s = entsOf(ids);
    const sec = id => id.includes("#") || id[0] === "@";
    if (st.soft && ids.every(sec)) {
      const cov = entsOf(st.o.flatMap(optIds).filter(sec));
      s = new Set([...s, ...[...pool].filter(x => !cov.has(x))]);
    }
    return inter(pool, s);
  }

  // Questions « Akinator » : après le parcours fixe, on enchaîne les questions qui partagent encore les diagnostics restants.
  // Réponses = listes de diagnostics (@id), d'après le Cotten ; une réponse élimine ceux qui n'y figurent pas.
  const A = (...ids) => ids.map(x => "@" + x);
  const BANK = {
    os: [
      // condensation diffuse ou multifocale
      { t: "Répartition", if: "s095", o: [
        ["rd", "Diffuse et homogène (tout le squelette)", A("meta", "myelofibrose", "odr", "hpt", "mastocytose", "myelome", "fluorose", "osteomalacie", "osteopetrose", "drepano", "gaucher")],
        ["rf", "Foyers multiples (multifocale)", A("meta", "paget", "lymphome", "mastocytose", "myelome", "sarcoidose", "sapho", "infection", "tb", "osteopoecilie", "infarctus", "fracture", "stb", "osteosarcome", "drepano", "gaucher")]] },
      { t: "Âge", if: "s095", o: [
        ["ae", "Enfant ou adolescent", A("osteopetrose", "drepano", "gaucher", "sapho", "infection", "tb", "osteosarcome", "stb", "osteopoecilie", "odr", "osteomalacie", "infarctus", "fracture", "lymphome")],
        ["aa", "Adulte", A("meta", "paget", "myelofibrose", "odr", "hpt", "lymphome", "mastocytose", "myelome", "drepano", "fluorose", "osteomalacie", "sarcoidose", "gaucher", "sapho", "infection", "tb", "osteopoecilie", "infarctus", "fracture", "stb", "osteopetrose")]] },
      // contexte : « soft », seuls les diagnostics qui supposent ce contexte sont listés (les autres restent toujours)
      { t: "Contexte clinique", if: "s095", soft: 1, o: [
        ["cc", "Cancer connu (prostate, sein…)", A("meta")],
        ["ch", "Hémopathie, splénomégalie", A("myelofibrose", "mastocytose", "gaucher")],
        ["cr", "Insuffisance rénale chronique", A("odr")],
        ["cd", "Hémoglobinopathie (drépanocytose, thalassémie)", A("drepano")],
        ["cf", "Exposition prolongée au fluor", A("fluorose")],
        ["cb", "Phacomatose (sclérose tubéreuse)", A("stb")]] },
      { t: "Signe associé", if: "s095", o: [
        ["sp", "Os élargi, travées grossières, corticale épaissie", A("paget")],
        ["sr", "Vertèbres en « maillot de rugby »", A("odr", "osteopetrose")],
        ["so", "Aspect d'« os dans l'os »", A("osteopetrose", "drepano", "gaucher")],
        ["sh", "Vertèbres en H, ostéonécroses épiphysaires", A("drepano", "gaucher")],
        ["si", "Plages médullaires serpigineuses (infarctus)", A("infarctus", "drepano", "gaucher")],
        ["se", "Ossification des enthèses et des ligaments", A("fluorose")],
        ["ss", "Résorption sous-périostée des phalanges", A("hpt", "odr")],
        ["sl", "Fissures de Looser-Milkman", A("osteomalacie")],
        ["sn", "Énostoses péri-articulaires symétriques", A("osteopoecilie")],
        ["sc", "Paroi thoracique antérieure (sterno-claviculaire)", A("sapho")],
        ["sy", "Splénomégalie", A("myelofibrose", "gaucher", "mastocytose", "lymphome", "drepano")],
        ["sx", "Ostéolyses associées (lésions mixtes)", A("meta", "myelome", "lymphome", "mastocytose", "sarcoidose", "tb", "infection", "stb")]] },
      // ostéolyses plurifocales
      { t: "Âge", if: "s052", o: [
        ["le", "Enfant ou adolescent", A("hl", "neuroblastome", "leucemie", "df", "enchondrome", "fno", "nf", "gaucher", "tb", "hydatide", "lymphome")],
        ["lj", "Adulte de moins de 40 ans", A("df", "enchondrome", "hl", "lymphome", "hpt", "gaucher", "hee", "angiosarcome", "mastocytose", "nf", "tb", "hydatide", "sarcoidose", "stb", "meta")],
        ["lv", "Après 40 ans", A("meta", "myelome", "lymphome", "hpt", "hee", "angiosarcome", "mastocytose", "sarcoidose", "tb", "hydatide", "gaucher")]] },
      { t: "Contexte clinique", if: "s052", soft: 1, o: [
        ["kc", "Cancer connu", A("meta", "neuroblastome")],
        ["kh", "Hémopathie, splénomégalie", A("mastocytose", "gaucher")],
        ["kr", "Insuffisance rénale, hyperparathyroïdie connue", A("hpt")],
        ["kt", "Phacomatose (NF1, sclérose tubéreuse)", A("nf", "stb")],
        ["ki", "Zone d'endémie hydatique", A("hydatide")]] },
      { t: "Topographie", if: "s052", o: [
        ["tr", "Un seul membre (atteinte régionale ou unilatérale)", A("df", "enchondrome", "hee", "angiosarcome")],
        ["ta", "Crâne, rachis, bassin, côtes", A("meta", "myelome", "lymphome", "hl", "mastocytose", "neuroblastome", "leucemie", "gaucher", "hpt", "df")],
        ["tm", "Mains et pieds (phalanges)", A("sarcoidose", "enchondrome", "tb", "hpt")],
        ["tg", "Métaphyses des os longs", A("fno", "leucemie", "neuroblastome", "gaucher", "enchondrome")]] },
      { t: "Aspect des lésions", if: "s052", o: [
        ["xv", "Verre dépoli, os déformé", A("df")],
        ["xc", "Matrice chondroïde", A("enchondrome")],
        ["xp", "À l'emporte-pièce, sans sclérose", A("myelome", "meta", "hl", "hpt")],
        ["xf", "Corticales, excentrées, liseré scléreux", A("fno")],
        ["xk", "Kystiques multivésiculaires", A("hydatide", "tb")],
        ["xm", "Mal limitées, mitées ou perméatives", A("leucemie", "neuroblastome", "lymphome", "meta", "angiosarcome", "hee")],
        ["xd", "Lacis ou ostéolyses fines des phalanges", A("sarcoidose")],
        ["xx", "Mixtes (lyse et condensation)", A("mastocytose", "meta", "stb", "lymphome")]] },
      // appositions périostées plurifocales
      { t: "Âge", if: "s023", o: [
        ["pe", "Enfant ou adolescent", A("ewing", "hl", "infection", "leucemie", "lymphome", "neuroblastome", "rms", "oah")],
        ["pa", "Adulte", A("oah", "acromegalie", "infection", "leucemie", "lymphome", "meta")]] },
      { t: "Signe associé", if: "s023", o: [
        ["ph", "Hippocratisme digital", A("oah")],
        ["px", "Extrémités élargies, parties molles épaissies", A("acromegalie", "oah")],
        ["pl", "Lésions osseuses lytiques ou perméatives", A("ewing", "hl", "leucemie", "lymphome", "meta", "neuroblastome", "rms", "infection")],
        ["pf", "Fièvre", A("infection", "ewing", "leucemie", "hl")],
        ["pp", "Cancer bronchique ou maladie pulmonaire", A("oah", "meta")]] },
    ],
    art: [
      { t: "Topographie", if: "artic", o: [
        ["jm", "Mains, poignets, pieds (petites articulations)", A("pr", "spa", "goutte", "cpp", "sarcoidose", "hpt", "odr", "apatite", "infection", "tb", "amylose", "drepano", "diabete", "oan", "oo")],
        ["jg", "Grosses articulations (genou, hanche, épaule, coude, cheville)", A("hemophilie", "svn", "chondromatose", "infection", "tb", "cpp", "apatite", "amylose", "oan", "goutte", "oo", "hemangiome", "leucemie", "drepano", "spa", "pr", "diabete")],
        ["jr", "Rachis, sacro-iliaques", A("spa", "infection", "tb", "cpp", "amylose", "oan", "odr")]] },
      { t: "Contexte clinique", if: "artic", soft: 1, o: [
        ["xh", "Trouble de la coagulation (hémophilie, anticoagulants)", A("hemophilie")],
        ["xn", "Diabète, neuropathie, syringomyélie", A("oan", "diabete")],
        ["xr", "Insuffisance rénale, dialyse", A("amylose", "odr")],
        ["xs", "Psoriasis, MICI, uvéite", A("spa")],
        ["xd", "Hémoglobinopathie", A("drepano")],
        ["xc", "Sarcoïdose connue", A("sarcoidose")]] },
      { t: "Contexte clinique", if: "tend", soft: 1, o: [
        ["yp", "Polyarthrite rhumatoïde connue", A("pr")],
        ["ys", "Spondyloarthrite, psoriasis", A("spa")],
        ["yr", "Insuffisance rénale, dialyse", A("amylose", "odr")],
        ["yd", "Diabète", A("diabete")],
        ["yc", "Sarcoïdose connue", A("sarcoidose")],
        ["yx", "Exposition au fluor", A("fluorose")]] },
    ],
    tm: [
      // âge : « soft », les lésions sans âge préférentiel (lipome, hémangiome, hématome…) ne sont jamais éliminées
      { t: "Âge", if: "u", soft: 1, o: [
        ["te", "Enfant ou adolescent", A("rms", "ewing", "alveolaire", "synovialosarcome", "desmoide", "tbgp")],
        ["tj", "Adulte de moins de 40 ans", A("synovialosarcome", "alveolaire", "desmoide", "tbgp", "tmgnp", "epithelioide", "scc", "ewing", "rms", "hibernome", "liposarcome")],
        ["tv", "Après 40 ans", A("liposarcome", "sip", "myxofibrosarcome", "lms", "meta", "lymphome", "elastofibrome", "myxome", "tfs", "chondrosarcome", "angiosarcome", "tbgp", "tmgnp", "synovialosarcome", "desmoide")]] },
      { t: "Contenu des masses", if: "s174", o: [
        ["mg", "Graisse", A("lipome")],
        ["mc", "Calcifications, dépôts denses", A("apatite", "goutte", "maffucci", "mv", "hemangiome")],
        ["mv", "Phlébolithes, hypersignal T2 franc (vasculaire)", A("hemangiome", "mv", "maffucci")],
        ["mn", "Le long des nerfs (signe de la cible)", A("nf")],
        ["mm", "Myxoïdes intramusculaires", A("mazabraud")],
        ["mb", "Hyposignal T2 en bandes (fibreux)", A("desmoide")],
        ["ms", "Tissulaires non spécifiques", A("meta", "sarcoidose")]] },
      { t: "Atteinte osseuse associée", if: "s174", o: [
        ["oe", "Enchondromes multiples", A("maffucci")],
        ["od", "Dysplasie fibreuse", A("mazabraud")],
        ["on", "Scoliose, dysplasie, pseudarthrose", A("nf")],
        ["ol", "Ostéolyses", A("meta", "sarcoidose")],
        ["oa", "Érosions articulaires", A("goutte")],
        ["o0", "Aucune", A("lipome", "desmoide", "hemangiome", "mv", "apatite", "meta", "sarcoidose", "nf")]] },
      { t: "Siège des masses", if: "s174", o: [
        ["gp", "Péri-articulaire, tendineux", A("apatite", "goutte")],
        ["gs", "Sous-cutané", A("lipome", "meta", "sarcoidose", "nf", "hemangiome")],
        ["gm", "Intramusculaire", A("mazabraud", "sarcoidose", "meta", "hemangiome", "mv", "desmoide", "lipome")],
        ["gr", "Tout un membre (segmentaire)", A("mv", "maffucci", "nf")],
        ["gw", "Paroi abdominale, cicatrice", A("desmoide")]] },
    ],
  };
  // réponses proposées : seulement celles qui éliminent au moins un diagnostic (sauf « lésion unique ») ;
  // une question n'est posée que s'il en reste au moins deux
  const useful = (st, os, pool) => os.map(o => [o, keep(st, o, pool).size])
    .filter(([o, n]) => n > 0 && (n < pool.size || o[2] === "UNI"));
  // prochaine question de la banque : la première (dans l'ordre) qui partage encore les diagnostics restants
  function nextBank(dom, pool, asked, picks) {
    let best = null;
    for (const q of BANK[dom] || []) {
      if (asked.has(q) || !okIf(q.if, picks)) continue;
      const opts = useful(q, q.o, pool);
      if (opts.length < 2) continue;
      return [q, opts]; // questions larges d'abord (ordre de la banque), signes précis ensuite
    }
    return best;
  }
  // parcours : étapes fixes puis questions de la banque
  function walk(dom, picks) {
    const w = W[dom];
    let pool = entsOf(w.steps.flatMap(st => st.o.flatMap(optIds)));
    const steps = w.steps.filter(st => okStep(st, picks)), chosen = [], asked = new Set();
    let i = 0;
    for (; i < picks.length; i++) {
      let st = steps[i];
      if (!st) { const b = pool.size > 1 && nextBank(dom, pool, asked, picks); if (!b) break; st = b[0]; asked.add(st); }
      const o = st.o.find(x => x[0] === picks[i]);
      if (o) pool = keep(st, o, pool);
      chosen.push([st, o]);
    }
    let next = null;
    for (let k = i; k < steps.length && pool.size > 1; k++) {
      const opts = useful(steps[k], steps[k].o.filter(o => okIf(o[3], picks)), pool);
      if (opts.length >= 2) { next = [k, steps[k], opts]; break; }
    }
    if (!next && pool.size > 1) { const b = nextBank(dom, pool, asked, picks); if (b) next = [Math.max(i, steps.length), b[0], b[1]]; }
    return { pool, chosen, i, next };
  }
  function wizard(dom, picks) {
    const w = W[dom]; if (!w) return home();
    const { pool, chosen, i, next } = walk(dom, picks);
    const base = `#/o/${dom}`;
    let h = `<div class="wz-head" style="${cvar(w.gid)}">${PX.svg(w.px, 40)}<div><b>${esc(w.label)}</b><span>${pool.size} diagnostic${pool.size > 1 ? "s" : ""} possible${pool.size > 1 ? "s" : ""}</span></div><a class="wz-reset" href="#/">Recommencer</a></div>`;
    if (chosen.length) h += `<ol class="wz-path">${chosen.map(([st, o], k) => `<li><a href="${base}/${picks.slice(0, k).join("/")}"><span>${esc(st.t)}</span><b>${o ? esc(o[1]) : "—"}</b></a></li>`).join("")}</ol>`;
    const ents = [...pool].map(id => E[id]).filter(Boolean).sort((a, b) => norm(a.label).localeCompare(norm(b.label)));
    const dx = e => `<a class="wz-dx" href="#/d/${e.id}"><b>${esc(e.label)}</b></a>`;
    const mg = picks.find(p => MULTIK.includes(p)) && G[picks.find(p => MULTIK.includes(p))];
    let body = `<div class="wz-res">${ents.map(dx).join("")}</div>`;
    if (mg && !next) { // maladies générales rangées par rubrique de la gamme
      const seen = new Set(); let cur = null; const parts = [];
      mg.blocks.forEach(b => (b.items || []).forEach(it => {
        if (it.k === "h" && it.l === 0) { cur = { t: it.t, l: [] }; parts.push(cur); return; }
        if (!cur) { cur = { t: "", l: [] }; parts.push(cur); }
        (it.e || []).forEach(x => { if (pool.has(x[2]) && !seen.has(x[2]) && E[x[2]]) { seen.add(x[2]); cur.l.push(E[x[2]]); } });
      }));
      const rest = ents.filter(e => !seen.has(e.id));
      if (rest.length) parts.push({ t: "Autres", l: rest });
      body = parts.filter(p => p.l.length).map(p => `${p.t ? `<h3 class="wz-sec">${esc(p.t)}</h3>` : ""}<div class="wz-res">${p.l.map(dx).join("")}</div>`).join("");
    }
    const res = ents.length && (picks.length || ents.length <= 20) ? `<h2 class="hh2">${mg && !next ? "Maladies générales à évoquer" : ents.length > 1 ? `${ents.length} diagnostics à évoquer` : "Diagnostic à évoquer"}</h2>${body}` : "";
    let q = "";
    if (next) {
      const [k, st, opts] = next;
      const hrefK = key => `${base}/${[...picks.slice(0, i), ...Array(k - i).fill("_"), key].join("/")}`;
      q = `<h2 class="hh2">Affiner : ${esc(st.t)}</h2><div class="wz-opts">${opts.map(([o, n]) => {
        const g = o[2] ? null : G[o[0]];
        return `<a class="wz-opt" href="${hrefK(o[0])}"><span>${esc(o[1])}${(g && g.aggr) || o[4] ? ` <span class="aggr">agressif</span>` : ""}</span>${optIds(o).length ? `<span class="n">${n}</span>` : ""}</a>`;
      }).join("")}<a class="wz-opt skip" href="${hrefK("_")}"><span>Je ne sais pas / passer</span></a></div>`;
    }
    h += q + res; // affinage d'abord, réponses possibles en dessous
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
    const res = e.resume || (fiches.find(g => g.resume) || {}).resume, src = e.resume ? e.src : (fiches.find(g => g.resume) || {}).src;
    // fiche intégrée à la page (un seul résumé, puis le contenu de la fiche)
    const fb = fiches.map(g => `${fiches.length > 1 ? `<h2 class="hh2">${esc(g.title)}</h2>` : ""}<div class="g-body">${renderBody(g, null, true)}</div>`).join("");
    view.innerHTML = `<h1>${esc(e.label)}</h1>
      ${res ? `<p class="resume">${resumeHtml(res)}<span class="src">${esc(src || "")}</span></p>` : ""}
      ${fb}
      ${lines.length ? `<details class="card acc dacc"><summary><span class="t"><b>Dans les gammes</b><span class="snip1">${lines.length} critère${lines.length > 1 ? "s" : ""}</span></span><span class="chev">›</span></summary><ul class="desc">${lines.join("")}</ul></details>` : ""}`;
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
