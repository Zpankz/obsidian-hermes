import React, { useState, useEffect } from 'react';
import { ToolData } from '../types';
import ToolResult from './ToolResult';

interface SystemMessageProps {
  children: React.ReactNode;
  toolData?: ToolData;
  isLast?: boolean;
  className?: string;
}

const SystemMessage: React.FC<SystemMessageProps> = ({ children, toolData, isLast, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [manuallyToggled, setManuallyToggled] = useState(false);

  const isPending = toolData?.status === 'pending';
  const isError = toolData?.status === 'error';
  const isSuccess = toolData?.status === 'success';
  const hasExpandableContent = toolData && (toolData.newContent || toolData.oldContent || toolData.files || toolData.error || toolData.directoryInfo);

  useEffect(() => {
    if (isLast && !manuallyToggled && !isPending && hasExpandableContent) {
      setIsExpanded(true);
    } else if (!isLast && !manuallyToggled) {
      setIsExpanded(false);
    }
  }, [isLast, manuallyToggled, isPending, hasExpandableContent]);

  const toggle = () => {
    if (isPending || !hasExpandableContent) return;
    setIsExpanded(!isExpanded);
    setManuallyToggled(true);
  };

  const getActionLabel = (name: string) => {
    switch(name) {
      case 'read_file': return 'READ';
      case 'create_file': return 'CREATE';
      case 'update_file': return 'UPDATE';
      case 'edit_file': return 'EDIT';
      case 'rename_file': return 'RENAME';
      case 'move_file': return 'MOVE';
      case 'list_directory': return 'SCAN';
      case 'dirlist': return 'DIRS';
      case 'get_folder_tree': return 'TREE';
      case 'search_keyword': return 'SEARCH';
      case 'search_regexp': return 'GREP';
      case 'search_and_replace_regex_in_file': return 'REPLACE';
      case 'search_and_replace_regex_global': return 'GLOBAL';
      case 'internet_search': return 'WEB';
      case 'error': return 'ERROR';
      default: return 'ACTION';
    }
  };

  // Dynamic styling based on status
  const getStyles = () => {
    if (isError) {
      return {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        headerBg: 'rgba(239, 68, 68, 0.05)',
        contentBg: 'rgba(239, 68, 68, 0.08)',
        borderColor: 'rgba(239, 68, 68, 0.2)',
        accentColor: '#ef4444',
        textColor: '#f87171',
        mutedColor: '#fca5a5'
      };
    }
    
    // Default/pending/success state - secondary grey
    return {
      backgroundColor: 'rgba(156, 163, 175, 0.1)',
      border: '1px solid rgba(156, 163, 175, 0.2)',
      headerBg: 'rgba(156, 163, 175, 0.05)',
      contentBg: 'rgba(156, 163, 175, 0.08)',
      borderColor: 'rgba(156, 163, 175, 0.15)',
      accentColor: '#9ca3af',
      textColor: '#d1d5db',
      mutedColor: '#e5e7eb'
    };
  };

  const styles = getStyles();

  return (
    <div 
      className={`w-full max-w-2xl rounded-xl overflow-hidden transition-all ${className}`}
      style={{ 
        backgroundColor: styles.backgroundColor,
        border: styles.border
      }}
    >
      <div 
        onClick={toggle}
        className={`flex items-center justify-between px-4 py-3 ${hasExpandableContent && !isPending ? 'cursor-pointer' : 'cursor-default'} transition-colors`}
        style={{ 
          backgroundColor: styles.headerBg
        }}
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          {toolData && (
            <span 
              className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0"
              style={{ 
                backgroundColor: isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(156, 163, 175, 0.15)',
                color: styles.accentColor
              }}
            >
              {getActionLabel(toolData.name)}
            </span>
          )}
          
          <span 
            className="text-[11px] font-mono truncate max-w-[400px]"
            style={{ color: styles.textColor }}
          >
            {toolData?.filename || children}
          </span>
          
          {isError && (
            <span className="text-[8px] px-2 py-0.5 rounded font-bold" style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444'
            }}>
              ERROR
            </span>
          )}
          
        </div>
        
        <div className="flex items-center space-x-4 shrink-0">
          {isPending ? (
            <div className="flex items-center space-x-1 px-2">
              <span style={{ color: styles.accentColor }}>...</span>
            </div>
          ) : hasExpandableContent ? (
            <svg 
              className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
              style={{ color: styles.accentColor }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : null}
        </div>
      </div>

      {isExpanded && !isPending && hasExpandableContent && (
        <div 
          className="max-h-[400px] overflow-y-auto custom-scrollbar"
          style={{ 
            backgroundColor: styles.contentBg,
            borderTop: styles.borderColor
          }}
        >
          {/* Use ToolResult for complex tool displays */}
          {(toolData?.name === 'list_directory' || toolData?.name === 'dirlist' || toolData?.name === 'get_folder_tree' || toolData?.name === 'internet_search') ? (
            <ToolResult toolData={toolData} isLast={isLast} />
          ) : (
            <>
              {toolData?.newContent && (
                <div className="p-4 font-mono text-[10px] whitespace-pre-wrap" style={{ color: styles.textColor }}>
                  {toolData.newContent}
                </div>
              )}
              
              {toolData?.files && (
                <div className="p-4 font-mono text-[10px]">
                  <div className="space-y-1">
                    {toolData.files.map((file: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2 px-2 py-1 rounded" style={{ color: styles.textColor }}>
                        <span>📄</span>
                        <span className="truncate">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {toolData?.error && (
                <div className="p-4 font-mono text-[10px] italic" style={{ color: '#fca5a5' }}>
                  Error: {toolData.error}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemMessage;
