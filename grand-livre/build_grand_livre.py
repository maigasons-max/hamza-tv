#!/usr/bin/env python3
"""Fabrique l'APK de Grand Livre : application 100 % hors-ligne.

Le dossier www/ est embarqué dans l'APK (assets/www) et chargé en file://.
Aucune connexion réseau n'est nécessaire après l'installation.

Usage : python3 build_grand_livre.py
Sortie : out/grand-livre-<version>.apk (signé avec nexus.jks)
"""
import os, shutil, subprocess, sys, zipfile
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.abspath(__file__))
SDK = f"{BASE}/sdk/build-tools/34.0.0"
JAR = f"{BASE}/sdk/platforms/android-34/android.jar"
JAVA_HOME = f"{BASE}/jdk-17.0.12+7"
JAVA = f"{JAVA_HOME}/bin/java"
JAVAC = f"{JAVA_HOME}/bin/javac"
KEYTOOL = f"{JAVA_HOME}/bin/keytool"

PKG = "bf.nexus.grandlivre"
NOM = "Grand Livre"
VERSION_CODE = int(sys.argv[1]) if len(sys.argv) > 1 else 1
VERSION_NAME = sys.argv[2] if len(sys.argv) > 2 else "1.0"
WWW = os.path.abspath(os.path.join(BASE, "..", "grand-livre", "www"))

ENV = dict(os.environ)
ENV["JAVA_HOME"] = JAVA_HOME
ENV["PATH"] = f"{JAVA_HOME}/bin:" + ENV["PATH"]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, env=ENV)
    if r.returncode != 0:
        print("ERREUR:", " ".join(cmd)[:180])
        print(r.stdout[-400:])
        print(r.stderr[-800:])
        raise SystemExit(1)
    return r

work = f"{BASE}/build_gl"
shutil.rmtree(work, ignore_errors=True)
for d in ("res/values", "java", "assets"):
    os.makedirs(f"{work}/{d}")
for d in ("mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"):
    os.makedirs(f"{work}/res/mipmap-{d}")

# 1. l'application web embarquée
shutil.copytree(WWW, f"{work}/assets/www")

# 2. manifeste et ressources
man = open(f"{BASE}/template/AndroidManifest.xml").read().replace("com.nexus.webapp", PKG)
import re as _re
man = _re.sub(r'\s*<uses-permission[^>]*android.permission.INTERNET[^>]*/>', '', man)
open(f"{work}/AndroidManifest.xml", "w").write(man)
open(f"{work}/res/values/strings.xml", "w").write(
    f'''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">{NOM}</string>
    <string name="app_url">file:///android_asset/www/index.html</string>
</resources>''')
shutil.copy(f"{BASE}/template/res/values/styles.xml", f"{work}/res/values/styles.xml")

# 3. activité principale : accès fichiers + pont pour enregistrer PDF et sauvegardes
pkgpath = PKG.replace(".", "/")
os.makedirs(f"{work}/java/{pkgpath}", exist_ok=True)
open(f"{work}/java/{pkgpath}/MainActivity.java", "w").write('''package %s;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private WebView web;
    private ValueCallback<Uri[]> cheminFichier;
    private static final int DEMANDE_FICHIER = 1001;

    @Override
    protected void onCreate(Bundle etat) {
        super.onCreate(etat);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(false);
        s.setTextZoom(100);
        web.addJavascriptInterface(new Pont(), "Nexus");
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                cheminFichier = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Choisir un fichier"), DEMANDE_FICHIER);
                } catch (Exception e) {
                    cheminFichier = null;
                    return false;
                }
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest demande) {
                String chemin = demande.getUrl().getPath();
                if (chemin == null || chemin.equals("/")) chemin = "/index.html";
                try {
                    java.io.InputStream flux = getAssets().open("www" + chemin);
                    String type = chemin.endsWith(".js") ? "application/javascript"
                            : chemin.endsWith(".css") ? "text/css"
                            : chemin.endsWith(".png") ? "image/png"
                            : "text/html";
                    return new WebResourceResponse(type, "UTF-8", flux);
                } catch (Exception e) {
                    return null;
                }
            }
        });
        web.loadUrl("https://grandlivre.local/index.html");
        setContentView(web);
    }

    @Override
    protected void onActivityResult(int demande, int resultat, Intent donnees) {
        if (demande == DEMANDE_FICHIER) {
            Uri[] uris = null;
            if (resultat == RESULT_OK && donnees != null && donnees.getData() != null) {
                uris = new Uri[]{ donnees.getData() };
            }
            if (cheminFichier != null) cheminFichier.onReceiveValue(uris);
            cheminFichier = null;
            return;
        }
        super.onActivityResult(demande, resultat, donnees);
    }

    public class Pont {
        @JavascriptInterface
        public String saveFile(String nom, String type, String base64) {
            try {
                byte[] octets = Base64.decode(base64, Base64.DEFAULT);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Downloads.DISPLAY_NAME, nom);
                    cv.put(MediaStore.Downloads.MIME_TYPE, type);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    OutputStream flux = getContentResolver().openOutputStream(uri);
                    flux.write(octets);
                    flux.close();
                    return "Telechargements/" + nom;
                }
                File dossier = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!dossier.exists()) dossier.mkdirs();
                File f = new File(dossier, nom);
                FileOutputStream fo = new FileOutputStream(f);
                fo.write(octets);
                fo.close();
                return f.getAbsolutePath();
            } catch (Exception e) {
                return "";
            }
        }
    }

    @Override
    public boolean onKeyDown(int touche, KeyEvent ev) {
        if (touche == KeyEvent.KEYCODE_BACK && web != null && web.canGoBack()) {
            web.goBack();
            return true;
        }
        return super.onKeyDown(touche, ev);
    }
}
''' % PKG)

