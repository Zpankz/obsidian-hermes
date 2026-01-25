
import React, { useState, useMemo, useEffect } from 'react';
import { ToolData, FileDiff, GroundingChunk } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface ToolResultProps {
  toolData: ToolData;
  isLast: boolean;
}

const DiffView: React.FC<{ diff: FileDiff }> = ({ diff }) => {
  const diffLines = useMemo(() => {
    if (!diff.oldContent && !diff.newContent) return null;
    const oldLines = (diff.oldContent || '').split('\n');
    const newLines = (diff.newContent || '').split('\n');
    const max = Math.max(oldLines.length, newLines.length);
    
    return Array.from({ length: max }).map((_, i) => {
      const o = oldLines[i];
      const n = newLines[i];
      return { old: o, new: n, index: i + 1 };
    });
  }, [diff]);

  if (!diffLines) return null;

  return (
    <div className="hermes-bg-tertiary p-2 overflow-x-auto font-mono text-[9px] leading-4 hermes-border-b last:border-0">
      <div className="hermes-text-accent font-bold mb-1 px-1">{diff.filename}</div>
      <div className="grid grid-cols-[20px_1fr_20px_1fr] gap-x-1">
        {diffLines.slice(0, 100).map((line, i) => (
          <React.Fragment key={i}>
            <div className="hermes-text-faint text-right pr-1 select-none opacity-40">{line.old !== undefined ? line.index : ''}</div>
            <div className={`whitespace-pre-wrap ${line.old !== line.new && line.old !== undefined ? 'hermes-error-bg/10 hermes-error' : 'hermes-text-muted'}`}>
              {line.old !== undefined ? (line.old || ' ') : ''}
            </div>
            <div className="hermes-text-faint text-right pr-1 select-none opacity-40">{line.new !== undefined ? line.index : ''}</div>
            <div className={`whitespace-pre-wrap ${line.old !== line.new && line.new !== undefined ? 'hermes-success-bg/10 hermes-success' : 'hermes-text-muted'}`}>
              {line.new !== undefined ? (line.new || ' ') : ''}
            </div>
          </React.Fragment>
        ))}
        {diffLines.length > 100 && (
          <div className="col-span-4 hermes-text-muted italic text-[9px] pt-2 px-2 hermes-border-t text-center">
            ... and {diffLines.length - 100} more lines (truncated)
          </div>
        )}
      </div>
    </div>
  );
};

