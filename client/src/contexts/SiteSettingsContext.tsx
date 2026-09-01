/**
 * Site Settings Context
 * Provides global access to site configuration settings
 */

import { publication } from "@shared/publication";
import { createContext, useContext, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface SiteSettings {
  site_title: string;
  site_tagline: string;
  site_description: string;
  google_analytics_id: string;
  site_logo: string;
  site_favicon: string;
  contact_email: string;
  timezone: string;
}

interface SiteSettingsContextType {
  settings: SiteSettings;
  isLoading: boolean;
}

const defaultSettings: SiteSettings = {
  site_title: publication.name,
  site_tagline: publication.tagline,
  site_description: publication.description,
  google_analytics_id: "",
  site_logo: "",
  site_favicon: "",
  contact_email: publication.emails.hello,
  timezone: publication.timezone,
};

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: defaultSettings,
  isLoading: true,
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  // Fetch settings from public endpoint
  const { data, isLoading } = trpc.public.siteSettings.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const settings: SiteSettings = {
    site_title: (data?.site_title as string) || defaultSettings.site_title,
    site_tagline: (data?.site_tagline as string) || defaultSettings.site_tagline,
    site_description: (data?.site_description as string) || defaultSettings.site_description,
    google_analytics_id: (data?.google_analytics_id as string) || defaultSettings.google_analytics_id,
    site_logo: (data?.site_logo as string) || defaultSettings.site_logo,
    site_favicon: (data?.site_favicon as string) || defaultSettings.site_favicon,
    contact_email: (data?.contact_email as string) || defaultSettings.contact_email,
    timezone: (data?.timezone as string) || defaultSettings.timezone,
  };

  // Apply site title dynamically
  useEffect(() => {
    if (settings.site_title && !isLoading) {
      // Only update if we're on the homepage or no specific page title is set
      const currentTitle = document.title;
      if (currentTitle.startsWith(`${publication.name} |`) ||
          currentTitle === publication.name) {
        document.title = settings.site_title;
      }
    }
  }, [settings.site_title, isLoading]);

  // Apply favicon dynamically
  useEffect(() => {
    if (settings.site_favicon) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.site_favicon;
    }
  }, [settings.site_favicon]);

  // Apply Google Analytics
  useEffect(() => {
    if (settings.google_analytics_id && !document.querySelector(`script[src*="googletagmanager"]`)) {
      // Load GA4 script
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics_id}`;
      document.head.appendChild(script);

      // Initialize GA4
      const initScript = document.createElement("script");
      initScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${settings.google_analytics_id}');
      `;
      document.head.appendChild(initScript);
    }
  }, [settings.google_analytics_id]);

  return (
    <SiteSettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

export default SiteSettingsContext;
