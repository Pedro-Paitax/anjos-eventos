"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { EstadoAcao } from "@/app/actions/prospeccao";
import type { Lead } from "@/lib/prospeccao";
import type { Usuario } from "@/lib/usuario-atual";
import { CATEGORIAS_LEAD, ROTULOS_CATEGORIA } from "@/lib/prospeccao-opcoes";
import { secaoTituloClasse } from "@/components/formulario-evento";
import { Campo } from "@/components/campo";
import { Seletor } from "@/components/seletor";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Alerta } from "@/components/alerta";

type FormularioLeadProps = {
  lead?: Lead;
  usuarios: Usuario[];
  action: (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;
  rotuloEnvio: string;
};

const SEM_RESPONSAVEL = "";

export function FormularioLead({ lead, usuarios, action, rotuloEnvio }: FormularioLeadProps) {
  const [estado, formAction] = useActionState(action, {});
  const v = (campo: string, inicial: string | null | undefined) => estado.valores?.[campo] ?? inicial ?? "";

  const texto = (campo: string, rotulo: string, inicial: string | null | undefined, extra?: { tipo?: string; ajuda?: string; obrigatorio?: boolean; placeholder?: string }) => (
    <Campo rotulo={rotulo} ajuda={extra?.ajuda}>
      {(p) => (
        <input
          {...p}
          name={campo}
          type={extra?.tipo ?? "text"}
          required={extra?.obrigatorio}
          placeholder={extra?.placeholder}
          defaultValue={v(campo, inicial)}
        />
      )}
    </Campo>
  );

  const areaTexto = (campo: string, rotulo: string, inicial: string | null | undefined, ajuda?: string) => (
    <Campo rotulo={rotulo} ajuda={ajuda}>
      {(p) => <textarea {...p} name={campo} rows={3} defaultValue={v(campo, inicial)} />}
    </Campo>
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <h3 className={secaoTituloClasse}>Identificação</h3>
      {texto("nome_comercial", "Nome comercial", lead?.nomeComercial, { obrigatorio: true })}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Campo rotulo="Categoria">
          {(p) => (
            <Seletor
              {...p}
              name="categoria"
              defaultValue={v("categoria", lead?.categoria ?? "cervejaria")}
              opcoes={CATEGORIAS_LEAD.map((c) => ({ valor: c, rotulo: ROTULOS_CATEGORIA[c] }))}
            />
          )}
        </Campo>
        {texto("segmento", "Segmento", lead?.segmento, { placeholder: "ex.: brewpub com cozinha" })}
        {texto("nome_legal", "Nome legal", lead?.nomeLegal, { ajuda: "Só se constar em fonte pública e for relevante." })}
        {texto("municipio", "Município", lead?.municipio, { placeholder: "Curitiba" })}
      </div>
      {texto("endereco", "Endereço", lead?.endereco)}

      <h3 className={secaoTituloClasse}>Contato comercial público</h3>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {texto("site", "Site oficial", lead?.site, { placeholder: "https://…" })}
        {texto("instagram", "Instagram", lead?.instagram ? `@${lead.instagram}` : null, { placeholder: "@perfil" })}
        {texto("telefone", "Telefone / WhatsApp comercial", lead?.telefone, {
          tipo: "tel",
          placeholder: "(41) 3333-4444",
          ajuda: "Com DDD. Guardado com DDI 55.",
        })}
        {texto("email", "E-mail comercial", lead?.email, { tipo: "email" })}
      </div>
      {texto("outros_perfis", "Outros perfis", lead?.outrosPerfis, { placeholder: "Facebook, TikTok, LinkedIn…" })}
      {texto("responsavel_comercial", "Responsável comercial", lead?.responsavelComercial, {
        ajuda: "Só quando identificado em fonte legítima (registre a evidência).",
      })}

      <h3 className={secaoTituloClasse}>Potencial (resuma; as fontes vão em Evidências)</h3>
      {areaTexto("sinais_demanda", "Sinais de demanda por eventos/experiências", lead?.sinaisDemanda)}
      {areaTexto("compatibilidade_parrilla", "Compatibilidade com parrilla / fogo ao vivo", lead?.compatibilidadeParrilla)}
      {areaTexto("limitacoes", "Limitações ou dúvidas operacionais", lead?.limitacoes)}
      {areaTexto("observacoes", "Observações comerciais", lead?.observacoes)}

      <Campo rotulo="Responsável interno">
        {(p) => (
          <Seletor
            {...p}
            name="responsavel_usuario_id"
            defaultValue={v("responsavel_usuario_id", lead?.responsavelUsuarioId ? String(lead.responsavelUsuarioId) : SEM_RESPONSAVEL)}
            opcoes={[
              { valor: SEM_RESPONSAVEL, rotulo: "Ninguém" },
              ...usuarios.map((u) => ({ valor: String(u.id), rotulo: u.nome })),
            ]}
          />
        )}
      </Campo>

      {estado.duplicatas && estado.duplicatas.length > 0 && (
        <div className="flex flex-col gap-3">
          <Alerta tipo="aviso">
            <ul className="flex flex-col gap-1">
              {estado.duplicatas.map((d) => (
                <li key={d.id}>
                  <Link href={`/prospeccao/${d.id}`} target="_blank" className="underline">
                    {d.nomeComercial}
                  </Link>{" "}
                  — {d.nivel === "forte" ? "duplicata provável" : "possível duplicata"}: {d.motivos.join(", ")}
                </li>
              ))}
            </ul>
          </Alerta>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="confirmar_nao_duplicata" />
            Conferi: é outro estabelecimento
          </label>
        </div>
      )}

      {estado.erro && <Alerta tipo="perigo">{estado.erro}</Alerta>}
      <BotaoEnviar rotulo={rotuloEnvio} className="w-full sm:w-auto sm:self-start" />
    </form>
  );
}
