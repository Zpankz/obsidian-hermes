/**
 * Background Analyzer (System 2) — Slow, deliberate analysis agent.
 *
 * Runs parallel to the Gemini Live session using the same GoogleGenAI instance.
 * Uses `ai.models.generateContent()` for deep analysis of probe answers,
 * nuanced scoring, and follow-up question generation.
 *
 * Based on the Talker-Reasoner architecture (DeepMind 2024, arXiv 2410.08328)
 * and Swiss Cheese knowledge assessment model.
 */

import type { GoogleGenAI } from "@google/genai";
import type { PexSessionState, Quadrant } from "./pexState";
import { getPexState, classifyQuadrant } from "./pexState";

/** Analysis result from System 2 for a single probe answer. */
export interface ProbeAnalysis {
  readonly adjustedScore: number;
  readonly adjustedConfidence: boolean;
  readonly quadrant: Quadrant;
  readonly reasoning: string;
  readonly followUpAngles: readonly string[];
  readonly misconceptions: readonly string[];
  readonly depthReached:
    | "surface"
    | "mechanism"
    | "application"
    | "integration";
  readonly suggestedNextLayer: string | null;
}

/** Belief state maintained by System 2 across the session. */
export interface BeliefState {
  readonly vertexBeliefs: Readonly<
    Record<
      string,
      {
        readonly layers: readonly LayerProbe[];
        readonly overallStrength: number;
        readonly confidenceCalibration: number;
        readonly knownMisconceptions: readonly string[];
      }
    >
  >;
  readonly sessionInsights: readonly string[];
}

/** A single probe at a specific layer for a vertex. */
export interface LayerProbe {
  readonly layer: "recall" | "mechanism" | "clinical" | "quantitative";
  readonly question: string;
  readonly answerSummary: string;
  readonly score: number;
  readonly confident: boolean;
  readonly timestamp: number;
}

const LAYER_DEFINITIONS = {
  recall: "Basic factual recall — definitions, equations, names",
  mechanism: "Mechanistic understanding — why, how, cause-effect",
  clinical: "Clinical application — when, where, clinical scenarios",
  quantitative: "Quantitative reasoning — calculations, values, ranges",
} as const;

const LAYER_ORDER: readonly (keyof typeof LAYER_DEFINITIONS)[] = [
  "recall",
  "mechanism",
  "clinical",
  "quantitative",
];

export class BackgroundAnalyzer {
  private ai: GoogleGenAI;
  private model: string;
  private beliefState: BeliefState;
  private pendingAnalysis: Promise<ProbeAnalysis> | null = null;

  constructor(ai: GoogleGenAI) {
    this.ai = ai;
    this.model = "gemini-2.5-flash";
    this.beliefState = {
      vertexBeliefs: {},
      sessionInsights: [],
    };
  }

  /** Get the current belief state for context injection. */
  getBeliefState(): BeliefState {
    return this.beliefState;
  }

  /** Get the next layer to probe for a given vertex. */
  getNextLayer(vertex: string): keyof typeof LAYER_DEFINITIONS | null {
    const beliefs = this.beliefState.vertexBeliefs[vertex];
    if (!beliefs) return "recall";

    const probedLayers = new Set(beliefs.layers.map((l) => l.layer));
    for (const layer of LAYER_ORDER) {
      if (!probedLayers.has(layer)) return layer;
    }

    // All layers probed — check if any need re-probing (score <= 2)
    const weakLayers = beliefs.layers.filter((l) => l.score <= 2);
    if (weakLayers.length > 0) return null; // Done with this vertex

    return null;
  }

  /** Check if a vertex has been sufficiently probed (all layers or clear gap). */
  isVertexComplete(vertex: string): boolean {
    const beliefs = this.beliefState.vertexBeliefs[vertex];
    if (!beliefs) return false;

    // Complete if all 4 layers probed
    if (beliefs.layers.length >= 4) return true;

    // Complete if 2+ layers show score <= 2 (clear gap, no need to keep probing)
    const gapLayers = beliefs.layers.filter((l) => l.score <= 2);
    if (gapLayers.length >= 2) return true;

    // Complete if 2+ layers show score >= 4 (clearly strong)
    const strongLayers = beliefs.layers.filter((l) => l.score >= 4);
    if (strongLayers.length >= 2) return true;

    return false;
  }

