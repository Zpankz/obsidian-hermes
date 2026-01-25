import React from 'react';
import { TranscriptionEntry, LogEntry, UsageMetadata } from '../types';
import ChatWindow from './ChatWindow';
import KernelLog from './KernelLog';

interface MainWindowProps {
  showKernel: boolean;
  transcripts: TranscriptionEntry[];
  hasSavedConversation?: boolean;
  onRestoreConversation?: () => void;
  logs: LogEntry[];
  usage?: UsageMetadata;
  onFlushLogs: () => void;
  fileCount: number;
}

const MainWindow: React.FC<MainWindowProps> = ({
  showKernel,
  transcripts,
  hasSavedConversation,
  onRestoreConversation,
  logs,
  usage,
  onFlushLogs,
  fileCount
}) => {
  return (
    <main className="flex-1 min-h-0 flex flex-col">
      {showKernel ? (
        <KernelLog 
          isVisible={true}
          logs={logs}
          usage={usage}
          onFlush={onFlushLogs}
          fileCount={fileCount}
        />
      ) : (
        <ChatWindow 
          transcripts={transcripts} 
          hasSavedConversation={hasSavedConversation}
          onRestoreConversation={onRestoreConversation}
        />
      )}
    </main>
  );
};

export default MainWindow;
