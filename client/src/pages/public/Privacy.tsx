import { useEffect } from "react";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { triggerCookiePreferences } from "@/components/CookieConsentBanner";
import { publication } from "@shared/publication";

interface Section {
  title: string;
  body: React.ReactNode;
}

export default function Privacy() {
  useEffect(() => {
    document.title = `Privacy Policy | ${publication.name}`;
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
              <strong>Account information:</strong> name, email, password hash, and basic profile
              fields you provide if you register for an account.
            </li>
            <li>
              <strong>Newsletter subscription details:</strong> your email address, the newsletters
              you select, and your consent preferences.
            </li>
            <li>
              <strong>Form submissions:</strong> information you send us through our contact and
              advertising inquiry forms, such as your name, email, company, and message.
            </li>
            <li>
              <strong>Usage data:</strong> device and browser information, pages visited, and
              similar analytics data collected through cookies and comparable technologies.
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
            <li>Deliver the newsletters and briefings you subscribe to.</li>
            <li>Respond to your inquiries, tips, and feedback.</li>
            <li>Operate, secure, and improve the Service, including understanding which coverage our readers find useful.</li>
            <li>Communicate with you about your account and the Service.</li>
            <li>Serve and measure advertising on the site, consistent with your cookie choices.</li>
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
            We share information with service providers who help us run the Service — for example,
            email delivery, hosting and infrastructure, and analytics vendors. These providers
            process data on our behalf and are not permitted to use it for their own purposes.
          </p>
          <p>
            We do not sell personal information. A finalized list of sub-processors with
            contractual commitments will be published prior to launch.
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
            We retain personal data for as long as your account or subscription is active or as
            needed to provide the Service. After account closure or unsubscription, we delete or
            anonymize data within a reasonable period, except where retention is required by law.
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
              you.
            </li>
            <li>
              <strong>Erasure</strong> &mdash; ask us to delete your account, subscription, and
              associated data.
            </li>
            <li>
              <strong>Portability</strong> &mdash; receive your data in a machine-readable format.
            </li>
            <li>
              <strong>Rectification</strong> &mdash; correct inaccurate data via your account or
              by contacting us.
            </li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a
              href={`mailto:${publication.emails.hello}`}
              className="text-primary underline hover:no-underline"
            >
              {publication.emails.hello}
            </a>
            . You can unsubscribe from any newsletter at any time using the link in the email
            footer.
          </p>
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
            (where you opt in) advertising and marketing. You can revisit your choices at any time
            via{" "}
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
            Our readers, and the service providers we rely on, are located in multiple countries.
            Personal data may therefore be processed outside the country in which you live. Where
            personal data is transferred between jurisdictions, we rely on appropriate safeguards
            such as standard contractual clauses or equivalent mechanisms recognized under
            applicable law.
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
              This Privacy Policy explains how {publication.legalName} (&ldquo;{publication.name}&rdquo;)
              collects, uses, and shares information when you use {publication.domain} and the
              services we provide through it (the &ldquo;Service&rdquo;). It applies to readers,
              newsletter subscribers, and visitors. Your use of the Service is also governed by
              our{" "}
              <Link href="/terms" className="text-primary underline hover:no-underline">
                Terms of Service
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