# 4. icône : livre doré sur fond nuit
police = None
for f in (f"{BASE}/fonts/Poppins-Bold.ttf",):
    if os.path.exists(f):
        police = ImageFont.truetype(f, 150)
for d, taille in (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)):
    im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    dr.rounded_rectangle([6, 6, 250, 250], radius=58, fill=(11, 11, 13, 255))
    dr.rounded_rectangle([44, 52, 212, 204], radius=14, outline=(224, 180, 87, 255), width=7)
    dr.line([86, 52, 86, 204], fill=(224, 180, 87, 255), width=5)
    for y in (92, 124, 156):
        dr.line([108, y, 186, y], fill=(224, 180, 87, 200), width=4)
    im.resize((taille, taille), Image.LANCZOS).save(f"{work}/res/mipmap-{d}/ic_launcher.png")

# 5. ressources puis dex
os.chdir(work)
run([f"{SDK}/aapt2", "compile", "--dir", "res", "-o", "res.zip"])
run([f"{SDK}/aapt2", "link", "-o", "app.unsigned.apk", "-I", JAR,
     "--manifest", "AndroidManifest.xml", "--java", "gen",
     "--min-sdk-version", "21", "--target-sdk-version", "34", "res.zip"])
os.makedirs("classes")
rfiles = [os.path.join(dp, f) for dp, _, fs in os.walk("gen") for f in fs]
jfiles = [os.path.join(dp, f) for dp, _, fs in os.walk("java") for f in fs if f.endswith(".java")]
run([JAVAC, "-classpath", JAR, "-d", "classes"] + rfiles + jfiles)
os.makedirs("dexout")
run([JAVA, "-cp", f"{SDK}/lib/d8.jar", "com.android.tools.r8.D8",
     "--release", "--lib", JAR, "--output", "dexout"] +
    [os.path.join(dp, f) for dp, _, fs in os.walk("classes") for f in fs if f.endswith(".class")])

# 6. dex + site embarqué dans l'APK
zf = zipfile.ZipFile("app.unsigned.apk", "a")
zf.write("dexout/classes.dex", "classes.dex")
for dp, _, fs in os.walk("assets"):
    for f in fs:
        p = os.path.join(dp, f)
        zf.write(p, os.path.relpath(p, ".").replace(os.sep, "/"))
zf.close()

# 7. alignement, signature
run([f"{SDK}/zipalign", "-f", "4", "app.unsigned.apk", "app.aligned.apk"])
ks = f"{BASE}/nexus.jks"
if not os.path.exists(ks):
    run([KEYTOOL, "-genkeypair", "-keystore", ks, "-alias", "nexus", "-keyalg", "RSA",
         "-keysize", "2048", "-validity", "10000", "-storepass", "nexus2026",
         "-dname", "CN=Nexus Studio, O=Nexus Studio, C=BF"])
os.makedirs(f"{BASE}/out", exist_ok=True)
apk = f"{BASE}/out/grand-livre-{VERSION_NAME}.apk"
run([f"{SDK}/apksigner", "sign", "--ks", ks, "--ks-pass", "pass:nexus2026",
     "--ks-key-alias", "nexus", "--out", apk, "app.aligned.apk"])
run([f"{SDK}/apksigner", "verify", "--print-certs", apk])
print(f"APK PRET : {apk} ({os.path.getsize(apk)/1e6:.2f} Mo)")
