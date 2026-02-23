import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { Order } from "@/lib/models/order";
import { clientSchema } from "@/lib/validations";

/* -------------------------------------------------------------------------- */
/*  GET /api/clients/[id]                                                     */
/*  Get a single client by ID (must belong to the authenticated designer)     */
/* -------------------------------------------------------------------------- */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;
    const { id } = await params;

    await connectDB();

    const client = await Client.findOne({ _id: id, designerId }).lean();

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: JSON.parse(JSON.stringify(client)),
    });
  } catch (error) {
    console.error("GET /api/clients/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT /api/clients/[id]                                                     */
/*  Update a client's details                                                 */
/* -------------------------------------------------------------------------- */

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;
    const { id } = await params;
    const body = await request.json();

    await connectDB();

    // Build update object - support both validated client fields and direct field updates
    const updateData: Record<string, unknown> = {};

    // If body has standard client fields, validate them
    if (body.name || body.phone || body.gender) {
      const parsed = clientSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation failed",
            details: parsed.error.issues,
          },
          { status: 400 }
        );
      }
      Object.assign(updateData, parsed.data);
    }

    // Allow updating scanLink directly
    if (body.scanLink !== undefined) {
      updateData.scanLink = body.scanLink;
    }

    // Allow updating notes directly
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const client = await Client.findOneAndUpdate(
      { _id: id, designerId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Client updated successfully",
      data: JSON.parse(JSON.stringify(client)),
    });
  } catch (error) {
    console.error("PUT /api/clients/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE /api/clients/[id]                                                  */
/*  Delete a client and their related orders                                  */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;
    const { id } = await params;

    await connectDB();

    // Verify ownership
    const client = await Client.findOne({ _id: id, designerId });

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      );
    }

    // Delete related orders and then the client
    await Promise.all([
      Order.deleteMany({ clientId: id }),
      Client.deleteOne({ _id: id }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Client and related orders deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/clients/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
