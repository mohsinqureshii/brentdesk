/**
 * Integration Hub
 *
 * Single home for every third-party integration the platform talks to.
 * Each card pulls its REAL status from the integration_configs table
 * (Phase 2A: DB-stored credentials replacing env-var-only config).
 *
 * Click Configure → IntegrationConfigDialog opens with the right field
 * schema (server-driven). Test connection makes a live HTTP call to
 * the provider. No more "coming soon" — every card is configurable.
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail, MessageSquare, Phone, Brain, Webhook, KeyRound,
  Inbox, Puzzle, CheckCircle2, AlertCircle, CircleDashed,
  Globe, Sparkles, DollarSign, Settings, CreditCard, Github,
  Database, Terminal, Slack, Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { IntegrationConfigDialog } from "@/components/admin/IntegrationConfigDialog";

interface IntegrationDescriptor {
  id: string;
  category: "Talent Platform" | "Communication" | "AI Services" | "Developer" | "Analytics & Revenue";
  name: string;
  description: string;
  capabilities: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const INTEGRATIONS: IntegrationDescriptor[] = [
  // Talent Platform
  { id: "stripe-payments", category: "Talent Platform", name: "Stripe",
    description: "Event ticket Checkout and tenant subscription billing (Starter / Growth / Enterprise price IDs).",
    capabilities: ["Checkout", "Webhooks", "Subscriptions", "Refunds"], icon: CreditCard },
  { id: "github-app", category: "Talent Platform", name: "GitHub App",
    description: "OAuth + webhook bridge for candidate repo verification and contributor signals.",
    capabilities: ["OAuth", "Installation tokens", "Webhooks", "Repo metadata"], icon: Github },
  { id: "qdrant", category: "Talent Platform", name: "Qdrant",
    description: "Vector database powering semantic candidate search and JD-to-resume matching.",
    capabilities: ["Vector search", "Embeddings store", "Hybrid filters"], icon: Database },
  { id: "judge0", category: "Talent Platform", name: "Judge0",
    description: "Sandboxed code execution for the live coding assessment runner.",
    capabilities: ["Sandbox runs", "Multi-language", "Test cases"], icon: Terminal },
  { id: "slack-platform", category: "Talent Platform", name: "Slack",
    description: "Workspace notifications for new applications, stage changes, and offer accepts.",
    capabilities: ["Webhooks", "Per-event routing", "Channel-level alerts"], icon: Slack },
  { id: "greenhouse", category: "Talent Platform", name: "Greenhouse",
    description: "ATS sync — pull candidates from Greenhouse into the Talent Platform pipeline.",
    capabilities: ["Harvest API", "Candidate import", "Stage mapping"], icon: Users },

  // Communication
  { id: "email-resend", category: "Communication", name: "Email (Resend)",
    description: "Transactional email for newsletter welcomes, contact-form replies, password resets, and admin notifications.",
    capabilities: ["Newsletter", "Password reset", "Admin alerts", "Contact replies"], icon: Mail },
  { id: "sms-twilio", category: "Communication", name: "SMS (Twilio)",
    description: "Two-way SMS for OTP verification and time-sensitive admin alerts. Programmable messaging via Twilio's API.",
    capabilities: ["OTP", "Verification", "Bulk SMS", "Inbound replies"], icon: Phone },
  { id: "whatsapp", category: "Communication", name: "WhatsApp Business",
    description: "Send breaking-news updates, event RSVPs, and customer-support replies via WhatsApp Cloud API.",
    capabilities: ["Templates", "Two-way chat", "Media", "Click-to-WA"], icon: MessageSquare },

  // AI Services
  { id: "ai-claude", category: "AI Services", name: "AI Services",
    description: "LLM credentials for SEO suggestions, redirect proposals, content audits, and the article-editor inline assistant. Multi-provider — Anthropic, OpenAI, or Google.",
    capabilities: ["Anthropic Claude", "OpenAI GPT", "Google Gemini", "Per-feature routing"], icon: Brain },

  // Developer
  { id: "webhooks", category: "Developer", name: "Webhooks",
    description: "Outbound webhooks fired on article publish, job posted, and other lifecycle events. HMAC-SHA256 signed.",
    capabilities: ["HMAC signing", "Retries", "Delivery log", "Per-event filters"], icon: Webhook },
  { id: "api-access", category: "Developer", name: "Public API Access",
    description: "Issue API keys for partners to read articles, search jobs, or push events into the calendar.",
    capabilities: ["API keys", "Scopes", "Rate limits", "Usage analytics"], icon: KeyRound },

  // Analytics & Revenue
  { id: "google-analytics", category: "Analytics & Revenue", name: "Google Analytics 4",
    description: "Pageviews, sessions, unique users, top countries, top pages, average engagement time, bounce rate. Powers Dashboard → Audience.",
    capabilities: ["GA4 Reporting API", "Realtime", "Top pages", "Top countries"], icon: Globe },
  { id: "search-console", category: "Analytics & Revenue", name: "Google Search Console",
    description: "Top search queries, click-through rate, average position, coverage report. Reuses Indexing API service-account credentials.",
    capabilities: ["Top queries", "CTR", "Average position", "Coverage"], icon: Sparkles },
  { id: "adsense-api", category: "Analytics & Revenue", name: "Google AdSense",
    description: "Live revenue, RPM, fill rate, eCPM, and per-slot earnings. Powers Dashboard → Revenue.",
    capabilities: ["Live revenue", "Fill rate", "RPM", "eCPM", "Daily trend"], icon: DollarSign },
];

const STATUS_PILL: Record<"active" | "configured" | "error" | "unconfigured", { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  active:       { label: "Active",         cls: "bg-[#EBF3FF] text-[#0052CC] border-[#C7DCFF]", Icon: CheckCircle2 },
  configured:   { label: "Configured",     cls: "bg-[#EBF3FF] text-[#0052CC] border-[#C7DCFF]", Icon: CheckCircle2 },
  error:        { label: "Error",          cls: "bg-red-100 text-red-700 border-red-200",            Icon: AlertCircle },
  unconfigured: { label: "Not configured", cls: "bg-[#F0F2F5] text-[#1A1F36] border-[#E0E3E8]",         Icon: CircleDashed },
};

function IntegrationCard({
  i, status, enabled, onConfigure,
}: {
  i: IntegrationDescriptor;
  status: "active" | "configured" | "error" | "unconfigured";
  enabled: boolean;
  onConfigure: () => void;
}) {
  const effectiveStatus = !enabled && status !== "unconfigured" ? "unconfigured" : status;
  const pill = STATUS_PILL[effectiveStatus];
  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-10 h-10 rounded-md bg-[#F0F7FF] flex items-center justify-center shrink-0">
            <i.icon className="h-5 w-5 text-[#0066FF]" />
          </div>
          <Badge variant="outline" className={`${pill.cls} gap-1.5 whitespace-nowrap`}>
            <pill.Icon className="h-3 w-3" />
            {pill.label}
          </Badge>
        </div>
        <h3 id={i.id} className="font-semibold text-[#1A1F36] mb-1 scroll-mt-24">{i.name}</h3>
        <p className="text-sm text-[#697386] leading-relaxed mb-4 flex-1">{i.description}</p>
        <div className="flex flex-wrap gap-1 mb-4">
          {i.capabilities.map((c) => (
            <Badge key={c} variant="secondary" className="bg-[#F0F2F5] text-[#1A1F36] text-[11px] font-normal">
              {c}
            </Badge>
          ))}
        </div>
        <Button
          variant="ghost"
          onClick={onConfigure}
          className="text-[#0066FF] hover:text-[#0052CC] hover:bg-[#F0F7FF] px-0 -mx-1 justify-start w-fit"
        >
          <Settings className="h-4 w-4 mr-1.5" />
          {effectiveStatus === "unconfigured" ? "Add credentials" : "Configure"}
        </Button>
      </CardContent>
    </Card>
  );
}

function FormSubmissionsInbox() {
  const list = trpc.submissions.listForAdmin.useQuery({ page: 1, limit: 10 });
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-[#0066FF]" />
            <h3 className="font-semibold text-[#1A1F36]">Form Submissions</h3>
          </div>
          <Badge variant="outline" className="bg-[#F7F8FA]">{list.data?.total ?? 0} total</Badge>
        </div>
        {list.isLoading ? (
          <p className="text-sm text-[#697386]">Loading…</p>
        ) : !list.data || list.data.items.length === 0 ? (
          <p className="text-sm text-[#697386]">
            No submissions yet. The Newsletter, Contact, and Advertise forms write here.
          </p>
        ) : (
          <ul className="divide-y">
            {list.data.items.map((s: any) => (
              <li key={s.id} className="py-3 flex items-start gap-3">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider shrink-0 mt-0.5">{s.form_type}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1F36] truncate">{s.name || s.email || "(anonymous)"}</p>
                  <p className="text-xs text-[#697386] truncate">{s.email}</p>
                </div>
                <span className="text-xs text-[#9BA3B0] shrink-0">{new Date(s.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function IntegrationHub() {
  const list = trpc.admin.integrations.list.useQuery();
  const [configuring, setConfiguring] = useState<string | null>(null);

  const statusById = new Map((list.data || []).map((c: any) => [c.integrationId, c]));

  const grouped = INTEGRATIONS.reduce<Record<string, IntegrationDescriptor[]>>((acc, i) => {
    (acc[i.category] = acc[i.category] || []).push(i);
    return acc;
  }, {});

  // Preserve a stable, intentional category order
  const CATEGORY_ORDER: IntegrationDescriptor["category"][] = [
    "Talent Platform",
    "AI Services",
    "Communication",
    "Developer",
    "Analytics & Revenue",
  ];
  const orderedCategories = CATEGORY_ORDER.filter((c) => grouped[c]?.length);

  // Counters
  const all = list.data || [];
  const totals = {
    total: INTEGRATIONS.length,
    active: all.filter((c: any) => c.enabled && c.status === "configured").length,
    error: all.filter((c: any) => c.status === "error").length,
    unconfigured: INTEGRATIONS.length - all.filter((c: any) => c.status === "configured").length,
  };

  const configuringName = INTEGRATIONS.find((i) => i.id === configuring)?.name ?? "";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36] flex items-center gap-2">
              <Puzzle className="h-6 w-6 text-[#0066FF]" />
              Integration Hub
            </h1>
            <p className="text-[#697386] mt-0.5 text-[13px] max-w-2xl">
              Connect and manage third-party services. Credentials are encrypted at rest;
              configure each integration here instead of editing environment variables.
            </p>
          </div>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-[#697386] uppercase tracking-wider">Total</p><p className="text-xl font-semibold text-[#1A1F36] mt-1">{totals.total}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-[#0066FF] uppercase tracking-wider">Active</p><p className="text-2xl font-bold text-[#0066FF] mt-1">{totals.active}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-red-600 uppercase tracking-wider">Errors</p><p className="text-2xl font-bold text-red-600 mt-1">{totals.error}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-[#697386] uppercase tracking-wider">Not configured</p><p className="text-2xl font-bold text-[#697386] mt-1">{totals.unconfigured}</p></CardContent></Card>
        </div>

        {/* Cards by category */}
        {list.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-44 rounded-lg" />
            ))}
          </div>
        ) : (
          orderedCategories.map((cat) => (
            <section key={cat}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#697386] mb-3">{cat}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {grouped[cat].map((i) => {
                  const c = statusById.get(i.id) as any;
                  const status = (c?.status || "unconfigured") as "active" | "configured" | "error" | "unconfigured";
                  const enabled = c?.enabled ?? false;
                  return (
                    <IntegrationCard
                      key={i.id}
                      i={i}
                      status={status}
                      enabled={enabled}
                      onConfigure={() => setConfiguring(i.id)}
                    />
                  );
                })}
              </div>
            </section>
          ))
        )}

        {/* Recent activity */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#697386] mb-3">Recent activity</h2>
          <FormSubmissionsInbox />
        </section>

        {/* Config dialog */}
        {configuring && (
          <IntegrationConfigDialog
            integrationId={configuring}
            title={configuringName}
            open={!!configuring}
            onOpenChange={(o) => !o && setConfiguring(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
