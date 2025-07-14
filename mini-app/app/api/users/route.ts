import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { username, name, bio, image, price, refundWindow } = body;

    // Optional: Add validation for the input here

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username,
        name,
        bio,
        image,
        price,
        refundWindow,
      },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error: any) {
    // Handle potential errors, e.g., unique constraint violation for username
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }
    console.error("Error updating user profile:", error);
    return NextResponse.json({ error: "An error occurred while updating the profile." }, { status: 500 });
  }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user, { status: 200 });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return NextResponse.json({ error: "An error occurred while fetching the profile." }, { status: 500 });
    }
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      // You can add ordering, filtering, etc. here if needed
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
} 