#!/usr/bin/env python3
"""Construit data/gammes.json + data/embedded_data.js à partir de l'extraction du
diaporama « Des gammes et des arpèges » (G. Attané, service du Pr Bousson).

Usage : python3 scripts/build_data.py
Source : data/source/slides_raw.json (généré par scripts/extract_pptx.py)
"""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = json.loads((ROOT / "data/source/slides_raw.json").read_text())
IMGS = {int(k): v for k, v in json.loads((ROOT / "data/source/slides_images.json").read_text()).items()}

# ---------------------------------------------------------------- arborescence
# groupe (accueil) → sous-choix (picto) → gammes (n° de diapo). Le 1er emplacement d'une gamme est son emplacement principal.
GROUPS = [
    ("os", "Lésion osseuse", [
        ("unique", "Lésion unique", [2, 136, 137, 143]),
        ("multi", "Lésions multiples", [52, 95, 37, 23, 139, 97, 93, 94, 84]),
        ("lodwick", "Contours (Lodwick)", [12, 13, 14, 15, 16, 17]),
        ("siege", "Siège dans l'os", [301, 302, 303]),
        ("contenu", "Aspect & contenu", [304, 144, 28, 30, 101, 32, 10]),
        ("perioste", "Corticale & périoste", [20, 21, 22, 24, 134, 138, 18, 53, 92, 98]),
        ("surface", "Surface de l'os", [147, 148, 149, 26]),
    ]),
    ("axial", "Rachis, crâne, côtes, doigts", [
        ("vertebre", "Vertèbre", [141, 36, 145, 41, 108, 140, 44]),
        ("disque", "Disque", [38, 34]),
        ("sacrum", "Sacrum & pré-sacré", [146, 178, 179]),
        ("crane", "Crâne", [305, 306, 307, 308, 309]),
        ("cotes", "Côtes", [39, 40]),
        ("doigts", "Doigts", [142, 91]),
    ]),
    ("tm", "Tissus mous", [
        ("frequentes", "Les plus fréquentes", [150, 174]),
        ("tmsiege", "Siège", [151, 152, 153, 154, 155, 156, 177]),
        ("paravert", "Paravertébral", [175, 176, 105]),
        ("signal", "Signal IRM & graisse", [165, 166, 126, 167, 48, 168, 158]),
        ("tmcontenu", "Calcifications, vaisseaux, sang", [49, 87, 162, 169, 163, 164, 170, 171]),
        ("nerf", "Nerfs", [157, 56]),
    ]),
    ("art", "Articulations", [
        ("inflam", "Érosions & dactylite", [159, 55]),
        ("synoviale", "Synoviale & hémarthrose", [90, 74]),
        ("oan", "Arthropathie neurogène", [50, 51]),
    ]),
    ("sys", "Croissance & morphologie", [
        ("croissance", "Croissance & morphologie", [107, 109, 110, 120]),
    ]),
    ("ped", "Enfant", [
        ("enfant", "Enfant", [45, 46, 100, 25, 44, 179]),
    ]),
    # Référentiel : tout ce qui décrit UNE entité (fiches maladies), classifications, anatomie
    ("ref", "Référentiel", [
        ("fos", "Fiches os, rachis & tissus mous", [54, 160, 81, 82, 89, 125, 172, 57, 58]),
        ("fart", "Fiches articulaires", [61, 62, 63, 121, 66, 68, 72, 73, 88, 75, 67]),
        ("fsys", "Fiches maladies générales", [59, 83, 78, 80, 86, 77, 79, 103, 104, 106, 85]),
        ("fped", "Fiches enfant", [70, 99, 117]),
        ("classifs", "Classifications & tableaux", [133, 7, 8, 9, 135, 64, 114, 118, 124, 131]),
    ]),
]
# mots-clés courts : description d'une maladie = ses caractéristiques (chaque mot-clé → la gamme)
SUB_KW = {"unique": "Lésion unique", "multi": "Multiple", "lodwick": "Lodwick", "siege": "Siège", "contenu": "Aspect",
          "perioste": "Corticale / périoste", "surface": "Surface", "vertebre": "Vertèbre", "disque": "Disque", "sacrum": "Sacrum",
          "crane": "Crâne", "cotes": "Côtes", "doigts": "Doigts", "frequentes": "Tissus mous", "tmsiege": "Siège (tissus mous)",
          "paravert": "Paravertébral", "signal": "Signal IRM", "tmcontenu": "Contenu", "nerf": "Nerf", "inflam": "Articulation",
          "synoviale": "Synoviale", "oan": "OAN", "croissance": "Croissance", "enfant": "Enfant"}
KW = {136: "ostéolytique", 137: "condensante", 143: "ostéosarcome secondaire",
      52: "ostéolyses plurifocales", 95: "condensation diffuse ou multifocale", 37: "condensations axiales multiples",
      23: "appositions périostées diffuses", 139: "atteinte os + tissus mous", 97: "condensation constitutionnelle",
      93: "superscan", 94: "super BMU", 84: "PAL élevées",
      12: "IA1", 13: "IA2", 14: "IB", 15: "IC", 16: "II", 17: "III",
      301: "épiphysaire", 302: "métaphysaire", 303: "diaphysaire",
      304: "expansive / anévrysmale", 144: "« in and out »", 28: "trabéculations", 30: "niveaux liquide-liquide",
      101: "séquestre", 32: "inflammatoire", 10: "sinueuse",
      20: "périostose unilamellaire", 21: "périostose compacte", 22: "périostose plurilamellaire ou spiculée",
      24: "hyperostose + encoches endostées", 134: "hyperostose, endoste normal", 138: "coque périostée",
      18: "ostéolyse corticale", 53: "stries intracorticales", 92: "métastase corticale", 98: "scalloping endosté",
      147: "lésion de surface", 148: "minéralisation de surface", 149: "érosion de surface", 26: "encoche + coque",
      141: "ostéolyse vertébrale unique", 36: "vertèbre ivoire", 145: "vertèbre évidée", 41: "vertèbre en H",
      108: "vertèbre en rostre", 140: "condensation axiale localisée", 44: "vertebra plana",
      38: "pseudo-spondylodiscite", 34: "extension transdiscale",
      146: "ostéolyse sacrée", 178: "masse pré-sacrée (adulte)", 179: "masse pré-sacrée (enfant)",
      305: "limites nettes scléreuses", 306: "sclérose dégressive", 307: "emporte-pièce", 308: "limites floues", 309: "contenu", 39: "côte", 40: "côte soufflante",
      142: "lacune des doigts", 91: "acrométastase",
      150: "fréquente", 174: "multiple / syndromique",
      151: "superficielle", 152: "aponévrose superficielle", 153: "juxta-articulaire", 154: "intermusculaire",
      155: "intramusculaire", 156: "tendon / gaine", 177: "sarcome hypodermique",
      175: "paravertébrale thoracique", 176: "paravertébrale lombaire", 105: "hématopoïèse extramédullaire",
      165: "hypersignal T1 (algorithme)", 166: "hypersignal T1", 126: "graisse", 167: "hypersignal T2 liquidien",
      48: "matrice myxoïde", 168: "hyposignal T1 et T2", 158: "triple signal T2",
      49: "calcifiée", 87: "calcinose pseudo-tumorale", 162: "vaisseaux serpigineux", 169: "« flow voids »",
      163: "niveaux séro-hématiques", 164: "structure stratifiée", 170: "« fascial tail »", 171: "aspect d'hématome",
      157: "pédicule vasculo-nerveux", 56: "nerfs élargis",
      159: "érosions marginales", 55: "dactylite", 90: "synoviale hypo-T2", 74: "hémarthrose",
      50: "OAN", 51: "siège des OAN",
      107: "Madelung", 109: "ectasie durale", 110: "gigantisme focal", 120: "longueur des membres",
      45: "pseudo-ostéomyélite", 46: "pseudo-arthrite de hanche", 100: "bandes claires métaphysaires", 25: "appositions périostées"}

# fiche maladie → entité(s) décrite(s) (affichée en tête de la page diagnostic)
FICHE_ENT = {54: ["enchondrome"], 172: ["mo"], 81: ["fracture"], 82: ["fracture"], 89: ["tmgnp"], 125: ["lipome", "liposarcome"],
             57: ["nf"], 58: ["nf"], 61: ["goutte"], 62: ["cpp"], 63: ["cpp"], 121: ["cpp"], 66: ["pr"], 73: ["hemophilie"],
             88: ["amylose"], 75: ["oan"], 59: ["paget"], 83: ["paget"], 78: ["hpt"], 80: ["osteomalacie"],
             77: ["acromegalie"], 103: ["drepano"], 104: ["drepano"], 85: ["rx"], 70: ["sapho"], 99: ["leucemie"]}
C = {}
PATHS = {}
for gid, _, subs in GROUPS:
    for sid, _, nums in subs:
        for n in nums:
            PATHS.setdefault(n, []).append([gid, sid])
            C.setdefault(n, [])
            if gid not in C[n]:
                C[n].append(gid)

