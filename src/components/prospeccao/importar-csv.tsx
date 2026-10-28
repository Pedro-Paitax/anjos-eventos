"use client";

import { useActionState } from "react";
import Link from "next/link";
import { analisarCsvAction, importarCsvAction, type EstadoImportacao } from "@/app/actions/prospeccao";
import { Campo } from "@/components/campo";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Alerta } from "@/components/alerta";

export function ImportarCsv() {
  const [analise, analisar] = useActionState(analisarCsvAction, {} as EstadoImportacao);
  const [importacao, importar] = useActionState(importarCsvAction, {} as EstadoImportacao);

  return (
    <div className="flex flex-col gap-8">
      <form action={analisar} className="flex flex-col gap-4">
        <Campo rotulo="Arquivo .csv">{(p) => <input {...p} name="arquivo" type="file" accept=".csv,text/csv" />}</Campo>
        <Campo rotulo="…ou cole o conteúdo">{(p) => <textarea {...p} name="csv" rows={6} />}</Campo>
        {analise.erro && <Alerta tipo="perigo">{analise.erro}</Alerta>}
        <BotaoEnviar rotulo="Analisar (não grava nada)" rotuloEnviando="Analisando…" variante="secundario" className="self-start" />
      </form>

      {analise.linhas && (
        <form action={importar} className="flex flex-col gap-4">
          <input type="hidden" name="csv" value={analise.csv} />
          {analise.colunasIgnoradas && analise.colunasIgnoradas.length > 0 && (
            <Alerta tipo="aviso">Colunas ignoradas: {analise.colunasIgnoradas.join(", ")}.</Alerta>
          )}
          <p className="text-sm">
            {analise.linhas.length} linha(s); {analise.importaveis} entram sem revisão. Duplicatas prováveis e linhas com erro
            não entram; possíveis duplicatas só entram se você marcar.
          </p>
          <ul className="flex flex-col divide-y divide-borda text-sm">
            {analise.linhas.map((l) => {
              const forte = l.duplicadaNoArquivo !== null || l.duplicatas.some((d) => d.nivel === "forte");
              const possivel = !forte && l.duplicatas.length > 0;
              return (
                <li key={l.linha} className="flex flex-col gap-1 py-2">
                  <p>
                    <span className="text-texto-suave">Linha {l.linha}:</span> <strong>{l.nome}</strong>{" "}
                    {l.erros.length > 0 ? (
                      <span className="text-perigo">— não entra: {l.erros.join("; ")}</span>
                    ) : forte ? (
                      <span className="text-perigo">— não entra (duplicata provável)</span>
                    ) : possivel ? (
                      <span className="text-aviso">— possível duplicata</span>
                    ) : (
                      <span className="text-sucesso">— ok</span>
                    )}
                  </p>
                  {l.duplicadaNoArquivo !== null && <p className="text-texto-suave">Repete a linha {l.duplicadaNoArquivo} do arquivo.</p>}
                  {l.duplicatas.map((d) => (
                    <p key={d.id} className="text-texto-suave">
                      Parece{" "}
                      <Link href={`/prospeccao/${d.id}`} target="_blank" className="text-link underline">
                        {d.nomeComercial}
                      </Link>
                      : {d.motivos.join(", ")}
                    </p>
                  ))}
                  {possivel && l.erros.length === 0 && (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="forcar" value={l.linha} />
                      Conferi: é outro estabelecimento, importar
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
          {importacao.erro && <Alerta tipo="perigo">{importacao.erro}</Alerta>}
          <BotaoEnviar rotulo="Importar" rotuloEnviando="Importando…" className="self-start" />
        </form>
      )}
    </div>
  );
}
