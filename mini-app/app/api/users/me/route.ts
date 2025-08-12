import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

console.log("API route file for /api/users/me loaded.");

export async function GET(req: NextRequest) {
  console.log("GET /api/users/me handler started.");
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('walletAddress');

  console.log(`Received walletAddress: ${walletAddress}`);

  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
  }

  try {
    console.log("Attempting to find user by walletAddress...");
    const user = await prisma.user.findUnique({
      where: {
        walletAddress: walletAddress.toLowerCase(),
      },
    });
    console.log("Finished find user by walletAddress. User found:", !!user);


    if (!user) {
      console.log("User not found by walletAddress. Attempting to find by custodyAddress...");
      const userByCustody = await prisma.user.findUnique({
        where: {
          custodyAddress: walletAddress.toLowerCase(),
        }
      });
      console.log("Finished find user by custodyAddress. User found:", !!userByCustody);

      if (!userByCustody) {
        console.log("User not found by either address. Returning 404.");
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      console.log("User found by custodyAddress. Returning user data.");
      return NextResponse.json(userByCustody);
    }
    console.log("User found by walletAddress. Returning user data.");
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error in GET /api/users/me:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, ...updateData } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress is required for updates" }, { status: 400 });
    }

    // Ensure tags are handled as an array
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    const updatedUser = await prisma.user.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: updateData,
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error: unknown) {
    console.error("Error updating user profile:", error);
     if (error instanceof Error && 'code' in error && error.code === 'P2002' && error.message.includes('username')) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "An error occurred while updating the profile." },
      { status: 500 }
    );
  }
} 