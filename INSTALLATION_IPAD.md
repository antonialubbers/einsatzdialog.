# EINSATZDIALOG 0.8.1 – Themenauswahl im Überraschungsmodus

Dieses Update baut auf Version 0.8 auf. Die Themenkacheln erscheinen nur noch bei „Thema auswählen“. Bei „Überraschungsfall“ verschwinden sie sofort. Der Schwerpunkt wird intern zufällig bestimmt und nicht durch eine vorherige Themenwahl beeinflusst. Die vorausgehenden Wissenskarten enthalten im Überraschungsmodus ausschließlich allgemeine Grundlagen.

## Installation via iPad

1. ZIP-Datei herunterladen und in der Dateien-App antippen, um sie zu entpacken.
2. GitHub-Repository `einsatzdialog.` in Safari öffnen (Reiter Code).
3. „Add file“ → „Upload files“ öffnen.
4. **Die drei Dateien** `app.js`, `index.html` und `sw.js` aus diesem ZIP auswählen (direkt ins Hauptverzeichnis, nicht in einen neuen Ordner).
5. Die bestehende gleichnamige Datei wird dabei ersetzt. „Commit changes“ bestätigen.
6. Nach erfolgreichem GitHub-Pages-Deployment EINSATZDIALOG in Safari neu laden und die installierte App neu öffnen.

Kein Cloudflare-Update, keine API-Änderung, keine neuen Zugangsdaten notwendig.

## Prüfung
- „Thema auswählen“: neun Fachthemen erscheinen.
- „Überraschungsfall“: Themenbereich verschwindet; neutraler Hinweis erscheint.
- Zurück zu „Thema auswählen“: neun Fachthemen erscheinen wieder.
- Überraschungsfall nach vorheriger Themenwahl: Thema wird intern neu zufällig gewählt.

Bei dieser Version gilt weiterhin: Echte zufällig generierte Fälle benötigen die bereits eingerichtete Cloud-KI. Ohne KI werden vorhandene Musterfälle zufällig ausgewählt.
