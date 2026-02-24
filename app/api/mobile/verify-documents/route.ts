// POST /api/mobile/verify-documents — Independent AI verification of generated documents
// Uses Claude Sonnet via OpenRouter as a "second brain" to review documents
// Checks each field against raw evidence, flags inconsistencies and unsupported fields
// Protected by API key authentication

// Allow up to 60 seconds for AI document verification
export const maxDuration = 60;

import { authenticateRequest } from "@/lib/mobile-auth";
import { verifyDocuments } from "@/lib/ai/verify";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Delegate to shared verification logic
    const result = await verifyDocuments(sessionId, auth.technician.id);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Verify documents error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Document verification failed",
      },
      { status: 500 }
    );
  }
}
