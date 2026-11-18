#!/usr/bin/env python3
"""Génère des schémas SVG propres (remplacent les photos prises à la main).
Usage : python3 scripts/make_schemas.py  → assets/schemas/*.svg
"""
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent.parent / "assets/schemas"
OUT.mkdir(parents=True, exist_ok=True)

INK = "#1c1a33"; MUTED = "#6b6886"; BONE = "#d9d6e8"; CORT = "#8f8aa8"; ACC = "#4f46e5"; ACC2 = "#0d9488"
LES = "#a78bfa"; RED = "#dc2626"
FONT = "font-family='-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif'"


def svg(w, h, body):
    return (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {w} {h}' width='{w}' height='{h}' {FONT}>"
            f"<rect width='{w}' height='{h}' fill='#fff'/>{body}</svg>")


def text(x, y, s, size=13, fill=INK, anchor="middle", weight="400"):
    return f"<text x='{x}' y='{y}' font-size='{size}' fill='{fill}' text-anchor='{anchor}' font-weight='{weight}'>{escape(s)}</text>"


def wrap(s, n):
    words, lines, cur = s.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > n and cur:
            lines.append(cur); cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        lines.append(cur)
    return lines


# ------------------------------------------------------------------ 1. réactions périostées (11 schémas, d'après J.-D. Laredo)
def periostees():
    PW, PH, top, bot = 150, 250, 30, 210
    cap = {1: "Diaphyse normale", 2: "Hyperostose (compacte), endoste normal", 3: "Compacte + encoches endostées",
           4: "Unilamellaire continue", 5: "Plurilamellaire continue", 6: "Spiculée continue",
           7: "Coque continue épaisse", 8: "Coque discontinue fine", 9: "Triangle de Codman",
           10: "Plurilamellaire discontinue", 11: "Spiculée discontinue"}
    L0, L1, R0, R1 = 45, 60, 90, 105  # corticales gauche / droite
    mid = (top + bot) / 2

    def cortices(gap=None, side="both"):
        out = ""
        for x0, x1, s in ((L0, L1, "L"), (R0, R1, "R")):
            if gap and (side == "both" or side == s):
                out += f"<rect x='{x0}' y='{top}' width='{x1-x0}' height='{gap[0]-top}' fill='{CORT}'/>"
                out += f"<rect x='{x0}' y='{gap[1]}' width='{x1-x0}' height='{bot-gap[1]}' fill='{CORT}'/>"
            else:
                out += f"<rect x='{x0}' y='{top}' width='{x1-x0}' height='{bot-top}' fill='{CORT}'/>"
        return out

    def panel(n):
        b = f"<rect x='{L1}' y='{top}' width='{R0-L1}' height='{bot-top}' fill='#fbfaff'/>"
        if n == 1:
            b += cortices()
        elif n in (2, 3):
            bul = 22
            for s in (-1, 1):
                xo, xi = (L0, L1) if s < 0 else (R1, R0)
                if n == 2:
                    inner = f"L{xi},{bot} L{xi},{top}"
                else:  # encoches endostées : festons creusant la corticale
                    y0, step = top + 135, 22.5
                    inner = f"L{xi},{bot} L{xi},{y0} " + " ".join(
                        f"Q{xi + s*16},{y0 - step*k - step/2} {xi},{y0 - step*(k+1)}" for k in range(4)) + f" L{xi},{top}"
                b += (f"<path d='M{xo},{top} C{xo + s*bul},{top+50} {xo + s*bul},{bot-50} {xo},{bot} {inner} Z' fill='{CORT}'/>")
        elif n == 4:
            b += cortices() + f"<path d='M{L0-9},{top+40} L{L0-9},{bot-40}' stroke='{INK}' stroke-width='2'/>"
        elif n == 5:
            b += cortices()
            for s, x in ((-1, L0), (1, R1)):
                for k in range(3):
                    d = 7 + k * 6
                    b += f"<path d='M{x + s*3},{top+45} Q{x + s*(d+8)},{mid} {x + s*3},{bot-45}' fill='none' stroke='{INK}' stroke-width='1.6'/>"
        elif n == 6:
            b += cortices()
            for s, x in ((-1, L0), (1, R1)):
                for k in range(16):
                    y = top + 40 + k * 6.5
                    ln = 8 + 10 * (1 - abs(y - mid) / 60)
                    b += f"<line x1='{x + s*2}' y1='{y}' x2='{x + s*(2+ln)}' y2='{y}' stroke='{INK}' stroke-width='1.4'/>"
        elif n in (7, 8):
            g = (top + 40, bot - 40)
            b += cortices(gap=g)
            for s, x in ((-1, L0), (1, R1)):
                path = f"M{x},{g[0]} C{x + s*38},{g[0]+25} {x + s*38},{g[1]-25} {x},{g[1]}"
                if n == 7:
                    b += f"<path d='{path}' fill='none' stroke='{CORT}' stroke-width='9'/>"
                    b += f"<path d='{path}' fill='none' stroke='{INK}' stroke-width='1.2' stroke-dasharray='0'/>"
                else:
                    b += f"<path d='{path}' fill='none' stroke='{INK}' stroke-width='2' stroke-dasharray='9 8'/>"
            b += f"<ellipse cx='75' cy='{mid}' rx='38' ry='55' fill='{LES}' opacity='.35'/>"
        else:  # 9, 10, 11 : corticale détruite à gauche (9, 10) / à droite (11)
            g = (top + 60, bot - 60)
            side = "R" if n == 11 else "L"
            b += cortices(gap=g, side=side)
            x, s = (L0, -1) if side == "L" else (R1, 1)
            b += f"<rect x='{min(x, x + s*30)}' y='{g[0]}' width='30' height='{g[1]-g[0]}' fill='{LES}' opacity='.35'/>"
            if n == 9:
                for y0, d in ((g[0], -1), (g[1], 1)):
                    b += f"<path d='M{x},{y0 + d*(-30)} Q{x + s*6},{y0} {x + s*22},{y0 + d*18}' fill='none' stroke='{INK}' stroke-width='2'/>"
                b += text(x + s*30, mid + 4, "Codman", 10, RED, "middle", "600")
            elif n == 10:
                for y0, d in ((g[0], -1), (g[1], 1)):
                    for k in range(3):
                        b += f"<line x1='{x + s*(4+k*5)}' y1='{y0 + d*(-22)}' x2='{x + s*(4+k*5)}' y2='{y0 + d*8}' stroke='{INK}' stroke-width='1.6'/>"
            else:
                for y0, d in ((g[0], 1), (g[1], -1)):
                    for k in range(5):
                        y = y0 + d * (4 + k * 6)
                        b += f"<line x1='{x + 3}' y1='{y}' x2='{x + 3 + 18 - k*2}' y2='{y}' stroke='{INK}' stroke-width='1.5'/>"
        # légende
        b += text(PW / 2, bot + 22, str(n), 15, ACC, "middle", "700")
        for i, ln in enumerate(wrap(cap[n], 22)):
            b += text(PW / 2, bot + 38 + i * 13, ln, 10.5, MUTED)
        return b

    W = PW * 6 + 20
    body = text(W / 2, 20, "Classification des réactions périostées (diaphyse d'un os long)", 15, INK, "middle", "700")
    for i in range(11):
        n = i + 1
        r, c = (0, i) if i < 6 else (1, i - 6)
        ox = 10 + c * PW + (PW / 2 if r == 1 else 0)
        oy = 18 + r * (PH + 20)
        body += f"<g transform='translate({ox},{oy})'>{panel(n)}</g>"
    body += text(10, 2 * (PH + 20) + 30, "1-6 : corticale continue (processus lent)  ·  7-8 : soufflure corticale  ·  9-11 : corticale détruite (processus agressif)", 12, MUTED, "start")
    return svg(W, 2 * (PH + 20) + 42, body)


