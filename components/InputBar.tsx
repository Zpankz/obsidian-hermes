
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ConnectionStatus } from '../types';
import { loadChatHistory } from '../persistence/persistence';

interface InputBarProps {
  inputText: string;
  setInputText: (t: string) => void;
  onSendText: (e: React.FormEvent) => void;
  isListening: boolean;
  onStartSession: () => void;
  onStopSession: () => void;
  status: ConnectionStatus;
  activeSpeaker: 'user' | 'model' | 'none';
  volume: number;
}

const InputBar: React.FC<InputBarProps> = ({
  inputText,
  setInputText,
  onSendText,
  isListening,
  onStartSession,
  onStopSession,
  status,
  activeSpeaker,
  volume,
}) => {
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history on component mount
  useEffect(() => {
    const history = loadChatHistory();
    setChatHistory(history);
  }, []);

  // Normalize volume for visualization (0-1)
  const normalizedVolume = useMemo(() => Math.min(1, Math.max(0, volume * 10)), [volume]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (chatHistory.length > 0) {
        const newIndex = historyIndex < chatHistory.length - 1 ? historyIndex + 1 : chatHistory.length - 1;
        setHistoryIndex(newIndex);
        setInputText(chatHistory[chatHistory.length - 1 - newIndex]);
        
        // Select all text when navigating through history
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.select();
          }
        }, 0);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputText(chatHistory[chatHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputText('');
      }
    } else if (e.key === 'Escape') {
      setHistoryIndex(-1);
    } else {
      // Reset history index when typing anything else
      setHistoryIndex(-1);
    }
  };

  return (
    <footer className="h-[100px] pb-5 px-8 hermes-footer-bg backdrop-blur-2xl hermes-border-t flex items-center justify-center shrink-0">
      <div className="flex items-center space-x-6 w-full max-w-5xl">

        {/* Text Input Form */}
        <form 
          onSubmit={onSendText} 
          className="flex-grow flex items-center"
        >
          <input 
            ref={inputRef}
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Hermes..." 
            className="flex-1 hermes-input-bg hermes-input-text hermes-input-border border rounded-lg px-4 py-2 text-sm focus:outline-none focus:hermes-input-border-focus"
          />
          <button 
            type="submit" 
            className="flex items-center justify-center p-2 ml-2 hermes-text-muted hermes-hover:text-normal transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </form>

        {/* Voice Interface Action Button */}
        <div className="shrink-0 flex items-center">
          {isListening ? (
            <button 
              onClick={onStopSession} 
              className="w-[200px] h-[52px] flex items-center justify-between px-6 hermes-error-bg/10 hermes-border/40 hermes-error rounded-lg hermes-hover:error-bg/20 transition-all active:scale-[0.98] relative overflow-hidden group"
              title="Stop Listening"
            >
              {/* Left: User Icon */}
              <div className={`flex flex-col items-center transition-all duration-300 ${activeSpeaker === 'user' ? 'hermes-error scale-110' : 'opacity-30'}`}>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="text-xs font-medium mt-0.5">User</span>
              </div>

              {/* Center: Sound Wave Visualizer */}
              <div className="flex items-center justify-center flex-1 space-x-1.5 h-full relative">
                {[0, 1, 2].map((i) => {
                  const h = activeSpeaker === 'user' 
                    ? Math.max(4, normalizedVolume * (24 + i * 4)) 
                    : activeSpeaker === 'model' 
                      ? Math.max(4, 16 + Math.sin(Date.now() / 100 + i) * 8)
                      : 4;
                  return (
                    <div 
                      key={i} 
                      style={{ height: `${h}px` }}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        activeSpeaker === 'user' ? 'hermes-error-bg' : 
                        activeSpeaker === 'model' ? 'hermes-success-bg' : 
                        'hermes-error-bg/40'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Right: Robot Icon */}
              <div className={`flex flex-col items-center transition-all duration-300 ${activeSpeaker === 'model' ? 'hermes-success scale-110' : 'opacity-30'}`}>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <circle cx="12" cy="5" r="2" />
                  <path d="M12 7v4" />
                  <line x1="8" y1="16" x2="8" y2="16" />
                  <line x1="16" y1="16" x2="16" y2="16" />
                </svg>
                <span className="text-xs font-medium mt-0.5">AI</span>
              </div>

              <span className="absolute top-2 right-2 w-1.5 h-1.5 hermes-error rounded-full" />
            </button>
          ) : (
            <button 
              onClick={onStartSession}
              disabled={status === ConnectionStatus.CONNECTING}
              className="w-[52px] h-[52px] flex items-center justify-center hermes-interactive-bg hermes-text-normal rounded-lg transition-all disabled:opacity-50 hermes-border/20 active:scale-95 group"
              title="Start Voice Session"
            >
              <svg className="w-6 h-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
                <path d="M12 14c-4.42 0-8 2-8 5v1h16v-1c0-3-3.58-5-8-5z" />
                <path className="opacity-40" d="M19 8c1.33 1.33 1.33 3.67 0 5" />
                <path className="opacity-70" d="M21 6c2 2 2 6 0 8" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};

export default InputBar;
