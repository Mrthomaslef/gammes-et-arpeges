<img src="assets/logo.svg" width="64" height="64" alt="">

# Gammes & Arpèges — imagerie ostéo-articulaire

Web-app (PWA, 100 % hors-ligne) qui aide les internes à **s'y retrouver dans les gammes diagnostiques MSK**,
construite à partir du diaporama « *Des gammes et des arpèges !* » — Grégoire Attané, service d'imagerie
ostéo-articulaire, viscérale et vasculaire (Pr Bousson).

🔗 https://mrthomaslef.github.io/gammes-et-arpeges/

## Fonctions

- **Gammes** : 154 fiches rangées en 6 groupes illustrés (lésion osseuse, rachis & sites, tissus mous, articulations,
  maladies générales, enfant), chacun avec un 2ᵉ choix en pictogrammes (ex. Lésion osseuse → Contours, Siège, Périoste…).
- **Référentiel** (onglet à part) : classifications (OMS, Lodwick, Magerl…), critères, anatomie et repères.
- **Recherche** instantanée insensible aux accents, avec surlignage des lignes correspondantes.
- **Diagnostics** : 81 diagnostics indexés → toutes les gammes où chacun apparaît, + **croiseur de gammes**
  (ex. *lacunes épiphysaires* ∩ *niveaux liquide-liquide* → TCG, chondroblastome…).
- **Révision** : flashcards avec suivi « je savais / à revoir » (stocké localement).
- Favoris, récents, thème clair/sombre, pull-to-refresh, images des diapos zoomables.

## Mise à jour des données

```bash
# 1. ré-extraire le pptx (si le diaporama change)
python3 -I scripts/extract_pptx.py <dossier_pptx_dézippé> data/source/slides_raw.json
# 2. reconstruire data/gammes.json + data/embedded_data.js
python3 scripts/build_data.py
```

L'arborescence (`GROUPS`), la catégorisation, les titres courts, les corrections de coquilles, les transcriptions des diapos-images
et l'index des diagnostics sont dans `scripts/build_data.py` ; les pictogrammes dans `pictos.js` ;
les schémas SVG dans `scripts/make_schemas.py`. Après modification, incrémenter `CACHE` dans
`sw.js` et le `?v=` des ressources dans `index.html`.

> Outil d'aide à la mémorisation — ne remplace pas le raisonnement clinico-radiologique.
