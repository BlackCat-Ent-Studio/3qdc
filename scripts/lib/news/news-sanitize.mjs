// news-sanitize.mjs — cleans article HTML on the server before it is stored. The editor runs in a browser, so nothing it
// sends is trusted: only the tags the toolbar produces survive, links must be https, pictures must be the site's own.
import sanitizeHtml from 'sanitize-html';
import { IMAGE_PATH_RE } from './news-config.mjs';

const HTTPS_LINK_RE = /^https:\/\/[^\s"'<>\\]+$/i;
const SPAN_RE = /^[1-9]\d?$/;

const OPTIONS = {
  allowedTags: ['p', 'br', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'a', 'figure', 'figcaption', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'code', 'small', 'blockquote'],
  allowedAttributes: { a: ['href', 'rel', 'target'], img: ['src', 'alt'], div: ['class'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] },
  allowedClasses: { div: ['tbl', 'gift', 'note'] },
  allowedSchemes: ['https'],
  allowedSchemesByTag: {},
  allowProtocolRelative: false,
  // nothing but text inside these, and their text is dropped too
  // (button: a pasted "Sao chép mã" button — the article page adds its own)
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'title', 'template', 'iframe', 'object', 'svg', 'math', 'button'],
  transformTags: {
    // links open in a new tab and pass no credit; anything but a plain https address loses its href
    a: (tagName, attribs) => {
      const href = typeof attribs.href === 'string' ? attribs.href.trim() : '';
      return HTTPS_LINK_RE.test(href)
        ? { tagName, attribs: { href, rel: 'noopener nofollow', target: '_blank' } }
        : { tagName, attribs: {} };
    },
    td: (tagName, attribs) => ({ tagName, attribs: spans(attribs) }),
    th: (tagName, attribs) => ({ tagName, attribs: spans(attribs) }),
  },
  // pictures from anywhere but the site's artwork folders are removed entirely
  exclusiveFilter: (frame) => frame.tag === 'img' && !IMAGE_PATH_RE.test(frame.attribs.src || ''),
};

function spans(attribs) {
  const out = {};
  for (const k of ['colspan', 'rowspan']) if (SPAN_RE.test(attribs[k] || '')) out[k] = attribs[k];
  return out;
}

export function cleanContent(html) {
  return sanitizeHtml(String(html ?? ''), OPTIONS).trim();
}

// Plain text of the stored HTML, for "is there any content" checks.
export const textOf = (html) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|\s+/g, ' ').trim();
