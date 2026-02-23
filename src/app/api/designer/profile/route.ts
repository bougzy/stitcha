import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions, getDesignerFromSession } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";

/* -------------------------------------------------------------------------- */
/*  GET /api/designer/profile                                                 */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designer = await getDesignerFromSession(session);

    if (!designer) {
      return NextResponse.json(
        { success: false, error: "Designer not found" },
        { status: 404 }
      );
    }

    // Remove sensitive fields
    const { verificationToken, resetPasswordToken, resetPasswordExpires, ...safeDesigner } = designer;
    void verificationToken;
    void resetPasswordToken;
    void resetPasswordExpires;

    return NextResponse.json({
      success: true,
      data: safeDesigner,
    });
  } catch (error) {
    console.error("GET /api/designer/profile error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT /api/designer/profile                                                 */
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

    await connectDB();

    // Handle password change
    if (body.currentPassword && body.newPassword) {
      const designer = await Designer.findById(userId).select("+password");

      if (!designer) {
        return NextResponse.json(
          { success: false, error: "Designer not found" },
          { status: 404 }
        );
      }

      const isPasswordValid = await bcrypt.compare(body.currentPassword, designer.password);

      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      if (body.newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 8 characters" },
          { status: 400 }
        );
      }

      designer.password = await bcrypt.hash(body.newPassword, 12);
      await designer.save();

      return NextResponse.json({
        success: true,
        message: "Password updated successfully",
      });
    }

    // Handle profile updates
    const allowedFields = [
      "name",
      "phone",
      "businessName",
      "businessAddress",
      "city",
      "state",
      "bio",
      "avatar",
      "specialties",
      "publicProfile",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const designer = await Designer.findByIdAndUpdate(
      userId,
      { $set: updateData },
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
      message: "Profile updated successfully",
      data: JSON.parse(JSON.stringify(designer)),
    });
  } catch (error) {
    console.error("PUT /api/designer/profile error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
