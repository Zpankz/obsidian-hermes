import { GoogleGenAI, Type } from "@google/genai";
import { loadAppSettings } from '../persistence/persistence';
import { createBinaryFile } from '../services/mockFiles';
import { getDirectoryFromPath } from '../utils/environment';

export const declaration = {
  name: 'generate_image_from_context',
  description: 'Generate an image based on the current context or provided prompt using Gemini API and save it to the vault.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: 'The prompt describing what image to generate. If not provided, will use current context.' },
      filename: { type: Type.STRING, description: 'The filename to save the image as (e.g., "generated-image.png"). If not provided, will auto-generate.' }
    },
    required: []
  }
};

export const instruction = `- generate_image_from_context: Use this to create images based on conversation context or specific prompts. Images are saved to the current vault directory.`;

export const execute = async (args: any, callbacks: any): Promise<any> => {
  // Get API key from settings or environment
  const settings = loadAppSettings();
  const apiKey = settings?.manualApiKey?.trim() || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error('API key not found. Please set your Gemini API key in the plugin settings.');
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  // Use provided prompt or generate from context
  let prompt = args.prompt;
  if (!prompt) {
    // Generate a prompt based on current conversation context
    prompt = "Generate an image based on the current conversation context and topic being discussed.";
  }
  
  try {
    // Generate image using Gemini's image generation capability
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: `Generate an image based on this prompt: ${prompt}. Please return the image as base64 data.`,
      config: {
        responseMimeType: 'text/plain'
      }
    });

    const text = response.text || '';
    
    // Try to extract base64 image data from the response
    let imageData = '';
    const base64Match = text.match(/data:image\/[a-z]+;base64,([A-Za-z0-9+/=]+)/);
    if (base64Match) {
      imageData = base64Match[1];
    } else {
      // If no base64 found, assume the entire response is the image data
      imageData = text.trim();
    }

    if (!imageData) {
      throw new Error('Failed to generate image data');
    }

    // Generate filename if not provided
    let filename = args.filename;
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      filename = `generated-image-${timestamp}.png`;
    }

    // Ensure filename has proper extension
    if (!filename.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
      filename += '.png';
    }

    // Convert base64 to binary data and save
    const binaryData = Buffer.from(imageData, 'base64');
    
    // Save the image file using the proper binary file creation function
    await createBinaryFile(filename, binaryData);

    callbacks.onSystem(`Generated image: ${filename}`, {
      name: 'generate_image_from_context',
      filename: filename,
      newContent: `Generated image (${binaryData.byteLength} bytes)`,
      description: `Image generated from prompt: ${prompt}`
    });

    const imageDirectory = getDirectoryFromPath(filename);
    callbacks.onFileState(imageDirectory, filename);

    return { 
      filename, 
      size: binaryData.byteLength,
      description: `Image generated from prompt: ${prompt}`
    };

  } catch (error: any) {
    throw new Error(`Failed to generate image: ${error.message}`);
  }
};
