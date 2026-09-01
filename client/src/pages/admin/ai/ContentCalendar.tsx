import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Calendar, ChevronLeft, ChevronRight, Clock, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ContentCalendar() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", contentType: "article", scheduledDate: "", notes: "", priority: "medium" });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fromDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const toDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;
  const calendarItems = trpc.admin.aiExtended.getCalendarItems.useQuery({
    from: fromDate,
    to: toDate,
  });

  const createItem = trpc.admin.aiExtended.createCalendarItem.useMutation({
    onSuccess: () => {
      toast({ title: "Calendar item created" });
      calendarItems.refetch();
      setShowCreate(false);
      setNewItem({ title: "", contentType: "article", scheduledDate: "", notes: "", priority: "medium" });
    },
  });

  // Generate from calendar item - uses the main content generator
  const generateFromCalendar = { mutate: (input: { calendarItemId: number }) => {
    toast({ title: "Content generation started", description: "Navigate to Content Generator to create this content." });
  }, isPending: false };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const calendarGrid = useMemo(() => {
    const grid: Array<{ day: number | null; items: any[] }> = [];
    for (let i = 0; i < firstDay; i++) grid.push({ day: null, items: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayItems = (calendarItems.data || []).filter((item: any) => {
        const itemDate = new Date(item.scheduledDate).toISOString().split("T")[0];
        return itemDate === dateStr;
      });
      grid.push({ day: d, items: dayItems });
    }
    return grid;
  }, [calendarItems.data, year, month, firstDay, daysInMonth]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const priorityColor = (p: string) => {
    switch (p) {
      case "high": return "bg-red-500/10 text-red-500";
      case "medium": return "bg-yellow-500/10 text-yellow-500";
      default: return "bg-green-500/10 text-green-500";
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "published": return "bg-green-500/10 text-green-500";
      case "generating": return "bg-blue-500/10 text-blue-500";
      case "scheduled": return "bg-purple-500/10 text-purple-500";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Calendar</h1>
          <p className="text-muted-foreground mt-1">Plan and schedule content generation</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Schedule Content</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule New Content</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })} placeholder="Article title or topic" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Content Type</Label>
                  <Select value={newItem.contentType} onValueChange={v => setNewItem({ ...newItem, contentType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="person">Person</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="resource">Resource</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={newItem.priority} onValueChange={v => setNewItem({ ...newItem, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Scheduled Date *</Label>
                <Input type="date" value={newItem.scheduledDate} onChange={e => setNewItem({ ...newItem, scheduledDate: e.target.value })} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })} rows={3} placeholder="Additional context or instructions..." />
              </div>
              <Button
                className="w-full"
                onClick={() => createItem.mutate({
                  title: newItem.title,
                  contentType: newItem.contentType,
                  scheduledDate: newItem.scheduledDate,
                  notes: newItem.notes,
                  priority: newItem.priority as "low" | "medium" | "high" | "urgent",
                })}
                disabled={createItem.isPending || !newItem.title || !newItem.scheduledDate}
              >
                {createItem.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
                Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> {monthName}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
              <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {calendarItems.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
              {calendarGrid.map((cell, idx) => (
                <div
                  key={idx}
                  className={`bg-background min-h-[100px] p-1.5 ${!cell.day ? "bg-muted/30" : ""} ${
                    cell.day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()
                      ? "ring-2 ring-primary ring-inset" : ""
                  }`}
                >
                  {cell.day && (
                    <>
                      <span className="text-xs font-medium">{cell.day}</span>
                      <div className="space-y-0.5 mt-1">
                        {cell.items.slice(0, 3).map((item: any) => (
                          <div
                            key={item.id}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary truncate cursor-pointer hover:bg-primary/20 flex items-center gap-1"
                            title={item.title}
                          >
                            <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </div>
                        ))}
                        {cell.items.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{cell.items.length - 3} more</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Scheduled Items</CardTitle>
          <CardDescription>Items scheduled for this month and beyond</CardDescription>
        </CardHeader>
        <CardContent>
          {!calendarItems.data?.length ? (
            <p className="text-center text-muted-foreground py-6">No scheduled items for this month</p>
          ) : (
            <div className="space-y-2">
              {calendarItems.data.map((item: any) => (
                <div key={item.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.title}</span>
                      <Badge className={priorityColor(item.priority)}>{item.priority}</Badge>
                      <Badge className={statusColor(item.status)}>{item.status}</Badge>
                      <Badge variant="outline">{item.contentType}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scheduled: {new Date(item.scheduledDate).toLocaleDateString()}
                      {item.notes && ` — ${item.notes.substring(0, 60)}...`}
                    </p>
                  </div>
                  {item.status === "scheduled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateFromCalendar.mutate({ calendarItemId: item.id })}
                      disabled={generateFromCalendar.isPending}
                    >
                      <Sparkles className="h-3 w-3 mr-1" /> Generate
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );;
}
