import { prisma } from "@/lib/db";

export const CONFIG_APP_ID = "default";

export type ConfigAppData = {
  permitirEvaluacionPorPregunta: boolean;
};

export const DEFAULT_CONFIG_APP: ConfigAppData = {
  permitirEvaluacionPorPregunta: false,
};

export async function leerConfigApp(): Promise<ConfigAppData> {
  try {
    const row = await prisma.configApp.findUnique({
      where: { id: CONFIG_APP_ID },
    });
    return {
      permitirEvaluacionPorPregunta: row?.permitirEvaluacionPorPregunta ?? false,
    };
  } catch {
    return { ...DEFAULT_CONFIG_APP };
  }
}
