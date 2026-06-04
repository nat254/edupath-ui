import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import kenyanCounties from "@/data/kenyanCounties.json";
import organizations from "@/data/facilities.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import PinInput from "@/components/PinInput";
import { Stethoscope, ArrowLeft, GraduationCap } from "lucide-react";

const ProviderRegisterPage = () => {
  const [form, setForm] = useState({
    nationalId: "", name: "", email: "", organization: "", county: "", pin: "", confirmPin: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { registerProvider } = useAuth();
  const navigate = useNavigate();

  const orgOptions = organizations.map((org) => ({ value: org.name, label: org.name }));
  const countyOptions = kenyanCounties.map((c) => ({ value: c, label: c }));

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => { const n = { ...p }; delete n[field]; delete n.general; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!/^\d{4,10}$/.test(form.nationalId)) e.nationalId = "Must be 4–10 digits";
    if (!form.name.trim()) e.name = "Full name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.organization) e.organization = "Select a facility";
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
    const result = await registerProvider({
      nationalId: form.nationalId,
      name: form.name.trim(),
      email: form.email,
      organization: form.organization,
      county: form.county,
      pin: form.pin,
    });
    setLoading(false);
    if (!result.success) setErrors({ general: result.error || "Registration failed" });
    else navigate("/dashboard");
  };

  return (
    <div className="auth-bg flex items-center justify-center p-4 py-10">
      <div className="absolute inset-0 dot-grid opacity-100 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md space-y-4">
        <Link
          to="/login/provider"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to login
        </Link>

        <div className="bg-white rounded-2xl border border-border shadow-[0_2px_8px_0_rgb(0,0,0,0.06),0_8px_40px_0_rgb(0,0,0,0.05)] overflow-hidden">
          <div className="h-1 bg-blue-500" />

          <div className="px-8 pt-8 pb-8">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-7">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 shadow-sm">
                <Stethoscope className="h-7 w-7 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Healthcare Provider Registration</h1>
              <p className="text-sm text-muted-foreground mt-1">Create your account to access training courses</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="p-3.5 rounded-xl text-sm bg-red-50 border border-red-200 text-red-700 text-center font-medium">
                  {errors.general}
                </div>
              )}

              {/* National ID */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">National ID / Passport Number *</Label>
                <Input
                  placeholder="e.g. 12345678"
                  value={form.nationalId}
                  onChange={(e) => set("nationalId", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  className="h-10 bg-white border-border focus:border-blue-400 rounded-xl"
                />
                {errors.nationalId && <p className="text-red-500 text-xs font-medium">{errors.nationalId}</p>}
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Full Name *</Label>
                <Input
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="h-10 bg-white border-border focus:border-blue-400 rounded-xl"
                />
                {errors.name && <p className="text-red-500 text-xs font-medium">{errors.name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Email Address *</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="h-10 bg-white border-border focus:border-blue-400 rounded-xl"
                />
                {errors.email && <p className="text-red-500 text-xs font-medium">{errors.email}</p>}
              </div>

              {/* County */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">County *</Label>
                <SearchableSelect
                  value={form.county}
                  onValueChange={(v) => set("county", v)}
                  options={countyOptions}
                  placeholder="Select county"
                  emptyMessage="No county found."
                />
                {errors.county && <p className="text-red-500 text-xs font-medium">{errors.county}</p>}
              </div>

              {/* Facility */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Facility Name *</Label>
                <SearchableSelect
                  value={form.organization}
                  onValueChange={(v) => set("organization", v)}
                  options={orgOptions}
                  placeholder="Select facility"
                  emptyMessage="No facility found."
                />
                {errors.organization && <p className="text-red-500 text-xs font-medium">{errors.organization}</p>}
              </div>

              {/* PIN */}
              <PinInput value={form.pin} onChange={(v) => set("pin", v)} error={errors.pin} />
              <PinInput
                value={form.confirmPin}
                onChange={(v) => set("confirmPin", v)}
                label="Confirm PIN"
                error={errors.confirmPin}
                showToggle={false}
              />

              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg transition-all"
                disabled={loading}
              >
                {loading ? "Creating account…" : "Create Account"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login/provider"
                  className="text-blue-600 font-semibold hover:text-blue-700 hover:underline underline-offset-2"
                >
                  Sign In
                </Link>
              </p>
            </form>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/50">
          <GraduationCap className="h-3.5 w-3.5" />
          Training Portal
        </div>
      </div>
    </div>
  );
};

export default ProviderRegisterPage;
