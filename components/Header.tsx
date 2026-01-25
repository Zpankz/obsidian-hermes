
import React from 'react';
import { ConnectionStatus } from '../types';
import SettingsButton from './SettingsButton';

interface HeaderProps {
  status: ConnectionStatus;
  showLogs: boolean;
  onToggleLogs: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ status, showLogs, onToggleLogs, onOpenSettings }) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 hermes-border-b hermes-glass shrink-0 z-50">
      <div className="flex items-center space-x-6">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold hermes-text-normal">Hermes</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'hermes-success-bg' : status === ConnectionStatus.CONNECTING ? 'hermes-warning-bg animate-pulse' : 'hermes-text-faint'}`} />
            <span className="text-xs hermes-text-muted">{status}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-1">
        <button 
          onClick={onToggleLogs} 
          className={`p-2 transition-all ${showLogs ? 'hermes-text-accent' : 'hermes-text-muted hermes-hover:text-normal'}`}
          title="Toggle System Log"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        
        <SettingsButton onOpenSettings={onOpenSettings} />
      </div>
    </header>
  );
};

export default Header;
