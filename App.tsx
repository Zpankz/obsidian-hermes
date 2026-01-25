
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LogEntry, TranscriptionEntry, ConnectionStatus, ToolData, UsageMetadata } from './types';
import { initFileSystem, listDirectory } from './services/mockFiles';
import { saveAppSettings, loadAppSettings, saveChatHistory, loadChatHistory } from './persistence/persistence';
import { GeminiVoiceAssistant } from './services/voiceInterface';
import { GeminiTextInterface } from './services/textInterface';
import { DEFAULT_SYSTEM_INSTRUCTION } from './utils/defaultPrompt';
import { isObsidian } from './utils/environment';
import { archiveConversation } from './utils/archiveConversation';

// Components
import Header from './components/Header';
import Settings from './components/Settings';
import MainWindow from './components/MainWindow';
import InputBar from './components/InputBar';

const App: React.FC = () => {
  const saved = useMemo(() => {
    const data = loadAppSettings();
    return data || {};
  }, []);

  useEffect(() => {
    // Check if there's a saved conversation
    const data = loadAppSettings();
    setHasSavedConversation(!!data?.transcripts && data.transcripts.length > 0);
  }, []);

  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showKernel, setShowKernel] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<'user' | 'model' | 'none'>('none');
  const [micVolume, setMicVolume] = useState(0);
  
  const [transcripts, setTranscripts] = useState<TranscriptionEntry[]>([]);
  const [hasSavedConversation, setHasSavedConversation] = useState<boolean>(false);
  const [voiceName, setVoiceName] = useState<string>(() => saved.voiceName || 'Zephyr');
  const [customContext, setCustomContext] = useState<string>(() => saved.customContext || '');
  const [systemInstruction, setSystemInstruction] = useState<string>(() => saved.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION);
  const [manualApiKey, setManualApiKey] = useState<string>(() => saved.manualApiKey || '');
  const [currentFolder, setCurrentFolder] = useState<string>(() => saved.currentFolder || '/');
  const [currentNote, setCurrentNote] = useState<string | null>(() => saved.currentNote || null);
  const [totalTokens, setTotalTokens] = useState<number>(() => saved.totalTokens || 0);
  const [usage, setUsage] = useState<UsageMetadata>({ totalTokenCount: saved.totalTokens || 0 });
  const [fileCount, setFileCount] = useState<number>(0);

  const assistantRef = useRef<GeminiVoiceAssistant | null>(null);
  const textInterfaceRef = useRef<GeminiTextInterface | null>(null);

  const isObsidianEnvironment = useMemo(() => {
    return isObsidian();
  }, []);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info', duration?: number, errorDetails?: LogEntry['errorDetails']) => {
    setLogs(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      message, 
      timestamp: new Date(), 
      type,
      duration,
      errorDetails
    }]);
  }, []);

  const restoreConversation = () => {
    const data = loadAppSettings();
    if (data?.transcripts) {
      setTranscripts(data.transcripts);
      setHasSavedConversation(false);
      addLog('Previous conversation restored', 'info');
    }
  };

  const handleMissingApiKey = () => {
    // Post message in chat
    setTranscripts(prev => [...prev, { 
      id: 'api-key-missing-' + Date.now(), 
      role: 'system', 
      text: 'API KEY MISSING - Please configure your API key in Settings to continue.', 
      isComplete: true, 
      timestamp: Date.now() 
    }]);
    
    // Open settings
    setSettingsOpen(true);
    addLog('API key missing - opening Settings', 'error');
  };


  useEffect(() => {
    const lastMsg = transcripts[transcripts.length - 1];
    if (lastMsg?.role === 'system' && lastMsg.toolData?.name === 'topic_switch') {
      const summary = lastMsg.toolData.newContent || 'Shift';
      const toArchive = transcripts.slice(0, -1);
      if (toArchive.length > 0) {
        archiveConversation(summary, toArchive)
          .then(message => addLog(message, 'action'))
          .catch(err => {
            const errorDetails = {
              toolName: 'archiveConversation',
              content: `Summary: ${summary}\nHistory length: ${toArchive.length} entries`,
              contentSize: summary.length + JSON.stringify(toArchive).length,
              stack: err.message,
              apiCall: 'createFile'
            };
            addLog(`Persistence Failure: ${err.message}`, 'error', undefined, errorDetails);
          });
      }
    }
  }, [transcripts, addLog]);

  useEffect(() => {
    initFileSystem().then(() => {
      const files = listDirectory();
      setFileCount(files.length);
      addLog(`HERMES_OS: Modules online.`, 'info');
      if (transcripts.length === 0) {
        setTranscripts([{
          id: 'welcome-init',
          role: 'system',
          text: 'HERMES OS INITIALIZED.',
          isComplete: true,
          timestamp: Date.now()
        }]);
      }
    });
  }, [addLog]);

  useEffect(() => {
    saveAppSettings({
      transcripts,
      voiceName,
      customContext,
      systemInstruction,
      manualApiKey,
      currentFolder,
      currentNote,
      totalTokens
    });
  }, [transcripts, voiceName, customContext, systemInstruction, manualApiKey, currentFolder, currentNote, totalTokens]);

  const assistantCallbacks = useMemo(() => ({
    onStatusChange: (s: ConnectionStatus) => {
      setStatus(s);
      if (s === ConnectionStatus.CONNECTED) {
        addLog('UPLINK ESTABLISHED.', 'info');
      } else if (s === ConnectionStatus.DISCONNECTED) {
        setActiveSpeaker('none');
        setMicVolume(0);
      }
    },
    onLog: (m: string, t: LogEntry['type'], d?: number, e?: LogEntry['errorDetails']) => addLog(m, t, d, e),
    onTranscription: (role: 'user' | 'model', text: string, isComplete: boolean) => {
      setActiveSpeaker(isComplete ? 'none' : role);
      setTranscripts(prev => {
        const activeIdx = prev.reduceRight((acc, e, i) => (acc !== -1 ? acc : (e.role === role && !e.isComplete ? i : -1)), -1);
        if (activeIdx !== -1) {
          const updated = [...prev];
          updated[activeIdx] = { ...updated[activeIdx], text: text || updated[activeIdx].text, isComplete };
          return updated;
        }
        return [...prev, { id: Math.random().toString(36).substr(2, 9), role, text, isComplete, timestamp: Date.now() }];
      });
    },
    onSystemMessage: (text: string, toolData?: ToolData) => {
      setTranscripts(prev => {
        if (toolData?.id) {
          const existingIdx = prev.findIndex(t => t.toolData?.id === toolData.id);
          if (existingIdx !== -1) {
            const next = [...prev];
            next[existingIdx] = {
              ...next[existingIdx],
              text,
              toolData: { ...next[existingIdx].toolData, ...toolData, status: toolData.status || 'success' }
            };
            return next;
          }
        }
        return [...prev, { id: 'sys-' + Date.now(), role: 'system', text, isComplete: true, toolData, timestamp: Date.now() }];
      });
      setFileCount(listDirectory().length);
    },
    onInterrupted: () => { setActiveSpeaker('none'); setMicVolume(0); },
    onFileStateChange: (folder: string, note: string | string[] | null) => { 
      setCurrentFolder(folder);
      const notes = Array.isArray(note) ? note : (note ? [note] : []);
      if (notes.length > 0) {
        setCurrentNote(notes[notes.length - 1]);
        if (isObsidianEnvironment) {
          notes.forEach(async (path) => {
            // @ts-ignore
            const file = app.vault.getAbstractFileByPath(path);
            if (file) {
              // @ts-ignore
              const leaf = app.workspace.getLeaf('tab');
              await leaf.openFile(file);
            }
          });
        }
      }
    },
    onUsageUpdate: (usage: UsageMetadata) => { 
      setUsage(usage);
      const tokens = usage.totalTokenCount;
      if (tokens !== undefined) setTotalTokens(tokens); 
    },
    onVolume: (volume: number) => setMicVolume(volume)
  }), [addLog, isObsidianEnvironment]);

  const startSession = async () => {
    try {
      const activeKey = manualApiKey.trim() || process.env.API_KEY || '';
      if (!activeKey) {
        handleMissingApiKey();
        return;
      }
      // @ts-ignore
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) await window.aistudio.openSelectKey();
      
      assistantRef.current = new GeminiVoiceAssistant(assistantCallbacks);
      await assistantRef.current.start(activeKey, { voiceName, customContext, systemInstruction }, { folder: currentFolder, note: currentNote });
    } catch (err: any) {
      const errorDetails = {
        toolName: 'GeminiVoiceAssistant',
        content: `Voice Name: ${voiceName}\nCustom Context: ${customContext}\nSystem Instruction: ${systemInstruction}`,
        contentSize: voiceName.length + customContext.length + systemInstruction.length,
        stack: err.stack,
        apiCall: 'startSession'
      };
      addLog(`Uplink Error: ${err.message}`, 'error', undefined, errorDetails);
      setStatus(ConnectionStatus.ERROR);
    }
  };

  const stopSession = () => {
    if (assistantRef.current) {
      assistantRef.current.stop();
      assistantRef.current = null;
      setActiveSpeaker('none');
      setMicVolume(0);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!inputText.trim()) return;
    
    const message = inputText.trim();
    setInputText('');
    
    // Save message to chat history
    const currentHistory = loadChatHistory();
    const updatedHistory = [...currentHistory, message];
    await saveChatHistory(updatedHistory);
    
    // If voice session is active, stop it first before using text API
    if (status === ConnectionStatus.CONNECTED && assistantRef.current) {
      assistantRef.current.stop();
      assistantRef.current = null;
      setActiveSpeaker('none');
      setMicVolume(0);
    }
    
    // Use text interface
    const activeKey = manualApiKey.trim() || process.env.API_KEY || '';
    if (!activeKey) {
      handleMissingApiKey();
      return;
    }
    
    // Initialize text interface if needed
    if (!textInterfaceRef.current) {
      textInterfaceRef.current = new GeminiTextInterface({
        onLog: (m, t, d, e) => addLog(m, t, d, e),
        onTranscription: (role, text, isComplete) => {
          setTranscripts(prev => {
            const activeIdx = prev.reduceRight((acc, e, i) => (acc !== -1 ? acc : (e.role === role && !e.isComplete ? i : -1)), -1);
            if (activeIdx !== -1) {
              const updated = [...prev];
              updated[activeIdx] = { ...updated[activeIdx], text: text || updated[activeIdx].text, isComplete };
              return updated;
            }
            return [...prev, { id: Math.random().toString(36).substr(2, 9), role, text, isComplete, timestamp: Date.now() }];
          });
        },
        onSystemMessage: (text, toolData) => {
          setTranscripts(prev => {
            if (toolData?.id) {
              const existingIdx = prev.findIndex(t => t.toolData?.id === toolData.id);
              if (existingIdx !== -1) {
                const next = [...prev];
                next[existingIdx] = {
                  ...next[existingIdx],
                  text,
                  toolData: { ...next[existingIdx].toolData, ...toolData, status: toolData.status || 'success' }
                };
                return next;
              }
            }
            return [...prev, { id: 'sys-' + Date.now(), role: 'system', text, isComplete: true, toolData, timestamp: Date.now() }];
          });
          setFileCount(listDirectory().length);
        },
        onFileStateChange: (folder, note) => {
          setCurrentFolder(folder);
          const notes = Array.isArray(note) ? note : (note ? [note] : []);
          if (notes.length > 0) {
            setCurrentNote(notes[notes.length - 1]);
          }
        },
        onUsageUpdate: (usage) => {
          setUsage(usage);
          if (usage.totalTokenCount !== undefined) setTotalTokens(usage.totalTokenCount);
        }
      });
      
      await textInterfaceRef.current.initialize(activeKey, { voiceName, customContext, systemInstruction }, { folder: currentFolder, note: currentNote });
    }
    
    await textInterfaceRef.current.sendMessage(message);
  };

  return (
    <div className={`hermes-root flex flex-col overflow-hidden ${isObsidianEnvironment ? '' : 'standalone'}`}>
      <Settings 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        voiceName={voiceName} 
        setVoiceName={setVoiceName} 
        customContext={customContext} 
        setCustomContext={setCustomContext} 
        systemInstruction={systemInstruction}
        setSystemInstruction={setSystemInstruction}
        manualApiKey={manualApiKey}
        setManualApiKey={setManualApiKey}
        onUpdateApiKey={() => (window as any).aistudio?.openSelectKey()} 
      />
      
      <Header 
        status={status}
        showLogs={showKernel}
        onToggleLogs={() => setShowKernel(!showKernel)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      
      <MainWindow 
        showKernel={showKernel}
        transcripts={transcripts} 
        hasSavedConversation={hasSavedConversation}
        onRestoreConversation={restoreConversation}
        logs={logs}
        usage={usage}
        onFlushLogs={() => setLogs([])}
        fileCount={fileCount}
      />
      
      <InputBar 
        inputText={inputText} 
        setInputText={setInputText} 
        onSendText={handleSendText} 
        isListening={status === ConnectionStatus.CONNECTED} 
        onStartSession={startSession} 
        onStopSession={stopSession} 
        status={status} 
        activeSpeaker={activeSpeaker} 
        volume={micVolume}
      />
    </div>
  );
};

export default App;
