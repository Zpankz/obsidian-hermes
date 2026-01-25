import { GoogleGenAI, Content, Part, FunctionCall } from '@google/genai';
import { ConnectionStatus, VoiceAssistantCallbacks, AppSettings, UsageMetadata, ToolData } from '../types';
import { COMMAND_DECLARATIONS, executeCommand } from './commands';

export interface TextInterfaceCallbacks {
  onLog: (message: string, type: 'info' | 'action' | 'error', duration?: number, errorDetails?: any) => void;
  onTranscription: (role: 'user' | 'model', text: string, isComplete: boolean) => void;
  onSystemMessage: (text: string, toolData?: ToolData) => void;
  onFileStateChange: (folder: string, note: string | string[] | null) => void;
  onUsageUpdate: (usage: UsageMetadata) => void;
}

export class GeminiTextInterface {
  private ai: GoogleGenAI | null = null;
  private chatHistory: Content[] = [];
  private currentFolder = '/';
  private currentNote: string | null = null;
  private systemInstruction: string = '';
  private model = 'gemini-2.0-flash';

  constructor(private callbacks: TextInterfaceCallbacks) {}

  async initialize(
    apiKey: string,
    settings: AppSettings,
    initialState?: { folder: string; note: string | null }
  ): Promise<void> {
    if (initialState) {
      this.currentFolder = initialState.folder;
      this.currentNote = initialState.note;
    }

    this.callbacks.onLog('Initializing text interface...', 'info');

    this.ai = new GoogleGenAI({ apiKey });

    const contextString = `
CURRENT_CONTEXT:
Current Folder Path: ${this.currentFolder}
Current Note Name: ${this.currentNote || 'No note currently selected'}
`;
    this.systemInstruction = `${settings.systemInstruction}\n${contextString}\n\n${settings.customContext}`.trim();

    this.callbacks.onLog('Text interface ready.', 'info');
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.ai) {
      this.callbacks.onLog('Text interface not initialized', 'error');
      return;
    }

    // Add user message to history
    this.chatHistory.push({
      role: 'user',
      parts: [{ text }]
    });

    // Show user message immediately
    this.callbacks.onTranscription('user', text, true);

