import { useState, useSyncExternalStore } from "react";
import { learnerStore, Learner } from "@/data/learnerStore";
import { organizations } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Pencil, Trash2, Plus, Download } from "lucide-react";
import { toast } from "sonner";

const emptyForm = {
  email: "",
  nationalId: "",
  organization: "",
  coursesCompleted: 0,
  coursesInProgress: 0,
};

const LearnersPage = () => {
  const learners = useSyncExternalStore(
    learnerStore.subscribe,
    learnerStore.getAll,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (l: Learner) => {
    setEditId(l.id);
    setForm({
      email: l.email,
      nationalId: l.nationalId,
      organization: l.organization,
      coursesCompleted: l.coursesCompleted,
      coursesInProgress: l.coursesInProgress,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) {
      e.email = "Required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = "Enter a valid email address";
    }
    if (!form.nationalId.trim()) e.nationalId = "Required";
    if (!form.organization) e.organization = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editId) {
      learnerStore.update(editId, form);
      toast.success("Learner updated");
    } else {
      learnerStore.add(form);
      toast.success("Learner added");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    learnerStore.remove(id);
    toast.success(`"${name}" removed`);
  };

  // SEARCH BY EMAIL OR ORG
  const filtered = learners.filter(
    (l) =>
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.organization.toLowerCase().includes(search.toLowerCase()),
  );

  // SORT BY COLUMN
  const [sortKey, setSortKey] = useState<keyof Learner>("email"); // sort only by keys in interface Learner
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = [...filtered].sort((a, b) => {
    const val = a[sortKey] > b[sortKey] ? 1 : -1; // e.g if a[jane@gmail.com] > b[anne@gmail.com] put a after b otherwise reverse
    return sortDir === "asc" ? val : -val; // if ascending then sort normally (A - Z) otherwise reverse
  });

  const toggleSort = (key: keyof Learner) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // PAGINATION
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  // EXPORT FUNCTIONALITY
  const exportCSV = () => {
    const learners = learnerStore.getAll();

    const headers = [
      "Email",
      "National ID",
      "Organization",
      "Completed",
      "In Progress",
    ];
    const rows = learners.map((l) =>
      [
        `"${l.email}"`, //  wrap in quotes to handle any commas
        `"${l.nationalId}"`,
        `"${l.organization}"`,
        l.coursesCompleted,
        l.coursesInProgress,
      ].join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "learners.csv";
    document.body.appendChild(a); //  must be in DOM for Firefox
    a.click();
    document.body.removeChild(a); //  clean up
    setTimeout(() => URL.revokeObjectURL(url), 100); // 👈 delay revoke so browser finishes
  };

  // Learner progress badge
  const ProgressBadge = ({
    count,
    type,
  }: {
    count: number;
    type: "completed" | "progress";
  }) => (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        type === "completed"
          ? "bg-green-100 text-green-700"
          : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {count}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Learners</h1>

        <div className="flex items-center gap-2">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Add Learner</span>
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search by email or organization..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full text-sm border-2 border-blue-300 outline-4 outline-offset-2"
      />

      <Card>
        <CardHeader>
          <CardTitle>All Learners</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  onClick={() => toggleSort("email")}
                  className="cursor-pointer"
                >
                  Email{" "}
                  {sortKey === "email"
                    ? sortDir === "asc"
                      ? "↑"
                      : "↓"
                    : ""}{" "}
                </TableHead>
                <TableHead>National ID</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>In Progress</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.email}</TableCell>
                  <TableCell>{l.nationalId}</TableCell>
                  <TableCell>{l.organization}</TableCell>
                  <TableCell><ProgressBadge count={l.coursesCompleted} type="completed" /></TableCell>
                  <TableCell><ProgressBadge count={l.coursesInProgress} type="progress" /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(l)}
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
                              Remove "{l.email}"?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(l.id, l.email)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center mt-4 text-sm">
            <span>
              {" "}
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Learner" : "Add Learner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="Email"
              />
              {errors.name && (
                <p className="text-destructive text-xs">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>National ID *</Label>
              <Input
                value={form.nationalId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nationalId: e.target.value }))
                }
                placeholder="National ID"
              />
              {errors.nationalId && (
                <p className="text-destructive text-xs">{errors.nationalId}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Organization *</Label>
              <Select
                value={form.organization}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, organization: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.name}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.organization && (
                <p className="text-destructive text-xs">
                  {errors.organization}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>
              {editId ? "Save Changes" : "Add Learner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LearnersPage;
