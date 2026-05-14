import { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { learnerStore, Learner } from "@/data/learnerStore";
import { organizations } from "@/data/mockData";
import kenyanCounties from "@/data/kenyanCounties.json";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  X, CheckSquare, Square, Minus, Eye, ArrowUpDown, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

const emptyForm = {
  name: "", email: "", nationalId: "", organization: "",
  county: "", coursesCompleted: 0, coursesInProgress: 0,
};

type SortKey = "name" | "email" | "organization" | "county" | "coursesCompleted" | "coursesInProgress";
type FilterStatus = "all" | "active" | "completed" | "notstarted";

// ─── Small helpers ────────────────────────────────────────────────────────────

const getStatus = (l: Learner): { label: string; color: string } => {
  if (l.coursesCompleted === 0 && l.coursesInProgress === 0)
    return { label: "Not started", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" };
  if (l.coursesInProgress > 0)
    return { label: "Active", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" };
  return { label: "Completed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" };
};

const getCompletionRate = (l: Learner) => {
  const total = l.coursesCompleted + l.coursesInProgress;
  return total === 0 ? 0 : Math.round((l.coursesCompleted / total) * 100);
};

const CompletionBar = ({ learner }: { learner: Learner }) => {
  const rate = getCompletionRate(learner);
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
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 select-none"
      style={{ background: `hsl(${hue},60%,90%)`, color: `hsl(${hue},60%,35%)` }}
    >
      {initials || "?"}
    </div>
  );
};

const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: "asc" | "desc" }) => {
  if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30 inline" />;
  return sortDir === "asc"
    ? <ChevronUp className="h-3 w-3 ml-1 text-primary inline" />
    : <ChevronDown className="h-3 w-3 ml-1 text-primary inline" />;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const LearnersPage = () => {
  const learners = useSyncExternalStore(learnerStore.subscribe, learnerStore.getAll);
  const isLoading = useSyncExternalStore(learnerStore.subscribe, learnerStore.getIsLoading);
  const { user } = useAuth();

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => { learnerStore.fetchAll(); }, []);

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ── View/Detail state ─────────────────────────────────────────────────────
  const [viewTarget, setViewTarget] = useState<Learner | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  // ── Table controls ────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterOrg, setFilterOrg] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // ── Selection (bulk actions) ──────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Derived data ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return learners.filter(l => {
      if (q && !l.name.toLowerCase().includes(q) && !l.email.toLowerCase().includes(q) && !l.nationalId.includes(q)) return false;
      if (filterOrg !== "all" && !l.organization.includes(filterOrg)) return false;
      if (filterStatus === "active" && l.coursesInProgress === 0) return false;
      if (filterStatus === "completed" && (l.coursesCompleted === 0 || l.coursesInProgress !== 0)) return false;
      if (filterStatus === "notstarted" && (l.coursesCompleted > 0 || l.coursesInProgress > 0)) return false;
      return true;
    });
  }, [learners, search, filterOrg, filterStatus]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    const cmp = typeof av === "number" && typeof bv === "number"
      ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""));
    return sortDir === "asc" ? cmp : -cmp;
  }), [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPI stats
  const stats = useMemo(() => ({
    total: learners.length,
    active: learners.filter(l => l.coursesInProgress > 0).length,
    completed: learners.filter(l => l.coursesCompleted > 0).length,
    avgRate: learners.length
      ? Math.round(learners.reduce((s, l) => s + getCompletionRate(l), 0) / learners.length)
      : 0,
  }), [learners]);

  const uniqueOrgs = useMemo(() => [...new Set(learners.map(l => l.organization.split(" - ")[0]))], [learners]);

  // ── Handlers: form ────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, email: user?.email ?? "" });
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (l: Learner) => {
    setEditId(l.id);
    setForm({ name: l.name, email: l.email, nationalId: l.nationalId, organization: l.organization, county: l.county, coursesCompleted: l.coursesCompleted, coursesInProgress: l.coursesInProgress });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email";
    if (!form.nationalId.trim()) e.nationalId = "Required";
    if (!form.organization) e.organization = "Required";
    if (!form.county) e.county = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editId) { await learnerStore.update(editId, form); toast.success("Learner updated"); }
      else { await learnerStore.add(form); toast.success("Learner added"); }
      setDialogOpen(false);
    } catch (err) {
      toast.error(`Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await learnerStore.remove(id);
      setSelected(s => { const n = new Set(s); n.delete(id); return n; });
      toast.success(`"${name}" removed`);
    } catch (err) {
      toast.error(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // ── Handlers: sort ────────────────────────────────────────────────────────

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  // ── Handlers: selection ───────────────────────────────────────────────────

  const toggleSelect = (id: string) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const allOnPageSelected = paginated.length > 0 && paginated.every(l => selected.has(l.id));
  const someSelected = selected.size > 0;

  const toggleSelectAll = () => {
    if (allOnPageSelected) setSelected(s => { const n = new Set(s); paginated.forEach(l => n.delete(l.id)); return n; });
    else setSelected(s => { const n = new Set(s); paginated.forEach(l => n.add(l.id)); return n; });
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    try {
      await Promise.all(ids.map(id => learnerStore.remove(id)));
      toast.success(`${ids.length} learner${ids.length > 1 ? "s" : ""} removed`);
      setSelected(new Set());
    } catch (err) {
      toast.error(`Failed to delete some learners: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // ── Handlers: export ──────────────────────────────────────────────────────

  const exportCSV = (data = learners) => {
    const headers = ["Name", "Email", "National ID", "Organization", "County", "Completed", "In Progress", "Rate %"];
    const rows = data.map(l => [
      `"${l.name}"`, `"${l.email}"`, `"${l.nationalId}"`, `"${l.organization}"`,
      `"${l.county}"`, l.coursesCompleted, l.coursesInProgress, getCompletionRate(l),
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })),
      download: "learners.csv",
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 100);
    toast.success("CSV exported");
  };

  const hasFilters = search || filterStatus !== "all" || filterOrg !== "all";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Learners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{learners.length} registered learner{learners.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportCSV()}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Learner
          </Button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
          { label: "Active", value: stats.active, icon: Clock, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" },
          { label: "With completions", value: stats.completed, icon: Award, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
          { label: "Avg. completion", value: `${stats.avgRate}%`, icon: BookOpen, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40" },
        ].map(s => (
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", s.bg)}>
                <s.icon className={cn("h-4 w-4", s.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums leading-none">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters row ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 text-sm pl-8 pr-8"
            placeholder="Search name, email, ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v as FilterStatus); setPage(1); }}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="notstarted">Not started</SelectItem>
          </SelectContent>
        </Select>

        {/* Org filter */}
        <Select value={filterOrg} onValueChange={v => { setFilterOrg(v); setPage(1); }}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All organizations" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {uniqueOrgs.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Reset */}
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
            onClick={() => { setSearch(""); setFilterStatus("all"); setFilterOrg("all"); setPage(1); }}>
            Reset filters
          </Button>
        )}

        {/* Result count */}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length !== learners.length ? `${filtered.length} of ${learners.length}` : `${learners.length} total`}
        </span>
      </div>

      {/* ── Bulk action bar ── */}
      {someSelected && (
        <div className="flex items-center gap-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-sm">
          <span className="font-medium text-primary">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => exportCSV(learners.filter(l => selected.has(l.id)))}>
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Export selected
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-7 text-xs">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete {selected.size}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selected.size} learner{selected.size > 1 ? "s" : ""}?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                {/* Checkbox */}
                <th className="w-10 px-3 py-3 text-left">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground transition-colors">
                    {allOnPageSelected
                      ? <CheckSquare className="h-4 w-4 text-primary" />
                      : someSelected && paginated.some(l => selected.has(l.id))
                        ? <Minus className="h-4 w-4" />
                        : <Square className="h-4 w-4" />}
                  </button>
                </th>
                {/* Sortable headers */}
                {([
                  ["name", "Learner"],
                  ["organization", "Organization"],
                  ["county", "County"],
                  ["coursesCompleted", "Completed"],
                  ["coursesInProgress", "In Progress"],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    className="text-left text-xs font-medium text-muted-foreground px-3 py-3 cursor-pointer hover:text-foreground whitespace-nowrap select-none"
                    onClick={() => toggleSort(key)}
                  >
                    {label}<SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                  </th>
                ))}
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 whitespace-nowrap">Rate</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 whitespace-nowrap">Status</th>
                <th className="w-[110px] px-3 py-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted-foreground py-16">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted-foreground py-16 text-sm">
                    {hasFilters ? "No learners match your filters." : "No learners yet. Add your first one!"}
                  </td>
                </tr>
              ) : paginated.map((l, i) => {
                const status = getStatus(l);
                const isSelected = selected.has(l.id);
                return (
                  <tr
                    key={l.id}
                    className={cn(
                      "border-b border-border/40 transition-colors group",
                      isSelected ? "bg-primary/5" : i % 2 === 0 ? "hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30"
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3">
                      <button onClick={() => toggleSelect(l.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                        {isSelected
                          ? <CheckSquare className="h-4 w-4 text-primary" />
                          : <Square className="h-4 w-4" />}
                      </button>
                    </td>

                    {/* Learner (avatar + name + email) */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={l.name} />
                        <div className="min-w-0">
                          <div className="font-medium text-sm leading-tight truncate max-w-[160px]">{l.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[160px]">{l.email}</div>
                          <div className="text-[10px] text-muted-foreground/60">{l.nationalId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Organization */}
                    <td className="px-3 py-3 text-xs text-muted-foreground max-w-[140px]">
                      <span className="truncate block max-w-[130px]">{l.organization}</span>
                    </td>

                    {/* County */}
                    <td className="px-3 py-3 text-xs text-muted-foreground">{l.county || "—"}</td>

                    {/* Completed */}
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 tabular-nums">
                        {l.coursesCompleted}
                      </span>
                    </td>

                    {/* In Progress */}
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 tabular-nums">
                        {l.coursesInProgress}
                      </span>
                    </td>

                    {/* Completion bar */}
                    <td className="px-3 py-3">
                      <CompletionBar learner={l} />
                    </td>

                    {/* Status badge */}
                    <td className="px-3 py-3">
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", status.color)}>
                        {status.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" title="View details"
                          onClick={() => { setViewTarget(l); setViewOpen(true); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" title="Edit learner"
                          onClick={() => openEdit(l)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {/* <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" title="Reset password"
                          onClick={() => openReset(l)}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button> */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-60 hover:opacity-100" title="Delete learner">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove "{l.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone and will permanently delete this learner's record.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(l.id, l.name)}>Remove</AlertDialogAction>
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {sorted.length === 0 ? "No results" : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, sorted.length)} of ${sorted.length}`}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Learner" : "Add Learner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name *</Label>
              <Input className="h-8 text-sm" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" />
              {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            </div>
            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs">Email Address *</Label>
              <Input className="h-8 text-sm" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="learner@example.com" />
              {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
            </div>
            {/* National ID */}
            <div className="space-y-1.5">
              <Label className="text-xs">National ID *</Label>
              <Input className="h-8 text-sm" value={form.nationalId} onChange={e => setForm(p => ({ ...p, nationalId: e.target.value }))} placeholder="National ID" />
              {errors.nationalId && <p className="text-destructive text-xs">{errors.nationalId}</p>}
            </div>
            {/* 2-col: Org + County */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Organization *</Label>
                <Select value={form.organization} onValueChange={v => setForm(p => ({ ...p, organization: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{organizations.map(o => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.organization && <p className="text-destructive text-xs">{errors.organization}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">County *</Label>
                <Select value={form.county} onValueChange={v => setForm(p => ({ ...p, county: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{kenyanCounties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                {errors.county && <p className="text-destructive text-xs">{errors.county}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm" disabled={saving}>Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {editId ? "Save Changes" : "Add Learner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>




      {/* ── View / Detail Dialog ── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Learner Details</DialogTitle>
          </DialogHeader>
          {viewTarget && (() => {
            const status = getStatus(viewTarget);
            const rate = getCompletionRate(viewTarget);
            return (
              <div className="py-1 space-y-4">
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <Avatar name={viewTarget.name} />
                  <div>
                    <p className="font-semibold leading-tight">{viewTarget.name}</p>
                    <p className="text-xs text-muted-foreground">{viewTarget.email}</p>
                  </div>
                  <span className={cn("ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full", status.color)}>
                    {status.label}
                  </span>
                </div>
                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm border rounded-lg p-3 bg-muted/30">
                  {[
                    ["National ID", viewTarget.nationalId],
                    ["County", viewTarget.county || "—"],
                    ["Organization", viewTarget.organization],
                    ["Completed", String(viewTarget.coursesCompleted)],
                    ["In Progress", String(viewTarget.coursesInProgress)],
                    ["Completion Rate", `${rate}%`],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="font-medium truncate">{val}</p>
                    </div>
                  ))}
                </div>
                {/* Completion bar */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Overall progress</p>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", rate >= 70 ? "bg-emerald-500" : rate >= 40 ? "bg-amber-400" : "bg-blue-400")}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                  <p className="text-xs text-right text-muted-foreground">{rate}% complete</p>
                </div>
                {/* Quick actions */}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { setViewOpen(false); openEdit(viewTarget); }}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  {/* <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { setViewOpen(false); openReset(viewTarget); }}>
                    <KeyRound className="h-3 w-3 mr-1" /> Reset password
                  </Button> */}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default LearnersPage;