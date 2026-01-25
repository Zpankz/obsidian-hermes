import { TranscriptionEntry, ToolData } from '../types';

export const archiveConversation = async (summary: string, history: TranscriptionEntry[]) => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:T]/g, '-').split('.')[0];
  const safeTopic = summary.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 40);
  const filename = `chat-history/chat-history-${timestamp}-${safeTopic}.md`;

  const filteredHistory = history.filter(t => {
    if (t.id === 'welcome-init') return false;
    if (t.role === 'model' && t.text.trim().toLowerCase().replace(/\./g, '') === 'done') return false;
    return true;
  });

  const markdown = filteredHistory
    .map((t, i, arr) => {
      let block = '';
      if (t.role === 'user') {
        block = `**User**: ${t.text}`;
      } else if (t.role === 'model') {
        block = `> ${t.text.split('\n').join('\n> ')}`;
      } else if (t.role === 'system') {
        if (t.toolData?.name === 'rename_file') {
          block = `**RENAME** ~~${t.toolData.oldContent}~~ -> [[${t.toolData.newContent}]]`;
        } else if (t.toolData?.name === 'topic_switch') {
          block = `## ${t.toolData.newContent}`;
        } else {
          let output = `\`\`\`system\n${t.text}\n\`\`\``;
          if (t.toolData) {
            const fileRef = `[[${t.toolData.filename}]]`;
            if (t.toolData.oldContent !== undefined && t.toolData.newContent !== undefined && t.toolData.oldContent !== t.toolData.newContent) {
              output += `\n\n${fileRef}\n\n--- Removed\n\`\`\`markdown\n${t.toolData.oldContent || '(empty)'}\n\`\`\`\n\n+++ Added\n\`\`\`markdown\n${t.toolData.newContent || '(empty)'}\n\`\`\``;
            } else if (t.toolData.name === 'read_file' || t.toolData.name === 'create_file') {
               output += `\n\n${fileRef}\n\`\`\`markdown\n${t.toolData.newContent}\n\`\`\``;
            }
          }
          block = output;
        }
      }
      const next = arr[i + 1];
      const isUserGroup = t.role === 'user' && next?.role === 'user';
      return block + (isUserGroup ? '\n\n' : '\n\n---\n\n');
    })
    .join('');

  try {
    const { createFile, createDirectory } = await import('../services/mockFiles');
    
    // Ensure the chat-history directory exists
    try {
      await createDirectory('chat-history');
    } catch (err: any) {
      // Directory might already exist, that's fine
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }
    
    await createFile(filename, `# Conversation Archive: ${summary}\n\n${markdown}`);
    return `Segment archived to ${filename}`;
  } catch (err: any) {
    throw new Error(`Persistence Failure: ${err.message}`);
  }
};
