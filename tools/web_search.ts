
import { GoogleGenAI, Type } from "@google/genai";
import { loadAppSettings } from '../persistence/persistence';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
};

export const declaration = {
  name: 'internet_search',
  description: 'Search the internet for real-time information, news, current events, or general knowledge outside the vault.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The search query to look up on the web.' }
    },
    required: ['query']
  }
};

export const instruction = `- internet_search: Use this to fetch real-time data or information not contained within the local vault. Always use this tool for questions about current events, celebrities, weather, or general knowledge.`;

export const execute = async (args: ToolArgs, callbacks: ToolCallbacks): Promise<{ text: string; groundingChunks: unknown[]; searchQuery: string }> => {
  // Get API key from settings or environment
  const settings = loadAppSettings();
  const apiKey = settings?.manualApiKey?.trim();
  
  if (!apiKey) {
    throw new Error('API key not found. Please set your Gemini API key in the plugin settings.');
  }
  
  // Send initial pending message
  const query = getStringArg(args, 'query');
  if (!query) {
    throw new Error('Missing query');
  }

  callbacks.onSystem(`Internet search: ${query}`, {
    name: 'internet_search',
    filename: query,
    status: 'pending'
  });
  
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const text = response.text || "No results found.";
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  // Update system message with results and grounding chunks
  callbacks.onSystem(`Internet search: ${query}`, {
    name: 'internet_search',
    filename: query,
    status: 'success',
    newContent: text,
    groundingChunks: groundingChunks
  });

  return { 
    text, 
    groundingChunks,
    searchQuery: query
  };
};
