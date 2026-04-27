import { useState, useRef } from "react";
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
import { CheckCircle, XCircle, BookOpen } from "lucide-react";

const CoursePlayerPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.nationalId ?? "";

  const course = courseStore.getById(courseId ?? "");
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoProgress, setVideoProgress] = useState(0);
  const [videoComplete, setVideoComplete] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number[]>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

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

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct =
      (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setVideoProgress(pct);
    if (pct > 90) setVideoComplete(true);

    // Persist progress to enrollment store
    const currentOverall =
      pct > 90 && quizSubmitted ? 100 : pct > 90 ? 50 : pct / 2;
    if (userId) enrollmentStore.updateProgress(userId, course.id, currentOverall);
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
    toast.success(`Quiz completed! Score: ${score}%`);

    // Mark as complete in enrollment store if video was already done
    if (userId && videoComplete) {
      enrollmentStore.updateProgress(userId, course.id, 100);
    } else if (userId) {
      enrollmentStore.updateProgress(userId, course.id, 50);
    }
  };

  const handleFeedback = () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    // Persist to feedbackStore so admin can review it
    feedbackStore.submit({
      courseId: course.id,
      courseName: course.title,
      userId: userId,
      userName: user?.name ?? "Learner",
      rating,
      comment: feedbackText.trim(),
    });
    setFeedbackSubmitted(true);
    toast.success("Thank you for your feedback!");
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
          {allDone ? "Complete" : "Incomplete"}
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
            onEnded={() => {
              setVideoComplete(true);
              if (userId) {
                enrollmentStore.updateProgress(
                  userId,
                  course.id,
                  quizSubmitted ? 100 : 50,
                );
              }
            }}
          />
          {videoComplete && (
            <div className="mt-2 flex items-center gap-1 text-success text-sm">
              <CheckCircle className="h-4 w-4" /> Video completed
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiz */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quiz</CardTitle>
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
          ) : (
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-lg font-bold">Score: {quizScore}%</p>
              <p className="text-sm text-muted-foreground">
                {quizScore >= 70
                  ? "Well done!"
                  : "Keep studying and try again."}
              </p>
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
              <Button onClick={handleFeedback}>Submit Feedback</Button>
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
