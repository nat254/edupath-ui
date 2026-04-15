import { useState, useMemo, useCallback, useSyncExternalStore } from "react";
import { courseStore } from "@/data/courseStore";
import { learnerStore } from "@/data/learnerStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  BookOpen, Users, TrendingUp, TrendingDown, Award, BarChart3, Filter, RotateCcw,
  ChevronDown, ChevronUp, Download, CalendarIcon, Activity, Clock, UserCheck, FileSpreadsheet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, Brush, LineChart, Line,
} from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#8884d8", "#82ca9d",
  "#ffc658", "#ff7c7c", "#a4de6c",
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const generateMonthlyTrend = () => {
  const data: { month: string; date: Date; enrollments: number; completions: number }[] = [];
  for (let y = 2024; y <= 2026; y++) {
    const months = y === 2026 ? 4 : 12;
    for (let m = 0; m < months; m++) {
      data.push({
        month: `${MONTHS[m]} ${y}`,
        date: new Date(y, m, 15),
        enrollments: Math.floor(Math.random() * 80) + 10,
        completions: Math.floor(Math.random() * 50) + 5,
      });
    }
  }
  return data;
};

const generateDailyTrend = () => {
  const data: { day: string; date: Date; enrollments: number }[] = [];
  const now = new Date();
  for (let i = 90; i >= 0; i--) {
    const d = subDays(now, i);
    data.push({
      day: format(d, "MMM dd"),
      date: d,
      enrollments: Math.floor(Math.random() * 15) + 1,
    });
  }
  return data;
};

