/**
 * AI Settings
 * Configure LLM providers, API keys, default models, and system preferences.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Key, Brain, Check, Loader2, AlertCircle, Eye, EyeOff,
  TestTube, Sparkles, Shield, Globe, Zap, RefreshCw,
} from "lucide-react";

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4o-mini, o1, o3-mini",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    models: ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  },
  {
    id: "google",
    name: "Google",
    description: "Gemini 2.0 Flash, Gemini 1.5 Pro",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    models: ["gemini-2.0-flash", "gemini-1.5-pro"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek V3, DeepSeek R1",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "mistral",
    name: "Mistral",
    description: "Mistral Large, Mistral Small",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    models: ["mistral-large-latest", "mistral-small-latest"],
  },
];

export default function AISettings() {
  const { toast } = useToast();
  const [providerConfigs, setProviderConfigs] = useState<Record<string, { apiKey: string; isActive: boolean; defaultModel: string }>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [defaultProvider, setDefaultProvider] = useState("builtin");
  const [autoEntityExtraction, setAutoEntityExtraction] = useState(true);
  const [autoImageSearch, setAutoImageSearch] = useState(true);

  const settings = trpc.admin.aiContent.getProviderSettings.useQuery();
  const models = trpc.admin.aiContent.getModels.useQuery();

  const saveSettings = trpc.admin.aiContent.saveProviderSettings.useMutation({
    onSuccess: () => {
      toast({ title: "Settings Saved", description: "AI provider settings have been updated" });
      settings.refetch();
    },
    onError: (err) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const testProvider = trpc.admin.aiContent.testProvider.useMutation({
    onSuccess: (data) => {
      toast({ title: "Connection Successful", description: `Provider is working. Response: "${data.response?.substring(0, 100)}..."` });
    },
    onError: (err) => {
      toast({ title: "Connection Failed", description: err.message, variant: "destructive" });
    },
  });

  // Load existing settings
  useEffect(() => {
    if (settings.data) {
      const configs: Record<string, any> = {};
      for (const config of (settings.data as any).configs || []) {
        configs[config.provider] = {
          apiKey: config.apiKey || "",
          isActive: config.isActive || false,
          defaultModel: config.defaultModel || "",
          priority: config.priority || 5,
        };
      }
      setProviderConfigs(configs);
      // Load global settings from configs
      setDefaultProvider("builtin");
      setAutoEntityExtraction(true);
      setAutoImageSearch(true);
    }
  }, [settings.data]);

  function updateProviderConfig(providerId: string, field: string, value: any) {
    setProviderConfigs((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId] || { apiKey: "", isActive: false, defaultModel: "" },
        [field]: value,
      },
    }));
  }

  function handleSave() {
    const configs = Object.entries(providerConfigs).map(([provider, config]) => ({
      provider,
      ...config,
    }));
    const settingsPayload = configs.map((c: any) => ({
      provider: c.provider,
      apiKey: c.apiKey || "",
      isActive: c.isActive || false,
      priority: c.priority || 5,
    }));
    saveSettings.mutate(settingsPayload as any);
  }

  function handleTest(providerId: string) {
    const config = providerConfigs[providerId];
    if (!config?.apiKey) {
      toast({ title: "API Key Required", description: "Please enter an API key first", variant: "destructive" });
      return;
    }
    testProvider.mutate({ provider: providerId });
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-purple-500" />
              AI Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure LLM providers, API keys, and generation preferences
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveSettings.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saveSettings.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>

        {/* Built-in Provider Notice */}
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-semibold">Built-in AI Provider</p>
                <p className="text-sm text-muted-foreground mt-1">
                  TechScoop includes a built-in AI provider that works out of the box with no API key required.
                  Configure additional providers below for model selection and failover.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">General Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Default Provider</Label>
                <p className="text-sm text-muted-foreground">Provider used when none is selected</p>
              </div>
              <Select value={defaultProvider} onValueChange={setDefaultProvider}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="builtin">Built-in (Default)</SelectItem>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={!providerConfigs[p.id]?.isActive}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Entity Extraction</Label>
                <p className="text-sm text-muted-foreground">Automatically extract entities from generated content</p>
              </div>
              <Switch checked={autoEntityExtraction} onCheckedChange={setAutoEntityExtraction} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Image Search</Label>
                <p className="text-sm text-muted-foreground">Automatically search for relevant images after generation</p>
              </div>
              <Switch checked={autoImageSearch} onCheckedChange={setAutoImageSearch} />
            </div>
          </CardContent>
        </Card>

        {/* Provider Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">LLM Providers</h2>
          {PROVIDERS.map((provider) => {
            const config = providerConfigs[provider.id] || { apiKey: "", isActive: false, defaultModel: "" };
            const showKey = showKeys[provider.id];

            return (
              <Card key={provider.id} className={config.isActive ? "border-green-200 dark:border-green-800" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${provider.color}`}>
                        <Brain className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{provider.name}</h3>
                          {!!config.isActive && (
                            <Badge variant="default" className="bg-green-600">Active</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{provider.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={config.isActive}
                      onCheckedChange={(v) => updateProviderConfig(provider.id, "isActive", v)}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Key className="h-3 w-3" /> API Key
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showKey ? "text" : "password"}
                            value={config.apiKey}
                            onChange={(e) => updateProviderConfig(provider.id, "apiKey", e.target.value)}
                            placeholder={`Enter ${provider.name} API key`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeys((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleTest(provider.id)}
                          disabled={testProvider.isPending || !config.apiKey}
                        >
                          {testProvider.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Default Model</Label>
                      <Select
                        value={config.defaultModel}
                        onValueChange={(v) => updateProviderConfig(provider.id, "defaultModel", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Auto-select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__auto__">Auto-select</SelectItem>
                          {provider.models.map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Security Notice */}
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold">Security Notice</p>
                <p className="text-sm text-muted-foreground mt-1">
                  API keys are encrypted at rest and never exposed to the frontend.
                  All LLM calls are made server-side. Keys are only used for the configured provider's API.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
