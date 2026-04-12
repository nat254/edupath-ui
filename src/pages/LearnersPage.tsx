import { useState, useSyncExternalStore } from "react";
import { learnerStore, Learner } from "@/data/learnerStore";
import { organizations } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const emptyForm = { name: "", nationalId: "", organization: "", coursesCompleted: 0, coursesInProgress: 0 };

const LearnersPage = () => {
  const learners = useSyncExternalStore(learnerStore.subscribe, learnerStore.getAll);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (l: Learner) => {
    setEditId(l.id);
    setForm({ name: l.name, nationalId: l.nationalId, organization: l.organization, coursesCompleted: l.coursesCompleted, coursesInProgress: l.coursesInProgress });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Learners</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Learner</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>All Learners</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>National ID</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>In Progress</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {learners.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.nationalId}</TableCell>
                  <TableCell>{l.organization}</TableCell>
                  <TableCell>{l.coursesCompleted}</TableCell>
                  <TableCell>{l.coursesInProgress}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(l)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove "{l.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(l.id, l.name)}>Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Learner" : "Add Learner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" />
              {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label>National ID *</Label>
              <Input value={form.nationalId} onChange={(e) => setForm((p) => ({ ...p, nationalId: e.target.value }))} placeholder="National ID" />
              {errors.nationalId && <p className="text-destructive text-xs">{errors.nationalId}</p>}
            </div>
            <div className="space-y-2">
              <Label>Organization *</Label>
              <Select value={form.organization} onValueChange={(v) => setForm((p) => ({ ...p, organization: v }))}>
                <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>{organizations.map((o) => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.organization && <p className="text-destructive text-xs">{errors.organization}</p>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave}>{editId ? "Save Changes" : "Add Learner"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LearnersPage;
