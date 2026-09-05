import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { publication } from "@shared/publication";
import { useT } from "@/lib/i18n";

export default function About() {
  const t = useT();
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={`About | ${publication.name}`}
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
              {t("about.title", { site: publication.name })}
            </h1>

            <div className="prose prose-lg max-w-none space-y-6">
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t("about.intro1", { site: publication.name })}
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t("about.intro2")}
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t("about.intro3", { site: publication.name })}
              </p>
            </div>
          </div>
        </section>

        {/* Our Mission */}
        <section id="mission" className="py-12 md:py-16 border-b border-border scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">{t("about.mission")}</h2>
            <div className="space-y-5">
              <p className="text-muted-foreground leading-relaxed">
                {t("about.mission1", { site: publication.name })}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {t("about.mission2")}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {t("about.mission3")}
              </p>
            </div>
          </div>
        </section>

        {/* What We Cover */}
        <section className="py-12 md:py-16 border-b border-border bg-muted/30">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">{t("about.whatWeCover")}</h2>
            <div className="space-y-5">
              <p className="text-muted-foreground leading-relaxed">
                {t("about.cover1")}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {t("about.cover2")}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {t("about.cover3", { site: publication.name })}
              </p>
            </div>
          </div>
        </section>

        {/* Editorial Values / Editorial Policy / Ethics */}
        <section id="editorial-policy" className="py-12 md:py-16 border-b border-border scroll-mt-24">
          <span id="ethics" className="block -mt-24 pt-24" aria-hidden="true" />
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">{t("about.editorialPolicy")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              {t("about.editorialIntro", { site: publication.name })}
            </p>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t("about.independence")}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t("about.independenceBody")}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t("about.accuracy")}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t("about.accuracyBody")}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t("about.depth")}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t("about.depthBody")}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t("about.fairness")}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t("about.fairnessBody")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Corrections Policy */}
        <section id="corrections" className="py-12 md:py-16 border-b border-border bg-muted/30 scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{t("about.correctionsPolicy")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {t("about.correctionsBody")}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {t("about.spottedError")}{" "}
              <a href={`mailto:${publication.emails.hello}`} className="text-blue-600 hover:underline">
                {publication.emails.hello}
              </a>{" "}
              {t("about.orUseOur")} <Link href="/contact" className="text-blue-600 hover:underline">{t("about.contactForm")}</Link>.
              {" "}{t("about.correctionsResponse")}
            </p>
          </div>
        </section>

        {/* Verification & Fact-Checking */}
        <section id="fact-checking" className="py-12 md:py-16 border-b border-border scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{t("about.factChecking")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {t("about.factChecking1", { site: publication.name })}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {t("about.factChecking2")}
            </p>
          </div>
        </section>

        {/* Sources Policy */}
        <section id="sources" className="py-12 md:py-16 border-b border-border bg-muted/30 scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{t("about.anonymousSources")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {t("about.anonymousSources1")}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {t("about.anonymousSources2")}
            </p>
          </div>
        </section>

        {/* Diversity Policy */}
        <section id="diversity" className="py-12 md:py-16 border-b border-border scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{t("about.diversity")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {t("about.diversity1")}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {t("about.diversity2")}
            </p>
          </div>
        </section>

        {/* Ownership & Funding */}
        <section id="ownership" className="py-12 md:py-16 border-b border-border bg-muted/30 scroll-mt-24">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{t("about.ownership")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {t("about.ownership1", { site: publication.name, legalName: publication.legalName })}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {t("about.ownership2", { site: publication.name })}
            </p>
          </div>
        </section>

        {/* Events */}
        <section className="py-12 md:py-16 border-b border-border bg-muted/30">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">{t("nav.events")}</h2>
            <div className="space-y-5">
              <p className="text-muted-foreground leading-relaxed">
                {t("about.events1", { site: publication.name })}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {t("about.events2")}{" "}
                <Link href="/contact" className="text-blue-600 hover:underline">{t("advertise.contactPageLink")}</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{t("about.getInTouch")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              {t("about.getInTouchBody")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contact">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <Mail className="h-4 w-4" />
                  {t("footer.contactUs")}
                </Button>
              </Link>
              <Link href="/advertise">
                <Button variant="outline" className="gap-2">
                  {t("about.advertiseWithUs")}
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
