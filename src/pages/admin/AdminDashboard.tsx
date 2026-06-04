import { useState, useEffect, useMemo, useCallback, useSyncExternalStore, useRef } from "react";
import { courseStore } from "@/data/courseStore";
import { categoryStore } from "@/data/categoryStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  BookOpen, Users, TrendingUp, TrendingDown, Award, BarChart3, Filter,
  RotateCcw, ChevronDown, ChevronUp, Download, CalendarIcon, Activity,
  Clock, UserCheck, FileText, ArrowUpRight, ArrowDownRight,
  Search, Target, Percent, GraduationCap, AlertTriangle, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import organizations from "@/data/facilities.json";
import kenyanCounties from "@/data/kenyanCounties.json";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#6366f1","#10b981","#f59e0b","#3b82f6","#ec4899","#8b5cf6","#14b8a6","#f97316","#06b6d4","#84cc16"];
const DESIGNATIONS = ["Tech Support", "Call Center", "Customer Delivery"] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

const downloadCSV = (data: Record<string, unknown>[], filename: string) => {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(","), ...data.map(row => headers.map(h => `"${row[h] ?? ""}"`).join(","))].join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: `${filename}.csv`,
  });
  a.click();
};

const ExportMenu = ({ data, filename }: { data: Record<string, unknown>[]; filename: string }) => (
  <div className="flex items-center gap-1">
    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => downloadCSV(data, filename)}>
      <Download className="h-3.5 w-3.5 mr-1" /> CSV
    </Button>
  </div>
);

const EmptyState = ({ message = "No data for current filters" }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center h-44 text-muted-foreground gap-2">
    <BarChart3 className="h-7 w-7 opacity-25" />
    <p className="text-xs">{message}</p>
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">{children}</p>
);

