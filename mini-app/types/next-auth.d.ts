import "next-auth";

declare module "next-auth" {
  /**
   * Extends the built-in session.user object to include the user's CUID.
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  /**
   * Extends the built-in user object.
   */
  interface User {
    id: string;
  }
} 