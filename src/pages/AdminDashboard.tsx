import { useState, useMemo, useCallback, useSyncExternalStore } from "react";
import { courseStore } from "@/data/courseStore";
import { learnerStore, Learner } from "@/data/learnerStore";
import { kenyanCounties } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Users, TrendingUp, Award, BarChart3, Filter, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, Brush,
} from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#a4de6c",
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Generate mock monthly data for 2 years to simulate large volumes
const generateMonthlyTrend = () => {
  const data: { month: string; enrollments: number; completions: number }[] = [];
  for (let y = 2024; y <= 2026; y++) {
    const months = y === 2026 ? 4 : 12;
    for (let m = 0; m < months; m++) {
      data.push({
        month: `${MONTHS[m]} ${y}`,
        enrollments: Math.floor(Math.random() * 80) + 10,
        completions: Math.floor(Math.random() * 50) + 5,
      });
    }
  }
  return data;
};

const TABLE_PAGE_SIZE = 5;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const courses = useSyncExternalStore(courseStore.subscribe, courseStore.getAll);
  const learners = useSyncExternalStore(learnerStore.subscribe, learnerStore.getAll);

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterOrg, setFilterOrg] = useState("all");
  const [filterCounty, setFilterCounty] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchLearner, setSearchLearner] = useState("");

  // Pagination
  const [coursePage, setCoursePage] = useState(1);
  const [learnerPage, setLearnerPage] = useState(1);

  // Unique values for filter dropdowns
  const uniqueOrgs = useMemo(() => [...new Set(learners.map((l) => l.organization.split(" - ")[0]))], [learners]);
  const uniqueCounties = useMemo(() => [...new Set(learners.map((l) => l.county).filter(Boolean))], [learners]);
  const uniqueCategories = useMemo(() => [...new Set(courses.map((c) => c.category))], [courses]);

  const resetFilters = useCallback(() => {
    setFilterOrg("all");
    setFilterCounty("all");
    setFilterCategory("all");
    setSearchLearner("");
  }, []);

  // Filtered data
  const filteredLearners = useMemo(() => {
    return learners.filter((l) => {
      const orgName = l.organization.split(" - ")[0];
      if (filterOrg !== "all" && orgName !== filterOrg) return false;
      if (filterCounty !== "all" && l.county !== filterCounty) return false;
      if (searchLearner && !l.name.toLowerCase().includes(searchLearner.toLowerCase()) && !l.email.toLowerCase().includes(searchLearner.toLowerCase())) return false;
      return true;
    });
  }, [learners, filterOrg, filterCounty, searchLearner]);

  const filteredCourses = useMemo(() => {
    if (filterCategory === "all") return courses;
    return courses.filter((c) => c.category === filterCategory);
  }, [courses, filterCategory]);

  // Stats from filtered data
  const totalCompleted = filteredLearners.reduce((s, l) => s + l.coursesCompleted, 0);
  const totalInProgress = filteredLearners.reduce((s, l) => s + l.coursesInProgress, 0);
  const avgCompletion = filteredLearners.length
    ? Math.round((totalCompleted / (totalCompleted + totalInProgress || 1)) * 100)
    : 0;

  const stats = [
    { label: "Total Courses", value: filteredCourses.length, icon: BookOpen, color: "bg-primary/10 text-primary" },
    { label: "Total Learners", value: filteredLearners.length, icon: Users, color: "bg-green-500/10 text-green-600" },
    { label: "Avg. Completion", value: `${avgCompletion}%`, icon: TrendingUp, color: "bg-yellow-500/10 text-yellow-600" },
    { label: "Certifications", value: totalCompleted, icon: Award, color: "bg-blue-500/10 text-blue-600" },
  ];

  // Chart data - memoized with aggregation
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredCourses.forEach((c) => { map[c.category] = (map[c.category] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredCourses]);

  const orgData = useMemo(() => {
    const map: Record<string, { completed: number; inProgress: number }> = {};
    filteredLearners.forEach((l) => {
      const org = l.organization.split(" - ")[0];
      if (!map[org]) map[org] = { completed: 0, inProgress: 0 };
      map[org].completed += l.coursesCompleted;
      map[org].inProgress += l.coursesInProgress;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, total: v.completed + v.inProgress }))
      .sort((a, b) => b.total - a.total);
  }, [filteredLearners]);

  const countyData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLearners.forEach((l) => { if (l.county) map[l.county] = (map[l.county] || 0) + 1; });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLearners]);

  const monthlyTrend = useMemo(() => generateMonthlyTrend(), []);

  // Paginated tables
  const paginatedCourses = filteredCourses.slice((coursePage - 1) * TABLE_PAGE_SIZE, coursePage * TABLE_PAGE_SIZE);
  const coursePages = Math.max(1, Math.ceil(filteredCourses.length / TABLE_PAGE_SIZE));
  const paginatedLearners = filteredLearners.slice((learnerPage - 1) * TABLE_PAGE_SIZE, learnerPage * TABLE_PAGE_SIZE);
  const learnerPages = Math.max(1, Math.ceil(filteredLearners.length / TABLE_PAGE_SIZE));

  const hasActiveFilters = filterOrg !== "all" || filterCounty !== "all" || filterCategory !== "all" || searchLearner !== "";

  const tooltipStyle = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Button onClick={() => navigate("/courses/create")}>+ Create Course</Button>
      </div>

      {/* Collapsible Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Active</span>
                  )}
                </span>
                {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Organization</Label>
                  <Select value={filterOrg} onValueChange={(v) => { setFilterOrg(v); setLearnerPage(1); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organizations</SelectItem>
                      {uniqueOrgs.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">County</Label>
                  <Select value={filterCounty} onValueChange={(v) => { setFilterCounty(v); setLearnerPage(1); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Counties</SelectItem>
                      {uniqueCounties.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Course Category</Label>
                  <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCoursePage(1); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {uniqueCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Search Learner</Label>
                  <Input placeholder="Name or email..." value={searchLearner} onChange={(e) => { setSearchLearner(e.target.value); setLearnerPage(1); }} />
                </div>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="mt-3" onClick={resetFilters}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset Filters
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" /> Enrollment & Completion Trends
            </CardTitle>
            <p className="text-xs text-muted-foreground">Drag the brush below to zoom into a time range</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-35} textAnchor="end" height={50} interval="preserveStartEnd" />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="enrollments" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} name="Enrollments" />
                <Area type="monotone" dataKey="completions" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.15} strokeWidth={2} name="Completions" />
                <Legend />
                <Brush dataKey="month" height={25} stroke="hsl(var(--primary))" fill="hsl(var(--muted))" startIndex={Math.max(0, monthlyTrend.length - 12)} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Courses by Category</CardTitle>
            <p className="text-xs text-muted-foreground">Click a segment for details</p>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No data for selected filters</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    animationBegin={0}
                    animationDuration={600}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} className="cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress by Organization</CardTitle>
            <p className="text-xs text-muted-foreground">Showing top organizations by total activity</p>
          </CardHeader>
          <CardContent>
            {orgData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No data for selected filters</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(280, orgData.length * 45)}>
                <BarChart data={orgData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={130} stroke="hsl(var(--muted-foreground))" fontSize={10} tick={{ width: 125 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Completed" animationDuration={400} />
                  <Bar dataKey="inProgress" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} name="In Progress" animationDuration={400} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Learners by County</CardTitle>
            <p className="text-xs text-muted-foreground">
              {countyData.length > 10
                ? `Showing top 10 of ${countyData.length} counties. Drag brush to explore.`
                : `${countyData.length} counties`}
            </p>
          </CardHeader>
          <CardContent>
            {countyData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No data for selected filters</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={countyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-35} textAnchor="end" height={50} interval={0} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Learners" animationDuration={400} />
                  {countyData.length > 10 && (
                    <Brush dataKey="name" height={20} stroke="hsl(var(--chart-4))" fill="hsl(var(--muted))" endIndex={9} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Courses Table - Paginated */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Courses {filterCategory !== "all" && <span className="text-sm font-normal text-muted-foreground">— filtered by {filterCategory}</span>}</CardTitle>
        </CardHeader>
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
              {paginatedCourses.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/courses/${c.id}`)}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell>{c.duration}</TableCell>
                </TableRow>
              ))}
              {paginatedCourses.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No courses found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {coursePages > 1 && (
            <div className="flex justify-between items-center mt-3 text-sm">
              <span className="text-muted-foreground">Page {coursePage} of {coursePages} ({filteredCourses.length} total)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={coursePage === 1} onClick={() => setCoursePage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={coursePage === coursePages} onClick={() => setCoursePage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learner Table - Paginated */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Learner Overview
            {hasActiveFilters && <span className="text-sm font-normal text-muted-foreground ml-2">({filteredLearners.length} of {learners.length})</span>}
          </CardTitle>
        </CardHeader>
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
              {paginatedLearners.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.organization}</TableCell>
                  <TableCell>{l.county}</TableCell>
                  <TableCell>{l.coursesCompleted}</TableCell>
                  <TableCell>{l.coursesInProgress}</TableCell>
                </TableRow>
              ))}
              {paginatedLearners.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No learners match filters</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {learnerPages > 1 && (
            <div className="flex justify-between items-center mt-3 text-sm">
              <span className="text-muted-foreground">Page {learnerPage} of {learnerPages} ({filteredLearners.length} total)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={learnerPage === 1} onClick={() => setLearnerPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={learnerPage === learnerPages} onClick={() => setLearnerPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;