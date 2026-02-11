/**
 * PEX Interview tools for Gemini Live API function calling.
 * Provides state management, vault grounding, and study plan export
 * for the voice-based PEX exam interview mode.
 */

import { Type } from "@google/genai";
import { getObsidianApp } from "../utils/environment";
import {
  initPexSession,
  getPexState,
  recordProbe,
  advanceVertex,
  setPhase,
  markFilled,
  markCorrected,
  getSessionSummary,
  getGaps,
  getHypercorrectionTargets,
  getStrengths,
  resetPexState,
  getNextUnprobedLayer,
  isVertexLayerComplete,
  getVertexProbes,
  PROBE_LAYERS,
} from "../services/pexState";
import type { VertexState, ProbeLayer } from "../services/pexState";
import type { ToolCallbacks } from "../types";

type ToolArgs = Record<string, unknown>;

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
};

const getNumberArg = (args: ToolArgs, key: string): number | undefined => {
  const value = args[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return undefined;
};

const getBoolArg = (args: ToolArgs, key: string): boolean | undefined => {
  const value = args[key];
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

// ─── Vertex Data (embedded from vertex_lo_map.json) ──────────────────

interface VertexDef {
  readonly description: string;
  readonly domains: readonly string[];
  readonly subTopics: readonly string[];
}

const VERTEX_DATA: Readonly<Record<string, VertexDef>> = {
  "Flow=ΔP/R": {
    description:
      "Ohmic flow: systemic/pulmonary/cerebral/renal circulation, airway resistance, breathing circuits",
    domains: ["Physiology", "Measurement/Physics"],
    subTopics: [
      "Systemic circulation",
      "Coronary flow",
      "Cerebral autoregulation",
      "Pulmonary circulation",
      "Airway resistance",
      "Work of breathing",
      "Renal blood flow",
      "CBF regulation",
    ],
  },
  "τ=V/Q": {
    description:
      "Time constant: lung washout/washin, regional time constants, elimination kinetics, FA/FI curves",
    domains: ["Physiology", "Pharmacology"],
    subTopics: [
      "Lung washout/washin",
      "Time constants (regional)",
      "Elimination kinetics",
      "Monitor response time",
      "Volatile FA/FI curves",
      "CSHT",
    ],
  },
  Fick: {
    description:
      "Fick principle: CO measurement, O2 delivery/consumption, gas exchange, RPF measurement",
    domains: ["Physiology"],
    subTopics: [
      "CO measurement",
      "O2 delivery/consumption",
      "Gas exchange/VO2",
      "RPF measurement (PAH)",
    ],
  },
  "Cl=E×Q": {
    description:
      "Clearance: hepatic/renal drug clearance, extraction ratio, protein binding",
    domains: ["Pharmacology"],
    subTopics: [
      "Hepatic clearance",
      "Renal clearance (drugs)",
      "Extraction ratio",
      "Protein binding displacement",
      "Enzyme induction/inhibition",
    ],
  },
  Hill: {
    description:
      "Hill equation: dose-response, receptor occupancy, O2-Hb dissociation, synaptic kinetics, force-Ca2+",
    domains: ["Physiology", "Pharmacology"],
    subTopics: [
      "Potency/efficacy/TI",
      "Receptor occupancy theory",
      "O2-Hb dissociation curve",
      "Synaptic receptor kinetics",
      "Force-Ca2+ relationship",
      "Synergism/antagonism",
    ],
  },
  Starling: {
    description:
      "Starling forces: capillary dynamics, glomerular filtration, Frank-Starling cardiac mechanics",
    domains: ["Physiology"],
    subTopics: [
      "Capillary dynamics",
      "Glomerular filtration",
      "Cardiac mechanics (Frank-Starling)",
      "Oedema formation",
    ],
  },
  Nernst: {
    description:
      "Nernst equation: resting membrane potential, action potential, cardiac AP, NMJ, tubular transport, Na+ channel block",
    domains: ["Physiology", "Pharmacology"],
    subTopics: [
      "Resting membrane potential",
      "Action potential phases (GHK)",
      "Cardiac AP",
      "NMJ/motor endplate",
      "Tubular transport potentials",
      "Na+ channel block (LA)",
    ],
  },
  Laplace: {
    description:
      "Laplace law: alveolar mechanics, ventricular wall stress, surfactant, bubble/cuff physics",
    domains: ["Physiology", "Measurement/Physics"],
    subTopics: [
      "Alveolar mechanics/surfactant",
      "Ventricular wall stress",
      "Bubble/cuff physics",
      "Wall tension (cardiac)",
    ],
  },
  "Henderson-Hasselbalch": {
    description: "Acid-base: respiratory and renal components, pH-trapping",
    domains: ["Physiology"],
    subTopics: [
      "Respiratory acid-base",
      "Renal acid-base",
      "pH-trapping",
      "Buffer systems",
    ],
  },
  "Michaelis-Menten": {
    description: "Zero-order kinetics, saturation, enzyme kinetics",
    domains: ["Pharmacology"],
    subTopics: [
      "Zero-order kinetics",
      "Enzyme saturation",
      "Vmax and Km",
      "Alcohol metabolism",
    ],
  },
  "Beer-Lambert": {
    description: "Pulse oximetry, co-oximetry, spectrophotometry",
    domains: ["Measurement/Physics"],
    subTopics: [
      "Pulse oximetry",
      "Co-oximetry",
      "Spectrophotometry",
      "Isobestic points",
    ],
  },
};

const COLLEGE_WEIGHTS: Readonly<
  Record<string, { cicm: number; anzca: number }>
> = {
  "Flow=ΔP/R": { cicm: 1.2, anzca: 1.0 },
  "τ=V/Q": { cicm: 1.0, anzca: 1.2 },
  Fick: { cicm: 1.2, anzca: 0.8 },
  "Cl=E×Q": { cicm: 1.0, anzca: 1.2 },
  Hill: { cicm: 1.0, anzca: 1.0 },
  Starling: { cicm: 1.2, anzca: 0.8 },
  Nernst: { cicm: 0.8, anzca: 1.2 },
  Laplace: { cicm: 1.0, anzca: 1.0 },
};

const DEFAULT_PRIORITY = [
  "Flow=ΔP/R",
  "τ=V/Q",
  "Fick",
  "Hill",
  "Starling",
  "Cl=E×Q",
  "Nernst",
  "Laplace",
  "Henderson-Hasselbalch",
  "Michaelis-Menten",
  "Beer-Lambert",
];

const buildVertexQueue = (
  domains: readonly string[],
  college: string,
): readonly string[] => {
  const filtered = DEFAULT_PRIORITY.filter((v) => {
    const def = VERTEX_DATA[v];
    if (!def) return false;
    if (domains.length === 0) return true;
    return def.domains.some((d) => domains.includes(d));
  });

  if (college === "Both") return filtered;

  return [...filtered].sort((a, b) => {
    const wA = COLLEGE_WEIGHTS[a];
    const wB = COLLEGE_WEIGHTS[b];
    const weightA = college === "CICM" ? (wA?.cicm ?? 1) : (wA?.anzca ?? 1);
    const weightB = college === "CICM" ? (wB?.cicm ?? 1) : (wB?.anzca ?? 1);
    return weightB - weightA;
  });
};

// ─── Tool: pex_start_interview ───────────────────────────────────────

export const startInterviewDeclaration = {
  name: "pex_start_interview",
  description:
    "Initialize a PEX exam interview session. Call this when the user wants to start a PEX interview. Returns the vertex queue ordered by priority for the selected domains and college.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      domains: {
        type: Type.STRING,
        description:
          'Comma-separated domains: Physiology, Pharmacology, Measurement/Physics, Anatomy. Use "all" for all domains.',
      },
      college: {
        type: Type.STRING,
        description: "Target college: CICM, ANZCA, or Both",
      },
      depth: {
        type: Type.STRING,
        description:
          "Interview depth: Broad BFS (cover many vertices), Deep DFS (drill into gaps), or Random (viva-style)",
      },
    },
    required: ["domains", "college"],
  },
};

