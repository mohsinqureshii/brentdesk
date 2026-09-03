import { useEffect } from "react";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { triggerCookiePreferences } from "@/components/CookieConsentBanner";
import { publication } from "@shared/publication";
import { useT } from "@/lib/i18n";

interface Section {
  title: string;
  body: React.ReactNode;
}

export default function Privacy() {
  const t = useT();
  useEffect(() => {
    document.title = `Privacy Policy | ${publication.name}`;
  }, []);

  const placeholder = (
    <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-400 mb-2">
      {t("legal.placeholderNotice")}
    </p>
  );

  const sections: Section[] = [
    {
      title: t("privacy.collectTitle"),
      body: (
        <>
          {placeholder}
          <p>{t("privacy.collectIntro")}</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>{t("privacy.collectAccountLabel")}</strong> {t("privacy.collectAccount")}
            </li>
            <li>
              <strong>{t("privacy.collectNewsletterLabel")}</strong> {t("privacy.collectNewsletter")}
            </li>
            <li>
              <strong>{t("privacy.collectFormsLabel")}</strong> {t("privacy.collectForms")}
            </li>
            <li>
              <strong>{t("privacy.collectUsageLabel")}</strong> {t("privacy.collectUsage")}
            </li>
          </ul>
        </>
      ),
    },
    {
      title: t("privacy.useTitle"),
      body: (
        <>
          {placeholder}
          <p>{t("privacy.useIntro")}</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>{t("privacy.useDeliver")}</li>
            <li>{t("privacy.useRespond")}</li>
            <li>{t("privacy.useOperate")}</li>
            <li>{t("privacy.useCommunicate")}</li>
            <li>{t("privacy.useAdvertising")}</li>
          </ul>
        </>
      ),
    },
    {
      title: t("privacy.sharingTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("privacy.sharing1")}
          </p>
          <p>
            {t("privacy.sharing2")}
          </p>
        </>
      ),
    },
    {
      title: t("privacy.retentionTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("privacy.retention1")}
          </p>
        </>
      ),
    },
    {
      title: t("privacy.rightsTitle"),
      body: (
        <>
          {placeholder}
          <p>{t("privacy.rightsIntro")}</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>{t("privacy.rightAccess")}</strong> &mdash; {t("privacy.rightAccessBody")}
            </li>
            <li>
              <strong>{t("privacy.rightErasure")}</strong> &mdash; {t("privacy.rightErasureBody")}
            </li>
            <li>
              <strong>{t("privacy.rightPortability")}</strong> &mdash; {t("privacy.rightPortabilityBody")}
            </li>
            <li>
              <strong>{t("privacy.rightRectification")}</strong> &mdash; {t("privacy.rightRectificationBody")}
            </li>
          </ul>
          <p>
            {t("privacy.rightsContact")}{" "}
            <a
              href={`mailto:${publication.emails.hello}`}
              className="text-primary underline hover:no-underline"
            >
              {publication.emails.hello}
            </a>
            . {t("privacy.rightsUnsubscribe")}
          </p>
        </>
      ),
    },
    {
      title: t("privacy.cookiesTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("privacy.cookies1")}{" "}
            <button
              type="button"
              onClick={triggerCookiePreferences}
              className="text-primary underline hover:no-underline"
            >
              {t("privacy.cookiePreferences")}
            </button>
            .
          </p>
        </>
      ),
    },
    {
      title: t("privacy.transfersTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("privacy.transfers1")}
          </p>
        </>
      ),
    },
    {
      title: t("privacy.childrenTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("privacy.children1")}
          </p>
        </>
      ),
    },
    {
      title: t("privacy.contactTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("privacy.contact1")}{" "}
            <a
              href={`mailto:${publication.emails.hello}`}
              className="text-primary underline hover:no-underline"
            >
              {publication.emails.hello}
            </a>
            .
          </p>
        </>
      ),
    },
    {
      title: t("privacy.updatesTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("privacy.updates1")}
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      <section className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              {t("footer.privacyPolicy")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("common.lastUpdated")}: June 18, 2026
            </p>
          </header>

          <div
            role="alert"
            className="mb-10 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-200"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">
                  {t("legal.reviewRequired")}
                </p>
                <p className="mt-1 text-yellow-800 dark:text-yellow-300">
                  {t("legal.reviewRequiredBody")}
                </p>
              </div>
            </div>
          </div>

          <article className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="lead">
              {t("privacy.lead", {
                legalName: publication.legalName,
                site: publication.name,
                domain: publication.domain,
              })}{" "}
              <Link href="/terms" className="text-primary underline hover:no-underline">
                {t("footer.termsOfService")}
              </Link>
              .
            </p>

            {sections.map((section) => (
              <section key={section.title} className="mt-8">
                <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
                <div className="text-muted-foreground">{section.body}</div>
              </section>
            ))}
          </article>
        </div>
      </section>

      <Footer />
    </div>
  );
}
