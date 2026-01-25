# DocumentLink Test

This is a test document to demonstrate the DocumentLink component functionality.

## File Links

Here are some file links that should open in Obsidian when clicked:

- [Link to README](README.md)
- [Link to package.json](package.json)
- [Link to App.tsx](App.tsx)
- [Link to components folder](components/)

## External Links

These should open in new tabs as usual:

- [Google](https://google.com)
- [GitHub](https://github.com)

## Mixed Content

You can have [file links](main.ts) and [external links](https://obsidian.md) in the same paragraph.

## Code Examples

```typescript
// This is a code block with a file reference
import './components/DocumentLink.tsx';
```

The DocumentLink component should:
1. Detect file links (not starting with http, #, or mailto:)
2. Open them in Obsidian when running in Obsidian environment
3. Show external links normally
4. Have proper styling for file links (dotted underline)
