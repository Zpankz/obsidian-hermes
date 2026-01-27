import { TranscriptionEntry, ToolData } from '../types';
import { isObsidian } from './environment';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export const archiveConversation = async (
  summary: unknown,
  history: TranscriptionEntry[],
  chatHistoryFolder?: string,
  textInterface?: { generateSummary: (text: string) => Promise<string> }
): Promise<string> => {
  // Handle case where summary might be passed as JSON object
  let summaryText = '';
  if (typeof summary === 'object' && summary !== null) {
    const summaryRecord = summary as Record<string, unknown>;
    const candidate = summaryRecord.summary ?? summaryRecord.title ?? summaryRecord;
    summaryText = String(candidate);
  } else {
    summaryText = String(summary ?? '');
  }
  // Ensure summaryText is a string
  summaryText = summaryText || 'Conversation';
  
  // Extract keywords from the summary for filename
  const generateKeywordsFromText = (text: string): string => {
    // Common words to filter out
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their']);
    
    // Extract meaningful words (3+ characters, not stop words)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 3 && !stopWords.has(word))
      .slice(0, 5); // Take up to 5 keywords
    
    return words.join('-');
  };
  
  const keywords = generateKeywordsFromText(summaryText);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  const safeKeywords = keywords.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 40);
  const historyFolder = chatHistoryFolder || 'chat-history';
  
  // Get order within day (incremental counter)
  const getOrderWithinDay = (): string => {
    const today = new Date().toISOString().split('T')[0];
    const orderKey = `hermes-chat-order-${today}`;
    
    try {
      let currentOrder = 0;
      
      if (isObsidian()) {
        // In Obsidian, use a simple in-memory counter for this session
        // This will reset to 0 each time the plugin loads, which is acceptable
        if (!(globalThis as any)._hermesChatOrder) {
          (globalThis as any)._hermesChatOrder = {};
        }
        currentOrder = (globalThis as any)._hermesChatOrder[today] || 0;
        (globalThis as any)._hermesChatOrder[today] = currentOrder + 1;
      } else {
        // In standalone mode, use localStorage
        currentOrder = parseInt(localStorage.getItem(orderKey) || '0');
        const newOrder = currentOrder + 1;
        localStorage.setItem(orderKey, newOrder.toString());
      }
      
      return (currentOrder + 1).toString().padStart(2, '0');
    } catch (error) {
      // Fallback to simple timestamp if storage fails
      console.warn('Failed to get order within day:', error);
      return '01';
    }
  };
  
  const order = getOrderWithinDay();
  const filename = `${historyFolder}/${dateStr}-${order}-${safeKeywords || 'conversation'}.md`;

  const filteredHistory = history.filter(t => {
    if (t.id === 'welcome-init') return false;
    if (t.role === 'model' && t.text.trim().toLowerCase().replace(/\./g, '') === 'done') return false;
    return true;
  });

  // Calculate duration from first to last entry
  const timestamps = filteredHistory.map(t => t.timestamp).filter(t => t > 0);
  const startDate = timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : now.toISOString();
  const endDate = timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : now.toISOString();
  const duration = timestamps.length > 1 ? Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / 1000) : 0;
  
  // Auto-generate tags from content
  const allText = filteredHistory.map(t => t.text.toLowerCase()).join(' ');
  const tags = new Set<string>();
  
  // Auto-tag common topics
  if (allText.includes('file') || allText.includes('edit') || allText.includes('create')) tags.add('file-management');
  if (allText.includes('search') || allText.includes('find') || allText.includes('look')) tags.add('search');
  if (allText.includes('image') || allText.includes('generate') || allText.includes('create')) tags.add('creation');
  if (allText.includes('rename') || allText.includes('move') || allText.includes('organize')) tags.add('organization');
  if (allText.includes('help') || allText.includes('how') || allText.includes('question')) tags.add('help');
  
  // Add duration-based tags
  if (duration > 300) tags.add('long-conversation');
  if (duration < 60) tags.add('quick-chat');
  
  const tagList = Array.from(tags).map(tag => `- ${tag}`).join('\n  ');

  // Group consecutive entries by role to merge multi-line messages
  const groupedEntries: TranscriptionEntry[][] = [];
  let currentGroup: TranscriptionEntry[] = [];
  let currentRole: string | null = null;
  
  filteredHistory.forEach(entry => {
    if (currentRole === null || entry.role !== currentRole) {
      if (currentGroup.length > 0) {
        groupedEntries.push(currentGroup);
      }
      currentGroup = [entry];
      currentRole = entry.role;
    } else {
      currentGroup.push(entry);
    }
  });
  
  if (currentGroup.length > 0) {
    groupedEntries.push(currentGroup);
  }

  const markdown = groupedEntries
    .map((group, groupIndex) => {
      const firstEntry = group[0];
      let block = '';
      
      // Merge text from all entries in the group
      const mergedText = group.map(e => e.text).join(' ').trim();
      
      // Convert file references to Obsidian wiki links
      const convertFileLinks = (text: string) => {
        // Match common file patterns and convert to wiki links
        return text
          // Match patterns like "file: filename.md" or just "filename.md" in context
          .replace(/(?:file:\s*|)([a-zA-Z0-9_/-]+\.(md|txt|js|ts|jsx|tsx|json|yaml|yml|css|html|py|java|cpp|c|h|go|rs|php|rb|swift|kt|scala|sh|sql|xml|csv|pdf|doc|docx|png|jpg|jpeg|gif|svg))/g, '[[$1]]')
          // Match patterns with quotes: "filename.md"
          .replace(/"([a-zA-Z0-9_/-]+\.(md|txt|js|ts|jsx|tsx|json|yaml|yml|css|html|py|java|cpp|c|h|go|rs|php|rb|swift|kt|scala|sh|sql|xml|csv|pdf|doc|docx|png|jpg|jpeg|gif|svg))"/g, '[[$1]]')
          // Match patterns in backticks: `filename.md`
          .replace(/`([a-zA-Z0-9_/-]+\.(md|txt|js|ts|jsx|tsx|json|yaml|yml|css|html|py|java|cpp|c|h|go|rs|php|rb|swift|kt|scala|sh|sql|xml|csv|pdf|doc|docx|png|jpg|jpeg|gif|svg))`/g, '[[$1]]');
      };
      
      if (firstEntry.role === 'user') {
        // No "User:" prefix, just the text with file links converted
        block = convertFileLinks(mergedText);
      } else if (firstEntry.role === 'model') {
        block = `> ${convertFileLinks(mergedText).split('\n').join('\n> ')}`;
      } else if (firstEntry.role === 'system') {
        // Handle all system messages in the group
        const systemBlocks = group.map(entry => {
          if (entry.toolData?.name === 'rename_file') {
            return `**RENAME** ~~${entry.toolData.oldContent}~~ -> [[${entry.toolData.newContent}]]`;
          } else if (entry.toolData?.name === 'topic_switch') {
            return `## ${entry.toolData.newContent}`;
          } else {
            let output = `\`\`\`system\n${entry.text}\n\`\`\``;
            if (entry.toolData) {
              const fileRef = `[[${entry.toolData.filename}]]`;
              if (entry.toolData.oldContent !== undefined && entry.toolData.newContent !== undefined && entry.toolData.oldContent !== entry.toolData.newContent) {
                // Check if content was actually removed (old content has content that's not in new content)
                const hasRemovedContent = entry.toolData.oldContent && 
                  entry.toolData.oldContent.trim() !== '' && 
                  !entry.toolData.newContent.includes(entry.toolData.oldContent);
                
                if (hasRemovedContent) {
                  output += `\n\n${fileRef}\n\n--- Removed\n\`\`\`markdown\n${entry.toolData.oldContent || '(empty)'}\n\`\`\`\n\n+++ Added\n\`\`\`markdown\n${entry.toolData.newContent || '(empty)'}\n\`\`\``;
                } else {
                  // Only show addition/modification, no removal
                  output += `\n\n${fileRef}\n\`\`\`markdown\n${entry.toolData.newContent}\n\`\`\``;
                }
              } else if (entry.toolData.name === 'read_file' || entry.toolData.name === 'create_file') {
                 output += `\n\n${fileRef}\n\`\`\`markdown\n${entry.toolData.newContent}\n\`\`\``;
              }
            }
            return output;
          }
        });
        
        block = systemBlocks.join('\n\n');
      }
      
      return block;
    })
    .filter(block => block.trim() !== '')
    .join('\n\n');

  // Generate AI summary if text interface is available
  let aiSummary = '';
  if (textInterface && filteredHistory.length > 0) {
    try {
      const conversationText = filteredHistory
        .filter(entry => entry.role === 'user' || entry.role === 'model')
        .map(entry => `${entry.role}: ${entry.text}`)
        .join('\n');
      
      if (conversationText.trim()) {
        aiSummary = await textInterface.generateSummary(conversationText);
      }
    } catch (error) {
      console.warn('Failed to generate AI summary:', getErrorMessage(error));
      // Continue without AI summary if it fails
    }
  }

  try {
    const { createFile, createDirectory } = await import('../services/vaultOperations');
    
    // Ensure the chat history directory exists
    await createDirectory(historyFolder);
    
    const frontmatter = `---
title: ${summaryText.length > 50 ? summaryText.substring(0, 47) + '...' : summaryText}
date: ${startDate}
end_date: ${endDate}
duration: ${duration}
tags:
  ${tagList}
format: hermes-chat-archive
summary: ${summaryText.replace(/"/g, '\\"')}
${aiSummary ? `ai_summary: ${aiSummary.replace(/"/g, '\\"')}` : ''}
---

`;
    
    await createFile(filename, `${frontmatter}${markdown}`);
    return `Segment archived to ${filename}`;
  } catch (err) {
    throw new Error(`Persistence Failure: ${getErrorMessage(err)}`);
  }
};
