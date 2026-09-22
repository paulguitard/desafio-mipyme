export const USER_ORIGEN = {
  ADMIN: "ADMIN",
  REGISTRO: "REGISTRO",
} as const;

export type UserOrigen = (typeof USER_ORIGEN)[keyof typeof USER_ORIGEN];

export function isUserOrigen(value: string): value is UserOrigen {
  return value === USER_ORIGEN.ADMIN || value === USER_ORIGEN.REGISTRO;
}
