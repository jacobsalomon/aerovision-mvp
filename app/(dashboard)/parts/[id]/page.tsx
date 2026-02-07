"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, SeverityBadge } from "@/components/shared/status-badge";
import {
  calculateTraceCompleteness,
  formatDuration,
  type TraceGap,
} from "@/lib/trace-completeness";
import {
  Factory,
  Plane,
  Wrench,
  ClipboardCheck,
  TestTube,
  PackageCheck,
  ArrowRightLeft,
  Trash2,
  Search,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  FileText,
  Clock,
  Hash,
  Scan,
  Loader2,
  ShieldAlert,
  Camera,
  Mic,
  Download,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

// ── Types ────────────────────────────────────────────

interface EvidenceItem {
  id: string;
  type: string;
  fileName: string;
  transcription: string | null;
  capturedBy: string;
  capturedAt: string;
}

interface GeneratedDoc {
  id: string;
  docType: string;
  title: string;
  status: string;
}

interface PartConsumed {
  id: string;
  partNumber: string;
  serialNumber: string | null;
  description: string;
  quantity: number;
}

interface LifecycleEvent {
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
  evidence: EvidenceItem[];
  generatedDocs: GeneratedDoc[];
  partsConsumed: PartConsumed[];
}

interface Alert {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  status: string;
}

interface Document {
  id: string;
  docType: string;
  title: string;
  aiSummary: string | null;
  isLegacy: boolean;
}

interface ExceptionItem {
  id: string;
  exceptionType: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  detectedAt: string;
}

interface ComponentDetail {
  id: string;
  partNumber: string;
  serialNumber: string;
  description: string;
  oem: string;
  oemDivision: string | null;
  manufactureDate: string;
  manufacturePlant: string | null;
  totalHours: number;
  totalCycles: number;
  timeSinceOverhaul: number | null;
  cyclesSinceOverhaul: number | null;
  status: string;
  currentLocation: string | null;
  currentAircraft: string | null;
  currentOperator: string | null;
  isLifeLimited: boolean;
  events: LifecycleEvent[];
  alerts: Alert[];
  documents: Document[];
}

// ── Constants ────────────────────────────────────────

const exceptionTypeLabels: Record<string, string> = {
  serial_number_mismatch: "Serial Number Mismatch",
  part_number_mismatch: "Part Number Mismatch",
  cycle_count_discrepancy: "Cycle Count Discrepancy",
  hour_count_discrepancy: "Hour Count Discrepancy",
  documentation_gap: "Documentation Gap",
  missing_release_certificate: "Missing Release Certificate",
  missing_birth_certificate: "Missing Birth Certificate",
  date_inconsistency: "Date Inconsistency",
  unsigned_document: "Unsigned Document",
  missing_facility_certificate: "Missing Facility Certificate",
};

const eventIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  manufacture: Factory,
  install: Plane,
  remove: ArrowRightLeft,
  receiving_inspection: ClipboardCheck,
  teardown: Wrench,
  detailed_inspection: Search,
  repair: Wrench,
  reassembly: Wrench,
  functional_test: TestTube,
  final_inspection: ClipboardCheck,
  release_to_service: PackageCheck,
  transfer: ArrowRightLeft,
  retire: Trash2,
  scrap: Trash2,
};

const eventLabels: Record<string, string> = {
  manufacture: "MANUFACTURED",
  install: "INSTALLED",
  remove: "REMOVED",
  receiving_inspection: "RECEIVING INSPECTION",
  teardown: "TEARDOWN",
  detailed_inspection: "DETAILED INSPECTION",
  repair: "REPAIR",
  reassembly: "REASSEMBLY",
  functional_test: "FUNCTIONAL TEST",
  final_inspection: "FINAL INSPECTION",
  release_to_service: "RELEASED TO SERVICE",
  transfer: "TRANSFER",
  retire: "RETIRED",
  scrap: "SCRAPPED",
};

