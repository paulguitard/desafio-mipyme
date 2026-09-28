export function IndicadorGuardando({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <p className="text-sm text-muted" aria-live="polite">
      Guardando…
    </p>
  );
}
