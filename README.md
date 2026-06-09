# LeadFlow Dashboard

Responsives Lead-Management-Dashboard mit React, Vite und Firebase Realtime Database.

## Lokal starten

```bash
npm install
npm run dev
```

## Firebase vorbereiten

1. In der Firebase Console unter **Authentication > Sign-in method** den Anbieter **Anonymous** aktivieren.
2. Die Realtime Database erstellen.
3. Firebase CLI installieren und die abgesicherten Rules deployen:

```bash
npm install -g firebase-tools
firebase login
firebase use sixydashy
firebase deploy --only database
```

Die Rules speichern Leads getrennt je anonymer Benutzer-ID. Für ein gemeinsames Team-Dashboard sollte später E-Mail-/Google-Login mit Rollen ergänzt werden.

## Vercel Deployment

Das Repository mit GitHub verbinden und in Vercel alle Variablen aus `.env.example` unter **Project Settings > Environment Variables** setzen.

Firebase-Web-Konfigurationswerte mit `VITE_`-Prefix werden beim Build in den Browser-Code eingebettet. Sie sind keine geheimen Server-Keys. Der Zugriff wird durch Authentication und `database.rules.json` geschützt. `.env.local` bleibt durch `.gitignore` außerhalb von Git.
