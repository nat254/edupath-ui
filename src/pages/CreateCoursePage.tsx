import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { categories } from "@/data/mockData";
import { courseStore } from "@/data/courseStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, GripVertical, Upload, FileVideo, FileText, X } from "lucide-react";

interface QuizQuestionForm {
  question: string;
  options: string[];
  correctIndex: number;
}

const emptyQuestion = (): QuizQuestionForm => ({
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
});

const CreateCoursePage = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const existing = courseId ? courseStore.getById(courseId) : null;
  const isEdit = !!existing;

  const [form, setForm] = useState({
    title: existing?.title ?? "",
    category: existing?.category ?? "",
    objectives: existing?.objectives ?? "",
    duration: existing?.duration ?? "",
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>(existing?.videoUrl ?? "");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfName, setPdfName] = useState<string>(existing?.pdfUrl ? "Existing PDF" : "");
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [quiz, setQuiz] = useState<QuizQuestionForm[]>(
    existing?.quiz?.map((q) => ({ question: q.question, options: [...q.options], correctIndex: q.correctIndex })) ?? [emptyQuestion()]
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Required";
    if (!form.category) e.category = "Required";
    if (!form.objectives.trim()) e.objectives = "Required";
    if (!form.duration.trim()) e.duration = "Required";
    if (!videoFile && !videoPreview) e.video = "Video file is required";

    quiz.forEach((q, i) => {
      if (!q.question.trim()) e[`quiz_${i}_q`] = "Question is required";
      q.options.forEach((opt, j) => {
        if (!opt.trim()) e[`quiz_${i}_o${j}`] = "Option is required";
      });
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const updateQuestion = (idx: number, field: Partial<QuizQuestionForm>) => {
    setQuiz((prev) => prev.map((q, i) => (i === idx ? { ...q, ...field } : q)));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuiz((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) } : q
      )
    );
  };

  const addQuestion = () => setQuiz((prev) => [...prev, emptyQuestion()]);
  const removeQuestion = (idx: number) => setQuiz((prev) => prev.filter((_, i) => i !== idx));

  const addOption = (qIdx: number) => {
    setQuiz((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, options: [...q.options, ""] } : q))
    );
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuiz((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOpts = q.options.filter((_, j) => j !== oIdx);
        return { ...q, options: newOpts, correctIndex: q.correctIndex >= newOpts.length ? 0 : q.correctIndex };
      })
    );
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file");
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please select a valid PDF file");
      return;
    }
    setPdfFile(file);
    setPdfName(file.name);
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview("");
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const removePdf = () => {
    setPdfFile(null);
    setPdfName("");
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    const videoUrl = videoFile ? URL.createObjectURL(videoFile) : videoPreview;
    const pdfUrl = pdfFile ? URL.createObjectURL(pdfFile) : (existing?.pdfUrl ?? undefined);

    const courseData = {
      title: form.title.trim(),
      category: form.category,
      objectives: form.objectives.trim(),
      duration: form.duration.trim(),
      videoUrl,
      pdfUrl,
      quiz: quiz.map((q, i) => ({
        id: `q${i + 1}`,
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        correctIndex: q.correctIndex,
      })),
    };

    if (isEdit && courseId) {
      courseStore.update(courseId, courseData);
      toast.success("Course updated successfully!");
    } else {
      courseStore.add(courseData);
      toast.success("Course created successfully!");
    }
    navigate("/courses");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Course" : "Create New Course"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Course title" />
                {errors.title && <p className="text-destructive text-xs">{errors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                {errors.category && <p className="text-destructive text-xs">{errors.category}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Objectives *</Label>
              <Textarea value={form.objectives} onChange={(e) => setForm((p) => ({ ...p, objectives: e.target.value }))} placeholder="Course objectives" rows={3} />
              {errors.objectives && <p className="text-destructive text-xs">{errors.objectives}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration *</Label>
                <Input value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} placeholder="e.g. 2 hours" />
                {errors.duration && <p className="text-destructive text-xs">{errors.duration}</p>}
              </div>
            </div>

            {/* Materials */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Course Materials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Video Upload */}
                <div className="space-y-2">
                  <Label>Video Content *</Label>
                  <input type="file" accept="video/*" ref={videoInputRef} onChange={handleVideoChange} className="hidden" />
                  {videoPreview ? (
                    <div className="space-y-2">
                      <div className="relative rounded-lg overflow-hidden border bg-muted">
                        <video src={videoPreview} controls className="w-full max-h-48 object-contain" />
                        <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7" onClick={removeVideo}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{videoFile?.name ?? "Existing video"}</p>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <FileVideo className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">Click to upload video</p>
                      <p className="text-xs text-muted-foreground mt-1">MP4, WebM, or OGG</p>
                    </div>
                  )}
                  {errors.video && <p className="text-destructive text-xs">{errors.video}</p>}
                </div>

                {/* PDF Upload */}
                <div className="space-y-2">
                  <Label>PDF Resource <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <input type="file" accept=".pdf" ref={pdfInputRef} onChange={handlePdfChange} className="hidden" />
                  {pdfName ? (
                    <div className="flex items-center gap-3 border rounded-lg p-3 bg-muted/30">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm truncate flex-1">{pdfName}</span>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={removePdf}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      onClick={() => pdfInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">Click to upload PDF</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF files only</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quiz Builder */}
            <Card className="border-dashed">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Quiz Questions</CardTitle>
                <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-1" /> Add Question
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {quiz.map((q, qIdx) => (
                  <div key={qIdx} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                        Question {qIdx + 1}
                      </div>
                      {quiz.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeQuestion(qIdx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Input
                        value={q.question}
                        onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
                        placeholder="Enter your question"
                      />
                      {errors[`quiz_${qIdx}_q`] && <p className="text-destructive text-xs">{errors[`quiz_${qIdx}_q`]}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Options (select the correct answer)</Label>
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={q.correctIndex === oIdx}
                            onChange={() => updateQuestion(qIdx, { correctIndex: oIdx })}
                            className="accent-primary"
                          />
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                            placeholder={`Option ${oIdx + 1}`}
                            className="flex-1"
                          />
                          {q.options.length > 2 && (
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeOption(qIdx, oIdx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                          {errors[`quiz_${qIdx}_o${oIdx}`] && <p className="text-destructive text-xs">{errors[`quiz_${qIdx}_o${oIdx}`]}</p>}
                        </div>
                      ))}
                      <Button type="button" size="sm" variant="ghost" onClick={() => addOption(qIdx)} className="text-xs">
                        <Plus className="h-3 w-3 mr-1" /> Add Option
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-2">
              <Button type="submit">{isEdit ? "Save Changes" : "Create Course"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate("/courses")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCoursePage;
