import { useState, useEffect, useCallback } from "react";
import { testimonialStore } from "@/data/testimonialStore";
import { Testimonial } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  MessageSquare,
  Sparkles,
  Pin,
  PinOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "newest" | "highest";

// ─── RatingStars ─────────────────────────────────────────────────────────────

const RatingStars = ({
  rating,
  interactive = false,
  onSelect,
  size = "sm",
}: {
  rating: number;
  interactive?: boolean;
  onSelect?: (r: number) => void;
  size?: "sm" | "md";
}) => {
  const [hovered, setHovered] = useState(0);
  const active = hovered || rating;
  const px = size === "md" ? "h-6 w-6" : "h-4 w-4";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onSelect?.(n)}
          onMouseEnter={() => interactive && setHovered(n)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={cn(
            "transition-transform",
            interactive && "hover:scale-110 cursor-pointer",
            !interactive && "cursor-default"
          )}
        >
          <Star
            className={cn(
              px,
              "transition-colors",
              n <= active
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  );
};

// ─── TestimonialCard ─────────────────────────────────────────────────────────

const TestimonialCard = ({
  testimonial,
  approved,
  onDelete,
  onToggleApprove,
}: {
  testimonial: Testimonial;
  approved: boolean;
  onDelete: () => void;
  onToggleApprove: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = testimonial.text.length > 140;
  const displayText =
    !isLong || expanded ? testimonial.text : testimonial.text.slice(0, 140) + "…";

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 group",
        testimonial.rating === 5 &&
          "ring-2 ring-amber-300/60 dark:ring-amber-500/40",
        approved && "ring-2 ring-indigo-400/70 dark:ring-indigo-500/50"
      )}
    >
      {/* top accent bar for 5-star */}
      {testimonial.rating === 5 && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
      )}
      {approved && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-400 to-indigo-500" />
      )}

      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Avatar + meta */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
              )}
            >
              {testimonial.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold leading-tight truncate">
                  {testimonial.name}
                </p>
                {approved && (
                  <Badge className="text-[10px] h-4 px-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-0">
                    Approved
                  </Badge>
                )}
                {testimonial.rating === 5 && !approved && (
                  <Badge className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-0">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                    Top
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {testimonial.role}
                {testimonial.county ? ` · ${testimonial.county}` : ""}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-indigo-600"
              onClick={onToggleApprove}
              title={approved ? "Unapprove" : "Approve"}
            >
              {approved ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Rating */}
        <RatingStars rating={testimonial.rating} />

        {/* Text */}
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {displayText}
        </p>
        {isLong && (
          <button
            type="button"
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
      </CardContent>
    </Card>
  );
};

// ─── TestimonialsFilterBar ────────────────────────────────────────────────────

const TestimonialsFilterBar = ({
  search, setSearch,
  ratingFilter, setRatingFilter,
  sort, setSort,
}: {
  search: string; setSearch: (v: string) => void;
  ratingFilter: string; setRatingFilter: (v: string) => void;
  sort: SortKey; setSort: (v: SortKey) => void;
}) => {
  const ratingOptions = [
    { value: "all", label: "All ratings" },
    ...[5, 4, 3, 2, 1].map((r) => ({
      value: String(r),
      label: `${r} Star${r > 1 ? "s" : ""}`,
      customRender: (
        <span className="flex items-center gap-1">
          {"★".repeat(r)}{"☆".repeat(5 - r)} ({r})
        </span>
      ),
    })),
  ];

  const sortOptions = [
    { value: "newest", label: "Newest first" },
    { value: "highest", label: "Highest rating" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by name or text…"
          className="pl-8 h-9 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Rating filter */}
      <SearchableSelect
        value={ratingFilter}
        onValueChange={setRatingFilter}
        options={ratingOptions}
        placeholder="All ratings"
        emptyMessage="No rating found."
        triggerClassName="h-9 text-sm w-[130px]"
      />

      {/* Sort */}
      <SearchableSelect
        value={sort}
        onValueChange={(v) => setSort(v as SortKey)}
        options={sortOptions}
        placeholder="Sort"
        emptyMessage="No option found."
        triggerClassName="h-9 text-sm w-[150px]"
      />
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
      <MessageSquare className="h-7 w-7 text-muted-foreground opacity-50" />
    </div>
    <div>
      <p className="text-base font-semibold">No testimonials yet</p>
      <p className="text-sm text-muted-foreground mt-1">
        Testimonials submitted by learners will appear here for approval.
      </p>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const TestimonialsPage = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(
    testimonialStore.getAll()
  );
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");

  // Load from backend & subscribe reactively
  useEffect(() => {
    testimonialStore.fetchAll();
    const unsubscribe = testimonialStore.subscribe(() => {
      setTestimonials(testimonialStore.getAll());
    });
    return unsubscribe;
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await testimonialStore.remove(id);
      toast.success("Testimonial deleted");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      toast.error(message);
    }
  }, []);

  const handleToggleApprove = useCallback(async (id: string, currentlyApproved: boolean) => {
    try {
      await testimonialStore.setApproved(id, !currentlyApproved);
      toast.success(currentlyApproved ? "Testimonial unapproved" : "Testimonial approved — now visible on landing page");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update";
      toast.error(message);
    }
  }, []);

  // Filter + sort
  const processed = testimonials
    .filter((t) => {
      const q = search.toLowerCase();
      if (q && !t.name.toLowerCase().includes(q) && !t.text.toLowerCase().includes(q)) return false;
      if (ratingFilter !== "all" && t.rating !== Number(ratingFilter)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "highest") return b.rating - a.rating;
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

  const totalByRating = [5, 4, 3, 2, 1].map((r) => ({
    r,
    count: testimonials.filter((t) => t.rating === r).length,
  }));
  const avgRating =
    testimonials.length > 0
      ? (testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length).toFixed(1)
      : "—";
  const approvedCount = testimonials.filter((t) => t.isApproved).length;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Testimonials Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Approve learner reviews to display them on the landing page
          </p>
        </div>
      </div>

      {/* ── Summary stats ── */}
      {testimonials.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total</p>
              <p className="text-2xl font-bold tabular-nums">{testimonials.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Avg Rating</p>
              <div className="flex items-center gap-1.5">
                <p className="text-2xl font-bold tabular-nums">{avgRating}</p>
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">5-Star</p>
              <p className="text-2xl font-bold tabular-nums text-amber-500">
                {totalByRating.find((x) => x.r === 5)?.count ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Approved</p>
              <p className="text-2xl font-bold tabular-nums text-indigo-500">
                {approvedCount}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Filter bar ── */}
      {testimonials.length > 0 && (
        <TestimonialsFilterBar
          search={search}
          setSearch={setSearch}
          ratingFilter={ratingFilter}
          setRatingFilter={setRatingFilter}
          sort={sort}
          setSort={setSort}
        />
      )}

      {/* ── Results count ── */}
      {testimonials.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{processed.length}</span>
          {" "}of <span className="font-medium text-foreground">{testimonials.length}</span> testimonials
          {ratingFilter !== "all" && (
            <> · filtered to <span className="font-medium text-foreground">{ratingFilter}★</span></>
          )}
        </p>
      )}

      {/* ── Cards grid / empty state ── */}
      {testimonials.length === 0 ? (
        <EmptyState />
      ) : processed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
          <Search className="h-8 w-8 text-muted-foreground opacity-30" />
          <p className="text-sm font-medium">No results match your filters</p>
          <p className="text-xs text-muted-foreground">Try adjusting the rating filter or search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {processed.map((t) => (
            <TestimonialCard
              key={t.id}
              testimonial={t}
              approved={t.isApproved ?? false}
              onDelete={() => handleDelete(t.id)}
              onToggleApprove={() => handleToggleApprove(t.id, t.isApproved ?? false)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TestimonialsPage;
