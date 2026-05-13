import { useState, useMemo, useEffect, useSyncExternalStore, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { courseStore } from "@/data/courseStore";
import { learnerStore } from "@/data/learnerStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, BookOpen, Users, ArrowRight, Star, Quote,
  GraduationCap, CheckCircle, Sparkles, ChevronRight,
} from "lucide-react";
import { testimonialStore } from "@/data/testimonialStore";

/* ─── Intersection-Observer hook for scroll-triggered animations ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Animated counter ────────────────────────────────────────────── */
function AnimatedCount({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible || target === 0) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(id); }
      else setCount(start);
    }, 16);
    return () => clearInterval(id);
  }, [visible, target, duration]);
  return <span ref={ref}>{count}</span>;
}

const LandingPage = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const navigate = useNavigate();

  // Fetch data from API on mount & subscribe reactively
  useEffect(() => {
    courseStore.fetchAll();
    learnerStore.fetchAll();
    testimonialStore.fetchApproved();
  }, []);

  const testimonials = useSyncExternalStore(testimonialStore.subscribe, testimonialStore.getAll);
  const courses = useSyncExternalStore(courseStore.subscribe, courseStore.getAll);
  const learners = useSyncExternalStore(learnerStore.subscribe, learnerStore.getAll);

  const allCategories = useMemo(() => {
    const cats = Array.from(new Set(courses.map((c: { category: string }) => c.category)));
    return ["All", ...cats];
  }, [courses]);

  const filtered = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Scroll-based section visibility
  const heroSection = useInView(0.1);
  const catalogSection = useInView(0.05);
  const testimonialsSection = useInView(0.1);
  const featuresSection = useInView(0.1);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <header className="border-b border-border/60 bg-card/70 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
              <GraduationCap className="h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              Train<span className="text-primary">Hub</span>
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-primary/5 hover:text-primary transition-colors duration-200"
              onClick={() => navigate("/login")}
            >
              Log in
            </Button>
            <Button
              size="sm"
              className="shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
              onClick={() => navigate("/register")}
            >
              Get Started
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section ref={heroSection.ref} className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "2s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
        </div>

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20 text-center relative">
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6 ${heroSection.visible ? "animate-fade-up" : "opacity-0"}`}>
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Healthcare Training Platform</span>
          </div>

          {/* Heading */}
          <h1
            className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-[1.1] ${heroSection.visible ? "animate-fade-up" : "opacity-0"}`}
            style={{ animationDelay: "0.1s" }}
          >
            Empower Your Team with
            <br />
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-accent">
                Expert Training
              </span>
              <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-primary/60 to-accent/60 rounded-full" />
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className={`mt-6 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed ${heroSection.visible ? "animate-fade-up" : "opacity-0"}`}
            style={{ animationDelay: "0.2s" }}
          >
            Access curated courses designed for healthcare professionals.
            Track progress, earn certifications, and grow your skills.
          </p>

          {/* CTA buttons */}
          <div
            className={`mt-8 flex flex-wrap justify-center gap-4 ${heroSection.visible ? "animate-fade-up" : "opacity-0"}`}
            style={{ animationDelay: "0.3s" }}
          >
            <Button
              size="lg"
              className="text-base px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
              onClick={() => navigate("/register")}
            >
              Start Learning Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 hover:bg-primary/5 hover:text-primary transition-all duration-300 hover:-translate-y-0.5"
              onClick={() => document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" })}
            >
              Browse Courses
            </Button>
          </div>

          {/* Stats */}
          <div
            className={`mt-14 flex flex-wrap justify-center gap-8 ${heroSection.visible ? "animate-fade-up" : "opacity-0"}`}
            style={{ animationDelay: "0.45s" }}
          >
            {[
              { icon: BookOpen, value: courses.length, label: "Courses", sub: "Expert-crafted content" },
              { icon: Users, value: learners.length, label: "Learners", sub: "And growing daily" },
              { icon: CheckCircle, value: 98, label: "% Satisfaction", sub: "From verified reviews" },
            ].map((s, i) => (
              <div
                key={s.label}
                className="group flex items-center gap-4 bg-card/80 backdrop-blur-sm border border-border/60 rounded-2xl px-6 py-4 shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-1 transition-all duration-300"
                style={{ animationDelay: `${0.5 + i * 0.1}s` }}
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors duration-300">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xl font-bold text-foreground">
                    <AnimatedCount target={s.value} />{s.label === "% Satisfaction" ? "%" : "+"} <span className="text-sm font-semibold text-muted-foreground">{s.label === "% Satisfaction" ? "Satisfaction" : s.label}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section ref={featuresSection.ref} className="border-t border-border/50 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className={`text-center mb-12 ${featuresSection.visible ? "animate-fade-up" : "opacity-0"}`}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Why Choose TrainHub?</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Built specifically for healthcare organizations to deliver impactful training
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: BookOpen,
                title: "Expert-Crafted Courses",
                desc: "Professionally designed curriculum tailored for healthcare professionals at every level.",
                color: "primary",
              },
              {
                icon: CheckCircle,
                title: "Track Your Progress",
                desc: "Real-time dashboards to monitor completion, scores, and certifications across your team.",
                color: "accent",
              },
              {
                icon: GraduationCap,
                title: "Earn Certifications",
                desc: "Receive verifiable certificates upon course completion to advance your career.",
                color: "primary",
              },
            ].map((f, i) => (
              <div
                key={f.title}
                className={`group relative rounded-2xl border border-border/60 bg-card p-6 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 ${featuresSection.visible ? "animate-fade-up" : "opacity-0"}`}
                style={{ animationDelay: `${0.1 + i * 0.15}s` }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${f.color === "accent" ? "bg-accent/10" : "bg-primary/10"} group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon className={`h-6 w-6 ${f.color === "accent" ? "text-accent" : "text-primary"}`} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ COURSE CATALOG ═══════════════════ */}
      <section ref={catalogSection.ref} id="courses" className="max-w-6xl mx-auto px-4 py-16">
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 ${catalogSection.visible ? "animate-fade-up" : "opacity-0"}`}>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Explore Courses
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Click on a course to get started</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              className="pl-9 bg-card border-border/60 focus:border-primary/40 transition-colors duration-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category filters */}
        <div className={`flex flex-wrap gap-2 mb-8 ${catalogSection.visible ? "animate-fade-up" : "opacity-0"}`} style={{ animationDelay: "0.1s" }}>
          {allCategories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              className={`rounded-full text-xs transition-all duration-200 ${
                activeCategory === cat
                  ? "shadow-md shadow-primary/20"
                  : "hover:bg-primary/5 hover:border-primary/30"
              }`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Course grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-lg font-medium">No courses found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c, i) => (
              <Card
                key={c.id}
                className={`group cursor-pointer border-border/60 hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden ${catalogSection.visible ? "animate-scale-in" : "opacity-0"}`}
                style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                onClick={() => navigate("/login")}
              >
                {/* Cover image with overlay */}
                <div className="relative w-full h-40 overflow-hidden bg-muted">
                  {c.coverImage ? (
                    <img
                      src={c.coverImage}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                      <BookOpen className="h-10 w-10 text-primary/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                <CardContent className="p-5 space-y-3 flex flex-col flex-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs font-medium">{c.category}</Badge>
                    <Badge variant="outline" className="text-xs">{c.duration}</Badge>
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-1">
                    {c.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{c.objectives}</p>
                  <div className="flex items-center text-primary text-sm font-medium pt-2 mt-auto opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all duration-300">
                    Start Learning <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════ TESTIMONIALS ═══════════════════ */}
      <section ref={testimonialsSection.ref} className="bg-gradient-to-b from-muted/40 to-muted/20 border-t border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className={`text-center mb-12 ${testimonialsSection.visible ? "animate-fade-up" : "opacity-0"}`}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              What Our Learners Say
            </h2>
            <p className="text-sm text-muted-foreground mt-2">Real feedback from healthcare professionals</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card
                key={t.name}
                className={`relative overflow-hidden border-border/60 hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 ${testimonialsSection.visible ? "animate-fade-up" : "opacity-0"}`}
                style={{ animationDelay: `${0.1 + i * 0.12}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent" />
                <CardContent className="p-6 space-y-4 relative">
                  <Quote className="h-8 w-8 text-primary/15 absolute top-4 right-4" />
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 transition-colors duration-200 ${
                          i < t.rating ? "text-amber-400 fill-amber-400" : "text-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed italic">"{t.text}"</p>
                  <div className="pt-3 border-t border-border/60 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ CTA BANNER ═══════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10" />
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/8 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/8 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "2s" }} />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center relative">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Ready to Transform Your Training?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join healthcare professionals already learning on TrainHub. Start your journey today — it&apos;s completely free.
          </p>
          <Button
            size="lg"
            className="text-base px-10 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
            onClick={() => navigate("/register")}
          >
            Create Free Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-border/50 bg-card/50 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Train<span className="text-primary">Hub</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 TrainHub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
