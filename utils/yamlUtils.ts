import * as yaml from 'js-yaml';

/**
 * Safely converts any object to valid YAML string
 * @param data - The data to convert to YAML
 * @param options - YAML dump options
 * @returns Valid YAML string
 */
export const toYaml = (data: unknown, options?: yaml.DumpOptions): string => {
  try {
    return yaml.dump(data, {
      indent: 2,
      lineWidth: -1, // No line wrapping
      noRefs: true, // Don't use anchors
      sortKeys: false, // Preserve original key order
      ...options
    });
  } catch (error) {
    console.error('YAML conversion error:', error);
    // Fallback to JSON if YAML fails
    return JSON.stringify(data, null, 2);
  }
};

/**
 * Safely parses YAML string to object
 * @param yamlString - The YAML string to parse
 * @returns Parsed object or null if parsing fails
 */
export const fromYaml = (yamlString: string): unknown => {
  try {
    return yaml.load(yamlString);
  } catch (error) {
    console.error('YAML parsing error:', error);
    return null;
  }
};

/**
 * Validates if a string is valid YAML
 * @param yamlString - The YAML string to validate
 * @returns True if valid YAML, false otherwise
 */
export const isValidYaml = (yamlString: string): boolean => {
  try {
    yaml.load(yamlString);
    return true;
  } catch {
    return false;
  }
};

/**
 * Creates a YAML frontmatter string
 * @param data - The data to convert to frontmatter
 * @returns Frontmatter string with --- delimiters
 */
export const toFrontmatter = (data: unknown): string => {
  const yamlContent = toYaml(data);
  return `---\n${yamlContent}---`;
};

/**
 * Extracts and parses frontmatter from a markdown string
 * @param markdown - The markdown content with frontmatter
 * @returns Object with frontmatter data and content, or null if no frontmatter
 */
export const fromFrontmatter = (markdown: string): { frontmatter: unknown; content: string } | null => {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);
  
  if (!match) return null;
  
  const frontmatter = fromYaml(match[1]);
  const content = match[2];
  
  return { frontmatter, content };
};