HORS_MSK = set()

TITLES = {
    2: ("Gamme générale d'une lésion osseuse", "Infection, pseudo-infection, « scinti + », -oses, trauma, hémopathie, métastase, tumeur"),
    9: ("Classification de Lodwick", "Ostéolyses : géographique (IA/IB/IC), mitée (II), perméative (III)"),
    10: ("Lésions sinueuses", None),
    11: ("Images allongées diaphysaires des os longs", None),
    12: ("Lodwick IA1 — lacune géographique à liseré net", "Liseré net, bien limité sur les deux versants"),
    13: ("Lodwick IA2 — condensation périphérique dégressive", "Condensation réactionnelle périphérique à limites progressivement dégressives vers l'os normal"),
    14: ("Lodwick IB — ostéolyse géographique sans sclérose", "Lacune « à l'emporte-pièce »"),
    15: ("Lodwick IC — ostéolyse géographique mal limitée", "Contours mal définis"),
    16: ("Lodwick II — ostéolyse mitée", "Confluence de multiples lésions lacunaires"),
    17: ("Lodwick III — ostéolyse perméative", "Multiples lésions infra-millimétriques rompant la corticale"),
    20: ("Réaction périostée unilamellaire continue", "Image corticale avec réaction périostée unilamellaire continue"),
    22: ("Réaction périostée plurilamellaire ou spiculée", "Corticale continue et réaction périostée continue plurilamellaire ou spiculée"),
    95: ("Ostéocondensation diffuse ou multifocale", "Causes classiques et rares, condensations axiales acquises / constitutionnelles"),
    97: ("Condensations diffuses constitutionnelles", "5 catégories de condensations osseuses diffuses homogènes constitutionnelles"),
    135: ("Classification des réactions périostées", "Schémas 1 à 11 (diaphyse d'un os long)"),
    138: ("Tumeurs/pseudotumeurs avec coque périostée", "« Soufflure corticale »"),
    148: ("Images minéralisées à la surface d'un os", "Hors lésions pluri-osseuses, centrales étendues à la surface et articulaires"),
    149: ("Érosions à la surface d'un os", "Hors lésions pluri-osseuses, centrales étendues à la surface et érosions articulaires"),
    161: ("Images d'aspect « anévrysmal »", "Images soufflantes paraissant cloisonnées"),
    144: ("Aspect « in and out »", "Envahissement médullaire et des tissus mous de part et d'autre d'une corticale relativement conservée"),
    145: ("Vertèbre évidée — aspect en « mini-brain »", "Vertèbre évidée avec seul respect des corticales"),
    165: ("Algorithme devant une masse en hypersignal T1", "Tissus mous — d'après J.-D. Laredo"),
    167: ("Masse en hypersignal T2 liquidien ou pseudoliquidien", "Lésion d'allure kystique en T2 → injecter"),
    170: ("« Fascial tail sign »", "Masses des tissus mous donnant des prolongements le long du fascia profond"),
    169: ("Masses avec « flow voids »", "Masses des tissus mous avec des images de flux rapides"),
    162: ("Masses avec vaisseaux serpigineux", "Vaisseaux qui pénètrent/sortent de la lésion"),
    163: ("Masses des tissus mous avec niveaux séro-hématiques", None),
    177: ("Sarcomes hypodermiques : signal & aspect IRM", "Gamme des sarcomes hypodermiques les plus fréquents"),
    174: ("Tumeurs des tissus mous multiples", None),
    173: ("Lésions les plus fréquentes de la voûte crânienne", None),
    69: ("Diastasis tibio-fibulaire distal", None),
    93: ("« Superscan » (scintigraphie)", None),
    94: ("« Super BMU » (TEP-FDG)", "Hyperfixation médullaire diffuse"),
    46: ("Arthrite septique de hanche de l'enfant : différentiels", None),
    45: ("Ostéomyélite aiguë de l'enfant : différentiels", None),
    51: ("Siège des OAN selon l'étiologie", None),
    75: ("OAN diabétique vs ostéite", "Signes différentiels"),
    86: ("Anomalies observées dans les TMO-MRC", "Troubles minéraux et osseux de la maladie rénale chronique"),
    126: ("Masses des tissus mous contenant de la graisse", None),
    133: ("Topographie en hauteur des tumeurs des os longs", "Épiphyse / métaphyse / diaphyse — centre géométrique"),
    42: ("Ostéolyses selon la topographie dans l'os", "Épiphysaires, métaphysaires (centrées/excentrées), diaphysaires"),
    54: ("Signes atypiques d'un enchondrome", "Arguments pour une tumeur cartilagineuse atypique / chondrosarcome"),
    160: ("Kyste anévrysmal vs kyste essentiel", "Comparaison"),
    7: ("Classification OMS des tumeurs osseuses", None),
    8: ("Classification des tumeurs des tissus mous", None),
    89: ("Arguments en faveur d'une TNGP", "Tumeur des gaines nerveuses périphériques"),
}

# ---------------------------------------------------------------- nettoyage
FIX = [
    ("Hémopathie Myélome", "Myélome"), ("Tumeurs Intermédiaire", "Tumeurs intermédiaires"), ("Granulome Eosinophile", "Granulome éosinophile"),
    ("Varices (canal tarsien par exemple) Sans rapport avec une structure anatomique précise", "Varices (canal tarsien par exemple)"),
    ("Syndrome Hyperparathyroïdie", "Hyperparathyroïdie"), ("Intox Fluor (Fluoroses, fréon, voriconazole..)", "Intoxication au fluor (fluorose, fréon, voriconazole)"),
    ("Intoxication par la Vitamine A et Rétinoïdes", "Intoxication par la vitamine A et les rétinoïdes"),
    ("Chondrosarsome", "Chondrosarcome"), ("Ostéosarcme", "Ostéosarcome"), ("Ostéosarocme", "Ostéosarcome"),
    ("Darrier", "Darier"), ("Dvsplasie", "Dysplasie"), ("Histiocyofìbrome", "Histiocytofibrome"),
    ("Hvpercholestérolémie", "Hypercholestérolémie"), ("Kvste", "Kyste"), ("Pager", "Paget"),
    ("Teuschlander", "Teutschlaender"), ("Teutschlander", "Teutschlaender"), ("abrès", "abcès"),
    ("acconpagner", "accompagner"), ("chondromvxoïde", "chondromyxoïde"), ("dédifférenclé", "dédifférencié"),
    ("enfante", "enfance"), ("fibromvxoïde", "fibromyxoïde"), ("fìbro", "fibro"), ("gouteux", "goutteux"),
    ("hvdatìque", "hydatique"), ("hvperparathvroïdie", "hyperparathyroïdie"), ("indifférenclé", "indifférencié"),
    ("lameflaire", "lamellaire"), ("Tumeur hyalinisante ngiectatique", "Tumeur hyalinisante angiectasique"),
    ("ostoïde", "ostéoïde"), ("ostréophiles", "ostéophiles"), ("ostéolvtique", "ostéolytique"),
    ("solitaure", "solitaire"), ("os tong", "os long"), ("(sous-utanée", "(sous-cutanée"), ("graisse are)", "graisse rare)"),
    ("Spondylite infectieuse uberculose", "Spondylite infectieuse (tuberculose)"), ("vasct1laire", "vasculaire"),
    ("épithéliolde", "épithélioïde"), ("Manforlation", "Malformation"), ("Sacrome", "Sarcome"),
    ("Histiocytofibrone", "Histiocytofibrome"), ("Condernsation", "Condensation"), ("soufflure orticale", "soufflure corticale"),
    ("volumineus", "volumineuse"), ("volumineusee", "volumineuse"), ("épithlioïde", "épithélioïde"),
    ("siègejuxta", "siège juxta"), ("juxta-dia hysaire", "juxta-diaphysaire"), ("Ostéosarcme", "Ostéosarcome"),
    ("télangiestasique", "télangiectasique"), ("ostéomyéliteaiguë", "ostéomyélite aiguë"), ("Myélome multipleet", "Myélome multiple et"),
    ("Dysplasie osté-ofibreuse", "Dysplasie ostéofibreuse"), ("Hémodialisé", "Hémodialysé"), ("microcristaline", "microcristalline"),
    ("aîgue", "aiguë"), ("aigue", "aiguë"), ("Hyperostose localisées", "Hyperostoses localisées"), ("Ostéite tuberculeuse  ", "Ostéite tuberculeuse "), ("Ilot", "Îlot"), ("CTB", "cervico-thoraco-brachiale"),
    ("avant-piednet", "avant-pied et"), ("Fazeka", "Fazekas"), ("Fazekass", "Fazekas"), ("Aux · dépens", "Aux dépens"),
    ("Pseudo- tumeurs", "Pseudo-tumeurs"), ("Hématomes sous- périostés", "Hématomes sous-périostés"),
    ("Prolifération ostéochondromateuse paraostéale bizarre (BPOP,l ésion de Nora)", "Prolifération ostéochondromateuse paraostéale bizarre (BPOP, lésion de Nora)"),
    ("Chondrosarcome périoste", "Chondrosarcome périosté"), ("Tumeur à cellule géantes", "Tumeur à cellules géantes"),
    ("Abcès tuberculeux", "Abcès tuberculeux"), ("ostéosarcme", "ostéosarcome"), ("Kyste osseux essential", "Kyste osseux essentiel"),
    ("essential", "essentiel"), ("radiotherapie", "radiothérapie"), ("Rhabdomyosarcomes", "Rhabdomyosarcomes"),
    ("léïomyosarcomes", "Léiomyosarcomes"), ("Léïomyo", "Léiomyo"), ("léïomyo", "léiomyo"), ("Léïomyome", "Léiomyome"),
    ("parathydoïdienne", "parathyroïdienne"), ("thyroïde. du", "thyroïde, du"), ("deshydrogénase", "déshydrogénase"),
    ("Hémangiome épithéliolde", "Hémangiome épithélioïde"), ("Ostéochondroses", "Ostéochondroses"), ("Osteochondroses", "Ostéochondroses"),
    ("chondormatose", "chondromatose"), ("Klippel-Trenaunnay", "Klippel-Trenaunay"), ("intox Fluor", "Intoxication au fluor"),
    ("Vériconazole", "voriconazole"), ("variconazole", "voriconazole"), ("dent de sagesse", "dent de sagesse"),
    ("Sclérose tubéreuse de Bourneville", "Sclérose tubéreuse de Bourneville"), ("hémorragiques Endométriose", "hémorragiques, endométriose"),
    ("Hématopoïèse extra-médullaire Myélolipome", "Hématopoïèse extra-médullaire, myélolipome"),
    ("Pannus rhumatoïde ancien Fibromatoses", "Pannus rhumatoïde ancien, fibromatoses"),
    ("Dépôts calciques, calcinoses Synovialosarcome", "Dépôts calciques, calcinoses, synovialosarcome"),
    ("Lésion Lipome et ses variantes Hibernome", "Lipome et ses variantes, hibernome"),
    ("Lupus ES", "lupus érythémateux systémique"), ("hémi-azygos", "hémi-azygos"), ("ostéoarthropathies", "ostéo-arthropathies"),
    ("Echelle", "Échelle"), ("Hémangioendothéliome  épithélioïde", "Hémangioendothéliome épithélioïde"),
    ("Corticale continue d'épaisseur", "Corticale continue d'épaisseur"), ("uni­ lamellaire", "unilamellaire"),
    ("­", ""), ("Gamme des)", ""), ("  ", " "),
]

