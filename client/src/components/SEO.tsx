import { publication } from "@shared/publication";
import { useEffect } from 'react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  ogImage?: string;
  ogType?: 'website' | 'article';
  keywords?: string;
  hreflang?: Array<{ lang: string; url: string }>;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
}

/**
 * SEO component for managing document head meta tags
 * Handles title, description, canonical URLs, noindex, and Open Graph tags
 */
export function SEO({
  title,
  description,
  canonical,
  noindex = false,
  ogImage,
  ogType = 'website',
  keywords,
  hreflang,
  article,
}: SEOProps) {
  const { settings } = useSiteSettings();
  const siteName = settings.site_title || publication.name;

  useEffect(() => {
    // Update document title
    if (title) {
      document.title = `${title} | ${siteName}`;
    }

    // Helper to set or remove meta tag
    const setMeta = (name: string, content: string | undefined, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      
      if (content) {
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute(attr, name);
          document.head.appendChild(meta);
        }
        meta.content = content;
      } else if (meta) {
        meta.remove();
      }
    };

    // Helper to set or remove link tag
    const setLink = (rel: string, href: string | undefined) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      
      if (href) {
        if (!link) {
          link = document.createElement('link');
          link.rel = rel;
          document.head.appendChild(link);
        }
        link.href = href;
      } else if (link) {
        link.remove();
      }
    };

    // Set description
    setMeta('description', description);

    // Set keywords
    setMeta('keywords', keywords);

    // Set hreflang links for multi-language support
    if (hreflang && hreflang.length > 0) {
      // Remove existing hreflang links
      document.querySelectorAll('link[hreflang]').forEach(el => el.remove());
      
      // Add new hreflang links
      hreflang.forEach(({ lang, url }) => {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.setAttribute('hreflang', lang);
        link.href = url;
        document.head.appendChild(link);
      });
    }

    // Set robots (noindex)
    if (noindex) {
      setMeta('robots', 'noindex, nofollow');
    } else {
      // Remove noindex if it was previously set
      const robotsMeta = document.querySelector('meta[name="robots"]');
      if (robotsMeta && robotsMeta.getAttribute('content')?.includes('noindex')) {
        robotsMeta.remove();
      }
    }

    // Set canonical URL
    setLink('canonical', canonical);

    // Open Graph tags
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:type', ogType, true);
    setMeta('og:url', canonical, true);
    setMeta('og:image', ogImage, true);
    // Always use short brand name for og:site_name (not the full site title)
    setMeta('og:site_name', siteName, true);
    setMeta('og:locale', 'en_US', true);
    if (ogImage) {
      setMeta('og:image:secure_url', ogImage, true);
      setMeta('og:image:alt', title || '', true);
    }

    // Twitter Card tags
    setMeta('twitter:card', ogImage ? 'summary_large_image' : 'summary');
    setMeta('twitter:site', '@techaborad');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', ogImage);
    if (ogImage) {
      setMeta('twitter:image:alt', title || '');
    }

    // Article-specific meta tags
    if (article && ogType === 'article') {
      setMeta('article:published_time', article.publishedTime, true);
      setMeta('article:modified_time', article.modifiedTime, true);
      setMeta('article:author', article.author, true);
      setMeta('article:section', article.section, true);
      article.tags?.forEach((tag, index) => {
        setMeta(`article:tag:${index}`, tag, true);
      });
    }

    // Cleanup function
    return () => {
      // Reset title on unmount
      document.title = siteName;
    };
  }, [title, description, canonical, noindex, ogImage, ogType, keywords, hreflang, article, siteName]);

  return null; // This component doesn't render anything
}

export default SEO;