# ------------------------------------------------------------------ 2. topographie des lésions de surface (coupe axiale)
def surface():
    W, H, cx, cy = 900, 440, 450, 225
    b = text(W / 2, 26, "Topographie des lésions osseuses de surface (coupe axiale)", 16, INK, "middle", "700")
    b += f"<circle cx='{cx}' cy='{cy}' r='150' fill='#fbe9ef' />"  # tissus mous
    b += f"<circle cx='{cx}' cy='{cy}' r='118' fill='none' stroke='{RED}' stroke-width='2'/>"   # couche superficielle
    b += f"<circle cx='{cx}' cy='{cy}' r='110' fill='none' stroke='{RED}' stroke-width='2'/>"   # couche profonde
    b += f"<circle cx='{cx}' cy='{cy}' r='106' fill='{CORT}'/><circle cx='{cx}' cy='{cy}' r='66' fill='#fffdf5'/>"
    # sous-périostée : entre corticale et périoste, érode la corticale (haut gauche)
    b += f"<ellipse cx='{cx-70}' cy='{cy-75}' rx='26' ry='18' transform='rotate(-45 {cx-70} {cy-75})' fill='{LES}' stroke='{INK}' stroke-width='1.2'/>"
    # périostée : dans les couches profondes du périoste (droite)
    b += f"<ellipse cx='{cx+114}' cy='{cy}' rx='11' ry='36' fill='{LES}' stroke='{INK}' stroke-width='1.2'/>"
    # paraostéale : couches superficielles, séparée de l'os par un liseré clair (bas droite)
    b += f"<ellipse cx='{cx+98}' cy='{cy+98}' rx='42' ry='13' transform='rotate(-45 {cx+98} {cy+98})' fill='{LES}' stroke='{INK}' stroke-width='1.2'/>"
    def lab(x1, y1, x2, y2, t, anchor="start", sub=None):
        o = f"<line x1='{x1}' y1='{y1}' x2='{x2}' y2='{y2}' stroke='{INK}' stroke-width='1.2'/>" + text(x2 + (6 if anchor == 'start' else -6), y2 + 4, t, 13, INK, anchor, "700")
        if sub:
            o += text(x2 + (6 if anchor == 'start' else -6), y2 + 20, sub, 11.5, MUTED, anchor)
        return o
    b += lab(cx - 85, cy - 92, cx - 150, cy - 165, "Lésion sous-périostée", "end", "accolée à la corticale, réaction périostée")
    b += lab(cx + 124, cy - 20, cx + 190, cy - 60, "Lésion périostée", "start", "couches profondes, allongée")
    b += lab(cx + 118, cy + 118, cx + 170, cy + 170, "Lésion paraostéale", "start", "liseré clair ; ex. ostéosarcome paraostéal")
    b += lab(cx - 100, cy + 20, cx - 175, cy + 40, "Corticale", "end")
    b += lab(cx - 78, cy + 80, cx - 175, cy + 110, "Périoste : couche profonde", "end")
    b += lab(cx - 85, cy + 87, cx - 175, cy + 150, "Périoste : couche superficielle", "end")
    b += text(cx, cy + 4, "Médullaire", 12, MUTED)
    return svg(W, H, b)