export const executeStartInterview = async (
  args: ToolArgs,
  callbacks: ToolCallbacks,
): Promise<unknown> => {
  const domainsStr = getStringArg(args, "domains") || "all";
  const college = getStringArg(args, "college") || "Both";
  const depth = getStringArg(args, "depth") || "Broad BFS";

  const domains =
    domainsStr === "all" ? [] : domainsStr.split(",").map((d) => d.trim());

  const queue = buildVertexQueue(domains, college);
  const vertices: Record<string, VertexState> = {};

  for (const name of queue) {
    const def = VERTEX_DATA[name];
    if (!def) continue;
    vertices[name] = {
      name,
      description: def.description,
      domains: def.domains,
      subTopics: def.subTopics,
      bestScore: 0,
      quadrant: null,
      probeCount: 0,
      filled: false,
      corrected: false,
      probedLayers: [],
    };
  }

  const state = initPexSession({
    college,
    domains,
    depth,
    vertexQueue: queue,
    vertices,
  });

  callbacks.onSystem("PEX Interview Started", {
    name: "pex_start_interview",
    filename: `${college} — ${domains.length === 0 ? "All domains" : domains.join(", ")}`,
    status: "success",
  });

  const firstVertex = queue[0] ?? null;
  const firstDef = firstVertex ? VERTEX_DATA[firstVertex] : null;

  return {
    status: "started",
    college: state.college,
    domains: state.domains.length === 0 ? ["All"] : state.domains,
    totalVertices: queue.length,
    firstVertex,
    firstVertexDescription: firstDef?.description ?? "",
    firstVertexHint: firstDef
      ? `Start with a clinical anchor, then ask one simple recall question about ${firstVertex}.`
      : null,
    vertexNames: queue,
  };
};

