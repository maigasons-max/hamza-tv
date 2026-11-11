#!/usr/bin/env python3
"""Hamza TV - publication automatique des films d'un dossier Google Drive public.

Usage:
    python3 auto_drive.py --dossier <ID_OU_URL_DU_DOSSIER>
    python3 auto_drive.py --lien <URL_DE_FICHIER_DRIVE>

Ce que fait le script, sans intervention :
  1. liste le dossier public (page embeddedfolderview, aucun compte requis)
  2. ignore ce qui est deja dans le catalogue (id drive-<fileId>)
  3. telecharge les nouveaux fichiers, refuse ce qui fait moins de 60 minutes
  4. fabrique une affiche a partir d'une image du film (ffmpeg)
  5. publie le fichier en piece jointe de Release GitHub (lien direct, sans pub)
  6. ajoute la fiche au catalogue serie.json, monte la version, pousse sur main
  7. affiche un compte rendu clair de ce qui a ete publie ou refuse

Dependances : python3, ffmpeg, ffprobe, git, variable d'environnement GITHUB_TOKEN.
"""
import argparse, json, os, re, subprocess, sys, unicodedata, urllib.parse, urllib.request, ssl

RACINE = os.path.dirname(os.path.abspath(__file__))
DEPOT = os.path.join(RACINE, "depot-hamza")
CATALOGUE = os.path.join(DEPOT, "serie.json")
DEPOT_GIT = "github.com/maigasons-max/hamza-tv"
DUREE_MINI = 60 * 60          # 60 minutes, regle du proprietaire
TAILLE_MINI = 80 * 1024 * 1024
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0"}


def jeton():
    t = os.environ.get("GITHUB_TOKEN")
    if not t:
        sys.exit("GITHUB_TOKEN absent de l'environnement")
    return t


def api(url, methode="GET", data=None, entetes=None):
    h = {"Authorization": "Bearer " + jeton(), "Accept": "application/vnd.github+json"}
    if entetes:
        h.update(entetes)
    req = urllib.request.Request(url, method=methode, data=data, headers=h)
    with urllib.request.urlopen(req, timeout=120, context=CTX) as r:
        corps = r.read()
    return json.loads(corps) if corps[:1] in (b"{", b"[") else corps


def identifiant_dossier(lien_ou_id):
    m = re.search(r"/folders/([A-Za-z0-9_-]{10,})", lien_ou_id)
    return m.group(1) if m else lien_ou_id.strip()


def identifiant_fichier(lien_ou_id):
    m = re.search(r"/d/([A-Za-z0-9_-]{10,})", lien_ou_id)
    return m.group(1) if m else lien_ou_id.strip()


def lister_dossier(dossier_id):
    url = "https://drive.google.com/embeddedfolderview?id=%s#list" % dossier_id
    html = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60, context=CTX).read().decode("utf-8", "ignore")
    entrees = []
    for bloc in re.findall(r'<div class="flip-entry"[^>]*id="entry-([A-Za-z0-9_-]+)"(.*?)</div>\s*</div>', html, re.S):
        fid, reste = bloc
        titre = re.search(r'flip-entry-title">([^<]+)<', reste)
        entrees.append({"id": fid, "nom": (titre.group(1) if titre else fid)})
    if not entrees:  # repli : anciens gabarits
        for fid in re.findall(r'id="entry-([A-Za-z0-9_-]{10,})"', html):
            entrees.append({"id": fid, "nom": fid})
    return entrees


def telecharger(fichier_id, destination):
    url = ("https://drive.usercontent.google.com/download?id=%s&export=download&confirm=t" % fichier_id)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=600, context=CTX) as r, open(destination, "wb") as f:
        while True:
            bloc = r.read(1 << 20)
            if not bloc:
                break
            f.write(bloc)
    entete = open(destination, "rb").read(12)
    if b"ftyp" not in entete:
        os.remove(destination)
        return None
    return destination


def duree(chemin):
    sortie = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                             "-of", "default=nw=1:nk=1", chemin], capture_output=True, text=True).stdout.strip()
    try:
        return int(float(sortie))
    except ValueError:
        return 0


def affiche(chemin, destination):
    d = duree(chemin) or 600
    point = max(1, min(int(d * 0.15), max(1, d - 1)))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(point), "-i", chemin,
                    "-frames:v", "1", "-vf", "scale=400:600:force_original_aspect_ratio=increase,crop=400:600", destination], check=False)
    return os.path.exists(destination) and os.path.getsize(destination) > 3000


def annee_de(nom):
    m = re.search(r"(19|20)\d{2}", nom)
    return int(m.group(0)) if m else None


def titre_propre(nom):
    t = re.sub(r"\.(mp4|mkv|m4v|webm|avi)$", "", nom, flags=re.I)
    t = re.sub(r"[_.]+", " ", t)
    t = re.sub(r"\b(1080p|720p|2160p|4k|x264|x265|h264|h265|aac|bluray|web-?dl|webrip|vf|vff|multi|truefrench)\b", " ", t, flags=re.I)
    t = re.sub(r"\s{2,}", " ", t).strip(" -")
    return t[:70] or nom


