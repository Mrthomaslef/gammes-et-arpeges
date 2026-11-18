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

# ---------------------------------------------------------------- catégories
CATS = [
    ("os", "Os — lésion focale", "🦴", "Lodwick, contours, topographie, gamme générale"),
    ("aspect", "Os — aspect & contenu", "🔬", "Trabéculations, niveaux, soufflure, séquestre…"),
    ("perioste", "Périoste, corticale & surface", "🧱", "Réactions périostées, lésions corticales et de surface"),
    ("axial", "Rachis, bassin, crâne, côtes, mains", "🧭", "Vertèbres, sacrum, voûte, côtes, doigts"),
    ("diffus", "Multifocal & diffus", "🌐", "Ostéolyses plurifocales, condensations diffuses, superscan"),
    ("tm", "Tissus mous", "🧬", "Localisation, signal IRM, structure"),
    ("rhumato", "Rhumato & articulaire", "🦵", "Microcristaux, PR, sacro-iliaques, OAN…"),
    ("interne", "Médecine interne, endocrino, hémato", "🩸", "Paget, HPT, ostéomalacie, drépanocytose…"),
    ("pedia", "Pédiatrie", "🧸", "Gammes de l'enfant"),
    ("classif", "Classifications & anatomie", "📐", "OMS, zones prothétiques, scores (dont hors MSK)"),
]

# slide -> (catégories, titre court optionnel)
C = {}
def put(cats, *slides):
    for s in slides:
        C[s] = cats

put(["os"], 2, 9, 10, 11, 12, 13, 14, 15, 16, 17, 42, 133, 136, 137)
put(["aspect"], 28, 29, 30, 31, 32, 138, 161, 144, 101, 160, 54, 143)
put(["perioste"], 135, 20, 21, 22, 23, 24, 134, 98, 18, 92, 53, 26, 147, 148, 149)
put(["axial"], 34, 36, 37, 140, 141, 145, 146, 41, 108, 38, 35, 173, 39, 40, 142, 91, 81, 82)
put(["diffus"], 52, 95, 97, 93, 94, 139)
put(["tm"], 150, 151, 152, 153, 154, 155, 156, 157, 48, 126, 125, 165, 166, 167, 168, 158,
    169, 162, 163, 164, 170, 171, 49, 172, 174, 177, 89, 175, 176, 178, 179, 87)
put(["rhumato"], 159, 61, 62, 63, 64, 66, 67, 68, 70, 90, 55, 50, 51, 75, 88, 121, 69, 74, 73)
put(["interne"], 72, 77, 78, 79, 80, 83, 84, 85, 86, 103, 104, 105, 56, 57, 58, 59, 106, 107, 109, 110)
put(["pedia", "axial"], 44)
put(["pedia", "perioste"], 25)
put(["pedia"], 45, 46, 99, 100)
put(["classif", "os"], 7)
put(["classif", "tm"], 8)
put(["classif"], 113, 114, 115, 116, 117, 118, 119, 120, 122, 123, 124, 127, 128, 129, 130, 131, 132, 180)
# catégories secondaires
for s in (11, 12, 13, 14, 15, 16, 17):
    pass
C[41] = ["axial", "interne"]
C[103] = ["interne", "pedia"]
C[52] = ["diffus", "os"]
C[35] = ["axial"]
C[173] = ["axial"]

