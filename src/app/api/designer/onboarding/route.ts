import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { onboardingSchema } from "@/lib/validations";

/* -------------------------------------------------------------------------- */
/*  PUT /api/designer/onboarding                                               */
/* -------------------------------------------------------------------------- */

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();

    // Validate input
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input";
      return NextResponse.json(
        { success: false, error: firstError },
        { status: 400 }
      );
    }

    const { businessAddress, city, state, specialties, bio } = parsed.data;

    await connectDB();

    const designer = await Designer.findByIdAndUpdate(
      userId,
      {
        $set: {
          businessAddress: businessAddress.trim(),
          city: city.trim(),
          state: state.trim(),
          specialties,
          ...(bio && { bio: bio.trim() }),
          isOnboarded: true,
        },
      },
      { new: true, runValidators: true }
    );

    if (!designer) {
      return NextResponse.json(
        { success: false, error: "Designer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
      data: JSON.parse(JSON.stringify(designer)),
    });
  } catch (error) {
    console.error("PUT /api/designer/onboarding error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
