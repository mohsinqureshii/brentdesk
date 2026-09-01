import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

/**
 * Market ticker strip under the header: LATEST headline on the left,
 * commodity/index quotes on the right. Quotes come from the stocks
 * service (live when a data provider is configured) and fall back to a
 * clearly-static reference set so the layout never collapses.
 */

interface TickerQuote {
  label: string;
  price: string;
  changePercent: number;
}

// Static fallback — representative figures shown only when no live quote
// source is configured. Labels match the live symbol set.
const FALLBACK_QUOTES: TickerQuote[] = [
  { label: "BRENT", price: "82.15", changePercent: 0.89 },
  { label: "WTI", price: "78.93", changePercent: 1.02 },
  { label: "NAT GAS", price: "2.18", changePercent: -0.45 },
  { label: "DOW", price: "38,045", changePercent: -0.27 },
  { label: "S&P 500", price: "5,412", changePercent: 0.31 },
  { label: "USD/SAR", price: "3.75", changePercent: 0.0 },
];

const SYMBOL_LABELS: Record<string, string> = {
  "BZ=F": "BRENT",
  "CL=F": "WTI",
  "NG=F": "NAT GAS",
  "^DJI": "DOW",
  "^GSPC": "S&P 500",
  "SAR=X": "USD/SAR",
};

function QuoteItem({ quote }: { quote: TickerQuote }) {
  const dir = quote.changePercent > 0 ? "up" : quote.changePercent < 0 ? "down" : "flat";
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-[11px] font-bold tracking-wide text-white/60">{quote.label}</span>
      <span className="text-xs font-semibold text-white">{quote.price}</span>
      <span
        className={`text-[11px] font-semibold ${
          dir === "up" ? "bd-quote-up" : dir === "down" ? "bd-quote-down" : "text-white/50"
        }`}
      >
        {quote.changePercent > 0 ? "+" : ""}
        {quote.changePercent.toFixed(2)}%
      </span>
    </span>
  );
}

export function MarketTicker({ headline, headlineHref }: { headline?: string; headlineHref?: string }) {
  const { data: liveQuotes } = trpc.stocks.getQuotes.useQuery(
    { categoryId: "markets" },
    { staleTime: 5 * 60 * 1000, retry: false },
  );

  const quotes: TickerQuote[] =
    liveQuotes && liveQuotes.length > 0
      ? liveQuotes.map((q) => ({
          label: SYMBOL_LABELS[q.symbol] ?? q.symbol,
          price: q.price >= 1000 ? Math.round(q.price).toLocaleString("en-US") : q.price.toFixed(2),
          changePercent: q.changePercent,
        }))
      : FALLBACK_QUOTES;

  return (
    <div className="bd-ink border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center gap-4 overflow-hidden">
        {headline && (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="bg-white text-black text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-sm shrink-0">
              Latest
            </span>
            {headlineHref ? (
              <Link href={headlineHref} className="text-xs text-white/85 hover:text-white truncate">
                {headline}
              </Link>
            ) : (
              <span className="text-xs text-white/85 truncate">{headline}</span>
            )}
          </div>
        )}
        <div className={`flex items-center gap-5 overflow-x-auto scrollbar-hide ${headline ? "shrink-0 max-w-[60%]" : "flex-1"}`}>
          {quotes.map((q) => (
            <QuoteItem key={q.label} quote={q} />
          ))}
        </div>
      </div>
    </div>
  );
}
