"use client";

import Image from "next/image";
import { useState } from "react";
import { registerEmprendedorAction } from "@/actions/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { InputCorreo } from "@/components/input-correo";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="card register-card mx-auto w-full max-w-md space-y-4 p-8 md:p-10"
      action={async (formData) => {
        setError(null);
        const result = await registerEmprendedorAction(formData);
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

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red">Registro</p>
        <h1 className="mt-1 text-3xl font-extrabold text-navy">Participante</h1>
      </div>

      {error ? (
        <p className="rounded-lg bg-red/10 p-3 font-semibold text-red" role="alert">
          {error}
        </p>
      ) : null}

      <GoogleSignInButton label="Registrarse con Google" />
      <div className="auth-divider" aria-hidden="true">
        o
      </div>

      <div className="grid gap-4">
        <div className="field">
          <label htmlFor="name">Nombre</label>
          <input className="input" id="name" name="name" type="text" autoComplete="name" required />
        </div>
        <div className="field">
          <label htmlFor="email">Correo</label>
          <InputCorreo className="input" id="email" name="email" autoComplete="email" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              placeholder={`Mín. ${MIN_PASSWORD_LENGTH} caracteres`}
            />
          </div>
          <div className="field">
            <label htmlFor="passwordConfirm">Confirmar</label>
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
        </div>
      </div>

      <button className="btn btn-primary w-full uppercase tracking-wide" type="submit">
        Crear cuenta
      </button>

      <a
        className="block text-center font-bold text-navy underline-offset-4 hover:underline"
        href="/ingresar/participante"
      >
        Ya tengo cuenta — Ingresar
      </a>
      <a className="block text-center font-bold text-navy underline-offset-4 hover:underline" href="/">
        Volver al inicio
      </a>
    </form>
  );
}
