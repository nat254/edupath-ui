import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
// import { organizations } from "@/data/mockData";
import kenyanCounties from "@/data/kenyanCounties.json";
import organizations from "@/data/facilities.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import PinInput from "@/components/PinInput";
import { GraduationCap } from "lucide-react";

const RegisterPage = () => {
  const [form, setForm] = useState({ nationalId: "", name: "", email: "", organization: "", county: "", pin: "", confirmPin: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const orgOptions = organizations.map((org) => ({
    value: org.name,
    label: org.name,
  }));

  const countyOptions = kenyanCounties.map((c) => ({
    value: c,
    label: c,
  }));

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => { const n = { ...p }; delete n[field]; delete n.general; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!/^\d{4,10}$/.test(form.nationalId)) e.nationalId = "Must be 4–10 digits";
    if (!form.name.trim()) e.name = "Full name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.organization) e.organization = "Select an organization";
    if (!form.county) e.county = "Select a county";
    if (!/^\d{4}$/.test(form.pin)) e.pin = "PIN must be 4 digits";
    if (form.pin !== form.confirmPin) e.confirmPin = "PINs do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await register({
      nationalId: form.nationalId,
      name: form.name.trim(),
      email: form.email,
      organization: form.organization,
      county: form.county,
      pin: form.pin,
    });
    setLoading(false);
    if (!result.success) {
      setErrors({ general: result.error || "Registration failed" });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-xl">Create Learner Account</CardTitle>
          <CardDescription>Enter details below to register.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md border border-destructive/20 text-center">
                {errors.general}
              </div>
            )}
            <div className="space-y-2">
              <Label>National ID / Passport Number</Label>
              <Input placeholder="e.g. 12345678" value={form.nationalId} onChange={(e) => set("nationalId", e.target.value)} />
              {errors.nationalId && <p className="text-destructive text-xs">{errors.nationalId}</p>}
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="Your full name" value={form.name} onChange={(e) => set("name", e.target.value)} />
              {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
              {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <SearchableSelect
                value={form.organization}
                onValueChange={(v) => set("organization", v)}
                options={orgOptions}
                placeholder="Select organization"
                emptyMessage="No organization found."
              />
              {errors.organization && <p className="text-destructive text-xs">{errors.organization}</p>}
            </div>
            <div className="space-y-2">
              <Label>County</Label>
              <SearchableSelect
                value={form.county}
                onValueChange={(v) => set("county", v)}
                options={countyOptions}
                placeholder="Select county"
                emptyMessage="No county found."
              />
              {errors.county && <p className="text-destructive text-xs">{errors.county}</p>}
            </div>
            <PinInput
              value={form.pin}
              onChange={(v) => set("pin", v)}
              error={errors.pin}
            />
            <PinInput
              value={form.confirmPin}
              onChange={(v) => set("confirmPin", v)}
              label="Confirm PIN"
              error={errors.confirmPin}
              showToggle={false}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create Account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;