def slug(t):
    s = unicodedata.normalize("NFD", t.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:50] or "film"


def catalogue():
    return json.load(open(CATALOGUE, encoding="utf-8"))


def publier_fichier(fichier_id, nom_origine):
    d = catalogue()
    if any(x.get("id") == "drive-" + fichier_id for x in d["series"]):
        return ("deja", nom_origine, None)

    travail = os.path.join(RACINE, "films")
    os.makedirs(travail, exist_ok=True)
    local = os.path.join(travail, fichier_id + ".mp4")
    if not telecharger(fichier_id, local):
        return ("refus", nom_origine, "ce n'est pas un fichier video lisible")

    taille = os.path.getsize(local)
    duree_s = duree(local)
    if taille < TAILLE_MINI:
        os.remove(local)
        return ("refus", nom_origine, "trop leger (%d Mo)" % (taille // 1048576))
    if duree_s < DUREE_MINI:
        os.remove(local)
        return ("refus", nom_origine, "moins de 60 minutes (%d min)" % (duree_s // 60))

    titre = titre_propre(nom_origine)
    ident = "drive-" + fichier_id
    tag = "film-" + slug(titre)

    # affiche
    poster_rel = "assets/posters/%s.jpg" % slug(titre)
    os.makedirs(os.path.join(DEPOT, "assets", "posters"), exist_ok=True)
    ok_poster = affiche(local, os.path.join(DEPOT, poster_rel))
    if not ok_poster:
        poster_rel = "assets/logo-512.png"

    # release + piece jointe
    try:
        rel = api("https://api.github.com/repos/%s/releases" % DEPOT_GIT, "POST",
                  json.dumps({"tag_name": tag, "name": titre, "draft": False, "prerelease": False}).encode(),
                  {"Content-Type": "application/json"})
    except Exception:
        rel = api("https://api.github.com/repos/%s/releases/tags/%s" % (DEPOT_GIT, tag))
    nom_asset = slug(titre) + ".mp4"
    with open(local, "rb") as f:
        contenu = f.read()
    api("https://uploads.github.com/repos/%s/releases/%d/assets?name=%s" % (DEPOT_GIT, rel["id"], nom_asset),
        "POST", contenu, {"Content-Type": "video/mp4"})
    url = "https://github.com/%s/releases/download/%s/%s" % (DEPOT_GIT, tag, nom_asset)
    os.remove(local)

    entree = {
        "id": ident,
        "t": titre,
        "s": "%s · Film · %d min" % (annee_de(nom_origine) or "Film", duree_s // 60),
        "affiche": poster_rel,
        "badge": "VF",
        "episodes": {"1": url},
        "saisonDe": {"1": 1}, "numero": {"1": 1},
        "categorie": "film",
        "annee": annee_de(nom_origine),
        "tendance": 1000 - len(d["series"]),
    }
    d["series"].insert(0, entree)
    d["v"] = int(d["v"]) + 1
    json.dump(d, open(CATALOGUE, "w", encoding="utf-8"), ensure_ascii=False)
    return ("publie", titre, "%d min · %d Mo" % (duree_s // 60, taille // 1048576))


def pousser():
    sous = lambda c: subprocess.run(c, cwd=DEPOT, capture_output=True, text=True)
    sous(["git", "add", "-A"])
    sous(["git", "-c", "user.email=agent@nexus.studio", "-c", "user.name=Solas",
          "commit", "-m", "publication automatique depuis Drive"])
    r = subprocess.run(["git", "push", "-q",
                        "https://x-access-token:%s@github.com/maigasons-max/hamza-tv.git" % jeton(),
                        "HEAD:main"], cwd=DEPOT, capture_output=True, text=True)
    return r.returncode == 0


def principal():
    p = argparse.ArgumentParser()
    p.add_argument("--dossier")
    p.add_argument("--lien")
    p.add_argument("--essai", action="store_true", help="tout faire sauf publier : verification a blanc")
    a = p.parse_args()

    if a.lien:
        fichiers = [{"id": identifiant_fichier(a.lien), "nom": "film-" + identifiant_fichier(a.lien) + ".mp4"}]
    elif a.dossier:
        fichiers = lister_dossier(identifiant_dossier(a.dossier))
    else:
        p.print_help()
        return

    if not fichiers:
        print("Aucun fichier visible. Le dossier doit etre partage en lecture pour tous.")
        return

    if a.essai:
        for f in fichiers:
            print("  fichier detecte :", f["id"], "|", f["nom"][:60])
        return

    resultats = []
    for f in fichiers:
        etat, nom, detail = publier_fichier(f["id"], f["nom"])
        resultats.append((etat, nom, detail))
        print("  %-8s %-40s %s" % (etat, nom[:40], detail or ""))

    publies = [r for r in resultats if r[0] == "publie"]
    if publies:
        print("push:", "ok" if pousser() else "ECHEC")
    print("\n%d publie(s), %d refuse(s), %d deja present(s)" % (
        len(publies),
        sum(1 for r in resultats if r[0] == "refus"),
        sum(1 for r in resultats if r[0] == "deja")))


if __name__ == "__main__":
    principal()
