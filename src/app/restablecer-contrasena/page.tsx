import { validateResetTokenAction } from "@/actions/auth";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function RestablecerContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = String(params.token ?? "").trim();
  const { valid } = token
    ? await validateResetTokenAction(token)
    : { valid: false as const };

  return (
    <div className="hero-aiep min-h-screen">
      <main className="flex min-h-screen items-center px-5 py-16">
        <ResetPasswordForm token={token} tokenValid={valid} />
      </main>
    </div>
  );
}
