// AI mock responses for testing
// These simulate Claude and Gemini responses so tests run fast, free, and offline.
// Set TEST_USE_REAL_AI=true environment variable to use real API calls instead.

export const shouldMockAI = process.env.TEST_USE_REAL_AI !== "true";

/**
 * Mock response for document extraction (Claude vision).
 * Simulates what Claude returns when analyzing a scanned document.
 */
export const mockDocumentExtraction = {
  documentType: "8130-3",
  formNumber: "FAA-8130-3",
  fields: {
    partNumber: "881700-1001",
    serialNumber: "SN-2024-00001",
    description: "High Pressure Compressor Rotor",
    manufacturer: "Parker Aerospace",
    dateIssued: "2024-06-15",
    facility: "Parker Hannifin MRO",
    status: "Serviceable",
    certificateNumber: "RS-PKR-2024-1234",
    remarks: "Component overhauled per CMM 72-00-00. All measurements within limits.",
  },
  confidence: "high",
};

/**
 * Mock response for 8130-3 generation from evidence.
 * Simulates what Claude returns when creating an FAA form from captured data.
 */
export const mock8130Generation = {
  block1: "Parker Hannifin - Gas Turbine Fuel Systems Division",
  block2: "RS-PKR-2024-1234",
  block3: "Overhaul",
  block4: "881700-1001",
  block5: "High Pressure Compressor Rotor Assembly",
  block6: "1",
  block7: "Approved",
  block8: "SN-2024-00001",
  block9: "Serviceable",
  block10: "",
  block11:
    "Component overhauled in accordance with CMM 72-00-00 Rev 12. " +
    "All measurements within serviceable limits. New seals and bearings installed.",
  block12: "2024-06-15",
  block13: "John Smith / A&P #123456789 / IA #987654321",
  block14: "FAA",
};

/**
 * Mock response for work order generation.
 */
export const mockWorkOrderGeneration = {
  workOrderNumber: "WO-2024-TEST-001",
  partNumber: "881700-1001",
  serialNumber: "SN-2024-00001",
  description: "High Pressure Compressor Rotor Assembly - Overhaul",
  tasks: [
    "Receiving inspection per CMM Section 3",
    "Disassembly per CMM Section 4",
    "Cleaning per CMM Section 5",
    "NDT inspection per CMM Section 6",
    "Dimensional inspection per CMM Section 7",
    "Reassembly per CMM Section 8",
    "Functional test per CMM Section 9",
  ],
  estimatedHours: 40,
  priority: "Standard",
};

/**
 * Mock response for voice note structuring.
 */
export const mockVoiceStructure = {
  transcription:
    "Blade tip clearance on stage 3 is at 0.018 inches, which is within the " +
    "serviceable limit of 0.025. Minor pitting on the leading edge of blade 7, " +
    "blended per CMM limits. All other blades look good.",
  structuredData: {
    measurements: [
      {
        parameter: "Blade tip clearance - Stage 3",
        value: 0.018,
        unit: "inches",
        limit: 0.025,
        status: "within_limits",
      },
    ],
    findings: [
      {
        location: "Stage 3, Blade 7, leading edge",
        condition: "Minor pitting",
        action: "Blended per CMM limits",
        severity: "minor",
      },
    ],
    overallAssessment: "serviceable",
  },
};

/**
 * Mock response for video annotation (Gemini).
 */
export const mockVideoAnnotation = {
  timestamp: 12.5,
  tag: "part_number",
  description: "Part number plate visible: 881700-1001",
  confidence: 0.95,
  rawResponse: "Detected part number marking on component serial plate.",
};

/**
 * Mock response for session analysis (Gemini deep analysis).
 */
export const mockSessionAnalysis = {
  actionLog: [
    { timestamp: "00:00:05", action: "Technician begins visual inspection of HPC rotor" },
    { timestamp: "00:02:15", action: "Measuring blade tip clearance with dial indicator" },
    { timestamp: "00:05:30", action: "Documenting pitting on blade 7 leading edge" },
  ],
  partsIdentified: [
    { partNumber: "881700-1001", serialNumber: "SN-2024-11432", confidence: 0.97 },
  ],
  procedureSteps: [
    { step: 1, description: "Visual inspection", status: "completed", cmmRef: "CMM 72-00-00 Section 6.1" },
    { step: 2, description: "Dimensional check", status: "completed", cmmRef: "CMM 72-00-00 Section 7.2" },
  ],
  anomalies: [],
  confidence: 0.92,
  modelUsed: "gemini-2.5-flash",
};

/**
 * Mock response for document verification.
 */
export const mockDocumentVerification = {
  verified: true,
  confidence: 0.94,
  fieldChecks: [
    { field: "block4", status: "pass", note: "Part number matches evidence" },
    { field: "block8", status: "pass", note: "Serial number matches evidence" },
    { field: "block11", status: "pass", note: "Description consistent with work performed" },
    { field: "block12", status: "pass", note: "Date is within session timeframe" },
  ],
  lowConfidenceFields: [],
};
