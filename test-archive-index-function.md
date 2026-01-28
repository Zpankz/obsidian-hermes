# Test getNextArchiveIndex Function

This file demonstrates the usage of the new `getNextArchiveIndex` function.

## Function Purpose

The `getNextArchiveIndex` function:
1. Reads the contents of the chat-history folder (from settings)
2. Finds today's date's notes
3. Finds the LAST one based on their index YYYY-MM-DD-II where II is the index
4. Gets II out and returns YYYY-MM-DD-(II+1)
5. Used when history archiving saves to generate the filename

## Usage Example

```typescript
import { getNextArchiveIndex } from './utils/archiveConversation';

// Get the next available archive index for today
const nextIndex = await getNextArchiveIndex();
console.log(nextIndex); // e.g., "2025-01-28-03"

// This will be used in the archiveConversation function to generate filenames like:
// chat-history/2025-01-28-03-conversation-summary.md
```

## Implementation Details

- Reads from the chat history folder specified in settings
- Uses regex pattern to match files with format `YYYY-MM-DD-II*.md`
- Extracts the numeric index (II) from existing files for today
- Returns the next index with leading zero padding
- Falls back to `YYYY-MM-DD-01` if no files exist for today or if an error occurs

## Testing

To test this function:

1. Create some test files in your chat-history folder with names like:
   - `2025-01-28-01-test.md`
   - `2025-01-28-02-another.md`

2. Call `getNextArchiveIndex()` - it should return `2025-01-28-03`

3. Delete the files and call again - it should return `2025-01-28-01`
