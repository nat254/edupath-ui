import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import PinInput from "@/components/PinInput";
import { GraduationCap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LoginPage = () => {
  const [nationalId, setNationalId] = useState("");
  const [pin, setPin] = useState("");
  const [errors, setErrors] = useState<{
    nationalId?: string;
    pin?: string;
    general?: string;
  }>({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e: typeof errors = {};
    if (!/^\d{4,10}$/.test(nationalId))
      e.nationalId = "National ID must be 4–10 digits";
    if (!/^\d{4}$/.test(pin)) e.pin = "PIN must be exactly 4 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const result = await login(nationalId, pin);
    if (!result.success) {
      setErrors({ general: result.error });
    } else {
      navigate("/dashboard");
    }
  };

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

            {/* <div className="space-y-2">
              <Label htmlFor="nationalId">ID Type</Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="National ID" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="apple">National ID</SelectItem>
                    <SelectItem value="banana">Foreigner ID</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div> */}

            <div className="space-y-2">
              <Label htmlFor="nationalId">ID Number</Label>
              <Input
                id="nationalId"
                placeholder="Enter your National ID"
                value={nationalId}
                onChange={(e) => {
                  setNationalId(e.target.value.replace(/\D/g, "").slice(0, 10));
                  setErrors({});
                }}
                inputMode="numeric"
                className="w-full h-11 px-3"
              />
              {errors.nationalId && (
                <p className="text-destructive text-xs">{errors.nationalId}</p>
              )}
            </div>

            <PinInput
              value={pin}
              onChange={(v) => {
                setPin(v);
                setErrors({});
              }}
              error={errors.pin}
            />

            <Button type="submit" className="w-full">
              Login
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-primary font-medium hover:underline"
              >
                Create Account
              </Link>
            </p>
            <div className="mt-4 p-3 rounded-md bg-muted text-xs text-muted-foreground">
              <p className="font-medium mb-1">Demo Credentials:</p>
              <p>
                Admin: ID <strong>1234</strong>, PIN <strong>1234</strong>
              </p>
              <p>
                Learner: ID <strong>5678</strong>, PIN <strong>1234</strong>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