// ─── Tool: pex_record_probe ──────────────────────────────────────────

export const recordProbeDeclaration = {
  name: "pex_record_probe",
  description:
    "Record the result of probing a vertex. Call after evaluating the user's verbal answer. Specify the layer (recall/mechanism/clinical/quantitative) and score 1-5. Returns layer completion status and next layer to probe.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      vertex: {
        type: Type.STRING,
        description: "The vertex name being probed (e.g. Flow=ΔP/R)",
      },
      layer: {
        type: Type.STRING,
        description:
          "Probing layer: recall (definitions/equations), mechanism (why/how/cause-effect), clinical (when/where/scenarios), quantitative (calculations/values/ranges)",
      },
      level: {
        type: Type.NUMBER,
        description:
          "Probe level 1-5 (L1=recognition, L2=instantiation, L3=quantitative, L4=perturbation, L5=integration)",
      },
      score: {
        type: Type.NUMBER,
        description:
          "Score 1-5 (1=no knowledge, 2=vague recall, 3=borderline, 4=good understanding, 5=expert)",
      },
      confident: {
        type: Type.BOOLEAN,
        description: "Whether the user expressed confidence in their answer",
      },
      answerSummary: {
        type: Type.STRING,
        description: "Brief summary of the user's answer for the record",
      },
    },
    required: ["vertex", "layer", "score", "confident", "answerSummary"],
  },
};

const VALID_LAYERS: readonly string[] = [
  "recall",
  "mechanism",
  "clinical",
  "quantitative",
];

