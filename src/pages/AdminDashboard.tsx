import { useMemo, useSyncExternalStore } from "react";
import { courseStore } from "@/data/courseStore";
import { learnerStore } from "@/data/learnerStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, TrendingUp, Award, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const courses = useSyncExternalStore(courseStore.subscribe, courseStore.getAll);
  const learners = useSyncExternalStore(learnerStore.subscribe, learnerStore.getAll);

  const totalCompleted = learners.reduce((s, l) => s + l.coursesCompleted, 0);
  const totalInProgress = learners.reduce((s, l) => s + l.coursesInProgress, 0);
  const avgCompletion = learners.length
    ? Math.round((totalCompleted / (totalCompleted + totalInProgress || 1)) * 100)
    : 0;

  const stats = [
    { label: "Total Courses", value: courses.length, icon: BookOpen, color: "bg-primary/10 text-primary" },
    { label: "Total Learners", value: learners.length, icon: Users, color: "bg-green-500/10 text-green-600" },
    { label: "Avg. Completion", value: `${avgCompletion}%`, icon: TrendingUp, color: "bg-yellow-500/10 text-yellow-600" },
    { label: "Certifications", value: totalCompleted, icon: Award, color: "bg-blue-500/10 text-blue-600" },
  ];

  // Chart data
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    courses.forEach((c) => { map[c.category] = (map[c.category] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [courses]);

  const orgData = useMemo(() => {
    const map: Record<string, { completed: number; inProgress: number }> = {};
    learners.forEach((l) => {
      const org = l.organization.split(" - ")[0];
      if (!map[org]) map[org] = { completed: 0, inProgress: 0 };
      map[org].completed += l.coursesCompleted;
      map[org].inProgress += l.coursesInProgress;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
  }, [learners]);

  const countyData = useMemo(() => {
    const map: Record<string, number> = {};
    learners.forEach((l) => { map[l.county] = (map[l.county] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [learners]);

  // Monthly trend (mock)
  const monthlyTrend = [
    { month: "Jan", enrollments: 12, completions: 5 },
    { month: "Feb", enrollments: 19, completions: 9 },
    { month: "Mar", enrollments: 25, completions: 14 },
    { month: "Apr", enrollments: 32, completions: 20 },
    { month: "May", enrollments: 28, completions: 22 },
    { month: "Jun", enrollments: 35, completions: 28 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Button onClick={() => navigate("/courses/create")}>+ Create Course</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Enrollment & Completion Trends</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Area type="monotone" dataKey="enrollments" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="completions" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.15} strokeWidth={2} />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Courses by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Progress by Organization</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={orgData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" width={120} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="inProgress" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Learners by County</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={countyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <Card>
        <CardHeader><CardTitle>Courses</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/courses/${c.id}`)}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell>{c.duration}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Learner Overview</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>County</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>In Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {learners.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.organization}</TableCell>
                  <TableCell>{l.county}</TableCell>
                  <TableCell>{l.coursesCompleted}</TableCell>
                  <TableCell>{l.coursesInProgress}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;