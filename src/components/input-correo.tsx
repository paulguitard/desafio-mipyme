"use client";

import type { InputHTMLAttributes } from "react";
import { normalizarCorreo } from "@/lib/correo";

type InputCorreoProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function InputCorreo({
  onChange,
  defaultValue,
  value,
  autoComplete = "email",
  ...rest
}: InputCorreoProps) {
  return (
    <input
      {...rest}
      type="email"
      inputMode="email"
      autoComplete={autoComplete}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      {...(value != null
        ? { value: normalizarCorreo(String(value)) }
        : {
            defaultValue:
              defaultValue != null ? normalizarCorreo(String(defaultValue)) : undefined,
          })}
      onChange={(event) => {
        const next = normalizarCorreo(event.target.value);
        if (event.target.value !== next) {
          event.target.value = next;
        }
        onChange?.(event);
      }}
    />
  );
}
