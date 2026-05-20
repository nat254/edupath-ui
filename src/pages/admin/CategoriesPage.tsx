import { useState, useEffect, useSyncExternalStore } from "react";
import { categoryStore } from "@/data/categoryStore";
import { Category } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Tags } from "lucide-react";
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
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await categoryStore.add(trimmed);
      toast.success(`Category "${trimmed}" created`);
      setNewName("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create category");
    } finally {
      setAdding(false);
    }
  };

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditName(cat.name);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!editId || !editName.trim()) return;
    try {
      await categoryStore.update(editId, editName.trim());
      toast.success("Category renamed");
      cancelEdit();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to rename category");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
      </div>

      {/* ── Add new category ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add New Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Category name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="max-w-sm"
            />
            <Button onClick={handleAdd} disabled={adding || !newName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Category list ──────────────────────────────────────────────── */}
      {categories.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Tags className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No categories yet. Add one above.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center gap-3 px-5 py-3 group hover:bg-muted/40 transition-colors"
                >
                  {editId === cat.id ? (
                    /* ── Inline edit mode ── */
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="flex-1 max-w-sm"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-primary"
                        onClick={saveEdit}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={cancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    /* ── Display mode ── */
                    <>
                      <span className="flex-1 font-medium">{cat.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => startEdit(cat)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete "{cat.name}"?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. Courses using this
                                category will keep their current value.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(cat)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CategoriesPage;
