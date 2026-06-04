import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PinInput from "@/components/PinInput";
import { Stethoscope, AlertTriangle, ArrowLeft, GraduationCap } from "lucide-react";

const ProviderLoginPage = () => {
  const [nationalId, setNationalId] = useState("");
  const [pin, setPin] = useState("");
  const [errors, setErrors] = useState<{ nationalId?: string; pin?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [crossPortal, setCrossPortal] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e: typeof errors = {};
    if (!/^\d{4,10}$/.test(nationalId)) e.nationalId = "National ID must be 4–10 digits";
    if (!/^\d{4}$/.test(pin)) e.pin = "PIN must be exactly 4 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await login(nationalId, pin, "provider");
    setLoading(false);
    if (!result.success) {
      setCrossPortal(result.crossPortal ?? false);
      setErrors({ general: result.error });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="auth-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 dot-grid opacity-100 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md space-y-4">
        {/* Back link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to portal selection
        </Link>

        {/* Auth card */}
        <div className="bg-white rounded-2xl border border-border shadow-[0_2px_8px_0_rgb(0,0,0,0.06),0_8px_40px_0_rgb(0,0,0,0.05)] overflow-hidden">
          {/* Blue accent stripe */}
          <div className="h-1 bg-blue-500" />

          <div className="px-8 pt-8 pb-8">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-7">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 shadow-sm">
                <Stethoscope className="h-7 w-7 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Healthcare Provider Portal</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in with your National ID</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* General error */}
              {errors.general && (
                <div className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 ${
                  crossPortal
                    ? "bg-amber-50 border border-amber-200 text-amber-800"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}>
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{errors.general}</p>
                    {crossPortal && (
                      <Link to="/login/staff" className="underline mt-1 block font-medium hover:text-amber-900">
                        Go to Staff Portal →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* National ID */}
              <div className="space-y-1.5">
                <Label htmlFor="nationalId" className="text-sm font-medium text-foreground">
                  National ID Number
                </Label>
                <Input
                  id="nationalId"
                  placeholder="Enter your National ID"
                  value={nationalId}
                  onChange={e => {
                    setNationalId(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setErrors({});
                    setCrossPortal(false);
                  }}
                  inputMode="numeric"
                  className="h-11 bg-white border-border focus:border-blue-400 focus:ring-blue-400/20 rounded-xl"
                />
                {errors.nationalId && (
                  <p className="text-red-500 text-xs font-medium">{errors.nationalId}</p>
                )}
              </div>

              {/* PIN */}
              <div className="space-y-1.5">
                <PinInput
                  value={pin}
                  onChange={v => { setPin(v); setErrors({}); }}
                  error={errors.pin}
                />
                <div className="flex justify-end">
                  <Link
                    to="/reset-pin/provider"
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 font-medium transition-colors"
                  >
                    Forgot your PIN?
                  </Link>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                disabled={loading}
              >
                {loading ? "Signing in…" : "Sign In"}
              </Button>

              {/* Register link */}
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/register/provider"
                  className="text-blue-600 font-semibold hover:text-blue-700 hover:underline underline-offset-2"
                >
                  Register here
                </Link>
              </p>
            </form>
          </div>
        </div>

        {/* Footer brand */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/50">
          <GraduationCap className="h-3.5 w-3.5" />
          Training Portal
        </div>
      </div>
    </div>
  );
};

export default ProviderLoginPage;
