import { useState, useRef, useEffect, useSyncExternalStore, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseStore } from "@/data/courseStore";
import { enrollmentStore } from "@/data/enrollmentStore";
import { feedbackStore } from "@/data/feedbackStore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import StarRating from "@/components/StarRating";
import { CheckCircle, XCircle, BookOpen, Loader2, FileText, ExternalLink } from "lucide-react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CoursePlayerPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  // Fetch courses & enrollments from API on mount
  useEffect(() => {
    courseStore.fetchAll();
    if (userId) enrollmentStore.fetchMyEnrollments(userId);
  }, [userId]);

  const courses = useSyncExternalStore(courseStore.subscribe, courseStore.getAll);
  const isLoading = useSyncExternalStore(courseStore.subscribe, courseStore.getIsLoading);
  // Subscribe to enrollment store so that state syncs when fetchMyEnrollments resolves
  useSyncExternalStore(enrollmentStore.subscribe, enrollmentStore.getSnapshot);
  const course = courses.find((c) => c.id === courseId) ?? null;

  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Enrollment (reactive) ─────────────────────────────────────────────────
  const enrollment = useMemo(
    () => (course && userId ? enrollmentStore.getEnrollment(userId, course.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [course?.id, userId, enrollmentStore.getSnapshot()],
  );
  const alreadyComplete = enrollment?.status === "complete";

  // ── Local state ──────────────────────────────────────────────────────────
  const [videoComplete, setVideoComplete] = useState(alreadyComplete);
  const [videoProgress, setVideoProgress] = useState(alreadyComplete ? 100 : 0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number[]>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(alreadyComplete);
  // null = no score recorded (old completion or not yet submitted)
  const [quizScore, setQuizScore] = useState<number | null>(
    alreadyComplete ? (enrollment?.quizScore ?? null) : null,
  );
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // ── Sync enrollment when it loads asynchronously (hard-refresh / direct URL) ──
  const hasSynced = useRef(false);
  useEffect(() => {
    if (!hasSynced.current && enrollment?.status === "complete") {
      hasSynced.current = true;
      setVideoComplete(true);
      setVideoProgress(100);
      setQuizSubmitted(true);
      setQuizScore(enrollment.quizScore ?? null);
    }
  }, [enrollment]);

  // ── Guard: loading ──────────────────────────────────────────────────────
  if (isLoading && !course) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading course…</p>
      </div>
    );
  }

  // ── Guard: course must exist ─────────────────────────────────────────────
  if (!course) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Course not found.
      </div>
    );
  }

  // ── Guard: user must be enrolled ─────────────────────────────────────────
  const isEnrolled = userId
    ? enrollmentStore.isEnrolled(userId, course.id)
    : false;

  if (!isEnrolled) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <BookOpen className="h-10 w-10 text-primary/60" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">You haven't started this course yet</h2>
          <p className="text-muted-foreground max-w-sm">
            Go to the Courses page, click{" "}
            <span className="font-medium text-foreground">"Start Course"</span>{" "}
            on <span className="font-medium text-foreground">"{course.title}"</span> to
            begin your learning journey.
          </p>
        </div>
        <Button onClick={() => navigate("/courses")}>Browse Courses</Button>
      </div>
    );
  }

  // ── Progress helpers ─────────────────────────────────────────────────────
  const allDone = videoComplete && quizSubmitted;
  const overallProgress =
    videoComplete && quizSubmitted
      ? 100
      : videoComplete
        ? 50
        : videoProgress / 2;

  // ── Video handlers ───────────────────────────────────────────────────────
  const handleTimeUpdate = () => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const pct =
      (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setVideoProgress(pct);
    // Only update DB every ~5% to avoid flooding
    if (Math.round(pct) % 5 === 0 && userId) {
      const overall = quizSubmitted ? Math.max(50, pct / 2) : pct / 2;
      void enrollmentStore.updateProgress(userId, course.id, overall);
    }
  };

  const handleVideoEnded = () => {
    // Video is complete ONLY when it actually ends
    setVideoComplete(true);
    setVideoProgress(100);
    if (userId) {
      void enrollmentStore.updateProgress(
        userId,
        course.id,
        quizSubmitted ? 100 : 50,
      );
    }
  };

  // ── Quiz handlers ─────────────────────────────────────────────────────────
  const saveQuizAttempt = async (score: number) => {
    try {
      await fetch(`${BASE}/quiz-attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, courseId: course.id, score }),
      });
    } catch (err) {
      console.error("Failed to save quiz attempt:", err);
    }
  };

  const handleQuizSubmit = () => {
    let correct = 0;
    course.quiz.forEach((q) => {
      const selected = quizAnswers[q.id] ?? [];
      if (q.isMultiple && q.correctIndexes) {
        const allCorrect =
          q.correctIndexes.every((ci) => selected.includes(ci)) &&
          selected.every((si) => q.correctIndexes!.includes(si));
        if (allCorrect) correct++;
      } else {
        if (selected[0] === q.correctIndex) correct++;
      }
    });
    const score = Math.round((correct / course.quiz.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);
    toast.success(`Quiz submitted! Score: ${score}%`);

    if (userId) {
      // Persist this attempt to the attempts log (always)
      void saveQuizAttempt(score);

      // Only update enrollment progress on the first completion — retakes keep progress = 100
      if (!alreadyComplete) {
        void enrollmentStore.updateProgress(userId, course.id, videoComplete ? 100 : 50, score);
      }
    }
  };

  const handleRetake = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  // ── Feedback handler ─────────────────────────────────────────────────────
  const handleFeedback = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setFeedbackSubmitting(true);
    try {
      await feedbackStore.submit({
        userId,
        courseId: course.id,
        courseName: course.title,
        userName: user?.name ?? "Learner",
        rating,
        comment: feedbackText.trim(),
      });
      setFeedbackSubmitted(true);
      toast.success("Thank you for your feedback!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit feedback";
      toast.error(message);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-muted-foreground text-sm">
            {course.category} · {course.duration}
          </p>
        </div>
        <Badge variant={allDone ? "default" : "secondary"}>
          {allDone ? "Complete" : "In Progress"}
        </Badge>
      </div>

      {/* Cover Image */}
      <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden bg-muted">
        {course.coverImage ? (
          <img
            src={course.coverImage}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <span className="text-6xl font-bold text-primary/40">
              {course.category.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Overall Progress</span>
          <span>{Math.round(overallProgress)}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      {/* Video */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Video Lesson</CardTitle>
        </CardHeader>
        <CardContent>
          <video
            ref={videoRef}
            src={course.videoUrl}
            controls
            className="w-full rounded-lg bg-foreground/5"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
          />
          {videoComplete && (
            <div className="mt-2 flex items-center gap-1 text-success text-sm">
              <CheckCircle className="h-4 w-4" /> Video completed
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Material */}
      {course.pdfUrl && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Course Material (PDF)
              </CardTitle>
              <a
                href={course.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                Open in new tab
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full rounded-lg overflow-hidden border bg-muted/30">
              <iframe
                src={course.pdfUrl}
                title="Course PDF Material"
                className="w-full border-0"
                style={{ height: "600px" }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              If the PDF doesn't display above,{" "}
              <a
                href={course.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                click here to download it
              </a>
              .
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quiz */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Quiz</CardTitle>
            {quizSubmitted && (
              <span className="text-sm font-semibold text-primary">
                Score: {quizScore}%
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {course.quiz.map((q, qi) => (
            <div key={q.id} className="space-y-2">
              <p className="font-medium">
                {qi + 1}. {q.question}
                {q.isMultiple && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    (Select all that apply)
                  </span>
                )}
              </p>
              <div className="space-y-1">
                {q.options.map((opt, oi) => {
                  const selected = (quizAnswers[q.id] ?? []).includes(oi);
                  const correctSet = q.isMultiple
                    ? (q.correctIndexes ?? [])
                    : [q.correctIndex];
                  const isCorrect = quizSubmitted && correctSet.includes(oi);
                  const isWrong =
                    quizSubmitted && selected && !correctSet.includes(oi);

                  return (
                    <button
                      key={oi}
                      disabled={quizSubmitted}
                      onClick={() => {
                        if (q.isMultiple) {
                          setQuizAnswers((p) => {
                            const prev = p[q.id] ?? [];
                            const updated = prev.includes(oi)
                              ? prev.filter((i) => i !== oi)
                              : [...prev, oi];
                            return { ...p, [q.id]: updated };
                          });
                        } else {
                          setQuizAnswers((p) => ({ ...p, [q.id]: [oi] }));
                        }
                      }}
                      className={`w-full text-left p-3 rounded-md border text-sm transition-colors
              ${selected && !quizSubmitted ? "border-primary bg-primary/5" : ""}
              ${isCorrect ? "border-success bg-success/10" : ""}
              ${isWrong ? "border-destructive bg-destructive/10" : ""}
              ${!selected && !isCorrect && !isWrong ? "hover:bg-muted/50" : ""}
              disabled:cursor-default
            `}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-4 w-4 shrink-0 rounded-${q.isMultiple ? "sm" : "full"} border flex items-center justify-center text-xs
                ${selected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"}
              `}
                        >
                          {selected && (q.isMultiple ? "✓" : "•")}
                        </span>
                        {opt}
                        {isCorrect && (
                          <CheckCircle className="h-4 w-4 text-success ml-auto" />
                        )}
                        {isWrong && (
                          <XCircle className="h-4 w-4 text-destructive ml-auto" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {!quizSubmitted ? (
            <Button
              onClick={handleQuizSubmit}
              disabled={Object.keys(quizAnswers).length < course.quiz.length}
            >
              Submit Quiz
            </Button>
          ) : quizScore === null ? (
            // Course was previously completed but score wasn't recorded (pre-feature data)
            <div className="p-5 rounded-xl border-2 text-center space-y-2 bg-muted/50 border-border">
              <CheckCircle className="h-9 w-9 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold">Quiz previously completed</p>
              <p className="text-xs text-muted-foreground">Score was not recorded for this attempt.</p>
              <Button size="sm" variant="outline" onClick={handleRetake} className="mt-1">
                Retake Quiz
              </Button>
            </div>
          ) : (
            <div className={`p-5 rounded-xl border-2 text-center space-y-2 ${
              quizScore >= 70
                ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
            }`}>
              {quizScore >= 70
                ? <CheckCircle className="h-9 w-9 text-emerald-600 mx-auto" />
                : <XCircle className="h-9 w-9 text-amber-600 mx-auto" />}
              <p className={`text-3xl font-bold tabular-nums ${quizScore >= 70 ? "text-emerald-600" : "text-amber-600"}`}>
                {quizScore}%
              </p>
              <p className="text-sm font-semibold">
                {quizScore >= 70 ? "Passed — great work!" : "Not quite yet — review the material and try again."}
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.round((quizScore / 100) * course.quiz.length)} of {course.quiz.length} correct
              </p>
              <Button size="sm" variant="outline" onClick={handleRetake} className="mt-1">
                Retake Quiz
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Course Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!feedbackSubmitted ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Rate this course</p>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <Textarea
                placeholder="Share your thoughts about this course..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={3}
              />
              <Button onClick={handleFeedback} disabled={feedbackSubmitting}>
                {feedbackSubmitting ? "Submitting…" : "Submit Feedback"}
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="font-medium">Thank you for your feedback!</p>
              <div className="mt-2">
                <StarRating value={rating} readonly />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default CoursePlayerPage;
