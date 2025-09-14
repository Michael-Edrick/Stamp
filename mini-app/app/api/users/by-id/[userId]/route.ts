import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * API endpoint to fetch a user's profile by their database ID.
 * This is the correct, platform-agnostic way to get user data.
 * It relies exclusively on our internal database.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return the user's public profile data.
    return NextResponse.json({
      id: user.id,
      fid: user.fid,
      username: user.username,
      name: user.name,
      image: user.image,
    });

  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
