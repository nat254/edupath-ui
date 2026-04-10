import { courses } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

const CourseListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Courses</h1>
        {isAdmin && <Button onClick={() => navigate("/courses/create")}>+ Create Course</Button>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => (
          <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(isAdmin ? `/courses/${c.id}` : `/courses/${c.id}/player`)}>
            <CardContent className="p-5 space-y-2">
              <h3 className="font-semibold">{c.title}</h3>
              <div className="flex gap-2">
                <Badge variant="secondary">{c.category}</Badge>
                <Badge variant="outline">{c.duration}</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{c.objectives}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CourseListPage;
