import React from 'react';
import React from 'react';
import { marked } from 'marked';
import type { Tokens, TokensList } from 'marked';
import DocumentLink from './DocumentLink';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Parse the markdown content and extract links
  const processedContent = React.useMemo(() => {
    if (!content) return [];

    const tokens = marked.lexer(content);

    const processTokens = (tokensToProcess: TokensList | Tokens[], keyPrefix: string = '0'): React.ReactNode[] => {
      const result: React.ReactNode[] = [];
      
      tokensToProcess.forEach((token, index) => {
        const key = `${keyPrefix}-${index}`;
        
        switch (token.type) {
          case 'paragraph': {
            const paragraphToken = token as Tokens.Paragraph;
            result.push(
              <p key={key} className="mb-4">
                {processTokens(paragraphToken.tokens, key)}
              </p>
            );
            break;
          }
          case 'text': {
            const textToken = token as Tokens.Text;
            result.push(<React.Fragment key={key}>{textToken.text}</React.Fragment>);
            break;
          }
          case 'link': {
            const linkToken = token as Tokens.Link;
            const href = linkToken.href;
            const isFileLink = href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:');

            if (isFileLink) {
              result.push(
                <DocumentLink key={key} href={href}>
                  {linkToken.text || href}
                </DocumentLink>
              );
            } else {
              result.push(
                <a 
                  key={key}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="hermes-text-accent hover:hermes-text-accent/80 transition-colors"
                >
                  {linkToken.text || href}
                </a>
              );
            }
            break;
          }
          case 'strong': {
            const strongToken = token as Tokens.Strong;
            result.push(
              <strong key={key} className="font-bold">
                {processTokens(strongToken.tokens, key)}
              </strong>
            );
            break;
          }
          case 'em': {
            const emToken = token as Tokens.Em;
            result.push(
              <em key={key} className="italic">
                {processTokens(emToken.tokens, key)}
              </em>
            );
            break;
          }
          case 'code': {
            const codeToken = token as Tokens.Code;
            result.push(
              <code key={key} className="hermes-bg-tertiary px-1 rounded">
                {codeToken.text}
              </code>
            );
            break;
          }
          case 'codespan': {
            const codespanToken = token as Tokens.Codespan;
            result.push(
              <code key={key} className="hermes-bg-tertiary px-1 rounded">
                {codespanToken.text}
              </code>
            );
            break;
          }
          case 'heading': {
            const headingToken = token as Tokens.Heading;
            const Tag = `h${headingToken.depth}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
            result.push(
              React.createElement(Tag, {
                key: key,
                className: "hermes-text-accent font-bold mb-2 mt-4"
              }, ...processTokens(headingToken.tokens, key))
            );
            break;
          }
          case 'list': {
            const listToken = token as Tokens.List;
            const ListTag = listToken.ordered ? 'ol' : 'ul';
            result.push(
              React.createElement(ListTag, {
                key: key,
                className: listToken.ordered ? "list-decimal list-inside mb-4" : "list-disc list-inside mb-4"
              }, ...listToken.items.map((item, itemIndex: number) =>
                React.createElement('li', {
                  key: `${key}-${itemIndex}`,
                  className: "mb-1"
                }, ...processTokens(item.tokens, `${key}-${itemIndex}`))
              ))
            );
            break;
          }
          case 'blockquote': {
            const blockquoteToken = token as Tokens.Blockquote;
            result.push(
              <blockquote key={key} className="border-l-4 border-hermes-border/50 pl-4 italic hermes-text-muted mb-4">
                {processTokens(blockquoteToken.tokens, key)}
              </blockquote>
            );
            break;
          }
          case 'hr': {
            result.push(<hr key={key} className="hermes-border/50 my-4" />);
            break;
          }
          default: {
            // For any token types we haven't handled, try to render as text
            if ('text' in token && token.text) {
              result.push(<React.Fragment key={key}>{token.text}</React.Fragment>);
            }
            break;
          }
        }
      });
      
      return result;
    };

    return processTokens(tokens);
  }, [content]);

  return (
    <div className={`prose prose-invert prose-sm max-w-none prose-headings:hermes-text-accent prose-code:hermes-bg-tertiary prose-code:px-1 prose-code:rounded prose-pre:hermes-bg-tertiary prose-pre:hermes-border prose-pre:hermes-border/10 font-sans leading-relaxed hermes-text-normal ${className}`}
         style={{ userSelect: 'text', WebkitUserSelect: 'text', MozUserSelect: 'text', msUserSelect: 'text' }}>
      {processedContent}
    </div>
  );
};

export default MarkdownRenderer;
