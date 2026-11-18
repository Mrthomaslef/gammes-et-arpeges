/* Icônes SVG maison (trait 24×24) + couleurs par thème */
window.GEA_ICONS = (() => {
  const P = {
    os: '<path d="M17 10c.7-.7 1.7 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .8.7 1.8 0 2.5l-7 7c-.7.7-1.7 0-2.5 0a2.5 2.5 0 0 0 0 5c.3 0 .5.2.5.5a2.5 2.5 0 1 0 5 0c0-.8-.7-1.8 0-2.5Z"/>',
    aspect: '<circle cx="10.5" cy="10.5" r="7"/><path d="m15.5 15.5 5.5 5.5"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="12.5" cy="11" r="1.6" fill="currentColor" stroke="none"/><circle cx="9" cy="13" r=".9" fill="currentColor" stroke="none"/>',
    perioste: '<rect x="3" y="9.5" width="18" height="5" rx="2.5"/><path d="M5 6.5h14M7 3.5h10M5 17.5h14M7 20.5h10"/>',
    axial: '<rect x="6" y="2.5" width="12" height="4.6" rx="1.8"/><rect x="5.5" y="9.7" width="13" height="4.6" rx="1.8"/><rect x="6" y="16.9" width="12" height="4.6" rx="1.8"/><path d="M10 7.1v2.6M14 7.1v2.6M10 14.3v2.6M14 14.3v2.6"/>',
    diffus: '<circle cx="6" cy="6" r="2"/><circle cx="16.5" cy="5" r="1.5"/><circle cx="12" cy="12" r="2.6"/><circle cx="5" cy="17.5" r="1.6"/><circle cx="18" cy="16" r="2.2"/><circle cx="11" cy="20" r="1"/><circle cx="20" cy="10" r=".9"/>',
    tm: '<path d="M12 3c4.2 0 7 2.8 7 6.6 0 2.6-1.2 3.6-1.2 5.6S16.2 21 11.6 21 4.5 18.6 4.5 14.8c0-2.4 1.8-3.4 1.8-5.6C6.3 5.6 8.2 3 12 3Z"/><path d="M9 11c1-1.4 2-1.4 3 0s2 1.4 3 0M9 14.5c1-1.4 2-1.4 3 0s2 1.4 3 0"/>',
    rhumato: '<path d="M8.5 2.5v5.2a3.5 3.5 0 0 0 7 0V2.5"/><path d="M8.5 21.5v-5.2a3.5 3.5 0 0 1 7 0v5.2"/><path d="M5 12h2M17 12h2"/>',
    interne: '<path d="M12 2.8s6.2 6.6 6.2 11.2a6.2 6.2 0 0 1-12.4 0C5.8 9.4 12 2.8 12 2.8Z"/><path d="M9.2 14.4a2.8 2.8 0 0 0 2.8 2.8"/>',
    pedia: '<circle cx="12" cy="13" r="7.5"/><path d="M12 5.5c0-2 2.4-2.6 2.6-1"/><circle cx="9.3" cy="12.3" r=".9" fill="currentColor" stroke="none"/><circle cx="14.7" cy="12.3" r=".9" fill="currentColor" stroke="none"/><path d="M9.8 15.8a3 3 0 0 0 4.4 0"/>',
    classif: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M9 9.5V20M3 14.8h18"/>',
    gammes: '<path d="M9 18V5.5l11-2.3v12.6"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="15.8" r="3"/><path d="M9 9.4l11-2.3"/>',
    demarche: '<circle cx="12" cy="12" r="9"/><path d="M15.8 8.2 13.6 13.6 8.2 15.8 10.4 10.4Z"/>',
    diagnostics: '<circle cx="10.5" cy="10.5" r="7"/><path d="m15.5 15.5 5.5 5.5M8 10.5h5M10.5 8v5"/>',
    revision: '<rect x="3.5" y="6.5" width="13" height="15" rx="2.2"/><path d="M8 3h10.3a2.2 2.2 0 0 1 2.2 2.2V17"/><path d="m7 14.2 2.2 2.2L13.3 12"/>',
    favoris: '<path d="m12 3 2.8 5.8 6.2.8-4.6 4.3 1.2 6.1L12 17l-5.6 3 1.2-6.1L3 9.6l6.2-.8Z"/>',
  };
  const COLORS = {
    os: ["#6366f1", "#4338ca"], aspect: ["#a855f7", "#7c3aed"], perioste: ["#f59e0b", "#d97706"],
    axial: ["#0ea5e9", "#0369a1"], diffus: ["#14b8a6", "#0f766e"], tm: ["#ec4899", "#be185d"],
    rhumato: ["#f97316", "#c2410c"], interne: ["#ef4444", "#b91c1c"], pedia: ["#22c55e", "#15803d"],
    classif: ["#64748b", "#334155"],
  };
  const svg = (name, size = 24) =>
    `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;
  return { svg, COLORS };
})();