export const executeRecordProbe = async (
  args: ToolArgs,
  callbacks: ToolCallbacks,
): Promise<unknown> => {
  const vertex = getStringArg(args, "vertex");
  const layerStr = getStringArg(args, "layer") ?? "recall";
  const level = getNumberArg(args, "level") ?? 1;
  const score = getNumberArg(args, "score") ?? 1;
  const confident = getBoolArg(args, "confident") ?? false;
  const answerSummary = getStringArg(args, "answerSummary") ?? "";

  if (!vertex) {
    return { error: "vertex parameter is required" };
  }

  const layer: ProbeLayer = VALID_LAYERS.includes(layerStr)
    ? (layerStr as ProbeLayer)
    : "recall";

  const state = recordProbe({
    vertex,
    layer,
    level,
    score,
    confident,
    answerSummary,
  });

  const vertexState = state.vertices[vertex];
  const summary = getSessionSummary();

  // Layer-aware advance logic (Swiss cheese model)
  const vertexComplete = isVertexLayerComplete(vertex);
  const nextLayer = getNextUnprobedLayer(vertex);
  const probes = getVertexProbes(vertex);
  const vertexDef = VERTEX_DATA[vertex];

  // Build layer status summary
  const layerScores = PROBE_LAYERS.map((l) => {
    const probe = probes.find((p) => p.layer === l);
    return probe ? `${l}:${probe.score}/5` : `${l}:—`;
  }).join(", ");

  callbacks.onSystem(
    `Probe: ${vertex} [${layer}] → ${score}/5 (${vertexState?.quadrant ?? "GAP"}) | ${layerScores}`,
    {
      name: "pex_record_probe",
      filename: vertex,
      status: "success",
    },
  );

  return {
    vertex,
    layer,
    score,
    quadrant: vertexState?.quadrant ?? "GAP",
    layersProbed: vertexState?.probedLayers ?? [],
    layerScores,
    vertexComplete,
    nextLayer,
    vertexDescription: vertexDef?.description ?? "",
    shouldAdvance: vertexComplete,
    instruction: vertexComplete
      ? "Vertex fully probed. Call pex_advance_vertex to move on."
      : nextLayer
        ? `Probe the ${nextLayer} layer next. Ask a short question about ${nextLayer === "recall" ? "definitions or equations" : nextLayer === "mechanism" ? "why or how it works" : nextLayer === "clinical" ? "a clinical scenario" : "specific numbers or calculations"}.`
        : "All layers probed. Call pex_advance_vertex.",
    probed: summary.probed,
    total: summary.totalVertices,
  };
};

// ─── Tool: pex_advance_vertex ────────────────────────────────────────

export const advanceVertexDeclaration = {
  name: "pex_advance_vertex",
  description:
    "Move to the next vertex in the queue. Call after completing probing of current vertex (score ≤2 or ≥4).",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const executeAdvanceVertex = async (
  _args: ToolArgs,
  callbacks: ToolCallbacks,
): Promise<unknown> => {
  const state = advanceVertex();
  const currentVertex = state.vertexQueue[state.currentVertexIndex];
  const summary = getSessionSummary();

  if (!currentVertex) {
    setPhase("fill");
    const gaps = getGaps();
    const hcTargets = getHypercorrectionTargets();

    callbacks.onSystem("All probed — teaching phase", {
      name: "pex_advance_vertex",
      filename: "Teaching",
      status: "success",
    });

    return {
      done: true,
      phase: "fill",
      gaps: gaps.map((g) => g.name),
      hypercorrectionTargets: hcTargets.map((h) => h.name),
      probed: summary.probed,
    };
  }

  const vertexDef = VERTEX_DATA[currentVertex];

  callbacks.onSystem(`Next: ${currentVertex}`, {
    name: "pex_advance_vertex",
    filename: currentVertex,
    status: "success",
  });

  return {
    done: false,
    vertex: currentVertex,
    description: vertexDef?.description ?? "",
    position: `${state.currentVertexIndex + 1}/${state.vertexQueue.length}`,
  };
};

// ─── Tool: pex_get_state ─────────────────────────────────────────────

export const getStateDeclaration = {
  name: "pex_get_state",
  description:
    "Get the current PEX interview state including all vertex scores, gaps, strengths, and session summary.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      includeHistory: {
        type: Type.BOOLEAN,
        description: "Include full probe history (default: false)",
      },
    },
  },
};

