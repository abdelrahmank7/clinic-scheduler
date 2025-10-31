Seed & Reset scripts

This folder contains scripts to seed or reset your Firestore data for local testing. They use the Firebase Admin SDK and require a service account JSON.

Files

- seed-db.js: creates sample clients and package appointment docs, or resets (deletes) collections.

Usage (PowerShell)

1. Dry-run (no changes):

```powershell
node ./scripts/seed-db.js --serviceAccount ./serviceAccount.json --mode dry-run
```

2. Seed only:

```powershell
node ./scripts/seed-db.js --serviceAccount ./serviceAccount.json --mode seed
```

3. Reset (destructive) - requires confirmation:

```powershell
node ./scripts/seed-db.js --serviceAccount ./serviceAccount.json --mode reset --confirm true
```

4. Reset and seed:

```powershell
node ./scripts/seed-db.js --serviceAccount ./serviceAccount.json --mode reset-and-seed --confirm true
```

Safety tips

- Always run with `--mode dry-run` first and review the planned actions.
- Back up your production data before running reset in a live project.
- Run against a dev/test Firebase project.

Notes

- The script uses server-side deletes and batched writes; for very large collections consider using `gcloud` or Firestore export/import tools.
