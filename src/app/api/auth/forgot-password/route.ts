import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const designer = await Designer.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!designer) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, we've sent a password reset link.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    designer.resetPasswordToken = resetToken;
    designer.resetPasswordExpires = resetExpires;
    await designer.save();

    // Send password reset email
    await sendPasswordResetEmail(designer.email, designer.name, resetToken);

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, we've sent a password reset link.",
    });
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
