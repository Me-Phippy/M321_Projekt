# Pixelboard Applikation - M231/M321 Projekt

## Übersicht

Next.js Web-Applikation zur Darstellung und Interaktion mit einem Pixelboard über eine REST API.

## Features ✨

- ✅ **Sequentielle & Parallele Pixel-Abfrage** mit Zeitvergleich
- ✅ **Graphische Darstellung** des 16x16 Pixelboards
- ✅ **Interaktive Pixel** - Klick auf Pixel zeigt Koordinaten und RGB-Werte
- ✅ **Error Handling** mit pink-markierten Fehlerpixeln bei Rate-Limiting
- ✅ **Umgebungskonfiguration** für lokale Entwicklung und Produktion
- ✅ **Textdarstellung** aller Pixeldaten (aufklappbar)

## Installation

### Voraussetzungen

- Node.js (v18 oder höher)
- Docker (für lokalen API Server)

### Projekt Setup

```bash
cd paduk_game
npm install
```

### Umgebungsvariablen

Erstellen Sie eine `.env.local` Datei:

```env
# Lokale Entwicklung
API_URL=http://localhost:5085

# Für Produktion
# API_URL=https://edu.jakobmeier.ch
```

## Entwicklung

### Lokaler API Server starten

1. edu-pixelboard Repository klonen:

   ```bash
   git clone https://github.com/jakmeier/edu-pixelboard.git
   cd edu-pixelboard
   git checkout no-auth
   ```

2. Docker Compose starten:

   ```bash
   docker compose up
   ```

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
