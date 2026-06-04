import { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { userStore } from "@/data/userStore";
import { PlatformUser, UserRole, Designation } from "@/data/types";
import organizations from "@/data/facilities.json";
import kenyanCounties from "@/data/kenyanCounties.json";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Pencil, Trash2, Plus, Download, Search, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, Users, BookOpen, Award, Clock, FileSpreadsheet,
  X, CheckSquare, Square, Minus, Eye, ArrowUpDown, Loader2, ShieldCheck, ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Small helpers ────────────────────────────────────────────────────────────

const getStatus = (u: PlatformUser): { label: string; color: string } => {
  if (u.coursesCompleted === 0 && u.coursesInProgress === 0)
    return { label: "Not started", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" };
  if (u.coursesInProgress > 0)
    return { label: "Active in courses", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" };
  return { label: "Completed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" };
};

const getCompletionRate = (u: PlatformUser) => {
  const total = u.coursesCompleted + u.coursesInProgress;
  return total === 0 ? 0 : Math.round((u.coursesCompleted / total) * 100);
};

const CompletionBar = ({ user }: { user: PlatformUser }) => {
  const rate = getCompletionRate(user);
  const color = rate >= 70 ? "bg-emerald-500" : rate >= 40 ? "bg-amber-400" : rate > 0 ? "bg-blue-400" : "bg-slate-200";
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{rate}%</span>
    </div>
  );
};

const Avatar = ({ name }: { name: string }) => {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 select-none animate-fade-in"
      style={{ background: `hsl(${hue},60%,90%)`, color: `hsl(${hue},60%,35%)` }}
    >
      {initials || "?"}
    </div>
  );
};

type SortKey = "name" | "email" | "organization" | "county" | "designation" | "coursesCompleted" | "coursesInProgress";

const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: "asc" | "desc" }) => {
  if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30 inline" />;
  return sortDir === "asc"
    ? <ChevronUp className="h-3 w-3 ml-1 text-primary inline animate-bounce-subtle" />
    : <ChevronDown className="h-3 w-3 ml-1 text-primary inline animate-bounce-subtle" />;
};

const DESIGNATIONS = ["Tech Support", "Call Center", "Customer Delivery"] as const;

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

type QuizAttempt   = { score: number; attemptedAt: string };
type QuizScoreRow  = { courseId: string; courseTitle: string; quizScore: number | null; progress: number; completedAt: string | null; attempts: QuizAttempt[] };

// ─── Main Component ───────────────────────────────────────────────────────────

