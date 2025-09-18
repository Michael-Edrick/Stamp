import { NextRequest, NextResponse } from "next/server";
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

// Correctly initialize the client using a Configuration object as per SDK v2 requirements.
const config = new Configuration({
    apiKey: process.env.NEYNAR_API_KEY!,
});
const neynarClient = new NeynarAPIClient(config);


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  if (!process.env.NEYNAR_API_KEY) {
    console.error("NEYNAR_API_KEY is not set");
    return NextResponse.json(
      { error: "Internal server configuration error" },
      { status: 500 }
    );
  }

  try {
    const response = await neynarClient.searchUser({ q: query!, limit: 5 });
    const users = response.result.users;

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error searching Farcaster users:", error);
    return NextResponse.json(
      { error: "Failed to search for users" },
      { status: 500 }
    );
  }
}
