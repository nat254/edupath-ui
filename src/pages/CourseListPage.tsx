import { useSyncExternalStore } from "react";
import { courseStore } from "@/data/courseStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
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
  const courses = useSyncExternalStore(courseStore.subscribe, courseStore.getAll);

  const handleDelete = (id: string, title: string) => {
    courseStore.remove(id);
    toast.success(`"${title}" deleted`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Courses</h1>
        {isAdmin && <Button onClick={() => navigate("/courses/create")}>+ Create Course</Button>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => (
          <Card key={c.id} className="group relative hover:shadow-md transition-shadow">
            <CardContent className="p-5 space-y-2 cursor-pointer" onClick={() => navigate(isAdmin ? `/courses/${c.id}/edit` : `/courses/${c.id}/player`)}>
              <h3 className="font-semibold">{c.title}</h3>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{c.category}</Badge>
                <Badge variant="outline">{c.duration}</Badge>
                <Badge variant="outline">{c.quiz.length} quiz Q</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{c.objectives}</p>
            </CardContent>
            {isAdmin && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/courses/${c.id}/edit`); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={(e) => e.stopPropagation()}>
                      <Trash2 className="h-4 w-4" />
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
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CourseListPage;