def clean(t: str) -> str:
    for a, b in FIX:
        t = t.replace(a, b)
    t = re.sub(r"\s+", " ", t).strip()
    t = t.replace("'' ", "« ").replace("‘’", " »").replace("''", "« ")
    return t

HEADER_WORDS = {
    "sans rapport avec une structure anatomique precise", "tumeurs intermediaires",
    "pseudotumeurs", "pseudo-tumeurs", "pseudo tumeurs", "tumeurs primitives", "tumeurs benignes", "tumeurs malignes",
    "tumeurs malignes primitives", "frequentes", "rares", "causes classiques", "causes rares", "metastases osseuses",
    "hemopathies", "le plus souvent", "plus rarement", "metastases et hemopathies",
    "tumeurs primitives benignes", "tumeurs primitives malignes", "tumeurs intermediaire", "tumeurs benignes inflammatoires",
    "infectieux", "ne pas oublier", "fréquent", "frequent", "rare", "etiologies classiques", "etiologies rares", "pseudo-infection",
    "acquises", "constitutionnelles", "non tumorales", "tumorales", "lesions pseudo-tumorales", "pseudotumeurs",
    "enfant et adulte de moins de 30 ans", "adulte de plus de 30 ans", "tumeurs", "pseudo-tumeurs",
    "fréquemment hémorragiques", "osteocondensation multifocale", "osteocondensation diffuse (ou predominance axiale)", "parfois hémorragiques", "aux depens des nerfs", "aux depens des arteres", "aux depens des veines",
    "lesions provenant des tissus mous", "tumeurs osseuses primitives developpees a la surface des os",
    "metastases developpees a la surface des os", "lesions pseudo-tumorales de la surface des os",
}

def norm(t: str) -> str:
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = t.replace("œ", "oe").replace("’", "'")
    return re.sub(r"\s+", " ", t).strip()

NOTE_RE = re.compile(r"^(\*{1,2}|[A-Z]|\+|±|-) ?: ")

def build_items(raw_items, title_text):
    out = []
    for lvl, bold, txt in raw_items:
        txt = clean(txt)
        if not txt or norm(txt) == norm(title_text):
            continue
        # ligne coupée dans le PPT (« ostéocondensante », « (tuberculose…) ») → fusion
        if out and out[-1]["l"] == lvl and (txt[0].islower() or txt.startswith("(")) and not txt.startswith("("+"ou"):
            out[-1]["t"] += " " + txt
            continue
        kind = "li"
        n = norm(txt.rstrip(" :"))
        if NOTE_RE.match(txt) or txt.startswith("*"):
            kind = "note"
        elif txt.endswith(":") or n in HEADER_WORDS:
            kind = "h"
        out.append({"l": lvl, "t": txt.rstrip(" :") if kind == "h" else txt, "k": kind, "b": bold})
    # doublons dans un même groupe (même en-tête) → supprimés
    seen, head, dedup = set(), "", []
    for it in out:
        if it["k"] == "h" or it["l"] == 0 and it["k"] != "li":
            head = norm(it["t"])
        key = (head, it["l"], norm(it["t"]))
        if key in seen:
            continue
        seen.add(key); dedup.append(it)
    out = dedup
    # un item de niveau n suivi d'un item de niveau > n devient en-tête de groupe
    for i, it in enumerate(out[:-1]):
        if it["k"] == "li" and out[i + 1]["l"] > it["l"]:
            it["k"] = "h"
    # item en gras suivi d'items non gras au même niveau → titre de rubrique
    for i, it in enumerate(out[:-1]):
        nxt = out[i + 1]
        if (it["k"] == "li" and it["b"] and it["l"] == 0 and len(it["t"]) < 40 and not entities_of(it["t"])
                and (nxt["l"] == 0 and not nxt["b"] or nxt["k"] == "h")):
            it["k"] = "h"
    return out

# ---------------------------------------------------------------- transcriptions manuelles (diapos-images)
EXTRA = {
    9: [
        ("h", 0, "Stade I — Ostéolyse géographique"),
        ("li", 1, "Ostéolyse bien limitée, permettant de l'isoler de l'os sain adjacent"),
        ("li", 1, "IA : bien limitée AVEC liseré d'ostéosclérose périphérique (IA1 : liseré net / IA2 : condensation dégressive)"),
        ("li", 1, "IB : bien limitée, SANS liseré d'ostéosclérose périphérique"),
        ("li", 1, "IC : mal limitée"),
        ("h", 0, "Stade II — Ostéolyse mitée"),
        ("li", 1, "Confluence de multiples lacunes osseuses millimétriques"),
        ("h", 0, "Stade III — Ostéolyse perméative"),
        ("li", 1, "Multiples lacunes infra-millimétriques donnant une impression de perte de densité osseuse et de flou cortical"),
        ("note", 0, "Agressivité croissante de IA à III : IA = lent / quiescent ; II-III = agressif (sarcomes, Ewing, lymphome, ostéomyélite, métastases)"),
    ],
    167: [
        ("h", 0, "Masses de signal myxoïde ne prenant pas le gadolinium (sauf paroi fine)"),
        ("li", 1, "Kyste mucoïde"), ("li", 1, "Sérome (post-traumatique ou après chirurgie)"), ("li", 1, "Kyste épidermoïde"),
        ("li", 1, "Chondrome des tissus mous"), ("li", 1, "Lipome chondroïde"), ("li", 1, "Lipome à cellules fusiformes (variante myxoïde)"),
        ("li", 1, "Chondromatose synoviale"), ("li", 1, "Abcès tuberculeux (paroi fine)"),
        ("h", 0, "Ne prenant pas le gadolinium au centre, mais paroi épaisse rehaussée"),
        ("li", 1, "Abcès à germes banals ou mycotiques"), ("li", 1, "Granulomes nécrotiques (bartonelloses, lymphomes…)"),
        ("li", 1, "Adénopathies nécrotiques (infections, métastases, lymphomes…)"), ("li", 1, "Tumeurs nécrotiques"),
        ("h", 0, "Prenant le gadolinium (parfois de façon retardée)"),
        ("li", 1, "Myosite ossifiante (plages cartilagineuses)"),
        ("li", 1, "Myxomes (intramusculaire, juxta-articulaire, myxome de la gaine des nerfs)"),
        ("li", 1, "Angiomyxome profond « agressif »"), ("li", 1, "Histiocytofibrome angiomatoïde"),
        ("li", 1, "Schwannome et neurofibrome"), ("li", 1, "Tumeurs malignes de la gaine des nerfs périphériques"),
        ("li", 1, "Chondrosarcome myxoïde extrasquelettique"), ("li", 1, "Synovialosarcome"), ("li", 1, "Liposarcome myxoïde"),
        ("li", 1, "Tumeur fibromyxoïde ossifiante"), ("li", 1, "Sarcome fibromyxoïde de bas grade (tumeur d'Evans)"),
        ("li", 1, "Myxofibrosarcome"), ("li", 1, "Sarcome fibroblastique myxo-inflammatoire acral"),
        ("li", 1, "Myoépithéliome"), ("li", 1, "Léiomyosarcome myxoïde"),
    ],
}


