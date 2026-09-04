import type { Empresa } from "@/lib/empresas";
import type { Evento } from "@/lib/eventos";
import { paraInputDatetimeLocal } from "@/lib/formatacao";

const campoClasse =
  "rounded-[2px] border border-paper-dim/20 bg-ink-soft px-3 py-2 text-paper placeholder:text-paper-dim/50 focus:border-brass focus:outline-none";
const rotuloClasse = "text-sm text-paper-dim";

type FormularioEventoProps = {
  empresas: Empresa[];
  valoresIniciais?: Evento;
  action: (formData: FormData) => void;
  rotuloEnvio: string;
};

export function FormularioEvento({
  empresas,
  valoresIniciais,
  action,
  rotuloEnvio,
}: FormularioEventoProps) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="empresaId" className={rotuloClasse}>
          Empresa
        </label>
        <select
          id="empresaId"
          name="empresaId"
          required
          defaultValue={valoresIniciais?.empresa_id ?? ""}
          className={campoClasse}
        >
          <option value="" disabled>
            Selecione a empresa
          </option>
          {empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>
              {empresa.nome}
            </option>
          ))}
        </select>
      </div>

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
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="numConvidados" className={rotuloClasse}>
            Nº de convidados
          </label>
          <input
            id="numConvidados"
            name="numConvidados"
            type="number"
            min={0}
            defaultValue={valoresIniciais?.num_convidados ?? ""}
            className={campoClasse}
          />
        </div>

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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="valor" className={rotuloClasse}>
            Valor (R$)
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
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="veiculo" className={rotuloClasse}>
          Veículo de carga (só relevante pro Buffet Senhor Churrasco)
        </label>
        <select
          id="veiculo"
          name="veiculo"
          defaultValue={valoresIniciais?.veiculo ?? ""}
          className={campoClasse}
        >
          <option value="">Não se aplica</option>
          <option value="Master">Master</option>
          <option value="Kombi nova">Kombi nova</option>
          <option value="Kombi velha">Kombi velha</option>
        </select>
      </div>

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

      <button
        type="submit"
        className="mt-2 inline-flex items-center justify-center self-start rounded-[2px] bg-ember px-6 py-2.5 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        {rotuloEnvio}
      </button>
    </form>
  );
}
