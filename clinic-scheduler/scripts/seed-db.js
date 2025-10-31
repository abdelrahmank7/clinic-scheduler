#!/usr/bin/env node
/*
  scripts/seed-db.js

  Usage examples (PowerShell):
    # Dry run to see what would be created/deleted
    node ./scripts/seed-db.js --serviceAccount ./serviceAccount.json --mode dry-run

    # Seed only (create sample clients/packages)
    node ./scripts/seed-db.js --serviceAccount ./serviceAccount.json --mode seed

    # Reset (delete primary collections) - requires --confirm true
    node ./scripts/seed-db.js --serviceAccount ./serviceAccount.json --mode reset --confirm true

    # Reset and then seed (delete then recreate)
    node ./scripts/seed-db.js --serviceAccount ./serviceAccount.json --mode reset-and-seed --confirm true

  Notes:
  - You must provide a Firebase service account JSON path via --serviceAccount.
  - The script uses the Admin SDK and performs destructive deletes in reset mode. Always run with --dry-run first.
*/

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val =
        args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
      out[key] = val;
      if (val !== true) i++;
    }
  }
  return out;
}

const argv = parseArgs();
const serviceAccountPath = argv.serviceAccount;
const mode = argv.mode || "dry-run";
const confirm = argv.confirm === "true" || argv.confirm === true;
const limit = parseInt(argv.limit || "0", 10) || 0;

if (!serviceAccountPath) {
  console.error("Missing --serviceAccount path to service account JSON.");
  process.exit(1);
}

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Service account file not found:", serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function deleteCollection(collectionPath, batchSize = 500) {
  console.log(
    `Deleting collection ${collectionPath} in batches of ${batchSize}...`
  );
  let totalDeleted = 0;
  while (true) {
    const snapshot = await db.collection(collectionPath).limit(batchSize).get();
    if (snapshot.size === 0) break;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;
    console.log(`Deleted ${snapshot.size} documents from ${collectionPath}...`);
  }
  console.log(
    `Finished deleting ${totalDeleted} documents from ${collectionPath}.`
  );
}

async function seedData() {
  const clients = [
    {
      name: "Test Client A",
      phoneNumber: "000-000-0000",
      remainingSessions: 4,
    },
    {
      name: "Test Client B",
      phoneNumber: "111-111-1111",
      remainingSessions: 2,
    },
  ];

  const packages = [
    { name: "Starter 4-pack", sessions: 4, price: 200 },
    { name: "Mini 2-pack", sessions: 2, price: 120 },
  ];

  console.log("Seeding sample clients and package appointments...");
  const clientRefs = [];
  const batch = db.batch();

  for (const c of clients) {
    const ref = db.collection("clients").doc();
    clientRefs.push({ ref, data: c });
    batch.set(ref, {
      ...c,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // Commit clients first
  await batch.commit();
  console.log(`Created ${clientRefs.length} client docs.`);

  // Create package appointment docs as source packages
  const pkgBatch = db.batch();
  let createdPkgs = [];
  for (let i = 0; i < clientRefs.length; i++) {
    const client = clientRefs[i];
    const pkg = packages[i % packages.length];
    const apptRef = db.collection("appointments").doc();
    const apptData = {
      clientId: client.ref.id,
      clientName: client.data.name,
      isPackage: true,
      packageName: pkg.name,
      packageSessions: pkg.sessions,
      sessionsPaid: client.data.remainingSessions || pkg.sessions,
      paymentStatus: "paid",
      packageId: `pkg-${i}`,
      amount: pkg.price,
      createdAt: FieldValue.serverTimestamp(),
    };
    pkgBatch.set(apptRef, apptData);
    createdPkgs.push({ ref: apptRef, data: apptData });
  }

  await pkgBatch.commit();
  console.log(`Created ${createdPkgs.length} package appointment docs.`);

  // Optionally create a sample appointment that consumes a package session
  const sampleApptRef = db.collection("appointments").doc();
  await sampleApptRef.set({
    clientId: clientRefs[0].ref.id,
    clientName: clientRefs[0].data.name,
    title: "Nutrition",
    start: new Date(),
    end: new Date(Date.now() + 30 * 60 * 1000),
    isPackage: true,
    sourcePackageAppointmentId: createdPkgs[0].ref.id,
    sessionsPaid: 1,
    paymentStatus: "paid",
    amount: packages[0].price / packages[0].sessions,
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log("Seed complete.");
  return {
    clients: clientRefs.map((c) => c.ref.id),
    packages: createdPkgs.map((p) => p.ref.id),
    sampleAppointment: sampleApptRef.id,
  };
}

async function run() {
  console.log("Seed/Reset script starting. Mode:", mode);

  if (mode === "dry-run") {
    console.log(
      "Dry-run: no changes will be written. Use mode=seed or reset with --confirm true to apply."
    );
    console.log(
      "Planned actions: create 2 clients, create 2 package appointment docs, create 1 sample consumed appointment."
    );
    return;
  }

  if (mode === "reset" || mode === "reset-and-seed") {
    if (!confirm) {
      console.error("Reset mode requires --confirm true to proceed. Aborting.");
      process.exit(2);
    }

    // Collections to delete
    const collections = ["payments", "appointments", "clients", "refunds"];
    for (const col of collections) {
      await deleteCollection(col);
    }
  }

  if (mode === "seed" || mode === "reset-and-seed") {
    const result = await seedData();
    console.log("Seed result:", result);
  }

  console.log("Script finished.");
}

run().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
