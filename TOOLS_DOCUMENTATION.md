# Directory and Folder Tools Documentation

## Overview
Two new tools have been added to provide different perspectives on the vault's directory structure:

## 1. `dirlist` Tool
- **Purpose**: Returns a hierarchical tree structure of directories only
- **Format**: Nested JSON object with `path` and `children` properties
- **Use Case**: When the AI needs to understand the complete folder hierarchy without file clutter

### Example Output:
```json
[
  {
    "path": "",
    "children": [
      {
        "path": "projects",
        "children": []
      },
      {
        "path": "research",
        "children": [
          {
            "path": "research/notes",
            "children": []
          }
        ]
      }
    ]
  }
]
```

## 2. `get_folder_tree` Tool (Enhanced)
- **Purpose**: Returns a flat array of all folder paths
- **Format**: Simple sorted array of folder paths
- **Use Case**: When the AI needs a quick overview of all available folders

### Example Output:
```javascript
[
  "/",
  "projects",
  "research",
  "research/notes"
]
```

## Key Differences

| Feature | dirlist | get_folder_tree |
|---------|---------|-----------------|
| Structure | Hierarchical tree | Flat array |
| File Info | Excluded completely | Excluded completely |
| Complexity | Higher (nested) | Lower (simple) |
| Use Case | Detailed hierarchy analysis | Quick folder overview |

## Implementation Details

Both tools work in both Obsidian and mock environments:

### In Obsidian:
- `dirlist`: Uses `app.vault.getAllLoadedFiles()` and builds recursive tree
- `get_folder_tree`: Filters folders from `app.vault.getAllLoadedFiles()`

### In Mock Environment:
- Both use the `MOCK_FILES` object to extract folder paths
- `dirlist` builds parent-child relationships using a Map
- `get_folder_tree` extracts unique folder paths

## Usage Recommendations

- Use `dirlist` when you need to understand the complete folder structure and relationships
- Use `get_folder_tree` for a simple list of all folders
- Both tools ignore files completely, focusing only on directory structure
