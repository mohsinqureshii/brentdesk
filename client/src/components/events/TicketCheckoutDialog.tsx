/**
 * TicketCheckoutDialog
 * ----------------------------------------------------------------------
 * Triggered from the Event Detail page tier cards (and the sticky CTA)
 * for events with ticketProvider='internal'. Collects buyer details,
 * lets them adjust quantities + apply a promo code, then hands off
 * to Stripe Checkout via events.createCheckoutSession.
 *
 * Designed to gracefully degrade when Stripe isn't configured — the
 * server throws "Stripe is not configured" which we surface as an
 * inline error with an admin-contact hint.
 */

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Minus, Plus, Tag, Ticket, AlertCircle } from "lucide-react";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface TicketCheckoutTier {
  id: number;
  name: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  capacity: number | null;
  soldCount: number;
  remaining: number | null;
  soldOut: boolean;
  maxPerOrder: number | null;
}

interface TicketCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  eventSlug: string;
  eventTitle: string;
  tickets: TicketCheckoutTier[];
  /** Optional: tier id to pre-select with quantity 1. */
  initialTicketId?: number;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function formatMoney(cents: number, currency: string): string {
  const value = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      currencyDisplay: "narrowSymbol",
    }).format(value);
  } catch {
    return `${(currency || "USD")} ${value.toFixed(2)}`;
  }
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function TicketCheckoutDialog({
  open,
  onOpenChange,
  eventId,
  eventSlug,
  eventTitle,
  tickets,
  initialTicketId,
}: TicketCheckoutDialogProps) {
  const t = useT();
  const { user } = useAuth();

  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountCents: number;
    totalCents: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset state each time the dialog opens, prefilling from auth + initial tier.
  useEffect(() => {
    if (!open) return;
    setEmail((user as any)?.email || "");
    setName((user as any)?.name || "");
    setPhone("");
    setCompany((user as any)?.company || "");
    setPromoInput("");
    setAppliedPromo(null);
    setPromoError(null);
    setSubmitError(null);
    const initial: Record<string, number> = {};
    if (initialTicketId) initial[initialTicketId] = 1;
    setQuantities(initial as any);
  }, [open, initialTicketId, user]);

  // Derived subtotal (client-side preview; server re-validates).
  const subtotalCents = useMemo(() => {
    let sum = 0;
    for (const tier of tickets) {
      const qty = quantities[tier.id] || 0;
      sum += qty * tier.priceCents;
    }
    return sum;
  }, [quantities, tickets]);

  const currency = tickets[0]?.currency || "USD";
  const totalQty = useMemo(
    () => Object.values(quantities).reduce((a, b) => a + (b || 0), 0),
    [quantities],
  );

  // If user adjusts quantities after applying a promo, invalidate it
  // so the displayed total can't drift from the server-recomputed total.
  useEffect(() => {
    if (appliedPromo) setAppliedPromo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalCents]);

  const discountCents = appliedPromo?.discountCents || 0;
  const totalCents = Math.max(0, subtotalCents - discountCents);

  // ----- Mutations -----

  const applyPromo = trpc.events.applyPromoCode.useMutation({
    onSuccess: (data) => {
      setAppliedPromo({
        code: promoInput.trim(),
        discountCents: data.discountCents,
        totalCents: data.totalCents,
      });
      setPromoError(null);
    },
    onError: (err) => {
      setAppliedPromo(null);
      setPromoError(err.message || t("ticket.promoFailed"));
    },
  });

  const createSession = trpc.events.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setSubmitError(t("ticket.noCheckoutUrl"));
      }
    },
    onError: (err) => {
      setSubmitError(err.message || t("ticket.checkoutFailed"));
    },
  });

  // ----- Handlers -----

  function setQty(tierId: number, qty: number) {
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[tierId];
      else next[tierId] = qty;
      return next;
    });
  }

  function changeQty(tier: TicketCheckoutTier, delta: number) {
    const current = quantities[tier.id] || 0;
    const max = Math.min(
      tier.maxPerOrder ?? 99,
      tier.remaining ?? 99,
    );
    const next = Math.max(0, Math.min(max, current + delta));
    setQty(tier.id, next);
  }

  function handleApplyPromo() {
    const code = promoInput.trim();
    if (!code) {
      setPromoError(t("ticket.enterPromo"));
      return;
    }
    if (subtotalCents <= 0) {
      setPromoError(t("ticket.addTicketFirst"));
      return;
    }
    applyPromo.mutate({ eventId, code, subtotalCents });
  }

  function handleCheckout() {
    setSubmitError(null);
    if (totalQty === 0) {
      setSubmitError(t("ticket.pickTicket"));
      return;
    }
    if (!email.trim()) {
      setSubmitError(t("form.emailRequired"));
      return;
    }
    const items = Object.entries(quantities)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({ ticketId: Number(id), quantity: q }));
    createSession.mutate({
      eventId,
      items,
      customer: {
        email: email.trim(),
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
      },
      promoCode: appliedPromo?.code,
    });
  }

  const isSubmitting = createSession.isPending;
  const isApplyingPromo = applyPromo.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            {t("events.getTickets")} — {eventTitle}
          </DialogTitle>
          <DialogDescription>{t("ticket.checkoutBlurb")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Tier list with quantity steppers */}
          <div className="space-y-3">
            {tickets.length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
                {t("ticket.noneOnSale")}
              </div>
            )}
            {tickets.map((tier) => {
              const qty = quantities[tier.id] || 0;
              const max = Math.min(tier.maxPerOrder ?? 99, tier.remaining ?? 99);
              const disabled = tier.soldOut || max === 0;
              return (
                <div
                  key={tier.id}
                  className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                    disabled ? "opacity-50" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-medium truncate">{tier.name}</div>
                      <div className="text-sm font-semibold whitespace-nowrap">
                        {formatMoney(tier.priceCents, tier.currency)}
                      </div>
                    </div>
                    {tier.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {tier.description}
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {tier.soldOut
                        ? t("ticket.soldOut")
                        : tier.remaining !== null
                        ? t("ticket.remaining", { n: tier.remaining })
                        : null}
                      {tier.maxPerOrder ? (
                        <span className="ml-2">
                          {t("ticket.maxPerOrder", { n: tier.maxPerOrder })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => changeQty(tier, -1)}
                      disabled={disabled || qty === 0}
                      aria-label={t("ticket.decrease", { name: tier.name })}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="w-7 text-center text-sm tabular-nums">{qty}</div>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => changeQty(tier, 1)}
                      disabled={disabled || qty >= max}
                      aria-label={t("ticket.increase", { name: tier.name })}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Promo code */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              {t("ticket.promoCode")}
            </Label>
            <div className="flex gap-2">
              <Input
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value);
                  setPromoError(null);
                }}
                placeholder={t("common.optional")}
                disabled={isApplyingPromo}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleApplyPromo}
                disabled={isApplyingPromo || !promoInput.trim()}
              >
                {isApplyingPromo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("common.apply")
                )}
              </Button>
            </div>
            {promoError && (
              <div className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {promoError}
              </div>
            )}
            {appliedPromo && (
              <div className="text-xs text-green-600 dark:text-green-400">
                {t("ticket.codeLabel")} <strong>{appliedPromo.code}</strong>{" "}
                {t("ticket.appliedOff", {
                  amount: formatMoney(appliedPromo.discountCents, currency),
                })}
              </div>
            )}
          </div>

          {/* Customer details */}
          <div className="space-y-3 border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ts-checkout-email">{t("form.emailLabel")}</Label>
                <Input
                  id="ts-checkout-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ts-checkout-name">{t("form.fullName")}</Label>
                <Input
                  id="ts-checkout-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("form.namePlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ts-checkout-phone">{t("form.phone")}</Label>
                <Input
                  id="ts-checkout-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("common.optional")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ts-checkout-company">{t("form.company")}</Label>
                <Input
                  id="ts-checkout-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={t("common.optional")}
                />
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="border-t pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("ticket.subtotal")}
              </span>
              <span className="tabular-nums">{formatMoney(subtotalCents, currency)}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>{t("ticket.discount")}</span>
                <span className="tabular-nums">-{formatMoney(discountCents, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold border-t pt-2 mt-2">
              <span>{t("ticket.total")}</span>
              <span className="tabular-nums">{formatMoney(totalCents, currency)}</span>
            </div>
          </div>

          {submitError && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                {submitError}
                {submitError.toLowerCase().includes("stripe is not configured") && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {t("ticket.contactOrganiser")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleCheckout}
            disabled={isSubmitting || totalQty === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("ticket.redirecting")}
              </>
            ) : (
              <>{t("ticket.continueCheckout")}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TicketCheckoutDialog;
