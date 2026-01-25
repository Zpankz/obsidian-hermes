import React from 'react';
import { isObsidian, getObsidianApp } from '../utils/environment';

interface DocumentLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const DocumentLink: React.FC<DocumentLinkProps> = ({ href, children, className = '' }) => {
  const handleClick = (e: React.MouseEvent) => {
    // Only handle file links in Obsidian environment
    if (isObsidian() && href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
      e.preventDefault();
      
      try {
        // @ts-ignore - Obsidian global app
        const app = getObsidianApp();
        if (app && app.vault && app.workspace) {
          // Get the file by path
          const file = app.vault.getAbstractFileByPath(href);
          if (file) {
            // Open the file in a new tab
            const leaf = app.workspace.getLeaf('tab');
            leaf.openFile(file);
          } else {
            // Try to create the file if it doesn't exist
            console.warn(`File not found: ${href}. You may need to create it first.`);
          }
        }
      } catch (error) {
        console.error('Error opening file in Obsidian:', error);
      }
    }
  };

  // Determine if this is a file link (not external URL or anchor)
  const isFileLink = href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:');
  
  // Base classes for all links
  const baseClasses = "hermes-text-accent hover:hermes-text-accent/80 transition-colors cursor-pointer";
  
  // Additional classes for file links in Obsidian
  const fileLinkClasses = isFileLink && isObsidian() ? " underline decoration-dotted decoration-2" : "";
  
  const combinedClasses = `${baseClasses} ${fileLinkClasses} ${className}`.trim();

  return (
    <a 
      href={href}
      onClick={handleClick}
      className={combinedClasses}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      title={isFileLink && isObsidian() ? `Open ${href} in Obsidian` : undefined}
    >
      {children}
    </a>
  );
};

export default DocumentLink;
