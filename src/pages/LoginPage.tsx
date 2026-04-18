// ─── LoginPage.tsx ────────────────────────────────────────────────────────────

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import PinInput from "@/components/PinInput";
import { GraduationCap } from "lucide-react";

const LoginPage = () => {
  const [nationalId, setNationalId] = useState("");
  const [pin, setPin] = useState("");
  const [errors, setErrors] = useState<{ nationalId?: string; pin?: string; general?: string }>({});
  const { login } = useAuth();
  const navigate = useNavigate();

  // Forgot PIN dialog
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotId, setForgotId] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotErrors, setForgotErrors] = useState<{ nationalId?: string; email?: string }>({});

  // ── Login ──────────────────────────────────────────────────────────────────

  const validate = () => {
    const e: typeof errors = {};
    if (!/^\d{4,10}$/.test(nationalId)) e.nationalId = "National ID must be 4–10 digits";
    if (!/^\d{4}$/.test(pin)) e.pin = "PIN must be exactly 4 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const result = login(nationalId, pin);
    if (!result.success) setErrors({ general: result.error });
    else navigate("/dashboard");
  };

  // ── Forgot PIN ─────────────────────────────────────────────────────────────

  const openForgot = () => {
    setForgotId("");
    setForgotEmail("");
    setForgotErrors({});
    setForgotOpen(true);
  };

  const validateForgot = () => {
    const e: typeof forgotErrors = {};
    if (!/^\d{4,10}$/.test(forgotId)) e.nationalId = "Enter a valid National ID (4–10 digits)";
    if (!forgotEmail.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) e.email = "Enter a valid email address";
    setForgotErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleForgotContinue = () => {
    if (!validateForgot()) return;
    setForgotOpen(false);
    // Pass identity via route state so ResetPinPage can pre-fill / verify
    navigate("/reset-pin", { state: { nationalId: forgotId, email: forgotEmail } });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Training Management System</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {errors.general}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nationalId">ID Number</Label>
              <Input
                id="nationalId"
                placeholder="Enter your National ID"
                value={nationalId}
                onChange={e => { setNationalId(e.target.value.replace(/\D/g, "").slice(0, 10)); setErrors({}); }}
                inputMode="numeric"
                className="w-full h-11 px-3"
              />
              {errors.nationalId && <p className="text-destructive text-xs">{errors.nationalId}</p>}
            </div>

            <div className="space-y-2">
              <PinInput value={pin} onChange={v => { setPin(v); setErrors({}); }} error={errors.pin} />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-2"
                  onClick={openForgot}
                >
                  Forgot your PIN?
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full">Login</Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary font-medium hover:underline">
                Create Account
              </Link>
            </p>

            <div className="mt-4 p-3 rounded-md bg-muted text-xs text-muted-foreground">
              <p className="font-medium mb-1">Demo Credentials:</p>
              <p>Admin: ID <strong>1234</strong>, PIN <strong>1234</strong></p>
              <p>Learner: ID <strong>5678</strong>, PIN <strong>1234</strong></p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Verify identity before reset ── */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Verify your identity</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            Enter your National ID and registered email to continue to the PIN reset page.
          </p>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">National ID</Label>
              <Input
                className="h-8 text-sm"
                placeholder="Your National ID number"
                value={forgotId}
                inputMode="numeric"
                onChange={e => { setForgotId(e.target.value.replace(/\D/g, "").slice(0, 10)); setForgotErrors({}); }}
              />
              {forgotErrors.nationalId && <p className="text-destructive text-xs">{forgotErrors.nationalId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email Address</Label>
              <Input
                className="h-8 text-sm"
                type="email"
                placeholder="your@email.com"
                value={forgotEmail}
                onChange={e => { setForgotEmail(e.target.value); setForgotErrors({}); }}
              />
              {forgotErrors.email && <p className="text-destructive text-xs">{forgotErrors.email}</p>}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button size="sm" onClick={handleForgotContinue}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;


