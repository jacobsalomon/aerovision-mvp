// ──────────────────────────────────────────────────────
// Trace Completeness Engine
//
// Calculates how well-documented a component's lifecycle is.
// A "complete" trace means every day of the part's life can be
// accounted for — it was either installed on an aircraft, sitting
// in a warehouse with documentation, or being worked on at a shop.
//
// Gaps in documentation are a red flag for counterfeit parts,
// undisclosed repairs, or supply chain diversion.
// ──────────────────────────────────────────────────────

// Types that match our API response shape
interface TraceEvent {
  id: string;
  eventType: string;
  date: string;
  facility: string;
  facilityType: string;
  performer: string;
  performerCert: string | null;
  description: string;
  hoursAtEvent: number | null;
  cyclesAtEvent: number | null;
  aircraft: string | null;
  operator: string | null;
  workOrderRef: string | null;
  cmmReference: string | null;
  notes: string | null;
  hash: string | null;
  evidence: TraceEvidence[];
  generatedDocs: TraceGeneratedDoc[];
  partsConsumed: TracePartConsumed[];
}

interface TraceEvidence {
  id: string;
  type: string;
  fileName: string;
  transcription: string | null;
}

interface TraceGeneratedDoc {
  id: string;
  docType: string;
  title: string;
}

interface TracePartConsumed {
  id: string;
  partNumber: string;
  description: string;
}

interface TraceDocument {
  id: string;
  docType: string;
  title: string;
}

export interface TraceCompletenessResult {
  score: number;          // 0-100 percentage
  documentedDays: number;
  totalDays: number;
  gapCount: number;
  totalGapDays: number;
  rating: "complete" | "good" | "fair" | "poor";
  gaps: TraceGap[];
  totalEvents: number;
  totalDocuments: number;
}

export interface TraceGap {
  startDate: string;      // ISO date of last event before gap
  endDate: string;        // ISO date of first event after gap
  days: number;           // duration of gap in days
  severity: "critical" | "warning" | "minor";
  lastEvent: string;      // description of last event before gap
  nextEvent: string;      // description of next event after gap
  lastFacility: string;
  nextFacility: string;
}

// How many days of "coverage" each event type provides around it.
// Install events cover all days until the next remove event.
// Other events cover a reasonable window of surrounding days.
const EVENT_COVERAGE_DAYS: Record<string, number> = {
  manufacture: 7,           // covers the week around manufacture
  install: 0,               // special: covers until next remove
  remove: 7,                // covers surrounding week
  receiving_inspection: 14, // covers 2 weeks of shop processing
  teardown: 7,
  detailed_inspection: 7,
  repair: 14,
  reassembly: 7,
  functional_test: 7,
  final_inspection: 7,
  release_to_service: 14,
  transfer: 14,             // covers shipping and receiving time
  retire: 7,
  scrap: 7,
};

// Calculate trace completeness for a component
export function calculateTraceCompleteness(
  manufactureDate: string,
  events: TraceEvent[],
  documents: TraceDocument[],
  retiredDate?: string
): TraceCompletenessResult {
  if (events.length === 0) {
    return {
      score: 0,
      documentedDays: 0,
      totalDays: 0,
      gapCount: 0,
      totalGapDays: 0,
      rating: "poor",
      gaps: [],
      totalEvents: 0,
      totalDocuments: documents.length,
    };
  }

  // Calculate total lifespan in days
  const birthDate = new Date(manufactureDate);
  const endDate = retiredDate ? new Date(retiredDate) : new Date();
  const totalDays = Math.max(1, Math.ceil(
    (endDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24)
  ));

  // Create a coverage map — each day is either documented or not.
  // We use a Set of day offsets from the birth date.
  const coveredDays = new Set<number>();

  // Sort events chronologically
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i];
    const eventDate = new Date(event.date);
    const dayOffset = Math.ceil(
      (eventDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (event.eventType === "install") {
      // Install events cover all days until the next remove event
      let endOffset = totalDays; // default: until now or retirement
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].eventType === "remove") {
          const removeDate = new Date(sorted[j].date);
          endOffset = Math.ceil(
            (removeDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          break;
        }
      }
      for (let d = dayOffset; d <= endOffset && d <= totalDays; d++) {
        coveredDays.add(d);
      }
    } else {
      // Other events cover a window around them
      const coverage = EVENT_COVERAGE_DAYS[event.eventType] || 7;
      for (let d = dayOffset - coverage; d <= dayOffset + coverage; d++) {
        if (d >= 0 && d <= totalDays) {
          coveredDays.add(d);
        }
      }
    }
  }

  const documentedDays = coveredDays.size;

  // Find gaps — periods between consecutive events that are too long
  const gaps: TraceGap[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const currentDate = new Date(current.date);
    const nextDate = new Date(next.date);
    const daysBetween = Math.ceil(
      (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Skip if the current event is an install (it covers the gap)
    if (current.eventType === "install") continue;

    // Only flag gaps longer than 30 days (for non-installed periods)
    if (daysBetween > 30) {
      let severity: "critical" | "warning" | "minor";
      if (daysBetween > 180) {
        severity = "critical";
      } else if (daysBetween > 90) {
        severity = "warning";
      } else {
        severity = "minor";
      }

      gaps.push({
        startDate: current.date,
        endDate: next.date,
        days: daysBetween,
        severity,
        lastEvent: current.eventType,
        nextEvent: next.eventType,
        lastFacility: current.facility,
        nextFacility: next.facility,
      });
    }
  }

  const score = Math.round((documentedDays / totalDays) * 100);
  const totalGapDays = gaps.reduce((sum, g) => sum + g.days, 0);

  let rating: "complete" | "good" | "fair" | "poor";
  if (score > 95) rating = "complete";
  else if (score >= 80) rating = "good";
  else if (score >= 60) rating = "fair";
  else rating = "poor";

  return {
    score: Math.min(100, score),
    documentedDays,
    totalDays,
    gapCount: gaps.length,
    totalGapDays,
    rating,
    gaps,
    totalEvents: events.length,
    totalDocuments: documents.length,
  };
}

// Format a duration in days into a human-readable string
export function formatDuration(days: number): string {
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  const remainDays = days % 30;
  if (months < 12) {
    if (remainDays === 0) return `${months} month${months !== 1 ? "s" : ""}`;
    return `${months} month${months !== 1 ? "s" : ""}, ${remainDays} day${remainDays !== 1 ? "s" : ""}`;
  }
  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  if (remainMonths === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years} year${years !== 1 ? "s" : ""}, ${remainMonths} month${remainMonths !== 1 ? "s" : ""}`;
}
