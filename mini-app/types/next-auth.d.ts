import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Extends the built-in session.user object to include the user's CUID and fid.
   */
  interface Session {
    user: {
      id: string;
      fid?: string | null;
    } & DefaultSession["user"];
  }

  /**
   * Extends the built-in user object.
   */
  interface User {
    id: string;
    fid?: string | null;
  }
} 