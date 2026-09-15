# Portal de casos

Prototipo local (Next.js + Prisma/SQLite + Auth.js). Más adelante se puede conectar Supabase, Cloudinary y Vercel.

## Cómo correrlo

1. Copia las variables (el archivo `.env` del prototipo ya incluye SQLite y un secreto local).
2. Instala dependencias: `npm install`
3. Crea la base y el admin:

```
npx prisma db push
npx tsx prisma/seed.ts
```

4. Arranca: `npm run dev`

Admin inicial: `admin@test.com` / `bitacora`

El admin crea evaluadores y emprendedores en Configuración → Usuarios. Las contraseñas visibles en el listado son solo para este prototipo.

## Roles

- **Administración**: usuarios, formularios, convocatorias (abrir/cerrar) y asignación de evaluadores.
- **Emprendedor**: convocatorias abiertas, casos y correcciones cuando el estado es “Con observaciones”.
- **Evaluador**: evaluaciones independientes (Evaluación 1, 2, …), observaciones por pregunta e historial de cambios.
