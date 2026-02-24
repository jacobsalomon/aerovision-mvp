// Shared document verification logic — calls Claude Sonnet via OpenRouter
// Used by both the verify-documents API route and the auto-verification in generate

import { prisma } from "@/lib/db";

// Which model to use for verification — intentionally a DIFFERENT model than generation
// GPT-4o generates, Claude Sonnet verifies — independent cross-check
const VERIFICATION_MODEL =
  process.env.VERIFICATION_MODEL || "anthropic/claude-sonnet-4-20250514";

export interface VerificationResult {
  verified: boolean;
  overallConfidence: number;
  documentReviews: Array<{
    documentType: string;
    issues: Array<{
      field: string;
      issue: string;
      severity: "info" | "warning" | "critical";
    }>;
    confidence: number;
  }>;
}

export interface VerifyDocumentsResult {
  verification: VerificationResult;
  documentsVerified: number;
  model: string;
  latencyMs: number;
}

// Run independent AI verification on all generated documents for a session.
// Returns the verification result, or throws if OpenRouter key is missing or session not found.
export async function verifyDocuments(
  sessionId: string,
  technicianId: string
): Promise<VerifyDocumentsResult> {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    throw new Error("OpenRouter API key not configured");
  }

  // Load session with all evidence and generated documents
  const session = await prisma.captureSession.findUnique({
    where: { id: sessionId },
    include: {
      evidence: { orderBy: { capturedAt: "asc" } },
      documents: true,
      analysis: true,
      technician: true,
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.documents.length === 0) {
    throw new Error("No documents to verify — generate first");
  }

  // === Collect all raw evidence for the reviewer ===

  // Photo extractions
  const photoExtractions = session.evidence
    .filter((e) => e.type === "PHOTO" && e.aiExtraction)
    .map((e) => {
      try {
        return JSON.parse(e.aiExtraction!);
      } catch {
        return { raw: e.aiExtraction };
      }
    });

  // Audio transcripts
  const audioChunks = session.evidence
    .filter((e) => e.type === "AUDIO_CHUNK" && e.transcription)
    .map((e) => e.transcription!);
  const audioTranscript =
    audioChunks.length > 0 ? audioChunks.join("\n") : null;

  // Video analysis
  let videoAnalysis: Record<string, unknown> | null = null;
  if (session.analysis) {
    videoAnalysis = {
      actionLog: JSON.parse(session.analysis.actionLog),
      partsIdentified: JSON.parse(session.analysis.partsIdentified),
      procedureSteps: JSON.parse(session.analysis.procedureSteps),
      anomalies: JSON.parse(session.analysis.anomalies),
      confidence: session.analysis.confidence,
    };
  }

  // Parsed documents to verify
  const documentsToVerify = session.documents.map((doc) => ({
    id: doc.id,
    documentType: doc.documentType,
    contentJson: JSON.parse(doc.contentJson),
    confidence: doc.confidence,
    lowConfidenceFields: JSON.parse(doc.lowConfidenceFields),
  }));

  // === Call Claude Sonnet via OpenRouter for independent review ===
  const startTime = Date.now();

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mechanicalvisioncorp.com",
        "X-Title": "AeroVision Verification",
      },
      signal: AbortSignal.timeout(50000),
      body: JSON.stringify({
        model: VERIFICATION_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an independent FAA compliance document reviewer. Your job is to verify AI-generated documents against the raw evidence that was used to create them.

You are a SECOND opinion — a different AI generated these documents. Your job is to catch any errors, inconsistencies, or unsupported claims.

VERIFICATION CHECKLIST:
1. Does every field in the document have supporting evidence? (photo OCR, transcript, video analysis)
2. Are part numbers and serial numbers exactly correct? (character-by-character match)
3. Are dates, names, and certifications consistent across documents?
4. Are there any fields that seem fabricated or hallucinated (no evidence supports them)?
5. Are document types appropriate for the work described?
6. Are regulatory references (FARs, ADs, SBs) correct and applicable?

SEVERITY LEVELS:
- "critical": Wrong part number, serial number, or safety-related field — MUST be corrected
- "warning": Inconsistency or uncertain field — should be reviewed by human
- "info": Minor observation — cosmetic or style issue

Return JSON with this exact structure:
{
  "verified": true/false (false if any critical issues found),
  "overallConfidence": 0.0 to 1.0,
  "documentReviews": [
    {
      "documentType": "8130-3",
      "issues": [
        { "field": "partNumber", "issue": "Part number in Block 6b doesn't match photo evidence", "severity": "critical" }
      ],
      "confidence": 0.85
    }
  ]
}

If no issues found, return verified: true with an empty issues array and high confidence.
Be thorough but fair — flag real problems, not stylistic preferences.`,
          },
          {
            role: "user",
            content: `Verify these AI-generated FAA compliance documents against the raw evidence.

=== RAW EVIDENCE ===

${photoExtractions.length > 0 ? `PHOTO ANALYSIS (AI-extracted from images):
${JSON.stringify(photoExtractions, null, 2)}` : "No photo evidence."}

${audioTranscript ? `AUDIO TRANSCRIPT:
${audioTranscript}` : "No audio transcript."}

${videoAnalysis ? `VIDEO ANALYSIS:
${JSON.stringify(videoAnalysis, null, 2)}` : "No video analysis."}

=== DOCUMENTS TO VERIFY ===

${JSON.stringify(documentsToVerify, null, 2)}

Review each document against the evidence. Flag any issues.`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 3000,
        temperature: 0.1,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Verification API error:", response.status, errorText.slice(0, 200));
    throw new Error(`Verification AI call failed (status ${response.status})`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from verification AI");
  }

  // Parse the verification result
  let verification: VerificationResult;
  try {
    verification = JSON.parse(content);
  } catch {
    console.error("Verification AI returned non-JSON:", content);
    verification = {
      verified: false,
      overallConfidence: 0,
      documentReviews: [],
    };
  }

  const latencyMs = Date.now() - startTime;

  // === Save verification results to each document ===
  const now = new Date();
  for (const doc of session.documents) {
    const review = verification.documentReviews?.find(
      (r) => r.documentType === doc.documentType
    );

    await prisma.documentGeneration2.update({
      where: { id: doc.id },
      data: {
        verificationJson: JSON.stringify(
          review || { issues: [], confidence: verification.overallConfidence }
        ),
        verifiedAt: now,
      },
    });
  }

  // Audit log
  await prisma.auditLogEntry.create({
    data: {
      organizationId: session.technician.organizationId,
      technicianId,
      action: "documents_verified",
      entityType: "CaptureSession",
      entityId: sessionId,
      metadata: JSON.stringify({
        model: VERIFICATION_MODEL,
        verified: verification.verified,
        overallConfidence: verification.overallConfidence,
        documentCount: session.documents.length,
        issueCount: verification.documentReviews?.reduce(
          (sum, r) => sum + (r.issues?.length || 0),
          0
        ),
        latencyMs,
      }),
    },
  });

  return {
    verification,
    documentsVerified: session.documents.length,
    model: VERIFICATION_MODEL,
    latencyMs,
  };
}
