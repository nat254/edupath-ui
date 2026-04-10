import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courses } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import StarRating from "@/components/StarRating";
import { CheckCircle, XCircle } from "lucide-react";

const CoursePlayerPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const course = courses.find((c) => c.id === courseId);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoProgress, setVideoProgress] = useState(0);
  const [videoComplete, setVideoComplete] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  if (!course) return <div className="p-8 text-center text-muted-foreground">Course not found</div>;

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setVideoProgress(pct);
    if (pct > 90) setVideoComplete(true);
  };

  const handleQuizSubmit = () => {
    let correct = 0;
    course.quiz.forEach((q) => {
      if (quizAnswers[q.id] === q.correctIndex) correct++;
    });
    const score = Math.round((correct / course.quiz.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);
    toast.success(`Quiz completed! Score: ${score}%`);
  };

  const handleFeedback = () => {
    if (rating === 0) { toast.error("Please select a rating"); return; }
    setFeedbackSubmitted(true);
    toast.success("Thank you for your feedback!");
  };

  const allDone = videoComplete && quizSubmitted;
  const overallProgress = videoComplete && quizSubmitted ? 100 : videoComplete ? 50 : videoProgress / 2;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-muted-foreground text-sm">{course.category} · {course.duration}</p>
        </div>
        <Badge variant={allDone ? "default" : "secondary"}>{allDone ? "Complete" : "Incomplete"}</Badge>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground"><span>Overall Progress</span><span>{Math.round(overallProgress)}%</span></div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      {/* Video */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Video Lesson</CardTitle></CardHeader>
        <CardContent>
          <video
            ref={videoRef}
            src={course.videoUrl}
            controls
            className="w-full rounded-lg bg-foreground/5"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setVideoComplete(true)}
          />
          {videoComplete && (
            <div className="mt-2 flex items-center gap-1 text-success text-sm"><CheckCircle className="h-4 w-4" /> Video completed</div>
          )}
        </CardContent>
      </Card>

      {/* Quiz */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Quiz</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {course.quiz.map((q, qi) => (
            <div key={q.id} className="space-y-2">
              <p className="font-medium">{qi + 1}. {q.question}</p>
              <div className="space-y-1">
                {q.options.map((opt, oi) => {
                  const selected = quizAnswers[q.id] === oi;
                  const isCorrect = quizSubmitted && oi === q.correctIndex;
                  const isWrong = quizSubmitted && selected && oi !== q.correctIndex;
                  return (
                    <button
                      key={oi}
                      disabled={quizSubmitted}
                      onClick={() => setQuizAnswers((p) => ({ ...p, [q.id]: oi }))}
                      className={`w-full text-left p-3 rounded-md border text-sm transition-colors
                        ${selected && !quizSubmitted ? "border-primary bg-primary/5" : ""}
                        ${isCorrect ? "border-success bg-success/10" : ""}
                        ${isWrong ? "border-destructive bg-destructive/10" : ""}
                        ${!selected && !isCorrect && !isWrong ? "hover:bg-muted/50" : ""}
                        disabled:cursor-default
                      `}
                    >
                      <span className="flex items-center gap-2">
                        {opt}
                        {isCorrect && <CheckCircle className="h-4 w-4 text-success ml-auto" />}
                        {isWrong && <XCircle className="h-4 w-4 text-destructive ml-auto" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {!quizSubmitted ? (
            <Button onClick={handleQuizSubmit} disabled={Object.keys(quizAnswers).length < course.quiz.length}>
              Submit Quiz
            </Button>
          ) : (
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-lg font-bold">Score: {quizScore}%</p>
              <p className="text-sm text-muted-foreground">{quizScore >= 70 ? "Well done!" : "Keep studying and try again."}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Course Feedback</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!feedbackSubmitted ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Rate this course</p>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <Textarea placeholder="Share your thoughts about this course..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows={3} />
              <Button onClick={handleFeedback}>Submit Feedback</Button>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="font-medium">Thank you for your feedback!</p>
              <div className="mt-2"><StarRating value={rating} readonly /></div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>
    </div>
  );
};

export default CoursePlayerPage;
