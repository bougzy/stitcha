/**
 * Migration: add-measurement-fields
 *
 * Adds new measurement fields (underBust, roundArm, blouseLength, fullLength,
 * halfLength, halfSleeve, crotchLength, shoulderToBust, shoulderToHip) and
 * AI metadata fields (confidenceScores, aiEstimatedFields, manualOverrides)
 * to existing client measurement records.
 *
 * All new fields are optional — existing records are NOT modified automatically.
 * MongoDB's flexible schema handles missing fields as `undefined` gracefully.
 *
 * Run once after deploying:
 *   npx ts-node --project tsconfig.json src/lib/migrations/add-measurement-fields.ts
 */

import connectDB from "../db";
import { Client } from "../models/client";

export async function runMigration() {
  await connectDB();

  console.log("Migration: add-measurement-fields — starting...");

  // Count clients with existing measurements (for reporting)
  const totalWithMeasurements = await Client.countDocuments({
    measurements: { $exists: true, $ne: null },
  });

  console.log(`Found ${totalWithMeasurements} clients with measurements.`);
  console.log(
    "All new fields are optional and backward compatible — no structural changes needed."
  );
  console.log(
    "New fields will populate automatically on the next AI scan or manual save."
  );

  // Backfill source="manual" on records that are missing it
  const backfillResult = await Client.updateMany(
    {
      "measurements.source": { $exists: false },
      measurements: { $exists: true, $ne: null },
    },
    { $set: { "measurements.source": "manual" } }
  );

  if (backfillResult.modifiedCount > 0) {
    console.log(
      `Backfilled source="manual" on ${backfillResult.modifiedCount} measurement records.`
    );
  }

  // Backfill source in history arrays
  const historyBackfill = await Client.updateMany(
    { "measurementHistory.source": { $exists: false } },
    { $set: { "measurementHistory.$[].source": "manual" } }
  );

  if (historyBackfill.modifiedCount > 0) {
    console.log(
      `Backfilled source in history for ${historyBackfill.modifiedCount} clients.`
    );
  }

  console.log("Migration: add-measurement-fields — complete ✓");
}

// Run directly if called as a script
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
