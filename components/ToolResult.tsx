
import React, { useState, useMemo, useEffect } from 'react';
import { ToolData, FileDiff, GroundingChunk } from '../types';
import { marked } from 'marked';

interface ToolResultProps {
  toolData: ToolData;
  isLast: boolean;
}

const MarkdownPreview: React.FC<{ content: string }> = ({ content }) => {
  const html = useMemo(() => {
    try {
      // Use synchronous parsing to avoid hydration issues if any
      return marked.parse(content || '', { gfm: true, breaks: true });
    } catch (e) {
      return `<p class="text-red-400 font-mono text-xs">ERR: Markdown parsing failed.</p>`;
    }
  }, [content]);

  return (
    <div 
      className="prose prose-invert prose-sm max-w-none prose-headings:text-indigo-300 prose-a:text-indigo-400 prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded prose-pre:bg-slate-900 prose-pre:border prose-pre:border-white/5 font-sans leading-relaxed text-slate-300"
      dangerouslySetInnerHTML={{ __html: html as string }}
    />
  );
};

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
    <div className="bg-[#0d1117] p-2 overflow-x-auto font-mono text-[9px] leading-4 border-b border-white/5 last:border-0">
      <div className="text-indigo-400 font-bold mb-1 px-1">{diff.filename}</div>
      <div className="grid grid-cols-[20px_1fr_20px_1fr] gap-x-1">
        {diffLines.slice(0, 100).map((line, i) => (
          <React.Fragment key={i}>
            <div className="text-slate-700 text-right pr-1 select-none opacity-40">{line.old !== undefined ? line.index : ''}</div>
            <div className={`whitespace-pre-wrap ${line.old !== line.new && line.old !== undefined ? 'bg-red-900/10 text-red-300' : 'text-slate-600'}`}>
              {line.old !== undefined ? (line.old || ' ') : ''}
            </div>
            <div className="text-slate-700 text-right pr-1 select-none opacity-40">{line.new !== undefined ? line.index : ''}</div>
            <div className={`whitespace-pre-wrap ${line.old !== line.new && line.new !== undefined ? 'bg-emerald-900/10 text-emerald-300' : 'text-slate-400'}`}>
              {line.new !== undefined ? (line.new || ' ') : ''}
            </div>
          </React.Fragment>
        ))}
        {diffLines.length > 100 && (
          <div className="col-span-4 text-slate-600 italic text-[9px] pt-2 px-2 border-t border-white/5 text-center">
            ... and {diffLines.length - 100} more lines (truncated)
          </div>
        )}
      </div>
    </div>
  );
};

const WebSearchView: React.FC<{ content: string, chunks: GroundingChunk[] }> = ({ content, chunks }) => {
  return (
    <div className="p-6 bg-[#0f172a] space-y-4 animate-in fade-in duration-500">
      <div className="pb-4 border-b border-white/5 mb-4">
        <MarkdownPreview content={content} />
      </div>
      {chunks.length > 0 && (
        <div className="space-y-3">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400/70 ml-1">Source Grounding</div>
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
                  className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group shadow-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-[11px] font-bold text-slate-200 group-hover:text-indigo-400 transition-colors truncate">{item.title}</span>
                    <span className="text-[9px] text-slate-500 truncate font-mono">{new URL(item.uri).hostname}</span>
                  </div>
                </a>
              );
            })}
            {chunks.length > 10 && (
              <div className="text-slate-600 italic text-[9px] pt-2 px-3 border-t border-white/5">
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
    <div className={`w-full my-2 border rounded-xl overflow-hidden transition-all shadow-md ${
      isPending ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-white/5 bg-slate-900/40 hover:border-white/10'
    }`}>
      <div 
        onClick={toggle}
        className={`flex items-center justify-between px-4 py-3 ${isPending ? 'cursor-default' : 'cursor-pointer hover:bg-white/5'} transition-colors group`}
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${
            isPending ? 'bg-indigo-500/20 text-indigo-400' :
            toolData.name.includes('create') ? 'bg-emerald-500/20 text-emerald-400' : 
            toolData.name.includes('read') ? 'bg-indigo-500/20 text-indigo-400' :
            toolData.name.includes('rename') ? 'bg-amber-500/20 text-amber-400' :
            toolData.name.includes('search') ? 'bg-purple-500/20 text-purple-400' :
            toolData.name.includes('replace') ? 'bg-amber-500/20 text-amber-400' :
            toolData.name === 'internet_search' ? 'bg-blue-500/20 text-blue-400' :
            'bg-slate-500/20 text-slate-400'
          }`}>
            {getActionLabel(toolData.name)}
          </span>
          
          <span className="text-[11px] font-mono text-slate-300 truncate max-w-[300px]">
             {toolData.name === 'internet_search' ? `Uplink: Web Query` : `${toolData.filename}`}
          </span>
        </div>
        
        <div className="flex items-center space-x-4 shrink-0">
          {isPending ? (
            <div className="flex items-center space-x-1 px-2">
              <div className="w-1 h-1 bg-indigo-400 rounded-full">.</div>
              <div className="w-1 h-1 bg-indigo-400 rounded-full">.</div>
              <div className="w-1 h-1 bg-indigo-400 rounded-full">.</div>
            </div>
          ) : (
            <svg 
              className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {isExpanded && !isPending && (
        <div className="border-t border-white/5 bg-[#0d1117] max-h-[600px] overflow-y-auto custom-scrollbar">
          {toolData.name === 'internet_search' && toolData.newContent && (
            <WebSearchView content={toolData.newContent} chunks={toolData.groundingChunks || []} />
          )}

          {['read_file', 'create_file'].includes(toolData.name) && toolData.newContent !== undefined && (
            <div className="p-8 bg-slate-900/60 shadow-inner">
               <MarkdownPreview content={toolData.newContent} />
            </div>
          )}

          {toolData.name === 'list_directory' && toolData.files && (
            <div className="p-4 font-mono text-[10px] space-y-1">
              {toolData.files.slice(0, 50).map((file, idx) => (
                <div key={file} className="flex items-center space-x-3 text-slate-400 py-1 hover:text-indigo-300 transition-colors">
                  <span className="text-slate-700 w-4">{idx + 1}.</span>
                  <span>{file}</span>
                </div>
              ))}
              {toolData.files.length > 50 && (
                <div className="text-slate-600 italic text-[9px] pt-2 px-4 border-t border-white/5">
                  ... and {toolData.files.length - 50} more items (truncated)
                </div>
              )}
            </div>
          )}

          {!['read_file', 'create_file', 'internet_search', 'list_directory'].includes(toolData.name) && toolData.newContent !== undefined && toolData.oldContent !== undefined && (
            <DiffView diff={{ filename: toolData.filename, oldContent: toolData.oldContent, newContent: toolData.newContent }} />
          )}

          {toolData.error && (
            <div className="p-4 border-t border-red-500/10 bg-red-500/5 text-red-400 text-[10px] font-mono italic">
              Runtime Exception: {toolData.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolResult;
