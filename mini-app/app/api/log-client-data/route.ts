import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("EVIDENCE FROM CLIENT (useMiniKit object):", JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true, message: "Log received" });
  } catch (error) {
    console.error("Error logging client data:", error);
    return NextResponse.json({ success: false, message: "Failed to log data" }, { status: 500 });
  }
}
