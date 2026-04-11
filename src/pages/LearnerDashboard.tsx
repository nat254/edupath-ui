import { courses, mockLearnerProgress, LearnerProgress } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, Clock } from "lucide-react";
import RatePlatform from "@/components/RatePlatform";

const LearnerDashboard = () => {
  const navigate = useNavigate();
  const completed = mockLearnerProgress.filter((p) => p.status === "complete").length;
  const inProgress = mockLearnerProgress.filter((p) => p.status === "in_progress").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Learning</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Total Courses</p><p className="text-2xl font-bold">{courses.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-success" /></div>
            <div><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold">{completed}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center"><Clock className="h-5 w-5 text-warning" /></div>
            <div><p className="text-sm text-muted-foreground">In Progress</p><p className="text-2xl font-bold">{inProgress}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => {
          const progress = mockLearnerProgress.find((p) => p.courseId === course.id);
          const pct = progress?.progress ?? 0;
          const status = progress?.status ?? "not_started";

          return (
            <Card key={course.id} className="flex flex-col">
              <CardContent className="p-5 flex flex-col flex-1 gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{course.title}</h3>
                    <p className="text-xs text-muted-foreground">{course.category} · {course.duration}</p>
                  </div>
                  <Badge variant={status === "complete" ? "default" : status === "in_progress" ? "secondary" : "outline"}>
                    {status === "complete" ? "Complete" : status === "in_progress" ? "In Progress" : "Not Started"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span><span>{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
                <Button
                  className="mt-auto"
                  variant={status === "complete" ? "outline" : "default"}
                  onClick={() => navigate(`/courses/${course.id}/player`)}
                >
                  {status === "complete" ? "Review" : status === "in_progress" ? "Continue" : "Start Course"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rate the Platform */}
      <div className="max-w-md">
        <RatePlatform />
      </div>
    </div>
  );
};

export default LearnerDashboard;
