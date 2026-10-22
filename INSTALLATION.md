# EINSATZDIALOG 0.11 – Visueller Seitenbaukasten

**Wichtig: Keine vorhandenen Dateien ersetzen oder löschen.** Das Paket enthält nur neue Dateien und SQL. Deine aktuellen Änderungen an `admin.html`, `index.html` und `design.css` bleiben erhalten.

## Schritt 1 – Supabase

Im Supabase-Projekt den **SQL Editor** öffnen, Inhalt von `SETUP_LAYOUT.sql` in eine neue Abfrage kopieren und ausführen.

## Schritt 2 – Dateien hochladen

Diese **fünf Dateien** direkt ins Hauptverzeichnis des GitHub-Repositorys `einsatzdialog.` hochladen:

- `layout-editor.html`
- `layout-editor.css`
- `layout-editor.js`
- `public-layout.css`
- `public-layout.js`

Die SQL-Datei und diese Anleitung gehören **nicht** auf die öffentliche Webseite.

## Schritt 3 – Zwei Ergänzungen in index.html

Im `<head>`, gleich hinter dem bestehenden `public-design.css`-Link, einfügen:

```html
<link rel="stylesheet" href="./public-layout.css?v=011">
```

Vor dem bestehenden `<script src="./app.js?v=09"></script>` einfügen:

```html
<script src="./public-layout.js?v=011"></script>
```

Die Reihenfolge muss so sein, dass `cms-config.js` **vor** `public-layout.js` geladen wird und `app.js` **danach**.

## Schritt 4 – Link im Adminbereich

In `admin.html` die vorhandene Verknüpfung `Website gestalten` suchen und direkt dahinter ergänzen:

```html
<a href="./layout-editor.html" class="back" style="color:#000000 !important;">▦ Seitenbaukasten</a>
```

Der Link liegt damit in der Leiste neben `Website gestalten`.

## Schritt 5 – Testen

1. In `admin.html` anmelden.
2. `layout-editor.html` öffnen.
3. Unter "Themenauswahl gestalten" **Aufklappbare, scrollbare Liste** wählen.
4. Vor dem Speichern die Live-Vorschau prüfen.
5. **Layout veröffentlichen** klicken.
6. Öffentliche Seite in neuem privaten Fenster öffnen; Thema aufklappen und wählen.
7. Prüfen, dass die Auswahl im Training erhalten bleibt und der Überraschungsfall weiterhin funktioniert.

## Grenzen dieser Version

- Der Baustein-Editor ist zunächst auf die **Trainingsauswahlseite** begrenzt.
- In `layout-editor.html` können Bausteine per Drag-and-drop am Desktop und per Pfeiltasten/Buttons auch am iPad bewegt werden.
- Die Vorschau ist schematisch, nicht pixelgenau.
- Neue Funktionen, frei verschiebbare Elemente **innerhalb** von Bausteinen und andere Screens sind noch keine Funktionen dieses Releases.
- Die Datenbankrechte sind für Administratoren durch Supabase-RLS geschützt; der öffentliche Browser darf die Layout-Einstellungen nur lesen.

## Rückgängig machen

Im Seitenbaukasten wieder "Kacheln (wie bisher)" und die ursprüngliche Reihenfolge auswählen und speichern. Bei Störungen lassen sich die beiden neuen Referenzen in `index.html` entfernen, ohne eine der vorhandenen Datenbanken zu verändern.