  /**
   * Analyze a probe answer asynchronously (System 2 processing).
   * Returns a promise that resolves with detailed analysis.
   * Non-blocking — the voice agent continues while this runs.
   */
  async analyzeProbe(params: {
    readonly vertex: string;
    readonly vertexDescription: string;
    readonly layer: keyof typeof LAYER_DEFINITIONS;
    readonly question: string;
    readonly answerSummary: string;
    readonly rawScore: number;
    readonly confident: boolean;
  }): Promise<ProbeAnalysis> {
    // Store the layer probe in belief state
    const layerProbe: LayerProbe = {
      layer: params.layer,
      question: params.question,
      answerSummary: params.answerSummary,
      score: params.rawScore,
      confident: params.confident,
      timestamp: Date.now(),
    };

    const existingBeliefs = this.beliefState.vertexBeliefs[params.vertex] ?? {
      layers: [],
      overallStrength: 0,
      confidenceCalibration: 1.0,
      knownMisconceptions: [],
    };

    const updatedLayers = [...existingBeliefs.layers, layerProbe];

    // Calculate overall strength from all layer scores
    const scores = updatedLayers.map((l) => l.score);
    const overallStrength = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Calculate confidence calibration
    const confidenceCalibration =
      this.calculateConfidenceCalibration(updatedLayers);

    this.beliefState = {
      ...this.beliefState,
      vertexBeliefs: {
        ...this.beliefState.vertexBeliefs,
        [params.vertex]: {
          ...existingBeliefs,
          layers: updatedLayers,
          overallStrength: Math.round(overallStrength * 10) / 10,
          confidenceCalibration: Math.round(confidenceCalibration * 100) / 100,
        },
      },
    };

    // Run deep analysis via generateContent (System 2)
    try {
      const analysis = await this.runDeepAnalysis(params, updatedLayers);
      return analysis;
    } catch (err) {
      console.error("[System2] Deep analysis failed, using fallback:", err);
      return this.fallbackAnalysis(params);
    }
  }

  private async runDeepAnalysis(
    params: {
      readonly vertex: string;
      readonly vertexDescription: string;
      readonly layer: keyof typeof LAYER_DEFINITIONS;
      readonly question: string;
      readonly answerSummary: string;
      readonly rawScore: number;
      readonly confident: boolean;
    },
    allLayers: readonly LayerProbe[],
  ): Promise<ProbeAnalysis> {
    const state = getPexState();
    const layerHistory = allLayers
      .map(
        (l) =>
          `  ${l.layer}: score=${l.score}/5, confident=${l.confident}, "${l.answerSummary}"`,
      )
      .join("\n");

    const prompt = `You are a medical exam assessment expert analyzing a student's response during a voice-based ANZCA/CICM Primary Exam interview.

VERTEX: ${params.vertex}
DESCRIPTION: ${params.vertexDescription}
CURRENT LAYER: ${params.layer} (${LAYER_DEFINITIONS[params.layer]})

QUESTION ASKED: "${params.question}"
STUDENT'S ANSWER: "${params.answerSummary}"
INITIAL SCORE: ${params.rawScore}/5
STUDENT CONFIDENCE: ${params.confident ? "confident" : "uncertain"}

PREVIOUS LAYERS FOR THIS VERTEX:
${layerHistory || "(first probe)"}

SESSION CONTEXT: ${state.college}, probed ${state.probeHistory.length} questions so far.

Analyze the student's response and provide:

1. ADJUSTED_SCORE (1-5): Recalibrate the score considering the full layer history. A student who scores 4 on recall but 2 on mechanism has surface knowledge only.
2. ADJUSTED_CONFIDENCE: true/false — does their confidence match their actual accuracy?
3. MISCONCEPTIONS: List any specific factual errors or misconceptions detected.
4. DEPTH_REACHED: One of "surface", "mechanism", "application", "integration" — how deep is their actual understanding?
5. FOLLOW_UP_ANGLES: 2-3 short voice-friendly questions (under 15 words each) that would probe from a different angle. Focus on the next unprobbed layer.
6. REASONING: Brief explanation of your assessment (2-3 sentences).

Respond in JSON format:
{
  "adjustedScore": number,
  "adjustedConfidence": boolean,
  "misconceptions": string[],
  "depthReached": string,
  "followUpAngles": string[],
  "reasoning": string
}`;

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const text = response.text ?? "";
    const parsed = JSON.parse(text);

    const adjustedScore = Math.max(
      1,
      Math.min(5, Math.round(parsed.adjustedScore ?? params.rawScore)),
    );
    const adjustedConfidence =
      typeof parsed.adjustedConfidence === "boolean"
        ? parsed.adjustedConfidence
        : params.confident;

    const quadrant = classifyQuadrant(adjustedScore, adjustedConfidence);

    // Track misconceptions in belief state
    const misconceptions = Array.isArray(parsed.misconceptions)
      ? parsed.misconceptions.filter(
          (m: unknown): m is string => typeof m === "string",
        )
      : [];

    if (misconceptions.length > 0) {
      const existingBeliefs = this.beliefState.vertexBeliefs[params.vertex];
      if (existingBeliefs) {
        const allMisconceptions = [
          ...new Set([
            ...existingBeliefs.knownMisconceptions,
            ...misconceptions,
          ]),
        ];
        this.beliefState = {
          ...this.beliefState,
          vertexBeliefs: {
            ...this.beliefState.vertexBeliefs,
            [params.vertex]: {
              ...existingBeliefs,
              knownMisconceptions: allMisconceptions,
            },
          },
        };
      }
    }

    const nextLayer = this.getNextLayer(params.vertex);

    return {
      adjustedScore,
      adjustedConfidence,
      quadrant,
      reasoning: parsed.reasoning ?? "",
      followUpAngles: Array.isArray(parsed.followUpAngles)
        ? parsed.followUpAngles.filter(
            (a: unknown): a is string => typeof a === "string",
          )
        : [],
      misconceptions,
      depthReached: parsed.depthReached ?? "surface",
      suggestedNextLayer: nextLayer,
    };
  }

