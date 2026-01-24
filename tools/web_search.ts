
import { GoogleGenAI, Type } from "@google/genai";

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

export const execute = async (args: any, callbacks: any): Promise<any> => {
  // Use the API key from environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: args.query,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const text = response.text || "No results found.";
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  callbacks.onSystem(`Internet Search: ${args.query}`, {
    name: 'internet_search',
    filename: 'Web Resource',
    newContent: text,
    groundingChunks: groundingChunks
  });

  return { text, groundingChunks };
};