EXTRA.update({
    67: [
        ("li", 0, "Boutonnière : flexion de l'IPP, hyperextension de l'IPD"),
        ("li", 0, "Col de cygne : hyperextension de l'IPP, flexion de l'IPD"),
        ("li", 0, "Doigt en maillet : flexion de l'IPD (rupture/avulsion de l'appareil extenseur)"),
    ],
    113: [
        ("li", 0, "Projection de la fosse acétabulaire en dedans de la ligne ilio-ischiatique"),
        ("h", 0, "Coxa profunda (caractère pathogène incertain)"),
        ("li", 1, "Homme : > 1 mm"), ("li", 1, "Femme : > 2 mm"),
        ("h", 0, "Protrusion acétabulaire"),
        ("li", 1, "Homme : > 3 mm"), ("li", 1, "Femme : > 6 mm"),
    ],
    118: [
        ("note", 0, "Orientation par rapport au grand axe du ménisque"),
        ("h", 0, "Rupture radiaire"),
        ("li", 1, "Pure → oblique (« bec de perroquet »)"),
        ("h", 0, "Rupture longitudinale"),
        ("li", 1, "Verticale → anse de seau (fragment déplacé)"),
        ("li", 1, "Horizontale → languette (flap) déplacée"),
    ],
    119: [
        ("note", 0, "De latéral en médial (« I Love Spine »)"),
        ("li", 0, "Ilio-costal"), ("li", 0, "Longissimus"), ("li", 0, "Épineux"),
        ("li", 0, "Plan profond : multifides (transversaires épineux)"),
    ],
    121: [
        ("h", 0, "Caractéristiques communes aux atteintes axiales et périphériques"),
        ("li", 1, "Liseré de chondrocalcinose (inconstant)"), ("li", 1, "Pincement localisé (sauf hanche, genou)"),
        ("li", 1, "Destructeur"), ("li", 1, "Engrènement, encastrement, aspect crénelé"), ("li", 1, "« Retoucheur photo »"),
        ("li", 1, "Géodes"), ("li", 1, "Ostéochondromatose secondaire"), ("li", 1, "Ostéophytose souvent absente"),
    ],
})
EXTRA_TABLES = {
    68: [["", "Arthrose", "Arthrite septique", "Arthrite rhumatismale", "Ostéose iliaque condensante", "Ostéodystrophie rénale", "Hyperostose (Forestier)", "Chondrocalcinose"],
         ["Sexe", "F > M", "F = M", "M > F", "F > M", "F = M", "F = M", "F > M"],
         ["Clinique", "Douleur inconstante, mécanique", "Douleur intense, inflammatoire", "Douleur inflammatoire", "Douleur inconstante, mécanique", "Asymptomatique", "Asymptomatique", "Douleur inconstante, crise aiguë microcristalline possible"],
         ["Topographie", "Bilatérale", "Unilatérale", "Bilatérale, symétrique", "Bilatérale, symétrique", "Bilatérale, symétrique", "Bilatérale", "Bilatérale, symétrique"],
         ["Interligne", "Normal ou pincé", "Élargissement local", "Pseudo-élargissement puis ankylose", "Normal", "Pseudo-élargissement", "Ankylose intra-articulaire possible", "Calcifications linéaires cartilagineuses"],
         ["Érosions", "Rares, localisées", "Ostéolyse sous-chondrale", "Diffuses, « en timbre-poste »", "Absentes", "Résorption sous-chondrale", "Absentes", "Possibles"],
         ["Condensation sous-chondrale", "Faible épaisseur, dense, limites nettes", "Absente ou large, peu dense, floue, progressive", "Large, peu dense, floue, progressive", "Très épaisse, très dense, limites nettes", "Possible", "Rare et limitée", "Faible épaisseur, dense, limites nettes"],
         ["Constructions", "Ostéophytes", "Absentes", "Parfois calcifications capsulaires", "Absentes", "Absentes", "Volumineux ponts ostéophytiques", "Ostéophytes"]],
    69: [["Mesure (cheville face / mortaise)", "Valeur normale"],
         ["Espace clair tibio-fibulaire (1 cm au-dessus du plafond tibial)", "< 5 mm"],
         ["Chevauchement tibio-fibulaire", "> 6 mm de face, > 1 mm en mortaise"],
         ["Espace clair talo-crural médial", "< 4 mm (≤ interligne talo-crural)"]],
    114: [["Grade", "Arthroscopie", "Arthro-TDM / arthro-IRM"],
          ["0", "Normal", "Surface lisse, épaisseur normale"],
          ["1", "Fibrillation / ramollissement sans perte de substance", "Surface lisse, épaisseur normale"],
          ["2", "Perte de substance < 50 % de l'épaisseur", "Pénétration du contraste < 50 %"],
          ["3", "Perte de substance > 50 % sans atteindre l'os", "Pénétration du contraste > 50 %"],
          ["4", "Perte de substance jusqu'à l'os", "Contraste au contact de l'os sous-chondral"]],
    117: [["Localisation", "Ostéochondrose"],
          ["Capitulum", "Panner / ostéochondrite disséquante"], ["Épicondyle médial", "Adams"],
          ["Épiphyse radiale distale", "Madelung"], ["Lunatum", "Kienböck"], ["Plateaux vertébraux", "Scheuermann"],
          ["Épiphyse fémorale supérieure", "Legg-Perthes-Calvé"], ["Synchondrose ischio-pubienne", "Van Neck-Odelberg"],
          ["Tubérosité ischiatique", "Mac Master"], ["Condyles fémoraux", "Ostéochondrite disséquante"],
          ["Pointe de la patella", "Sinding-Larsen-Johansson"], ["Physe tibiale proximale médiale", "Blount"],
          ["Tubérosité tibiale antérieure", "Osgood-Schlatter"], ["Dôme du talus", "Ostéochondrite disséquante"],
          ["Calcanéus", "Sever"], ["Naviculaire", "Köhler-Mouchet"], ["Base du 5e métatarsien", "Iselin"],
          ["Têtes des métatarsiens médiaux", "Freiberg"], ["Sésamoïdes", "Renander"]],
    124: [["Grade", "Lésion de l'élément conjonctif (C)"],
          ["0", "Pas d'anomalie en imagerie"],
          ["1C", "Épaississement flou d'un élément conjonctif, sans rupture"],
          ["2C", "Rupture partielle d'un élément conjonctif majeur sans perte de tension, ou rupture complète d'un élément mineur"],
          ["3C", "Rupture complète d'un élément conjonctif majeur avec perte de tension"],
          ["4", "Rupture myo-conjonctive complète avec rétraction"]],
    178: [["Masse osseuse sacrée", "Points clés en imagerie"],
          ["Abcès tuberculeux", "Atteinte vertébrale ou sacro-iliaque + abcès paravertébral"],
          ["Myélome", "Ostéolyse soufflante avec destruction corticale"],
          ["Chordome", "Ostéolyse médiane/paramédiane S2-S5 et coccyx ; calcifications 50-60 % ; hypersignal T2 (myxoïde)"],
          ["Tumeur à cellules géantes", "Ostéolyse excentrée soufflante, agressive ; niveaux si KOA secondaire"],
          ["Plasmocytome", "Ostéolyse unique identique au myélome"],
          ["Chondrosarcome", "Ostéolyse agressive lobulée, matrice chondroïde (anneaux et arcs)"],
          ["Sarcome d'Ewing / PNET", "Ostéolyse agressive avec large masse des tissus mous"],
          ["Kyste osseux anévrysmal", "Niveaux liquide-liquide occupant la majeure partie de la masse"],
          ["Lymphome osseux", "Ostéolyse mitée ou corticale respectée, masse mal limitée, traverse la sacro-iliaque ou le disque L5-S1"],
          ["Ostéosarcome", "Condensation lésionnelle dense"]],
}

