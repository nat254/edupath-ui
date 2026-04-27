import { useState, useSyncExternalStore } from "react";
import { feedbackStore, CourseFeedback } from "@/data/feedbackStore";
import { courseStore } from "@/data/courseStore";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Star,
  Search,
  MessageSquareText,
  Trash2,
  TrendingUp,
  Users,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={cn(
          "h-3.5 w-3.5",
          n <= rating
            ? "fill-amber-400 text-amber-400"
            : "fill-muted text-muted-foreground/30",
        )}
      />
    ))}
  </div>
);

const ratingColor = (r: number) => {
  if (r >= 5) return "text-amber-500";
  if (r >= 4) return "text-emerald-500";
  if (r >= 3) return "text-blue-500";
  return "text-destructive";
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── FeedbackCard ─────────────────────────────────────────────────────────────

const FeedbackCard = ({
  fb,
  onDelete,
}: {
  fb: CourseFeedback;
  onDelete: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = fb.comment.length > 150;
  const displayText =
    !isLong || expanded ? fb.comment : fb.comment.slice(0, 150) + "…";

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      {/* Rating accent bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-0.5",
          fb.rating === 5
            ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400"
            : fb.rating >= 4
              ? "bg-gradient-to-r from-emerald-400 to-emerald-300"
              : fb.rating >= 3
                ? "bg-gradient-to-r from-blue-400 to-blue-300"
                : "bg-gradient-to-r from-destructive/60 to-destructive/40",
        )}
      />

      <CardContent className="p-5 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {fb.userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">
                {fb.userName}
              </p>
              <p className="text-xs text-muted-foreground">{timeAgo(fb.submittedAt)}</p>
            </div>
          </div>

          {/* Delete (appears on hover) */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this feedback?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the feedback from{" "}
                  <span className="font-medium">{fb.userName}</span>. This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Course badge + star rating */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs gap-1 max-w-[200px] truncate">
            <BookOpen className="h-3 w-3 shrink-0" />
            <span className="truncate">{fb.courseName}</span>
          </Badge>
          <StarDisplay rating={fb.rating} />
          <span className={cn("text-xs font-bold tabular-nums", ratingColor(fb.rating))}>
            {fb.rating}/5
          </span>
        </div>

        {/* Comment */}
        {fb.comment ? (
          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              "{displayText}"
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded((p) => !p)}
                className="mt-1 flex items-center gap-0.5 text-xs text-primary font-medium hover:underline"
              >
                {expanded ? (
                  <>Show less <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>Read more <ChevronDown className="h-3 w-3" /></>
                )}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No comment left.</p>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", accent)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// ─── Rating Distribution Bar ───────────────────────────────────────────────────

const RatingBar = ({
  star,
  count,
  total,
}: {
  star: number;
  count: number;
  total: number;
}) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-4 text-right font-medium tabular-nums">{star}</span>
      <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-muted-foreground tabular-nums">{count}</span>
    </div>
  );
};

// ─── Per-course Summary Table ──────────────────────────────────────────────────

const CourseSummaryTable = ({
  allFeedback,
}: {
  allFeedback: CourseFeedback[];
}) => {
  // Group by course
  const map = new Map<string, { name: string; entries: CourseFeedback[] }>();
  allFeedback.forEach((fb) => {
    if (!map.has(fb.courseId)) {
      map.set(fb.courseId, { name: fb.courseName, entries: [] });
    }
    map.get(fb.courseId)!.entries.push(fb);
  });

  const rows = Array.from(map.entries())
    .map(([courseId, { name, entries }]) => ({
      courseId,
      name,
      count: entries.length,
      avg:
        entries.length > 0
          ? (entries.reduce((s, e) => s + e.rating, 0) / entries.length).toFixed(1)
          : "—",
    }))
    .sort((a, b) => b.count - a.count);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Feedback by Course
          </h2>
        </div>
        <div className="divide-y">
          {rows.map((row) => (
            <div
              key={row.courseId}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  {row.count} response{row.count !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <StarDisplay rating={Math.round(Number(row.avg))} />
                <span className="text-sm font-bold tabular-nums text-amber-500">
                  {row.avg}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

type SortKey = "newest" | "highest" | "lowest";

const CourseFeedbackPage = () => {
  // Reactive data
  const allFeedback = useSyncExternalStore(
    feedbackStore.subscribe,
    feedbackStore.getSnapshot,
  );
  const courses = useSyncExternalStore(
    courseStore.subscribe,
    courseStore.getAll,
  );

  // Filters
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const handleDelete = (id: string) => {
    feedbackStore.remove(id);
    toast.success("Feedback deleted");
  };

  // Summary stats
  const total = allFeedback.length;
  const avgRating =
    total > 0
      ? (allFeedback.reduce((s, f) => s + f.rating, 0) / total).toFixed(1)
      : "—";
  const uniqueLearners = new Set(allFeedback.map((f) => f.userId)).size;
  const fiveStarCount = allFeedback.filter((f) => f.rating === 5).length;

  // Rating distribution
  const distribution = [5, 4, 3, 2, 1].map((r) => ({
    star: r,
    count: allFeedback.filter((f) => f.rating === r).length,
  }));

  // Filtered + sorted list
  const processed = allFeedback
    .filter((f) => {
      const q = search.toLowerCase();
      if (
        q &&
        !f.userName.toLowerCase().includes(q) &&
        !f.comment.toLowerCase().includes(q) &&
        !f.courseName.toLowerCase().includes(q)
      )
        return false;
      if (courseFilter !== "all" && f.courseId !== courseFilter) return false;
      if (ratingFilter !== "all" && f.rating !== Number(ratingFilter))
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "highest") return b.rating - a.rating;
      if (sort === "lowest") return a.rating - b.rating;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

  return (
    <div className="space-y-6 pb-10">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Course Feedback</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review and manage learner feedback submitted across all courses
        </p>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Responses"
          value={total}
          icon={MessageSquareText}
          accent="bg-primary/10 text-primary"
        />
        <StatCard
          label="Avg Rating"
          value={avgRating === "—" ? avgRating : `${avgRating} ★`}
          icon={Star}
          accent="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
        />
        <StatCard
          label="Learners"
          value={uniqueLearners}
          icon={Users}
          accent="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
        />
        <StatCard
          label="5-Star Reviews"
          value={fiveStarCount}
          icon={TrendingUp}
          accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        />
      </div>

      {/* ── Two-column: Rating Distribution + Course Summary ───────────── */}
      {total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rating distribution */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" />
                Rating Distribution
              </h2>
              <div className="space-y-2">
                {distribution.map((d) => (
                  <RatingBar key={d.star} star={d.star} count={d.count} total={total} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Per-course table */}
          <CourseSummaryTable allFeedback={allFeedback} />
        </div>
      )}

      {/* ── Filter Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by learner, course or comment…"
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Course filter */}
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="h-9 text-sm w-[180px]">
            <SelectValue placeholder="All courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Rating filter */}
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="h-9 text-sm w-[130px]">
            <SelectValue placeholder="All ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((r) => (
              <SelectItem key={r} value={String(r)}>
                {"★".repeat(r)}{"☆".repeat(5 - r)} ({r})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-9 text-sm w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="highest">Highest rating</SelectItem>
            <SelectItem value="lowest">Lowest rating</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Results count ───────────────────────────────────────────────── */}
      {total > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">{processed.length}</span>{" "}
          of{" "}
          <span className="font-medium text-foreground">{total}</span> responses
        </p>
      )}

      {/* ── Feedback Cards / Empty State ────────────────────────────────── */}
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <MessageSquareText className="h-7 w-7 text-muted-foreground opacity-40" />
          </div>
          <div>
            <p className="font-semibold">No feedback yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Learner feedback submitted after completing a course will appear
              here.
            </p>
          </div>
        </div>
      ) : processed.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Search className="h-8 w-8 text-muted-foreground opacity-30" />
          <p className="text-sm font-medium">No results match your filters</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting the course, rating or search term
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {processed.map((fb) => (
            <FeedbackCard
              key={fb.id}
              fb={fb}
              onDelete={() => handleDelete(fb.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseFeedbackPage;
