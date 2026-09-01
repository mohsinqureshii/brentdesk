/**
 * Server-side Open Graph meta tag generation
 * Generates proper OG tags for social media sharing across all pages
 */

export interface MetaTagData {
  title: string;
  description: string;
  url: string;
  image?: string;
  imageAlt?: string;
  imageMimeType?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

/**
 * Generate Open Graph meta tags HTML
 */
export function generateMetaTags(data: MetaTagData): string {
  const {
    title,
    description,
    url,
    image,
    imageAlt,
    type = 'website',
    author,
    publishedTime,
    modifiedTime,
    section,
    tags = [],
  } = data;

  const metaTags: string[] = [];

  // Standard meta tags
  metaTags.push(`<meta name="description" content="${escapeHtml(description)}" />`);
  metaTags.push(`<meta name="viewport" content="width=device-width, initial-scale=1" />`);

  // Open Graph tags
  metaTags.push(`<meta property="og:title" content="${escapeHtml(title)}" />`);
  metaTags.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
  metaTags.push(`<meta property="og:type" content="${type}" />`);
  metaTags.push(`<meta property="og:url" content="${escapeHtml(url)}" />`);
  metaTags.push(`<meta property="og:site_name" content="TechScoop" />`);
  metaTags.push(`<meta property="og:locale" content="en_US" />`);

  if (image) {
    // Determine image type from URL extension or provided mime type
    const imgType = data.imageMimeType || (image.endsWith('.png') ? 'image/png' : image.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
    const imgWidth = data.imageWidth || 1200;
    const imgHeight = data.imageHeight || 630;
    metaTags.push(`<meta property="og:image" content="${escapeHtml(image)}" />`);
    metaTags.push(`<meta property="og:image:secure_url" content="${escapeHtml(image)}" />`);
    metaTags.push(`<meta property="og:image:type" content="${imgType}" />`);
    metaTags.push(`<meta property="og:image:width" content="${imgWidth}" />`);
    metaTags.push(`<meta property="og:image:height" content="${imgHeight}" />`);
    if (imageAlt) {
      metaTags.push(`<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`);
    }
  }

  // Twitter Card tags
  metaTags.push(`<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`);
  metaTags.push(`<meta name="twitter:site" content="@techscoopmena" />`);
  metaTags.push(`<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  metaTags.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  if (image) {
    metaTags.push(`<meta name="twitter:image" content="${escapeHtml(image)}" />`);
    if (imageAlt) {
      metaTags.push(`<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`);
    }
  }

  // Article-specific tags
  if (type === 'article') {
    if (author) {
      metaTags.push(`<meta property="article:author" content="${escapeHtml(author)}" />`);
    }
    if (publishedTime) {
      metaTags.push(`<meta property="article:published_time" content="${escapeHtml(publishedTime)}" />`);
    }
    if (modifiedTime) {
      metaTags.push(`<meta property="article:modified_time" content="${escapeHtml(modifiedTime)}" />`);
    }
    if (section) {
      metaTags.push(`<meta property="article:section" content="${escapeHtml(section)}" />`);
    }
    tags.forEach((tag) => {
      metaTags.push(`<meta property="article:tag" content="${escapeHtml(tag)}" />`);
    });
  }

  // Canonical URL
  metaTags.push(`<link rel="canonical" href="${escapeHtml(url)}" />`);

  return metaTags.join('\n');
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Inject meta tags into HTML
 */
export function injectMetaTags(html: string, metaTags: string): string {
  // Find the closing </head> tag and inject meta tags before it
  const headCloseIndex = html.indexOf('</head>');
  if (headCloseIndex === -1) {
    return html;
  }
  return html.slice(0, headCloseIndex) + metaTags + '\n' + html.slice(headCloseIndex);
}
