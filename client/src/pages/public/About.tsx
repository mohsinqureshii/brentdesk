import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function About() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title="About TechScoop - MENA's Leading Tech Publication"
        description="TechScoop gives readers a front-row seat to the future of innovation across the Middle East and North Africa. Learn about our mission, editorial team, and values."
        canonical="https://techscoop.io/about"
        keywords="TechScoop, MENA tech news, Middle East tech publication, startup journalism, tech media MENA"
        ogType="website"
      />
      <Header />
      
      <main className="w-full">
        {/* Hero Section */}
        <section className="py-16 md:py-20 border-b border-border">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
              About TechScoop
            </h1>

            <div className="prose prose-lg max-w-none space-y-6">
              <p className="text-lg text-muted-foreground leading-relaxed">
                TechScoop gives readers a front-row seat to the future of innovation across the Middle East and North Africa. It's where founders, operators, investors, and everyone who is tech-curious come to learn what's next, discover unexpected stories, and glean critical intelligence about the region's rapidly evolving technology landscape.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We're at the forefront of the AI revolution reshaping industries from Riyadh to Cairo, the surge of venture capital flowing into the region, and the rise of homegrown startups competing on the global stage. We bring together individuals across all sectors of technology through our editorial coverage and events, providing the context and depth that the MENA tech ecosystem deserves.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                From tracking the latest funding rounds and acquisitions to profiling the founders building transformative companies, TechScoop has become the essential daily read for anyone who cares about technology and innovation in the Middle East and North Africa. Our coverage spans startups, venture capital, enterprise technology, fintech, AI, and the regulatory landscape shaping the region's digital future.
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
                TechScoop was founded with a simple belief: the MENA region's technology ecosystem deserves world-class journalism. Too often, the stories of founders building remarkable companies in Saudi Arabia, the UAE, Egypt, and beyond go untold — or are told without the nuance and depth they deserve.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We exist to change that. Our editorial team is committed to independent, rigorous reporting that serves the interests of our readers — not press releases, not hype cycles, and not advertiser agendas. When we cover a funding round, we dig into the terms. When we profile a founder, we ask the hard questions. When we analyze a market trend, we bring data and context, not speculation.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We believe that great technology journalism doesn't just report the news — it helps shape the ecosystem by holding companies accountable, surfacing important stories, and connecting the people who are building the future.
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
                Our editorial coverage spans the full breadth of the MENA technology ecosystem. We report on startup funding rounds, from pre-seed to late-stage, and track the investors backing the region's most promising companies. We cover the enterprise technology decisions being made by the region's largest organizations, and the regulatory frameworks being built by governments from Riyadh to Abu Dhabi.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We pay particular attention to the sectors where MENA is emerging as a global leader: fintech and digital payments, AI and machine learning, e-commerce and logistics, cleantech and sustainability, and the digital transformation initiatives reshaping traditional industries. Our reporting extends to the accelerators, incubators, and government programs that are nurturing the next generation of founders.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Beyond daily news, TechScoop produces in-depth features, founder profiles, market analysis, and data-driven reports that provide the context our readers need to make informed decisions — whether they're raising capital, hiring talent, expanding into new markets, or investing in the region's future.
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
              These are the standards every member of the TechScoop editorial team is expected to uphold.
              They govern how we source, verify, write, and correct every story we publish.
            </p>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Independence</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our editorial decisions are made independently of our business relationships. Advertising and sponsorship never influence what we cover or how we cover it. Our readers trust us because they know our reporting is driven by editorial judgment, not commercial interests.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Accuracy</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We verify our reporting rigorously before publication. When we make mistakes — and we're human, so it happens — we correct them promptly and transparently. We believe accuracy is the foundation of trust, and trust is everything in journalism.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Depth</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We don't just report what happened — we explain why it matters. Our readers are sophisticated professionals who deserve analysis, context, and insight alongside the facts. We aim to make every story we publish worth our readers' time.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Fairness</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We give subjects of our reporting a fair opportunity to respond. We present multiple perspectives on complex issues. We distinguish clearly between news reporting and opinion. And we treat every company and founder we cover with the same standard of rigor, regardless of size or influence.
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
              <a href="mailto:corrections@techscoop.io" className="text-emerald-600 hover:underline">
                corrections@techscoop.io
              </a>{" "}
              or use our <Link href="/contact" className="text-emerald-600 hover:underline">contact form</Link>.
              We aim to respond to all correction requests within one business day.
            </p>
          </div>
        </section>

        {/* Verification & Fact-Checking */}
        <section id="fact-checking" className="py-12 md:py-16 border-b border-border scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Verification &amp; Fact-Checking</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Every story published on TechScoop is fact-checked against primary sources before it goes live.
              For funding announcements we verify deal terms with at least two parties or with regulatory filings.
              For market data we cite the original report. For quotes we retain the original audio or written
              record.
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
              The MENA tech ecosystem is built by people from every country, background, and discipline
              in the region. Our reporting reflects that. We actively seek out women founders, underrepresented
              communities, and stories from outside the GCC's largest hubs.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We track the diversity of our sources and panellists and publish an annual review of how we
              are doing. Our editorial hiring is open to qualified candidates regardless of nationality,
              gender, religion, or background.
            </p>
          </div>
        </section>

        {/* Ownership & Funding */}
        <section id="ownership" className="py-12 md:py-16 border-b border-border bg-muted/30 scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Ownership &amp; Funding</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              TechScoop is operated by TechScoop Media. The publication is funded by a combination of
              advertising, sponsored events, and partnership revenue. No advertiser, sponsor, or partner
              has any role in editorial decisions or pre-publication review of stories.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              When a story involves a company that is also a commercial partner of TechScoop, we disclose
              the relationship in the article. For investor and accelerator commercial relationships, the
              same disclosure rule applies.
            </p>
          </div>
        </section>

        {/* Events */}
        <section className="py-12 md:py-16 border-b border-border bg-muted/30">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Events</h2>
            <div className="space-y-5">
              <p className="text-muted-foreground leading-relaxed">
                TechScoop brings the community together through a series of events throughout the year. From intimate founder roundtables to large-scale conferences, our events are designed to foster meaningful connections between the people building MENA's technology future — founders, investors, corporate leaders, and policymakers.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our events feature candid conversations, practical insights, and networking opportunities that you won't find anywhere else. We curate every panel, every speaker, and every session to ensure our attendees walk away with actionable knowledge and valuable relationships.
              </p>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Get in Touch</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Have a story tip, partnership inquiry, or feedback about our coverage? We'd love to hear from you. Visit our contact page or reach out directly to our team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contact">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
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
