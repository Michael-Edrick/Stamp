import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const messages = await prisma.message.findMany({
      where: {
        conversation: {
          participants: {
            some: {
              id: session.user.id,
            },
          },
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error("Error fetching inbox:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching the inbox." },
      { status: 500 }
    );
  }
} 