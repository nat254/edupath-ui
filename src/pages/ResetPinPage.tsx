import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import PinInput from "@/components/PinInput";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "new-pin" | "confirm-pin" | "success";

const STEPS = [
  { key: "new-pin",     label: "New PIN"  },
  { key: "confirm-pin", label: "Confirm"  },
  { key: "success",     label: "Done"     },
] as const;

// ─── Step indicator ───────────────────────────────────────────────────────────

const StepIndicator = ({ current }: { current: Step }) => {
  const currentIndex = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((s, i) => {
        const done   = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200",
                done || active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {done
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : i + 1}
              </div>
              <span className={cn(
                "text-[10px] whitespace-nowrap",
                active ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-px mx-2 mb-3 transition-colors duration-300",
                done ? "bg-primary" : "bg-border"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const ResetPinPage = () => {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Identity passed from LoginPage via route state
  const { nationalId, email } =
    (location.state as { nationalId: string; email: string }) ?? {};

  // Guard: redirect anyone who lands here without going through the verify step
  if (!nationalId || !email) {
    navigate("/login", { replace: true });
    return null;
  }

  const [step,          setStep         ] = useState<Step>("new-pin");
  const [newPin,        setNewPin       ] = useState("");
  const [confirmPin,    setConfirmPin   ] = useState("");
  const [mismatchError, setMismatchError] = useState(false);

  // ── Step: new PIN complete ─────────────────────────────────────────────────
  const handleNewPinComplete = (val: string) => {
    setNewPin(val);
    if (val.length === 4) {
      setConfirmPin("");
      setMismatchError(false);
      setStep("confirm-pin");
    }
  };

  // ── Step: confirm PIN complete ─────────────────────────────────────────────
  const handleConfirmPinComplete = (val: string) => {
    setConfirmPin(val);
    if (val.length !== 4) return;

    if (val !== newPin) {
      setMismatchError(true);
      // Reset back to step 1 after a short delay so the error is visible
      setTimeout(() => {
        setNewPin("");
        setConfirmPin("");
        setMismatchError(false);
        setStep("new-pin");
      }, 900);
      return;
    }

    // ── Wire your actual reset logic here ──────────────────────────────────
    // Supabase:  await supabase.auth.updateUser({ password: val })
    // Custom:    await resetPin(nationalId, val)
    // ──────────────────────────────────────────────────────────────────────
    setStep("success");
  };

  const handleStartOver = () => {
    setNewPin("");
    setConfirmPin("");
    setMismatchError(false);
    setStep("new-pin");
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">

        {/* Header */}
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Reset your PIN</CardTitle>
          <CardDescription>
            Resetting PIN for{" "}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">

          {/* Step indicator — hidden on success screen */}
          {step !== "success" && <StepIndicator current={step} />}

          {/* ── Step 1: new PIN ── */}
          {step === "new-pin" && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Enter your new 4-digit PIN
              </p>
              <PinInput value={newPin} onChange={handleNewPinComplete} />
              <p className="text-xs text-muted-foreground text-center">
                Auto-advances once all 4 digits are entered
              </p>
            </div>
          )}

          {/* ── Step 2: confirm PIN ── */}
          {step === "confirm-pin" && (
            <div className="flex flex-col items-center gap-4">
              {mismatchError && (
                <div className="w-full p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center">
                  PINs do not match — starting over…
                </div>
              )}
              <p className="text-sm text-muted-foreground text-center">
                Re-enter your new PIN to confirm
              </p>
              <PinInput value={confirmPin} onChange={handleConfirmPinComplete} />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleStartOver}
              >
                ← Start over
              </Button>
            </div>
          )}

          {/* ── Step 3: success ── */}
          {step === "success" && (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <svg
                  className="h-7 w-7 text-emerald-600"
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-lg">PIN reset successfully</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You can now log in with your new PIN.
                </p>
              </div>
              <Button className="w-full mt-2" onClick={() => navigate("/login")}>
                Back to login
              </Button>
            </div>
          )}

          {/* Back to login link — hidden on success (button handles it there) */}
          {step !== "success" && (
            <div className="flex justify-center pt-4">
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Back to login
              </Link>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPinPage;