/**
 * One-shot migration for renamed department labels.
 *
 * `users/{uid}.department` stores the raw display string from
 * SCHOOL_DEPARTMENTS, so renaming a label in the constant orphans every
 * existing document. This realigns them.
 *
 * Idempotent: it only touches documents still holding an old label, so
 * re-running it after a successful pass is a no-op.
 *
 * Usage (needs GOOGLE_APPLICATION_CREDENTIALS pointing at a service account):
 *   npm run migrate:departments             # dry run, prints what would change
 *   npm run migrate:departments -- --apply  # writes
 */
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/** old label -> new label */
const RENAMES: Record<string, string> = {
  "Servicios Generales (Cocina/Mantenimiento)":
    "Servicios Generales (Cocina/Mantenimiento/Baños)",
};

const FIRESTORE_BATCH_LIMIT = 500;

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");

  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  const snap = await db.collection("users").get();
  const pending = snap.docs.filter((doc) => {
    const department = doc.data().department;
    return typeof department === "string" && department in RENAMES;
  });

  if (pending.length === 0) {
    console.log("Nothing to migrate — no user holds an outdated department.");
    return;
  }

  console.log(`${pending.length} user(s) to update:\n`);
  for (const doc of pending) {
    const from = doc.data().department as string;
    console.log(`  ${doc.id}\n    ${from}\n    -> ${RENAMES[from]}\n`);
  }

  if (!apply) {
    console.log("Dry run — nothing written. Re-run with --apply to commit.");
    return;
  }

  for (let i = 0; i < pending.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = pending.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = db.batch();
    for (const doc of chunk) {
      const from = doc.data().department as string;
      batch.update(doc.ref, { department: RENAMES[from] });
    }
    await batch.commit();
  }

  console.log(`Updated ${pending.length} user(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
