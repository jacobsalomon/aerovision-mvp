// GET /api/sessions/[id] — Full session detail for the web dashboard
// Returns session with all relations: technician, organization, evidence
// (with video annotations), documents (with reviewer), and analysis

import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireDashboardAuth(request);
  if (authError) return authError;

  const { id } = await params;

  const session = await prisma.captureSession.findUnique({
    where: { id },
    include: {
      technician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          badgeNumber: true,
          email: true,
          role: true,
        },
      },
      organization: {
        select: { id: true, name: true },
      },
      evidence: {
        include: {
          videoAnnotations: {
            orderBy: { timestamp: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      documents: {
        include: {
          reviewedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { generatedAt: "asc" },
      },
      analysis: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}
