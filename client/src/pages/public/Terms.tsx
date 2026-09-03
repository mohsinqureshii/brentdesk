import { useEffect } from "react";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { publication } from "@shared/publication";
import { useT } from "@/lib/i18n";

interface Section {
  title: string;
  body: React.ReactNode;
}

export default function Terms() {
  const t = useT();
  useEffect(() => {
    document.title = `Terms of Service | ${publication.name}`;
  }, []);

  const placeholder = (
    <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-400 mb-2">
      {t("legal.placeholderNotice")}
    </p>
  );

  const sections: Section[] = [
    {
      title: t("terms.acceptanceTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("terms.acceptance1", { domain: publication.domain, legalName: publication.legalName })}
          </p>
        </>
      ),
    },
    {
      title: t("terms.descriptionTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("terms.description1", { site: publication.name })}
          </p>
        </>
      ),
    },
    {
      title: t("terms.accountsTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("terms.accounts1")}
          </p>
        </>
      ),
    },
    {
      title: t("terms.acceptableUseTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("terms.acceptableUse1")}
          </p>
        </>
      ),
    },
    {
      title: t("terms.ipTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("terms.ip1", { legalName: publication.legalName })}
          </p>
        </>
      ),
    },
    {
      title: t("terms.editorialTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("terms.editorial1")}
          </p>
        </>
      ),
    },
    {
      title: t("terms.privacyTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("terms.privacy1")}{" "}
            <Link href="/privacy" className="text-primary underline hover:no-underline">
              {t("footer.privacyPolicy")}
            </Link>
            {t("terms.privacy2")}
          </p>
        </>
      ),
    },
    {
      title: t("terms.disclaimersTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("terms.disclaimers1")}
          </p>
        </>
      ),
    },
    {
      title: t("terms.liabilityTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("terms.liability1", { legalName: publication.legalName })}
          </p>
        </>
      ),
    },
    {
      title: t("terms.terminationTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("terms.termination1")}
          </p>
        </>
      ),
    },
    {
      title: t("terms.governingLawTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("terms.governingLaw1", { legalName: publication.legalName })}
          </p>
        </>
      ),
    },
    {
      title: t("terms.changesTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("terms.changes1")}
          </p>
        </>
      ),
    },
    {
      title: t("terms.contactTitle"),
      body: (
        <>
          {placeholder}
          <p>
            {t("terms.contact1")}{" "}
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
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      <section className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              {t("footer.termsOfService")}
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
              {t("terms.lead", { site: publication.name, legalName: publication.legalName })}
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
