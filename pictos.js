/* Pictogrammes radiologiques schématiques (48×48), un par groupe et par sous-choix.
   Classes (stylées dans app.css) : bo = os, le = lésion (couleur du groupe), ln = trait coloré,
   sk = trait sombre, so = tissus mous, dk = fond IRM sombre, wh = hypersignal. */
window.GEA_PICTOS = (() => {
  // os long vertical (épiphyses arrondies)
  const BONE = '<path class="bo" d="M17 4h14a5 5 0 0 1 3 9l-3 3v16l3 3a5 5 0 0 1-3 9H17a5 5 0 0 1-3-9l3-3V16l-3-3a5 5 0 0 1 3-9z"/><path class="sk th" d="M20.5 17v14M27.5 17v14"/>';
  // articulation (fémur distal / plateau tibial)
  const JOINT_T = '<path class="bo" d="M16 2h16v10c0 3 6 4 6 10H10c0-6 6-7 6-10z"/>';
  const JOINT_B = '<path class="bo" d="M10 27h28c0 5-6 6-6 9v10H16V36c0-3-6-4-6-9z"/>';
  // vertèbre de profil : corps + arc postérieur
  const vert = (y, h = 13) => `<rect class="bo" x="7" y="${y}" width="22" height="${h}" rx="3"/><path class="bo" d="M29 ${y + 3}h7l6 ${h / 2 - 3}-6 ${h / 2 - 3}h-7z"/>`;
  // coupe axiale de membre
  const LIMB = '<circle class="so" cx="24" cy="24" r="20"/><circle class="bo" cx="24" cy="26" r="5.5"/>';
  const P = {
    // ---------------------------------------------------------------- groupes
    os: BONE + '<ellipse class="le" cx="24" cy="14.5" rx="4.6" ry="4"/>',
    axial: vert(3, 12) + vert(18, 12) + vert(33, 12) + '<circle class="le" cx="18" cy="24" r="3.6"/>',
    tm: LIMB + '<ellipse class="le" cx="33" cy="16" rx="6" ry="4.5"/>',
    art: JOINT_T + JOINT_B + '<circle class="le" cx="11.5" cy="22" r="2.4"/><circle class="le" cx="36.5" cy="22" r="2.4"/>',
    sys: '<path class="bo" d="M8 6h9v36H8z"/><path class="sk th" d="M10.5 9v30M14.5 9v30"/><path class="bo" d="M21 10h9v32h-9z"/><path class="sk th" d="M23.5 13v26M27.5 13v26"/><path class="le" d="M39 6c3 5 5.5 7.5 5.5 11a5.5 5.5 0 0 1-11 0c0-3.5 2.5-6 5.5-11z"/>',
    ped: '<ellipse class="bo" cx="24" cy="7.5" rx="9" ry="4.5"/><path class="ln" d="M14 14.5h20"/><path class="bo" d="M15 17h18l-4 7v20h-10V24z"/><path class="sk th" d="M21.5 26v16M26.5 26v16"/>',
    ref: '<rect class="bo" x="6" y="7" width="36" height="34" rx="4"/><path class="sk" d="M6 17h36M18 17v24M6 29h36"/><rect class="le" x="6" y="7" width="36" height="10" rx="4"/>',

    // ---------------------------------------------------------------- lésion osseuse
    demarche: BONE + '<ellipse class="le" cx="24" cy="15" rx="4" ry="3.6"/><circle class="ln" cx="31" cy="30" r="7"/><path class="ln" d="M36 35l6 6"/>',
    lodwick: '<rect class="bo" x="2" y="12" width="13" height="24" rx="2"/><rect class="bo" x="17.5" y="12" width="13" height="24" rx="2"/><rect class="bo" x="33" y="12" width="13" height="24" rx="2"/>' +
      '<ellipse class="le" cx="8.5" cy="24" rx="4" ry="5"/><ellipse class="sk" cx="8.5" cy="24" rx="4.2" ry="5.2" style="stroke-width:1.8"/>' +
      '<path class="le" d="M20 21c2-3 6-3 8 0 1 2 0 5-1 6-2 3-5 2-6 0-1-1-2-4-1-6z" opacity=".75"/>' +
      [[36, 17], [40, 20], [37.5, 24], [42, 27], [36.5, 30], [40, 33], [43, 15], [38, 28]].map(([x, y]) => `<circle class="le" cx="${x}" cy="${y}" r="1.1"/>`).join(""),
    siege: BONE + '<path class="le" d="M17 4h14a5 5 0 0 1 3 9H14a5 5 0 0 1 3-9z"/><path class="ln" d="M13 16h22M13 32h22" stroke-dasharray="2 2"/>',
    contenu: '<path class="bo" d="M19 2h10v44H19z"/><ellipse class="bo" cx="24" cy="24" rx="12" ry="11"/><path class="le" d="M12.2 26h23.6a12 11 0 0 1-23.6 0z"/><path class="sk" d="M24 13v22M14 20l20 0" style="stroke-width:1"/><path class="ln" d="M12 26h24"/>',
    perioste: '<rect class="bo" x="15" y="2" width="18" height="44" rx="2"/><path class="sk th" d="M20 3v42M28 3v42"/>' +
      '<path class="ln" d="M12 10q-4 14 0 28M8.5 12q-4 12 0 24M5 14q-4 10 0 20"/>' +
      [16, 20, 24, 28, 32].map(y => `<path class="ln" d="M34 ${y}h${y === 24 ? 11 : 8}"/>`).join(""),
    surface: '<rect class="bo" x="4" y="26" width="40" height="14" rx="3"/><path class="sk th" d="M5 30h38"/><path class="le" d="M15 26c0-9 4-13 9-13s9 4 9 13z"/>',
    multi: '<circle class="bo" cx="24" cy="7" r="4.5"/><path class="bo" d="M17 13h14l3 15h-3.5l-1.5 17h-4l-1-11-1 11h-4l-1.5-17H14z"/>' +
      [[20, 18], [28, 22], [22, 30], [27, 39], [24, 7]].map(([x, y]) => `<circle class="le" cx="${x}" cy="${y}" r="2.2"/>`).join(""),

    // ---------------------------------------------------------------- rachis & sites
    vertebre: vert(6, 16) + vert(26, 16) + '<rect class="le" x="9" y="28" width="18" height="12" rx="2"/>',
    disque: vert(2, 17) + vert(29, 17) + '<path class="le" d="M8 20q4 4 8 1t8 2 5-1v6q-3-2-6 0t-8-1-7 2z"/>',
    crane: '<path class="bo" d="M4 38a20 20 0 0 1 40 0h-6a14 14 0 0 0-28 0z"/><circle class="le" cx="14" cy="23" r="2.6"/><circle class="le" cx="24" cy="18.5" r="2.2"/><circle class="le" cx="33" cy="22" r="2.8"/>',
    cotes: '<path class="rib" d="M4 12q20-10 40 2M4 24q20-10 40 2M4 36q20-10 40 2"/><ellipse class="le" cx="26" cy="21" rx="7" ry="4.6"/>',
    doigts: '<rect class="bo" x="17" y="2" width="14" height="10" rx="4"/><rect class="bo" x="16.5" y="14" width="15" height="13" rx="4"/><rect class="bo" x="16" y="29" width="16" height="17" rx="4"/><ellipse class="le" cx="24" cy="37" rx="4.5" ry="5"/>',

    // ---------------------------------------------------------------- tissus mous
    frequentes: '<path class="sk" d="M5 43h38"/><rect class="le" x="8" y="12" width="9" height="31" rx="2"/><rect class="le" x="20" y="22" width="9" height="21" rx="2" opacity=".7"/><rect class="le" x="32" y="30" width="9" height="13" rx="2" opacity=".45"/>',
    tmsiege: '<circle class="so" cx="24" cy="24" r="20"/><circle class="sk" cx="24" cy="24" r="15" stroke-dasharray="3 2"/><path class="sk th" d="M24 9v9M10 28l9-2M38 28l-9-2"/><circle class="bo" cx="24" cy="26" r="5"/><ellipse class="le" cx="35" cy="12" rx="4" ry="3"/>',
    paravert: '<ellipse class="bo" cx="24" cy="16" rx="9" ry="7.5"/><path class="bo" d="M17 23h14l3 9-10 8-10-8z"/><circle class="so" cx="24" cy="29" r="3"/><ellipse class="le" cx="40" cy="22" rx="6" ry="8"/>',
    signal: '<rect class="dk" x="3" y="3" width="42" height="42" rx="6"/><circle class="mg" cx="24" cy="24" r="17"/><circle class="mb" cx="22" cy="27" r="5"/><ellipse class="wh" cx="31" cy="17" rx="7" ry="5.5"/>',
    tmcontenu: '<ellipse class="le soft" cx="24" cy="24" rx="19" ry="15"/><ellipse class="ln" cx="24" cy="24" rx="19" ry="15"/><path class="sk" d="M8 30c5-6 8 4 13-2s8 4 13-2 6 2 8 0"/>' +
      [[17, 16], [22, 13], [29, 17], [32, 13]].map(([x, y]) => `<circle class="dot" cx="${x}" cy="${y}" r="1.7"/>`).join(""),
    nerf: '<path class="nv" d="M2 24h44"/><path class="le" d="M11 24c7-11 19-11 26 0-7 11-19 11-26 0z"/><path class="sk" d="M2 24h9M37 24h9"/>',

    // ---------------------------------------------------------------- articulations
    cristaux: JOINT_T + JOINT_B + '<path class="ln" d="M12 24.5h24" stroke-dasharray="2.5 1.6"/>',
    inflam: '<rect class="so" x="5" y="4" width="38" height="40" rx="14"/>' + JOINT_T + JOINT_B + '<circle class="le" cx="11.5" cy="21" r="2.6"/><circle class="le" cx="36.5" cy="21" r="2.6"/><circle class="le" cx="11.5" cy="28" r="2.2"/>',
    synoviale: '<ellipse class="le soft" cx="24" cy="24" rx="20" ry="13"/>' + JOINT_T + JOINT_B,
    oan: '<path class="bo" d="M14 2h16v10c0 3 5 4 4 9l-6 2-4-3-4 4-8-1c0-6 6-8 6-11z"/><path class="bo" d="M12 31l10-2 4 3 6-2 6 1c0 5-6 6-6 9v6H18v-7c0-3-6-4-6-8z"/><path class="le" d="M8 25l4-2 2 3-3 2zM36 24l4 1-1 3-4-1zM21 25l3-1 1 3-3 1z"/>',

    // ---------------------------------------------------------------- maladies générales
    metab: BONE + '<path class="bo" d="M14.6 13l2.4 3v16l-2.4 3"/><path class="le" d="M17 22h14v6l-7-3-7 3z"/>',
    hemato: '<path class="bo" d="M7 5h11v3.5h12V5h11v17H30v-3.5H18V22H7z"/><path class="bo" d="M7 26h11v3.5h12V26h11v17H30v-3.5H18V43H7z"/><path class="le" d="M18 22h12v4H18z" opacity=".55"/>',
    croissance: '<path class="bo" d="M7 4h10v40H7z"/><path class="bo" d="M23 14h14v20H23z"/><path class="ln" d="M42 4v40M40 4h4M40 44h4"/>',
    autres: '<rect class="bo" x="4" y="20" width="40" height="10" rx="3"/><path class="sk th" d="M5 23.5h38M5 26.5h38"/><circle class="le" cx="24" cy="11" r="1.8"/><path class="le" d="M24 11L19 2.4a10 10 0 0 1 10 0zM24 11l10 0a10 10 0 0 1-5 8.7zM24 11l-5 8.7A10 10 0 0 1 14 11z"/><circle class="sk" cx="24" cy="11" r="3" style="stroke:var(--card);stroke-width:1.6"/><path class="ln" d="M14 34l-3 10M24 34v10M34 34l3 10" opacity=".55"/>',
    enfant: '<ellipse class="bo" cx="24" cy="7.5" rx="9" ry="4.5"/><path class="ln" d="M14 14.5h20"/><path class="bo" d="M15 17h18l-4 7v20h-10V24z"/><path class="sk th" d="M21.5 26v16M26.5 26v16"/>',

    // ---------------------------------------------------------------- référentiel
    classifs: '<rect class="bo" x="6" y="7" width="36" height="34" rx="4"/><path class="sk" d="M6 17h36M18 17v24M6 29h36"/><rect class="le" x="6" y="7" width="36" height="10" rx="4"/>',
    criteres: '<rect class="bo" x="8" y="4" width="32" height="40" rx="4"/>' + [14, 24, 34].map(y => `<path class="ln" d="M13 ${y}l3 3 5-6"/><path class="sk" d="M25 ${y + 1}h10"/>`).join(""),
    anat: '<path class="bo" d="M14 4h12v12l-4 2v26h-6V18l-2-2z"/><path class="ln" d="M28 4l8 6M28 22h10M28 40h10" stroke-dasharray="2 2"/><path class="le" d="M16 18h6v6h-6z"/>',
  };
  const svg = (name, size = 48) => `<svg class="px" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">${P[name] || P.os}</svg>`;
  return { svg, has: n => n in P };
})();
