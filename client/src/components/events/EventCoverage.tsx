/**
 * "Press & coverage" — editor-curated links and uploaded assets for an
 * event (events.getCoverage).
 *
 * External links open in a new tab and carry an external-link affordance;
 * rows flagged `isUploaded` are files we host ourselves (decks, photo
 * packs, press kits) and get a download affordance instead.
 */

import {
  Newspaper,
  PlayCircle,
  Images,
  FileText,
  Megaphone,
  MessageCircle,
  Link2,
  ExternalLink,
  Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { publication } from "@shared/publication";
import type { UiKey } from "@shared/uiStrings";
import { trpc } from "@/lib/trpc";
import { useT } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "./eventFormat";

type CoverageType =
  | "article"
  | "video"
  | "photos"
  | "report"
  | "press_release"
  | "social"
  | "other";

export type CoverageItem = {
  id: number;
  title: string;
  url: string;
  coverageType: CoverageType | string;
  sourceName: string | null;
  imageUrl: string | null;
  isUploaded: boolean;
  publishedAt: string | null;
  sortOrder?: number | null;
};

const TYPE_META: Record<string, { icon: LucideIcon; label: UiKey; tone: string }> = {
  article: { icon: Newspaper, label: "events.coverageArticle", tone: "text-blue-600 dark:text-blue-400" },
  video: { icon: PlayCircle, label: "events.coverageVideo", tone: "text-red-600 dark:text-red-400" },
  photos: { icon: Images, label: "events.photos", tone: "text-violet-600 dark:text-violet-400" },
  report: { icon: FileText, label: "events.coverageReport", tone: "text-primary" },
  press_release: {
    icon: Megaphone,
    label: "events.coveragePressRelease",
    tone: "text-amber-600 dark:text-amber-400",
  },
  social: {
    icon: MessageCircle,
    label: "events.coverageSocial",
    tone: "text-sky-600 dark:text-sky-400",
  },
  other: { icon: Link2, label: "events.coverageLink", tone: "text-muted-foreground" },
};

function CoverageCard({ item }: { item: CoverageItem }) {
  const t = useT();
  const meta = TYPE_META[item.coverageType] || TYPE_META.other;
  const Icon = meta.icon;
  const ActionIcon = item.isUploaded ? Download : ExternalLink;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      {...(item.isUploaded ? { download: true } : {})}
      className="group block h-full"
    >
      <Card className="h-full overflow-hidden transition group-hover:border-primary/40 group-hover:shadow-sm">
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40">
              <Icon className={`h-9 w-9 ${meta.tone}`} />
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
            <Icon className={`h-3.5 w-3.5 ${meta.tone}`} />
            <span className={meta.tone}>{t(meta.label)}</span>
            {item.isUploaded && (
              <span className="text-muted-foreground">
                · {t("events.publicationAsset", { site: publication.name })}
              </span>
            )}
          </div>
          <h3 className="flex items-start gap-1.5 font-semibold leading-snug">
            <span className="min-w-0 flex-1">{item.title}</span>
            <ActionIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-primary" />
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {item.sourceName && (
              <span className="font-medium text-foreground/70">
                {item.sourceName}
              </span>
            )}
            {item.sourceName && item.publishedAt && <span>·</span>}
            {item.publishedAt && <span>{formatDate(item.publishedAt)}</span>}
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

export default function EventCoverage({
  eventId,
  title,
}: {
  eventId: number;
  title?: string | null;
}) {
  const t = useT();
  const heading = title === undefined ? t("events.pressAndCoverage") : title;
  const { data = [], isLoading } = trpc.events.getCoverage.useQuery(
    { eventId },
    { enabled: !!eventId },
  );

  if (isLoading) {
    return (
      <section className="space-y-3">
        <Skeleton className="h-6 w-44" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  const items = data as unknown as CoverageItem[];
  if (items.length === 0) return null;

  return (
    <section id="press-coverage" className="scroll-mt-24">
      {heading && (
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Newspaper className="h-5 w-5 text-primary" />
          {heading}
        </h2>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <CoverageCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