const UsersPage = () => {
  const users = useSyncExternalStore(userStore.subscribe, userStore.getAll);
  const isLoading = useSyncExternalStore(userStore.subscribe, userStore.getIsLoading);

  // Active Tab
  const [activeTab, setActiveTab] = useState<UserRole>("healthcare_provider");

  // Fetch on mount / when activeTab changes
  useEffect(() => {
    userStore.fetchAll(activeTab);
  }, [activeTab]);

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    role: "healthcare_provider" as UserRole,
    name: "",
    email: "",
    nationalId: "",
    organization: "",
    county: "",
    designation: "" as Designation | string,
    pin: "",
    confirmPin: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ── View/Detail state ─────────────────────────────────────────────────────
  const [viewTarget, setViewTarget] = useState<PlatformUser | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [quizScores, setQuizScores] = useState<QuizScoreRow[]>([]);
  const [quizScoresLoading, setQuizScoresLoading] = useState(false);

  // ── Table controls ────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterOrg, setFilterOrg] = useState("all");
  const [filterCounty, setFilterCounty] = useState("all");
  const [filterDesignation, setFilterDesignation] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // ── Selection (bulk actions) ──────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset page & selection when changing tabs or filters
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [activeTab, search, filterOrg, filterCounty, filterDesignation]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => {
      // Must match role of current tab
      if (u.role !== activeTab) return false;

      // Search term match
      if (q && 
        !u.name.toLowerCase().includes(q) && 
        !u.email.toLowerCase().includes(q) && 
        !(u.nationalId && u.nationalId.includes(q)) &&
        !(u.designation && u.designation.toLowerCase().includes(q))
      ) return false;

      // Role specific filters
      if (activeTab === "healthcare_provider") {
        if (filterOrg !== "all" && u.organization !== filterOrg) return false;
        if (filterCounty !== "all" && u.county !== filterCounty) return false;
      } else if (activeTab === "internal_staff") {
        if (filterDesignation !== "all" && u.designation !== filterDesignation) return false;
      }

      return true;
    });
  }, [users, activeTab, search, filterOrg, filterCounty, filterDesignation]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    const cmp = typeof av === "number" && typeof bv === "number"
      ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""));
    return sortDir === "asc" ? cmp : -cmp;
  }), [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs
  const stats = useMemo(() => {
    const hpList = users.filter(u => u.role === "healthcare_provider");
    const staffList = users.filter(u => u.role === "internal_staff");
    return {
      hpTotal: hpList.length,
      hpActive: hpList.filter(u => u.isActive).length,
      staffTotal: staffList.length,
      staffActive: staffList.filter(u => u.isActive).length,
    };
  }, [users]);

  // Uniques for filters
  const uniqueOrgs = useMemo(() => {
    const orgs = users.filter(u => u.role === "healthcare_provider" && u.organization).map(u => u.organization!);
    return [...new Set(orgs)];
  }, [users]);

  const uniqueCounties = useMemo(() => {
    const counties = users.filter(u => u.role === "healthcare_provider" && u.county).map(u => u.county!);
    return [...new Set(counties)];
  }, [users]);

  const filterOrgOptions = useMemo(() => [
    { value: "all", label: "All Facilities" },
    ...uniqueOrgs.map(o => ({ value: o, label: o }))
  ], [uniqueOrgs]);

  const filterCountyOptions = useMemo(() => [
    { value: "all", label: "All Counties" },
    ...uniqueCounties.map(c => ({ value: c, label: c }))
  ], [uniqueCounties]);

  const filterDesignationOptions = [
    { value: "all", label: "All Designations" },
    ...DESIGNATIONS.map(d => ({ value: d, label: d }))
  ];

  const formOrgOptions = useMemo(() => organizations.map(o => ({ value: o.name, label: o.name })), []);
  const formCountyOptions = useMemo(() => kenyanCounties.map(c => ({ value: c, label: c })), []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openView = async (u: PlatformUser) => {
    setViewTarget(u);
    setViewOpen(true);
    setQuizScores([]);
    setQuizScoresLoading(true);
    try {
      const res = await fetch(`${BASE}/quiz-scores/${u.id}`);
      if (res.ok) setQuizScores(await res.json());
    } catch { /* silently ignore */ }
    finally { setQuizScoresLoading(false); }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({
      role: activeTab,
      name: "",
      email: "",
      nationalId: "",
      organization: "",
      county: "",
      designation: "",
      pin: "1234",
      confirmPin: "1234",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (u: PlatformUser) => {
    setEditId(u.id);
    setForm({
      role: u.role,
      name: u.name,
      email: u.email,
      nationalId: u.nationalId ?? "",
      organization: u.organization ?? "",
      county: u.county ?? "",
      designation: u.designation ?? "",
      pin: "", // PIN won't be edited here
      confirmPin: "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email";

    if (!editId) {
      if (!/^\d{4}$/.test(form.pin)) e.pin = "PIN must be 4 digits";
      if (form.pin !== form.confirmPin) e.confirmPin = "PINs do not match";
    }

    if (form.role === "healthcare_provider") {
      if (!form.nationalId.trim()) e.nationalId = "National ID is required";
      if (!form.organization) e.organization = "Facility is required";
      if (!form.county) e.county = "County is required";
    } else {
      if (!form.designation) e.designation = "Designation is required";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editId) {
        // Edit payload
        const payload: any = {
          name: form.name.trim(),
          email: form.email.trim(),
        };
        if (form.role === "healthcare_provider") {
          payload.nationalId = form.nationalId.trim();
          payload.organization = form.organization;
          payload.county = form.county;
        } else {
          payload.designation = form.designation;
        }
        await userStore.update(editId, payload);
        toast.success("User updated successfully");
      } else {
        // Create payload
        const payload: any = {
          role: form.role,
          name: form.name.trim(),
          email: form.email.trim(),
          pin: form.pin,
        };
        if (form.role === "healthcare_provider") {
          payload.nationalId = form.nationalId.trim();
          payload.organization = form.organization;
          payload.county = form.county;
        } else {
          payload.designation = form.designation;
        }
        await userStore.add(payload);
        toast.success("User created successfully");
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const toggleActiveStatus = async (user: PlatformUser) => {
    const nextStatus = !user.isActive;
    try {
      await userStore.toggleStatus(user.id, nextStatus);
      toast.success(`Account for "${user.name}" has been ${nextStatus ? "activated" : "deactivated"}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update account status");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await userStore.remove(id);
      setSelected(s => { const n = new Set(s); n.delete(id); return n; });
      toast.success(`"${name}" has been removed`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete user");
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  // Selection handlers
  const toggleSelect = (id: string) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const allOnPageSelected = paginated.length > 0 && paginated.every(u => selected.has(u.id));
  const someSelected = selected.size > 0;

  const toggleSelectAll = () => {
    if (allOnPageSelected) setSelected(s => { const n = new Set(s); paginated.forEach(u => n.delete(u.id)); return n; });
    else setSelected(s => { const n = new Set(s); paginated.forEach(u => n.add(u.id)); return n; });
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    try {
      await Promise.all(ids.map(id => userStore.remove(id)));
      toast.success(`${ids.length} account${ids.length > 1 ? "s" : ""} removed`);
      setSelected(new Set());
    } catch (err: any) {
      toast.error("Failed to delete some users");
    }
  };

  const [exporting, setExporting] = useState(false);

  const exportCSV = async (data = filtered) => {
    setExporting(true);
    const isHP = activeTab === "healthcare_provider";
    try {
      type EnrollmentRow = {
        userId: string; name: string; email: string; nationalId: string | null;
        organization: string | null; county: string | null;
        courseTitle: string | null; progress: number | null;
        quizScore: number | null; enrolledAt: string | null; completedAt: string | null;
      };

      const allowedIds = new Set(data.map(u => u.id));
      const res = await fetch(`${BASE}/enrollments/all?role=${activeTab}`);
      const allRows: EnrollmentRow[] = res.ok ? await res.json() : [];
      const enrollmentRows = allRows.filter(r => allowedIds.has(r.userId));

      const enrolledIds = new Set(enrollmentRows.map(r => r.userId));
      const noEnrollmentRows: EnrollmentRow[] = data
        .filter(u => !enrolledIds.has(u.id))
        .map(u => ({
          userId: u.id, name: u.name, email: u.email,
          nationalId: u.nationalId ?? null, organization: u.organization ?? null,
          county: u.county ?? null, courseTitle: null, progress: null,
          quizScore: null, enrolledAt: null, completedAt: null,
        }));

      const allCsvRows = [...enrollmentRows, ...noEnrollmentRows].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      const hpHeaders = ["Name", "Email", "National ID", "Facility Name", "County", "Role", "Active", "Course Title", "Progress %", "Status", "Quiz Score (%)", "Enrolled At", "Completed At"];
      const staffHeaders = ["Name", "Email", "Designation", "Role", "Active", "Course Title", "Progress %", "Status", "Quiz Score (%)", "Enrolled At", "Completed At"];
      const headers = isHP ? hpHeaders : staffHeaders;

      const escape = (v: string | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const userMap = new Map(data.map(u => [u.id, u]));

      const rows = allCsvRows.map(r => {
        const u = userMap.get(r.userId);
        const activeText = u?.isActive ? "Yes" : "No";
        let status = "Not Enrolled";
        if (r.courseTitle) {
          if (r.completedAt) status = "Completed";
          else if ((r.progress ?? 0) > 0) status = "In Progress";
          else status = "Enrolled";
        }
        const courseFields = [
          escape(r.courseTitle),
          r.progress !== null ? r.progress : "",
          escape(status),
          r.quizScore !== null ? r.quizScore : "",
          r.enrolledAt ? new Date(r.enrolledAt).toLocaleDateString("en-KE") : "",
          r.completedAt ? new Date(r.completedAt).toLocaleDateString("en-KE") : "",
        ];
        if (isHP) {
          return [
            escape(r.name), escape(r.email), escape(r.nationalId),
            escape(r.organization), escape(r.county),
            u?.role ?? "", activeText, ...courseFields,
          ].join(",");
        } else {
          return [
            escape(r.name), escape(r.email), escape(u?.designation),
            u?.role ?? "", activeText, ...courseFields,
          ].join(",");
        }
      });

      const csv = [headers.join(","), ...rows].join("\n");
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })),
        download: `${activeTab}_users.csv`,
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 100);
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = search || filterOrg !== "all" || filterCounty !== "all" || filterDesignation !== "all";

  return (
    <div className="space-y-5 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage healthcare providers and internal staff portal access.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportCSV()} disabled={filtered.length === 0 || exporting}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />} Export CSV
          </Button>
          <Button size="sm" onClick={openCreate} className="bg-primary hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add User
          </Button>
        </div>
      </div>

      {/* KPI Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Healthcare Providers", value: stats.hpTotal, desc: `${stats.hpActive} active`, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" },
          { label: "Internal Staff", value: stats.staffTotal, desc: `${stats.staffActive} active`, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
          { label: "Active Accounts", value: stats.hpActive + stats.staffActive, desc: "Can log in", icon: Award, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
          { label: "Deactivated", value: (stats.hpTotal + stats.staffTotal) - (stats.hpActive + stats.staffActive), desc: "Access revoked", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40" },
        ].map(s => (
          <Card key={s.label} className="overflow-hidden hover:shadow-md transition-all duration-200">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", s.bg)}>
                <s.icon className={cn("h-4 w-4", s.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums leading-none">{s.value}</p>
                <p className="text-[11px] font-medium text-foreground mt-0.5 truncate">{s.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{s.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val as UserRole); setSortKey("name"); }} className="w-full">
        <div className="flex items-center justify-between border-b pb-1">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="healthcare_provider" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Healthcare Providers
            </TabsTrigger>
            <TabsTrigger value="internal_staff" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Internal Staff
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-muted-foreground hidden sm:inline">
            {filtered.length} matching {activeTab.replace(/_/g, " ")} accounts
          </span>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap gap-2 items-center pt-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 text-sm pl-8 pr-8"
              placeholder={activeTab === "healthcare_provider" ? "Search name, email, ID…" : "Search name, email, designation…"}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {activeTab === "healthcare_provider" ? (
            <>
              <SearchableSelect
                value={filterOrg}
                onValueChange={setFilterOrg}
                options={filterOrgOptions}
                placeholder="All Facilities"
                emptyMessage="No facility found."
                triggerClassName="h-8 text-xs w-44"
              />
              <SearchableSelect
                value={filterCounty}
                onValueChange={setFilterCounty}
                options={filterCountyOptions}
                placeholder="All Counties"
                emptyMessage="No county found."
                triggerClassName="h-8 text-xs w-36"
              />
            </>
          ) : (
            <SearchableSelect
              value={filterDesignation}
              onValueChange={setFilterDesignation}
              options={filterDesignationOptions}
              placeholder="All Designations"
              emptyMessage="No designation found."
              triggerClassName="h-8 text-xs w-44"
            />
          )}

          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { setSearch(""); setFilterOrg("all"); setFilterCounty("all"); setFilterDesignation("all"); }}>
              Reset filters
            </Button>
          )}
        </div>

        {/* Bulk Actions Banner */}
        {someSelected && (
          <div className="flex items-center gap-3 px-3 py-2 mt-3 bg-primary/5 border border-primary/20 rounded-lg text-sm animate-slide-in">
            <span className="font-medium text-primary">{selected.size} selected</span>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="ghost" size="sm" className="h-7 text-xs hover:bg-primary/10" disabled={exporting} onClick={() => exportCSV(filtered.filter(u => selected.has(u.id)))}>
                {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />} Export selected
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="h-7 text-xs">
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete {selected.size}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selected.size} accounts?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone and will delete user records and progress.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelected(new Set())}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Providers Tab Content */}
        <TabsContent value="healthcare_provider" className="pt-3">
          <Card className="overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="w-10 px-3 py-3 text-left">
                      <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground transition-colors">
                        {allOnPageSelected
                          ? <CheckSquare className="h-4 w-4 text-primary" />
                          : someSelected && paginated.some(u => selected.has(u.id))
                            ? <Minus className="h-4 w-4 text-primary" />
                            : <Square className="h-4 w-4" />}
                      </button>
                    </th>
                    {([
                      ["name", "Healthcare Provider"],
                      ["organization", "Facility"],
                      ["county", "County"],
                      ["coursesCompleted", "Completed"],
                      ["coursesInProgress", "In Progress"],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th
                        key={key}
                        className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 cursor-pointer hover:text-foreground whitespace-nowrap select-none"
                        onClick={() => toggleSort(key)}
                      >
                        {label}<SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                      </th>
                    ))}
                    <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">Completion Rate</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">Login Status</th>
                    <th className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center text-muted-foreground py-16">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center text-muted-foreground py-16 text-sm">
                        {hasFilters ? "No healthcare providers match your filters." : "No healthcare providers found."}
                      </td>
                    </tr>
                  ) : paginated.map((u, idx) => {
                    const status = getStatus(u);
                    const isSelected = selected.has(u.id);
                    return (
                      <tr
                        key={u.id}
                        className={cn(
                          "border-b border-border/40 transition-colors group",
                          isSelected ? "bg-primary/5" : idx % 2 === 0 ? "hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30"
                        )}
                      >
                        <td className="px-3 py-3">
                          <button onClick={() => toggleSelect(u.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                            {isSelected
                              ? <CheckSquare className="h-4 w-4 text-primary" />
                              : <Square className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={u.name} />
                            <div className="min-w-0">
                              <div className="font-semibold text-sm leading-tight truncate max-w-[160px]">{u.name}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[160px]">{u.email}</div>
                              <div className="text-[10px] text-muted-foreground/60">ID: {u.nationalId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground max-w-[150px]">
                          <span className="truncate block">{u.organization}</span>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{u.county || "—"}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-xs font-semibold tabular-nums">
                            {u.coursesCompleted}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 text-xs font-semibold tabular-nums">
                            {u.coursesInProgress}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <CompletionBar user={u} />
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", status.color)}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <Switch checked={u.isActive} onCheckedChange={() => toggleActiveStatus(u)} />
                            <span className={cn("text-xs font-medium", u.isActive ? "text-emerald-600" : "text-red-500")}>
                              {u.isActive ? "Active" : "Disabled"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-0.5">
                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" title="View Details"
                              onClick={() => openView(u)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" title="Edit Profile"
                              onClick={() => openEdit(u)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-60 hover:opacity-100" title="Delete Profile">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove provider "{u.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>This will delete the account permanently.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(u.id, u.name)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/10">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length} results
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Staff Tab Content */}
        <TabsContent value="internal_staff" className="pt-3">
          <Card className="overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="w-10 px-3 py-3 text-left">
                      <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground transition-colors">
                        {allOnPageSelected
                          ? <CheckSquare className="h-4 w-4 text-primary" />
                          : someSelected && paginated.some(u => selected.has(u.id))
                            ? <Minus className="h-4 w-4 text-primary" />
                            : <Square className="h-4 w-4" />}
                      </button>
                    </th>
                    {([
                      ["name", "Internal Staff Member"],
                      ["designation", "Designation"],
                      ["coursesCompleted", "Completed"],
                      ["coursesInProgress", "In Progress"],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th
                        key={key}
                        className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 cursor-pointer hover:text-foreground whitespace-nowrap select-none"
                        onClick={() => toggleSort(key)}
                      >
                        {label}<SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                      </th>
                    ))}
                    <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">Completion Rate</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">Login Status</th>
                    <th className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted-foreground py-16">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted-foreground py-16 text-sm">
                        {hasFilters ? "No staff members match your filters." : "No staff members found."}
                      </td>
                    </tr>
                  ) : paginated.map((u, idx) => {
                    const status = getStatus(u);
                    const isSelected = selected.has(u.id);
                    return (
                      <tr
                        key={u.id}
                        className={cn(
                          "border-b border-border/40 transition-colors group",
                          isSelected ? "bg-primary/5" : idx % 2 === 0 ? "hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30"
                        )}
                      >
                        <td className="px-3 py-3">
                          <button onClick={() => toggleSelect(u.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                            {isSelected
                              ? <CheckSquare className="h-4 w-4 text-primary" />
                              : <Square className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={u.name} />
                            <div className="min-w-0">
                              <div className="font-semibold text-sm leading-tight truncate max-w-[180px]">{u.name}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 text-xs font-semibold">
                            {u.designation || "Unassigned"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-xs font-semibold tabular-nums">
                            {u.coursesCompleted}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 text-xs font-semibold tabular-nums">
                            {u.coursesInProgress}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <CompletionBar user={u} />
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", status.color)}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <Switch checked={u.isActive} onCheckedChange={() => toggleActiveStatus(u)} />
                            <span className={cn("text-xs font-medium", u.isActive ? "text-emerald-600" : "text-red-500")}>
                              {u.isActive ? "Active" : "Disabled"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-0.5">
                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" title="View Details"
                              onClick={() => openView(u)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" title="Edit Profile"
                              onClick={() => openEdit(u)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-60 hover:opacity-100" title="Delete Profile">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove staff account "{u.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>This will delete the account permanently.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(u.id, u.name)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/10">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length} results
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Add / Edit ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit User Profile" : "Create New User Account"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Role select (creation only) */}
            {!editId && (
              <div className="space-y-1.5">
                <Label className="text-xs">User Role / Portal Access *</Label>
                <Select
                  value={form.role}
                  onValueChange={(val) => setForm(p => ({ ...p, role: val as UserRole, designation: "", nationalId: "", organization: "", county: "" }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select portal role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthcare_provider">Healthcare Provider (National ID login)</SelectItem>
                    <SelectItem value="internal_staff">Internal Staff (Email login)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name *</Label>
              <Input
                className="h-9 text-sm"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Firstname Lastname"
              />
              {errors.name && <p className="text-destructive text-xs mt-0.5">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs">Email Address *</Label>
              <Input
                className="h-9 text-sm"
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="user@example.com"
              />
              {errors.email && <p className="text-destructive text-xs mt-0.5">{errors.email}</p>}
            </div>

            {/* Healthcare Provider Fields */}
            {form.role === "healthcare_provider" && (
              <>
                {/* National ID */}
                <div className="space-y-1.5">
                  <Label className="text-xs">National ID *</Label>
                  <Input
                    className="h-9 text-sm"
                    value={form.nationalId}
                    onChange={e => setForm(p => ({ ...p, nationalId: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    placeholder="12345678"
                    inputMode="numeric"
                  />
                  {errors.nationalId && <p className="text-destructive text-xs mt-0.5">{errors.nationalId}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Facility */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Facility Name (Organization) *</Label>
                    <SearchableSelect
                      value={form.organization}
                      onValueChange={v => setForm(p => ({ ...p, organization: v }))}
                      options={formOrgOptions}
                      placeholder="Select Facility"
                      emptyMessage="No facility found."
                      triggerClassName={cn("h-9 text-xs", errors.organization && "border-destructive")}
                    />
                    {errors.organization && <p className="text-destructive text-xs mt-0.5">{errors.organization}</p>}
                  </div>

                  {/* County */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">County *</Label>
                    <SearchableSelect
                      value={form.county}
                      onValueChange={v => setForm(p => ({ ...p, county: v }))}
                      options={formCountyOptions}
                      placeholder="Select County"
                      emptyMessage="No county found."
                      triggerClassName={cn("h-9 text-xs", errors.county && "border-destructive")}
                    />
                    {errors.county && <p className="text-destructive text-xs mt-0.5">{errors.county}</p>}
                  </div>
                </div>
              </>
            )}

            {/* Internal Staff Fields */}
            {form.role === "internal_staff" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Designation *</Label>
                <Select value={form.designation} onValueChange={v => setForm(p => ({ ...p, designation: v }))}>
                  <SelectTrigger className={cn("h-9", errors.designation && "border-destructive")}>
                    <SelectValue placeholder="Select staff role designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.designation && <p className="text-destructive text-xs mt-0.5">{errors.designation}</p>}
              </div>
            )}

            {/* PIN Setup (Creation only) */}
            {!editId && (
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Temporary PIN (4 digits) *</Label>
                  <Input
                    className="h-9 text-sm text-center font-mono"
                    type="password"
                    maxLength={4}
                    value={form.pin}
                    onChange={e => setForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, "") }))}
                    placeholder="1234"
                  />
                  {errors.pin && <p className="text-destructive text-xs mt-0.5">{errors.pin}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Confirm PIN *</Label>
                  <Input
                    className="h-9 text-sm text-center font-mono"
                    type="password"
                    maxLength={4}
                    value={form.confirmPin}
                    onChange={e => setForm(p => ({ ...p, confirmPin: e.target.value.replace(/\D/g, "") }))}
                    placeholder="1234"
                  />
                  {errors.confirmPin && <p className="text-destructive text-xs mt-0.5">{errors.confirmPin}</p>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm" disabled={saving}>Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {editId ? "Save Changes" : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: View Details ── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>User Profile Card</DialogTitle>
          </DialogHeader>
          {viewTarget && (() => {
            const status = getStatus(viewTarget);
            const rate = getCompletionRate(viewTarget);
            const isHP = viewTarget.role === "healthcare_provider";
            return (
              <div className="py-1 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar name={viewTarget.name} />
                  <div>
                    <p className="font-bold leading-tight">{viewTarget.name}</p>
                    <p className="text-xs text-muted-foreground">{viewTarget.email}</p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-0.5 font-semibold tracking-wide">
                      {viewTarget.role.replace(/_/g, " ")}
                    </p>
                  </div>
                  <span className={cn("ml-auto text-[10px] font-semibold px-2.5 py-0.5 rounded-full", status.color)}>
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs border rounded-lg p-3 bg-muted/40 shadow-inner">
                  {isHP ? (
                    <>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">National ID</p>
                        <p className="font-semibold text-foreground mt-0.5">{viewTarget.nationalId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">County</p>
                        <p className="font-semibold text-foreground mt-0.5">{viewTarget.county || "—"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Facility Name</p>
                        <p className="font-semibold text-foreground mt-0.5 truncate">{viewTarget.organization}</p>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Designation</p>
                      <p className="font-semibold text-foreground mt-0.5">{viewTarget.designation || "—"}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Course Enrollment</p>
                    <p className="font-semibold text-foreground mt-0.5">
                      {viewTarget.coursesCompleted} completed, {viewTarget.coursesInProgress} in progress
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Access Status</p>
                    <p className={cn("font-semibold mt-0.5", viewTarget.isActive ? "text-emerald-600" : "text-red-500")}>
                      {viewTarget.isActive ? "Enabled" : "Deactivated"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Registration Date</p>
                    <p className="font-semibold text-foreground mt-0.5">
                      {viewTarget.createdAt ? new Date(viewTarget.createdAt).toLocaleDateString("en-KE", { dateStyle: "long" }) : "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Overall progress</span>
                    <span className="font-semibold">{rate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-300", rate >= 70 ? "bg-emerald-500" : rate >= 40 ? "bg-amber-400" : "bg-blue-400")}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>

                {/* Quiz Scores */}
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Quiz Scores</p>
                  {quizScoresLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading scores…
                    </div>
                  ) : quizScores.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No courses enrolled yet</p>
                  ) : (
                    <div className="space-y-3">
                      {quizScores.map(s => (
                        <div key={s.courseId} className="space-y-1">
                          {/* Course row */}
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium truncate">{s.courseTitle}</span>
                            {s.quizScore !== null ? (
                              <span className={cn(
                                "font-semibold tabular-nums px-1.5 py-0.5 rounded flex-shrink-0 text-[10px]",
                                s.quizScore >= 70
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                              )}>
                                Best: {s.quizScore}%
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">No score</span>
                            )}
                          </div>
                          {/* Attempt history */}
                          {s.attempts.length > 0 ? (
                            <div className="pl-2 border-l-2 border-border space-y-0.5">
                              {s.attempts.map((a, i) => (
                                <div key={i} className="flex items-center justify-between text-[10px] text-muted-foreground gap-2">
                                  <span>Attempt {i + 1} — {new Date(a.attemptedAt).toLocaleDateString("en-KE", { dateStyle: "medium" })}</span>
                                  <span className={cn(
                                    "tabular-nums font-semibold flex-shrink-0",
                                    a.score >= 70 ? "text-emerald-600" : "text-amber-600"
                                  )}>
                                    {a.score}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground/50 pl-2">No attempts yet</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { setViewOpen(false); openEdit(viewTarget); }}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit Profile
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
