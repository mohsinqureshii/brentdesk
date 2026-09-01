import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { publication } from "@shared/publication";

export default function About() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={`About ${publication.name} - ${publication.tagline}`}
        description={publication.description}
        canonical={`${publication.siteUrl}/about`}
        keywords={publication.keywords}
        ogType="website"
      />
      <Header />

      <main className="w-full">
        {/* Hero Section */}
        <section className="py-16 md:py-20 border-b border-border">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
              About {publication.name}
            </h1>

            <div className="prose prose-lg max-w-none space-y-6">
              <p className="text-lg text-muted-foreground leading-relaxed">
                {publication.name} covers the physical economy — the industries that design, build, power, move and maintain the world around us. Our reporting spans construction, infrastructure, energy, oil &amp; gas, utilities, manufacturing, logistics, transportation, aviation, ports, rail, mining, metals, chemicals, real estate development, data centers and industrial technology.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our coverage starts in Saudi Arabia, extends across the GCC and the wider MENA region, and follows the projects, companies and capital flows that connect those markets to the rest of the world. That priority order — Saudi Arabia, then the GCC, then MENA, then global — shapes what we cover first and in what depth.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {publication.name} is written for the people who work in these industries: contractors, developers, engineers, operators, procurement teams, financiers and policymakers. We assume our readers know their sectors, and we aim to tell them something they can use.
              </p>
            </div>
          </div>
        </section>

        {/* Our Mission */}
        <section id="mission" className="py-12 md:py-16 border-b border-border scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Our Mission</h2>
            <div className="space-y-5">
              <p className="text-muted-foreground leading-relaxed">
                The industrial economy is reported in fragments — a contract award here, an executive appointment there, a project milestone buried in a quarterly filing. {publication.name} exists to bring that reporting together into structured, connected coverage: news, the companies behind it, the people who lead them, the projects they deliver, the events where the industry meets, and the jobs it creates.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                When we report on a project, we link it to the owners, contractors and consultants delivering it. When we cover an appointment, we connect it to the company's track record. The goal is a body of coverage that compounds — where each story adds context to the ones around it.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our editorial decisions are driven by what matters to people working in these sectors, not by press-release volume or publicity cycles. We would rather publish one story that changes how a reader understands a market than ten that restate an announcement.
              </p>
            </div>
          </div>
        </section>

        {/* What We Cover */}
        <section className="py-12 md:py-16 border-b border-border bg-muted/30">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">What We Cover</h2>
            <div className="space-y-5">
              <p className="text-muted-foreground leading-relaxed">
                We report on contract awards, tenders and project milestones across construction and infrastructure; upstream, midstream and downstream developments in oil &amp; gas; power generation, transmission and renewables; and the manufacturing, logistics, transportation and mining activity that underpins regional economies. We also track the real estate developments, data centers and industrial technology reshaping how these sectors operate.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Alongside daily news, we maintain structured coverage of the companies active in these markets — contractors, developers, operators, suppliers and financiers — and the executives and engineers who lead them. Our project coverage follows major programs from announcement through award, construction and delivery.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We round this out with listings of industry events and conferences across the region, and job openings from the sectors we cover — so that {publication.name} serves as a working reference for the industry, not just a news feed.
              </p>
            </div>
          </div>
        </section>

        {/* Editorial Values / Editorial Policy / Ethics */}
        <section id="editorial-policy" className="py-12 md:py-16 border-b border-border scroll-mt-24">
          <span id="ethics" className="block -mt-24 pt-24" aria-hidden="true" />
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Editorial Policy &amp; Ethics</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              These are the standards every member of the {publication.name} editorial team is expected to uphold.
              They govern how we source, verify, write, and correct every story we publish.
            </p>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Independence</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Editorial decisions are made independently of our business relationships. Advertising and sponsorship never determine what we cover or how we cover it. Sponsored and branded content is always clearly labelled and produced separately from news coverage.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Accuracy</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We verify reporting before publication, and contract values, project scopes and timelines are checked against primary sources wherever possible. When we get something wrong, we correct it promptly and say so — accuracy is the basis of any claim to be a publication of record.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Depth</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We do not just report what happened — we explain what it means for the market. Our readers are professionals who deserve context: how a contract fits a program, how a policy changes a sector's economics, how an appointment signals a company's direction.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Fairness</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We give the subjects of our reporting a fair opportunity to respond. We present multiple perspectives on contested issues, distinguish clearly between news and analysis, and apply the same standard of rigor to every company we cover, regardless of its size or commercial relationship with us.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Corrections Policy */}
        <section id="corrections" className="py-12 md:py-16 border-b border-border bg-muted/30 scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Corrections Policy</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We correct factual errors promptly and transparently. When a story is updated to fix a mistake,
              we add a clearly labelled correction note at the bottom of the article describing what was wrong
              and what we changed. Substantive corrections are also flagged at the top of the story.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Spotted an error? Email{" "}
              <a href={`mailto:${publication.emails.hello}`} className="text-blue-600 hover:underline">
                {publication.emails.hello}
              </a>{" "}
              or use our <Link href="/contact" className="text-blue-600 hover:underline">contact form</Link>.
              We aim to respond to all correction requests within one business day.
            </p>
          </div>
        </section>

        {/* Verification & Fact-Checking */}
        <section id="fact-checking" className="py-12 md:py-16 border-b border-border scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Verification &amp; Fact-Checking</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Every story published on {publication.name} is checked against primary sources before it goes live.
              For contract awards and project announcements we rely on official statements, tender documents,
              regulatory filings or confirmation from the parties involved. For market data we cite the original
              report. For quotes we retain the original audio or written record.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Senior editors review investigative pieces and any story that names individuals in a
              critical context. Where a claim cannot be verified to our standard, we either delay
              publication, attribute it to a single named source, or omit it.
            </p>
          </div>
        </section>

        {/* Sources Policy */}
        <section id="sources" className="py-12 md:py-16 border-b border-border bg-muted/30 scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Use of Anonymous Sources</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We prefer named, on-the-record sources. We will grant anonymity only when (a) the information
              is materially in the public interest, (b) the source has direct knowledge, and (c) the source
              would face professional or personal harm by being named.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              When we use an anonymous source, the reporter and at least one editor verify the source's
              identity and assess their motivation. We describe the source's relationship to the story
              with as much specificity as anonymity allows.
            </p>
          </div>
        </section>

        {/* Diversity Policy */}
        <section id="diversity" className="py-12 md:py-16 border-b border-border scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Diversity &amp; Representation</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The industrial economy is built by people from every country, background, and discipline.
              Our reporting aims to reflect that — in the sources we quote, the leaders we profile, and the
              stories we pursue beyond the region's largest hubs and best-known companies.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our editorial hiring is open to qualified candidates regardless of nationality,
              gender, religion, or background.
            </p>
          </div>
        </section>

        {/* Ownership & Funding */}
        <section id="ownership" className="py-12 md:py-16 border-b border-border bg-muted/30 scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Ownership &amp; Funding</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {publication.name} is operated by {publication.legalName}. The publication is funded by
              advertising, sponsorship, and partnership revenue. No advertiser, sponsor, or partner
              has any role in editorial decisions or pre-publication review of stories.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              When a story involves a company that is also a commercial partner of {publication.name}, we
              disclose the relationship in the article.
            </p>
          </div>
        </section>

        {/* Events */}
        <section className="py-12 md:py-16 border-b border-border bg-muted/30">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Events</h2>
            <div className="space-y-5">
              <p className="text-muted-foreground leading-relaxed">
                {publication.name} maintains a calendar of the conferences, exhibitions and industry gatherings
                that matter to the sectors we cover — from energy and construction summits in Riyadh and the GCC
                to logistics, mining and manufacturing events across MENA and beyond.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Where our team attends or covers an event, that coverage follows the same editorial standards as
                the rest of the publication. Event organizers can reach us via the{" "}
                <Link href="/contact" className="text-blue-600 hover:underline">contact page</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Get in Touch</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Have a story tip, a correction, a partnership inquiry, or feedback about our coverage? Visit our contact page or reach out directly by email.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contact">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Us
                </Button>
              </Link>
              <Link href="/advertise">
                <Button variant="outline" className="gap-2">
                  Advertise With Us
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
