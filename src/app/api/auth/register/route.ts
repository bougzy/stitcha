import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { registerSchema } from "@/lib/validations";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input";
      return NextResponse.json(
        { success: false, error: firstError },
        { status: 400 }
      );
    }

    const { name, email, phone, password, businessName } = parsed.data;

    await connectDB();

    // Check if email already exists
    const existingDesigner = await Designer.findOne({
      email: email.toLowerCase(),
    });

    if (existingDesigner) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create designer
    const designer = await Designer.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword,
      businessName: businessName.trim(),
    });

    // Generate verification token and send verification email
    const verificationToken = crypto.randomBytes(32).toString("hex");
    designer.verificationToken = verificationToken;
    await designer.save();
    await sendVerificationEmail(designer.email, designer.name, verificationToken);

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        data: {
          id: designer._id.toString(),
          name: designer.name,
          email: designer.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
