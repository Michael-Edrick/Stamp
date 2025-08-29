import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Workaround for the persistent params issue: parse the ID from the URL.
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const otherUserId = pathSegments.pop(); // The last segment is the userId

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loggedInUserId = session.user.id;

  if (!otherUserId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { id: loggedInUserId } } },
          { participants: { some: { id: otherUserId } } },
        ],
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            sender: true,
          },
        },
        participants: true,
      },
    });

    if (!conversation) {
      // If no conversation exists, correctly report that the resource was not found.
      // The client will handle creating a temporary conversation object for the UI.
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}