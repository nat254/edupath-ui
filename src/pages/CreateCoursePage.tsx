import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { categories } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CreateCoursePage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", category: "", objectives: "", duration: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Required";
    if (!form.category) e.category = "Required";
    if (!form.objectives.trim()) e.objectives = "Required";
    if (!form.duration.trim()) e.duration = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    toast.success("Course created successfully!");
    navigate("/courses");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Create New Course</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Course title" />
              {errors.title && <p className="text-destructive text-xs">{errors.title}</p>}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              {errors.category && <p className="text-destructive text-xs">{errors.category}</p>}
            </div>
            <div className="space-y-2">
              <Label>Objectives</Label>
              <Textarea value={form.objectives} onChange={(e) => setForm((p) => ({ ...p, objectives: e.target.value }))} placeholder="Course objectives" rows={3} />
              {errors.objectives && <p className="text-destructive text-xs">{errors.objectives}</p>}
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} placeholder="e.g. 2 hours" />
              {errors.duration && <p className="text-destructive text-xs">{errors.duration}</p>}
            </div>
            <div className="flex gap-3">
              <Button type="submit">Create Course</Button>
              <Button type="button" variant="outline" onClick={() => navigate("/courses")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCoursePage;
