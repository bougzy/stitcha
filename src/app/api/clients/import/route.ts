import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";

/* -------------------------------------------------------------------------- */
/*  POST /api/clients/import                                                   */
/*  Bulk import clients from CSV data                                          */
/* -------------------------------------------------------------------------- */

interface CsvRow {
  name: string;
  phone: string;
  email?: string;
  gender?: string;
  notes?: string;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;
    const { rows } = (await request.json()) as { rows: CsvRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No data to import" },
        { status: 400 }
      );
    }

    if (rows.length > 200) {
      return NextResponse.json(
        { success: false, error: "Maximum 200 clients per import" },
        { status: 400 }
      );
    }

    await connectDB();

    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.name?.trim();
      const phone = row.phone?.trim();

      if (!name || !phone) {
        results.errors.push(`Row ${i + 1}: Missing name or phone`);
        results.skipped++;
        continue;
      }

      // Check for duplicate phone within same designer
      const existing = await Client.findOne({ designerId, phone });
      if (existing) {
        results.errors.push(`Row ${i + 1}: "${name}" — phone already exists`);
        results.skipped++;
        continue;
      }

      const gender =
        row.gender?.toLowerCase() === "male" ? "male" : "female";

      await Client.create({
        designerId,
        name,
        phone,
        email: row.email?.trim() || undefined,
        gender,
        notes: row.notes?.trim() || undefined,
      });

      results.imported++;
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("POST /api/clients/import error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
