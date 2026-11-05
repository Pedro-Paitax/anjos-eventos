import { textoAjusteTeto, type AjusteTetoResumo } from "@/lib/ajuste-acompanhamentos";

/**
 * Linha interna do ajuste do teto por acompanhamentos ("Proteínas Principais: 315 → 299 g por
 * pessoa (6 acompanhamentos; referência 5)") e avisos de configuração. Só em telas internas
 * (orçamento, simulador, "Ver cálculos"); nunca no payload público.
 */
export function AvisoAjusteTeto({ ajustes, avisos }: { ajustes?: AjusteTetoResumo[]; avisos?: string[] }) {
  const linhas = ajustes ?? [];
  const alertas = avisos ?? [];
  if (linhas.length === 0 && alertas.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 text-sm text-texto-suave">
      {linhas.map((a) => (
        <p key={a.macro}>{textoAjusteTeto(a)}</p>
      ))}
      {alertas.map((aviso) => (
        <p key={aviso} className="text-amber-700">
          {aviso}
        </p>
      ))}
    </div>
  );
}