    try {
      await this.processConversation();
    } catch (err: any) {
      // Verbose console logging
      console.error('=== TEXT INTERFACE ERROR ===');
      console.error('Error Type:', err.constructor.name);
      console.error('Error Message:', err.message);
      console.error('Error Stack:', err.stack);
      console.error('API Call:', 'sendMessage');
      console.error('Timestamp:', new Date().toISOString());
      console.error('User Agent:', navigator.userAgent);
      console.error('Model:', this.model);
      console.error('Chat History Length:', this.chatHistory.length);
      console.error('System Instruction Length:', this.systemInstruction.length);
      console.error('Current Folder:', this.currentFolder);
      console.error('Current Note:', this.currentNote);
      console.error('=== END TEXT INTERFACE ERROR ===');
      
      const errorDetails = {
        toolName: 'GeminiTextInterface',
        apiCall: 'sendMessage',
        stack: err.stack,
        content: err.message,
        userAgent: navigator.userAgent,
        model: this.model,
        chatHistoryLength: this.chatHistory.length,
        systemInstructionLength: this.systemInstruction.length,
        timestamp: new Date().toISOString(),
        currentFolder: this.currentFolder,
        currentNote: this.currentNote
      };
      this.callbacks.onLog(`Text API Error: ${err.message}`, 'error', undefined, errorDetails);
      
      // Show error as system message in chat
      this.callbacks.onSystemMessage(`ERROR: ${err.message}`, {
        id: 'error-' + Date.now(),
        name: 'error',
        filename: '',
        status: 'error',
        error: err.message
      });
    }
  }

  private async processConversation(): Promise<void> {
    if (!this.ai) return;

    // Show typing indicator
    this.callbacks.onTranscription('model', '...', false);

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: this.chatHistory,
      config: {
        systemInstruction: this.systemInstruction,
        tools: [{ functionDeclarations: COMMAND_DECLARATIONS }]
      }
    });

    // Handle usage metadata
    if (response.usageMetadata) {
      this.callbacks.onUsageUpdate({
        promptTokenCount: response.usageMetadata.promptTokenCount,
        candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
        totalTokenCount: response.usageMetadata.totalTokenCount
      });
    }

    const candidate = response.candidates?.[0];
    if (!candidate?.content) {
      this.callbacks.onTranscription('model', 'No response received.', true);
      return;
    }

    // Check for function calls
    const functionCalls = candidate.content.parts?.filter(
      (part): part is Part & { functionCall: FunctionCall } => !!part.functionCall
    );

    if (functionCalls && functionCalls.length > 0) {
      // Add model's function call response to history
      this.chatHistory.push(candidate.content);

      // Execute each function call
      const functionResponses: Part[] = [];

      for (const part of functionCalls) {
        const fc = part.functionCall;
        try {
          const result = await executeCommand(fc.name, fc.args, {
            onLog: (m, t, d) => this.callbacks.onLog(m, t, d),
            onSystem: (t, d) => this.callbacks.onSystemMessage(t, d),
            onFileState: (folder, note) => {
              this.currentFolder = folder;
              this.currentNote = Array.isArray(note) ? note[note.length - 1] : note;
              this.callbacks.onFileStateChange(folder, note);
            }
          });

          functionResponses.push({
            functionResponse: {
              name: fc.name,
              response: { result }
            }
          });
        } catch (err: any) {
          // Verbose console logging
          console.error('=== TEXT INTERFACE TOOL ERROR ===');
          console.error('Tool Name:', fc.name);
          console.error('Tool Arguments:', fc.args);
          console.error('Error Type:', err.constructor.name);
          console.error('Error Message:', err.message);
          console.error('Error Stack:', err.stack);
          console.error('Timestamp:', new Date().toISOString());
          console.error('Model:', this.model);
          console.error('Current Folder:', this.currentFolder);
          console.error('Current Note:', this.currentNote);
          console.error('=== END TEXT INTERFACE TOOL ERROR ===');
          
          const errorDetails = {
            toolName: fc.name,
            content: JSON.stringify(fc.args, null, 2),
            contentSize: JSON.stringify(fc.args).length,
            stack: err.stack,
            apiCall: 'executeCommand',
            timestamp: new Date().toISOString(),
            model: this.model,
            currentFolder: this.currentFolder,
            currentNote: this.currentNote
          };
          this.callbacks.onLog(`Tool execution error in ${fc.name}: ${err.message}`, 'error', undefined, errorDetails);
          
          // Show error as system message in chat
          this.callbacks.onSystemMessage(`ERROR in ${fc.name}: ${err.message}`, {
            id: 'error-' + Date.now(),
            name: 'error',
            filename: '',
            status: 'error',
            error: err.message
          });

          functionResponses.push({
            functionResponse: {
              name: fc.name,
              response: { error: err.message }
            }
          });
        }
      }

      // Add function responses to history
      this.chatHistory.push({
        role: 'user',
        parts: functionResponses
      });

      // Continue the conversation to get the final response
      await this.processConversation();
    } else {
      // Extract text response
      const textParts = candidate.content.parts?.filter(part => part.text);
      const responseText = textParts?.map(part => part.text).join('') || '';

      // Add model response to history
      this.chatHistory.push(candidate.content);

      // Show the response
      this.callbacks.onTranscription('model', responseText, true);
    }
  }

  setApiKey(apiKey: string): void {
    this.ai = new GoogleGenAI({ apiKey });
  }

  clearHistory(): void {
    this.chatHistory = [];
  }

  getHistory(): Content[] {
    return this.chatHistory;
  }
}
