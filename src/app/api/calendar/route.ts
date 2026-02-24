import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { CalendarEvent } from "@/lib/models/calendar-event";

/* -------------------------------------------------------------------------- */
/*  GET /api/calendar                                                          */
/*  Returns events for a date range, optionally filtered by type              */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const { searchParams } = new URL(request.url);

    await connectDB();

    const filter: Record<string, unknown> = { designerId };

    // Optional date range filter
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from || to) {
      filter.date = {};
      if (from) (filter.date as Record<string, unknown>).$gte = new Date(from);
      if (to) (filter.date as Record<string, unknown>).$lte = new Date(to);
    }

    // Optional type filter
    const type = searchParams.get("type");
    if (type) filter.type = type;

    const events = await CalendarEvent.find(filter)
      .sort({ date: 1 })
      .limit(100)
      .populate("orderId", "title status price garmentType")
      .lean();

    return NextResponse.json({
      success: true,
      data: { events: JSON.parse(JSON.stringify(events)) },
    });
  } catch (error) {
    console.error("GET /api/calendar error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/calendar                                                         */
/*  Create a custom event or order deadline                                   */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const body = await request.json();
    const { title, date, type, orderId, notes, color } = body;

    if (!title || !date || !type) {
      return NextResponse.json(
        { success: false, error: "title, date, and type are required" },
        { status: 400 }
      );
    }

    if (!["custom", "deadline", "owambe"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "type must be custom, deadline, or owambe" },
        { status: 400 }
      );
    }

    await connectDB();

    const event = await CalendarEvent.create({
      designerId,
      title,
      date: new Date(date),
      type,
      orderId: orderId || undefined,
      notes: notes || undefined,
      color: color || undefined,
    });

    return NextResponse.json({
      success: true,
      data: JSON.parse(JSON.stringify(event)),
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/calendar error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT /api/calendar                                                          */
/*  Update an event (pass ?id=xxx or body.id)                                 */
/* -------------------------------------------------------------------------- */

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const body = await request.json();
    const { id, title, date, notes, color } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Event id is required" }, { status: 400 });
    }

    await connectDB();

    const update: Record<string, unknown> = {};
    if (title) update.title = title;
    if (date) update.date = new Date(date);
    if (notes !== undefined) update.notes = notes;
    if (color !== undefined) update.color = color;

    const event = await CalendarEvent.findOneAndUpdate(
      { _id: id, designerId },
      { $set: update },
      { new: true }
    );

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: JSON.parse(JSON.stringify(event)),
    });
  } catch (error) {
    console.error("PUT /api/calendar error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE /api/calendar                                                        */
/*  Delete a custom event (pass ?id=xxx)                                      */
/* -------------------------------------------------------------------------- */

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Event id is required" }, { status: 400 });
    }

    await connectDB();

    const event = await CalendarEvent.findOneAndDelete({ _id: id, designerId });
    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Event deleted" });
  } catch (error) {
    console.error("DELETE /api/calendar error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