# ---------------------------------------------------------------- entités diagnostiques
ENT = [
    ("tcg", "Tumeur à cellules géantes (os)", r"(tumeurs? a cellules geantes(?! des gaines| tenosynoviale| des tissus)|\btcg\b)"),
    ("lcgpo", "Lésion à cellules géantes des petits os", r"lesions? a cellules geantes des petits os"),
    ("koa", "Kyste osseux anévrysmal", r"(kyste (osseux )?anevr[iy]sm(al|e)(?! des tissus)|\bkoa\b)"),
    ("koe", "Kyste osseux essentiel / solitaire", r"kyste (osseux )?(essentiel|solitaire)"),
    ("chondroblastome", "Chondroblastome", r"chondroblastome"),
    ("enchondrome", "Enchondrome / chondrome", r"(enchondrome|chondrome (sous-?|peri)|chondrome perioste|enchondromatose|maladie d'ollier)"),
    ("osteochondrome", "Ostéochondrome / exostose", r"(osteochondrome|exostose)"),
    ("fcm", "Fibrome chondromyxoïde", r"fibrome chondromyxoide"),
    ("oo", "Ostéome ostéoïde", r"(osteome osteoide|\boo\b)"),
    ("ob", "Ostéoblastome", r"(osteoblastome|\bob\b)"),
    ("fno", "Fibrome non ossifiant / cortical defect", r"(fibromes? non ossifiants?|cortical defect|defect cortical|jaffe)"),
    ("df", "Dysplasie fibreuse", r"(dysplasie fibreuse|\bdfo\b|mazabraud)"),
    ("dof", "Dysplasie ostéofibreuse", r"dysplasie osteo-?fibreuse"),
    ("adamantinome", "Adamantinome", r"adamantinome"),
    ("hl", "Histiocytose langerhansienne / granulome éosinophile", r"(histiocytose|granulome (a )?eosinophile)"),
    ("ewing", "Sarcome d'Ewing", r"ewing"),
    ("lymphome", "Lymphome / Hodgkin", r"(lymphome|hodgkin|parker)"),
    ("myelome", "Myélome / plasmocytome", r"(myelome|plasmocytome|poems)"),
    ("meta", "Métastases", r"metasta"),
    ("osteosarcome", "Ostéosarcome", r"(osteosarc|sarcome osteogene)"),
    ("chondrosarcome", "Chondrosarcome", r"(chondrosarcome|tumeur cartilagineuse atypique)"),
    ("chordome", "Chordome", r"chordome"),
    ("angiosarcome", "Angiosarcome", r"angiosarcome"),
    ("hemangiome", "Hémangiome / angiome", r"(hemangiome(?! epith)|\bangiome|hemangiomatose|lac veineux)"),
    ("hee", "Hémangioendothéliome épithélioïde", r"hemangioendotheliome"),
    ("infection", "Ostéomyélite / ostéite infectieuse", r"(osteomyelite|osteite infectieuse|osteite corticale|osteite\b(?! aseptique| fibreuse)|abces de brodie|brodie|spondylite infectieuse|spondylodiscite|germes? banals?)"),
    ("tb", "Tuberculose", r"(tubercul|spina vento)"),
    ("hydatide", "Kyste hydatique / hydatidose", r"(hydatique|hydatidose)"),
    ("sapho", "SAPHO / OCMR / ostéite aseptique", r"(sapho|ocmr|ocrm|osteite aseptique)"),
    ("infarctus", "Infarctus osseux", r"infarctus"),
    ("paget", "Maladie de Paget", r"paget"),
    ("hpt", "Hyperparathyroïdie / tumeur brune", r"(tumeurs? brunes?|hyperparathyro)"),
    ("sarcoidose", "Sarcoïdose", r"sarco[iï]d(ose|es)"),
    ("mastocytose", "Mastocytose", r"mastocytose"),
    ("stb", "Sclérose tubéreuse de Bourneville", r"(bourneville|\bstb\b)"),
    ("nf", "Neurofibromatose / phacomatoses", r"(neurofibromatose|\bnf1\b|\bnf2\b|phacomatose)"),
    ("lipome", "Lipome (os ou tissus mous)", r"lipomes?\b(?! atypique)"),
    ("liposarcome", "Liposarcome", r"(liposarcome|lipome atypique)"),
    ("synovialosarcome", "Synovialosarcome", r"(synovialosarcome|sarcome synovial)"),
    ("sip", "Sarcome indifférencié pléomorphe (ex-HFM)", r"(pleomorphe|histiocytome fibreux malin|\bhfm\b|\bmfh\b)"),
    ("myxofibrosarcome", "Myxofibrosarcome", r"myxofibrosarcome"),
    ("fasciite", "Fasciite nodulaire / proliférative", r"fasciite"),
    ("desmoide", "Tumeur desmoïde / fibromatose", r"(tumeurs? desmoides?|fibromatose)"),
    ("tbgp", "Schwannome / neurofibrome (TBGNP)", r"(schwannome|neurofibrome|\btngp\b|\btbgp\b|tumeurs? (benignes? )?des gaines (des )?nerf)"),
    ("tmgnp", "Tumeur maligne des gaines nerveuses (TMGNP)", r"(tumeurs? malignes? (de la gaine|des gaines)|\btmgn?p\b)"),
    ("myxome", "Myxome", r"myxome"),
    ("mv", "Malformation vasculaire", r"malformations? (vasculaire|veineuse|arterio|capillaire)"),
    ("mo", "Myosite ossifiante", r"myosite ossifiante"),
    ("hematome", "Hématome", r"hematome"),
    ("kystemucoide", "Kyste mucoïde / synovial / bursite", r"(kystes? mucoides?|kystes? synoviaux|kyste synovial|kyste juxta-articulaire|bursite)"),
    ("goutte", "Goutte / tophus", r"(goutte|tophus|goutteux)"),
    ("cpp", "Chondrocalcinose / CPP", r"(chondrocalcinose|pyrophosphate|\bcpp\b)"),
    ("apatite", "Dépôts d'apatite / calcinose", r"(apatit|calcinose)"),
    ("svn", "Synovite villonodulaire / TCG ténosynoviale", r"(villo-?nodulaire|\bsvn\b|tenosynoviale|cellules geantes des gaines)"),
    ("chondromatose", "Chondromatose synoviale", r"chondromatose"),
    ("amylose", "Amylose", r"amylo"),
    ("hemophilie", "Hémophilie / hémarthrose", r"(hemophil|hemarthrose)"),
    ("drepano", "Drépanocytose / hémoglobinopathies", r"(drepanocyt|thalassemi|hemoglobinopathie)"),
    ("leucemie", "Leucémie", r"leucemi"),
    ("neuroblastome", "Neuroblastome", r"neuroblastome"),
    ("osteopetrose", "Ostéopétrose / pycnodysostose", r"(osteopetrose|pycnodysostose)"),
    ("fluorose", "Fluorose", r"fluor"),
    ("osteomalacie", "Ostéomalacie / rachitisme", r"(osteomalacie|rachitisme|looser)"),
    ("odr", "Ostéodystrophie rénale / IRC", r"(osteodystrophie renale|insuffisance renale|hemodialys)"),
    ("myelofibrose", "Myélofibrose", r"myelofibrose"),
    ("fracture", "Fracture / fissure de contrainte", r"(fracture(?!\))|fissure)"),
    ("onc", "Ostéonécrose", r"(osteonecrose|radionecrose|necrose aseptique)"),
    ("scc", "Sarcome à cellules claires", r"sarcome a cellules claires"),
    ("alveolaire", "Sarcome alvéolaire des tissus mous", r"sarcome alveolaire"),
    ("epithelioide", "Sarcome épithélioïde", r"sarcome epithelioide"),
    ("tfs", "Tumeur fibreuse solitaire", r"tumeur fibreuse solitaire"),
    ("hibernome", "Hibernome", r"hibernome"),
    ("elastofibrome", "Élastofibrome", r"elastofibrome"),
    ("rms", "Rhabdomyosarcome", r"rhabdomyosarcome"),
    ("lms", "Léiomyosarcome", r"leiomyosarcome"),
    ("pr", "Polyarthrite rhumatoïde", r"(polyarthrite rhumatoide|\bpr\b|rhumatoide)"),
    ("spa", "Spondyloarthrite / psoriasis", r"(psoria|spondyl(o-?)?arthrite|\bspa\b)"),
    ("diabete", "Diabète", r"diabet"),
    ("acromegalie", "Acromégalie", r"acromegal"),
    ("oan", "Ostéo-arthropathie neurogène", r"(neuroarthropathie|oste.?o-arthropathie neurogene|\boan\b|charcot)"),
    ("rx", "Radiothérapie / radio-induit", r"(radio-?induit|irradi|radiotherap|radionecrose)"),
]
ENT_RE = [(k, lab, re.compile(p)) for k, lab, p in ENT]

def norm_map(t: str):
    """Texte normalisé caractère par caractère + index vers l'original (pour placer les liens)."""
    n, idx = [], []
    for i, ch in enumerate(t):
        c = unicodedata.normalize("NFD", ch.lower())
        c = "".join(x for x in c if unicodedata.category(x) != "Mn").replace("œ", "oe").replace("’", "'")
        if ch.isspace():
            c = " "
        for x in c:
            n.append(x); idx.append(i)
    return "".join(n), idx