// Sparkline mini component
const Sparkline = ({ data, color, height = 30, width = 80 }: { data: number[]; color: string; height?: number; width?: number }) => {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const TABLE_PAGE_SIZE = 5;

// Export helpers
const downloadCSV = (data: Record<string, unknown>[], filename: string) => {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(","), ...data.map(row => headers.map(h => `"${row[h] ?? ""}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const downloadXLSX = (data: Record<string, unknown>[], filename: string) => {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

const ExportButtons = ({ data, filename }: { data: Record<string, unknown>[]; filename: string }) => (
  <div className="flex gap-1">
    <Button variant="ghost" size="sm" onClick={() => downloadCSV(data, filename)} title="Export CSV">
      <Download className="h-3.5 w-3.5" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => downloadXLSX(data, filename)} title="Export Excel">
      <FileSpreadsheet className="h-3.5 w-3.5" />
    </Button>
  </div>
);

const tooltipStyle = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" };

const AdminDashboard = () => {
  const navigate = useNavigate();
  const courses = useSyncExternalStore(courseStore.subscribe, courseStore.getAll);
  const learners = useSyncExternalStore(learnerStore.subscribe, learnerStore.getAll);

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterOrg, setFilterOrg] = useState("all");
  const [filterCounty, setFilterCounty] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchLearner, setSearchLearner] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [trendPeriod, setTrendPeriod] = useState<"week" | "month" | "year">("month");

  // Pagination
  const [coursePage, setCoursePage] = useState(1);
  const [learnerPage, setLearnerPage] = useState(1);

  const uniqueOrgs = useMemo(() => [...new Set(learners.map((l) => l.organization.split(" - ")[0]))], [learners]);
  const uniqueCounties = useMemo(() => [...new Set(learners.map((l) => l.county).filter(Boolean))], [learners]);
  const uniqueCategories = useMemo(() => [...new Set(courses.map((c) => c.category))], [courses]);

  const resetFilters = useCallback(() => {
    setFilterOrg("all"); setFilterCounty("all"); setFilterCategory("all");
    setSearchLearner(""); setDateFrom(undefined); setDateTo(undefined);
  }, []);

  const filteredLearners = useMemo(() => {
    return learners.filter((l) => {
      const orgName = l.organization.split(" - ")[0];
      if (filterOrg !== "all" && orgName !== filterOrg) return false;
      if (filterCounty !== "all" && l.county !== filterCounty) return false;
      if (searchLearner && !l.name.toLowerCase().includes(searchLearner.toLowerCase()) && !l.email.toLowerCase().includes(searchLearner.toLowerCase())) return false;
      return true;
    });
  }, [learners, filterOrg, filterCounty, searchLearner]);

  const filteredCourses = useMemo(() => {
    if (filterCategory === "all") return courses;
    return courses.filter((c) => c.category === filterCategory);
  }, [courses, filterCategory]);

  // Generate data once
  const monthlyTrend = useMemo(() => generateMonthlyTrend(), []);
  const dailyTrend = useMemo(() => generateDailyTrend(), []);

  // Date filtered trend
  const filteredTrend = useMemo(() => {
    let data = monthlyTrend;
    if (dateFrom || dateTo) {
      data = data.filter(d => {
        if (dateFrom && d.date < startOfDay(dateFrom)) return false;
        if (dateTo && d.date > endOfDay(dateTo)) return false;
        return true;
      });
    }
    return data;
  }, [monthlyTrend, dateFrom, dateTo]);

  // Stats
  const totalCompleted = filteredLearners.reduce((s, l) => s + l.coursesCompleted, 0);
  const totalInProgress = filteredLearners.reduce((s, l) => s + l.coursesInProgress, 0);
  const completionRate = filteredLearners.length
    ? Math.round((totalCompleted / (totalCompleted + totalInProgress || 1)) * 100) : 0;
  const activeLearners = filteredLearners.filter(l => l.coursesInProgress > 0).length;

  // Recent enrollments (last 7 and 30 days from daily trend)
  const recentEnrollments7 = dailyTrend.slice(-7).reduce((s, d) => s + d.enrollments, 0);
  const recentEnrollments30 = dailyTrend.slice(-30).reduce((s, d) => s + d.enrollments, 0);
  const prevEnrollments7 = dailyTrend.slice(-14, -7).reduce((s, d) => s + d.enrollments, 0);

  // Sparkline data for KPIs
  const completionSparkline = monthlyTrend.slice(-8).map(d => d.completions);
  const learnerSparkline = monthlyTrend.slice(-8).map(d => d.enrollments);

  // KPI cards config
  const kpis = [
    {
      label: "Total Learners", value: filteredLearners.length, icon: Users,
      trend: filteredLearners.length > 3 ? 12 : -5, sparkline: learnerSparkline,
      color: "text-primary", bg: "bg-primary/10",
    },
    {
      label: "Active Learners", value: activeLearners, icon: UserCheck,
      trend: activeLearners > 2 ? 8 : -3, sparkline: learnerSparkline.map(v => Math.floor(v * 0.6)),
      color: "text-emerald-600", bg: "bg-emerald-500/10",
    },
    {
      label: "Total Courses", value: filteredCourses.length, icon: BookOpen,
      trend: 5, sparkline: [3, 3, 4, 4, 4, 5, 5, filteredCourses.length],
      color: "text-violet-600", bg: "bg-violet-500/10",
    },
    {
      label: "Courses Completed", value: totalCompleted, icon: Award,
      trend: 15, sparkline: completionSparkline,
      color: "text-blue-600", bg: "bg-blue-500/10",
    },
    {
      label: "Courses In Progress", value: totalInProgress, icon: Clock,
      trend: totalInProgress > 5 ? 10 : -2, sparkline: completionSparkline.map(v => Math.floor(v * 0.5)),
      color: "text-amber-600", bg: "bg-amber-500/10",
    },
    {
      label: "Completion Rate", value: `${completionRate}%`, icon: TrendingUp,
      trend: completionRate > 50 ? 4 : -8, sparkline: monthlyTrend.slice(-8).map((_, i) => 40 + i * 5 + Math.floor(Math.random() * 10)),
      color: "text-teal-600", bg: "bg-teal-500/10",
    },
    {
      label: "Recent Enrollments (7d)", value: recentEnrollments7, icon: Activity,
      trend: prevEnrollments7 ? Math.round(((recentEnrollments7 - prevEnrollments7) / prevEnrollments7) * 100) : 10,
      sparkline: dailyTrend.slice(-7).map(d => d.enrollments),
      color: "text-rose-600", bg: "bg-rose-500/10",
      subtitle: `${recentEnrollments30} in 30 days`,
    },
  ];

  // Chart data
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredCourses.forEach((c) => { map[c.category] = (map[c.category] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredCourses]);

  const orgData = useMemo(() => {
    const map: Record<string, { completed: number; inProgress: number }> = {};
    filteredLearners.forEach((l) => {
      const org = l.organization.split(" - ")[0];
      if (!map[org]) map[org] = { completed: 0, inProgress: 0 };
      map[org].completed += l.coursesCompleted;
      map[org].inProgress += l.coursesInProgress;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, total: v.completed + v.inProgress }))
      .sort((a, b) => b.total - a.total);
  }, [filteredLearners]);

  const countyData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLearners.forEach((l) => { if (l.county) map[l.county] = (map[l.county] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filteredLearners]);

  // Course completion rates chart
  const courseCompletionData = useMemo(() => {
    return filteredCourses.map(c => {
      const total = filteredLearners.length || 1;
      const completed = Math.floor(Math.random() * total * 0.8);
      return { name: c.title.length > 20 ? c.title.substring(0, 20) + "…" : c.title, fullName: c.title, rate: Math.round((completed / total) * 100) };
    }).sort((a, b) => b.rate - a.rate);
  }, [filteredCourses, filteredLearners]);

  // Progress overview stacked bar
  const progressOverview = useMemo(() => {
    return filteredCourses.map(c => {
      const comp = Math.floor(Math.random() * 30) + 5;
      const prog = Math.floor(Math.random() * 20) + 2;
      return { name: c.title.length > 18 ? c.title.substring(0, 18) + "…" : c.title, fullName: c.title, completed: comp, inProgress: prog };
    });
  }, [filteredCourses]);

  // Top performing horizontal bar
  const topCourses = useMemo(() => {
    return filteredCourses.map(c => ({
      name: c.title.length > 25 ? c.title.substring(0, 25) + "…" : c.title,
      fullName: c.title,
      score: Math.floor(Math.random() * 50) + 50,
    })).sort((a, b) => b.score - a.score).slice(0, 10);
  }, [filteredCourses]);

  // Enrollment trend by period
  const enrollmentByPeriod = useMemo((): { day: string; enrollments: number }[] => {
    if (trendPeriod === "week") return dailyTrend.slice(-7).map(d => ({ day: d.day, enrollments: d.enrollments }));
    if (trendPeriod === "year") {
      const map: Record<string, number> = {};
      monthlyTrend.forEach(d => {
        const yr = d.month.split(" ")[1];
        map[yr] = (map[yr] || 0) + d.enrollments;
      });
      return Object.entries(map).map(([day, enrollments]) => ({ day, enrollments }));
    }
    return dailyTrend.slice(-30).map(d => ({ day: d.day, enrollments: d.enrollments }));
  }, [trendPeriod, dailyTrend, monthlyTrend]);

  // Paginated tables
  const paginatedCourses = filteredCourses.slice((coursePage - 1) * TABLE_PAGE_SIZE, coursePage * TABLE_PAGE_SIZE);
  const coursePages = Math.max(1, Math.ceil(filteredCourses.length / TABLE_PAGE_SIZE));
  const paginatedLearners = filteredLearners.slice((learnerPage - 1) * TABLE_PAGE_SIZE, learnerPage * TABLE_PAGE_SIZE);
  const learnerPages = Math.max(1, Math.ceil(filteredLearners.length / TABLE_PAGE_SIZE));

  const hasActiveFilters = filterOrg !== "all" || filterCounty !== "all" || filterCategory !== "all" || searchLearner !== "" || dateFrom || dateTo;

  // Global export data
  const globalExportData = filteredLearners.map(l => ({
    Name: l.name, Email: l.email, Organization: l.organization, County: l.county,
    "Courses Completed": l.coursesCompleted, "Courses In Progress": l.coursesInProgress,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadCSV(globalExportData, "dashboard-export")}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => downloadXLSX(globalExportData, "dashboard-export")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
          </Button>
          <Button onClick={() => navigate("/courses/create")}>+ Create Course</Button>
        </div>
      </div>

      {/* Collapsible Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" /> Filters
                  {hasActiveFilters && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Active</span>}
                </span>
                {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Organization</Label>
                  <Select value={filterOrg} onValueChange={(v) => { setFilterOrg(v); setLearnerPage(1); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organizations</SelectItem>
                      {uniqueOrgs.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">County</Label>
                  <Select value={filterCounty} onValueChange={(v) => { setFilterCounty(v); setLearnerPage(1); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Counties</SelectItem>
                      {uniqueCounties.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Course Category</Label>
                  <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCoursePage(1); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {uniqueCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Search Learner</Label>
                  <Input placeholder="Name or email..." value={searchLearner} onChange={(e) => { setSearchLearner(e.target.value); setLearnerPage(1); }} />
                </div>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="mt-3" onClick={resetFilters}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset Filters
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", kpi.bg)}>
                  <kpi.icon className={cn("h-4.5 w-4.5", kpi.color)} />
                </div>
                <div className={cn("flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5",
                  kpi.trend >= 0 ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
                )}>
                  {kpi.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(kpi.trend)}%
                </div>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
              {kpi.subtitle && <p className="text-[10px] text-muted-foreground">{kpi.subtitle}</p>}
              <div className="mt-2">
                <Sparkline data={kpi.sparkline} color={kpi.trend >= 0 ? "#10b981" : "#ef4444"} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enrollment Trends with period filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" /> Enrollment Trends
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={trendPeriod} onValueChange={(v: "week" | "month" | "year") => setTrendPeriod(v)}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <ExportButtons data={enrollmentByPeriod.map(d => ({ Period: d.day, Enrollments: d.enrollments }))} filename="enrollment-trends" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={enrollmentByPeriod}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-35} textAnchor="end" height={50} interval="preserveStartEnd" />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="enrollments" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Enrollments" animationDuration={600} />
              {enrollmentByPeriod.length > 15 && (
                <Brush dataKey="day" height={25} stroke="hsl(var(--primary))" fill="hsl(var(--muted))" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Enrollment & Completion Area + Course Completion Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Enrollment & Completion Over Time</CardTitle>
              <ExportButtons data={filteredTrend.map(d => ({ Month: d.month, Enrollments: d.enrollments, Completions: d.completions }))} filename="enrollment-completion" />
            </div>
            <p className="text-xs text-muted-foreground">Drag brush to zoom into time range</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={filteredTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-35} textAnchor="end" height={50} interval="preserveStartEnd" />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="enrollments" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} name="Enrollments" animationDuration={600} />
                <Area type="monotone" dataKey="completions" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.15} strokeWidth={2} name="Completions" animationDuration={600} />
                <Legend />
                <Brush dataKey="month" height={25} stroke="hsl(var(--primary))" fill="hsl(var(--muted))" startIndex={Math.max(0, filteredTrend.length - 12)} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Course Completion Rates</CardTitle>
              <ExportButtons data={courseCompletionData.map(d => ({ Course: d.fullName, "Completion %": d.rate }))} filename="completion-rates" />
            </div>
          </CardHeader>
          <CardContent>
            {courseCompletionData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={courseCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-25} textAnchor="end" height={60} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, "Completion Rate"]} />
                  <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} animationDuration={500} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Org Distribution + Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Learner Distribution by Organization</CardTitle>
              <ExportButtons data={orgData.map(d => ({ Organization: d.name, Completed: d.completed, "In Progress": d.inProgress }))} filename="org-distribution" />
            </div>
          </CardHeader>
          <CardContent>
            {orgData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={orgData.map(d => ({ name: d.name, value: d.total }))} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} animationDuration={600}>
                    {orgData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} className="cursor-pointer" />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Progress Overview</CardTitle>
              <ExportButtons data={progressOverview.map(d => ({ Course: d.fullName, Completed: d.completed, "In Progress": d.inProgress }))} filename="progress-overview" />
            </div>
            <p className="text-xs text-muted-foreground">Completed vs In Progress per course</p>
          </CardHeader>
          <CardContent>
            {progressOverview.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={progressOverview}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-25} textAnchor="end" height={60} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="completed" stackId="a" fill="hsl(var(--primary))" name="Completed" animationDuration={500} />
                  <Bar dataKey="inProgress" stackId="a" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="In Progress" animationDuration={500} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Courses + Courses by Category + County */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Top Performing Courses</CardTitle>
              <ExportButtons data={topCourses.map(d => ({ Course: d.fullName, Score: d.score }))} filename="top-courses" />
            </div>
          </CardHeader>
          <CardContent>
            {topCourses.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(250, topCourses.length * 40)}>
                <BarChart data={topCourses} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={130} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="score" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Score" animationDuration={500} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Courses by Category</CardTitle>
              <ExportButtons data={categoryData} filename="courses-by-category" />
            </div>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={4} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} animationDuration={600}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} className="cursor-pointer" />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Learners by County</CardTitle>
              <ExportButtons data={countyData} filename="learners-by-county" />
            </div>
          </CardHeader>
          <CardContent>
            {countyData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={countyData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={9} angle={-40} textAnchor="end" height={55} interval={0} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Learners" animationDuration={500} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Courses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Courses {filterCategory !== "all" && <span className="text-sm font-normal text-muted-foreground">— filtered by {filterCategory}</span>}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCourses.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/courses/${c.id}`)}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell>{c.duration}</TableCell>
                </TableRow>
              ))}
              {paginatedCourses.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No courses found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {coursePages > 1 && (
            <div className="flex justify-between items-center mt-3 text-sm">
              <span className="text-muted-foreground">Page {coursePage} of {coursePages} ({filteredCourses.length} total)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={coursePage === 1} onClick={() => setCoursePage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={coursePage === coursePages} onClick={() => setCoursePage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learner Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Learner Overview
            {hasActiveFilters && <span className="text-sm font-normal text-muted-foreground ml-2">({filteredLearners.length} of {learners.length})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>County</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>In Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLearners.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.organization}</TableCell>
                  <TableCell>{l.county}</TableCell>
                  <TableCell>{l.coursesCompleted}</TableCell>
                  <TableCell>{l.coursesInProgress}</TableCell>
                </TableRow>
              ))}
              {paginatedLearners.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No learners match filters</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {learnerPages > 1 && (
            <div className="flex justify-between items-center mt-3 text-sm">
              <span className="text-muted-foreground">Page {learnerPage} of {learnerPages} ({filteredLearners.length} total)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={learnerPage === 1} onClick={() => setLearnerPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={learnerPage === learnerPages} onClick={() => setLearnerPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
