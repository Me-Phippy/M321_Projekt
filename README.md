# Pixelboard Applikation - M231/M321 Projekt

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Architektur](#architektur)
- [Features](#features)
- [Installation](#installation)
- [Docker Setup](#docker-setup)
- [Entwicklung](#entwicklung)
- [Umgebungskonfiguration](#umgebungskonfiguration)
- [API Dokumentation](#api-dokumentation)
- [Projekt Struktur](#projekt-struktur)
- [Milestone 1 Anforderungen](#milestone-1-anforderungen)

## 📖 Übersicht

Diese Next.js Web-Applikation demonstriert ein verteiltes System bestehend aus Frontend und Backend-Komponenten, die mit einem Pixelboard-API kommunizieren. Das Projekt wurde im Rahmen des Moduls M231/M321 entwickelt.

### Was ist Frontend und Backend?

**Backend** (Server-Side):

- Läuft auf einem Webserver (Next.js API Routes)
- Führt HTTP-Anfragen an die externe API durch
- Verarbeitet und transformiert Daten
- Kann Hintergrundprozesse ausführen
- Code wird auf dem Server ausgeführt

**Frontend** (Client-Side):

- Läuft im Browser des Benutzers
- Rendert HTML/CSS und führt JavaScript aus
- Interagiert mit dem DOM (Document Object Model)
- Wird nur ausgeführt, wenn die Webseite geöffnet ist
- Kommuniziert mit dem Backend über API-Aufrufe

## 🏗️ Architektur

```
┌─────────────────┐
│    Browser      │
│   (Frontend)    │  ← React/Next.js UI
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│   Next.js API   │
│   (Backend)     │  ← Server-Side Logic
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Pixelboard API │
│  (Docker/Cloud) │  ← External API
└─────────────────┘
```

## ✨ Features

### Implementiert (Milestone 1)

- ✅ **HTTP API-Aufrufe** - Backend kommuniziert mit Pixelboard API
- ✅ **Sequentielle Pixel-Abfrage** - Ein Pixel nach dem anderen (Zeitmessung)
- ✅ **Parallele Pixel-Abfrage** - Alle Pixels gleichzeitig mit `Promise.all()` (Zeitmessung)
- ✅ **Performance-Vergleich** - Automatische Zeitmessung beider Methoden
- ✅ **Error Handling** - HTTP Status Codes & Body werden geloggt
- ✅ **Rate-Limiting Behandlung** - Pink-markierte Pixels bei Fehlern (RGB: 255,0,255)
- ✅ **Graphische Darstellung** - 16x16 Pixelboard mit CSS Grid
- ✅ **Interaktive Pixels** - Klick zeigt X/Y Koordinaten und RGB-Werte
- ✅ **Textdarstellung** - Aufklappbare Liste aller Pixeldaten
- ✅ **Docker Integration** - Lokaler API Server für Entwicklung
- ✅ **Umgebungskonfiguration** - Einfacher Wechsel zwischen lokal/Produktion

### Geplant (Milestone 2)

- [ ] Pixel über API setzen (POST Endpoint)
- [ ] Authentifizierung integrieren
- [ ] Team-Verwaltung

## 🚀 Installation

### Voraussetzungen

- **Node.js** v18 oder höher ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/))
- **Git** (optional, für Repository-Klonen)

### Projekt Setup

```bash
# Repository klonen (falls noch nicht geschehen)
git clone <repository-url>
cd M321_Projekt/paduk_game

# Dependencies installieren
npm install
```

### Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env.local` Datei im Root-Verzeichnis:

```env
# Lokale Entwicklung (Docker)
API_URL=http://localhost:5085

# Für Produktion (später)
# API_URL=https://edu.jakobmeier.ch
```

**Wichtig:** Die `.env.local` Datei wird nicht ins Git committed!

## 🐳 Docker Setup

### Lokalen API Server einrichten

Der lokale API Server bietet folgende Vorteile:

- ✅ Unabhängig von produktivem System
- ✅ Zugriff auf Server-Logs für Debugging
- ✅ Keine Rate-Limiting Probleme durch geteilte Ressourcen
- ✅ Sicheres Testen ohne Produktiv-Daten zu beeinflussen

### Schritt-für-Schritt Anleitung

**1. edu-pixelboard Repository herunterladen**

Option A - Mit Git (empfohlen):

```bash
cd C:\Users\<username>\Desktop\Module\M231
git clone https://github.com/jakmeier/edu-pixelboard.git
cd edu-pixelboard
git checkout no-auth
```

Option B - ZIP Download:

- Download: https://github.com/jakmeier/edu-pixelboard/archive/refs/heads/no-auth.zip
- Entpacken nach: `C:\Users\<username>\Desktop\Module\M231\edu-pixelboard`

**2. Docker Container starten**

```bash
cd C:\Users\<username>\Desktop\Module\M231\edu-pixelboard
docker compose up
```

**Warten bis alle Container gestartet sind:**

```
✔ Container edu-pixelboard-db-1       Started
✔ Container edu-pixelboard-keycloak-1 Started
✔ Container edu-pixelboard-app-1      Started
```

**3. Pixelboard initialisieren**

1. Browser öffnen: http://localhost:5085/Admin
2. Button **"Start Game"** klicken
3. Buntes Pixelboard sollte erscheinen

**4. API testen**

Öffne: http://localhost:5085/api/color/0/0

Erwartete Antwort:

```json
{
  "Red": 123,
  "Green": 45,
  "Blue": 67
}
```

### Docker Befehle

```bash
# Im Hintergrund starten
docker compose up -d

# Logs anzeigen
docker compose logs
docker compose logs -f  # Follow mode

# Container stoppen
docker compose down

# Container neu starten
docker compose restart

# Status prüfen
docker compose ps
```

## 💻 Entwicklung

### Development Server starten

**Terminal 1** - Docker (laufen lassen):

```bash
cd C:\Users\<username>\Desktop\Module\M231\edu-pixelboard
docker compose up
```

**Terminal 2** - Next.js (separates Terminal):

```bash
cd C:\Users\<username>\Desktop\Module\M231\M321_Projekt\paduk_game
npm run dev
```

Applikation läuft auf: **http://localhost:3000**

### Build für Produktion

```bash
npm run build
npm run start
```

## 🔧 Umgebungskonfiguration

### Zwischen Umgebungen wechseln

Bearbeite `.env.local`:

**Lokale Entwicklung (Docker):**

```env
API_URL=http://localhost:5085
```

**Produktion (Online API):**

```env
API_URL=https://edu.jakobmeier.ch
```

**Nach Änderung:**

1. Dev-Server stoppen (Ctrl+C)
2. Neu starten: `npm run dev`

### Warum Umgebungskonfiguration?

- **Sicherheit** - Nie mit Produktionsdaten während Entwicklung arbeiten
- **Flexibilität** - Einfacher Wechsel zwischen Testumgebungen
- **Best Practice** - Standard in der professionellen Entwicklung
- **Debugging** - Lokale Logs bei Fehlern verfügbar

## 📚 API Dokumentation

### Verwendete Endpoints

**GET `/api/color/{x}/{y}`**

- Ruft die Farbe eines einzelnen Pixels ab
- Parameter: `x` (0-15), `y` (0-15)
- Response: `{"Red": 0-255, "Green": 0-255, "Blue": 0-255}`

**Swagger UI:**

- Lokal: http://localhost:5085/swagger
- Online: https://edu.jakobmeier.ch/swagger

### Backend API Routes

**GET `/api/pixels?method=parallel|sequential`**

- Ruft alle Pixels ab (16x16 = 256 Pixels)
- Query Parameter:
  - `method=parallel` - Alle Pixels gleichzeitig (Standard)
  - `method=sequential` - Einer nach dem anderen
- Response:

```json
{
  "pixels": [[{"x": 0, "y": 0, "color": {"red": 123, "green": 45, "blue": 67}}, ...]],
  "method": "parallel",
  "duration": 437,
  "boardSize": 16
}
```

## 📁 Projekt Struktur

```
paduk_game/
├── src/
│   ├── pages/
│   │   ├── index.tsx              # Hauptseite (Frontend)
│   │   ├── _app.tsx               # Next.js App Wrapper
│   │   ├── _document.tsx          # HTML Document Setup
│   │   └── api/
│   │       └── pixels.ts          # Backend API Route
│   ├── types/
│   │   └── pixel.ts               # TypeScript Interfaces
│   └── styles/
│       └── globals.css            # Global CSS + Pixelboard Styles
├── public/
│   └── favicon.ico                # Browser Icon
├── .env.local                     # Umgebungsvariablen (nicht im Git)
├── .env.production                # Produktions-Konfiguration
├── .env.example                   # Beispiel-Konfiguration
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript Config
└── README.md                      # Diese Datei
```

### Wichtige Dateien erklärt

**Frontend:**

- `index.tsx` - Hauptseite mit React-Komponenten
- `globals.css` - Styles für Pixelboard (CSS Grid)

**Backend:**

- `pixels.ts` - Server-Side Logic für API-Aufrufe
- Läuft auf dem Server, nicht im Browser

**Types:**

- `pixel.ts` - TypeScript Interfaces für Type Safety
- Konvertierungsfunktionen für API-Response

## ✅ Milestone 1 Anforderungen

### 3.1 HTTP Aufrufe an API

- [x] Funktion wird ausgeführt wenn Frontend geöffnet wird
- [x] HTTP Client für API-Anfragen (fetch API)
- [x] Daten von API auslesen
- [x] HTTP Status Code und Body in Konsole ausgeben
- [x] Pixelfarben werden in Backend-Konsole geloggt

### 3.2 Ganzes Pixelboard auslesen

- [x] Sequentielle Abfrage - Loop holt Pixels nacheinander
- [x] Zeitmessung für sequentielle Methode
- [x] Parallele Abfrage - Alle Pixels gleichzeitig
- [x] Zeitmessung für parallele Methode
- [x] Error Handling - HTTP Status wird überprüft
- [x] Rate-Limiting Behandlung - Fehlerhafte Pixels pink markiert
- [x] Status Code und Body bei Fehlern sichtbar

### 4.1 Daten im Frontend darstellen (Text)

- [x] Pixelfarben als Text auf Seite angezeigt
- [x] Daten vom Backend zum Frontend übertragen
- [x] Array von Pixelfarben wird angezeigt

### 4.2 Graphische Darstellung

- [x] CSS für Pixelboard hinzugefügt
- [x] `.board-container` - Grid Layout (16 Spalten)
- [x] `.pixel` - Quadrate (50x50px)
- [x] Inline CSS für Farben pro Pixel
- [x] RGB-Werte aus API-String extrahiert
- [x] Farben korrekt gesetzt (rgb(r,g,b))

### 5. Lokaler API Server

- [x] edu-pixelboard Repository heruntergeladen
- [x] Docker Compose Setup dokumentiert
- [x] Server lokal ausführbar
- [x] Admin-Seite für Initialisierung verfügbar
- [x] Client angepasst für lokale Entwicklung
- [x] Umgebungsvariablen konfiguriert
- [x] Einfacher Wechsel zwischen Test/Produktion

### 7. Code aufgeräumt

- [x] Refactoring durchgeführt
- [x] Ungenutzte Template-Dateien entfernt
- [x] Platzhalter-Text ersetzt
- [x] Kommentare aktualisiert
- [x] Funktionalität getestet
- [x] Git Commit erstellt

## 🎨 Features im Detail

### Backend (Server-Side)

**Sequentielle Abfrage:**

```typescript
for (let x = 0; x < 16; x++) {
  for (let y = 0; y < 16; y++) {
    await fetchSinglePixel(x, y); // Wartet auf jedes Pixel
  }
}
// Dauer: ~10-20 Sekunden
```

**Parallele Abfrage:**

```typescript
const promises = [];
for (let x = 0; x < 16; x++) {
  for (let y = 0; y < 16; y++) {
    promises.push(fetchSinglePixel(x, y)); // Keine Wartezeit
  }
}
await Promise.all(promises); // Alle gleichzeitig
// Dauer: ~500-1000ms (20x schneller!)
```

**Error Handling:**

```typescript
if (!response.ok) {
  console.error(`Fehler bei Pixel (${x},${y}): ${response.status}`);
  return { x, y, color: { red: 255, green: 0, blue: 255 } }; // Pink
}
```

### Frontend (Client-Side)

**Interaktivität:**

- Klick auf Pixel zeigt Koordinaten und RGB-Werte
- Hover-Effekt vergrößert Pixel
- Loading-Spinner während Daten geladen werden
- Button zum Wechsel zwischen Methoden

**CSS Grid Layout:**

```css
.board-container {
  display: grid;
  grid-template-columns: repeat(16, 50px); /* 16 Spalten */
}

.pixel {
  width: 50px;
  height: 50px;
  background-color: rgb(r, g, b); /* Inline gesetzt */
}
```

## 🐛 Debugging

### Backend Logs prüfen

Terminal wo `npm run dev` läuft:

```
API_URL: http://localhost:5085
Starte parallelen Abruf...
Paralleler Abruf dauerte 437ms
Erfolgreich 16x16 Pixels abgerufen
```

### Frontend Logs prüfen

Browser Developer Console (F12):

```javascript
console.log(pixels); // Alle Pixeldaten
```

### Docker Logs prüfen

```bash
docker compose logs
docker compose logs -f  # Follow mode
docker compose logs app  # Nur API Server
```

### Häufige Probleme

**Problem:** Alle Pixels sind pink

- **Lösung:** Docker Server nicht gestartet oder "Start Game" nicht geklickt

**Problem:** API_URL nicht gefunden

- **Lösung:** `.env.local` Datei erstellt? Server neu gestartet?

**Problem:** Port 3000 belegt

- **Lösung:** Next.js nutzt automatisch Port 3001

## 📊 Performance

**Vergleich Sequentiell vs. Parallel:**

- **Sequentiell:** ~10-20 Sekunden (256 Aufrufe nacheinander)
- **Parallel:** ~500-1000ms (256 Aufrufe gleichzeitig)
- **Speedup:** ~20x schneller! 🚀

## 🔐 Sicherheit & Best Practices

- ✅ Umgebungsvariablen für API URLs
- ✅ `.env.local` nicht im Git
- ✅ Trennung Test/Produktionsumgebung
- ✅ Error Handling mit aussagekräftigen Meldungen
- ✅ TypeScript für Type Safety

## 👨‍💻 Autor

Phillip - M231/M321 Projekt (GIBZ)

## 📄 Lizenz

Schulprojekt - Alle Rechte vorbehalten
git checkout no-auth

````

2. Docker Compose starten:

```bash
docker compose up
````

3. Admin-Seite öffnen und "Start Game" klicken:
   - http://localhost:5085/Admin

### Next.js Dev Server starten

```bash
npm run dev
```

Applikation läuft auf: http://localhost:3000

## Umgebungen wechseln

### Lokale Entwicklung

In `.env.local`:

```env
API_URL=http://localhost:5085
```

### Produktion

In `.env.local`:

```env
API_URL=https://edu.jakobmeier.ch
```

## Technologie Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Next.js API Routes
- **API**: REST (edu-pixelboard)

## Projekt Struktur

```
paduk_game/
├── src/
│   ├── pages/
│   │   ├── index.tsx           # Hauptseite mit Pixelboard
│   │   └── api/
│   │       └── pixels.ts       # Backend API für Pixel-Abfragen
│   ├── types/
│   │   └── pixel.ts            # TypeScript Interfaces
│   └── styles/
│       └── globals.css         # CSS + Pixelboard Styles
├── .env.local                  # Umgebungsvariablen (nicht im Git)
├── .env.production             # Produktionsumgebung
└── .env.example                # Beispiel-Konfiguration
```

## Features im Detail

### Backend (API Routes)

- **Einzelne Pixel abrufen**: GET `/api/pixels?method=parallel`
- **Alle Pixels parallel**: Verwendet `Promise.all()` für schnellen Abruf
- **Alle Pixels sequentiell**: Loop für Vergleichszwecke
- **Zeitmessung**: Automatische Performanzmessung
- **Error Handling**: Pink (255,0,255) für fehlerhafte Pixels

### Frontend

- **Graphisches Pixelboard**: 16x16 Grid mit CSS Grid
- **Hover-Effekt**: Vergrößerung beim Überfahren
- **Click-Interaktion**: Anzeige von Position und RGB-Werten
- **Loading State**: Spinner während Daten geladen werden
- **Methodenauswahl**: Button zum Wechsel zwischen parallel/sequentiell

## Milestone 1 - Checklist ✅

- [x] HTTP Aufrufe an API
- [x] Ganzes Pixelboard auslesen (sequentiell + parallel)
- [x] Zeitmessung und Vergleich
- [x] Error Handling (Status Code + Body)
- [x] Textdarstellung im Frontend
- [x] Graphische Darstellung mit CSS
- [x] RGB-Parsing aus API-Response
- [x] Lokaler API Server Setup
- [x] Umgebungskonfiguration (lokal/produktion)
- [x] Code Aufräumen und Dokumentation

## Nächste Schritte (Milestone 2)

- [ ] Pixel über API setzen (POST Endpoints)
- [ ] Authentifizierung integrieren
- [ ] Weitere interaktive Features

## Debugging

### Backend Logs

```bash
# Terminal wo "npm run dev" läuft
# Zeigt HTTP Status, Dauer, Fehler
```

### Frontend Logs

```
Browser Developer Console (F12)
```

### Docker Logs

```bash
docker compose logs
# oder
docker compose logs -f  # Follow mode
```

## Autor

Phillip - M231/M321 Projekt

## Lizenz

Schulprojekt - GIBZ