# ------------------------------------------------------------------ 3. Gruen (fémur) & DeLee-Charnley (cotyle)
def gruen():
    W, H = 760, 480
    b = text(W / 2, 26, "Suivi de PTH : zones de Gruen (tige fémorale) et de DeLee-Charnley (cotyle)", 15, INK, "middle", "700")
    def femur(ox, labels, title):
        o = text(ox + 75, 56, title, 13, ACC, "middle", "700") + "<g transform='translate(0,40)'>"
        # fût fémoral
        o += f"<path d='M{ox+40},{80} L{ox+40},{380} M{ox+110},{120} L{ox+110},{380}' stroke='{INK}' stroke-width='2.2' fill='none'/>"
        o += f"<path d='M{ox+40},80 Q{ox+60},70 {ox+80},86 L{ox+110},120' stroke='{INK}' stroke-width='2' fill='none'/>"
        # tige
        o += f"<path d='M{ox+60},90 L{ox+92},100 L{ox+82},325 Q{ox+75},340 {ox+68},325 Z' fill='{BONE}' stroke='{INK}' stroke-width='1.6'/>"
        o += f"<line x1='{ox+92}' y1='100' x2='{ox+120}' y2='70' stroke='{INK}' stroke-width='5'/><circle cx='{ox+128}' cy='62' r='16' fill='{BONE}' stroke='{INK}' stroke-width='1.6'/>"
        for y in (155, 240, 330):
            o += f"<line x1='{ox+22}' y1='{y}' x2='{ox+128}' y2='{y}' stroke='{MUTED}' stroke-dasharray='5 4'/>"
        for (x, y, t) in labels:
            o += f"<circle cx='{ox+x}' cy='{y}' r='11' fill='{ACC}'/>" + text(ox + x, y + 4.5, t, 12, "#fff", "middle", "700")
        return o + "</g>"
    b += femur(30, [(20, 115, "1"), (20, 200, "2"), (20, 285, "3"), (75, 360, "4"), (130, 285, "5"), (130, 200, "6"), (130, 130, "7")], "Fémur — face (1 à 7)")
    b += femur(230, [(20, 115, "8"), (20, 200, "9"), (20, 285, "10"), (75, 360, "11"), (130, 285, "12"), (130, 200, "13"), (130, 130, "14")], "Fémur — profil (8 à 14)")
    b += text(105, 448, "1 grand trochanter (latéral)", 11, MUTED) + text(105, 463, "4 pointe · 7 calcar (médial)", 11, MUTED)
    b += text(305, 448, "8-10 antérieures · 11 pointe", 11, MUTED) + text(305, 463, "12-14 postérieures", 11, MUTED)
    # cotyle
    ox, oy, r = 590, 230, 95
    b += text(ox, 56, "Cotyle — face (I à III)", 13, ACC2, "middle", "700")
    b += f"<path d='M{ox-r},{oy} A{r},{r} 0 0 1 {ox+r},{oy}' fill='{BONE}' stroke='{INK}' stroke-width='2'/>"
    b += f"<line x1='{ox-r}' y1='{oy}' x2='{ox+r}' y2='{oy}' stroke='{INK}' stroke-width='2'/>"
    import math
    for ang in (60, 120):
        a = math.radians(ang)
        b += f"<line x1='{ox}' y1='{oy}' x2='{ox + (r+25)*math.cos(a)}' y2='{oy - (r+25)*math.sin(a)}' stroke='{MUTED}' stroke-dasharray='5 4'/>"
    for ang, t in ((150, "I"), (90, "II"), (30, "III")):
        a = math.radians(ang)
        x, y = ox + r*.62*math.cos(a), oy - r*.62*math.sin(a)
        b += f"<circle cx='{x}' cy='{y}' r='13' fill='{ACC2}'/>" + text(x, y + 4.5, t, 12, "#fff", "middle", "700")
    b += text(ox, oy + 30, "I = supéro-latérale · II = moyenne (dôme)", 11, MUTED)
    b += text(ox, oy + 46, "III = inféro-médiale", 11, MUTED)
    b += text(ox, oy + 80, "Liseré > 2 mm ou évolutif = descellement", 11.5, RED, "middle", "600")
    return svg(W, H, b)


