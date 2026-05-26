import { useState, useRef, useEffect, useSyncExternalStore, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { categoryStore } from "@/data/categoryStore";
import { courseStore } from "@/data/courseStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import {
  Trash2,
  Plus,
  GripVertical,
  Upload,
  FileVideo,
  FileText,
  X,
  ImageIcon,
} from "lucide-react";

interface QuizQuestionForm {
  question: string;
  options: string[];
  correctIndex: number;
  correctIndexes: number[];
  isMultiple: boolean;
}

const emptyQuestion = (): QuizQuestionForm => ({
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  correctIndexes: [],
  isMultiple: false,
});

const CreateCoursePage = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const existing = courseId ? courseStore.getById(courseId) : null;
  const isEdit = !!existing;

  // Ensure courses are loaded from API (needed for edit mode)
  useEffect(() => {
    courseStore.fetchAll();
    categoryStore.fetchAll();
  }, []);

  const getNames = useCallback(() => categoryStore.getNames(), []);
  const categories = useSyncExternalStore(categoryStore.subscribe, getNames);

  const categoryOptions = categories.map((c) => ({
    value: c,
    label: c,
  }));

  const [form, setForm] = useState({
    title: existing?.title ?? "",
    category: existing?.category ?? "",
    objectives: existing?.objectives ?? "",
    duration: existing?.duration ?? "",
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>(
    existing?.videoUrl ?? "",
  );
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfName, setPdfName] = useState<string>(
    existing?.pdfUrl ? "Existing PDF" : "",
  );
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [quiz, setQuiz] = useState<QuizQuestionForm[]>(
    existing?.quiz?.map((q) => ({
      question: q.question,
      options: [...q.options],
      correctIndex: q.correctIndex,
      correctIndexes: q.correctIndexes ?? [],
      isMultiple: q.isMultiple ?? false,
    })) ?? [emptyQuestion()],
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

  const toggleMultiple = (qIdx: number) => {
    setQuiz((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              isMultiple: !q.isMultiple,
              correctIndexes: !q.isMultiple ? [q.correctIndex] : [], // seed with current single answer
              correctIndex: 0,
            }
          : q,
      ),
    );
  };

  const toggleCorrectIndex = (qIdx: number, oIdx: number) => {
    setQuiz((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const already = q.correctIndexes.includes(oIdx);
        return {
          ...q,
          correctIndexes: already
            ? q.correctIndexes.filter((ci) => ci !== oIdx)
            : [...q.correctIndexes, oIdx],
        };
      }),
    );
  };

  const updateQuestion = (idx: number, field: Partial<QuizQuestionForm>) => {
    setQuiz((prev) => prev.map((q, i) => (i === idx ? { ...q, ...field } : q)));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuiz((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) }
          : q,
      ),
    );
  };

  const addQuestion = () => setQuiz((prev) => [...prev, emptyQuestion()]);
  const removeQuestion = (idx: number) =>
    setQuiz((prev) => prev.filter((_, i) => i !== idx));

  const addOption = (qIdx: number) => {
    setQuiz((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: [...q.options, ""] } : q,
      ),
    );
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuiz((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOpts = q.options.filter((_, j) => j !== oIdx);
        return {
          ...q,
          options: newOpts,
          correctIndex: q.correctIndex >= newOpts.length ? 0 : q.correctIndex,
        };
      }),
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

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    const formData = new FormData();
    formData.append("title", form.title.trim());
    formData.append("category", form.category);
    formData.append("objectives", form.objectives.trim());
    formData.append("duration", form.duration.trim());

    if (videoFile) formData.append("video", videoFile);
    if (pdfFile) formData.append("pdf", pdfFile);
    if (coverImage) formData.append("cover_image", coverImage);

    const quizData = quiz.map((q, i) => ({
      id: `q${i + 1}`,
      question: q.question.trim(),
      options: q.options.map((o) => o.trim()),
      correctIndex: q.isMultiple ? (q.correctIndexes[0] ?? 0) : q.correctIndex,
      correctIndexes: q.isMultiple ? q.correctIndexes : undefined,
      isMultiple: q.isMultiple,
    }));
    formData.append("quiz", JSON.stringify(quizData));

    try {
      if (isEdit && courseId) {
        await courseStore.update(courseId, formData);
        toast.success("Course updated successfully!");
      } else {
        await courseStore.add(formData);
        toast.success("Course created successfully!");
      }
      navigate("/courses");
    } catch {
      toast.error("Failed to save course. Please try again.");
    }
  };

  // cover image
  const [coverImage, setCoverImage] = useState<string>(
    existing?.coverImage ?? "",
  );
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCoverImage(reader.result as string); // 👈 base64 so it persists in store
    reader.readAsDataURL(file);
  };

  const removeCover = () => {
    setCoverImage("");
    if (coverInputRef.current) coverInputRef.current.value = "";
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
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="Course title"
                />
                {errors.title && (
                  <p className="text-destructive text-xs">{errors.title}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <SearchableSelect
                  value={form.category}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                  options={categoryOptions}
                  placeholder="Select category"
                  emptyMessage="No category found."
                  triggerClassName={cn(errors.category && "border-destructive")}
                />
                {errors.category && (
                  <p className="text-destructive text-xs">{errors.category}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Objectives *</Label>
              <Textarea
                value={form.objectives}
                onChange={(e) =>
                  setForm((p) => ({ ...p, objectives: e.target.value }))
                }
                placeholder="Course objectives"
                rows={3}
              />
              {errors.objectives && (
                <p className="text-destructive text-xs">{errors.objectives}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration *</Label>
                <Input
                  value={form.duration}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, duration: e.target.value }))
                  }
                  placeholder="e.g. 2 hours"
                />
                {errors.duration && (
                  <p className="text-destructive text-xs">{errors.duration}</p>
                )}
              </div>
            </div>

            {/* Materials */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Course Materials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cover Image Upload */}
                <div className="space-y-2">
                  <Label>
                    Cover Image{" "}
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  </Label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={coverInputRef}
                    onChange={handleCoverChange}
                    className="hidden"
                  />
                  {coverImage ? (
                    <div className="relative rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={coverImage}
                        alt="Cover preview"
                        className="w-full h-40 object-cover"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={removeCover}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        Click to upload cover image
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, or WebP
                      </p>
                    </div>
                  )}
                </div>
                {/* Video Upload */}
                <div className="space-y-2">
                  <Label>Video Content *</Label>
                  <input
                    type="file"
                    accept="video/*"
                    ref={videoInputRef}
                    onChange={handleVideoChange}
                    className="hidden"
                  />
                  {videoPreview ? (
                    <div className="space-y-2">
                      <div className="relative rounded-lg overflow-hidden border bg-muted">
                        <video
                          src={videoPreview}
                          controls
                          className="w-full max-h-48 object-contain"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2 h-7 w-7"
                          onClick={removeVideo}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {videoFile?.name ?? "Existing video"}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <FileVideo className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        Click to upload video
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        MP4, WebM, or OGG
                      </p>
                    </div>
                  )}
                  {errors.video && (
                    <p className="text-destructive text-xs">{errors.video}</p>
                  )}
                </div>

                {/* PDF Upload */}
                <div className="space-y-2">
                  <Label>
                    PDF Resource{" "}
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  </Label>
                  <input
                    type="file"
                    accept=".pdf"
                    ref={pdfInputRef}
                    onChange={handlePdfChange}
                    className="hidden"
                  />
                  {pdfName ? (
                    <div className="flex items-center gap-3 border rounded-lg p-3 bg-muted/30">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm truncate flex-1">{pdfName}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive shrink-0"
                        onClick={removePdf}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      onClick={() => pdfInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        Click to upload PDF
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF files only
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quiz Builder */}
            <Card className="border-dashed">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Quiz Questions</CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addQuestion}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Question
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {quiz.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="border rounded-lg p-4 space-y-3 bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                        Question {qIdx + 1}
                      </div>
                      {quiz.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeQuestion(qIdx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Input
                        value={q.question}
                        onChange={(e) =>
                          updateQuestion(qIdx, { question: e.target.value })
                        }
                        placeholder="Enter your question"
                      />
                      {errors[`quiz_${qIdx}_q`] && (
                        <p className="text-destructive text-xs">
                          {errors[`quiz_${qIdx}_q`]}
                        </p>
                      )}
                    </div>

                    {/* Toggle multiple answers mode */}
                    <div className="flex items-center gap-2 mb-1">
                      <Label className="text-xs text-muted-foreground">
                        Options
                      </Label>
                      <button
                        type="button"
                        onClick={() => toggleMultiple(qIdx)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          q.isMultiple
                            ? "bg-primary text-primary-foreground border-primary"
                            : "text-muted-foreground border-muted-foreground/30 hover:border-primary"
                        }`}
                      >
                        {q.isMultiple ? "✓ Multiple answers" : "Single answer"}
                      </button>
                      <p className="text-xs px-2 font-bold">
                        {" "}
                        👈 Click to toggle
                      </p>
                    </div>

                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        {q.isMultiple ? (
                          // Checkbox mode for multiple answers
                          <input
                            type="checkbox"
                            checked={q.correctIndexes.includes(oIdx)}
                            onChange={() => toggleCorrectIndex(qIdx, oIdx)}
                            className="accent-primary"
                          />
                        ) : (
                          // Radio mode for single answer
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={q.correctIndex === oIdx}
                            onChange={() =>
                              updateQuestion(qIdx, { correctIndex: oIdx })
                            }
                            className="accent-primary"
                          />
                        )}
                        <Input
                          value={opt}
                          onChange={(e) =>
                            updateOption(qIdx, oIdx, e.target.value)
                          }
                          placeholder={`Option ${oIdx + 1}`}
                          className="flex-1"
                        />
                        {q.options.length > 2 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeOption(qIdx, oIdx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                        {errors[`quiz_${qIdx}_o${oIdx}`] && (
                          <p className="text-destructive text-xs">
                            {errors[`quiz_${qIdx}_o${oIdx}`]}
                          </p>
                        )}
                      </div>
                    ))}

                    {/* Hint label for multiple mode */}
                    {q.isMultiple && (
                      <p className="text-xs text-muted-foreground">
                        ✓ Check all correct answers
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-2">
              <Button type="submit">
                {isEdit ? "Save Changes" : "Create Course"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/courses")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCoursePage;
