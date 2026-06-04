import {
  useState,
  useMemo,
  useEffect,
  useSyncExternalStore,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { courseStore } from "@/data/courseStore";
import { userStore } from "@/data/userStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  BookOpen,
  Users,
  ArrowRight,
  Star,
  Quote,
  GraduationCap,
  CheckCircle,
  Sparkles,
  ChevronRight,
  Shield,
  Zap,
  TrendingUp,
  ClipboardCheck,
} from "lucide-react";
import { testimonialStore } from "@/data/testimonialStore";

/* ─── Intersection-Observer hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Animated counter ─── */
function AnimatedCount({
  target,
  duration = 1400,
}: {
  target: number;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible || target === 0) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const id = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(id);
      } else setCount(start);
    }, 16);
    return () => clearInterval(id);
  }, [visible, target, duration]);
  return <span ref={ref}>{count.toLocaleString()}</span>;
}

/* ─── Scroll progress bar ─── */
function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-transparent">
      <div
        className="h-full bg-primary transition-all duration-75"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

const LandingPage = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    courseStore.fetchAll();
    userStore.fetchAll("healthcare_provider");
    testimonialStore.fetchApproved();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const testimonials = useSyncExternalStore(
    testimonialStore.subscribe,
    testimonialStore.getAll,
  );
  const courses = useSyncExternalStore(
    courseStore.subscribe,
    courseStore.getAll,
  );
  const learners = useSyncExternalStore(userStore.subscribe, userStore.getAll);

  // const allCategories = useMemo(() => {
  //   const cats = Array.from(
  //     new Set(courses.map((c: { category: string }) => c.category)),
  //   );
  //   return ["All", ...cats];
  // }, [courses]);

  // const filtered = courses.filter((c) => {
  //   const matchesSearch =
  //     c.title.toLowerCase().includes(search.toLowerCase()) ||
  //     c.category.toLowerCase().includes(search.toLowerCase());
  //   const matchesCategory =
  //     activeCategory === "All" || c.category === activeCategory;
  //   return matchesSearch && matchesCategory;
  // });

  const heroSection = useInView(0.05);
  const catalogSection = useInView(0.05);
  const testimonialsSection = useInView(0.1);
  const featuresSection = useInView(0.1);
  const statsSection = useInView(0.1);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <ScrollProgress />

      {/* ══════════════════ HEADER ══════════════════ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl border-b border-border shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-3 items-center px-6 py-3">
          {/* Left — logo */}
          <div
            className="flex items-center gap-2.5 group cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/30 group-hover:shadow-lg group-hover:shadow-primary/40 transition-all duration-300">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-foreground tracking-tight">
              Training<span className="text-primary"> Portal</span>
            </span>
          </div>

          {/* Center — nav */}
          <nav className="hidden md:flex items-center justify-center gap-3">
            {["Home", "Features", "Testimonials"].map((item) => (
              <button
                key={item}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline decoration-wavy decoration-primary transition-all duration-200"
                onClick={() =>
                  document
                    .getElementById(item.toLowerCase())
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                {item}
              </button>
            ))}
          </nav>

          {/* Right — actions */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-sm rounded-sm text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:-translate-y-px transition-all duration-300"
              onClick={() => navigate("/login")}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              className="text-sm rounded-sm bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px transition-all duration-300"
              onClick={() => navigate("/login")}
            >
              Get started
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ══════════════════ HERO ══════════════════ */}
      <section
        id="home"
        ref={heroSection.ref}
        className="relative min-h-screen flex items-center"
      >
        {/* Layered background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,hsl(var(--primary)/0.08),transparent)]" />
          {/* Dot grid */}
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-28 pb-20 w-full">
          <div className="max-w-4xl mx-auto text-center">
            {/* Eyebrow */}
            <div
              className={`inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 mb-8 transition-all duration-700 ${
                heroSection.visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Healthcare Training Platform
              </span>
            </div>

            {/* Headline — tighter, bolder */}
            <h1
              className={`text-4xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-[1.05] mb-6 transition-all duration-700 delay-100 ${
                heroSection.visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              Advance
              <br />
              <span className="relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-teal-400 to-green-400">
                  Digital Health
                </span>
                {/* Underline accent */}
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  viewBox="0 0 300 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 9 Q75 2 150 6 Q225 10 298 4"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.4"
                  />
                </svg>
              </span>{" "}
              knowledge, one course at a time
            </h1>

            {/* Sub */}
            <p
              className={`text-md sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed mb-10 transition-all duration-700 delay-200 ${
                heroSection.visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              Curated courses built for healthcare professionals. Track
              progress, and grow your digital health expertise at your own pace,
              all in one place.
            </p>

            {/* CTAs */}
            <div
              className={`flex flex-wrap justify-center gap-3 mb-16 transition-all duration-700 delay-300 ${
                heroSection.visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <Button
                size="lg"
                className="h-12 px-8 text-base bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
                onClick={() => navigate("/login")}
              >
                Start for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base border-border/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:-translate-y-0.5 transition-all duration-300"
                // onClick={() =>
                //   document
                //     .getElementById("courses")
                //     ?.scrollIntoView({ behavior: "smooth" })
                // }
                onClick={() => navigate("/login")}
              >
              <BookOpen className="mr-2 h-4 w-4" />
                Browse courses
              </Button>
            </div>

            {/* Trust strip */}
            <p
              className={`text-xs text-muted-foreground/60 tracking-wide uppercase mb-5 transition-all duration-700 delay-400 ${
                heroSection.visible ? "opacity-100" : "opacity-0"
              }`}
            >
              Trusted by healthcare organizations
            </p>
            <div
              className={`flex flex-wrap justify-center gap-6 transition-all duration-700 delay-[450ms] ${
                heroSection.visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2"
              }`}
            >
              {["Hospitals", "Clinics", "Health Systems", "NGOs"].map((org) => (
                <span
                  key={org}
                  className="text-sm font-semibold text-muted-foreground/40 tracking-wide"
                >
                  {org}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent -z-10" />
      </section>

      {/* ══════════════════ STATS BAR ══════════════════ */}
      <section
        ref={statsSection.ref}
        className="border-y border-border bg-muted/40"
      >
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {[
              {
                value: courses.length,
                suffix: "+",
                label: "Courses available",
                icon: BookOpen,
              },
              {
                value: learners.length,
                suffix: "+",
                label: "Active learners",
                icon: Users,
              },
              {
                value: 98,
                suffix: "%",
                label: "Satisfaction rate",
                icon: Star,
              },
              { value: 24, suffix: "/7", label: "Platform access", icon: Zap },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`text-center transition-all duration-700 ${
                  statsSection.visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <p className="text-3xl sm:text-4xl font-black text-foreground tabular-nums">
                  <AnimatedCount target={s.value} />
                  {s.suffix}
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ FEATURES ══════════════════ */}
      <section
        id="features"
        ref={featuresSection.ref}
        className="py-16 sm:py-24 px-4 sm:px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div
            className={`max-w-2xl mb-10 sm:mb-16 transition-all duration-700 ${
              featuresSection.visible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              Why Training Portal
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight leading-tight">
              Everything your team needs to learn, fast
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: BookOpen,
                tag: "Content",
                title: "Expert-crafted curriculum",
                desc: "Professionally designed modules tailored for healthcare professionals at every level — from nurses to CMOs.",
                accent: "primary",
              },
              {
                icon: TrendingUp,
                tag: "Analytics",
                title: "Real-time progress tracking",
                desc: "Monitor completion rates, quiz scores, and certification status across your entire team from one dashboard.",
                accent: "accent",
              },
              {
                icon: ClipboardCheck,
                tag: "Assessments",
                title: "Knowledge checks built in",
                desc: "Every course includes quizzes to reinforce understanding and help learners measure how much they've retained.",
                accent: "primary",
              },
            ].map((f, i) => (
              <div
                key={f.title}
                className={`group relative p-5 sm:p-7 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 ${
                  featuresSection.visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${100 + i * 120}ms` }}
              >
                {/* Hover tint */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/4 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-4 sm:mb-5">
                    <div
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center bg-primary/10
                      group-hover:scale-110 transition-transform duration-300"
                    >
                      <f.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <span
                      className="text-xs font-semibold uppercase tracking-wider 
                      text-primary/70"
                    >
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2 leading-snug">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </div>

                {/* Subtle number */}
                <span className="absolute top-4 right-5 sm:top-5 sm:right-6 text-5xl font-black text-foreground/[0.04] select-none group-hover:text-primary/[0.06] transition-colors duration-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ TESTIMONIALS ══════════════════ */}
      <section
        id="testimonials"
        ref={testimonialsSection.ref}
        className="py-24 px-6 border-t border-border"
      >
        <div className="max-w-6xl mx-auto">
          <div
            className={`text-center mb-14 transition-all duration-700 ${
              testimonialsSection.visible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              Social proof
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Loved by healthcare professionals
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Real feedback from learners across hospitals, clinics, and health
              systems
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className={`group relative p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 ${
                  testimonialsSection.visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${100 + i * 100}ms` }}
              >
                {/* Large decorative quote */}
                <Quote className="absolute top-4 right-5 h-9 w-9 text-primary/8 group-hover:text-primary/12 transition-colors duration-300" />

                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`h-3.5 w-3.5 ${
                        idx < t.rating
                          ? "text-amber-400 fill-amber-400"
                          : "text-border"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-sm text-foreground leading-relaxed mb-5 italic relative">
                  "{t.text}"
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-border/40">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-none mb-0.5">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ CTA SECTION ══════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/6 via-primary/4 to-primary/6 p-10 sm:p-16 text-center">
            {/* Background pattern */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/8 rounded-full blur-3xl -translate-y-1/2" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 mb-6">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Join today
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight leading-tight mb-4">
                Ready to transform how your
                <br />
                learn?
              </h2>
              <p className="text-base text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed">
                Join healthcare professionals already learning on Training
                Portal. Create an account in under a minute.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  size="lg"
                  className="h-12 px-10 text-base bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
                  onClick={() => navigate("/register")}
                >
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base border-border/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:-translate-y-0.5 transition-all duration-300"
                  onClick={() => navigate("/login")}
                >
                  Sign in
                </Button>
              </div>

              {/* Micro-social proof */}
              <div className="mt-8 flex items-center justify-center gap-3">
                <div className="flex -space-x-2">
                  {["A", "B", "C", "D"].map((letter) => (
                    <div
                      key={letter}
                      className="h-7 w-7 rounded-full bg-primary/15 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary"
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {learners.length}+
                  </span>{" "}
                  learners enrolled
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="border-t border-border py-8 sm:py-10 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground">
              Training<span className="text-primary">Portal</span>
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {["Privacy", "Terms", "Contact"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {link}
              </a>
            ))}
          </div>

          <p className="text-xs text-muted-foreground/60 text-center sm:text-right">
            © 2026 Training Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
