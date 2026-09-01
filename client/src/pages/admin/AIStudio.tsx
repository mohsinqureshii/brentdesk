/**
 * AI Studio
 * ----------------------------------------------------------------------
 * Single home for every AI content tool. Replaces the previous 12-page
 * scatter under /admin/ai/* by collapsing them into 6 workflow tabs.
 *
 * Tabs (each renders a layout-free panel from the corresponding file):
 *   Newsletter       NewsletterGeneratorPanel
 *   Social           SocialMediaPanel
 *   Script           ScriptGeneratorPanel
 *   Bulk             BatchGenerationPanel
 *   Analyze          ToneAnalyzerPanel + PlagiarismCheckPanel + ContentComparisonPanel
 *   Research         CompetitiveIntelPanel
 *
 * Old standalone URLs (/admin/ai/newsletter, /admin/ai/social, etc.)
 * still resolve via the backwards-compat default exports each refactored
 * page kept — so any bookmark or in-product deep link keeps working.
 *
 * AIContentGenerator (the long-form article writer) stays as its own
 * page at /admin/ai/generate. It's 1200+ lines and is the writer's
 * primary tool — folding it into a tab here would make it feel
 * cramped. Linked from this page as "Open Article Writer".
 *
 * AI Analytics moved into the Dashboard "Insights" tab — it's an
 * analytics surface, not a writing tool.
 */

import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Mail, Hash, Mic, Layers, Sparkles, Search,
  PenTool, ArrowRight,
} from "lucide-react";
import { NewsletterGeneratorPanel } from "./ai/NewsletterGenerator";
import { SocialMediaPanel } from "./ai/SocialMedia";
import { ScriptGeneratorPanel } from "./ai/ScriptGenerator";
import { BatchGenerationPanel } from "./ai/BatchGeneration";
import { ToneAnalyzerPanel } from "./ai/ToneAnalyzer";
import { PlagiarismCheckPanel } from "./ai/PlagiarismCheck";
import { ContentComparisonPanel } from "./ai/ContentComparison";
import { CompetitiveIntelPanel } from "./ai/CompetitiveIntel";

export default function AIStudio() {
  const [tab, setTab] = useState("newsletter");

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-emerald-700" />
              AI Studio
            </h1>
            <p className="text-zinc-500 mt-1 text-sm sm:text-base max-w-2xl">
              AI tools for newsletters, social posts, scripts, bulk generation,
              content analysis, and competitor research — in one workspace.
            </p>
          </div>
          <Link href="/admin/ai/generate">
            <Button variant="outline" className="h-10">
              <PenTool className="h-4 w-4 mr-1.5" />
              Open Article Writer
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
            <TabsList className="bg-zinc-100">
              <TabsTrigger value="newsletter"> <Mail   className="h-3.5 w-3.5 mr-1.5" /> Newsletter </TabsTrigger>
              <TabsTrigger value="social">     <Hash   className="h-3.5 w-3.5 mr-1.5" /> Social </TabsTrigger>
              <TabsTrigger value="script">     <Mic    className="h-3.5 w-3.5 mr-1.5" /> Script </TabsTrigger>
              <TabsTrigger value="bulk">       <Layers className="h-3.5 w-3.5 mr-1.5" /> Bulk </TabsTrigger>
              <TabsTrigger value="analyze">    <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Analyze </TabsTrigger>
              <TabsTrigger value="research">   <Search className="h-3.5 w-3.5 mr-1.5" /> Research </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="newsletter" className="mt-6"><NewsletterGeneratorPanel /></TabsContent>
          <TabsContent value="social"     className="mt-6"><SocialMediaPanel /></TabsContent>
          <TabsContent value="script"     className="mt-6"><ScriptGeneratorPanel /></TabsContent>
          <TabsContent value="bulk"       className="mt-6"><BatchGenerationPanel /></TabsContent>
          <TabsContent value="analyze"    className="mt-6">
            {/*
              Three content-analysis tools stacked vertically. Each is its
              own card so operators can scroll through (paste content →
              tone → plagiarism → version diff) without page navigation.
            */}
            <div className="space-y-6">
              <Card><CardContent className="p-5"><ToneAnalyzerPanel /></CardContent></Card>
              <Card><CardContent className="p-5"><PlagiarismCheckPanel /></CardContent></Card>
              <Card><CardContent className="p-5"><ContentComparisonPanel /></CardContent></Card>
            </div>
          </TabsContent>
          <TabsContent value="research"   className="mt-6"><CompetitiveIntelPanel /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