HORS_MSK = {122, 123, 127, 128, 129, 130, 132}

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
    174: ("Tumeurs des tissus mous multiples", "Et syndromes associés"),
    173: ("Lésions les plus fréquentes de la voûte crânienne", "Tableau sémiologique"),
    69: ("Diastasis tibio-fibulaire distal", None),
    93: ("« Superscan » (scintigraphie)", None),
    94: ("« Super BMU » (TEP-FDG)", "Hyperfixation médullaire diffuse"),
    46: ("Arthrite septique de hanche de l'enfant : différentiels", None),
    45: ("Ostéomyélite aiguë de l'enfant : différentiels", None),
    51: ("Siège des OAN selon l'étiologie", "Ostéo-arthropathies neurogènes"),
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
    ("aîgue", "aiguë"), ("Ostéite tuberculeuse  ", "Ostéite tuberculeuse "), ("Ilot", "Îlot"), ("CTB", "cervico-thoraco-brachiale"),
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
        if NOTE_RE.match(txt) or txt.startswith("* :") or txt.startswith("** :"):
            kind = "note"
        elif txt.endswith(":") or n in HEADER_WORDS:
            kind = "h"
        out.append({"l": lvl, "t": txt.rstrip(" :") if kind == "h" else txt, "k": kind, "b": bold})
    # un item de niveau n suivi d'un item de niveau > n devient en-tête de groupe
    for i, it in enumerate(out[:-1]):
        if it["k"] == "li" and out[i + 1]["l"] > it["l"]:
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
    165: [
        ("h", 0, "Hypersignal T1 → disparition après suppression du signal de la graisse ?"),
        ("h", 1, "OUI (graisse)"),
        ("li", 2, "Absence de calcifications : lipomes et liposarcomes, malformations vasculaires, hémangiomes et autres"),
        ("li", 2, "Présence de calcifications : malformations vasculaires (phlébolithes)"),
        ("li", 2, "Os mature"),
        ("h", 1, "NON (pas de graisse)"),
        ("li", 2, "Méthémoglobine : hématome et tumeurs hémorragiques"),
        ("li", 2, "Vaisseaux à flux lent"),
        ("li", 2, "Matériel protéique : kystes mucoïdes et abcès"),
        ("li", 2, "Mélanine : mélanome et sarcome à cellules claires"),
    ],
    167: [
        ("h", 0, "Lésion d'allure kystique en T2 → injection systématique de gadolinium (lésion bien kystique, sauf si contenu liquide démontré en échographie)"),
        ("li", 1, "Prise de contraste périphérique fine et régulière → kystes, chondromes, lipomes chondroïdes et myxoïdes"),
        ("li", 1, "Paroi épaisse prenant le contraste, centre ne prenant pas → abcès et tumeurs nécrosées"),
        ("li", 1, "Prise de contraste diffuse (parfois retardée : séquences tardives !) → tumeurs myxoïdes"),
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
    179: [
        ("h", 0, "Masse pré-sacrée de l'enfant (orientation selon IRM/TDM)"),
        ("li", 1, "Ostéolyse sacrée : sarcome d'Ewing (> 5 ans), lymphome, métastase"),
        ("li", 1, "Extension intra-canalaire (débute dans le canal / en sablier) : TMGNP, tumeurs neuroblastiques (neuroblastome, ganglioneuroblastome)"),
        ("li", 1, "Isolée — calcifications / graisse / kystique : tératomes sacro-coccygiens (< 3 mois ; tissulaire = malignité), tumeurs germinales, lymphangiome kystique"),
        ("li", 1, "Masse uro-génitale à extension pré-sacrée : rhabdomyosarcome"),
    ],
    178: [
        ("h", 0, "Masse pré-sacrée de l'adulte : orienter selon l'extension"),
        ("li", 1, "Masse sacrée : abcès tuberculeux, métastases, hémopathies, tumeurs osseuses primitives (chordome, TCG…)"),
        ("li", 1, "Extension foraminale : tumeurs neurogènes (schwannome, neurofibrome, ganglioneurome, épendymome myxopapillaire, paragangliome, TMGNP), méningocèle"),
        ("li", 1, "Masse rectale : abcès, GIST, adénocarcinome mucineux, lymphome, léiomyome/léiomyosarcome"),
        ("li", 1, "Masse isolée kystique : kyste épidermoïde/dermoïde, tailgut cyst, duplication rectale, tératome"),
        ("li", 1, "Masse isolée tissulaire : HEM, myélolipome, lipome/liposarcome, TFS, hématome, tumeur desmoïde, Castleman, sarcomes"),
    ],
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

def entities_of(text: str):
    n = norm(text)
    return [k for k, _, rx in ENT_RE if rx.search(n)]

# ---------------------------------------------------------------- construction
SKIP = {1, 3, 4, 5, 6, 19, 27, 33, 43, 60, 65, 71, 76, 181, 47, 102, 96, 112, 111}

def slide_title(s):
    for b in s["blocks"]:
        if b["k"] == "title":
            return clean(" ".join(i[2] for i in b["items"]))
    for b in s["blocks"]:
        if b["k"] == "text" and b["items"]:
            return clean(b["items"][0][2])
    return f"Diapo {s['n']}"

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
        elif b["k"] == "table":
            if items:
                blocks.append({"type": "list", "items": items}); items = []
            rows = [[clean(c) for c in r] for r in b["rows"]]
            rows = [r for r in rows if any(r)]
            blocks.append({"type": "table", "rows": rows})
    if items:
        blocks.append({"type": "list", "items": items})
    if n in EXTRA:
        ex = [{"l": l, "t": t, "k": k, "b": False} for k, l, t in EXTRA[n]]
        if n in (9,):
            blocks = [{"type": "list", "items": ex}] + blocks
        else:
            blocks.insert(0, {"type": "list", "items": ex, "transcribed": True})
    if n in IMGS:
        blocks.append({"type": "images", "src": [f"assets/slides/{f}" for f in IMGS[n]]})
    # texte plein pour la recherche + entités
    flat = []
    for b in blocks:
        if b["type"] == "list":
            flat += [i["t"] for i in b["items"]]
        elif b["type"] == "table":
            flat += [c for r in b["rows"] for c in r if c]
    ents = sorted({e for t in flat + [title] for e in entities_of(t)})
    gammes.append({
        "id": f"s{n:03d}", "slide": n, "title": title, "sub": sub, "cats": C[n],
        "horsMsk": n in HORS_MSK, "blocks": blocks, "ents": ents,
        "q": norm(" ".join([title, sub or ""] + flat)),
    })

# entités : ne garder que celles présentes
ent_index = {}
for g in gammes:
    for e in g["ents"]:
        ent_index.setdefault(e, []).append(g["id"])
entities = [{"id": k, "label": lab, "gammes": ent_index[k]} for k, lab, _ in ENT if k in ent_index]
entities.sort(key=lambda e: norm(e["label"]))

# parcours guidé (« Démarche »)
GUIDE = [
    {"t": "Devant une lésion osseuse focale", "i": "🦴", "steps": [
        ("1. Réflexe", ["s002"]),
        ("2. Contours (Lodwick)", ["s009", "s012", "s013", "s014", "s015", "s016", "s017", "s010", "s011"]),
        ("3. Topographie dans l'os", ["s042", "s133"]),
        ("4. Lyse ou condensation", ["s136", "s137"]),
        ("5. Contenu / aspect", ["s028", "s030", "s031", "s138", "s161", "s032", "s144", "s101"]),
        ("6. Épiphyse", ["s029"]),
        ("7. Cartilage / kystes", ["s054", "s160"]),
    ]},
    {"t": "Périoste & corticale", "i": "🧱", "steps": [
        ("Réactions périostées", ["s135", "s020", "s021", "s022", "s023", "s134", "s024", "s098"]),
        ("Corticale", ["s018", "s092", "s053"]),
        ("Surface de l'os", ["s147", "s148", "s149", "s026"]),
    ]},
    {"t": "Squelette axial & sites particuliers", "i": "🧭", "steps": [
        ("Vertèbre", ["s141", "s036", "s145", "s034", "s041", "s108", "s044", "s140", "s037"]),
        ("Disque / tassement", ["s038", "s081", "s082"]),
        ("Sacrum & pré-sacré", ["s146", "s178", "s179"]),
        ("Crâne", ["s035", "s173"]),
        ("Côtes", ["s039", "s040"]),
        ("Mains & doigts", ["s142", "s091", "s055"]),
    ]},
    {"t": "Atteinte multiple ou diffuse", "i": "🌐", "steps": [
        ("Lyse plurifocale", ["s052"]),
        ("Condensation", ["s095", "s097", "s037"]),
        ("Médecine nucléaire", ["s093", "s094"]),
        ("Os + tissus mous", ["s139", "s174"]),
    ]},
    {"t": "Masse des tissus mous", "i": "🧬", "steps": [
        ("Les plus fréquentes", ["s150", "s151"]),
        ("Par localisation", ["s152", "s153", "s154", "s155", "s156", "s157", "s176", "s175"]),
        ("Par signal IRM", ["s165", "s166", "s167", "s168", "s048", "s126", "s158"]),
        ("Par structure / aspect", ["s162", "s169", "s163", "s164", "s170", "s171", "s049", "s089"]),
        ("Sous-cutané", ["s177"]),
        ("Prise en charge", ["s125", "s172"]),
    ]},
    {"t": "Chez l'enfant", "i": "🧸", "steps": [
        ("Gammes pédiatriques", ["s044", "s045", "s046", "s025", "s099", "s100"]),
    ]},
]
ids = {g["id"] for g in gammes}
guide = []
for sec in GUIDE:
    st = []
    for lab, lst in sec["steps"]:
        bad = [x for x in lst if x not in ids]
        if bad:
            raise SystemExit(f"Guide : id inconnu {bad}")
        st.append({"label": lab, "ids": lst})
    guide.append({"title": sec["t"], "icon": sec["i"], "steps": st})

data = {
    "meta": {
        "title": "Gammes & Arpèges",
        "source": "« Des gammes et des arpèges ! » — Grégoire Attané, Service d'imagerie ostéo-articulaire, viscérale et vasculaire (Pr Bousson)",
        "count": len(gammes),
        "version": "2026-11-18",
    },
    "cats": [{"id": a, "label": b, "icon": c, "desc": d} for a, b, c, d in CATS],
    "gammes": gammes,
    "entities": entities,
    "guide": guide,
}
(ROOT / "data").mkdir(exist_ok=True)
js = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
(ROOT / "data/gammes.json").write_text(js)
(ROOT / "data/embedded_data.js").write_text("window.GAMMES_DATA=" + js + ";\n")
print(f"{len(gammes)} gammes, {len(entities)} diagnostics indexés")
for c in CATS:
    print(f"  {c[2]} {c[1]}: {sum(1 for g in gammes if c[0] in g['cats'])}")
