import { useEffect, useRef } from "react";
import type { InputHTMLAttributes } from "react";
import { Input } from "./ui/input";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

// Leave the field entirely alone while keys are being entered. Some macOS
// IMEs emit an ordinary input event before compositionstart, so even an
// isComposing guard can update the route before the candidate window opens.
export default function ImeInput({ value, onValueChange, ...props }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const commitTimer = useRef<number | null>(null);

  const commit = () => {
    if (inputRef.current) onValueChange(inputRef.current.value);
  };
  const scheduleCommit = () => {
    if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(() => {
      commitTimer.current = null;
      if (!composing.current) commit();
    }, 300);
  };

  useEffect(() => {
    const input = inputRef.current;
    if (input && !composing.current && input.value !== value) input.value = value;
  }, [value]);

  useEffect(
    () => () => {
      if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
    },
    [],
  );

  return (
    <Input
      {...props}
      ref={inputRef}
      defaultValue={value}
      onChange={() => {
        if (!composing.current) scheduleCommit();
      }}
      onBlur={() => {
        if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
        commitTimer.current = null;
        if (!composing.current) commit();
      }}
      onKeyDown={(event) => {
        const native = event.nativeEvent as KeyboardEvent;
        if (event.key === "Enter" && !composing.current && !native.isComposing && native.keyCode !== 229) {
          if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
          commitTimer.current = null;
          commit();
        }
      }}
      onCompositionStart={() => {
        composing.current = true;
        if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
      }}
      onCompositionEnd={() => {
        composing.current = false;
        // Some IMEs dispatch their final input event after compositionend.
        commitTimer.current = window.setTimeout(() => {
          commitTimer.current = null;
          commit();
        }, 0);
      }}
    />
  );
}
