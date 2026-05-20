import { useState, useEffect, useSyncExternalStore } from "react";
import { courseStore } from "@/data/courseStore";
import { enrollmentStore } from "@/data/enrollmentStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, List, Eye, PlayCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus } from "lucide-react";
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

const CourseListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
 const userId = user?.id ?? "";

  const courses = useSyncExternalStore(
    courseStore.subscribe,
    courseStore.getAll,
  );

  // Subscribe to enrollment store so Start/Continue buttons update reactively
  useSyncExternalStore(enrollmentStore.subscribe, enrollmentStore.getSnapshot);

  // Load courses & user's enrollments from API on mount
  useEffect(() => {
    courseStore.fetchAll();
    if (userId) enrollmentStore.fetchMyEnrollments(userId);
  }, [userId]);

  const handleDelete = async (id: string, title: string) => {
    try {
      await courseStore.remove(id);
      toast.success(`"${title}" deleted`);
    } catch {
      toast.error("Failed to delete course");
    }
  };

  const handleStartOrContinue = async (
    e: React.MouseEvent,
    course: Course,
  ) => {
    e.stopPropagation();
    if (!userId) {
      toast.error("Please log in to start this course.");
      return;
    }
    if (!enrollmentStore.isEnrolled(userId, course.id)) {
      await enrollmentStore.enroll(userId, course.id);
      toast.success(`"${course.title}" added to My Learning!`);
    }
    navigate(`/courses/${course.id}/player`);
  };

  // ── Modal state ──────────────────────────────────────────────────────────
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    setDetailCourse(course);
    setModalOpen(true);
  };

  // ── Filters ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categories = ["All", ...new Set(courses.map((c) => c.category))];
  const filtered = courses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ── View mode ────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <>
      <div className="space-y-6">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Courses</h1>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                size="icon"
                variant={viewMode === "grid" ? "default" : "ghost"}
                className="h-7 w-7"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={viewMode === "list" ? "default" : "ghost"}
                className="h-7 w-7"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {isAdmin && (
              <Button onClick={() => navigate("/courses/create")}>
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Create Course</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Course grid / list ───────────────────────────────────────── */}
        {courses.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No courses available yet.</p>
            {isAdmin && (
              <Button
                className="mt-4"
                onClick={() => navigate("/courses/create")}
              >
                Create your first course
              </Button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                : "flex flex-col gap-3"
            }
          >
            {filtered.map((c) => {
              const enrolled = userId
                ? enrollmentStore.isEnrolled(userId, c.id)
                : false;

              return (
                <Card
                  key={c.id}
                  className="group relative hover:shadow-md transition-shadow flex flex-col"
                >
                  {/* Cover Image */}
                  {viewMode === "grid" && (
                    <div className="w-full h-36 overflow-hidden rounded-t-lg bg-muted">
                      {c.coverImage ? (
                        <img
                          src={c.coverImage}
                          alt={c.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          <span className="text-3xl font-bold text-primary/40">
                            {c.category.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <CardContent className="p-5 space-y-3 flex flex-col flex-1">
                    {/* Meta */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">{c.title}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">{c.category}</Badge>
                        <Badge variant="outline">{c.duration}</Badge>
                        <Badge variant="outline">
                          {c.quiz.length} quiz Q
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {c.objectives}
                      </p>
                    </div>

                    {/* ── Learner action buttons ── */}
                    {!isAdmin && (
                      <div className="flex gap-2 mt-auto pt-1">
                        {/* View Details */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={(e) => openModal(e, c)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Details
                        </Button>

                        {/* Start Course / Continue */}
                        <Button
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={(e) => handleStartOrContinue(e, c)}
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          {enrolled ? "Continue" : "Start Course"}
                        </Button>
                      </div>
                    )}
                  </CardContent>

                  {/* ── Admin actions ── */}
                  {isAdmin && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/courses/${c.id}/edit`);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete "{c.title}"?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(c.id, c.title)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Course Detail Modal ──────────────────────────────────────────── */}
      <CourseDetailModal
        course={detailCourse}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
};

export default CourseListPage;