export const executeGetState = async (
  args: ToolArgs,
  callbacks: ToolCallbacks,
): Promise<unknown> => {
  const includeHistory = getBoolArg(args, "includeHistory") ?? false;
  const state = getPexState();
  const summary = getSessionSummary();
  const gaps = getGaps();
  const strengths = getStrengths();
  const hcTargets = getHypercorrectionTargets();

  callbacks.onSystem(
    `PEX State: ${summary.probed}/${summary.totalVertices} probed, ${summary.gaps} gaps`,
    {
      name: "pex_get_state",
      filename: "Interview State",
      status: "success",
    },
  );

  return {
    phase: state.phase,
    college: state.college,
    domains: state.domains,
    summary,
    currentVertex: state.vertexQueue[state.currentVertexIndex] ?? null,
    gaps: gaps.map((g) => ({
      name: g.name,
      score: g.bestScore,
      quadrant: g.quadrant,
      subTopics: g.subTopics,
    })),
    strengths: strengths.map((s) => ({
      name: s.name,
      score: s.bestScore,
    })),
    hypercorrectionTargets: hcTargets.map((h) => ({
      name: h.name,
      score: h.bestScore,
      description: h.description,
    })),
    ...(includeHistory ? { probeHistory: state.probeHistory } : {}),
  };
};

// ─── Tool: pex_set_phase ─────────────────────────────────────────────

export const setPhaseDeclaration = {
  name: "pex_set_phase",
  description:
    "Transition the interview to a specific phase. Use to move between fill, hypercorrect, retest phases.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      phase: {
        type: Type.STRING,
        description: "Target phase: probe, dig, fill, hypercorrect, retest",
      },
    },
    required: ["phase"],
  },
};

export const executeSetPhase = async (
  args: ToolArgs,
  callbacks: ToolCallbacks,
): Promise<unknown> => {
  const phase = getStringArg(args, "phase") as
    | "probe"
    | "dig"
    | "fill"
    | "hypercorrect"
    | "retest"
    | undefined;
  if (!phase) return { error: "phase parameter is required" };

  const validPhases = ["probe", "dig", "fill", "hypercorrect", "retest"];
  if (!validPhases.includes(phase)) {
    return {
      error: `Invalid phase. Must be one of: ${validPhases.join(", ")}`,
    };
  }

  setPhase(phase);

  let instructions = "";
  if (phase === "fill") {
    const gaps = getGaps();
    instructions = `FILL phase: For each of these ${gaps.length} gaps, search vault for grounding content and provide model SAQ-style answers. Gaps: ${gaps.map((g) => g.name).join(", ")}`;
  } else if (phase === "hypercorrect") {
    const targets = getHypercorrectionTargets();
    instructions = `HYPERCORRECT phase: Address ${targets.length} high-confidence errors. For each, surface the contradiction, present evidence, and give vivid mechanistic correction. Targets: ${targets.map((t) => t.name).join(", ")}`;
  } else if (phase === "retest") {
    const gaps = getGaps();
    instructions = `RETEST phase: Re-probe ${gaps.length} gap vertices with different angle questions. Score again. Name 2-3 open loops at the end.`;
  }

  callbacks.onSystem(`Phase → ${phase}`, {
    name: "pex_set_phase",
    filename: phase,
    status: "success",
  });

  return { phase, instructions };
};

// ─── Tool: pex_mark_filled ───────────────────────────────────────────

export const markFilledDeclaration = {
  name: "pex_mark_filled",
  description:
    "Mark a gap vertex as filled after providing the model answer. Call after delivering the FILL content for a vertex.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      vertex: {
        type: Type.STRING,
        description: "The vertex name to mark as filled",
      },
    },
    required: ["vertex"],
  },
};

