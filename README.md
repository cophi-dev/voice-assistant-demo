# KI-Telefonassistent Demo

Interaktive Demo eines KI-Telefonassistenten für Kleinunternehmen. Nutzer können im Browser Testanrufe mit verschiedenen Demo-Unternehmen tätigen.

## Features

- **3 Demo-Unternehmen:** Zahnarztpraxis, Friseursalon, Handwerkerbetrieb
- **Browser-basierte Telefonate:** Direkt im Browser mit Mikrofon sprechen
- **Echtzeit-Transkription:** Sehen Sie das Gespräch live als Text
- **Mehrsprachig:** Versteht Deutsch und Englisch
- **Powered by Grok Voice:** Nutzt die xAI Speech-to-Speech API

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Voice API:** xAI Grok Voice (WebSocket, Speech-to-Speech)
- **Validation:** Zod

## Benötigte API Keys

### xAI API Key

1. Besuche https://console.x.ai/
2. Erstelle einen Account oder logge dich ein
3. Gehe zu "API Keys" und erstelle einen neuen Key
4. Kopiere den Key in deine `.env.local` Datei

```bash
XAI_API_KEY=xai-xxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Kosten:** Die Grok Voice API kostet $0.05 pro Minute.

## Installation

```bash
# Repository klonen
git clone https://github.com/cophi-dev/voice-assistant-demo.git
cd voice-assistant-demo

# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env.local
# Dann XAI_API_KEY in .env.local eintragen

# Development Server starten
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

## Projektstruktur

```
src/
├── app/
│   ├── api/
│   │   └── session/
│   │       └── route.ts      # Ephemeral Token Endpoint
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx              # Hauptseite
├── components/
│   ├── BusinessCard.tsx      # Unternehmens-Karte
│   └── VoiceCall.tsx         # Anruf-Interface
└── lib/
    ├── config/
    │   └── businesses.ts     # Demo-Unternehmen Konfiguration
    └── voice/
        └── grok-voice-client.ts  # WebSocket Voice Client
```

## Deployment

### Vercel (empfohlen)

1. Importiere das Repository auf vercel.com/new
2. Setze die Umgebungsvariable `XAI_API_KEY`
3. Deploy!

## Lizenz

MIT

## Credits

- [xAI Grok Voice API](https://x.ai/api/voice)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)