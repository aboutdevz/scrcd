/**
 * Rich text utility for formatting callouts, converting HTML to Markdown,
 * and extracting structured plain text for document exports.
 */

/**
 * Ensures any blockquotes containing [TIP], [WARNING], [NOTE] or [!TIP], etc.
 * have the appropriate CSS callout classes (`callout-tip`, `callout-warning`, `callout-note`).
 */
export function formatCalloutHtml(html: string | undefined | null): string {
  if (!html) return '';

  return html
    // Enhance blockquotes that do not already have a callout class
    .replace(
      /<blockquote(?:\s+class="([^"]*)")?([^>]*)>([\s\S]*?)<\/blockquote>/gi,
      (match, existingClass, otherAttrs, innerContent) => {
        const cls = existingClass || '';
        // If already tagged with a callout class, preserve it
        if (/callout-(tip|warning|note)/i.test(cls)) {
          return match;
        }

        const upper = innerContent.toUpperCase();
        let calloutType: 'tip' | 'warning' | 'note' | null = null;

        if (upper.includes('[TIP]') || upper.includes('[!TIP]')) {
          calloutType = 'tip';
        } else if (upper.includes('[WARNING]') || upper.includes('[!WARNING]')) {
          calloutType = 'warning';
        } else if (upper.includes('[NOTE]') || upper.includes('[!NOTE]')) {
          calloutType = 'note';
        }

        if (calloutType) {
          const newClass = cls ? `${cls} callout-${calloutType}` : `callout-${calloutType}`;
          const cleanAttrs = otherAttrs.replace(/\s*class="[^"]*"/gi, '');
          return `<blockquote class="${newClass}"${cleanAttrs}>${innerContent}</blockquote>`;
        }

        return match;
      }
    );
}

/**
 * Converts rich HTML instructions into structured plain text,
 * properly converting list items into bullets, preserving line breaks
 * between paragraphs and headings, and unescaping HTML entities.
 */
export function htmlToPlainText(html: string | undefined | null): string {
  if (!html) return '';

  return html
    // Replace headings and paragraphs with double newlines
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/p>/gi, '\n\n')
    // Convert list items into bullet points with newlines
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Blockquotes
    .replace(/<blockquote[^>]*>/gi, '\n')
    .replace(/<\/blockquote>/gi, '\n')
    // Strip all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normalize consecutive newlines & spaces
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts rich instructions HTML into clean GitHub-flavored Markdown.
 */
export function htmlToMarkdown(html: string | undefined | null): string {
  if (!html) return '';

  let md = html;

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n\n');

  // Blockquotes / Callouts
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const lines = htmlToPlainText(content).split('\n');
    return '\n' + lines.map((l) => `> ${l}`).join('\n') + '\n\n';
  });

  // Lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    return '\n' + content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n') + '\n';
  });

  let olIndex = 1;
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    olIndex = 1;
    return '\n' + content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => `${olIndex++}. $1\n`) + '\n';
  });

  // Marks
  md = md.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');
  md = md.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Paragraphs and breaks
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, '');

  // Entities
  md = md
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean extra blank lines
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return md;
}
