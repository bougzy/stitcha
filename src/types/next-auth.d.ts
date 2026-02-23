import type { DefaultSession } from "next-auth";
import type { DesignerRole } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: DesignerRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: DesignerRole;
  }
}