  private fallbackAnalysis(params: {
    readonly rawScore: number;
    readonly confident: boolean;
    readonly vertex: string;
  }): ProbeAnalysis {
    const quadrant = classifyQuadrant(params.rawScore, params.confident);
    const nextLayer = this.getNextLayer(params.vertex);

    return {
      adjustedScore: params.rawScore,
      adjustedConfidence: params.confident,
      quadrant,
      reasoning: "Fallback analysis — deep analysis unavailable.",
      followUpAngles: [],
      misconceptions: [],
      depthReached: "surface",
      suggestedNextLayer: nextLayer,
    };
  }

  /**
   * Generate a context injection string for the voice agent.
   * Called after System 2 analysis completes.
   */
  generateContextInjection(vertex: string, analysis: ProbeAnalysis): string {
    const beliefs = this.beliefState.vertexBeliefs[vertex];
    const layerCount = beliefs?.layers.length ?? 0;
    const totalLayers = 4;

    const parts: string[] = [
      `[SYSTEM 2 ANALYSIS — ${vertex}]`,
      `Layers probed: ${layerCount}/${totalLayers}`,
      `Adjusted score: ${analysis.adjustedScore}/5 (${analysis.quadrant})`,
      `Depth reached: ${analysis.depthReached}`,
    ];

    if (analysis.misconceptions.length > 0) {
      parts.push(
        `Misconceptions detected (DO NOT correct now, save for teaching phase): ${analysis.misconceptions.join("; ")}`,
      );
    }

    if (analysis.suggestedNextLayer) {
      parts.push(
        `Next layer to probe: ${analysis.suggestedNextLayer} — ${LAYER_DEFINITIONS[analysis.suggestedNextLayer as keyof typeof LAYER_DEFINITIONS]}`,
      );
    }

    if (analysis.followUpAngles.length > 0) {
      parts.push(
        `Suggested follow-up questions:\n${analysis.followUpAngles.map((q) => `  - "${q}"`).join("\n")}`,
      );
    }

    if (!analysis.suggestedNextLayer) {
      parts.push(`Vertex complete — call pex_advance_vertex to move on.`);
    } else {
      parts.push(
        `DO NOT advance yet — probe the ${analysis.suggestedNextLayer} layer next.`,
      );
    }

    return parts.join("\n");
  }

  /** Calculate how well-calibrated the student's confidence is. */
  private calculateConfidenceCalibration(
    layers: readonly LayerProbe[],
  ): number {
    if (layers.length === 0) return 1.0;

    let calibrationSum = 0;
    for (const layer of layers) {
      const isCorrect = layer.score >= 3;
      const isConfident = layer.confident;
      // Perfect calibration: confident when correct, unconfident when incorrect
      if (isCorrect === isConfident) {
        calibrationSum += 1;
      } else {
        calibrationSum += 0;
      }
    }
    return calibrationSum / layers.length;
  }

  /** Reset belief state for a new session. */
  reset(): void {
    this.beliefState = {
      vertexBeliefs: {},
      sessionInsights: [],
    };
    this.pendingAnalysis = null;
  }
}
