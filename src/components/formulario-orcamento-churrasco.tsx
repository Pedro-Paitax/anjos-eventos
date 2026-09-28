"use client";

import { useState } from "react";
import type { Preparo, CategoriaCardapio } from "@/lib/cardapio";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { SeletorCardapio } from "@/components/seletor-cardapio";
import { obterItensCardapioModeloAction } from "@/app/actions/cardapio-modelo";
import type { CardapioModeloResumo } from "@/lib/cardapios-modelo";
import { paraValoresIniciaisCardapio, type ValoresIniciaisCardapio } from "@/components/seletor-cardapio";

type FormularioOrcamentoChurrascoProps = {
  empresaId: number;
  preparosPorCategoria: Record<CategoriaCardapio, Preparo[]>;
  cardapiosModelo: CardapioModeloResumo[];
  action: (formData: FormData) => void;
};

export function FormularioOrcamentoChurrasco({
  empresaId,
  preparosPorCategoria,
  cardapiosModelo,
  action,
}: FormularioOrcamentoChurrascoProps) {
  const [cardapioBase, setCardapioBase] = useState<ValoresIniciaisCardapio | undefined>(undefined);
  const [chaveSeletorCardapio, setChaveSeletorCardapio] = useState(0);
  const [aplicandoTemplate, setAplicandoTemplate] = useState(false);
  const [erroTemplate, setErroTemplate] = useState<string | null>(null);

  async function aplicarTemplate(idTexto: string) {
    const id = Number(idTexto);
    if (!id) return;

    setAplicandoTemplate(true);
    setErroTemplate(null);
    try {
      const resposta = await obterItensCardapioModeloAction(id);
      if ("erro" in resposta) {
        setErroTemplate(resposta.erro);
        return;
      }
      setCardapioBase(paraValoresIniciaisCardapio(resposta.preparoIds, preparosPorCategoria));
      setChaveSeletorCardapio((k) => k + 1);
    } catch {
      setErroTemplate("Falha ao carregar o cardápio pré-montado.");
    } finally {
      setAplicandoTemplate(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="empresaId" value={empresaId} />

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Dados do cliente</h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="clienteNome" className={rotuloClasse}>
            Cliente
          </label>
          <input id="clienteNome" name="clienteNome" type="text" required className={campoClasse} />
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Convidados</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdAdultos" className={rotuloClasse}>
              Adultos
            </label>
            <input id="qtdAdultos" name="qtdAdultos" type="number" min={0} defaultValue={0} className={campoClasse} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdCriancasAte5" className={rotuloClasse}>
              Crianças até 5 anos
            </label>
            <input
              id="qtdCriancasAte5"
              name="qtdCriancasAte5"
              type="number"
              min={0}
              defaultValue={0}
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdCriancas5a10" className={rotuloClasse}>
              Crianças de 5 a 10 anos
            </label>
            <input
              id="qtdCriancas5a10"
              name="qtdCriancas5a10"
              type="number"
              min={0}
              defaultValue={0}
              className={campoClasse}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Cardápio</h3>

        {cardapiosModelo.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cardapioModeloBase" className={rotuloClasse}>
              Começar de um Cardápio Pré-Montado (opcional)
            </label>
            <select
              id="cardapioModeloBase"
              defaultValue=""
              disabled={aplicandoTemplate}
              onChange={(e) => aplicarTemplate(e.target.value)}
              className={campoClasse}
            >
              <option value="">— Selecionar —</option>
              {cardapiosModelo.map((cardapio) => (
                <option key={cardapio.id} value={cardapio.id}>
                  {cardapio.nome}
                </option>
              ))}
            </select>
            {erroTemplate && <p className="text-sm text-ember">{erroTemplate}</p>}
          </div>
        )}

        <SeletorCardapio
          key={chaveSeletorCardapio}
          preparosPorCategoria={preparosPorCategoria}
          valoresIniciais={cardapioBase}
        />
      </section>

      <button
        type="submit"
        className="mt-2 inline-flex items-center justify-center self-start rounded-[2px] bg-ember px-6 py-2.5 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        Gerar Orçamento
      </button>
    </form>
  );
}
