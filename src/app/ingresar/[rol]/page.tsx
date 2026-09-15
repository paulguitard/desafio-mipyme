import { LoginForm } from "@/components/login-form";
import { roleFromLoginSlug } from "@/lib/roles";
import { notFound } from "next/navigation";

export default async function IngresarPage({
  params,
}: {
  params: Promise<{ rol: string }>;
}) {
  const { rol } = await params;
  const role = roleFromLoginSlug(rol);
  if (!role) notFound();

  return (
    <div className="hero-aiep min-h-screen">
      <main className="flex min-h-screen items-center px-5 py-16">
        <LoginForm expectedRole={role} />
      </main>
    </div>
  );
}