def ent_spans(text: str):
    """Positions des diagnostics dans le texte original : [[début, fin, id]] sans chevauchement."""
    n, idx = norm_map(text)
    cand = []
    for k, _, rx in ENT_RE:
        m = rx.search(n)
        if m and m.end() > m.start():
            a, b = idx[m.start()], idx[m.end() - 1] + 1
            while a > 0 and text[a - 1].isalpha():
                a -= 1
            while b < len(text) and text[b].isalpha():
                b += 1
            cand.append((a, b, k))
    cand.sort(key=lambda c: (c[0], -(c[1] - c[0])))
    out, last = [], -1
    for a, b, k in cand:
        if a >= last:
            out.append([a, b, k]); last = b
    return out

def entities_of(text: str):
    n = norm(text)
    return [k for k, _, rx in ENT_RE if rx.search(n)]

# ---------------------------------------------------------------- construction
SKIP = {1, 3, 4, 5, 6, 19, 27, 33, 43, 60, 65, 71, 76, 181, 47, 102, 96, 112, 111,
        122, 123, 127, 128, 129, 130, 132,  # classifications hors ostéo-articulaire
        180}                                # territoires nerveux : photos de livre uniquement

# Images conservées (figures nettes, non redondantes avec le texte) ; les photos prises à la main sont retirées
KEEP_IMGS = {"s012_1.webp", "s014_1.webp", "s015_1.webp", "s016_1.webp", "s017_1.webp", "s067_2.webp",
             "s120_1.webp", "s125_1.webp", "s126_1.webp", "s126_2.webp", "s131_1.webp"}
# Schémas SVG redessinés (scripts/make_schemas.py)
import importlib.util
_spec = importlib.util.spec_from_file_location("make_schemas", ROOT / "scripts/make_schemas.py")
MS = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(MS)
def _flat(node):
    label, kids = node if isinstance(node, tuple) else (node, [])
    return [label] + [x for k in kids for x in _flat(k)]
SCHEMAS = {
    135: ("periostees.svg", []), 147: ("surface.svg", []), 115: ("gruen-charnley.svg", ["Gruen", "DeLee-Charnley", "descellement"]),
    116: ("ewald.svg", ["Ewald", "prothèse totale de genou"]),
    165: ("algo-t1.svg", _flat(MS.T1)), 167: ("algo-t2.svg", _flat(MS.T2)),
    178: ("presacre-adulte.svg", _flat(MS.PRESACRE_ADULTE)), 179: ("presacre-enfant.svg", _flat(MS.PRESACRE_ENFANT)),
}
NO_SLIDE_TEXT = {135}
# vignettes de schéma périosté (panneaux de periostees.svg)
PERIO_THUMB = {301: "siege-epi.svg", 302: "siege-meta.svg", 303: "siege-dia.svg", 20: "perio-4.svg", 21: "perio-2.svg", 22: "perio-5.svg", 24: "perio-3.svg", 134: "perio-2.svg", 138: "perio-7.svg",
               13: "lodwick-ia2.svg"}
# vignettes recadrées sur la lésion (Lodwick) ; pas de vignette pour les algorithmes (texte illisible en miniature)
THUMB = {n: f"assets/slides/s{n:03d}_t.webp" for n in (12, 14, 15, 16, 17)}
NO_THUMB = {165, 167, 178, 179}
# faux intertitres (en-têtes sans sous-éléments)
TREE_TABLES = {148: 0, 149: 0, 166: 1, 168: 1}   # n → nb de lignes d'en-tête à sauter
COL_TABLES = {95: 1, 171: 0}                      # n → ligne des en-têtes de colonnes


def cell_items(cell, lvl):
    out = []
    for x in cell.split("\n"):
        x = clean(x)
        if x.startswith("Lésion Lipome"):
            x = x[len("Lésion "):]
        if not x:
            continue
        if x.startswith("- "):
            out.append({"l": lvl + 1, "t": x[2:], "k": "li", "b": False})
        elif x.endswith(":"):
            out.append({"l": lvl, "t": x.rstrip(" :"), "k": "h", "b": False})
        else:
            out.append({"l": lvl, "t": x, "k": "li", "b": False})
    return out
DEMOTE = {84: {"Métastases osseuses"}, 70: {"Absence d'ankylose"}}

def slide_title(s):
    for b in s["blocks"]:
        if b["k"] == "title":
            return clean(" ".join(i[2] for i in b["items"]))
    for b in s["blocks"]:
        if b["k"] == "text" and b["items"]:
            return clean(b["items"][0][2])
    return f"Diapo {s['n']}"

# ---------------------------------------------------------------- gammes de siège (fusion sans doublon des diapos 42, 29, 133, 11)
def _syn(n, title, rows):
    items, d = [], 1
    for r in rows:
        if r.startswith("## "):
            items.append([1, 1, r[3:] + " :"]); d = 2
        elif r.startswith("# "):
            items.append([0, 1, r[2:] + " :"]); d = 1
        else:
            items.append([d, 0, r])
    return {"n": n, "blocks": [{"k": "title", "items": [[0, 1, title]]}, {"k": "text", "items": items}]}
RAW += [
    _syn(301, "Épiphysaire", ["# Tumeurs", "Chondroblastome", "Tumeur à cellules géantes (épiphysométaphysaire)",
        "Chondrosarcome à cellules claires", "Ostéome ostéoïde", "Enchondrome", "Myélome/plasmocytome", "Lymphome",
        "Métastase épiphysaire (rare)",
        "# Pseudotumeurs", "Géode d'arthropathie (arthrose, chondrocalcinose, PR, psoriasis, tuberculose)", "Tophus goutteux",
        "Lésion synoviale (synovite villo-nodulaire, chondromatose synoviale)", "Kyste mucoïde intra-osseux",
        "Géode sous une fissure ou une fracture ostéochondrale", "Ostéochondrite disséquante", "Ostéonécrose pseudo-géodique",
        "Abcès de Brodie / ostéite infectieuse", "Granulome à éosinophile", "Amylose"]),
    _syn(302, "Métaphysaire", ["# Lésions centrées", "Kyste essentiel", "Enchondrome", "Infarctus osseux", "Ostéomyélite",
        "Métastase", "Myélome", "Ostéosarcome", "Chondrosarcome",
        "# Lésions excentrées", "Défect cortical", "Fibrome non ossifiant", "Desmoïde périosté", "Kyste osseux anévrysmal",
        "Chondrome périosté", "Fibrome chondromyxoïde", "Tumeur à cellules géantes", "Ostéoblastome", "Ostéochondrome"]),
    _syn(303, "Diaphysaire", ["# Tumeurs", "Sarcome d'Ewing", "Lymphome (dont lymphome de Parker)", "Myélome",
        "Adamantinome (tibia)", "Ostéome ostéoïde", "Ostéosarcome (25 %, dont télangiectasique)", "Enchondrome", "Chondrosarcome",
        "Angiome", "Angiosarcome", "Métastase (dont pseudo-sarcomateuse du cancer de la prostate)",
        "# Pseudotumeurs", "Dysplasie fibreuse des os", "Dysplasie ostéofibreuse (tibia)", "Histiocytose langerhansienne",
        "Ostéomyélite", "Ostéite aseptique (SAPHO)", "Infarctus osseux"]),
]
# lésions expansives + images d'aspect « anévrysmal » (diapos 31 et 161) fusionnées
RAW.append(_syn(304, "Lésions expansives / d'aspect « anévrysmal »", [
    "# Pseudotumeurs", "Kyste essentiel", "Kyste hydatique", "Tumeur brune d'hyperparathyroïdie", "Kyste épidermoïde",
    "Dysplasie fibreuse", "Fibrome non ossifiant",
    "# Métastases", "Rein, thyroïde, poumon, mélanome, tumeurs neuro-endocrines, paragangliome, hépatocarcinome",
    "# Hémopathies", "Myélome", "Plasmocytome",
    "# Tumeurs primitives", "Kyste anévrysmal", "Tumeur à cellules géantes", "Hémangiome-lymphangiome", "Ostéoblastome",
    "Chondroblastome", "Chondrosarcome", "Ostéosarcome télangiectasique", "Sarcome d'Ewing (extrémités principalement)",
    "Angiosarcome"]))