# ------------------------------------------------------------------ 4. Ewald (prothèse de genou)
def ewald():
    W, H = 720, 330
    b = text(W / 2, 26, "Zones d'Ewald — prothèse totale de genou (Knee Society, 1989)", 15, INK, "middle", "700")
    def num(x, y, t, c=ACC):
        return f"<circle cx='{x}' cy='{y}' r='11' fill='{c}'/>" + text(x, y + 4.5, t, 12, "#fff", "middle", "700")
    # A : pièce fémorale de profil
    ox = 40
    b += text(ox + 90, 60, "A — Fémur (profil)", 13, ACC, "middle", "700")
    b += f"<path d='M{ox+170},95 L{ox+80},95 Q{ox+20},110 {ox+15},180 Q{ox+20},250 {ox+90},265 L{ox+150},255' fill='none' stroke='{CORT}' stroke-width='16' stroke-linecap='round'/>"
    b += f"<rect x='{ox+70}' y='165' width='40' height='16' rx='8' fill='{BONE}' stroke='{INK}'/>"
    for x, y, t in ((ox+150, 78, "1"), (ox+60, 118, "2"), (ox+45, 215, "3"), (ox+130, 280, "4"), (ox+55, 160, "5"), (ox+125, 173, "6"), (ox+85, 200, "7")):
        b += num(x, y, t)
    b += text(ox + 90, 305, "1 bouclier ant. · 4 condyle post.", 11, MUTED)
    # B : plateau tibial de face
    ox = 270
    b += text(ox + 90, 60, "B — Tibia (face)", 13, ACC2, "middle", "700")
    b += f"<rect x='{ox}' y='100' width='180' height='14' fill='{CORT}'/><path d='M{ox+60},114 L{ox+120},114 L{ox+110},240 L{ox+70},240 Z' fill='{BONE}' stroke='{INK}'/>"
    for x, y, t in ((ox+15, 135, "1"), (ox+45, 135, "2"), (ox+135, 135, "3"), (ox+165, 135, "4"), (ox+50, 190, "5"), (ox+90, 262, "6"), (ox+130, 190, "7")):
        b += num(x, y, t, ACC2)
    b += text(ox + 90, 305, "1-4 sous le plateau (méd. → lat.) · 5-7 quille", 11, MUTED)
    # C : tibia de profil
    ox = 510
    b += text(ox + 90, 60, "C — Tibia (profil)", 13, "#c2410c", "middle", "700")
    b += f"<rect x='{ox+10}' y='100' width='160' height='14' fill='{CORT}'/><path d='M{ox+60},114 L{ox+130},114 L{ox+115},240 L{ox+75},240 Z' fill='{BONE}' stroke='{INK}'/>"
    for x, y, t in ((ox+30, 135, "1"), (ox+150, 135, "2"), (ox+95, 262, "3")):
        b += num(x, y, t, "#c2410c")
    b += text(ox + 90, 305, "1 antérieure · 2 postérieure · 3 pointe", 11, MUTED)
    return svg(W, H, b)


