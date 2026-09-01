import { useEffect } from "react";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { publication } from "@shared/publication";

interface Section {
  title: string;
  body: React.ReactNode;
}

export default function Terms() {
  useEffect(() => {
    document.title = `Terms of Service | ${publication.name}`;
  }, []);

  const placeholder = (
    <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-400 mb-2">
      Placeholder &mdash; to be reviewed by legal counsel
    </p>
  );

  const sections: Section[] = [
    {
      title: "1. Acceptance of Terms",
      body: (
        <>
          {placeholder}
          <p>
            By accessing {publication.domain} or otherwise using the services provided by{" "}
            {publication.legalName} (the &ldquo;Service&rdquo;), you agree to be bound by these
            Terms of Service and any policies referenced here. If you do not agree, you must not
            use the Service.
          </p>
        </>
      ),
    },
    {
      title: "2. Description of Service",
      body: (
        <>
          {placeholder}
          <p>
            {publication.name} is an online publication covering the industrial economy —
            construction, infrastructure, energy, manufacturing, logistics, and related sectors.
            The Service includes news and analysis, company and people coverage, project tracking,
            event listings, job listings, and email newsletters. Features may change over time as
            the Service evolves.
          </p>
        </>
      ),
    },
    {
      title: "3. User Accounts",
      body: (
        <>
          {placeholder}
          <p>
            Some features may require an account or newsletter subscription. You are responsible
            for the accuracy of the information you provide and for keeping your credentials
            secure. You must notify us promptly of any unauthorized access to your account.
          </p>
        </>
      ),
    },
    {
      title: "4. Acceptable Use",
      body: (
        <>
          {placeholder}
          <p>
            You agree not to misuse the Service. Examples of prohibited activity include
            scraping or republishing our content without permission, posting unlawful or
            infringing content, harassing other users, attempting to gain unauthorized access,
            or interfering with the Service&apos;s operation.
          </p>
        </>
      ),
    },
    {
      title: "5. Intellectual Property",
      body: (
        <>
          {placeholder}
          <p>
            {publication.legalName} and its licensors retain all rights in the Service, including
            its software, branding, and editorial content. You retain ownership of content you
            submit, and grant {publication.legalName} a license to host, process, and display it
            for the purpose of providing the Service.
          </p>
        </>
      ),
    },
    {
      title: "6. Editorial Content",
      body: (
        <>
          {placeholder}
          <p>
            Content published on the Service is provided for general information only. It does not
            constitute professional, financial, investment, or legal advice, and should not be
            relied upon as the basis for any commercial decision. Sponsored and branded content is
            clearly labelled as such.
          </p>
        </>
      ),
    },
    {
      title: "7. Privacy",
      body: (
        <>
          {placeholder}
          <p>
            Your use of the Service is also governed by our{" "}
            <Link href="/privacy" className="text-primary underline hover:no-underline">
              Privacy Policy
            </Link>
            , which explains how we collect, use, and share information.
          </p>
        </>
      ),
    },
    {
      title: "8. Disclaimers",
      body: (
        <>
          {placeholder}
          <p>
            The Service is provided &ldquo;as is&rdquo; without warranties of any kind, express
            or implied, to the maximum extent permitted by applicable law.
          </p>
        </>
      ),
    },
    {
      title: "9. Limitation of Liability",
      body: (
        <>
          {placeholder}
          <p>
            To the fullest extent permitted by law, {publication.legalName} will not be liable for
            indirect, incidental, special, consequential, or punitive damages arising out of or
            relating to your use of the Service.
          </p>
        </>
      ),
    },
    {
      title: "10. Termination",
      body: (
        <>
          {placeholder}
          <p>
            We may suspend or terminate your access to the Service if you violate these Terms or
            if continued provision of the Service is not reasonably practical. You may close your
            account or unsubscribe from our newsletters at any time.
          </p>
        </>
      ),
    },
    {
      title: "11. Governing Law",
      body: (
        <>
          {placeholder}
          <p>
            These Terms are governed by applicable law in the jurisdiction in which{" "}
            {publication.legalName} is established, without regard to conflict of law principles.
            Specific venue and jurisdiction will be confirmed in the final version of these Terms.
          </p>
        </>
      ),
    },
    {
      title: "12. Changes to Terms",
      body: (
        <>
          {placeholder}
          <p>
            We may update these Terms from time to time. We will post the updated version on this
            page and, where appropriate, notify you. Your continued use of the Service after
            changes take effect constitutes acceptance of the revised Terms.
          </p>
        </>
      ),
    },
    {
      title: "13. Contact",
      body: (
        <>
          {placeholder}
          <p>
            Questions about these Terms can be sent to{" "}
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
              Terms of Service
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
              These Terms of Service govern your access to and use of {publication.name}, operated
              by {publication.legalName}. Please read them carefully.
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
