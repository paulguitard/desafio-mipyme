import { PerfilForm } from "@/components/perfil-form";
import { prisma } from "@/lib/db";
import { normalizarCorreo } from "@/lib/correo";
import { parseArchivosSoloFiles, publicUploadUrl } from "@/lib/preguntas";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function ParticipantePerfilPage() {
  const sessionUser = await requireUser("EMPRENDEDOR");
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      email: true,
      rutPersonal: true,
      direccionPersonal: true,
      telefonoMovil: true,
      contactoWhatsapp: true,
      documentosFormalizacion: true,
    },
  });
  if (!user) notFound();

  const documentos = parseArchivosSoloFiles(user.documentosFormalizacion).map((doc) => ({
    ...doc,
    url: publicUploadUrl(doc),
  }));

  return (
    <div className="page-workspace mx-auto grid h-full min-h-0 w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-6 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-3xl font-extrabold text-navy">Mi perfil</h1>
      </div>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <PerfilForm
          name={user.name}
          email={normalizarCorreo(user.email)}
          participante={{
            rutPersonal: user.rutPersonal,
            direccionPersonal: user.direccionPersonal,
            telefonoMovil: user.telefonoMovil,
            contactoWhatsapp: user.contactoWhatsapp,
            documentos,
          }}
        />
      </div>
    </div>
  );
}
