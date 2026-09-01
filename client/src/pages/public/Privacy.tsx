import { useEffect } from "react";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { triggerCookiePreferences } from "@/components/CookieConsentBanner";

interface Section {
  title: string;
  body: React.ReactNode;
}

export default function Privacy() {
  useEffect(() => {
    document.title = "Privacy Policy | TechScoop";
  }, []);

  const placeholder = (
    <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-400 mb-2">
      Placeholder &mdash; to be reviewed by legal counsel
    </p>
  );

  const sections: Section[] = [
    {
      title: "1. Information We Collect",
      body: (
        <>
          {placeholder}
          <p>We collect the following categories of information:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Account information:</strong> name, email, password hash, role, and basic
              profile fields you provide at signup.
            </li>
            <li>
              <strong>Candidate profile:</strong> work history, education, skills, locations,
              salary expectations, and other details you add to your profile.
            </li>
            <li>
              <strong>Resume content:</strong> documents you upload and the structured data we
              extract from them.
            </li>
            <li>
              <strong>GitHub data:</strong> public repository metadata, contribution activity,
              and other signals retrieved when you connect a GitHub account.
            </li>
            <li>
              <strong>Assessment results:</strong> responses, scores, and metadata generated when
              you take a TechScoop assessment.
            </li>
            <li>
              <strong>Billing information:</strong> payment method tokens and invoice metadata
              handled through our payment processor.
            </li>
          </ul>
        </>
      ),
    },
    {
      title: "2. How We Use Information",
      body: (
        <>
          {placeholder}
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Match candidates with relevant jobs and recruiters.</li>
            <li>
              Provide recruiters and authorized hiring teams with access to candidate profiles
              consistent with your visibility settings.
            </li>
            <li>
              Process information using AI models &mdash; including large language models &mdash;
              to summarize resumes, extract structured fields, evaluate assessments, and surface
              insights. AI processing is disclosed explicitly here and may involve sub-processors
              listed below.
            </li>
            <li>Operate, secure, and improve the Service.</li>
            <li>Communicate with you about your account and the Service.</li>
          </ul>
        </>
      ),
    },
    {
      title: "3. Data Sharing",
      body: (
        <>
          {placeholder}
          <p>
            We share information with sub-processors who help us run the Service. A current
            placeholder list includes:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>OpenAI &mdash; AI model inference for parsing and matching.</li>
            <li>Stripe &mdash; payment processing.</li>
            <li>AWS &mdash; hosting, storage, and infrastructure.</li>
            <li>Additional analytics, email, and observability vendors (to be finalized).</li>
          </ul>
          <p>
            We do not sell personal information. A finalized sub-processor list with contractual
            commitments will be published prior to launch.
          </p>
        </>
      ),
    },
    {
      title: "4. Data Retention",
      body: (
        <>
          {placeholder}
          <p>
            We retain personal data for as long as your account is active or as needed to provide
            the Service. Tenants (companies using TechScoop) may configure their own retention
            policies for candidate data they control. After account closure or the end of a
            retention window, we delete or anonymize data within a reasonable period, except
            where retention is required by law.
          </p>
        </>
      ),
    },
    {
      title: "5. Your Rights",
      body: (
        <>
          {placeholder}
          <p>Depending on your jurisdiction you may have the following rights:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Access</strong> &mdash; request a copy of the personal data we hold about
              you (DSAR). You will be able to export your data from{" "}
              <Link href="/me/data-export" className="text-primary underline hover:no-underline">
                /me/data-export
              </Link>{" "}
              once that page is available.
            </li>
            <li>
              <strong>Erasure</strong> &mdash; ask us to delete your account and associated data
              from{" "}
              <Link
                href="/me/account-settings"
                className="text-primary underline hover:no-underline"
              >
                /me/account-settings
              </Link>
              .
            </li>
            <li>
              <strong>Portability</strong> &mdash; receive your data in a machine-readable format.
            </li>
            <li>
              <strong>Rectification</strong> &mdash; correct inaccurate data via your profile or
              by contacting us.
            </li>
          </ul>
        </>
      ),
    },
    {
      title: "6. Cookies",
      body: (
        <>
          {placeholder}
          <p>
            We use cookies and similar technologies for essential functionality, analytics, and
            (where you opt in) marketing. You can revisit your choices at any time via{" "}
            <button
              type="button"
              onClick={triggerCookiePreferences}
              className="text-primary underline hover:no-underline"
            >
              cookie preferences
            </button>
            .
          </p>
        </>
      ),
    },
    {
      title: "7. International Transfers",
      body: (
        <>
          {placeholder}
          <p>
            TechScoop operates across multiple data residency regions, including the United
            States (us), the European Union (eu), and the Kingdom of Saudi Arabia (ksa). Where
            personal data is transferred between regions, we rely on appropriate safeguards such
            as standard contractual clauses or equivalent mechanisms recognized in the relevant
            jurisdictions.
          </p>
        </>
      ),
    },
    {
      title: "8. Children's Privacy",
      body: (
        <>
          {placeholder}
          <p>
            The Service is not directed to children under the age required by law in your
            jurisdiction. We do not knowingly collect personal information from children. If you
            believe a child has provided us with personal information, contact us so we can
            remove it.
          </p>
        </>
      ),
    },
    {
      title: "9. Contact",
      body: (
        <>
          {placeholder}
          <p>
            Privacy questions, requests, or complaints can be sent to{" "}
            <a
              href="mailto:privacy@techscoop.com"
              className="text-primary underline hover:no-underline"
            >
              privacy@techscoop.com
            </a>
            .
          </p>
        </>
      ),
    },
    {
      title: "10. Updates to this Policy",
      body: (
        <>
          {placeholder}
          <p>
            We may update this Privacy Policy from time to time. Material changes will be
            announced on this page and, where appropriate, through additional notice. The
            &ldquo;Last updated&rdquo; date above will always reflect the most recent revision.
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
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground">
              Last updated: June 18, 2026
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
                  This is placeholder content. Final legal review required before public launch.
                </p>
                <p className="mt-1 text-yellow-800 dark:text-yellow-300">
                  Nothing on this page is legal advice. Each section is a working draft and will
                  be replaced with counsel-reviewed text prior to launch.
                </p>
              </div>
            </div>
          </div>

          <article className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="lead">
              This Privacy Policy explains how TechScoop collects, uses, and shares information
              when you use our platform. It applies to candidates, recruiters, company users, and
              visitors.
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
