"use client";

import Image from "next/image";
import { useState } from "react";
import { confirmPasswordResetAction } from "@/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

export function ResetPasswordForm({
  token,
  tokenValid,
}: {
  token: string;
  tokenValid: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!tokenValid) {
    return (
      <div className="card mx-auto w-full max-w-md space-y-5 p-8 md:p-10">
        <AuthBrand />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red">Cuenta</p>
          <h1 className="mt-1 text-3xl font-extrabold text-navy">Enlace inválido</h1>
          <p className="mt-2 text-sm text-muted">
            Este enlace no es válido o ya venció. Pedí uno nuevo para restablecer tu contraseña.
          </p>
        </div>
        <a className="btn btn-primary w-full uppercase tracking-wide text-center" href="/recuperar-contrasena">
          Pedir nuevo enlace
        </a>
      </div>
    );
  }

  return (
    <form
      className="card mx-auto w-full max-w-md space-y-5 p-8 md:p-10"
      action={async (formData) => {
        setError(null);
        setMessage(null);
        const result = await confirmPasswordResetAction(formData);
        if (result?.error) setError(result.error);
        else if (result?.ok && result.message) setMessage(result.message);
      }}
    >
      <AuthBrand />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red">Cuenta</p>
        <h1 className="mt-1 text-3xl font-extrabold text-navy">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-muted">Elegí una contraseña nueva para tu cuenta.</p>
      </div>
      {error ? (
        <p className="rounded-lg bg-red/10 p-3 font-semibold text-red" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <div className="space-y-3">
          <p className="rounded-lg bg-navy/10 p-3 font-semibold text-navy" role="status">
            {message}
          </p>
          <a
            className="btn btn-primary w-full uppercase tracking-wide text-center"
            href="/ingresar/emprendedor"
          >
            Ir a ingresar
          </a>
        </div>
      ) : (
        <>
          <input type="hidden" name="token" value={token} />
          <div className="field">
            <label htmlFor="password">Nueva contraseña</label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
            <p className="mt-1 text-xs text-muted">Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>
          </div>
          <div className="field">
            <label htmlFor="passwordConfirm">Confirmar contraseña</label>
            <input
              className="input"
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </div>
          <button className="btn btn-primary w-full uppercase tracking-wide" type="submit">
            Guardar contraseña
          </button>
        </>
      )}
    </form>
  );
}

function AuthBrand() {
  return (
    <div className="flex items-center justify-between gap-4">
      <Image
        src="/aiep.png"
        alt="AIEP, Universidad Andrés Bello"
        width={872}
        height={344}
        className="object-contain object-left"
        style={{ width: "auto", height: "3.5rem" }}
        priority
      />
      <Image
        src="/entel2.png"
        alt="Fondo 55+ Entel"
        width={802}
        height={530}
        className="object-contain object-right"
        style={{ width: "auto", height: "3.5rem" }}
        priority
      />
    </div>
  );
}