const WebSearchView: React.FC<{ content: string, chunks: GroundingChunk[] }> = ({ content, chunks }) => {
  return (
    <div className="p-6 hermes-bg-tertiary space-y-4 animate-in fade-in duration-500">
      <div className="pb-4 hermes-border-b mb-4">
        <MarkdownRenderer content={content} />
      </div>
      {chunks.length > 0 && (
        <div className="space-y-3">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] hermes-text-accent/70 ml-1">Source Grounding</div>
          <div className="grid grid-cols-1 gap-2">
            {chunks.slice(0, 10).map((chunk, i) => {
              const item = chunk.web || chunk.maps;
              if (!item) return null;
              return (
                <a 
                  key={i} 
                  href={item.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 p-3 rounded-xl hermes-bg-secondary/5 hermes-border/5 hermes-hover:bg-secondary/10 hermes-hover:border/10 transition-all group shadow-sm"
                >
                  <div className="w-8 h-8 rounded-lg hermes-interactive-bg/10 flex items-center justify-center shrink-0 hermes-border/20">
                    <svg className="w-4 h-4 hermes-text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-[11px] font-bold hermes-text-normal group-hover:hermes-text-accent transition-colors truncate">{item.title}</span>
                    <span className="text-[9px] hermes-text-muted truncate font-mono">{new URL(item.uri).hostname}</span>
                  </div>
                </a>
              );
            })}
            {chunks.length > 10 && (
              <div className="hermes-text-muted italic text-[9px] pt-2 px-3 hermes-border-t">
                ... and {chunks.length - 10} more sources (truncated)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ToolResult: React.FC<ToolResultProps> = ({ toolData, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [manuallyToggled, setManuallyToggled] = useState(false);

  useEffect(() => {
    if (isLast && !manuallyToggled && toolData.status !== 'pending') {
      setIsExpanded(true);
    } else if (!isLast && !manuallyToggled) {
      setIsExpanded(false);
    }
  }, [isLast, manuallyToggled, toolData.status]);

  const toggle = () => {
    if (toolData.status === 'pending') return;
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
      default: return 'ACTION';
    }
  };

  const isPending = toolData.status === 'pending';

  return (
    <div className={`w-full my-2 hermes-border rounded-xl overflow-hidden transition-all shadow-md ${
      isPending ? 'hermes-border/20 hermes-interactive-bg/5' : 'hermes-border/10 hermes-bg-secondary/40 hermes-hover:border/20'
    }`}>
      <div 
        onClick={toggle}
        className={`flex items-center justify-between px-4 py-3 ${isPending ? 'cursor-default' : 'cursor-pointer hermes-hover:bg-secondary/5'} transition-colors group`}
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${
            isPending ? 'hermes-interactive-bg/20 hermes-text-accent' :
            toolData.name.includes('create') ? 'hermes-success-bg/20 hermes-success' : 
            toolData.name.includes('read') ? 'hermes-interactive-bg/20 hermes-text-accent' :
            toolData.name.includes('rename') ? 'hermes-warning-bg/20 hermes-warning' :
            toolData.name.includes('search') ? 'hermes-info-bg/20 hermes-info' :
            toolData.name.includes('replace') ? 'hermes-warning-bg/20 hermes-warning' :
            toolData.name === 'internet_search' ? 'hermes-info-bg/20 hermes-info' :
            'hermes-text-muted-bg/20 hermes-text-muted'
          }`}>
            {getActionLabel(toolData.name)}
          </span>
          
          <span className="text-[11px] font-mono hermes-text-normal truncate max-w-[300px]">
             {toolData.name === 'internet_search' ? `Uplink: Web Query` : `${toolData.filename}`}
          </span>
        </div>
        
        <div className="flex items-center space-x-4 shrink-0">
          {isPending ? (
            <div className="flex items-center space-x-1 px-2">
              <div className="w-1 h-1 hermes-text-accent rounded-full">.</div>
              <div className="w-1 h-1 hermes-text-accent rounded-full">.</div>
              <div className="w-1 h-1 hermes-text-accent rounded-full">.</div>
            </div>
          ) : (
            <svg 
              className={`w-4 h-4 hermes-text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {isExpanded && !isPending && (
        <div className="hermes-border-t hermes-bg-tertiary max-h-[600px] overflow-y-auto custom-scrollbar">
          {toolData.name === 'internet_search' && toolData.newContent && (
            <WebSearchView content={toolData.newContent} chunks={toolData.groundingChunks || []} />
          )}

          {['read_file', 'create_file'].includes(toolData.name) && toolData.newContent !== undefined && (
            <div className="p-8 hermes-glass shadow-inner">
               <MarkdownRenderer content={toolData.newContent} />
            </div>
          )}

          {toolData.name === 'list_directory' && toolData.files && (
            <div className="p-4 font-mono text-[10px]">
              <div className="flex items-center justify-between mb-3">
                <span className="hermes-text-muted">
                  {toolData.truncated ? 
                    `${toolData.shownItems} of ${toolData.totalItems} items (Page ${toolData.currentPage} of ${toolData.totalPages})` : 
                    `${toolData.files.length} items found`
                  }
                </span>
                {toolData.truncated && (
                  <span className="hermes-text-accent font-bold text-[9px] px-2 py-1 hermes-interactive-bg/20 rounded">
                    TRUNCATED
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {toolData.files.map((file: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2 hermes-text-normal hover:hermes-bg-secondary/5 px-2 py-1 rounded transition-colors">
                    <span className="hermes-text-muted select-none">{'📄'}</span>
                    <span className="truncate">{file}</span>
                  </div>
                ))}
              </div>
              {toolData.truncated && (
                <div className="mt-3 pt-3 hermes-border-t hermes-text-muted italic text-[9px] text-center">
                  ... and {toolData.totalItems - toolData.shownItems} more items (use pagination for more)
                </div>
              )}
            </div>
          )}

          {toolData.name === 'dirlist' && toolData.directoryInfo && (
            <div className="p-4 font-mono text-[10px]">
              <div className="flex items-center justify-between mb-3">
                <span className="hermes-text-muted">
                  {toolData.truncated ? 
                    `${toolData.shownItems} of ${toolData.totalItems} directories (Page ${toolData.currentPage} of ${toolData.totalPages})` : 
                    `${toolData.directoryInfo.length} directories found`
                  }
                </span>
                {toolData.truncated && (
                  <span className="hermes-text-accent font-bold text-[9px] px-2 py-1 hermes-interactive-bg/20 rounded">
                    TRUNCATED
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {toolData.directoryInfo.map((dir: any, index: number) => (
                  <div key={index} className="flex items-center space-x-2 hermes-text-normal hover:hermes-bg-secondary/5 px-2 py-1 rounded transition-colors">
                    <span className="hermes-text-muted select-none">
                      {dir.hasChildren ? '📁' : '📂'}
                    </span>
                    <span className="truncate">{dir.path || '/'}</span>
                    {dir.hasChildren && (
                      <span className="hermes-text-muted text-[8px] px-1 py-0.5 hermes-bg-secondary/10 rounded">
                        has subdirs
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {toolData.truncated && (
                <div className="mt-3 pt-3 hermes-border-t hermes-text-muted italic text-[9px] text-center">
                  ... and {toolData.totalItems - toolData.shownItems} more directories (use search for specific paths)
                </div>
              )}
            </div>
          )}

          {toolData.name === 'get_folder_tree' && toolData.files && (
            <div className="p-4 font-mono text-[10px]">
              <div className="flex items-center justify-between mb-3">
                <span className="hermes-text-muted">
                  {toolData.truncated ? 
                    `${toolData.shownItems} of ${toolData.totalItems} folders (Page ${toolData.currentPage} of ${toolData.totalPages})` : 
                    `${toolData.files.length} folders found`
                  }
                </span>
                {toolData.truncated && (
                  <span className="hermes-text-accent font-bold text-[9px] px-2 py-1 hermes-interactive-bg/20 rounded">
                    TRUNCATED
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {toolData.files.map((folder: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2 hermes-text-normal hover:hermes-bg-secondary/5 px-2 py-1 rounded transition-colors">
                    <span className="hermes-text-muted select-none">{'📁'}</span>
                    <span className="truncate">{folder}</span>
                  </div>
                ))}
              </div>
              {toolData.truncated && (
                <div className="mt-3 pt-3 hermes-border-t hermes-text-muted italic text-[9px] text-center">
                  ... and {toolData.totalItems - toolData.shownItems} more folders
                </div>
              )}
            </div>
          )}

          {!['read_file', 'create_file', 'internet_search', 'list_directory'].includes(toolData.name) && toolData.newContent !== undefined && toolData.oldContent !== undefined && (
            <DiffView diff={{ filename: toolData.filename, oldContent: toolData.oldContent, newContent: toolData.newContent }} />
          )}

          {toolData.error && (
            <div className="p-4 hermes-border-t/10 hermes-error-bg/5 hermes-error text-[10px] font-mono italic">
              Runtime Exception: {toolData.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolResult;
