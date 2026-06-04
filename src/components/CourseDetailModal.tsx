import { Course } from "@/data/types";
import { enrollmentStore } from "@/data/enrollmentStore";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  ListChecks,
  PlayCircle,
  ChevronRight,
} from "lucide-react";
import { useSyncExternalStore } from "react";

interface CourseDetailModalProps {
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CourseDetailModal = ({
  course,
  open,
  onOpenChange,
}: CourseDetailModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Subscribe to enrollment changes so the button re-renders reactively
  useSyncExternalStore(enrollmentStore.subscribe, enrollmentStore.getSnapshot);

  if (!course) return null;

  const userId = user?.id ?? "";
  const isEnrolled = userId
    ? enrollmentStore.isEnrolled(userId, course.id)
    : false;

  const handleStartOrContinue = async () => {
    if (!userId) {
      toast.error("Please log in to start this course.");
      return;
    }
    if (!isEnrolled) {
      await enrollmentStore.enroll(userId, course.id);
      toast.success(`"${course.title}" added to My Learning!`);
    }
    onOpenChange(false);
    navigate(`/courses/${course.id}/player`);
  };

  // Parse objectives into bullet points (split on ". " or newline)
  const objectiveBullets = course.objectives
    .split(/\.\s+|\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Derive lesson topics from quiz questions as a proxy for module preview
  const lessonPreviews = course.quiz.map((q, i) => ({
    index: i + 1,
    label: q.question.length > 60 ? q.question.slice(0, 57) + "…" : q.question,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header Banner */}
        <div className="relative w-full h-44 bg-muted overflow-hidden">
          {course.coverImage ? (
            <img
              src={course.coverImage}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-7xl font-extrabold text-primary/20 select-none">
                {course.category.charAt(0)}
              </span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          {/* Badges over image */}
          <div className="absolute bottom-3 left-5 flex gap-2 flex-wrap">
            <Badge variant="secondary" className="backdrop-blur-sm">
              <BookOpen className="h-3 w-3 mr-1" />
              {course.category}
            </Badge>
            <Badge variant="outline" className="backdrop-blur-sm bg-background/60">
              <Clock className="h-3 w-3 mr-1" />
              {course.duration}
            </Badge>
            <Badge variant="outline" className="backdrop-blur-sm bg-background/60">
              {course.quiz.length} Quiz Q{course.quiz.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-bold leading-tight">
                {course.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                {course.objectives}
              </DialogDescription>
            </DialogHeader>

            {/* Learning Objectives */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Learning Objectives
                </h3>
              </div>
              <ul className="space-y-2 pl-1">
                {objectiveBullets.map((obj, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground/90"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                    {obj}
                  </li>
                ))}
              </ul>
            </section>

            {/* Modules / Lessons Preview */}
            {lessonPreviews.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Lessons Preview
                  </h3>
                </div>
                <ol className="space-y-2 pl-1">
                  {lessonPreviews.map((lesson) => (
                    <li
                      key={lesson.index}
                      className="flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {lesson.index}
                      </span>
                      <span className="flex-1 text-foreground/80">
                        {lesson.label}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </ScrollArea>

        {/* Footer CTA */}
        <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-6 py-4">
          <p className="text-sm text-muted-foreground">
            {isEnrolled
              ? "You're enrolled — pick up where you left off."
              : "Start this course and add it to your learning journey."}
          </p>
          <Button
            onClick={handleStartOrContinue}
            size="lg"
            className="gap-2 shrink-0"
          >
            <PlayCircle className="h-4 w-4" />
            {isEnrolled ? "Continue" : "Start Course"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CourseDetailModal;
