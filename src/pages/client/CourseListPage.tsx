import { useState, useEffect, useSyncExternalStore, useRef } from "react";
import { courseStore } from "@/data/courseStore";
import { enrollmentStore } from "@/data/enrollmentStore";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, List, Eye, PlayCircle, Plus, Pencil, Trash2, Search, BookOpen, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
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
import CourseDetailModal from "@/components/CourseDetailModal";
import { Course } from "@/data/types";

/* ─── Intersection-observer hook ─── */
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const CourseListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const userId  = user?.id ?? "";

  const courses = useSyncExternalStore(courseStore.subscribe, courseStore.getAll);
  useSyncExternalStore(enrollmentStore.subscribe, enrollmentStore.getSnapshot);

  useEffect(() => {
    courseStore.fetchAll(user?.role);
    if (userId) enrollmentStore.fetchMyEnrollments(userId);
  }, [userId, user?.role]);

  const handleDelete = async (id: string, title: string) => {
    try {
      await courseStore.remove(id);
      toast.success(`"${title}" deleted`);
    } catch {
      toast.error("Failed to delete course");
    }
  };

  const handleStartOrContinue = async (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    if (!userId) { toast.error("Please log in to start this course."); return; }
    if (!enrollmentStore.isEnrolled(userId, course.id)) {
      await enrollmentStore.enroll(userId, course.id);
      toast.success(`"${course.title}" added to My Learning!`);
    }
    navigate(`/courses/${course.id}/player`);
  };

  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const openModal = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation(); setDetailCourse(course); setModalOpen(true);
  };

  const [search, setSearch]                 = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode]             = useState<"grid" | "list">("grid");

  const categories      = ["All", ...new Set(courses.map((c) => c.category))];
  const categoryOptions = categories.map((cat) => ({ value: cat, label: cat }));
  const filtered = courses.filter((c) => {
    const matchesSearch   = c.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const headerSection = useInView(0.05);
  const gridSection   = useInView(0.05);

  return (
    <>
      <div className="space-y-8">

        {/* ── Page header ── */}
        <div
          ref={headerSection.ref}
          className={`transition-all duration-700 ${headerSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Catalog</p>
              <h1 className="text-2xl font-black tracking-tight text-foreground leading-tight">Courses</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isAdmin ? "Manage your course library." : "Browse and start learning at your own pace."}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 pt-1">
              {/* View toggle */}
              <div className="flex gap-1 border border-border/50 rounded-lg p-1 bg-card">
                <Button
                  size="icon"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  className="h-7 w-7 rounded-md"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  className="h-7 w-7 rounded-md"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>

              {isAdmin && (
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px transition-all duration-300"
                  onClick={() => navigate("/courses/create")}
                >
                  <Plus className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Create Course</span>
                </Button>
              )}
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="flex items-center gap-3 flex-wrap mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search courses…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 max-w-xs bg-card border-border/60 focus:border-primary/40 text-sm rounded-lg"
              />
            </div>
            <SearchableSelect
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              options={categoryOptions}
              placeholder="Category"
              emptyMessage="No category found."
              triggerClassName="w-40 h-9 rounded-lg border-border/60"
            />

       
          </div>
        </div>

        {/* ── Empty state ── */}
        {courses.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center rounded-2xl border border-border/50 border-dashed bg-muted/20">
            <div className="h-14 w-14 rounded-2xl bg-primary/8 flex items-center justify-center">
              <BookOpen className="h-7 w-7 text-primary/40" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No courses available yet</p>
              {isAdmin && (
                <p className="text-xs text-muted-foreground">Get started by creating your first course.</p>
              )}
            </div>
            {isAdmin && (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px transition-all duration-300"
                onClick={() => navigate("/courses/create")}
              >
                Create your first course
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center rounded-2xl border border-border/50 border-dashed bg-muted/20">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
              <Search className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-semibold text-foreground">No courses found</p>
            <p className="text-xs text-muted-foreground">Try a different search or filter</p>
          </div>
        ) : (
          /* ── Course grid / list ── */
          <div
            ref={gridSection.ref}
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                : "flex flex-col gap-3"
            }
          >
            {filtered.map((c, i) => {
              const enrolled = userId ? enrollmentStore.isEnrolled(userId, c.id) : false;

              return viewMode === "grid" ? (
                /* ══ Grid card ══ */
                <div
                  key={c.id}
                  className={`group relative cursor-pointer rounded-sm border border-border/50 bg-card overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-primary/8 hover:border-primary/30 hover:-translate-y-1.5 transition-all duration-300 ${
                    gridSection.visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  }`}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  {/* Cover */}
                  <div className="relative w-full h-44 overflow-hidden bg-muted">
                    {c.coverImage ? (
                      <img
                        src={c.coverImage}
                        alt={c.title}
                        className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/8 via-primary/5 to-accent/8">
                        <BookOpen className="h-10 w-10 text-primary/25" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
                      {c.duration}
                    </div>
                    {enrolled && (
                      <div className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/90 backdrop-blur-sm text-white">
                        Enrolled
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <Badge variant="secondary" className="w-fit text-xs bg-emerald-500 text-white border-0 rounded-lg">
                      {c.category}
                    </Badge>

                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2 leading-snug">
                      {c.title}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                      {c.objectives}
                    </p>

                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-muted-foreground/60 border border-border/40 rounded px-1.5 py-0.5">
                        {c.quiz.length} questions
                      </span>
                    </div>

                    {/* Learner actions */}
                    {!isAdmin && (
                      <div className="flex gap-2 mt-auto pt-2 border-t border-border/40">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs gap-1 border-border/60 hover:border-primary/30 hover:bg-primary/4 hover:text-primary transition-all duration-200"
                          onClick={(e) => openModal(e, c)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs gap-1 bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 hover:-translate-y-px transition-all duration-200"
                          onClick={(e) => handleStartOrContinue(e, c)}
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          {enrolled ? "Continue" : "Start"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background border border-border/40"
                        onClick={(e) => { e.stopPropagation(); navigate(`/courses/${c.id}/edit`); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive border border-border/40"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{c.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(c.id, c.title)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              ) : (
                /* ══ List row ══ */
                <div
                  key={c.id}
                  className={`group relative flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 ${
                    gridSection.visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                  }`}
                  style={{ transitionDelay: `${i * 40}ms` }}
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {c.coverImage ? (
                      <img src={c.coverImage} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/8 to-accent/8">
                        <BookOpen className="h-5 w-5 text-primary/30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[11px] font-medium bg-primary/8 text-primary border-0 rounded-md px-1.5 py-0">
                        {c.category}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground/50">{c.duration}</span>
                      <span className="text-[11px] text-muted-foreground/50">· {c.quiz.length} questions</span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-200 truncate">
                      {c.title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.objectives}</p>
                  </div>

                  {/* Actions */}
                  {!isAdmin && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 border-border/60 hover:border-primary/30 hover:bg-primary/4 hover:text-primary transition-all duration-200"
                        onClick={(e) => openModal(e, c)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1 bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 hover:-translate-y-px transition-all duration-200"
                        onClick={(e) => handleStartOrContinue(e, c)}
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        {enrolled ? "Continue" : "Start"}
                      </Button>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-primary/8 hover:text-primary transition-colors duration-200"
                        onClick={(e) => { e.stopPropagation(); navigate(`/courses/${c.id}/edit`); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{c.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(c.id, c.title)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CourseDetailModal course={detailCourse} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
};

export default CourseListPage;