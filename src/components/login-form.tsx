"use client";

import Image from "next/image";
import { useState } from "react";
import { loginAction } from "@/actions/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { InputCorreo } from "@/components/input-correo";
import type { Role } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/roles";

export function LoginForm({ expectedRole }: { expectedRole: Role }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="login-panel mx-auto w-full max-w-md space-y-4">
      {expectedRole === "EMPRENDEDOR" ? (
        <div className="flex items-center justify-end gap-3 px-1">
          <p className="font-semibold text-white">No tengo cuenta:</p>
          <a className="btn btn-secondary shrink-0" href="/registrarse">
            Crear cuenta
          </a>
        </div>
      ) : null}

      <form
        className="card w-full space-y-5 p-8 md:p-10"
        action={async (formData) => {
          const result = await loginAction(formData);
          if (result?.error) setError(result.error);
        }}
      >
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
        <input type="hidden" name="expectedRole" value={expectedRole} />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red">Ingreso</p>
          <h1 className="mt-1 text-3xl font-extrabold text-navy">{ROLE_LABELS[expectedRole]}</h1>
        </div>
        {error ? (
          <p className="rounded-lg bg-red/10 p-3 font-semibold text-red" role="alert">
            {error}
          </p>
        ) : null}
        <div className="field">
          <label htmlFor="email">Correo</label>
          <InputCorreo className="input" id="email" name="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <button className="btn btn-primary w-full uppercase tracking-wide" type="submit">
          Ingresar
        </button>

        {expectedRole === "EMPRENDEDOR" ? (
          <>
            <div className="auth-divider" aria-hidden="true">
              o
            </div>
            <GoogleSignInButton />
            <a
              className="block text-center font-bold text-navy underline-offset-4 hover:underline"
              href="/recuperar-contrasena"
            >
              Olvidé mi contraseña
            </a>
          </>
        ) : null}
        <a className="block text-center font-bold text-navy underline-offset-4 hover:underline" href="/">
          Volver al inicio
        </a>
      </form>
    </div>
  );
}
