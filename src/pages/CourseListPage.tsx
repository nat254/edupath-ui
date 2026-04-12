import { useState, useSyncExternalStore } from "react";
import { courseStore } from "@/data/courseStore";
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
import { LayoutGrid, List } from "lucide-react";
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

const CourseListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const courses = useSyncExternalStore(
    courseStore.subscribe,
    courseStore.getAll,
  );

  const handleDelete = (id: string, title: string) => {
    courseStore.remove(id);
    toast.success(`"${title}" deleted`);
  };

  // search and category filter
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Derive unique categories from courses
  const categories = ["All", ...new Set(courses.map((c) => c.category))];

  const filtered = courses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // grid or list view
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <div className="space-y-6">
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
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="group relative hover:shadow-md transition-shadow"
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
                    // Fallback — category initial + colored background
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <span className="text-3xl font-bold text-primary/40">
                        {c.category.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <CardContent
                className="p-5 space-y-2 cursor-pointer"
                onClick={() =>
                  navigate(
                    isAdmin
                      ? `/courses/${c.id}/edit`
                      : `/courses/${c.id}/player`,
                  )
                }
              >
                <h3 className="font-semibold pt-4">{c.title}</h3>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{c.category}</Badge>
                  <Badge variant="outline">{c.duration}</Badge>
                  <Badge variant="outline">{c.quiz.length} quiz Q</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {c.objectives}
                </p>
              </CardContent>

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
                        <AlertDialogTitle>Delete "{c.title}"?</AlertDialogTitle>
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
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseListPage;
