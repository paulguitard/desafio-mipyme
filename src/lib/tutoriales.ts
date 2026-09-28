import type { Role } from "@/lib/roles";

export type PasoTutorial = {
  ancla: string;
  titulo: string;
  descripcion: string;
};

export function selectorTour(ancla: string) {
  return `[data-tour="${ancla}"]`;
}

const NAV: PasoTutorial = {
  ancla: "nav",
  titulo: "Navegación",
  descripcion:
    "Desde aquí pasas entre el panel, tu perfil y el resto de secciones. Cerrar sesión está a la derecha.",
};

const NAV_EVALUADOR: PasoTutorial = {
  ancla: "nav",
  titulo: "Navegación",
  descripcion: "Desde aquí vuelves al panel. Cerrar sesión está a la derecha.",
};

const NAV_FALLBACK: PasoTutorial = {
  ancla: "nav",
  titulo: "Navegación",
  descripcion:
    "Usa esta barra para moverte entre secciones y volver al panel. Cerrar sesión está a la derecha.",
};

const PASOS_PERFIL: PasoTutorial[] = [
  NAV,
  {
    ancla: "perfil-datos",
    titulo: "Tus datos",
    descripcion: "Revisa y actualiza cómo aparece tu nombre y, si aplica, tus datos de contacto.",
  },
  {
    ancla: "perfil-guardar",
    titulo: "Guardar cambios",
    descripcion: "Cuando termines, pulsa aquí para guardar el perfil.",
  },
];

function coincide(pathname: string, exacto: string) {
  return pathname === exacto;
}

function bajo(pathname: string, prefijo: string) {
  return pathname === prefijo || pathname.startsWith(`${prefijo}/`);
}

function idBajo(pathname: string, prefijo: string) {
  if (!bajo(pathname, prefijo)) return false;
  const resto = pathname.slice(prefijo.length);
  return resto.length > 1 && !resto.slice(1).includes("/");
}

export const CONTEXTO_PANEL_MENTORIA = "panel-mentoria";

export const PASOS_PANEL_MENTORIA: PasoTutorial[] = [
  {
    ancla: "mentoria-ficha",
    titulo: "Esta mentoría",
    descripcion: "Aquí ves el título y cuántas respuestas hay. Cerrar vuelve al listado de mentorías.",
  },
  {
    ancla: "pool-evaluadores",
    titulo: "Pool de evaluadores",
    descripcion:
      "Suma evaluadores a la mentoría. Luego puedes asignarlos a cada caso, a mano o con la asignación automática.",
  },
  {
    ancla: "pool-supervisores",
    titulo: "Pool de supervisores",
    descripcion: "Cambia a esta pestaña para incorporar supervisores de la mentoría.",
  },
  {
    ancla: "pool-incorporar",
    titulo: "Incorporar al pool",
    descripcion: "Abre el listado de personas registradas y elige quiénes entran al pool de esta mentoría.",
  },
  {
    ancla: "asignacion-automatica",
    titulo: "Asignación automática",
    descripcion:
      "Reparte los casos entre quienes ya están en el pool, respetando el cupo de evaluaciones por caso.",
  },
  {
    ancla: "lista-casos",
    titulo: "Respuestas",
    descripcion:
      "Filtra por nombre, correo o estado. Entra a un caso con Ver, o arrastra un evaluador hacia una respuesta para asignarlo.",
  },
];