# ------------------------------------------------------------------ 5. algorithmes (arbre vertical lisible sur mobile)
def flow(title, tree, W=640):
    IND, ROWG, LH = 26, 10, 16
    rows = []
    def walk(node, d, parent):
        label, kids = node if isinstance(node, tuple) else (node, [])
        idx = len(rows)
        rows.append({"d": d, "label": label, "parent": parent, "leaf": not kids})
        for k in kids:
            walk(k, d + 1, idx)
    walk(tree, 0, None)
    y = 48
    for r in rows:
        x = 12 + r["d"] * IND
        w = W - x - 12
        lines = wrap(r["label"], int((w - 20) / 7.0))
        h = 14 + len(lines) * LH
        r.update(x=x, y=y, w=w, h=h, lines=lines)
        y += h + ROWG
    PAL = [ACC, "#7c3aed", ACC2, "#c2410c", "#be185d"]
    b = text(12, 28, title, 16, INK, "start", "700")
    for r in rows:
        if r["parent"] is not None:
            p = rows[r["parent"]]
            px = p["x"] + 12
            b += f"<path d='M{px},{p['y']+p['h']} L{px},{r['y']+r['h']/2} L{r['x']},{r['y']+r['h']/2}' fill='none' stroke='#c7c3dc' stroke-width='1.6'/>"
    for r in rows:
        c = PAL[min(r["d"], len(PAL) - 1)]
        if r["leaf"]:
            b += f"<rect x='{r['x']}' y='{r['y']}' width='{r['w']}' height='{r['h']}' rx='9' fill='#fff' stroke='{c}' stroke-width='1.5'/>"
            fc, fw = INK, "400"
        else:
            b += f"<rect x='{r['x']}' y='{r['y']}' width='{r['w']}' height='{r['h']}' rx='9' fill='{c}'/>"
            fc, fw = "#fff", "700"
        for i, ln in enumerate(r["lines"]):
            b += text(r["x"] + 10, r["y"] + 20 + i * LH, ln, 13, fc, "start", fw)
    return svg(W, y + 6, b)


