"use client";

import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";

type FormularioOrcamentoGenericoProps = {
  empresaId: number;
  action: (formData: FormData) => void;
};

export function FormularioOrcamentoGenerico({ empresaId, action }: FormularioOrcamentoGenericoProps) {
  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="empresaId" value={empresaId} />

      <p className="text-sm text-paper-dim">
        Modelo de contrato ainda não definido pra esta empresa — orçamento
        fechado direto no valor negociado, sem itens de cardápio.
      </p>

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
        <h3 className={secaoTituloClasse}>Valor</h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="valorNegociado" className={rotuloClasse}>
            Valor negociado (R$)
          </label>
          <input
            id="valorNegociado"
            name="valorNegociado"
            type="number"
            min={0}
            step="0.01"
            required
            className={campoClasse}
          />
        </div>
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