// Color for each event type icon background
const eventColors: Record<string, string> = {
  manufacture: "bg-emerald-600 text-white",
  install: "bg-blue-600 text-white",
  remove: "bg-orange-500 text-white",
  receiving_inspection: "bg-sky-500 text-white",
  teardown: "bg-slate-500 text-white",
  detailed_inspection: "bg-indigo-500 text-white",
  repair: "bg-amber-600 text-white",
  reassembly: "bg-slate-600 text-white",
  functional_test: "bg-violet-600 text-white",
  final_inspection: "bg-teal-600 text-white",
  release_to_service: "bg-green-600 text-white",
  transfer: "bg-cyan-600 text-white",
  retire: "bg-red-500 text-white",
  scrap: "bg-red-700 text-white",
};

// ── Helper: detect who "owns" the part at a given event ──

function getOwner(event: LifecycleEvent): string | null {
  return event.operator || event.facility;
}

// ── Main Page Component ──────────────────────────────

export default function PartDetailPage() {
  const params = useParams();
  const [component, setComponent] = useState<ComponentDetail | null>(null);
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningExceptions, setScanningExceptions] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [exportingPdf, setExportingPdf] = useState(false);

  // Fetch component data and exceptions on mount
  useEffect(() => {
    async function fetchComponent() {
      const res = await fetch(`/api/components/${params.id}`);
      if (res.ok) {
        setComponent(await res.json());
      }
      const exRes = await fetch(`/api/exceptions?componentId=${params.id}`);
      if (exRes.ok) {
        setExceptions(await exRes.json());
      }
      setLoading(false);
    }
    fetchComponent();
  }, [params.id]);

  // Run exception scan for this component
  async function scanForExceptions() {
    setScanningExceptions(true);
    try {
      await fetch(`/api/exceptions/scan/${params.id}`, { method: "POST" });
      const exRes = await fetch(`/api/exceptions?componentId=${params.id}`);
      if (exRes.ok) {
        setExceptions(await exRes.json());
      }
    } finally {
      setScanningExceptions(false);
    }
  }

  // Download trace report as PDF
  async function exportTracePdf() {
    setExportingPdf(true);
    try {
      const res = await fetch(`/api/export/trace/${params.id}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `trace-report-${component?.serialNumber || params.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setExportingPdf(false);
    }
  }

  // Toggle event detail expansion
  function toggleEvent(eventId: string) {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!component) {
    return <p className="py-12 text-center text-slate-500">Component not found.</p>;
  }

  // Calculate trace completeness score
  const retiredDate =
    component.status === "retired" || component.status === "scrapped"
      ? component.events[component.events.length - 1]?.date
      : undefined;

  const trace = calculateTraceCompleteness(
    component.manufactureDate,
    component.events,
    component.documents,
    retiredDate
  );

  const openAlerts = component.alerts.filter(
    (a) => a.status !== "resolved" && a.status !== "dismissed"
  );

  // Sort events chronologically for the timeline
  const sortedEvents = [...component.events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Build a map: after event[i], is there a documentation gap?
  const gapAfterEvent = new Map<number, TraceGap>();
  for (const gap of trace.gaps) {
    const idx = sortedEvents.findIndex((e) => e.date === gap.startDate);
    if (idx >= 0) {
      gapAfterEvent.set(idx, gap);
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/dashboard" className="hover:text-blue-700">
          Parts Fleet
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 font-medium">{component.partNumber}</span>
      </div>

      {/* Identity card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {component.description}
                </h1>
                <StatusBadge status={component.status} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 text-sm">
                <div>
                  <span className="text-slate-500">Part Number</span>
                  <p className="font-mono font-medium">{component.partNumber}</p>
                </div>
                <div>
                  <span className="text-slate-500">Serial Number</span>
                  <p className="font-mono font-medium">{component.serialNumber}</p>
                </div>
                <div>
                  <span className="text-slate-500">OEM</span>
                  <p>{component.oem}</p>
                  {component.oemDivision && (
                    <p className="text-xs text-slate-400">{component.oemDivision}</p>
                  )}
                </div>
                <div>
                  <span className="text-slate-500">Manufactured</span>
                  <p>{format(new Date(component.manufactureDate), "MMM d, yyyy")}</p>
                  {component.manufacturePlant && (
                    <p className="text-xs text-slate-400">{component.manufacturePlant}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-700">
                  {component.totalHours.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">Total Hours</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">
                  {component.totalCycles.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">Total Cycles</p>
              </div>
              {component.timeSinceOverhaul != null && (
                <div>
                  <p className="text-2xl font-bold text-slate-600">
                    {component.timeSinceOverhaul.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">TSO (Hours)</p>
                </div>
              )}
            </div>
          </div>
          {component.currentAircraft && (
            <div className="mt-3 text-sm text-slate-600">
              Currently on{" "}
              <span className="font-medium">{component.currentAircraft}</span>
              {component.currentOperator && ` (${component.currentOperator})`}
            </div>
          )}
          {component.currentLocation && !component.currentAircraft && (
            <div className="mt-3 text-sm text-slate-600">
              Location:{" "}
              <span className="font-medium">{component.currentLocation}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exception badge + scan button */}
      {(() => {
        const openExceptions = exceptions.filter(
          (e) => e.status === "open" || e.status === "investigating"
        );
        const critCount = openExceptions.filter(
          (e) => e.severity === "critical"
        ).length;
        const warnCount = openExceptions.filter(
          (e) => e.severity === "warning"
        ).length;
        return (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {openExceptions.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    {openExceptions.length} Open Exception
                    {openExceptions.length !== 1 ? "s" : ""}
                    {critCount > 0 && ` (${critCount} Critical`}
                    {critCount > 0 && warnCount > 0 && `, ${warnCount} Warning`}
                    {critCount > 0 && ")"}
                    {critCount === 0 &&
                      warnCount > 0 &&
                      ` (${warnCount} Warning)`}
                  </span>
                </div>
              )}
              {openExceptions.length === 0 && exceptions.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-sm font-medium text-green-800">
                    No open exceptions
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={scanForExceptions}
              disabled={scanningExceptions}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {scanningExceptions ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Scan className="h-3.5 w-3.5" />
              )}
              Scan for Issues
            </button>
          </div>
        );
      })()}

      {/* Exceptions section */}
      {exceptions.filter(
        (e) => e.status === "open" || e.status === "investigating"
      ).length > 0 && (
        <div className="mb-6 space-y-3">
          {exceptions
            .filter(
              (e) => e.status === "open" || e.status === "investigating"
            )
            .map((exception) => (
              <Card
                key={exception.id}
                className={`border-l-4 ${
                  exception.severity === "critical"
                    ? "border-l-red-500 bg-red-50"
                    : exception.severity === "warning"
                    ? "border-l-yellow-500 bg-yellow-50"
                    : "border-l-blue-500 bg-blue-50"
                }`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert
                      className={`h-5 w-5 mt-0.5 ${
                        exception.severity === "critical"
                          ? "text-red-600"
                          : exception.severity === "warning"
                          ? "text-yellow-600"
                          : "text-blue-600"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">
                          {exception.title}
                        </p>
                        <SeverityBadge severity={exception.severity} />
                        <Badge variant="outline" className="text-xs">
                          {exceptionTypeLabels[exception.exceptionType] ||
                            exception.exceptionType}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {exception.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Alerts */}
      {openAlerts.length > 0 && (
        <div className="mb-6 space-y-3">
          {openAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`border-l-4 ${
                alert.severity === "critical"
                  ? "border-l-red-500 bg-red-50"
                  : alert.severity === "warning"
                  ? "border-l-yellow-500 bg-yellow-50"
                  : "border-l-blue-500 bg-blue-50"
              }`}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`h-5 w-5 mt-0.5 ${
                      alert.severity === "critical"
                        ? "text-red-600"
                        : alert.severity === "warning"
                        ? "text-yellow-600"
                        : "text-blue-600"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{alert.title}</p>
                      <SeverityBadge severity={alert.severity} />
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {alert.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* ─── TRACE COMPLETENESS HEADER ─── */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Back-to-Birth Trace
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={scanForExceptions}
                    disabled={scanningExceptions}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    {scanningExceptions ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Scan className="h-3.5 w-3.5" />
                    )}
                    Run Verification
                  </button>
                  <button
                    onClick={exportTracePdf}
                    disabled={exportingPdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {exportingPdf ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Export Trace Report (PDF)
                  </button>
                </div>
              </div>

              {/* Completeness score with progress bar */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-600">
                    Completeness:
                  </span>
                  <span className="text-2xl font-bold">{trace.score}%</span>
                </div>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      trace.score > 95
                        ? "bg-green-500"
                        : trace.score >= 80
                        ? "bg-yellow-500"
                        : trace.score >= 60
                        ? "bg-orange-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${trace.score}%` }}
                  />
                </div>
                <Badge
                  className={`text-xs ${
                    trace.rating === "complete"
                      ? "bg-green-100 text-green-800"
                      : trace.rating === "good"
                      ? "bg-yellow-100 text-yellow-800"
                      : trace.rating === "fair"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {trace.rating.charAt(0).toUpperCase() + trace.rating.slice(1)}
                </Badge>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">
                    {formatDuration(trace.totalDays)} total lifecycle
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">
                    {trace.totalEvents} documented events
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`h-4 w-4 ${
                      trace.gapCount > 0 ? "text-red-500" : "text-slate-400"
                    }`}
                  />
                  <span
                    className={
                      trace.gapCount > 0
                        ? "text-red-700 font-medium"
                        : "text-slate-600"
                    }
                  >
                    {trace.gapCount} gap{trace.gapCount !== 1 ? "s" : ""}{" "}
                    identified
                    {trace.gapCount > 0 && ` (${trace.totalGapDays} days)`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">
                    {trace.totalDocuments} documents on file
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ─── ENHANCED TIMELINE ─── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lifecycle Timeline</CardTitle>
              <p className="text-sm text-slate-500">
                {component.events.length} events from{" "}
                {sortedEvents.length > 0
                  ? format(new Date(sortedEvents[0].date), "MMM yyyy")
                  : ""}{" "}
                to{" "}
                {sortedEvents.length > 0
                  ? format(
                      new Date(sortedEvents[sortedEvents.length - 1].date),
                      "MMM yyyy"
                    )
                  : "present"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />

                <div className="space-y-0">
                  {sortedEvents.map((event, index) => {
                    const Icon =
                      eventIcons[event.eventType] || ClipboardCheck;
                    const isExpanded = expandedEvents.has(event.id);
                    const isLast = index === sortedEvents.length - 1;
                    const gap = gapAfterEvent.get(index);

                    // Detect ownership change (company transfer)
                    const prevOwner =
                      index > 0
                        ? getOwner(sortedEvents[index - 1])
                        : null;
                    const currentOwner = getOwner(event);
                    const ownerChanged =
                      prevOwner &&
                      currentOwner &&
                      prevOwner !== currentOwner;

                    // Calculate duration to next event
                    const nextEvent =
                      index < sortedEvents.length - 1
                        ? sortedEvents[index + 1]
                        : null;
                    const daysToNext = nextEvent
                      ? Math.ceil(
                          (new Date(nextEvent.date).getTime() -
                            new Date(event.date).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      : null;

                    // Count evidence by type
                    const photoCount = event.evidence.filter(
                      (e) => e.type === "photo"
                    ).length;
                    const voiceCount = event.evidence.filter(
                      (e) => e.type === "voice_note"
                    ).length;
                    const docCount = event.generatedDocs.length;

                    // Get first voice transcription excerpt
                    const voiceExcerpt = event.evidence.find(
                      (e) => e.type === "voice_note" && e.transcription
                    )?.transcription;

                    return (
                      <div key={event.id}>
                        {/* Ownership change divider */}
                        {ownerChanged && (
                          <div className="relative pl-12 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-px bg-blue-300" />
                              <span className="text-xs font-medium text-blue-600 px-2 whitespace-nowrap">
                                Transferred to{" "}
                                {event.operator ||
                                  event.facility.split(",")[0]}
                              </span>
                              <div className="flex-1 h-px bg-blue-300" />
                            </div>
                          </div>
                        )}

                        {/* Event row — clickable to expand */}
                        <div
                          className="relative pl-12 py-3 cursor-pointer hover:bg-slate-50/50 rounded-lg transition-colors"
                          onClick={() => toggleEvent(event.id)}
                        >
                          {/* Colored icon circle */}
                          <div
                            className={`absolute left-2 top-3 w-7 h-7 rounded-full flex items-center justify-center ${
                              eventColors[event.eventType] ||
                              "bg-slate-500 text-white"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>

                          <div>
                            {/* Event header with date */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm tracking-wide">
                                {eventLabels[event.eventType] ||
                                  event.eventType.toUpperCase()}
                              </span>
                              {event.aircraft && (
                                <span className="text-sm text-slate-600">
                                  on {event.aircraft}
                                  {event.operator &&
                                    ` (${event.operator})`}
                                </span>
                              )}
                              <span className="ml-auto text-sm font-medium text-slate-500">
                                {format(
                                  new Date(event.date),
                                  "MMM d, yyyy"
                                )}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 text-slate-400 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </div>

                            {/* Facility name */}
                            <p className="text-sm text-slate-500 mt-0.5">
                              {event.facility}
                            </p>

                            {/* Hours and cycles at this event */}
                            {(event.hoursAtEvent != null ||
                              event.cyclesAtEvent != null) && (
                              <div className="flex items-center gap-3 mt-1">
                                {event.hoursAtEvent != null && (
                                  <span className="text-xs text-slate-400">
                                    Hours:{" "}
                                    {event.hoursAtEvent.toLocaleString()}
                                  </span>
                                )}
                                {event.cyclesAtEvent != null && (
                                  <span className="text-xs text-slate-400">
                                    Cycles:{" "}
                                    {event.cyclesAtEvent.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Evidence counts (docs, photos, voice notes) */}
                            {(docCount > 0 ||
                              photoCount > 0 ||
                              voiceCount > 0) && (
                              <div className="flex items-center gap-3 mt-1.5">
                                {docCount > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <FileText className="h-3 w-3" />
                                    {docCount} document
                                    {docCount !== 1 ? "s" : ""}
                                  </span>
                                )}
                                {photoCount > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <Camera className="h-3 w-3" />
                                    {photoCount} photo
                                    {photoCount !== 1 ? "s" : ""}
                                  </span>
                                )}
                                {voiceCount > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <Mic className="h-3 w-3" />
                                    {voiceCount} voice note
                                    {voiceCount !== 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Voice note excerpt */}
                            {voiceExcerpt && (
                              <p className="text-xs italic text-slate-500 mt-1.5 line-clamp-2">
                                &ldquo;
                                {voiceExcerpt.substring(0, 150)}
                                {voiceExcerpt.length > 150 ? "..." : ""}
                                &rdquo;
                              </p>
                            )}

                            {/* Technician notes */}
                            {event.notes && (
                              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                                <p className="font-medium text-amber-800 text-xs mb-1">
                                  Technician Note
                                </p>
                                <p className="text-amber-900 italic text-xs">
                                  &ldquo;
                                  {event.notes.substring(0, 200)}
                                  {event.notes.length > 200 ? "..." : ""}
                                  &rdquo;
                                </p>
                                {event.performerCert && (
                                  <p className="text-xs text-amber-600 mt-1">
                                    — {event.performer} (
                                    {event.performerCert})
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Hash */}
                            {event.hash && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <Hash className="h-3 w-3 text-slate-300" />
                                <span className="text-xs font-mono text-slate-300">
                                  {event.hash.substring(0, 16)}...
                                </span>
                              </div>
                            )}

                            {/* ─── EXPANDED DETAIL PANEL ─── */}
                            {isExpanded && (
                              <div
                                className="mt-3 p-4 bg-slate-50 rounded-lg border space-y-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Full event description */}
                                <div>
                                  <p className="text-xs font-medium text-slate-500 mb-1">
                                    Full Description
                                  </p>
                                  <p className="text-sm text-slate-700">
                                    {event.description}
                                  </p>
                                </div>

                                {/* Performer and work order details */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 mb-1">
                                      Performer
                                    </p>
                                    <p className="text-slate-700">
                                      {event.performer}
                                    </p>
                                    {event.performerCert && (
                                      <p className="text-xs text-slate-400">
                                        Cert: {event.performerCert}
                                      </p>
                                    )}
                                  </div>
                                  {event.workOrderRef && (
                                    <div>
                                      <p className="text-xs font-medium text-slate-500 mb-1">
                                        Work Order
                                      </p>
                                      <p className="text-slate-700 font-mono text-xs">
                                        {event.workOrderRef}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* CMM reference */}
                                {event.cmmReference && (
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 mb-1">
                                      CMM Reference
                                    </p>
                                    <p className="text-sm text-slate-700">
                                      {event.cmmReference}
                                    </p>
                                  </div>
                                )}

                                {/* Full notes (if truncated above) */}
                                {event.notes &&
                                  event.notes.length > 200 && (
                                    <div>
                                      <p className="text-xs font-medium text-slate-500 mb-1">
                                        Full Technician Notes
                                      </p>
                                      <p className="text-sm text-amber-900 italic">
                                        &ldquo;{event.notes}&rdquo;
                                      </p>
                                    </div>
                                  )}

                                {/* Evidence gallery */}
                                {event.evidence.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 mb-2">
                                      Evidence ({event.evidence.length} item
                                      {event.evidence.length !== 1
                                        ? "s"
                                        : ""}
                                      )
                                    </p>
                                    <div className="space-y-2">
                                      {event.evidence.map((ev) => (
                                        <div
                                          key={ev.id}
                                          className="flex items-start gap-2 p-2 bg-white rounded border"
                                        >
                                          {ev.type === "photo" && (
                                            <Camera className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                          )}
                                          {ev.type === "voice_note" && (
                                            <Mic className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                                          )}
                                          {ev.type !== "photo" &&
                                            ev.type !== "voice_note" && (
                                              <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                            )}
                                          <div>
                                            <p className="text-xs font-medium">
                                              {ev.fileName}
                                            </p>
                                            {ev.transcription && (
                                              <p className="text-xs text-slate-500 italic mt-1">
                                                &ldquo;
                                                {ev.transcription}
                                                &rdquo;
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Generated documents */}
                                {event.generatedDocs.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 mb-2">
                                      Generated Documents
                                    </p>
                                    <div className="space-y-2">
                                      {event.generatedDocs.map((doc) => (
                                        <div
                                          key={doc.id}
                                          className="flex items-center gap-2 p-2 bg-white rounded border"
                                        >
                                          <FileText className="h-4 w-4 text-green-500 shrink-0" />
                                          <span className="text-xs">
                                            {doc.title}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="text-xs ml-auto"
                                          >
                                            {doc.docType.replace("_", " ")}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Parts consumed during this event */}
                                {event.partsConsumed.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 mb-2">
                                      Parts Consumed
                                    </p>
                                    <div className="space-y-1">
                                      {event.partsConsumed.map((part) => (
                                        <div
                                          key={part.id}
                                          className="flex items-center gap-2 text-xs p-2 bg-white rounded border"
                                        >
                                          <span className="font-mono">
                                            {part.partNumber}
                                          </span>
                                          {part.serialNumber && (
                                            <span className="text-slate-400">
                                              S/N: {part.serialNumber}
                                            </span>
                                          )}
                                          <span className="text-slate-600">
                                            {part.description}
                                          </span>
                                          {part.quantity > 1 && (
                                            <span className="text-slate-400">
                                              x{part.quantity}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Full hash */}
                                {event.hash && (
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 mb-1">
                                      Data Hash (SHA-256)
                                    </p>
                                    <p className="text-xs font-mono text-slate-400 break-all">
                                      {event.hash}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Duration bar or gap visualization between events */}
                        {!isLast && (
                          <div className="relative pl-12 py-1">
                            {gap ? (
                              /* ─── RED GAP SECTION ─── */
                              <div
                                className={`flex items-center gap-2 p-2 rounded-lg border-2 border-dashed ${
                                  gap.severity === "critical"
                                    ? "border-red-400 bg-red-50"
                                    : gap.severity === "warning"
                                    ? "border-red-300 bg-red-50"
                                    : "border-orange-300 bg-orange-50"
                                }`}
                              >
                                <AlertTriangle
                                  className={`h-4 w-4 shrink-0 ${
                                    gap.severity === "critical"
                                      ? "text-red-600"
                                      : "text-red-500"
                                  }`}
                                />
                                <div className="flex-1">
                                  <p
                                    className={`font-bold ${
                                      gap.severity === "critical"
                                        ? "text-red-700 text-sm"
                                        : "text-red-600 text-xs"
                                    }`}
                                  >
                                    {formatDuration(gap.days)} — NO
                                    DOCUMENTATION
                                  </p>
                                  <p className="text-xs text-red-500 mt-0.5">
                                    No records between{" "}
                                    {gap.lastFacility.split(",")[0]} and{" "}
                                    {gap.nextFacility.split(",")[0]}.{" "}
                                    {gap.days} days unaccounted for.
                                  </p>
                                </div>
                              </div>
                            ) : daysToNext && daysToNext > 1 ? (
                              /* ─── NORMAL DURATION BAR ─── */
                              <div className="flex items-center gap-2 px-2">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                  {formatDuration(daysToNext)}
                                </span>
                                <div className="flex-1 h-px bg-slate-200" />
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents sidebar (1 column) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {component.documents.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">
                  No documents
                </p>
              ) : (
                <div className="space-y-3">
                  {component.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-slate-50"
                    >
                      <FileText className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {doc.docType.replace("_", " ")}
                        </Badge>
                        {doc.isLegacy && (
                          <Badge
                            variant="outline"
                            className="text-xs mt-1 ml-1 bg-orange-50 text-orange-700"
                          >
                            Legacy (scanned)
                          </Badge>
                        )}
                        {doc.aiSummary && (
                          <p className="text-xs text-slate-500 mt-1">
                            {doc.aiSummary}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Provenance chain */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Provenance Chain</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from(
                  new Set(component.events.map((e) => e.facility))
                ).map((facility, i) => {
                  const events = component.events.filter(
                    (e) => e.facility === facility
                  );
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <div>
                        <p className="font-medium">{facility}</p>
                        <p className="text-xs text-slate-400">
                          {events.length} event
                          {events.length > 1 ? "s" : ""} ·{" "}
                          {format(new Date(events[0].date), "yyyy")}
                          {events.length > 1 &&
                            `–${format(
                              new Date(events[events.length - 1].date),
                              "yyyy"
                            )}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Total events:</span>
                <span className="font-medium">
                  {component.events.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Documents:</span>
                <span className="font-medium">
                  {component.documents.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Open alerts:</span>
                <span className="font-medium">{openAlerts.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Exceptions:</span>
                <span className="font-medium">
                  {
                    exceptions.filter(
                      (e) =>
                        e.status === "open" ||
                        e.status === "investigating"
                    ).length
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
