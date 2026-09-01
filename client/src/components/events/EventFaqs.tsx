/**
 * Event FAQs — shadcn Accordion, answers rendered through the shared
 * sanitiser (they're authored in the admin rich-text editor).
 *
 * Two ways in:
 *   <EventFaqs eventId={id} />         → fetches events.getFaqs itself
 *   <EventFaqs faqs={alreadyFetched} /> → renders a caller-supplied list
 *
 * FAQPage JSON-LD is emitted by the page (EventDetail) so there's only
 * ever one <script type="application/ld+json" id="jsonld-faqpage"> in the
 * document, whichever tab the reader is on.
 */

import { HelpCircle } from "lucide-react";

import { trpc } from "@/lib/trpc";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { RichText } from "./eventFormat";

export type EventFaq = { question: string; answer: string };

/** Bare accordion — no heading, no data fetching. */
export function FaqAccordion({ faqs }: { faqs: EventFaq[] }) {
  if (!faqs || faqs.length === 0) return null;
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((f, i) => (
        <AccordionItem key={i} value={`faq-${i}`}>
          <AccordionTrigger className="text-left text-base font-medium">
            {f.question}
          </AccordionTrigger>
          <AccordionContent>
            <RichText
              html={f.answer}
              className="text-sm text-muted-foreground prose-p:my-2"
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default function EventFaqs({
  eventId,
  faqs: provided,
  title = "Frequently asked questions",
}: {
  eventId?: number;
  faqs?: EventFaq[];
  title?: string | null;
}) {
  const shouldFetch = !provided && !!eventId;
  const { data = [], isLoading } = trpc.events.getFaqs.useQuery(
    { eventId: eventId as number },
    { enabled: shouldFetch },
  );

  const faqs: EventFaq[] =
    provided ??
    (data as any[]).map((f) => ({
      question: String(f.question),
      answer: String(f.answer),
    }));

  if (shouldFetch && isLoading) {
    return (
      <section className="space-y-3">
        <Skeleton className="h-6 w-56" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </section>
    );
  }

  // Never render an empty shell.
  if (faqs.length === 0) return null;

  return (
    <section id="faqs" className="scroll-mt-24">
      {title && (
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <HelpCircle className="h-5 w-5 text-primary" />
          {title}
        </h2>
      )}
      <FaqAccordion faqs={faqs} />
    </section>
  );
}
