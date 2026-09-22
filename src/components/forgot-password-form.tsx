"use client";

import Image from "next/image";
import { useState } from "react";
import { requestPasswordResetAction } from "@/actions/auth";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="card mx-auto w-full max-w-md space-y-5 p-8 md:p-10"
      action={async (formData) => {
        setError(null);
        setMessage(null);
        const result = await requestPasswordResetAction(formData);
        if (result?.error) setError(result.error);
        else if (result?.ok && result.message) setMessage(result.message);
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
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red">Cuenta</p>
        <h1 className="mt-1 text-3xl font-extrabold text-navy">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-muted">
          Solo para emprendedores registrados en la plataforma. Te enviaremos un enlace si la
          cuenta aplica.
        </p>
      </div>
      {error ? (
        <p className="rounded-lg bg-red/10 p-3 font-semibold text-red" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-navy/10 p-3 font-semibold text-navy" role="status">
          {message}
        </p>
      ) : null}
      <div className="field">
        <label htmlFor="email">Correo</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <button className="btn btn-primary w-full uppercase tracking-wide" type="submit">
        Enviar enlace
      </button>
      <a
        className="block text-center font-bold text-navy underline-offset-4 hover:underline"
        href="/ingresar/emprendedor"
      >
        Volver al ingreso
      </a>
    </form>
  );
}
