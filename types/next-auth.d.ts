import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // Add other custom properties like username, role, etc., if you have them
    } & DefaultSession["user"]; // Extends the default user properties (name, email, image)
  }

  interface User extends DefaultUser {
    // Add other custom properties that your user model might have from the database
    // e.g., username?: string | null;
    id: string; // Ensure id is part of your User model type if it's not by default
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    // Add any custom properties you add to the JWT token in your callbacks
    // e.g., userId?: string;
    // e.g., userRole?: string;
    id?: string; // if you are adding id to the JWT
  }
} 