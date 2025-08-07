import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function isAdmin(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return false;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true }
    });

    return user?.isAdmin ?? false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

export async function requireAdmin() {
  const adminStatus = await isAdmin();
  
  if (!adminStatus) {
    throw new Error("Admin access required");
  }
  
  return true;
}

export async function checkUserBanned(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return false;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isBanned: true }
    });

    return user?.isBanned ?? false;
  } catch (error) {
    console.error("Error checking banned status:", error);
    return false;
  }
}

export async function requireNotBanned() {
  const isBanned = await checkUserBanned();
  
  if (isBanned) {
    throw new Error("User is banned");
  }
  
  return true;
} 