T1 = ("Masse des tissus mous en hypersignal T1 : disparaît après suppression du signal de la graisse ?", [
    ("OUI — contient de la graisse", [
        "Sans calcification : lipomes et liposarcomes, malformations vasculaires, hémangiomes…",
        "Avec calcifications : malformations vasculaires (phlébolithes)",
        "Os mature (moelle graisseuse) : myosite ossifiante mature, ostéochondromatose",
    ]),
    ("NON — pas de graisse", [
        "Méthémoglobine : hématome, tumeurs hémorragiques",
        "Vaisseaux à flux lent : malformations veineuses, hémangiome",
        "Matériel protéique : kystes mucoïdes, abcès",
        "Mélanine : mélanome, sarcome à cellules claires",
    ]),
])
T2 = ("Lésion d'allure kystique en T2 → injection systématique de gadolinium", [
    "Prise de contraste périphérique fine et régulière → kystes, chondromes, lipomes chondroïdes et myxoïdes",
    "Paroi épaisse rehaussée, centre non rehaussé → abcès, tumeurs nécrosées",
    "Rehaussement diffus (parfois retardé : séquences tardives !) → tumeurs myxoïdes",
])
PRESACRE_ADULTE = ("Masse pré-sacrée de l'adulte", [
    ("Masse sacrée", ["Abcès tuberculeux, métastases, hémopathies, tumeurs osseuses primitives (voir tableau)"]),
    ("Extension foraminale", ["Tumeurs neurogènes (schwannome, neurofibrome, ganglioneurome, épendymome myxopapillaire, paragangliome, TMGNP), méningocèle"]),
    ("Masse rectale", ["Abcès pré-sacré, GIST, adénocarcinome mucineux, lymphome, léiomyome / léiomyosarcome, mélanome rectal"]),
    ("Masse pré-sacrée isolée", [
        ("Kystique pure", ["Uniloculaire : kyste épidermoïde, kyste dermoïde, duplication rectale",
                           "Multiloculaire : tailgut cyst, kyste dermoïde", "Graisse : tératome"]),
        ("Mixte (portion solide)", ["Tératocarcinome, dégénérescence d'un tailgut cyst (limites irrégulières)"]),
        ("Tissulaire", ["Contenant de la graisse : hématopoïèse extra-médullaire, myélolipome, lipome / liposarcome",
                        "Hypervasculaire : tumeur fibreuse solitaire",
                        "Autres : hématome, tumeur desmoïde, maladie de Castleman, sarcomes"]),
    ]),
])
PRESACRE_ENFANT = ("Masse pré-sacrée de l'enfant", [
    ("Ostéolyse sacrée", ["Sarcome d'Ewing (> 5 ans), lymphome, métastase"]),
    ("Extension intra-canalaire", [
        "Débute dans le canal : TMGNP (hétérogène)",
        "En sablier : tumeurs neuroblastiques — hétérogène < 2 ans : neuroblastome ; homogène > 10 ans : ganglioneurome ; ganglioneuroblastome entre les deux",
    ]),
    ("Isolée — selon la composition", [
        "Calcifications / graisse : tumeurs germinales, tératome sacro-coccygien (< 3 mois ; plus c'est tissulaire, plus c'est malin)",
        "Kystique : lymphangiome kystique",
    ]),
    ("Masse uro-génitale à extension pré-sacrée", ["Rhabdomyosarcome (hétérogène, infiltrant, adénopathies)"]),
])

FILES = {
    "periostees.svg": periostees(),
    "surface.svg": surface(),
    "gruen-charnley.svg": gruen(),
    "ewald.svg": ewald(),
    "algo-t1.svg": flow("Algorithme : masse en hypersignal T1", T1),
    "algo-t2.svg": flow("Algorithme : masse en hypersignal T2 liquidien", T2),
    "presacre-adulte.svg": flow("Algorithme : masse pré-sacrée de l'adulte", PRESACRE_ADULTE),
    "presacre-enfant.svg": flow("Algorithme : masse pré-sacrée de l'enfant", PRESACRE_ENFANT),
}
for name, content in FILES.items():
    (OUT / name).write_text(content)
print("schémas :", ", ".join(FILES))
