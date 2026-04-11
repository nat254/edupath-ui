import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { courses } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Users, Award, ArrowRight } from "lucide-react";

const LandingPage = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground">TrainHub</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Log in</Button>
            <Button size="sm" onClick={() => navigate("/register")}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center relative">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
            Empower Your Team with
            <span className="text-primary"> Expert Training</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Access curated courses designed for healthcare professionals. Track progress, earn certifications, and grow your skills.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-6">
            {[
              { icon: BookOpen, label: `${courses.length} Courses`, sub: "Expert-crafted" },
              { icon: Users, label: "500+ Learners", sub: "And growing" },
              { icon: Award, label: "Certified", sub: "Upon completion" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 bg-card border border-border rounded-xl px-5 py-3 shadow-sm">
                <s.icon className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Catalog */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Explore Courses</h2>
            <p className="text-sm text-muted-foreground">Click on a course to get started</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No courses found for "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((c) => (
              <Card
                key={c.id}
                className="group cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all duration-200"
                onClick={() => navigate("/login")}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">{c.category}</Badge>
                    <Badge variant="outline" className="text-xs">{c.duration}</Badge>
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.objectives}</p>
                  <div className="flex items-center text-primary text-sm font-medium pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Start Learning <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © 2026 TrainHub. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
