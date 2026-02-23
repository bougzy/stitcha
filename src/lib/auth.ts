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

        await connectDB();

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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getDesignerFromSession(session: { user?: { id?: string; [key: string]: unknown } } | null) {
  if (!session?.user?.id) return null;
  await connectDB();
  const designer = await Designer.findById(session.user.id);
  return designer ? JSON.parse(JSON.stringify(designer)) : null;
}
