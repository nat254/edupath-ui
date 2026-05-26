import { useState, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { enrollmentStore } from "@/data/enrollmentStore";
import { courseStore } from "@/data/courseStore";
import kenyanCounties from "@/data/kenyanCounties.json";
import organizations  from "@/data/facilities.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  User,
  Mail,
  Building2,
  MapPin,
  ShieldCheck,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  KeyRound,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

// ─── Avatar ───────────────────────────────────────────────────────────────────

const ProfileAvatar = ({ name, size = "lg" }: { name: string; size?: "lg" | "xl" }) => {
  const initials = name
    .split(" ")
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold shadow-lg",
        size === "xl" ? "h-24 w-24 text-3xl" : "h-16 w-16 text-xl",
      )}
    >
      {initials}
    </div>
  );
};

// ─── PIN Input ────────────────────────────────────────────────────────────────

const PinField = ({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          inputMode="numeric"
          maxLength={8}
          placeholder="••••"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          className={cn("pr-10", error && "border-destructive")}
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

// ─── Stat Mini-card ───────────────────────────────────────────────────────────

const StatMini = ({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  accent: string;
}) => (
  <div className="flex items-center gap-3 rounded-xl border p-4">
    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", accent)}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { user, updateProfile, changePin } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate("/login");
    return null;
  }

  const isAdmin = user.role === "admin";

  // ── Personal info form ──────────────────────────────────────────────────────
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [organization, setOrganization] = useState(user.organization);
  const [county, setCounty] = useState(user.county);
  const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});
  const [infoSaving, setInfoSaving] = useState(false);

  const orgOptions = organizations.map((org) => ({
    value: org.name,
    label: org.name,
  }));

  const countyOptions = kenyanCounties.map((c) => ({
    value: c,
    label: c,
  }));

  const validateInfo = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "A valid email is required";
    if (!organization) e.organization = "Organisation is required";
    if (!county) e.county = "County is required";
    return e;
  };

  const handleSaveInfo = async () => {
    const e = validateInfo();
    if (Object.keys(e).length) { setInfoErrors(e); return; }
    setInfoSaving(true);
    const result = await updateProfile({ name: name.trim(), email: email.trim(), organization, county });
    setInfoSaving(false);
    if (result.success) {
      toast.success("Profile updated successfully");
    } else {
      toast.error(result.error ?? "Failed to update profile");
    }
  };

  // ── PIN form ────────────────────────────────────────────────────────────────
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinErrors, setPinErrors] = useState<Record<string, string>>({});
  const [pinSaving, setPinSaving] = useState(false);

  const handleChangePin = async () => {
    const e: Record<string, string> = {};
    if (!currentPin) e.current = "Enter your current PIN";
    if (newPin.length < 4) e.new = "New PIN must be at least 4 digits";
    if (newPin !== confirmPin) e.confirm = "PINs do not match";
    if (Object.keys(e).length) { setPinErrors(e); return; }

    setPinSaving(true);
    const result = await changePin(currentPin, newPin);
    setPinSaving(false);
    if (result.success) {
      setCurrentPin(""); setNewPin(""); setConfirmPin(""); setPinErrors({});
      toast.success("PIN changed successfully");
    } else {
      setPinErrors({ current: result.error ?? "Failed to change PIN" });
    }
  };

  // ── Activity stats (learners only) ──────────────────────────────────────────
  // Fetch from backend on mount so the Activity tab reflects real DB state
  useEffect(() => {
    if (!isAdmin && user.id) {
      enrollmentStore.fetchMyEnrollments(user.id);
      courseStore.fetchAll();
    }
  }, [isAdmin, user.id]);

  useSyncExternalStore(enrollmentStore.subscribe, enrollmentStore.getSnapshot);
  const allCourses = useSyncExternalStore(courseStore.subscribe, courseStore.getAll);
  const myEnrollments = enrollmentStore.getMyEnrollments(user.id);
  const completed = myEnrollments.filter((e) => e.status === "complete").length;
  const inProgress = myEnrollments.filter((e) => e.status === "in_progress").length;
  const avgProgress =
    myEnrollments.length > 0
      ? Math.round(myEnrollments.reduce((s, e) => s + e.progress, 0) / myEnrollments.length)
      : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">

      {/* ── Profile Header ────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/5" />
        <CardContent className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <div className="ring-4 ring-background rounded-full shrink-0">
              <ProfileAvatar name={user.name} size="xl" />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold truncate">{user.name}</h1>
                <Badge
                  variant={isAdmin ? "default" : "secondary"}
                  className="capitalize"
                >
                  {isAdmin ? (
                    <ShieldCheck className="h-3 w-3 mr-1" />
                  ) : (
                    <BadgeCheck className="h-3 w-3 mr-1" />
                  )}
                  {user.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {user.email}
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {user.county}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[220px]">{user.organization}</span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="info">
        <TabsList className={cn("grid w-full", isAdmin ? "grid-cols-2" : "grid-cols-3")}>
          <TabsTrigger value="info">Personal Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          {!isAdmin && <TabsTrigger value="activity">My Activity</TabsTrigger>}
        </TabsList>

        {/* ── Personal Info ─────────────────────────────────────────────── */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Read-only fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    National ID
                  </Label>
                  <div className="flex items-center h-10 px-3 rounded-md border bg-muted/40 text-sm text-muted-foreground select-all">
                    {user.nationalId}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Role
                  </Label>
                  <div className="flex items-center h-10 px-3 rounded-md border bg-muted/40 text-sm text-muted-foreground capitalize">
                    {user.role}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Editable fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="p-name" className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name
                  </Label>
                  <Input
                    id="p-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setInfoErrors((p) => ({ ...p, name: "" }));
                    }}
                    className={cn(infoErrors.name && "border-destructive")}
                    placeholder="Your full name"
                  />
                  {infoErrors.name && (
                    <p className="text-xs text-destructive">{infoErrors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="p-email" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address
                  </Label>
                  <Input
                    id="p-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setInfoErrors((p) => ({ ...p, email: "" }));
                    }}
                    className={cn(infoErrors.email && "border-destructive")}
                    placeholder="you@example.com"
                  />
                  {infoErrors.email && (
                    <p className="text-xs text-destructive">{infoErrors.email}</p>
                  )}
                </div>

                {/* Organisation */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Organisation
                  </Label>
                  <SearchableSelect
                    value={organization}
                    onValueChange={(v) => {
                      setOrganization(v);
                      setInfoErrors((p) => ({ ...p, organization: "" }));
                    }}
                    options={orgOptions}
                    placeholder="Select organisation"
                    emptyMessage="No organisation found."
                    triggerClassName={cn(infoErrors.organization && "border-destructive")}
                  />
                  {infoErrors.organization && (
                    <p className="text-xs text-destructive">{infoErrors.organization}</p>
                  )}
                </div>

                {/* County */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> County
                  </Label>
                  <SearchableSelect
                    value={county}
                    onValueChange={(v) => {
                      setCounty(v);
                      setInfoErrors((p) => ({ ...p, county: "" }));
                    }}
                    options={countyOptions}
                    placeholder="Select county"
                    emptyMessage="No county found."
                    triggerClassName={cn(infoErrors.county && "border-destructive")}
                  />
                  {infoErrors.county && (
                    <p className="text-xs text-destructive">{infoErrors.county}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveInfo} disabled={infoSaving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {infoSaving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security ─────────────────────────────────────────────────── */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Change PIN
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-sm">
              <PinField
                id="pin-current"
                label="Current PIN"
                value={currentPin}
                onChange={(v) => { setCurrentPin(v); setPinErrors((p) => ({ ...p, current: "" })); }}
                error={pinErrors.current}
              />
              <PinField
                id="pin-new"
                label="New PIN"
                value={newPin}
                onChange={(v) => { setNewPin(v); setPinErrors((p) => ({ ...p, new: "" })); }}
                error={pinErrors.new}
              />
              <PinField
                id="pin-confirm"
                label="Confirm New PIN"
                value={confirmPin}
                onChange={(v) => { setConfirmPin(v); setPinErrors((p) => ({ ...p, confirm: "" })); }}
                error={pinErrors.confirm}
              />

              <p className="text-xs text-muted-foreground">
                Use at least 4 digits.
              </p>

              <Button onClick={handleChangePin} disabled={pinSaving} className="gap-2 w-full sm:w-auto">
                <ShieldCheck className="h-4 w-4" />
                {pinSaving ? "Updating…" : "Update PIN"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Activity (learners only) ───────────────────────────────────── */}
        {!isAdmin && (
          <TabsContent value="activity">
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatMini
                  icon={BookOpen}
                  label="Enrolled Courses"
                  value={myEnrollments.length}
                  accent="bg-primary/10 text-primary"
                />
                <StatMini
                  icon={CheckCircle2}
                  label="Completed"
                  value={completed}
                  accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                />
                <StatMini
                  icon={Clock}
                  label="In Progress"
                  value={inProgress}
                  accent="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                />
              </div>

              {/* Course progress list */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Course Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  {myEnrollments.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No courses started yet.</p>
                      <Button
                        variant="link"
                        className="text-sm mt-1"
                        onClick={() => navigate("/courses")}
                      >
                        Browse courses →
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {myEnrollments.map((enr) => {
                        const course = allCourses.find((c) => c.id === enr.courseId);
                        if (!course) return null;
                        return (
                          <div key={enr.courseId} className="py-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{course.title}</p>
                                <p className="text-xs text-muted-foreground">{course.category}</p>
                              </div>
                              <Badge
                                variant={enr.status === "complete" ? "default" : "secondary"}
                                className="shrink-0 text-xs"
                              >
                                {enr.status === "complete" ? "Complete" : "In Progress"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={enr.progress} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                                {enr.progress}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Avg progress summary */}
              {myEnrollments.length > 0 && (
                <Card>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Overall Learning Progress</p>
                      <p className="text-xs text-muted-foreground">
                        Average across all enrolled courses
                      </p>
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-primary">
                      {avgProgress}%
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ProfilePage;