const InlineDateRange = ({
  from, to, onFrom, onTo,
}: {
  from: Date | undefined;
  to: Date | undefined;
  onFrom: (d: Date | undefined) => void;
  onTo: (d: Date | undefined) => void;
}) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-7 text-xs px-2 font-normal", !from && "text-muted-foreground")}>
          <CalendarIcon className="h-3 w-3 mr-1" />
          {from ? format(from, "dd MMM yy") : "From"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar mode="single" selected={from} onSelect={onFrom} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
    <span className="text-xs text-muted-foreground">→</span>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-7 text-xs px-2 font-normal", !to && "text-muted-foreground")}>
          <CalendarIcon className="h-3 w-3 mr-1" />
          {to ? format(to, "dd MMM yy") : "To"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar mode="single" selected={to} onSelect={onTo} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
    {(from || to) && (
      <Button
        variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => { onFrom(undefined); onTo(undefined); }}
        title="Clear date range"
      >
        <RotateCcw className="h-3 w-3" />
      </Button>
    )}
  </div>
);

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
  fontSize: 12,
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const courses    = useSyncExternalStore(courseStore.subscribe, courseStore.getAll);
  const categories = useSyncExternalStore(categoryStore.subscribe, categoryStore.getAll);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  useEffect(() => {
    courseStore.fetchAll();
    categoryStore.fetchAll();
  }, []);

  const downloadPDF = useCallback(async () => {
    const el = dashboardRef.current;
    if (!el || isPdfLoading) return;
    setIsPdfLoading(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, logging: false,
        backgroundColor: window.getComputedStyle(document.body).backgroundColor || "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH  = (canvas.height * pageW) / canvas.width;
      let yOffset = 0;
      while (yOffset < imgH) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -yOffset, pageW, imgH);
        yOffset += pageH;
      }
      pdf.save(`analytics-dashboard-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } finally {
      setIsPdfLoading(false);
    }
  }, [isPdfLoading]);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [filtersOpen,       setFiltersOpen      ] = useState(false);
  const [filterOrg,         setFilterOrg        ] = useState("all");
  const [filterCounty,      setFilterCounty     ] = useState("all");
  const [filterCategory,    setFilterCategory   ] = useState("all");
  const [filterAudience,    setFilterAudience   ] = useState("all");
  const [filterDesignation, setFilterDesignation] = useState("all");
  const [dateFrom,          setDateFrom         ] = useState<Date | undefined>();
  const [dateTo,            setDateTo           ] = useState<Date | undefined>();
  const [trendDateFrom,     setTrendDateFrom    ] = useState<Date | undefined>();
  const [trendDateTo,       setTrendDateTo      ] = useState<Date | undefined>();
  const [trendPeriod,       setTrendPeriod      ] = useState<"week" | "month" | "year">("month");

  const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [reportsData,    setReportsData   ] = useState<any>(null);
  const [reportsLoading, setReportsLoading] = useState(true);

  // ── Top Scorers ───────────────────────────────────────────────────────────
  type TopScorer = {
    userId: string; name: string; organization: string | null;
    score: number; courseTitle: string | null; completedAt: string | null;
    coursesCompleted?: number;
  };
  const [topScorers,        setTopScorers       ] = useState<TopScorer[]>([]);
  const [topScorersLoading, setTopScorersLoading] = useState(false);
  const [filterTopCourse,   setFilterTopCourse  ] = useState("all");

  // Single fetch that all charts depend on — parameters drive every query on the backend
  const fetchReportsData = useCallback(async () => {
    setReportsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAudience    !== "all") params.append("role",        filterAudience);
      if (filterCounty      !== "all") params.append("county",      filterCounty);
      if (filterOrg         !== "all") params.append("facility",    filterOrg);
      if (filterDesignation !== "all") params.append("designation", filterDesignation);

      const res = await fetch(`${BASE}/reports?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      setReportsData(await res.json());
    } catch (err: any) {
      toast.error("Failed to load reports data: " + err.message);
    } finally {
      setReportsLoading(false);
    }
  }, [filterAudience, filterCounty, filterOrg, filterDesignation]);

  useEffect(() => { fetchReportsData(); }, [fetchReportsData]);

  const fetchTopScorers = useCallback(async () => {
    setTopScorersLoading(true);
    try {
      const params = filterTopCourse !== "all" ? `?courseId=${filterTopCourse}` : "";
      const res = await fetch(`${BASE}/top-scorers${params}`);
      if (!res.ok) throw new Error(await res.text());
      setTopScorers(await res.json());
    } catch {
      setTopScorers([]);
    } finally {
      setTopScorersLoading(false);
    }
  }, [BASE, filterTopCourse]);

  useEffect(() => { fetchTopScorers(); }, [fetchTopScorers]);

  // ── Filter option lists (from reference data, not from current users) ─────
  const orgOptions = useMemo(() => [
    { value: "all", label: "All Organizations" },
    ...organizations.map((o: any) => ({ value: o.name, label: o.name })),
  ], []);

  const countyOptions = useMemo(() => [
    { value: "all", label: "All Counties" },
    ...kenyanCounties.map((c: string) => ({ value: c, label: c })),
  ], []);

  const uniqueCategories = useMemo(() => [...new Set(courses.map(c => c.category))], [courses]);
  const categoryOptions  = useMemo(() => [
    { value: "all", label: "All Categories" },
    ...uniqueCategories.map(c => ({ value: c, label: c })),
  ], [uniqueCategories]);

  const designationOptions = [
    { value: "all", label: "All Designations" },
    ...DESIGNATIONS.map(d => ({ value: d, label: d })),
  ];

  const resetFilters = useCallback(() => {
    setFilterOrg("all"); setFilterCounty("all"); setFilterCategory("all");
    setFilterAudience("all"); setFilterDesignation("all");
    setDateFrom(undefined); setDateTo(undefined);
    setTrendDateFrom(undefined); setTrendDateTo(undefined);
  }, []);

  const hasActiveFilters =
    filterOrg !== "all" || filterCounty !== "all" || filterCategory !== "all" ||
    filterAudience !== "all" || filterDesignation !== "all" ||
    !!dateFrom || !!dateTo || !!trendDateFrom || !!trendDateTo;

  // ── Course filter (category only — for category chart & Courses KPI) ──────
  const filteredCourses = useMemo(() => {
    if (filterCategory === "all") return courses;
    return courses.filter(c => c.category === filterCategory);
  }, [courses, filterCategory]);

  // ── Derived KPI values from reportsData ───────────────────────────────────
  const rd = reportsData;
  const status          = rd?.status           ?? { completed: 0, inProgress: 0, notStarted: 0 };
  const hpCount         = rd?.roleDistribution?.find((r: any) => r.role === "healthcare_provider")?.count ?? 0;
  const staffCount      = rd?.roleDistribution?.find((r: any) => r.role === "internal_staff")?.count     ?? 0;
  const totalLearners   = status.completed + status.inProgress + status.notStarted;
  const completedLearners = status.completed;
  const activeLearners    = status.inProgress;
  const notStarted        = status.notStarted;

  // Course-level totals (sum across roles)
  const totalEnrollments = (rd?.completionByRole ?? []).reduce((s: number, r: any) => s + r.enrollments, 0);
  const totalCompletions = (rd?.completionByRole ?? []).reduce((s: number, r: any) => s + r.completions, 0);
  const completionRate   = totalEnrollments > 0 ? Math.round((totalCompletions / totalEnrollments) * 100) : 0;
  const totalInProgress  = totalEnrollments - totalCompletions;
  const avgCourses       = totalLearners > 0 ? (totalEnrollments / totalLearners).toFixed(1) : "0";

  // ── Time-series (now filtered via the shared reports fetch) ───────────────
  const monthlyTrend = rd?.trend ?? [];
  const dailyTrend   = rd?.daily ?? [];

  const recent7    = dailyTrend.slice(-7).reduce((s: number, d: any) => s + d.enrollments, 0);
  const prev7      = dailyTrend.slice(-14, -7).reduce((s: number, d: any) => s + d.enrollments, 0);
  const recent30   = dailyTrend.slice(-30).reduce((s: number, d: any) => s + d.enrollments, 0);
  const wowChange  = prev7 > 0 ? Math.round(((recent7 - prev7) / prev7) * 100) : 10;

  const filteredTrend = useMemo(() => {
    let data = monthlyTrend;
    if (dateFrom || dateTo) {
      data = data.filter((d: any) => {
        const date = new Date(d.date);
        if (dateFrom && date < startOfDay(dateFrom)) return false;
        if (dateTo   && date > endOfDay(dateTo))     return false;
        return true;
      });
    }
    return data;
  }, [monthlyTrend, dateFrom, dateTo]);

  const enrollmentByPeriod = useMemo(() => {
    let base =
      trendPeriod === "week" ? dailyTrend.slice(-7) :
      trendPeriod === "year" ? [] :
      dailyTrend.slice(-30);

    if (trendPeriod !== "year" && (trendDateFrom || trendDateTo)) {
      base = base.filter((d: any) => {
        const date = new Date(d.date);
        if (trendDateFrom && date < startOfDay(trendDateFrom)) return false;
        if (trendDateTo   && date > endOfDay(trendDateTo))     return false;
        return true;
      });
    }

    if (trendPeriod === "year") {
      const map: Record<string, number> = {};
      let src = monthlyTrend;
      if (trendDateFrom || trendDateTo) {
        src = src.filter((d: any) => {
          const date = new Date(d.date);
          if (trendDateFrom && date < startOfDay(trendDateFrom)) return false;
          if (trendDateTo   && date > endOfDay(trendDateTo))     return false;
          return true;
        });
      }
      src.forEach((d: any) => { const yr = d.month.split(" ")[1]; map[yr] = (map[yr] || 0) + d.enrollments; });
      return Object.entries(map).map(([day, enrollments]) => ({ day, enrollments }));
    }

    return base.map((d: any) => ({ day: d.day, enrollments: d.enrollments }));
  }, [trendPeriod, trendDateFrom, trendDateTo, dailyTrend, monthlyTrend]);

  // ── KPI card list ─────────────────────────────────────────────────────────
  const kpis = [
    { label: "Total Learners",        value: totalLearners,         icon: Users,         trend: 12,                           color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-950/40",   spark: filteredTrend.slice(-8).map((d: any) => d.enrollments) },
    { label: "Healthcare Providers",  value: hpCount,               icon: Users,         trend: 0,                            color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/40",       spark: [hpCount, hpCount] },
    { label: "Internal Staff",        value: staffCount,            icon: UserCheck,     trend: 0,                            color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40", spark: [staffCount, staffCount] },
    { label: "Active",                value: activeLearners,        icon: UserCheck,     trend: 8,                            color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40", spark: filteredTrend.slice(-8).map((d: any) => Math.round(d.enrollments * 0.6)) },
    { label: "Completions",           value: completedLearners,     icon: Award,         trend: 15,                           color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/40",       spark: filteredTrend.slice(-8).map((d: any) => d.completions) },
    { label: "In Progress",           value: totalInProgress,       icon: Clock,         trend: totalInProgress > 5 ? 6 : -2, color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/40",     spark: filteredTrend.slice(-8).map((d: any) => Math.round(d.completions * 0.5)) },
    { label: "Completion Rate",       value: `${completionRate}%`,  icon: Percent,       trend: completionRate > 50 ? 4 : -8, color: "text-teal-600",    bg: "bg-teal-50 dark:bg-teal-950/40",       spark: Array.from({length:8},(_,i) => 40 + i*5) },
    { label: "Not Started",           value: notStarted,            icon: AlertTriangle, trend: notStarted > 3 ? -5 : 2,     color: "text-rose-600",    bg: "bg-rose-50 dark:bg-rose-950/40",       spark: Array.from({length:8},(_,i) => 8 - i) },
    { label: "Courses",               value: filteredCourses.length,icon: BookOpen,      trend: 5,                            color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/40",   spark: [3,3,4,4,4,5,5,filteredCourses.length] },
    { label: "Avg Courses / Learner", value: avgCourses,            icon: GraduationCap, trend: 3,                            color: "text-cyan-600",    bg: "bg-cyan-50 dark:bg-cyan-950/40",       spark: Array.from({length:8},(_,i) => 1.5 + i * 0.2) },
    { label: "Enrolled (7d)",         value: recent7,               icon: Activity,      trend: wowChange,                    color: "text-pink-600",    bg: "bg-pink-50 dark:bg-pink-950/40",       spark: dailyTrend.slice(-7).map((d: any) => d.enrollments), sub: `${recent30} in 30 days` },
  ];

  // ── Chart data — all from the same filtered /reports response ─────────────
  const orgData             = rd?.orgProgress      ?? [];
  const countyData          = rd?.hpByCounty       ?? [];
  const courseCompletionData= rd?.courseCompletion  ?? [];
  const topCourses          = rd?.topCourses        ?? [];

  const categoryData = useMemo(() => {
    const perf = rd?.categoryPerformance ?? [];
    const filtered = filterCategory === "all" ? perf : perf.filter((c: any) => c.name === filterCategory);
    return filtered.map((c: any) => ({ name: c.name, value: c.enrollments || c.courses }));
  }, [rd?.categoryPerformance, filterCategory]);

  const statusDistribution = [
    { name: "Completed",   value: completedLearners, color: "#10b981" },
    { name: "In Progress", value: activeLearners,    color: "#6366f1" },
    { name: "Not Started", value: notStarted,        color: "#f59e0b" },
  ].filter(d => d.value > 0);

  // Distribution of courses by their completion rate bracket
  const completionHistogram = useMemo(() => {
    const buckets = [
      { label: "0%",     min: 0,   max: 0,   count: 0 },
      { label: "1–25%",  min: 1,   max: 25,  count: 0 },
      { label: "26–50%", min: 26,  max: 50,  count: 0 },
      { label: "51–75%", min: 51,  max: 75,  count: 0 },
      { label: "76–99%", min: 76,  max: 99,  count: 0 },
      { label: "100%",   min: 100, max: 100, count: 0 },
    ];
    courseCompletionData.forEach((c: any) => {
      const b = buckets.find(b => c.rate >= b.min && c.rate <= b.max);
      if (b) b.count++;
    });
    return buckets;
  }, [courseCompletionData]);

  const funnelData = useMemo(() => [
    { name: "Enrolled",    value: totalLearners - notStarted, fill: "#6366f1" },
    { name: "In Progress", value: activeLearners,             fill: "#f59e0b" },
    { name: "Completed",   value: completedLearners,          fill: "#10b981" },
  ], [totalLearners, notStarted, activeLearners, completedLearners]);

  const orgCompletionRates = useMemo(() => orgData.map((d: any) => ({
    name: d.name.length > 18 ? d.name.slice(0,18)+"…" : d.name,
    fullName: d.name, rate: d.rate, total: d.total,
  })), [orgData]);

  const topCourseOptions = useMemo(() => [
    { value: "all", label: "All courses (avg. score)" },
    ...courses.map(c => ({ value: c.id, label: c.title })),
  ], [courses]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (reportsLoading && !reportsData) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading dashboard data…</p>
      </div>
    );
  }

  return (
    <div ref={dashboardRef} className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Training management overview
            {hasActiveFilters && <span className="ml-2 text-primary font-medium">· filters active</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={downloadPDF} disabled={isPdfLoading}>
            {isPdfLoading
              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating…</>
              : <><FileText  className="h-3.5 w-3.5 mr-1.5" /> PDF Report</>}
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer py-3 px-4 hover:bg-muted/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters</span>
                  {hasActiveFilters && <span className="text-[10px] font-medium bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Active</span>}
                </div>
                {filtersOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Organization</Label>
                  <SearchableSelect
                    value={filterOrg} onValueChange={setFilterOrg}
                    options={orgOptions} placeholder="All Organizations"
                    emptyMessage="No organization found." triggerClassName="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">County</Label>
                  <SearchableSelect
                    value={filterCounty} onValueChange={setFilterCounty}
                    options={countyOptions} placeholder="All Counties"
                    emptyMessage="No county found." triggerClassName="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Audience / Role</Label>
                  <select
                    value={filterAudience}
                    onChange={e => setFilterAudience(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">All Audiences</option>
                    <option value="healthcare_provider">Healthcare Provider</option>
                    <option value="internal_staff">Internal Staff</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Designation</Label>
                  <SearchableSelect
                    value={filterDesignation} onValueChange={setFilterDesignation}
                    options={designationOptions} placeholder="All Designations"
                    emptyMessage="No designation found." triggerClassName="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Course Category</Label>
                  <SearchableSelect
                    value={filterCategory} onValueChange={setFilterCategory}
                    options={categoryOptions} placeholder="All Categories"
                    emptyMessage="No category found." triggerClassName="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("h-8 w-full justify-start text-xs font-normal", !dateFrom && "text-muted-foreground")}>
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                        {dateFrom ? format(dateFrom, "dd MMM yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("h-8 w-full justify-start text-xs font-normal", !dateTo && "text-muted-foreground")}>
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                        {dateTo ? format(dateTo, "dd MMM yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="mt-3 h-7 text-xs" onClick={resetFilters}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset all filters
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ═══════════════════════════════════════════════
          SECTION 1 — KPI CARDS
      ═══════════════════════════════════════════════ */}
      <div>
        <SectionLabel>Key metrics</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map(kpi => (
            <Card key={kpi.label} className="overflow-hidden">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", kpi.bg)}>
                    <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                  </div>
                </div>
                <p className="text-xl font-bold tabular-nums leading-none">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{kpi.label}</p>
                {kpi.sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{kpi.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          SECTION 2 — ENROLLMENT TREND
      ═══════════════════════════════════════════════ */}
      <div>
        <SectionLabel>Enrollment over time</SectionLabel>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Enrollment Trend</CardTitle>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-md border border-border overflow-hidden text-xs">
                  {(["week","month","year"] as const).map(p => (
                    <button key={p} onClick={() => setTrendPeriod(p)}
                      className={cn("px-3 py-1 capitalize transition-colors",
                        trendPeriod === p ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                      )}>{p}</button>
                  ))}
                </div>
                <InlineDateRange from={trendDateFrom} to={trendDateTo} onFrom={setTrendDateFrom} onTo={setTrendDateTo} />
                <ExportMenu data={enrollmentByPeriod.map(d => ({ Period: d.day, Enrollments: d.enrollments }))} filename="enrollment-trend" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={enrollmentByPeriod} margin={{ top: 4, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}
                  angle={enrollmentByPeriod.length > 14 ? -30 : 0}
                  textAnchor={enrollmentByPeriod.length > 14 ? "end" : "middle"}
                  height={40} interval="preserveStartEnd" />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="enrollments" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#6366f1" }} name="Enrollments" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════
          SECTION 3 — LEARNER ENGAGEMENT
      ═══════════════════════════════════════════════ */}
      <div>
        <SectionLabel>Learner engagement</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">Enrollment vs Completion</CardTitle>
                  <div className="flex items-center gap-2">
                    <InlineDateRange from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
                    <ExportMenu data={filteredTrend.map((d: any) => ({ Month: d.month, Enrollments: d.enrollments, Completions: d.completions }))} filename="enroll-complete" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={filteredTrend} margin={{ top: 4, right: 16, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="gEnroll" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gComplete" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.18}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} angle={-25} textAnchor="end" height={40} interval="preserveStartEnd" />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Area type="monotone" dataKey="enrollments" stroke="#6366f1" fill="url(#gEnroll)" strokeWidth={2} name="Enrollments" />
                    <Area type="monotone" dataKey="completions" stroke="#10b981" fill="url(#gComplete)" strokeWidth={2} name="Completions" />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Learner Status</CardTitle>
              <p className="text-xs text-muted-foreground">Distribution across filtered learners</p>
            </CardHeader>
            <CardContent>
              {statusDistribution.length === 0 ? <EmptyState /> : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={44} outerRadius={70} paddingAngle={3} dataKey="value" animationDuration={500}>
                        {statusDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 space-y-2">
                    {statusDistribution.map(d => {
                      const pct = totalLearners > 0 ? Math.round((d.value / totalLearners) * 100) : 0;
                      return (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium tabular-nums">{d.value}</span>
                            <span className="text-muted-foreground/60 tabular-nums w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          SECTION 4 — COMPLETION ANALYSIS
      ═══════════════════════════════════════════════ */}
      <div>
        <SectionLabel>Completion analysis</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Completion Rate by Course</CardTitle>
                  <ExportMenu data={courseCompletionData.map((d: any) => ({ Course: d.fullName, Rate: d.rate }))} filename="completion-rates" />
                </div>
              </CardHeader>
              <CardContent>
                {courseCompletionData.length === 0 ? <EmptyState /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={courseCompletionData} margin={{ top: 4, right: 16, left: 0, bottom: 44 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={55} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={34} domain={[0,100]} tickFormatter={v => `${v}%`} />
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v}%`, "Rate"]} />
                      <Bar dataKey="rate" radius={[4,4,0,0]} name="Completion %">
                        {courseCompletionData.map((d: any, i: number) => (
                          <Cell key={i} fill={d.rate >= 70 ? "#10b981" : d.rate >= 40 ? "#f59e0b" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rate Distribution</CardTitle>
              <p className="text-xs text-muted-foreground">Courses grouped by completion bracket</p>
            </CardHeader>
            <CardContent>
              {courseCompletionData.length === 0 ? <EmptyState /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={completionHistogram} margin={{ top: 4, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={24} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [v, "Courses"]} />
                    <Bar dataKey="count" name="Courses" radius={[4,4,0,0]}>
                      {completionHistogram.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          SECTION 5 — FUNNEL + ORG RATES
      ═══════════════════════════════════════════════ */}
      <div>
        <SectionLabel>Funnel & organisation performance</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Learner Progression Funnel</CardTitle>
              <p className="text-xs text-muted-foreground">Drop-off at each stage</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {funnelData.map((stage, i) => {
                const pct     = funnelData[0].value > 0 ? Math.round((stage.value / funnelData[0].value) * 100) : 0;
                const isEmpty = stage.value === 0;
                return (
                  <div key={stage.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={cn("text-xs font-medium", isEmpty && "text-muted-foreground")}>{stage.name}</span>
                      <span className={cn("text-xs tabular-nums font-semibold", isEmpty && "text-muted-foreground")}>{stage.value}</span>
                    </div>
                    <div className="h-6 rounded-md bg-muted overflow-hidden">
                      <div className="h-full rounded-md transition-all duration-500"
                        style={{ width: isEmpty ? "100%" : `${Math.max(pct, 4)}%`, background: isEmpty ? "hsl(var(--muted-foreground) / 0.2)" : stage.fill }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Completion Rate by Organisation</CardTitle>
                <ExportMenu data={orgCompletionRates.map(d => ({ Organisation: d.fullName, Rate: d.rate }))} filename="org-rates" />
              </div>
            </CardHeader>
            <CardContent>
              {orgCompletionRates.length === 0 ? <EmptyState /> : (
                <ResponsiveContainer width="100%" height={Math.max(200, orgCompletionRates.length * 46)}>
                  <BarChart data={orgCompletionRates} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} domain={[0,100]} tickFormatter={v => `${v}%`} />
                    <YAxis dataKey="name" type="category" width={115} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v}%`, "Completion rate"]} />
                    <Bar dataKey="rate" radius={[0,4,4,0]} name="Rate">
                      {orgCompletionRates.map((d, i) => (
                        <Cell key={i} fill={d.rate >= 70 ? "#10b981" : d.rate >= 40 ? "#6366f1" : "#f59e0b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          SECTION 6 — GEOGRAPHIC & CATEGORY
      ═══════════════════════════════════════════════ */}
      <div>
        <SectionLabel>Geographic & course breakdown</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Learners by County</CardTitle>
                  <ExportMenu data={countyData} filename="county-distribution" />
                </div>
                <p className="text-xs text-muted-foreground">Top 10 counties</p>
              </CardHeader>
              <CardContent>
                {countyData.length === 0 ? <EmptyState /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={countyData.slice(0,10)} margin={{ top: 4, right: 16, left: 0, bottom: 44 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={55} interval={0} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="count" radius={[4,4,0,0]} name="Learners">
                        {countyData.slice(0,10).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">By Category</CardTitle>
                <ExportMenu data={categoryData} filename="categories" />
              </div>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? <EmptyState /> : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={44} outerRadius={70} paddingAngle={3} dataKey="value" animationDuration={500}>
                        {categoryData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 space-y-1.5">
                    {categoryData.map((d: any, i: number) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-muted-foreground truncate max-w-[110px]">{d.name}</span>
                        </div>
                        <span className="font-medium tabular-nums">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          SECTION 7 — ORG PROGRESS + TOP COURSES
      ═══════════════════════════════════════════════ */}
      <div>
        <SectionLabel>Organisation progress & top courses</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Progress by Organisation</CardTitle>
                <ExportMenu data={orgData.map((d: any) => ({ Organisation: d.name, Completed: d.completed, "In Progress": d.inProgress }))} filename="org-progress" />
              </div>
            </CardHeader>
            <CardContent>
              {orgData.length === 0 ? <EmptyState /> : (
                <ResponsiveContainer width="100%" height={Math.max(200, orgData.length * 50)}>
                  <BarChart data={orgData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" width={115} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="completed"  stackId="a" fill="#6366f1" name="Completed" />
                    <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" radius={[0,4,4,0]} name="In Progress" />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Top Performing Courses</CardTitle>
                <ExportMenu data={topCourses.map((d: any) => ({ Course: d.fullName, Score: d.score }))} filename="top-courses" />
              </div>
            </CardHeader>
            <CardContent>
              {topCourses.length === 0 ? <EmptyState /> : (
                <ResponsiveContainer width="100%" height={Math.max(200, topCourses.length * 38)}>
                  <BarChart data={topCourses} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" width={150} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="score" radius={[0,4,4,0]} name="Enrollments">
                      {topCourses.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          SECTION 8 — TOP SCORERS
      ═══════════════════════════════════════════════ */}
      <div>
        <SectionLabel>Top scorers</SectionLabel>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base">Top 5 Scorers</CardTitle>
              </div>
              <div className="w-64">
                <SearchableSelect
                  value={filterTopCourse}
                  onValueChange={setFilterTopCourse}
                  options={topCourseOptions}
                  placeholder="All courses (avg. score)"
                  emptyMessage="No courses found."
                  triggerClassName="h-8 text-xs"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {filterTopCourse === "all"
                ? "Ranked by average quiz score across all enrolled courses"
                : "Ranked by quiz score on the selected course"}
            </p>
          </CardHeader>
          <CardContent>
            {topScorersLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : topScorers.length === 0 ? (
              <EmptyState message="No quiz scores recorded yet for this selection." />
            ) : (
              <div className="space-y-3">
                {topScorers.map((s, idx) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const medal  = medals[idx] ?? `#${idx + 1}`;
                  const barColor =
                    s.score >= 80 ? "bg-emerald-500" :
                    s.score >= 60 ? "bg-amber-400"   : "bg-rose-400";
                  const scoreColor =
                    s.score >= 80 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" :
                    s.score >= 60 ? "text-amber-600 bg-amber-50 dark:bg-amber-950/40"       :
                    "text-rose-600 bg-rose-50 dark:bg-rose-950/40";
                  return (
                    <div key={s.userId} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <span className="text-xl w-8 text-center flex-shrink-0 select-none">{medal}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight truncate">{s.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {s.organization ?? "—"}
                              {filterTopCourse === "all" && s.coursesCompleted !== undefined && (
                                <span className="ml-2 text-muted-foreground/60">· {s.coursesCompleted} course{s.coursesCompleted !== 1 ? "s" : ""} completed</span>
                              )}
                              {filterTopCourse !== "all" && s.courseTitle && (
                                <span className="ml-2 text-muted-foreground/60">· {s.courseTitle}</span>
                              )}
                            </p>
                          </div>
                          <span className={cn("text-sm font-bold tabular-nums px-2.5 py-0.5 rounded-full flex-shrink-0", scoreColor)}>
                            {s.score}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${s.score}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════
          SECTION 9 — ROLE-SEGMENTED REPORTS
      ═══════════════════════════════════════════════ */}
      <div>
        <SectionLabel>Role-segmented reports</SectionLabel>

        {/* Completions by Role */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {filterAudience !== "healthcare_provider" && (
            <Card className="h-full lg:col-span-1">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Staff by Designation</CardTitle>
                  <CardDescription>Role distribution breakdown</CardDescription>
                </div>
                <ExportMenu data={(rd?.staffByDesignation ?? []).map((d: any) => ({ Designation: d.name, Count: d.count }))} filename="staff-by-designation" />
              </CardHeader>
              <CardContent className="flex flex-col justify-center">
                {(rd?.staffByDesignation ?? []).length === 0 ? (
                  <EmptyState message="No staff data matching filters." />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={rd.staffByDesignation} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="count" animationDuration={500}>
                          {rd.staffByDesignation.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5">
                      {rd.staffByDesignation.map((d: any, i: number) => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="font-semibold tabular-nums">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card className={cn("h-full", filterAudience !== "healthcare_provider" ? "lg:col-span-2" : "lg:col-span-3")}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Completions by Portal Role</CardTitle>
                <CardDescription>Enrollments versus completed courses</CardDescription>
              </div>
              <ExportMenu data={(rd?.completionByRole ?? []).map((d: any) => ({ Role: d.role, Enrollments: d.enrollments, Completions: d.completions }))} filename="role-completion" />
            </CardHeader>
            <CardContent>
              {(rd?.completionByRole ?? []).length === 0 ? (
                <EmptyState message="No completion data found." />
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={rd.completionByRole} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="role" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => v.replace(/_/g, " ").toUpperCase()} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="enrollments" fill="#8b5cf6" radius={[4,4,0,0]} name="Total Enrollments" />
                    <Bar dataKey="completions" fill="#10b981" radius={[4,4,0,0]} name="Completed Courses" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* HP by County & HP by Facility */}
        {filterAudience !== "internal_staff" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Providers by County</CardTitle>
                  <CardDescription>Registered healthcare providers by county</CardDescription>
                </div>
                <ExportMenu data={(rd?.hpByCounty ?? []).map((d: any) => ({ County: d.name, Count: d.count }))} filename="providers-by-county" />
              </CardHeader>
              <CardContent>
                {(rd?.hpByCounty ?? []).length === 0 ? (
                  <EmptyState message="No provider data matching filters." />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={(rd?.hpByCounty ?? []).slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} name="Providers" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Providers by Facility (Top 8)</CardTitle>
                  <CardDescription>Top facilities by provider count</CardDescription>
                </div>
                <ExportMenu data={(rd?.hpByFacility ?? []).map((d: any) => ({ Facility: d.name, Count: d.count }))} filename="providers-by-facility" />
              </CardHeader>
              <CardContent>
                {(rd?.hpByFacility ?? []).length === 0 ? (
                  <EmptyState message="No provider data matching filters." />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={(rd?.hpByFacility ?? []).slice(0, 8)} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" width={110} stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => v.length > 18 ? v.slice(0, 16) + "…" : v} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="count" fill="#10b981" radius={[0,4,4,0]} name="Providers" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Category Performance */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Category Performance by Audience</CardTitle>
              <CardDescription>Activity split across training course categories</CardDescription>
            </div>
            <ExportMenu data={(rd?.categoryPerformance ?? []).map((d: any) => ({ Category: d.name, Audience: d.audienceType, Courses: d.courses, Enrollments: d.enrollments, Completions: d.completions }))} filename="category-performance" />
          </CardHeader>
          <CardContent>
            {(rd?.categoryPerformance ?? []).length === 0 ? (
              <EmptyState message="No categories / enrollments found." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={rd.categoryPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    labelFormatter={(label, items) => {
                      const item = items[0]?.payload;
                      return `${label} (${item?.audienceType?.replace(/_/g, " ") || ""})`;
                    }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="courses"      fill="#f59e0b" radius={[4,4,0,0]} name="Courses Count" />
                  <Bar dataKey="enrollments"  fill="#3b82f6" radius={[4,4,0,0]} name="Enrollments" />
                  <Bar dataKey="completions"  fill="#10b981" radius={[4,4,0,0]} name="Completions" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default AdminDashboard;
