import React, { useState, useEffect } from 'react';
import { getFolderTree } from '../services/vaultOperations';

interface FolderTreeProps {
  currentFolder: string;
  onFolderChange: (folder: string) => void;
}

const FolderTree: React.FC<FolderTreeProps> = ({ currentFolder, onFolderChange }) => {
  const [folders, setFolders] = useState<string[]>([]);

  useEffect(() => {
    const loadFolders = () => {
      try {
        const folderList = getFolderTree();
        setFolders(folderList);
      } catch (error) {
        console.error('Failed to load folders:', error);
      }
    };
    loadFolders();
  }, []);

  return (
    <div className="flex items-center space-x-1 px-3 py-1 text-sm hermes-text-muted">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <div className="flex items-center space-x-1 overflow-x-auto max-w-[300px] scrollbar-thin scrollbar-hermes-border">
        {folders.map((folder, index) => (
          <button
            key={folder}
            onClick={() => onFolderChange(folder)}
            className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
              folder === currentFolder 
                ? 'hermes-bg-accent hermes-text-accent-foreground font-medium' 
                : 'hermes-text-muted hover:hermes-text-normal hover:hermes-bg-secondary/50'
            }`}
            title={`Switch to ${folder || '/'}`}
          >
            {folder || '/'}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FolderTree;
