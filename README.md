# LeadFlow Dashboard

Responsives Lead-Management-Dashboard mit React, Vite und Firebase Realtime Database.

## Lokal starten

```bash
npm install
npm run dev
```

## Firebase vorbereiten

1. In der Firebase Console unter **Authentication > Sign-in method** den Anbieter **Email/Password** aktivieren. **Anonymous** kann vorübergehend aktiviert bleiben, damit bestehende lokale Leads beim Registrieren mit dem neuen Konto verbunden werden.
2. Die Realtime Database erstellen.
3. Firebase CLI installieren und die abgesicherten Rules deployen:

```bash
npm install -g firebase-tools
firebase login
firebase use sixydashy
firebase deploy --only database
```

Die Rules speichern Leads getrennt je Benutzer-ID. Mit demselben E-Mail-/Passwort-Konto sind die eigenen Leads auf Desktop und Mobile verfügbar.

## Vercel Deployment

Das Repository mit GitHub verbinden und in Vercel alle Variablen aus `.env.example` unter **Project Settings > Environment Variables** setzen.

Firebase-Web-Konfigurationswerte mit `VITE_`-Prefix werden beim Build in den Browser-Code eingebettet. Sie sind keine geheimen Server-Keys. Der Zugriff wird durch Authentication und `database.rules.json` geschützt. `.env.local` bleibt durch `.gitignore` außerhalb von Git.
