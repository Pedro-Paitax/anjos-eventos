import type { Evento } from "@/lib/eventos";
import { paraInputDatetimeLocal } from "@/lib/formatacao";
import { campoClasse, OPCOES_STATUS_EVENTO, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { Campo } from "@/components/campo";
import { Seletor } from "@/components/seletor";
import { BotaoEnviar } from "@/components/botao-enviar";

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

      <p className="text-sm text-texto-suave">
        Modelo de contrato ainda não definido para esta empresa — formulário
        provisório, será refinado depois.
      </p>

      {/* Dados do cliente */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Dados do cliente</h3>

        <Campo rotulo="Cliente">
          {(p) => (
            <input {...p}
              name="cliente"
              type="text"
              required
              defaultValue={valoresIniciais?.cliente}
            />
          )}
        </Campo>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo rotulo="Telefone">
            {(p) => (
              <input {...p}
                name="telefone"
                type="text"
                defaultValue={valoresIniciais?.telefone ?? ""}
              />
            )}
          </Campo>
          <Campo rotulo="Endereço do evento">
            {(p) => (
              <input {...p}
                name="enderecoEvento"
                type="text"
                defaultValue={valoresIniciais?.endereco_evento ?? ""}
              />
            )}
          </Campo>
        </div>

        <Campo rotulo="Tipo de evento">
          {(p) => (
            <input {...p}
              name="tipoEvento"
              type="text"
              placeholder="Casamento, aniversário, corporativo..."
              defaultValue={valoresIniciais?.tipo_evento ?? ""}
            />
          )}
        </Campo>
      </section>

      {/* Datas e horários */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Datas e horários</h3>

        <Campo rotulo="Data e hora">
          {(p) => (
            <input {...p}
              name="dataEvento"
              type="datetime-local"
              required
              defaultValue={
                valoresIniciais
                  ? paraInputDatetimeLocal(valoresIniciais.data_evento)
                  : undefined
              }
            />
          )}
        </Campo>
      </section>

      {/* Valores */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Valores</h3>

        <Campo rotulo="Valor do evento (R$)">
          {(p) => (
            <input {...p}
              name="valor"
              type="number"
              min={0}
              step="0.01"
              defaultValue={valoresIniciais?.valor ?? ""}
            />
          )}
        </Campo>
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

        <Campo rotulo="Status">
          {(p) => (
            <Seletor {...p}
              name="status"
              defaultValue={valoresIniciais?.status ?? "orcado"}
              opcoes={OPCOES_STATUS_EVENTO}
            />
          )}
        </Campo>
      </section>

      {/* Contrato */}
      <section className="flex flex-col gap-3">
        <h3 className={secaoTituloClasse}>Contrato</h3>
        <p className="text-sm text-texto-suave">
          Cadastro manual — a extração automática de contrato (upload de PDF)
          vem numa etapa futura.
        </p>
        <Campo rotulo="Caminho do contrato (opcional)">
          {(p) => (
            <input {...p}
              name="caminhoContrato"
              type="text"
              placeholder="/uploads/contratos/empresa/arquivo.pdf"
              defaultValue={valoresIniciais?.caminho_contrato ?? ""}
            />
          )}
        </Campo>
      </section>

      <BotaoEnviar rotulo={rotuloEnvio} className="w-full sm:w-auto sm:self-start" />
    </form>
  );
}