export const executeMarkFilled = async (
  args: ToolArgs,
  callbacks: ToolCallbacks,
): Promise<unknown> => {
  const vertex = getStringArg(args, "vertex");
  if (!vertex) return { error: "vertex parameter is required" };

  markFilled(vertex);
  callbacks.onSystem(`Filled: ${vertex}`, {
    name: "pex_mark_filled",
    filename: vertex,
    status: "success",
  });
  return { vertex, filled: true };
};

// ─── Tool: pex_mark_corrected ────────────────────────────────────────

export const markCorrectedDeclaration = {
  name: "pex_mark_corrected",
  description:
    "Mark a hypercorrection target as corrected after delivering the correction. Call after the HYPERCORRECT phase for a vertex.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      vertex: {
        type: Type.STRING,
        description: "The vertex name to mark as corrected",
      },
    },
    required: ["vertex"],
  },
};

export const executeMarkCorrected = async (
  args: ToolArgs,
  callbacks: ToolCallbacks,
): Promise<unknown> => {
  const vertex = getStringArg(args, "vertex");
  if (!vertex) return { error: "vertex parameter is required" };

  markCorrected(vertex);
  callbacks.onSystem(`Corrected: ${vertex}`, {
    name: "pex_mark_corrected",
    filename: vertex,
    status: "success",
  });
  return { vertex, corrected: true };
};

// ─── Tool: pex_search_grounding ──────────────────────────────────────

export const searchGroundingDeclaration = {
  name: "pex_search_grounding",
  description:
    "Search the Obsidian vault for content to ground PEX interview responses. Use during FILL and DIG phases to find relevant SAQs, learning objectives, and notes.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "Search query — topic, equation name, or physiological concept",
      },
      limit: {
        type: Type.NUMBER,
        description: "Max results to return (default: 5)",
      },
    },
    required: ["query"],
  },
};

export const executeSearchGrounding = async (
  args: ToolArgs,
  callbacks: ToolCallbacks,
): Promise<unknown> => {
  const query = getStringArg(args, "query");
  const limit = getNumberArg(args, "limit") ?? 5;

  if (!query) return { error: "query parameter is required" };

  const app = getObsidianApp();
  if (!app?.vault) {
    return { error: "Obsidian vault not available" };
  }

  const files = app.vault.getMarkdownFiles();
  const results: Array<{
    path: string;
    name: string;
    excerpt: string;
    score: number;
  }> = [];

  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/);

  for (const file of files) {
    // Score based on filename match + content match
    const nameLower = file.path.toLowerCase();
    let score = 0;

    for (const term of queryTerms) {
      if (nameLower.includes(term)) score += 3;
    }

    // Check metadata cache for tags and headings
    const cache = app.metadataCache.getFileCache(file);
    if (cache?.headings) {
      for (const heading of cache.headings) {
        const headingLower = heading.heading.toLowerCase();
        for (const term of queryTerms) {
          if (headingLower.includes(term)) score += 2;
        }
      }
    }

    if (cache?.tags) {
      for (const tag of cache.tags) {
        const tagLower = tag.tag.toLowerCase();
        for (const term of queryTerms) {
          if (tagLower.includes(term)) score += 1;
        }
      }
    }

    if (score > 0) {
      // Read a small excerpt
      let excerpt = "";
      try {
        const content = await app.vault.cachedRead(file);
        const contentLower = content.toLowerCase();
        const idx = contentLower.indexOf(queryTerms[0]);
        if (idx >= 0) {
          const start = Math.max(0, idx - 100);
          const end = Math.min(content.length, idx + 400);
          excerpt = content.slice(start, end).trim();
        } else {
          excerpt = content.slice(0, 500).trim();
        }
      } catch {
        excerpt = "(could not read file)";
      }

      results.push({ path: file.path, name: file.name, excerpt, score });
    }
  }

  // Sort by score descending, take top N
  results.sort((a, b) => b.score - a.score);
  const topResults = results.slice(0, limit);

  callbacks.onSystem(
    `Found ${topResults.length} grounding results for "${query}"`,
    {
      name: "pex_search_grounding",
      filename: query,
      status: "success",
    },
  );

  return {
    query,
    totalMatches: results.length,
    results: topResults.map((r) => ({
      path: r.path,
      name: r.name,
      excerpt: r.excerpt,
      relevanceScore: r.score,
    })),
  };
};

