import { useState, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PinInput from "@/components/PinInput";
import { GraduationCap, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "verify" | "new-pin" | "confirm-pin" | "success";
type Portal = "provider" | "staff";

const STEPS = [
  { key: "verify",      label: "Verify"  },
  { key: "new-pin",     label: "New PIN" },
  { key: "confirm-pin", label: "Confirm" },
  { key: "success",     label: "Done"    },
] as const;

const portalConfig = {
  provider: {
    accentStripe:  "bg-blue-500",
    accentText:    "text-blue-600",
    accentBg:      "bg-blue-50 border-blue-100",
    accentBgHover: "group-hover:bg-blue-100",
    stepActive:    "bg-blue-600 text-white shadow-sm shadow-blue-500/30",
    stepDone:      "bg-blue-600 text-white",
    stepLine:      "bg-blue-200",
    stepLinePending: "bg-border",
    btn:           "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 hover:shadow-blue-500/30",
    forgotLink:    "text-blue-600 hover:text-blue-700",
    activeLabel:   "text-blue-600",
    doneLabel:     "text-blue-400",
  },
  staff: {
    accentStripe:  "bg-emerald-500",
    accentText:    "text-emerald-600",
    accentBg:      "bg-emerald-50 border-emerald-100",
    accentBgHover: "group-hover:bg-emerald-100",
    stepActive:    "bg-emerald-600 text-white shadow-sm shadow-emerald-500/30",
    stepDone:      "bg-emerald-600 text-white",
    stepLine:      "bg-emerald-200",
    stepLinePending: "bg-border",
    btn:           "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 hover:shadow-emerald-500/30",
    forgotLink:    "text-emerald-600 hover:text-emerald-700",
    activeLabel:   "text-emerald-600",
    doneLabel:     "text-emerald-400",
  },
} as const;

const StepIndicator = ({ current, portal }: { current: Step; portal: Portal }) => {
  const cfg = portalConfig[portal];
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center mb-8">
      {STEPS.map((s, i) => {
        const done   = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                done  ? cfg.stepDone :
                active ? cfg.stepActive :
                "bg-muted text-muted-foreground border border-border"
              )}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={cn(
                "text-[10px] whitespace-nowrap font-medium tracking-wide",
                active ? cfg.activeLabel : done ? cfg.doneLabel : "text-muted-foreground/50"
              )}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-px mx-2 mb-4 transition-colors duration-500",
                done ? cfg.stepLine : cfg.stepLinePending
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
};

interface ResetPinPageProps {
  portal?: Portal;
}

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ResetPinPage = ({ portal: portalProp }: ResetPinPageProps) => {
  const navigate  = useNavigate();
  const location  = useLocation();

  const stateData = (location.state as { nationalId?: string; email?: string; portal?: Portal }) ?? {};
  const portal: Portal = portalProp ?? stateData.portal ?? "provider";

  const [nationalId,    setNationalId]    = useState(stateData.nationalId ?? "");
  const [email,         setEmail]         = useState(stateData.email ?? "");
  const [verifyError,   setVerifyError]   = useState("");
  const [verifying,     setVerifying]     = useState(false);
  const [step,          setStep]          = useState<Step>("verify");
  const [newPin,        setNewPin]        = useState("");
  const [confirmPin,    setConfirmPin]    = useState("");
  const [mismatchError, setMismatchError] = useState(false);
  const [apiError,      setApiError]      = useState("");
  const [loading,       setLoading]       = useState(false);

  const loginPath  = portal === "provider" ? "/login/provider" : "/login/staff";
  const portalLabel = portal === "provider" ? "Healthcare Provider" : "Internal Staff";
  const cfg = portalConfig[portal];

  const handleVerify = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setVerifyError("");
    if (portal === "provider") {
      if (!/^\d{4,10}$/.test(nationalId)) return setVerifyError("Enter a valid National ID (4–10 digits)");
      if (!email.trim())                   return setVerifyError("Email is required");
    } else {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return setVerifyError("Enter a valid email address");
    }
    setVerifying(true);
    try {
      const res  = await fetch(`${API}/auth/reset-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ portal, nationalId: nationalId || undefined, email, newPin: "0000" }),
      });
      const data = await res.json();
      if (res.status === 404 || data.error?.toLowerCase().includes("no account") || data.error?.toLowerCase().includes("no staff")) {
        setVerifyError(data.error);
      } else {
        setStep("new-pin");
      }
    } catch {
      setVerifyError("Server error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleNewPinComplete = (val: string) => {
    setNewPin(val);
    if (val.length === 4) { setConfirmPin(""); setMismatchError(false); setStep("confirm-pin"); }
  };

  const handleConfirmPinComplete = useCallback(async (val: string) => {
    setConfirmPin(val);
    if (val.length !== 4) return;
    if (val !== newPin) {
      setMismatchError(true);
      setTimeout(() => { setNewPin(""); setConfirmPin(""); setMismatchError(false); setStep("new-pin"); }, 900);
      return;
    }
    setLoading(true);
    setApiError("");
    try {
      const res  = await fetch(`${API}/auth/reset-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ portal, nationalId: nationalId || undefined, email, newPin: val }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error ?? "Failed to reset PIN. Please try again.");
        setNewPin(""); setConfirmPin(""); setStep("new-pin");
      } else {
        setStep("success");
      }
    } catch {
      setApiError("Server error. Please try again.");
      setNewPin(""); setConfirmPin(""); setStep("new-pin");
    } finally {
      setLoading(false);
    }
  }, [newPin, nationalId, email, portal]);

  return (
    <div className="auth-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 dot-grid opacity-100 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md space-y-4">
        <Link
          to={loginPath}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to login
        </Link>

        <div className="bg-white rounded-2xl border border-border shadow-[0_2px_8px_0_rgb(0,0,0,0.06),0_8px_40px_0_rgb(0,0,0,0.05)] overflow-hidden">
          <div className={cn("h-1", cfg.accentStripe)} />

          <div className="px-8 pt-8 pb-8">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-7">
              <div className={cn("h-14 w-14 rounded-2xl border flex items-center justify-center mb-4 shadow-sm", cfg.accentBg)}>
                <GraduationCap className={cn("h-7 w-7", cfg.accentText)} />
              </div>
              <h1 className="text-xl font-bold text-foreground">Reset your PIN</h1>
              <p className="text-sm text-muted-foreground mt-1">{portalLabel} account recovery</p>
            </div>

            {/* Step indicator */}
            {step !== "success" && <StepIndicator current={step} portal={portal} />}

            {/* API error banner */}
            {apiError && (
              <div className="mb-4 p-3.5 rounded-xl text-sm flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{apiError}</p>
              </div>
            )}

            {/* ── Step 0: Verify ── */}
            {step === "verify" && (
              <form onSubmit={handleVerify} className="space-y-4">
                {verifyError && (
                  <div className="p-3.5 rounded-xl text-sm flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>{verifyError}</p>
                  </div>
                )}

                {portal === "provider" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">National ID Number</Label>
                    <Input
                      placeholder="Enter your National ID"
                      value={nationalId}
                      inputMode="numeric"
                      onChange={(e) => { setNationalId(e.target.value.replace(/\D/g, "").slice(0, 10)); setVerifyError(""); }}
                      className="h-11 bg-white border-border rounded-xl"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setVerifyError(""); }}
                    className="h-11 bg-white border-border rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  className={cn("w-full h-11 text-white font-semibold rounded-xl shadow-md transition-all", cfg.btn)}
                  disabled={verifying}
                >
                  {verifying ? "Verifying…" : "Continue"}
                </Button>
              </form>
            )}

            {/* ── Step 1: New PIN ── */}
            {step === "new-pin" && (
              <div className="flex flex-col items-center gap-4 py-2">
                <p className="text-sm text-muted-foreground text-center">Enter your new 4-digit PIN</p>
                <PinInput value={newPin} onChange={handleNewPinComplete} />
                <p className="text-xs text-muted-foreground/60 text-center">Auto-advances once all 4 digits are entered</p>
              </div>
            )}

            {/* ── Step 2: Confirm PIN ── */}
            {step === "confirm-pin" && (
              <div className="flex flex-col items-center gap-4 py-2">
                {mismatchError && (
                  <div className="w-full p-3.5 rounded-xl text-sm flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>PINs do not match — starting over…</p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground text-center">Re-enter your new PIN to confirm</p>
                <PinInput value={confirmPin} onChange={handleConfirmPinComplete} />
                {loading && <p className="text-xs text-muted-foreground">Saving new PIN…</p>}
                <button
                  type="button"
                  className={cn("text-xs transition-colors disabled:opacity-40", cfg.forgotLink)}
                  onClick={() => { setNewPin(""); setConfirmPin(""); setMismatchError(false); setStep("new-pin"); }}
                  disabled={loading}
                >
                  ← Start over
                </button>
              </div>
            )}

            {/* ── Step 3: Success ── */}
            {step === "success" && (
              <div className="flex flex-col items-center text-center gap-4 py-6">
                <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <div>
                  <p className="font-bold text-lg text-foreground">PIN reset successfully</p>
                  <p className="text-sm text-muted-foreground mt-1">You can now sign in with your new PIN.</p>
                </div>
                <Button
                  className={cn("w-full h-11 text-white font-semibold rounded-xl shadow-md transition-all mt-2", cfg.btn)}
                  onClick={() => navigate(loginPath)}
                >
                  Back to login
                </Button>
              </div>
            )}
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

export default ResetPinPage;
