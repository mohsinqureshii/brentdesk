/**
 * Partner Dashboard - Main dashboard for partner users
 * Shows affiliate stats, deals, payouts, and resources
 */

import { useState } from "react";
import { Link } from "wouter";
import { publication } from "@shared/publication";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  DollarSign, 
  MousePointerClick, 
  TrendingUp,
  Gift,
  FileText,
  Settings,
  Plus,
  ExternalLink,
  Calendar,
  Users,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

export default function PartnerDashboard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

  // Fetch partner data
  const { data: partnerData } = trpc.admin.partners.getMyPartner.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch affiliate stats
  const { data: affiliateStats } = trpc.admin.partners.getAffiliateStatsDashboard.useQuery(
    { dateRange },
    { enabled: !!partnerData }
  );

  // Fetch recent clicks
  const { data: recentClicks } = trpc.admin.partners.getRecentClicks.useQuery(
    { limit: 10 },
    { enabled: !!partnerData }
  );

  // Fetch deals
  const { data: deals } = trpc.admin.partners.getMyDeals.useQuery(undefined, {
    enabled: !!partnerData,
  });

  const tierColors: Record<string, string> = {
    free: "bg-gray-100 text-gray-800",
    growth: "bg-blue-100 text-blue-800",
    pro: "bg-purple-100 text-purple-800",
    enterprise: "bg-amber-100 text-amber-800",
  };

  if (!partnerData) {
    return (
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Become a {publication.name} Partner</CardTitle>
            <CardDescription>
              Join our partner program to access exclusive benefits, affiliate commissions, and more.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Free Tier</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Basic listing in directory</li>
                  <li>• 15% affiliate commission</li>
                  <li>• Monthly analytics reports</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg border-primary">
                <h3 className="font-semibold mb-2">Growth Tier - $200/mo</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Featured listing</li>
                  <li>• 20% affiliate commission</li>
                  <li>• Weekly analytics reports</li>
                  <li>• 1 sponsored article/month</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Pro Tier - $500/mo</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Premium placement</li>
                  <li>• 25% affiliate commission</li>
                  <li>• Real-time analytics</li>
                  <li>• 4 sponsored articles/month</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Enterprise - Custom</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Custom integration</li>
                  <li>• 30% affiliate commission</li>
                  <li>• Dedicated account manager</li>
                  <li>• Unlimited sponsored content</li>
                </ul>
              </div>
            </div>
            <div className="text-center">
              <Button size="lg" asChild>
                <Link href="/partner/register">Apply to Become a Partner</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{partnerData.companyName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={tierColors[partnerData.tier] || tierColors.free}>
              {partnerData.tier.charAt(0).toUpperCase() + partnerData.tier.slice(1)} Partner
            </Badge>
            <span className="text-sm text-muted-foreground">
              Partner since {new Date(partnerData.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/partner/settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/partner/deals/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Deal
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliateStats?.totalClicks?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Last {dateRange}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliateStats?.totalConversions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {affiliateStats?.conversionRate || 0}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${affiliateStats?.totalEarnings?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              ${affiliateStats?.pendingEarnings?.toLocaleString() || 0} pending payout
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deals?.filter(d => d.status === "active").length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {deals?.reduce((sum, d) => sum + (d.currentRedemptions || 0), 0) || 0} total redemptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deals">Deals & Perks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Clicks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Clicks</CardTitle>
                <CardDescription>Latest affiliate link activity</CardDescription>
              </CardHeader>
              <CardContent>
                {recentClicks && recentClicks.length > 0 ? (
                  <div className="space-y-3">
                    {recentClicks.slice(0, 5).map((click) => (
                      <div key={click.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          <span className="truncate max-w-[200px]">{click.destinationUrl}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {new Date(click.clickedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No clicks recorded yet. Share your affiliate links to start tracking.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Active Deals */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Active Deals</CardTitle>
                  <CardDescription>Your current offers for founders</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/partner/deals">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {deals && deals.filter(d => d.status === "active").length > 0 ? (
                  <div className="space-y-3">
                    {deals.filter(d => d.status === "active").slice(0, 5).map((deal) => (
                      <div key={deal.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{deal.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {deal.currentRedemptions || 0} / {deal.maxRedemptions || "∞"} redemptions
                          </p>
                        </div>
                        <Badge variant="outline">{deal.discountType}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">No active deals</p>
                    <Button size="sm" asChild>
                      <Link href="/dashboard/partner/deals/new">Create Your First Deal</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                  <Link href="/dashboard/partner/deals/new">
                    <Gift className="w-6 h-6 mb-2" />
                    <span>Create Deal</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                  <Link href="/dashboard/partner/resources/submit">
                    <FileText className="w-6 h-6 mb-2" />
                    <span>Submit Resource</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                  <Link href="/dashboard/partner/analytics">
                    <BarChart3 className="w-6 h-6 mb-2" />
                    <span>View Analytics</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                  <Link href="/dashboard/partner/team">
                    <Users className="w-6 h-6 mb-2" />
                    <span>Manage Team</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Your Deals & Perks</CardTitle>
                <CardDescription>Manage offers for {publication.name} founders</CardDescription>
              </div>
              <Button asChild>
                <Link href="/dashboard/partner/deals/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Deal
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {deals && deals.length > 0 ? (
                <div className="space-y-4">
                  {deals.map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{deal.title}</h3>
                          <Badge variant={deal.status === "active" ? "default" : "secondary"}>
                            {deal.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{deal.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Type: {deal.discountType}</span>
                          <span>Value: {deal.discountValue}</span>
                          <span>Redemptions: {deal.currentRedemptions || 0} / {deal.maxRedemptions || "∞"}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/partner/deals/${deal.id}`}>Edit</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No deals yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first deal to offer discounts to {publication.name} founders.
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/partner/deals/new">Create Your First Deal</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Affiliate Analytics</CardTitle>
                  <CardDescription>Track your performance over time</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={dateRange === "7d" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setDateRange("7d")}
                  >
                    7 Days
                  </Button>
                  <Button 
                    variant={dateRange === "30d" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setDateRange("30d")}
                  >
                    30 Days
                  </Button>
                  <Button 
                    variant={dateRange === "90d" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setDateRange("90d")}
                  >
                    90 Days
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/20">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Analytics chart will be displayed here</p>
                  <p className="text-sm text-muted-foreground">Start generating clicks to see your data</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Your earnings and payment history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No payouts yet</h3>
                <p className="text-sm text-muted-foreground">
                  Payouts are processed monthly when your balance exceeds $100.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
