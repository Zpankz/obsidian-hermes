
import React from 'react';
import { ConnectionStatus } from '../types';
import SettingsButton from './SettingsButton';

interface HeaderProps {
  status: ConnectionStatus;
  showLogs: boolean;
  onToggleLogs: () => void;
  onOpenSettings: () => void;
  isListening?: boolean;
  onStopSession?: () => void;
}

const Header: React.FC<HeaderProps> = ({ status, showLogs, onToggleLogs, onOpenSettings, isListening, onStopSession }) => {
  return (
    <header className={`relative flex items-center justify-between px-6 py-2 hermes-border-b shrink-0 z-50 ${
      isListening ? 'hermes-header-bg-listening' : 'hermes-header-bg'
    }`}>
      <div className="flex items-center space-x-6">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold hermes-text-normal">Hermes</h1>
        </div>
      </div>
      
      {/* Center: Red Mic Button (only shown when listening) */}
      {isListening && (
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
          <button 
            onClick={onStopSession}
            className="w-[52px] h-[52px] flex items-center justify-center bg-red-600 text-white rounded-full transition-all hover:bg-red-700 active:scale-95 shadow-lg shadow-red-600/50"
            title="Stop Listening"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
              <path d="M12 14c-4.42 0-8 2-8 5v1h16v-1c0-3-3.58-5-8-5z" />
              <path className="opacity-40" d="M19 8c1.33 1.33 1.33 3.67 0 5" />
              <path className="opacity-70" d="M21 6c2 2 2 6 0 8" />
            </svg>
          </button>
        </div>
      )}
      
      <div className="flex items-center space-x-1">
        {/* <button 
          onClick={onToggleLogs} 
          className={`p-2 transition-all ${showLogs ? 'hermes-text-accent' : 'hermes-text-muted hermes-hover:text-normal'}`}
          title="Toggle System Log"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button> */}
        
        <SettingsButton onOpenSettings={onOpenSettings} />
      </div>
    </header>
  );
};

export default Header;
