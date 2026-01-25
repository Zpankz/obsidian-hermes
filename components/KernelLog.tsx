
import React, { useRef, useEffect, useMemo } from 'react';
import { LogEntry, UsageMetadata } from '../types';
import { isObsidian } from '../utils/environment';

interface KernelLogProps {
  isVisible: boolean;
  logs: LogEntry[];
  usage?: UsageMetadata;
  onFlush: () => void;
  fileCount: number;
}

const KernelLog: React.FC<KernelLogProps> = ({ isVisible, logs, usage, onFlush, fileCount }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  const isObsidianEnvironment = isObsidian();

  useEffect(() => {
    if (logContainerRef.current && isVisible) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isVisible]);

  const contextLimit = 1000000; // 1M tokens for Gemini Flash context
  const totalTokens = usage?.totalTokenCount || 0;
  const promptTokens = usage?.promptTokenCount || 0;
  const contextPercentage = useMemo(() => Math.min(100, (totalTokens / contextLimit) * 100), [totalTokens]);

  return (
    <div className={`hermes-border-t hermes-border/10 hermes-bg-secondary/95 hermes-flex hermes-flex-col hermes-transition-all hermes-duration-300 hermes-ease-in-out hermes-shrink-0 hermes-relative ${isVisible ? 'hermes-h-64' : 'hermes-h-0 hermes-opacity-0 hermes-overflow-hidden'}`}>
      <div className="hermes-px-8 hermes-py-2.5 hermes-border-b hermes-border/10 hermes-flex hermes-justify-between hermes-items-center hermes-bg-secondary-alt/60 hermes-sticky hermes-top-0 hermes-backdrop-blur-sm hermes-z-10">
        <div className="flex items-center space-x-4">
          <h2 className="hermes-text-[8px] hermes-font-black hermes-uppercase hermes-tracking-[0.2em] hermes-text-muted">System Kernel Log</h2>
          <div className="hermes-flex hermes-items-center hermes-space-x-4 hermes-border-l hermes-border/20 hermes-pl-4">
            <div className="flex items-center space-x-2">
              <span className="text-[8px] font-bold hermes-text-accent uppercase tracking-widest">Vault:</span>
              <span className="text-[9px] font-mono hermes-text-normal">{fileCount} MD</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onFlush} 
          className="text-[8px] hermes-text-muted hermes-hover:error transition-colors uppercase font-black tracking-widest"
        >
          Flush Log
        </button>
      </div>
      
      <div ref={logContainerRef} className="flex-grow overflow-y-auto p-4 space-y-1 font-mono text-[10px] leading-relaxed relative pb-12">
        {logs.length === 0 ? (
          <div className="hermes-text-faint italic py-2 px-4">Waiting for system signals...</div>
        ) : (
          <>
            {logs.slice(-100).map((log) => (
              <div key={log.id} className="flex space-x-3 group px-4 hermes-hover:bg-secondary/5">
                <span className="hermes-text-faint shrink-0 select-none">[{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <div className="flex flex-col">
                  <span className={`${
                    log.type === 'action' ? 'hermes-text-accent' : 
                    log.type === 'error' ? 'hermes-error' : 
                    'hermes-text-muted'
                  }`}>
                    {log.message}
                  </span>
                  {log.type === 'error' && log.errorDetails && (
                    <div className="mt-1 space-y-1">
                      {log.errorDetails.toolName && (
                        <span className="text-[8px] hermes-error font-mono">
                          Tool: {log.errorDetails.toolName}
                        </span>
                      )}
                      {log.errorDetails.apiCall && (
                        <span className="text-[8px] hermes-error font-mono block">
                          API: {log.errorDetails.apiCall}
                        </span>
                      )}
                      {(log.errorDetails.contentSize !== undefined || log.errorDetails.requestSize !== undefined || log.errorDetails.responseSize !== undefined) && (
                        <div className="text-[8px] hermes-error font-mono space-x-2">
                          {log.errorDetails.contentSize !== undefined && (
                            <span>Content: {log.errorDetails.contentSize.toLocaleString()} bytes</span>
                          )}
                          {log.errorDetails.requestSize !== undefined && (
                            <span>Request: {log.errorDetails.requestSize.toLocaleString()} bytes</span>
                          )}
                          {log.errorDetails.responseSize !== undefined && (
                            <span>Response: {log.errorDetails.responseSize.toLocaleString()} bytes</span>
                          )}
                        </div>
                      )}
                      {log.errorDetails.content && (
                        <div className="text-[8px] hermes-error font-mono hermes-error-bg/10 p-1 rounded max-h-16 overflow-y-auto hermes-border/20">
                          <div className="hermes-error font-bold mb-1">Content Preview:</div>
                          <div className="whitespace-pre-wrap break-all">
                            {log.errorDetails.content.length > 200 
                              ? log.errorDetails.content.substring(0, 200) + '...' 
                              : log.errorDetails.content}
                          </div>
                        </div>
                      )}
                      {log.errorDetails.stack && (
                        <details className="text-[8px] hermes-error font-mono">
                          <summary className="cursor-pointer hermes-hover:error">Stack Trace</summary>
                          <div className="mt-1 whitespace-pre-wrap hermes-error-bg/5 p-1 rounded hermes-border/10">
                            {log.errorDetails.stack}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                  {log.duration !== undefined && (
                    <span className="text-[8px] hermes-text-faint uppercase font-bold tracking-tight mt-0.5">
                      Process completed in {log.duration}ms
                    </span>
                  )}
                </div>
              </div>
            ))}
            {logs.length > 100 && (
              <div className="hermes-text-muted italic text-[9px] pt-2 px-4 hermes-border-t/10 text-center">
                ... showing last 100 of {logs.length} log entries
              </div>
            )}
          </>
        )}
      </div>

      {/* Context Size Indicator (Bottom Left) */}
      <div className="absolute bottom-10 left-8 z-20 pointer-events-none">
        <div className="hermes-glass px-3 py-2 rounded-lg backdrop-blur-md shadow-2xl flex flex-col space-y-1 min-w-[120px]">
          <div className="flex justify-between items-center">
            <span className="text-[7px] font-black hermes-text-accent uppercase tracking-widest">Context Window</span>
            <span className="text-[8px] font-mono hermes-text-muted">{contextPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full h-1 hermes-border/10 rounded-full overflow-hidden">
            <div 
              className="h-full hermes-interactive-bg transition-all duration-1000" 
              style={{ width: `${contextPercentage}%` }}
            />
          </div>
          <div className="flex flex-col text-[7px] font-mono hermes-text-faint leading-tight">
            <div className="flex justify-between">
              <span>PROMPT:</span>
              <span className="hermes-text-normal">{promptTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>TOTAL:</span>
              <span className="hermes-text-accent">{totalTokens.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-1.5 hermes-border-t/10 hermes-bg-tertiary/40 flex justify-between items-center text-xs hermes-text-faint shrink-0">
        <div className="flex items-center space-x-4">
          <span>Environment: <span className={isObsidianEnvironment ? 'hermes-success' : 'hermes-warning'}>{isObsidianEnvironment ? 'Obsidian' : 'Standalone'}</span></span>
          <span>Buffer: <span className="hermes-text-muted">{logs.length} entries</span></span>
        </div>
        <div className="hermes-text-faint">Hermes v1.1.0</div>
      </div>
    </div>
  );
};

export default KernelLog;
