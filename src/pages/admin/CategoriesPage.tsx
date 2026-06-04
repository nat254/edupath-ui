import { useState, useEffect, useSyncExternalStore } from "react";
import { categoryStore } from "@/data/categoryStore";
import { Category, AudienceType } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Tags, Users, Filter, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AUDIENCE_LABELS: Record<AudienceType, string> = {
  healthcare_provider: "Healthcare Provider",
  internal_staff: "Internal Staff",
  both: "Both Audiences",
};

const CategoriesPage = () => {
  const categories = useSyncExternalStore(
    categoryStore.subscribe,
    categoryStore.getAll,
  );

  useEffect(() => {
    categoryStore.fetchAll();
  }, []);

  // ── Add state ─────────────────────────────────────────────────────────────
  const [newName, setNewName] = useState("");
  const [newAudience, setNewAudience] = useState<AudienceType>("both");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await categoryStore.add(trimmed, newAudience);
      toast.success(`Category "${trimmed}" created`);
      setNewName("");
      setNewAudience("both");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create category");
    } finally {
      setAdding(false);
    }
  };

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAudience, setEditAudience] = useState<AudienceType>("both");

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditAudience(cat.audienceType);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!editId || !editName.trim()) return;
    try {
      await categoryStore.update(editId, editName.trim(), editAudience);
      toast.success("Category updated successfully");
      cancelEdit();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update category");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (cat: Category) => {
    try {
      await categoryStore.remove(cat.id);
      toast.success(`Category "${cat.name}" deleted`);
    } catch {
      toast.error("Failed to delete category");
    }
  };

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterAudience, setFilterAudience] = useState<string>("all");

  const filteredCategories = categories.filter((c) => {
    if (filterAudience !== "all" && c.audienceType !== filterAudience) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Course Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize training courses and target specific portal audiences.
          </p>
        </div>
      </div>

      {/* ── Add new category ───────────────────────────────────────────── */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Create New Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Category name (e.g. Compliance)…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="h-10"
              />
            </div>
            <div className="w-56">
              <Select value={newAudience} onValueChange={(val) => setNewAudience(val as AudienceType)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Audience Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both Audiences</SelectItem>
                  <SelectItem value="healthcare_provider">Healthcare Providers Only</SelectItem>
                  <SelectItem value="internal_staff">Internal Staff Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="h-10">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Category
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg p-1.5 px-3">
          <Filter className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Filter by Audience:</span>
          <select
            value={filterAudience}
            onChange={(e) => setFilterAudience(e.target.value)}
            className="bg-transparent border-none text-xs font-semibold focus:outline-none text-foreground cursor-pointer"
          >
            <option value="all">All Audiences</option>
            <option value="both">Both Audiences</option>
            <option value="healthcare_provider">Healthcare Provider</option>
            <option value="internal_staff">Internal Staff</option>
          </select>
        </div>

        <span className="text-xs text-muted-foreground ml-auto font-medium">
          {filteredCategories.length} categor{filteredCategories.length !== 1 ? "ies" : "y"} listed
        </span>
      </div>

      {/* ── Category list ──────────────────────────────────────────────── */}
      {filteredCategories.length === 0 ? (
        <Card className="p-16 text-center text-muted-foreground border-dashed">
          <Tags className="h-10 w-10 mx-auto mb-3 opacity-30 animate-pulse" />
          <p className="font-medium text-foreground">No categories found</p>
          <p className="text-sm mt-1">Try modifying your audience filter or create one above.</p>
        </Card>
      ) : (
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {filteredCategories.map((cat) => {
                const isEditing = editId === cat.id;
                return (
                  <li
                    key={cat.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group"
                  >
                    {isEditing ? (
                      /* ── Inline edit mode ── */
                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="flex-1 min-w-[200px]"
                          autoFocus
                        />
                        <div className="w-56">
                          <Select value={editAudience} onValueChange={(val) => setEditAudience(val as AudienceType)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="both">Both Audiences</SelectItem>
                              <SelectItem value="healthcare_provider">Healthcare Providers Only</SelectItem>
                              <SelectItem value="internal_staff">Internal Staff Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit} className="bg-primary text-primary-foreground">
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ── Display mode ── */
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Tags className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-sm block leading-tight text-foreground">{cat.name}</span>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {/* Audience Badge */}
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px] font-semibold py-0.5 rounded px-2 hover:bg-transparent",
                                  cat.audienceType === "both"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400"
                                    : cat.audienceType === "healthcare_provider"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                                )}
                              >
                                <Users className="h-3 w-3 mr-1 inline-block" />
                                {AUDIENCE_LABELS[cat.audienceType]}
                              </Badge>

                              {/* Course Count */}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <BookOpen className="h-3.5 w-3.5 inline-block text-muted-foreground/60" />
                                {cat.courseCount} course{cat.courseCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity justify-end shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => startEdit(cat)}
                            title="Edit Category"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                title="Delete Category"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category "{cat.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. Any courses assigned to this category will keep their current category name.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(cat)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete Category
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CategoriesPage;
