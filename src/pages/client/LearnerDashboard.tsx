import { useEffect, useSyncExternalStore } from "react";
import { courseStore } from "@/data/courseStore";
import { enrollmentStore } from "@/data/enrollmentStore";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, Clock, GraduationCap } from "lucide-react";
import RatePlatform from "@/components/RatePlatform";

const LearnerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  // Fetch this user's enrollments from the backend on mount
  useEffect(() => {
    if (userId) enrollmentStore.fetchMyEnrollments(userId);
    courseStore.fetchAll();
  }, [userId]);

  // Subscribe to live stores
  useSyncExternalStore(enrollmentStore.subscribe, enrollmentStore.getSnapshot);
  const courses = useSyncExternalStore(courseStore.subscribe, courseStore.getAll);

  // Get only courses the user has started
  const myEnrollments = enrollmentStore.getMyEnrollments(userId);
  const enrolledCourseIds = new Set(myEnrollments.map((e) => e.courseId));
  const myCourses = courses.filter((c) => enrolledCourseIds.has(c.id));

  const completed = myEnrollments.filter((e) => e.status === "complete").length;
  const inProgress = myEnrollments.filter((e) => e.status === "in_progress").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Learning</h1>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Enrolled</p>
              <p className="text-2xl font-bold">{myCourses.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold">{inProgress}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Enrolled courses ─────────────────────────────────────────── */}
      {myCourses.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center text-muted-foreground">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div>
            <p className="font-medium">No courses started yet</p>
            <p className="text-sm">
              Head to the Courses page and click{" "}
              <span className="text-foreground font-medium">"Start Course"</span>{" "}
              to begin learning.
            </p>
          </div>
          <Button onClick={() => navigate("/courses")}>Browse Courses</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myCourses.map((course) => {
            const enrollment = myEnrollments.find(
              (e) => e.courseId === course.id,
            );
            const pct = enrollment?.progress ?? 0;
            const status = enrollment?.status ?? "in_progress";

            return (
              <Card key={course.id} className="flex flex-col">
                {/* Cover Image */}
                <div className="w-full h-36 rounded-t-lg overflow-hidden bg-muted">
                  {course.coverImage ? (
                    <img
                      src={course.coverImage}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <span className="text-3xl font-bold text-primary/40">
                        {course.category.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                <CardContent className="p-5 flex flex-col flex-1 gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{course.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {course.category} · {course.duration}
                      </p>
                      <div className="pt-1">
                        <Badge
                          variant={
                            status === "complete"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {status === "complete" ? "Complete" : "In Progress"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>

                  <Button
                    className="mt-auto"
                    variant={status === "complete" ? "outline" : "default"}
                    onClick={() => navigate(`/courses/${course.id}/player`)}
                  >
                    {status === "complete" ? "Review" : "Continue"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rate the Platform */}
      <div className="max-w-md">
        <RatePlatform />
      </div>
    </div>
  );
};

export default LearnerDashboard;
