import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  showToggle?: boolean;
}

const PinInput = ({ value, onChange, label = "Enter your 4 digit PIN", error, showToggle = true }: PinInputProps) => {
  const [show, setShow] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const arr = value.split("");
    arr[index] = char;
    const newVal = arr.join("").slice(0, 4);
    onChange(newVal);
    if (char && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const arr = value.split("");
      arr[index - 1] = "";
      onChange(arr.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 3);
    inputRefs.current[focusIdx]?.focus();
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
      <div className="flex items-center gap-3">
        <div className="flex gap-12">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type={show ? "text" : "password"}
              inputMode="numeric"
              maxLength={1}
              value={value[i] || ""}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="w-14 h-14 rounded-xl border-none bg-muted text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ))}
        </div>
        {showToggle && (
          <button type="button" onClick={() => setShow(!show)} className="text-muted-foreground">
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
};

export default PinInput;