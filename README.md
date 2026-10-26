# Drinking Leaderboard 🍺🎃

Classifica live per le serate con gli amici: ognuno segna dal telefono cosa beve, la classifica si aggiorna in tempo reale (anche su una TV con `/tv`).

## Come funziona

- **Giocatori: basta il nome.** Niente password: si scrive il proprio nome e si entra. Usando sempre lo stesso nome si ritrovano i propri drink. Se c'è un evento in corso si viene iscritti in automatico.
- **Admin: password.** Dal link "🔐 Area admin" in fondo alla schermata d'ingresso. L'admin:
  - crea un **nuovo evento** (nome, tema, chiusura automatica opzionale). Il nuovo evento chiude quello in corso (con podio finale) e **riparte da zero**: punti, posizioni e classifica della home sono per evento;
  - può spuntare **"Azzera anche lo storico"** per cancellare eventi passati, drink, sfide e classifica di sempre (i giocatori restano);
  - gestisce giocatori e catalogo drink, esporta un evento in CSV/JSON, copia il link della modalità TV.

## Punteggi

Tutti i drink usano la stessa formula: **1 punto ogni 4 g di alcol puro** (`ml × gradazione × 0,789 / 4`, minimo 1). Una "unità alcolica" (12 g) vale quindi 3 punti; gli analcolici (acqua, mocktail, birra 0.0) valgono 0 ma si possono segnare.
I punti li calcola sempre il server dal catalogo: anche i drink aggiunti dall'admin vengono calcolati con la formula.

Esempi: Radler 1 · Spritz 3 · Pinta 5 · Gin Tonic 4 · Negroni 5 · Shot vodka 3 · Long Island 8.

## Tema Halloween 🎃

Si attiva scegliendo il tema "Halloween" quando si crea l'evento (senza evento, dal 20 ottobre al 2 novembre l'app è già a tema).

- Grafica spettrale: zucca e viola, luna, pipistrelli, ragno, nebbia, font horror.
- **Pozioni di Halloween** nel menu con nomi a tema e, sotto, cos'è davvero il drink (es. Sangue di Vampiro → Bloody Mary), con punti calcolati dalla stessa formula.
- **🚪 Dolcetto o Scherzetto** (ogni 30 minuti): 🍬 dolcetto +2, 👻 scherzetto (una prova scema: +3 se la fai) o, raramente, 🧛 morso del vampiro (rubi 2 punti a chi è in testa).
- **🧟 Miglior costume**: si vota dall'app, il vincitore compare sul podio finale e in TV.
- **Easter egg**: toccare 5 volte il logo fa "BOO!"; tra mezzanotte e 00:13 è l'ora delle streghe e la luna diventa rossa.
- Achievement a tema.

## Variabili d'ambiente

| Variabile | Obbligatoria | A cosa serve |
|---|---|---|
| `REDIS_URL` | in produzione | Database (Redis). In sviluppo, se manca, si usa un archivio in memoria. |
| `JWT_SECRET` | in produzione | Firma dei cookie di sessione. |
| `ADMIN_PASSWORD` | consigliata | Password admin. Se manca, il primo che apre "Area admin" sceglie la password. |
| `BLOB_READ_WRITE_TOKEN` | per le foto | Vercel Blob, per foto profilo e foto dell'evento. |

## Sviluppo

```bash
npm install
npm run dev
```

Apri http://localhost:3000 (giocatori/admin) e http://localhost:3000/tv (schermo condiviso).
