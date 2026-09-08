import type { Evento } from "@/lib/eventos";
import { paraInputDatetimeLocal } from "@/lib/formatacao";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";

type FormularioEventoGenericoProps = {
  empresaId: number;
  valoresIniciais?: Evento;
  action: (formData: FormData) => void;
  rotuloEnvio: string;
};

export function FormularioEventoGenerico({
  empresaId,
  valoresIniciais,
  action,
  rotuloEnvio,
}: FormularioEventoGenericoProps) {
  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="empresaId" value={empresaId} />

      <p className="text-sm text-paper-dim">
        Modelo de contrato ainda não definido para esta empresa — formulário
        provisório, será refinado depois.
      </p>

      {/* Dados do cliente */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Dados do cliente</h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cliente" className={rotuloClasse}>
            Cliente
          </label>
          <input
            id="cliente"
            name="cliente"
            type="text"
            required
            defaultValue={valoresIniciais?.cliente}
            className={campoClasse}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="telefone" className={rotuloClasse}>
              Telefone
            </label>
            <input
              id="telefone"
              name="telefone"
              type="text"
              defaultValue={valoresIniciais?.telefone ?? ""}
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="enderecoEvento" className={rotuloClasse}>
              Endereço do evento
            </label>
            <input
              id="enderecoEvento"
              name="enderecoEvento"
              type="text"
              defaultValue={valoresIniciais?.endereco_evento ?? ""}
              className={campoClasse}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipoEvento" className={rotuloClasse}>
            Tipo de evento
          </label>
          <input
            id="tipoEvento"
            name="tipoEvento"
            type="text"
            placeholder="Casamento, aniversário, corporativo..."
            defaultValue={valoresIniciais?.tipo_evento ?? ""}
            className={campoClasse}
          />
        </div>
      </section>

      {/* Datas e horários */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Datas e horários</h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="dataEvento" className={rotuloClasse}>
            Data e hora
          </label>
          <input
            id="dataEvento"
            name="dataEvento"
            type="datetime-local"
            required
            defaultValue={
              valoresIniciais
                ? paraInputDatetimeLocal(valoresIniciais.data_evento)
                : undefined
            }
            className={campoClasse}
          />
        </div>
      </section>

      {/* Valores */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Valores</h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="valor" className={rotuloClasse}>
            Valor do evento (R$)
          </label>
          <input
            id="valor"
            name="valor"
            type="number"
            min={0}
            step="0.01"
            defaultValue={valoresIniciais?.valor ?? ""}
            className={campoClasse}
          />
        </div>
      </section>

      {/* Financeiro / observações */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Financeiro/observações</h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="observacoes" className={rotuloClasse}>
            Observações
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={4}
            defaultValue={valoresIniciais?.observacoes ?? ""}
            className={campoClasse}
          />
        </div>
      </section>

      {/* Status */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Status</h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className={rotuloClasse}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={valoresIniciais?.status ?? "orcado"}
            className={campoClasse}
          >
            <option value="orcado">Orçado</option>
            <option value="confirmado">Confirmado</option>
            <option value="realizado">Realizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </section>

      {/* Contrato */}
      <section className="flex flex-col gap-3">
        <h3 className={secaoTituloClasse}>Contrato</h3>
        <p className="text-sm text-paper-dim">
          Cadastro manual — a extração automática de contrato (upload de PDF)
          vem numa etapa futura.
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="caminhoContrato" className={rotuloClasse}>
            Caminho do contrato (opcional)
          </label>
          <input
            id="caminhoContrato"
            name="caminhoContrato"
            type="text"
            placeholder="/uploads/contratos/empresa/arquivo.pdf"
            defaultValue={valoresIniciais?.caminho_contrato ?? ""}
            className={campoClasse}
          />
        </div>
      </section>

      <button
        type="submit"
        className="mt-2 inline-flex items-center justify-center self-start rounded-[2px] bg-ember px-6 py-2.5 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        {rotuloEnvio}
      </button>
    </form>
  );
}
