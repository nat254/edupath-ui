import { mockLearners } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LearnersPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold">Learners</h1>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockLearners.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell>{l.nationalId}</TableCell>
                <TableCell>{l.organization}</TableCell>
                <TableCell>{l.coursesCompleted}</TableCell>
                <TableCell>{l.coursesInProgress}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
);

export default LearnersPage;