TITLES[304] = ("Lésions expansives / d'aspect « anévrysmal »", "Soufflantes, ± cloisonnées")
# diapos réécrites (texte anglais collé / structure cassée dans le PPT)
OVERRIDE = {
    93: _syn(93, "Superscan", [
        "# Causes malignes (métastases diffuses)", "Cancer de la prostate", "Cancer du sein", "Cancer du poumon",
        "Carcinome urothélial", "Cancer du côlon", "Myélome multiple (discuté)", "Lymphome",
        "* Fixation hétérogène : regarder le crâne et les côtes ; squelette distal relativement épargné",
        "# Causes métaboliques", "Ostéodystrophie rénale", "Hyperparathyroïdie (souvent secondaire)", "Ostéomalacie",
        "Hyperthyroïdie", "Acromégalie", "Hypervitaminose D",
        "* Atteinte du squelette distal, fixation plus homogène",
        "# Autres", "Myélofibrose / myélosclérose", "Mastocytose", "Maladie de Paget étendue"]),
    94: _syn(94, "Super BMU", [
        "# Causes thérapeutiques", "Facteur de croissance granulocytaire (G-CSF)", "Post-chimiothérapie", "Érythropoïétine",
        "# Causes pathologiques", "Syndromes myélodysplasiques", "Bêta-thalassémie", "Leucémie myéloïde chronique",
        "Interleukines (états fébriles)", "Cytokines d'origine tumorale", "Métastases médullaires diffuses (moins probable)",
        "Anémie sévère (moelle hyperplasique)"]),
    49: _syn(49, "Masses calcifiées des tissus mous", [
        "# Principales causes", "Musculaire (myosite, hématome, abcès)", "Avulsion osseuse ancienne",
        "Graisse (cytostéatonécrose, lipome)", "Vasculaire (malformation)", "Calcinose (dépôts microcristallins)",
        "Tumorale (synovialosarcome)", "Séquelle d'injection",
        "# Ossifications des tissus mous",
        "Tumeurs malignes primitives (synovialosarcome, ostéosarcome, chondrosarcome, liposarcome, sarcome épithélioïde…)",
        "Tumeurs bénignes (chondrome, lipome, ostéome, tumeur fibreuse calcifiante, tumeur fibromyxoïde ossifiante)",
        "Schwannome, myxome intramusculaire (rares)",
        "Métastases (adénocarcinomes mucineux digestifs, mammaires, bronchiques ou vésicaux)",
        "Myosite ossifiante (et panniculite ossifiante)", "Ostéome post-traumatique, postopératoire ou après brûlure",
        "Para-ostéo-arthropathie neurogène, ossifications périprothétiques", "Ostéochondromatose synoviale, bursopathies",
        "Fibrodysplasie ossifiante progressive", "Mélorhéostose", "Insuffisance ou malformation veineuse", "Syndrome de loge",
        "Origine toxique (fluorose, hypervitaminose A, rétinoïdes)", "Hyperostose squelettique idiopathique diffuse (DISH)",
        "# Calcifications des tissus mous",
        "## Métastatiques", "Hyperparathyroïdie, hypoparathyroïdie, pseudo-hypoparathyroïdie",
        "Troubles minéraux et osseux de la maladie rénale chronique", "Hypervitaminose D", "Syndrome du lait et des alcalins",
        "Sarcoïdose", "Destructions osseuses marquées (métastases, myélome, leucémie)",
        "## Dystrophiques", "Connectivites (sclérodermie, dermatomyosite, lupus, Ehlers-Danlos)",
        "Microcristaux (apatite, chondrocalcinose, hémochromatose, ochronose, goutte)",
        "Infections parasitaires (cysticercose, loase, dracunculose…)", "Autres infections (lèpre, tuberculose, coccidioïdomycose…)",
        "Divers (athérosclérose, ostéochondromatose synoviale, maladie de Weber-Christian…)",
        "## Idiopathiques", "Calcinose tumorale idiopathique"]),
    174: _syn(174, "Tumeurs des tissus mous multiples", [
        "# Pseudotumeurs", "Sarcoïdes musculaires (sarcoïdose)", "Tophus goutteux (goutte)", "Calcinose tumorale",
        "Calcifications tendineuses multiples",
        "# Métastases", "Métastases (mélanome notamment)",
        "# Tumeurs vasculaires", "Malformations veineuses (Klippel-Trenaunay, Maffucci)",
        "Malformations artério-veineuses (mutation RASA1)", "Fistules artério-veineuses (Parkes-Weber)",
        "Hémangiomes, épithélioïdes notamment", "Tumeurs glomiques (glomangiomatose)",
        "# Tumeurs des gaines nerveuses", "Neurofibromes, plexiformes notamment (NF1)", "Schwannomes (NF2, schwannomatose)",
        "Tumeur maligne des gaines nerveuses (NF1)",
        "# Tumeurs conjonctives", "Myxomes (Mazabraud, Carney)", "Tumeurs desmoïdes (Gardner)",
        "# Tumeurs graisseuses", "Lipomes (lipomatose familiale, Gardner, Dercum, Madelung)",
        "Xanthomes (hypercholestérolémie familiale)",
        "# Autres", "Léiomyomes (Gardner)"]),
    51: _syn(51, "Siège des OAN selon l'étiologie", [
        "# Épaule, coude", "Syringomyélie", "Traumatisme médullaire cervical",
        "# Poignet", "Lèpre", "Syringomyélie", "Tabès", "Acropathies ulcéromutilantes",
        "# Main", "Syringomyélie", "Lèpre", "Acropathies ulcéromutilantes",
        "# Phalanges distales", "Tabès", "Corticothérapie",
        "# Hanche (rare)", "Tabès", "Dysautonomie familiale",
        "# Genou", "Diabète", "Tabès",
        "# Cheville", "Traumatisme médullaire", "Tabès", "Insensibilité congénitale à la douleur", "Amylose",
        "# Arrière-pied", "Lèpre", "Acropathie ulcéromutilante",
        "# Avant-pied", "Syringomyélie", "Insensibilité congénitale à la douleur", "Diabète"]),
    40: _syn(40, "Lésions costales soufflantes", [
        "# Pseudotumeurs", "Dysplasie fibreuse des os", "Tumeur brune", "Kyste hydatique",
        "# Métastases", "Cancer du rein et de la thyroïde", "Cancer du sein et du poumon", "Autres cancers",
        "# Hémopathies", "Myélome", "Plasmocytome",
        "# Tumeurs primitives", "Chondrosarcome", "Enchondrome", "Chondroblastome", "Kyste anévrysmal", "Ostéoblastome",
        "Tumeur à cellules géantes"]),
}
RAW = [OVERRIDE.get(x["n"], x) for x in RAW]
# voûte crânienne : diapos 173 + 35 séparées par caractéristique, sans doublon
RAW += [
    _syn(305, "Lacune à limites nettes scléreuses", ["Dysplasie fibreuse", "Kyste épidermoïde", "Méningocèle",
        "Empreinte vasculaire", "Granulation de Pacchioni", "Kyste arachnoïdien", "Métastase (rare, sclérose « en beignet »)"]),
    _syn(306, "Sclérose progressivement dégressive", ["Ostéite", "Ostéome ostéoïde", "Méningiome"]),
    _syn(307, "Lacune à l'emporte-pièce (sans sclérose)", ["Myélome (adulte)", "Métastase (neuroblastome chez l'enfant)",
        "Histiocytose langerhansienne", "Ostéomyélite (staphylococcique)", "Hémangiome", "Kyste épidermoïde",
        "Maladie de Paget (liseré clair)", "Granulation arachnoïdienne, lac veineux",
        "Variante anatomique (foramen pariétal, veine émissaire)"]),
    _syn(308, "Limites floues, mitées ou perméatives", ["Métastase", "Ostéite", "Sarcome", "Histiocytose langerhansienne",
        "Leucémie", "Lymphome"]),
    _syn(309, "Contenu de la lésion", [
        "# Séquestre", "Granulome éosinophile", "Ostéite", "Kyste dermoïde", "Radionécrose", "Métastase", "Lymphome",
        "Ostéome ostéoïde", "Enchondrome",
        "# Verre dépoli", "Dysplasie fibreuse",
        "# Nuageux", "Dysplasie fibreuse", "Ostéosarcome",
        "# Multikystique", "Dysplasie fibreuse", "Kyste osseux anévrysmal", "Granulome de réparation",
        "Tumeur à cellules géantes", "Chondroblastome",
        "# Rayon de miel", "Hémangiome",
        "# Liquidien", "Kyste épidermoïde", "Hémangiome (lac veineux)",
        "# Graisseux", "Kyste dermoïde"]),
]
for _n in (35, 173):
    SKIP.add(_n)
for _n in (42, 29, 11, 31, 161, 113, 115, 116, 119, 69):  # 113… : anatomie & repères retirés
    SKIP.add(_n)

