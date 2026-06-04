import { useEffect, useSyncExternalStore } from "react";
import { courseStore } from "@/data/courseStore";
import { enrollmentStore } from "@/data/enrollmentStore";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, Clock, GraduationCap, Briefcase } from "lucide-react";
import RatePlatform from "@/components/RatePlatform";

const InternalStaffDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  // Fetch enrollments on mount
  useEffect(() => {
    if (userId) enrollmentStore.fetchMyEnrollments(userId);
    courseStore.fetchAll();
  }, [userId]);

  // Subscribe to live stores
  useSyncExternalStore(enrollmentStore.subscribe, enrollmentStore.getSnapshot);
  const courses = useSyncExternalStore(courseStore.subscribe, courseStore.getAll);

  // Get courses the user has started
  const myEnrollments = enrollmentStore.getMyEnrollments(userId);
  const enrolledCourseIds = new Set(myEnrollments.map((e) => e.courseId));
  const myCourses = courses.filter((c) => enrolledCourseIds.has(c.id));

  const completed = myEnrollments.filter((e) => e.status === "complete").length;
  const inProgress = myEnrollments.filter((e) => e.status === "in_progress").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Portal Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{user?.name}</span> (
            <span className="font-medium text-foreground">{user?.designation}</span>)
          </p>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Enrolled Courses</p>
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
      <div>
        <h2 className="text-lg font-semibold mb-4">My Professional Development</h2>
        
        {myCourses.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center text-muted-foreground bg-muted/20 border border-dashed rounded-xl">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="max-w-sm">
              <p className="font-medium text-foreground">No courses started yet</p>
              <p className="text-sm mt-1">
                Browse our catalog to start training relevant to your role.
              </p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => navigate("/courses")}>
              Browse Courses
            </Button>
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
                      <div className="w-full h-full flex items-center justify-center bg-emerald-500/10">
                        <span className="text-3xl font-bold text-emerald-600/40 dark:text-emerald-400/40">
                          {course.category.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-5 flex flex-col flex-1 gap-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate" title={course.title}>{course.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {course.category} · {course.duration}
                        </p>
                        <div className="pt-1.5">
                          <Badge
                            className={
                              status === "complete"
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400"
                            }
                          >
                            {status === "complete" ? "Complete" : "In Progress"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2 [&>div]:bg-emerald-500" />
                    </div>

                    <Button
                      className="mt-4"
                      variant={status === "complete" ? "outline" : "default"}
                      onClick={() => navigate(`/courses/${course.id}/player`)}
                    >
                      {status === "complete" ? "Review Content" : "Continue Course"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Rate the Platform */}
      <div className="max-w-md">
        <RatePlatform />
      </div>
    </div>
  );
};

export default InternalStaffDashboard;