export function resolverTutorial(
  rol: Role,
  pathname: string,
  contexto?: string | null,
): PasoTutorial[] {
  if (contexto === CONTEXTO_PANEL_MENTORIA) return PASOS_PANEL_MENTORIA;

  const path = pathname.replace(/\/+$/, "") || "/";

  if (rol === "EMPRENDEDOR") {
    if (coincide(path, "/participante")) {
      return [
        NAV,
        {
          ancla: "mentorias-abiertas",
          titulo: "Mentorías abiertas",
          descripcion:
            "Desplaza el carrusel para ver las convocatorias vigentes y entra a una para postular.",
        },
        {
          ancla: "mis-casos",
          titulo: "Mis casos",
          descripcion: "Aquí están tus postulaciones. Entra a un caso para completar o corregir el formulario.",
        },
      ];
    }
    if (coincide(path, "/participante/perfil")) return PASOS_PERFIL;
    if (bajo(path, "/participante/postulaciones")) {
      return [
        {
          ancla: "volver",
          titulo: "Volver al panel",
          descripcion: "Este control te lleva de vuelta a tus mentorías y casos.",
        },
        {
          ancla: "formulario-caso",
          titulo: "Formulario del caso",
          descripcion: "Responde cada pregunta. Puedes adjuntar archivos donde el enunciado lo pida.",
        },
        {
          ancla: "guardar-borrador",
          titulo: "Guardar borrador",
          descripcion: "Guarda tu avance sin enviarlo. Puedes volver más tarde a seguir editando.",
        },
        {
          ancla: "enviar-caso",
          titulo: "Enviar",
          descripcion:
            "Cuando el caso esté listo, envíalo a evaluación. Si hay observaciones, el botón pide enviar correcciones.",
        },
      ];
    }
    return [NAV_FALLBACK];
  }

  if (rol === "EVALUADOR") {
    if (coincide(path, "/evaluador")) {
      return [
        NAV_EVALUADOR,
        {
          ancla: "filtros-evaluacion",
          titulo: "Filtros de estado",
          descripcion:
            "Los filtros están separados por turno: el tuyo, el del supervisor o el del participante. En Todas se listan agrupados igual.",
        },
        {
          ancla: "lista-evaluaciones",
          titulo: "Evaluaciones asignadas",
          descripcion:
            "Los casos van agrupados por quién tiene la pelota, con lo urgente arriba. Entra a una tarjeta para revisar y enviar al supervisor.",
        },
      ];
    }
    if (bajo(path, "/evaluador/evaluaciones")) {
      return [
        {
          ancla: "ficha-caso",
          titulo: "Ficha del caso",
          descripcion: "A la izquierda ves las respuestas del participante. Revisa cada pregunta con calma.",
        },
        {
          ancla: "observacion-pregunta",
          titulo: "Tu revisión",
          descripcion:
            "Marca si hay observaciones, deja un comentario y, si corresponde, asigna una nota.",
        },
        {
          ancla: "guardar-revision",
          titulo: "Guardar revisión",
          descripcion: "Guarda tu avance sin enviarlo al supervisor.",
        },
        {
          ancla: "enviar-supervisor",
          titulo: "Enviar a supervisor",
          descripcion: "Cuando las observaciones estén listas, envíalas. También puedes finalizar la evaluación.",
        },
      ];
    }
    return [NAV_FALLBACK];
  }

  if (rol === "SUPERVISOR") {
    if (coincide(path, "/evaluador")) {
      return [
        NAV_EVALUADOR,
        {
          ancla: "filtros-supervision",
          titulo: "Filtros de supervisión",
          descripcion:
            "Los filtros están separados por turno: el tuyo, el del evaluador o el del participante.",
        },
        {
          ancla: "lista-supervision",
          titulo: "Casos a supervisar",
          descripcion:
            "Los casos se agrupan según quién debe actuar. Cada tarjeta muestra a los evaluadores; entra para proceder o devolver.",
        },
      ];
    }
    if (bajo(path, "/evaluador/supervision")) {
      return [
        {
          ancla: "ficha-caso",
          titulo: "Revisión del caso",
          descripcion: "Consulta las respuestas y la evaluación. Si hay varios evaluadores, cámbialos en el selector.",
        },
        {
          ancla: "guardar-revision",
          titulo: "Guardar revisión",
          descripcion: "Guarda tus comentarios de supervisión sin enviarlos todavía.",
        },
        {
          ancla: "enviar-observaciones",
          titulo: "Devolver observaciones",
          descripcion: "Devuelve el caso al evaluador para que corrija según tu supervisión.",
        },
        {
          ancla: "proceder",
          titulo: "Proceder",
          descripcion:
            "Confirma la evaluación: las observaciones llegan al participante o, si pidió finalizar, el caso se cierra.",
        },
      ];
    }
    return [NAV_FALLBACK];
  }

  if (coincide(path, "/admin")) {
    return [
      NAV,
      {
        ancla: "admin-usuarios",
        titulo: "Usuarios",
        descripcion: "Crea y administra cuentas de administradores, evaluadores y participantes.",
      },
      {
        ancla: "admin-formularios",
        titulo: "Formularios",
        descripcion: "Define las preguntas que responderán los participantes en cada mentoría.",
      },
      {
        ancla: "admin-mentorias",
        titulo: "Mentorías",
        descripcion: "Abre o cierra convocatorias y asigna evaluadores y supervisores a cada caso.",
      },
      {
        ancla: "admin-config",
        titulo: "Configuración",
        descripcion: "Desde el engranaje del encabezado ajustas el correo de recuperación y otros ajustes.",
      },
    ];
  }

  if (coincide(path, "/admin/usuarios")) {
    return [
      NAV,
      {
        ancla: "usuarios-filtros",
        titulo: "Filtros",
        descripcion: "Filtra por origen o por rol para encontrar una cuenta.",
      },
      {
        ancla: "usuarios-crear",
        titulo: "Crear usuario",
        descripcion: "Da de alta una cuenta o usa la carga masiva si tienes un CSV.",
      },
      {
        ancla: "usuarios-tabla",
        titulo: "Listado",
        descripcion: "Edita el rol, la escuela u otros datos desde las acciones de cada fila.",
      },
    ];
  }

  if (coincide(path, "/admin/formularios")) {
    return [
      NAV,
      {
        ancla: "formularios-nuevo",
        titulo: "Nuevo formulario",
        descripcion: "Crea un formulario con las preguntas de la postulación.",
      },
      {
        ancla: "formularios-lista",
        titulo: "Formularios existentes",
        descripcion: "Entra a un formulario para editar título, tipo de evaluación y preguntas.",
      },
    ];
  }

  if (coincide(path, "/admin/formularios/nuevo") || idBajo(path, "/admin/formularios")) {
    return [
      {
        ancla: "formulario-titulo",
        titulo: "Título",
        descripcion: "Edita el nombre del formulario. También eliges si la evaluación es por pregunta o general.",
      },
      {
        ancla: "formulario-agregar",
        titulo: "Agregar pregunta",
        descripcion: "Suma preguntas al formulario: texto, archivos, Gantt u otros formatos.",
      },
      {
        ancla: "formulario-guardar",
        titulo: "Guardar formulario",
        descripcion: "En un formulario nuevo, pulsa aquí para crearlo. En uno existente, cada cambio se guarda al confirmarlo.",
      },
    ];
  }

  if (coincide(path, "/admin/mentorias")) {
    return [
      NAV,
      {
        ancla: "mentorias-lista",
        titulo: "Listado de mentorías",
        descripcion: "Entra a una mentoría para ver casos, o créala con el botón de la esquina.",
      },
      {
        ancla: "mentoria-abrir-cerrar",
        titulo: "Abrir o cerrar",
        descripcion: "Una mentoría abierta admite postulaciones y evaluaciones. Al cerrarla, queda en solo lectura.",
      },
    ];
  }

  if (bajo(path, "/admin/mentorias")) {
    return PASOS_PANEL_MENTORIA;
  }

  return [NAV_FALLBACK];
}
