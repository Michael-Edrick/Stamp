import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  const walletAddress = req.headers.get('x-wallet-address');

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing x-wallet-address header' }, { status: 401 });
  }

  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const verifiedAddress = await prisma.verifiedAddress.findUnique({
      where: { address: walletAddress.toLowerCase() },
      include: { user: true },
    });
    
    if (!verifiedAddress || !verifiedAddress.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const currentUser = verifiedAddress.user;

    const messageToUpdate = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!messageToUpdate) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (messageToUpdate.senderId !== currentUser.id) {
      return NextResponse.json({ error: 'You are not authorized to edit this message' }, { status: 403 });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { content },
      include: { sender: true },
    });

    return NextResponse.json(updatedMessage, { status: 200 });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'An error occurred while updating the message' }, { status: 500 });
  }
}
