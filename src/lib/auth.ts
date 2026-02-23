import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "./db";
import { Designer } from "./models/designer";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          await connectDB();
        } catch (err) {
          console.error("DB connection failed in authorize:", err);
          throw new Error("Service temporarily unavailable");
        }

        const designer = await Designer.findOne({ email: credentials.email.toLowerCase() }).select(
          "+password"
        );

        if (!designer) {
          throw new Error("No account found with this email");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, designer.password);

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        return {
          id: designer._id.toString(),
          email: designer.email,
          name: designer.name,
          image: designer.avatar,
          role: designer.role || "owner",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (((user as any).role as string) || "owner") as "owner" | "manager" | "apprentice" | "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role || "owner") as "owner" | "manager" | "apprentice" | "admin";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "stitcha-app-secret-key-2024-production-ready",
  debug: process.env.NODE_ENV === "development",
};

export async function getDesignerFromSession(session: { user?: { id?: string; [key: string]: unknown } } | null) {
  if (!session?.user?.id) return null;
  await connectDB();
  const designer = await Designer.findById(session.user.id);
  return designer ? JSON.parse(JSON.stringify(designer)) : null;
}
