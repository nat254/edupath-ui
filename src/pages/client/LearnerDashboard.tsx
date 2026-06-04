import { useEffect, useSyncExternalStore, useRef, useState } from "react";
import { courseStore } from "@/data/courseStore";
import { enrollmentStore } from "@/data/enrollmentStore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, Clock, GraduationCap, ArrowRight } from "lucide-react";
import RatePlatform from "@/components/RatePlatform";

/* ─── Intersection-observer hook (mirrors LandingPage) ─── */
function useInView(threshold = 0.1) {
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

const LearnerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  useEffect(() => {
    if (userId) enrollmentStore.fetchMyEnrollments(userId);
    courseStore.fetchAll();
  }, [userId]);

  useSyncExternalStore(enrollmentStore.subscribe, enrollmentStore.getSnapshot);
  const courses = useSyncExternalStore(courseStore.subscribe, courseStore.getAll);

  const myEnrollments    = enrollmentStore.getMyEnrollments(userId);
  const enrolledCourseIds = new Set(myEnrollments.map((e) => e.courseId));
  const myCourses        = courses.filter((c) => enrolledCourseIds.has(c.id));
  const completed        = myEnrollments.filter((e) => e.status === "complete").length;
  const inProgress       = myEnrollments.filter((e) => e.status === "in_progress").length;

  const headerSection = useInView(0.05);
  const statsSection  = useInView(0.1);
  const gridSection   = useInView(0.05);

  return (
    <div className="space-y-10">

      {/* ── Page header ── */}
      <div
        ref={headerSection.ref}
        className={`transition-all duration-700 ${headerSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Dashboard</p>
        <h1 className="text-2xl font-black tracking-tight text-foreground leading-tight">My Learning</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your progress and continue where you left off.
        </p>
      </div>

      {/* ── Stats ── */}
      <div
        ref={statsSection.ref}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          { icon: BookOpen,    label: "Enrolled",    value: myCourses.length, color: "text-primary",      bg: "bg-primary/10",      delay: "0ms"   },
          { icon: CheckCircle, label: "Completed",   value: completed,        color: "text-emerald-500",  bg: "bg-emerald-500/10",  delay: "80ms"  },
          { icon: Clock,       label: "In Progress", value: inProgress,       color: "text-amber-500",    bg: "bg-amber-500/10",    delay: "160ms" },
        ].map(({ icon: Icon, label, value, color, bg, delay }) => (
          <div
            key={label}
            className={`group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 ${
              statsSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: delay }}
          >
            {/* Hover tint — same pattern as LandingPage feature cards */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/4 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`h-5 w-5 ${color}`} strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-3xl font-black text-foreground leading-tight tabular-nums">{value}</p>
              </div>
            </div>

            {/* Ghost number — same as LandingPage feature cards
            <span className="absolute bottom-2 right-4 text-5xl font-black text-foreground/[0.04] select-none group-hover:text-primary/[0.06] transition-colors duration-300">
              {value}
            </span> */}
          </div>
        ))}
      </div>

      {/* ── Section label ── */}
      <div
        ref={gridSection.ref}
        className={`transition-all duration-700 ${gridSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Catalog</p>
            <h2 className="text-lg font-bold tracking-tight text-foreground">My Courses</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={() => navigate("/courses")}
          >
            Browse all <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* ── Empty state ── */}
        {myCourses.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center rounded-2xl border border-border/50 border-dashed bg-muted/20">
            <div className="h-14 w-14 rounded-2xl bg-primary/8 flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-primary/40" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No courses started yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Head to the Courses page and click{" "}
                <span className="text-foreground font-medium">"Start Course"</span>{" "}
                to begin learning.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px transition-all duration-300"
              onClick={() => navigate("/courses")}
            >
              Browse Courses
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          /* ── Course grid ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {myCourses.map((course, i) => {
              const enrollment = myEnrollments.find((e) => e.courseId === course.id);
              const pct    = enrollment?.progress ?? 0;
              const status = enrollment?.status ?? "in_progress";
              const done   = status === "complete";

              return (
                <div
                  key={course.id}
                  className={`group cursor-pointer rounded-sm border border-border/50 bg-card overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-primary/8 hover:border-primary/30 hover:-translate-y-1.5 transition-all duration-300 ${
                    gridSection.visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  }`}
                  style={{ transitionDelay: `${i * 60}ms` }}
                  onClick={() => navigate(`/courses/${course.id}/player`)}
                >
                  {/* Cover image */}
                  <div className="relative w-full h-40 overflow-hidden bg-muted">
                    {course.coverImage ? (
                      <img
                        src={course.coverImage}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/8 via-primary/5 to-accent/8">
                        <BookOpen className="h-10 w-10 text-primary/25" />
                      </div>
                    )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Duration chip */}
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
                      {course.duration}
                    </div>

                    {/* Completion badge */}
                    {done && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-emerald-500/90 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        <CheckCircle className="h-3 w-3" />
                        Done
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-5 flex flex-col flex-1 gap-3">
                    {/* Category badge — matches LandingPage course cards */}
                    <Badge
                      variant="secondary"
                      className="w-fit text-xs font-medium bg-primary/8 text-primary border-0 rounded-md"
                    >
                      {course.category}
                    </Badge>

                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2 leading-snug">
                      {course.title}
                    </h3>

                    {/* Progress */}
                    <div className="space-y-1.5 mt-auto">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Progress</span>
                        <span className={done ? "text-blue-500 font-semibold" : ""}>{pct}%</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${done ? "bg-blue-500" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer row */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <span className="text-xs text-muted-foreground/60">
                        {done ? "Review anytime" : "Continue learning"}
                      </span>
                      <div className="flex items-center gap-1 text-primary text-xs font-semibold opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300">
                        {done ? "Review" : "Continue"} <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
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

export default LearnerDashboard;