// ─── Tool: pex_export_report ─────────────────────────────────────────

export const exportReportDeclaration = {
  name: "pex_export_report",
  description:
    "Export the PEX interview session as a markdown study plan. Saves to the vault's chat-history folder. Call at session end or when user requests export.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      additionalNotes: {
        type: Type.STRING,
        description: "Optional notes to include in the export",
      },
    },
  },
};

export const executeExportReport = async (
  args: ToolArgs,
  callbacks: ToolCallbacks,
): Promise<unknown> => {
  const additionalNotes = getStringArg(args, "additionalNotes") ?? "";
  const state = getPexState();
  const summary = getSessionSummary();
  const gaps = getGaps();
  const strengths = getStrengths();
  const hcTargets = getHypercorrectionTargets();

  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `PEX-Interview-${dateStr}-${state.college}.md`;

  const gapSection = gaps
    .map(
      (g) =>
        `| ${g.name} | ${g.bestScore}/5 | ${g.quadrant} | ${g.subTopics.join(", ")} |`,
    )
    .join("\n");

  const strengthSection = strengths
    .map((s) => `| ${s.name} | ${s.bestScore}/5 | SOLID |`)
    .join("\n");

  const hcSection = hcTargets
    .map(
      (h) =>
        `| ${h.name} | ${h.bestScore}/5 | ${h.corrected ? "Corrected" : "NEEDS REVIEW"} |`,
    )
    .join("\n");

  const historySection = state.probeHistory
    .map(
      (p) =>
        `| ${p.vertex} | L${p.level} | ${p.score}/5 | ${p.quadrant} | ${p.answerSummary.slice(0, 80)} |`,
    )
    .join("\n");

  const content = `---
title: PEX Interview — ${state.college}
date: ${dateStr}
tags:
  - pex-interview
  - study-plan
  - ${state.college.toLowerCase()}
college: ${state.college}
domains: [${state.domains.length === 0 ? "All" : state.domains.join(", ")}]
depth: ${state.depth}
mean_score: ${summary.meanScore}
gaps: ${summary.gaps}
strengths: ${summary.strengths}
---

# PEX Interview Report — ${state.college}

**Date:** ${dateStr}
**Domains:** ${state.domains.length === 0 ? "All" : state.domains.join(", ")}
**Depth:** ${state.depth}
**Duration:** ${Math.round((Date.now() - state.startedAt) / 60000)} minutes

## Session Summary

| Metric | Value |
|--------|-------|
| Total Vertices | ${summary.totalVertices} |
| Probed | ${summary.probed} |
| Mean Score | ${summary.meanScore}/5 |
| Gaps | ${summary.gaps} |
| Strengths | ${summary.strengths} |
| Hypercorrection Targets | ${summary.hypercorrectionTargets} |
| Filled | ${summary.filled} |
| Corrected | ${summary.corrected} |

## Gaps (Priority Study Areas)

| Vertex | Score | Classification | Sub-topics |
|--------|-------|----------------|------------|
${gapSection || "| (none) | — | — | — |"}

## Strengths

| Vertex | Score | Classification |
|--------|-------|----------------|
${strengthSection || "| (none) | — | — |"}

## Hypercorrection Targets

| Vertex | Score | Status |
|--------|-------|--------|
${hcSection || "| (none) | — | — |"}

## Probe History

| Vertex | Level | Score | Quadrant | Answer Summary |
|--------|-------|-------|----------|----------------|
${historySection || "| (none) | — | — | — | — |"}

${additionalNotes ? `## Notes\n\n${additionalNotes}\n` : ""}

## Study Recommendations

1. **Immediate priority:** Review gap vertices and their sub-topics
2. **Hypercorrection targets:** These were confidently wrong — highest learning yield
3. **Borderline vertices:** Re-probe in next session with different angles
4. **Cross-domain bridges:** Connect gap vertices to strength vertices via shared variables

---
*Generated by Hermes PEX Interview Mode*
`;

  const app = getObsidianApp();
  if (app?.vault) {
    try {
      const folder = "chat-history";
      const folderExists = app.vault.getAbstractFileByPath(folder);
      if (!folderExists) {
        await app.vault.createFolder(folder);
      }
      const filePath = `${folder}/${filename}`;
      const existing = app.vault.getAbstractFileByPath(filePath);
      if (existing) {
        await app.vault.delete(existing);
      }
      await app.vault.create(filePath, content);

      callbacks.onSystem(`Study plan exported: ${filePath}`, {
        name: "pex_export_report",
        filename: filePath,
        status: "success",
      });

      return {
        status: "exported",
        path: filePath,
        summary,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `Failed to save report: ${msg}` };
    }
  }

  return { error: "Vault not available", content };
};

// ─── Tool: pex_end_interview ─────────────────────────────────────────

export const endInterviewDeclaration = {
  name: "pex_end_interview",
  description:
    "End the PEX interview session and reset state. Optionally export report first.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      exportReport: {
        type: Type.BOOLEAN,
        description: "Export study plan before ending (default: true)",
      },
    },
  },
};

export const executeEndInterview = async (
  args: ToolArgs,
  callbacks: ToolCallbacks,
): Promise<unknown> => {
  const shouldExport = getBoolArg(args, "exportReport") ?? true;

  let exportResult = null;
  if (shouldExport) {
    exportResult = await executeExportReport({}, callbacks);
  }

  const finalSummary = getSessionSummary();
  resetPexState();

  callbacks.onSystem("PEX Interview ended", {
    name: "pex_end_interview",
    filename: "Session complete",
    status: "success",
  });

  return {
    status: "ended",
    finalSummary,
    exportResult,
  };
};

// ─── Aggregated exports ──────────────────────────────────────────────

export const PEX_DECLARATIONS = [
  startInterviewDeclaration,
  recordProbeDeclaration,
  advanceVertexDeclaration,
  getStateDeclaration,
  setPhaseDeclaration,
  markFilledDeclaration,
  markCorrectedDeclaration,
  searchGroundingDeclaration,
  exportReportDeclaration,
  endInterviewDeclaration,
];

export const PEX_TOOLS: Record<
  string,
  {
    declaration: (typeof PEX_DECLARATIONS)[number];
    execute: (args: ToolArgs, callbacks: ToolCallbacks) => Promise<unknown>;
  }
> = {
  pex_start_interview: {
    declaration: startInterviewDeclaration,
    execute: executeStartInterview,
  },
  pex_record_probe: {
    declaration: recordProbeDeclaration,
    execute: executeRecordProbe,
  },
  pex_advance_vertex: {
    declaration: advanceVertexDeclaration,
    execute: executeAdvanceVertex,
  },
  pex_get_state: {
    declaration: getStateDeclaration,
    execute: executeGetState,
  },
  pex_set_phase: {
    declaration: setPhaseDeclaration,
    execute: executeSetPhase,
  },
  pex_mark_filled: {
    declaration: markFilledDeclaration,
    execute: executeMarkFilled,
  },
  pex_mark_corrected: {
    declaration: markCorrectedDeclaration,
    execute: executeMarkCorrected,
  },
  pex_search_grounding: {
    declaration: searchGroundingDeclaration,
    execute: executeSearchGrounding,
  },
  pex_export_report: {
    declaration: exportReportDeclaration,
    execute: executeExportReport,
  },
  pex_end_interview: {
    declaration: endInterviewDeclaration,
    execute: executeEndInterview,
  },
};
