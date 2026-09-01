/**
 * Sponsor wall, grouped by tier.
 *
 * Tiles get progressively smaller from platinum down to partner. Logos
 * always sit on white (sponsor artwork is overwhelmingly dark-on-
 * transparent, so a themed background wrecks half of them) with a
 * name-text fallback when the row has no logo.
 *
 * Linking priority: linked company/investor profile → external website →
 * nothing (a plain, non-interactive tile).
 */

import { Link } from "wouter";
import { Award } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

export type EventSponsor = {
  id: number;
  name: string | null;
  logo: string | null;
  websiteUrl: string | null;
  tier: string | null;
  description?: string | null;
  isConfirmed?: boolean;
  companyId?: number | null;
  investorId?: number | null;
  companySlug?: string | null;
  investorSlug?: string | null;
  sortOrder?: number | null;
};

type TierKey = "platinum" | "gold" | "silver" | "bronze" | "partner";

const TIERS: Array<{
  key: TierKey;
  label: string;
  /** Tailwind grid + tile-height pair, largest tier first. */
  grid: string;
  tile: string;
  logo: string;
  name: string;
  accent: string;
}> = [
  {
    key: "platinum",
    label: "Platinum",
    grid: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    tile: "h-32",
    logo: "max-h-20",
    name: "text-lg",
    accent: "text-slate-500 dark:text-slate-300",
  },
  {
    key: "gold",
    label: "Gold",
    grid: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    tile: "h-28",
    logo: "max-h-16",
    name: "text-base",
    accent: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "silver",
    label: "Silver",
    grid: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5",
    tile: "h-24",
    logo: "max-h-14",
    name: "text-sm",
    accent: "text-slate-500 dark:text-slate-400",
  },
  {
    key: "bronze",
    label: "Bronze",
    grid: "grid-cols-3 sm:grid-cols-5 lg:grid-cols-6",
    tile: "h-20",
    logo: "max-h-12",
    name: "text-xs",
    accent: "text-orange-700 dark:text-orange-400",
  },
  {
    key: "partner",
    label: "Partners",
    grid: "grid-cols-3 sm:grid-cols-6 lg:grid-cols-8",
    tile: "h-16",
    logo: "max-h-10",
    name: "text-[11px]",
    accent: "text-muted-foreground",
  },
];

function internalHref(s: EventSponsor): string | null {
  if (s.companySlug) return `/companies/${s.companySlug}`;
  if (s.investorSlug) return `/investors/${s.investorSlug}`;
  return null;
}

function SponsorTile({
  sponsor,
  tile,
  logo,
  name,
}: {
  sponsor: EventSponsor;
  tile: string;
  logo: string;
  name: string;
}) {
  const label = sponsor.name || "Sponsor";
  const body = (
    <div
      className={`flex ${tile} w-full items-center justify-center rounded-xl border bg-white p-4 transition group-hover:border-primary/40 group-hover:shadow-sm`}
      title={label}
    >
      {sponsor.logo ? (
        <img
          src={sponsor.logo}
          alt={label}
          className={`${logo} max-w-full object-contain`}
          loading="lazy"
        />
      ) : (
        <span
          className={`${name} px-1 text-center font-semibold leading-tight text-slate-800`}
        >
          {label}
        </span>
      )}
    </div>
  );

  const href = internalHref(sponsor);
  if (href) {
    return (
      <Link href={href} className="group block">
        {body}
      </Link>
    );
  }
  if (sponsor.websiteUrl) {
    return (
      <a
        href={sponsor.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        {body}
      </a>
    );
  }
  return <div className="group block">{body}</div>;
}

/** Pure presentational tier grid — no fetching, no section heading. */
export function SponsorTierGrid({ sponsors }: { sponsors: EventSponsor[] }) {
  if (!sponsors || sponsors.length === 0) return null;

  const known = new Set(TIERS.map((t) => t.key as string));
  const groups = TIERS.map((tier) => ({
    ...tier,
    items: sponsors.filter((s) =>
      tier.key === "partner"
        ? !s.tier || !known.has(s.tier) || s.tier === "partner"
        : s.tier === tier.key,
    ),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.key}>
          <div
            className={`mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] ${g.accent}`}
          >
            <span className="h-px w-4 bg-current opacity-40" aria-hidden="true" />
            {g.label}
          </div>
          <div className={`grid gap-3 ${g.grid}`}>
            {g.items.map((s) => (
              <SponsorTile
                key={s.id}
                sponsor={s}
                tile={g.tile}
                logo={g.logo}
                name={g.name}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EventSponsors({
  eventId,
  title = "Sponsors & partners",
}: {
  eventId: number;
  title?: string | null;
}) {
  const { data = [], isLoading } = trpc.events.getSponsors.useQuery(
    { eventId },
    { enabled: !!eventId },
  );

  if (isLoading) {
    return (
      <section className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  const sponsors = data as unknown as EventSponsor[];
  if (sponsors.length === 0) return null;

  return (
    <section id="sponsors" className="scroll-mt-24">
      {title && (
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Award className="h-5 w-5 text-primary" />
          {title}
        </h2>
      )}
      <SponsorTierGrid sponsors={sponsors} />
    </section>
  );
}
