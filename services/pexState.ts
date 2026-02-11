/**
 * PEX Interview session state management.
 * Tracks vertices, scores, phases, and quadrant classifications.
 * State lives in memory for the duration of a voice session.
 */

export type PexPhase =
  | "idle"
  | "scope"
  | "probe"
  | "map"
  | "dig"
  | "fill"
  | "hypercorrect"
  | "retest";

export type Quadrant =
  | "SOLID"
  | "UNDERCONFIDENT"
  | "GAP"
  | "HYPERCORRECTION_TARGET";

export interface ProbeResult {
  readonly vertex: string;
  readonly level: number;
  readonly score: number;
  readonly quadrant: Quadrant;
  readonly answerSummary: string;
  readonly timestamp: number;
}

export interface VertexState {
  readonly name: string;
  readonly description: string;
  readonly domains: readonly string[];
  readonly subTopics: readonly string[];
  readonly bestScore: number;
  readonly quadrant: Quadrant | null;
  readonly probeCount: number;
  readonly filled: boolean;
  readonly corrected: boolean;
}

export interface PexSessionState {
  readonly phase: PexPhase;
  readonly college: string;
  readonly domains: readonly string[];
  readonly depth: string;
  readonly vertexQueue: readonly string[];
  readonly currentVertexIndex: number;
  readonly vertices: Readonly<Record<string, VertexState>>;
  readonly probeHistory: readonly ProbeResult[];
  readonly startedAt: number;
}

const INITIAL_STATE: PexSessionState = {
  phase: "idle",
  college: "Both",
  domains: [],
  depth: "Broad BFS",
  vertexQueue: [],
  currentVertexIndex: 0,
  vertices: {},
  probeHistory: [],
  startedAt: 0,
};

let currentState: PexSessionState = { ...INITIAL_STATE };

export const getPexState = (): PexSessionState => currentState;

export const resetPexState = (): PexSessionState => {
  currentState = { ...INITIAL_STATE };
  return currentState;
};

export const initPexSession = (params: {
  readonly college: string;
  readonly domains: readonly string[];
  readonly depth: string;
  readonly vertexQueue: readonly string[];
  readonly vertices: Readonly<Record<string, VertexState>>;
}): PexSessionState => {
  currentState = {
    phase: "probe",
    college: params.college,
    domains: [...params.domains],
    depth: params.depth,
    vertexQueue: [...params.vertexQueue],
    currentVertexIndex: 0,
    vertices: { ...params.vertices },
    probeHistory: [],
    startedAt: Date.now(),
  };
  return currentState;
};

export const classifyQuadrant = (
  score: number,
  confident: boolean,
): Quadrant => {
  if (score >= 4 && confident) return "SOLID";
  if (score >= 3 && !confident) return "UNDERCONFIDENT";
  if (score <= 2 && confident) return "HYPERCORRECTION_TARGET";
  return "GAP";
};

export const recordProbe = (probe: {
  readonly vertex: string;
  readonly level: number;
  readonly score: number;
  readonly confident: boolean;
  readonly answerSummary: string;
}): PexSessionState => {
  const quadrant = classifyQuadrant(probe.score, probe.confident);
  const result: ProbeResult = {
    vertex: probe.vertex,
    level: probe.level,
    score: probe.score,
    quadrant,
    answerSummary: probe.answerSummary,
    timestamp: Date.now(),
  };

  const existing = currentState.vertices[probe.vertex];
  if (!existing) return currentState;

  const updatedVertex: VertexState = {
    ...existing,
    bestScore: Math.max(existing.bestScore, probe.score),
    quadrant,
    probeCount: existing.probeCount + 1,
  };

  currentState = {
    ...currentState,
    vertices: {
      ...currentState.vertices,
      [probe.vertex]: updatedVertex,
    },
    probeHistory: [...currentState.probeHistory, result],
  };
  return currentState;
};

export const advanceVertex = (): PexSessionState => {
  const nextIndex = currentState.currentVertexIndex + 1;
  const newPhase =
    nextIndex >= currentState.vertexQueue.length ? "fill" : "probe";
  currentState = {
    ...currentState,
    currentVertexIndex: nextIndex,
    phase: newPhase,
  };
  return currentState;
};

export const setPhase = (phase: PexPhase): PexSessionState => {
  currentState = { ...currentState, phase };
  return currentState;
};

export const markFilled = (vertex: string): PexSessionState => {
  const existing = currentState.vertices[vertex];
  if (!existing) return currentState;
  currentState = {
    ...currentState,
    vertices: {
      ...currentState.vertices,
      [vertex]: { ...existing, filled: true },
    },
  };
  return currentState;
};

export const markCorrected = (vertex: string): PexSessionState => {
  const existing = currentState.vertices[vertex];
  if (!existing) return currentState;
  currentState = {
    ...currentState,
    vertices: {
      ...currentState.vertices,
      [vertex]: { ...existing, corrected: true },
    },
  };
  return currentState;
};

export const getGaps = (): readonly VertexState[] =>
  Object.values(currentState.vertices).filter(
    (v) => v.quadrant === "GAP" || v.quadrant === "HYPERCORRECTION_TARGET",
  );

export const getHypercorrectionTargets = (): readonly VertexState[] =>
  Object.values(currentState.vertices).filter(
    (v) => v.quadrant === "HYPERCORRECTION_TARGET",
  );

export const getStrengths = (): readonly VertexState[] =>
  Object.values(currentState.vertices).filter(
    (v) => v.quadrant === "SOLID" || v.bestScore >= 4,
  );

export const getSessionSummary = (): {
  readonly totalVertices: number;
  readonly probed: number;
  readonly gaps: number;
  readonly strengths: number;
  readonly hypercorrectionTargets: number;
  readonly filled: number;
  readonly corrected: number;
  readonly meanScore: number;
  readonly phase: PexPhase;
} => {
  const verts = Object.values(currentState.vertices);
  const probed = verts.filter((v) => v.probeCount > 0);
  const scores = probed.map((v) => v.bestScore);
  const meanScore =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return {
    totalVertices: verts.length,
    probed: probed.length,
    gaps: verts.filter(
      (v) => v.quadrant === "GAP" || v.quadrant === "HYPERCORRECTION_TARGET",
    ).length,
    strengths: verts.filter((v) => v.quadrant === "SOLID" || v.bestScore >= 4)
      .length,
    hypercorrectionTargets: verts.filter(
      (v) => v.quadrant === "HYPERCORRECTION_TARGET",
    ).length,
    filled: verts.filter((v) => v.filled).length,
    corrected: verts.filter((v) => v.corrected).length,
    meanScore: Math.round(meanScore * 10) / 10,
    phase: currentState.phase,
  };
};