gammes = []
for s in RAW:
    n = s["n"]
    if n in SKIP:
        continue
    if n not in C:
        raise SystemExit(f"Diapo {n} non catégorisée : {slide_title(s)}")
    raw_title = slide_title(s)
    title, sub = TITLES.get(n, (None, None))
    if not title:
        title = raw_title
        if " : " in title and len(title) > 60:
            title, sub = title.split(" : ", 1)
    blocks = []
    items = []
    for b in s["blocks"]:
        if b["k"] == "text":
            items += build_items(b["items"], raw_title)
        elif b["k"] == "table" and n in TREE_TABLES:
            # tableau hiérarchique (catégorie / sous-catégorie / liste) → liste lisible sur mobile
            for r in b["rows"][TREE_TABLES[n]:]:
                r = list(r) + ["", "", ""]
                if clean(r[0]):
                    items.append({"l": 0, "t": clean(r[0]), "k": "h", "b": True})
                if clean(r[1]):
                    items.append({"l": 1, "t": clean(r[1]), "k": "h", "b": False})
                items += cell_items(r[2], 2 if clean(r[1]) else 1)
        elif b["k"] == "table" and n in COL_TABLES:
            # tableau à double entrée → une rubrique par colonne
            hr = COL_TABLES[n]; rows = b["rows"]
            for j in range(1, len(rows[hr])):
                items.append({"l": 0, "t": clean(rows[hr][j]), "k": "h", "b": True})
                for r in rows[hr + 1:]:
                    if j < len(r) and clean(r[j]):
                        if clean(r[0]):
                            items.append({"l": 1, "t": clean(r[0]), "k": "h", "b": False})
                        items += cell_items(r[j], 2 if clean(r[0]) else 1)
        elif b["k"] == "table":
            if items:
                blocks.append({"type": "list", "items": items}); items = []
            rows = [["\n".join(x for x in (clean(l) for l in c.split("\n")) if x) for c in r] for r in b["rows"]]
            rows = [r for r in rows if any(r)]
            blocks.append({"type": "table", "rows": rows})
    if items:
        blocks.append({"type": "list", "items": items})
    hidden = []
    if n in NO_SLIDE_TEXT:
        hidden = [i["t"] for b in blocks if b["type"] == "list" for i in b["items"]]
        blocks = []
    if n in EXTRA:
        ex = [{"l": l, "t": t, "k": k, "b": False} for k, l, t in EXTRA[n]]
        blocks = [{"type": "list", "items": ex}] + blocks
    if n in SCHEMAS:
        f, txt = SCHEMAS[n]
        blocks.insert(0, {"type": "images", "src": [f"assets/schemas/{f}"], "schema": True})
        hidden += txt
    if n in PERIO_THUMB:
        blocks.insert(0, {"type": "images", "src": [f"assets/schemas/{PERIO_THUMB[n]}"], "schema": True, "small": True})
    if n in EXTRA_TABLES and n != 178:  # 178 : liste déjà dans « Ostéolyse localisée du sacrum », points clés = description
        blocks.append({"type": "table", "rows": EXTRA_TABLES[n]})
    imgs = [f for f in IMGS.get(n, []) if f in KEEP_IMGS]
    if imgs:
        blocks.append({"type": "images", "src": [f"assets/slides/{f}" for f in imgs]})
    for b in blocks:
        if b["type"] == "list":
            for it in b["items"]:
                if it["t"] in DEMOTE.get(n, ()):
                    it["k"] = "li"
            if sub and b["items"] and norm(b["items"][0]["t"]).rstrip(" .:") == norm(sub).rstrip(" .:"):
                b["items"] = b["items"][1:]
    blocks = [b for b in blocks if b["type"] != "list" or b["items"]]
    # texte plein pour la recherche + entités
    flat = list(hidden)
    for b in blocks:
        if b["type"] == "list":
            flat += [i["t"] for i in b["items"]]
        elif b["type"] == "table":
            flat += [c for r in b["rows"] for c in r if c]
    ents = sorted({e for t in flat + [title] for e in entities_of(t)})
    # liens cliquables vers les diagnostics (pas dans les en-têtes ni les notes)
    for b in blocks:
        if b["type"] == "list":
            for it in b["items"]:
                if it["k"] == "li":
                    sp = ent_spans(it["t"])
                    if sp:
                        it["e"] = sp
        elif b["type"] == "table":
            b["links"] = [[ent_spans(c) if c else [] for c in r] for r in b["rows"]]
    gammes.append({
        "id": f"s{n:03d}", "slide": n, "title": title, "sub": sub, "cats": C[n],
        "horsMsk": n in HORS_MSK, "blocks": blocks, "ents": ents,
        "path": PATHS[n],
        "fiche": FICHE_ENT.get(n),
        "kw": KW.get(n),
        "thumb": None if n in NO_THUMB else THUMB.get(n) or next((b["src"][0] for b in blocks if b["type"] == "images"), None),
        "q": norm(" ".join([title, sub or ""] + flat)),
    })

# entités : ne garder que celles présentes
ent_index = {}
for g in gammes:
    for e in g["ents"]:
        ent_index.setdefault(e, []).append(g["id"])
entities = [{"id": k, "label": lab, "gammes": ent_index[k]} for k, lab, _ in ENT if k in ent_index]
entities.sort(key=lambda e: norm(e["label"]))

BUILT = {g["slide"] for g in gammes}
miss = [n for n in PATHS if n not in BUILT]
if miss:
    raise SystemExit(f"Diapos rangées mais absentes : {miss}")
# ---------------------------------------------------------------- fiches : une entrée par maladie (nom seul), sections fusionnées
FICHE_NAMES = [  # (nom, [(diapo, intitulé de section ou None)])
    ("Enchondrome", [(54, "Signes atypiques")]),
    ("Kyste anévrysmal vs kyste essentiel", [(160, None)]),
    ("Tassement vertébral ostéoporotique", [(81, "Radiographie"), (82, "IRM (tassement récent)")]),
    ("Tumeur des gaines nerveuses périphériques", [(89, "Arguments diagnostiques")]),
    ("Tumeurs lipomateuses", [(125, "Prise en charge")]),
    ("Myosite ossifiante", [(172, None)]),
    ("Neurofibromatoses", [(57, "NF1"), (58, "NF2 (critères de Manchester)")]),
    ("Goutte", [(61, None)]),
    ("Chondrocalcinose (CPP)", [(62, "Formes"), (63, "Différences avec l'arthrose"), (121, "Arthropathie")]),
    ("Polyarthrite rhumatoïde", [(66, "Présentations initiales")]),
    ("Sacro-iliite vs surcharge mécanique", [(68, None)]),
    ("Lupus érythémateux systémique", [(72, None)]),
    ("Arthropathie hémophilique", [(73, None)]),
    ("Amylose", [(88, "Échographie")]),
    ("OAN diabétique vs ostéite", [(75, None)]),
    ("Déformations des doigts", [(67, None)]),
    ("Maladie de Paget", [(59, "Signes cardinaux"), (83, "Raréfactions pseudotumorales")]),
    ("Hyperparathyroïdie primitive", [(78, None)]),
    ("Ostéomalacie", [(80, None)]),
    ("Ostéodystrophie rénale (TMO-MRC)", [(86, None)]),
    ("Acromégalie", [(77, None)]),
    ("Syndrome de Cushing", [(79, None)]),
    ("Drépanocytose", [(103, "Complications"), (104, "Arthropathies")]),
    ("Achondroplasie", [(106, None)]),
    ("Radiothérapie", [(85, "Complications")]),
    ("OCRM", [(70, None)]),
    ("Leucémie aiguë de l'enfant", [(99, None)]),
    ("Ostéochondroses", [(117, None)]),
]
_by = {g["slide"]: g for g in gammes}
MOVED = {"s173": "s305", "s035": "s307"}
for name, parts in FICHE_NAMES:
    g0 = _by[parts[0][0]]
    blocks, ents, fiche, qs = [], set(), [], []
    for n, sec in parts:
        g = _by[n]
        if sec:
            blocks.append({"type": "list", "items": [{"l": 0, "t": sec, "k": "h", "b": True}]})
        blocks += g["blocks"]
        ents |= set(g["ents"]); fiche += [e for e in (g["fiche"] or []) if e not in fiche]; qs.append(g["q"])
        if g is not g0:
            MOVED[g["id"]] = g0["id"]; gammes.remove(g)
    g0.update(title=name, sub=None, blocks=blocks, ents=sorted(ents), fiche=fiche or None, thumb=None,
              q=norm(name) + " " + " ".join(qs))
for e in entities:
    e["gammes"] = list(dict.fromkeys(MOVED.get(x, x) for x in e["gammes"]))
KEPT = {g["slide"] for g in gammes}

data = {
    "meta": {
        "title": "Gammes & Arpèges",
        "source": "« Des gammes et des arpèges ! » — Grégoire Attané, Service d'imagerie ostéo-articulaire, viscérale et vasculaire (Pr Bousson)",
        "count": len(gammes),
        "version": "2026-11-18",
    },
    "groups": [{"id": g, "label": l, "subs": [{"id": si, "label": sl, "kw": SUB_KW.get(si), "ids": [f"s{n:03d}" for n in nums if n in KEPT]} for si, sl, nums in subs]} for g, l, subs in GROUPS],
    "gammes": gammes,
    "moved": MOVED,
    "entities": entities,
}
(ROOT / "data").mkdir(exist_ok=True)
js = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
(ROOT / "data/gammes.json").write_text(js)
(ROOT / "data/embedded_data.js").write_text("window.GAMMES_DATA=" + js + ";\n")
print(f"{len(gammes)} gammes, {len(entities)} diagnostics indexés")
for g, l, subs in GROUPS:
    print(f"  {l}: " + ", ".join(f"{sl} {len(nums)}" for _, sl, nums in subs))
dup = {n: p for n, p in PATHS.items() if len(p) > 1}
print("  doublons :", {n: [x[1] for x in p] for n, p in dup.items()})
