import { generateNonce } from "siwe";
import { NextResponse } from "next/server";

export async function GET() {
  const nonce = generateNonce();
  // In a real app, you would store this nonce in the user's session
  // or a temporary cache to verify it on sign-in.
  // For simplicity here, we will just return it.
  return NextResponse.json({ nonce });
} 