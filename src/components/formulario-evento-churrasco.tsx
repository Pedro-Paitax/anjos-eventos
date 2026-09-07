"use client";

import { useState } from "react";
import type { Evento } from "@/lib/eventos";
import type { Preparo, CategoriaCardapio } from "@/lib/cardapio";
import {
  paraInputDatetimeLocal,
  paraInputDate,
  paraInputTime,
} from "@/lib/formatacao";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { SeletorCardapio } from "@/components/seletor-cardapio";

type FormularioEventoChurrascoProps = {
  empresaId: number;
  valoresIniciais?: Evento;
  preparosPorCategoria: Record<CategoriaCardapio, Preparo[]>;
  action: (formData: FormData) => void;
  rotuloEnvio: string;
};

function paraNumero(texto: string): number {
  const valor = Number(texto);
  return texto.trim() === "" || Number.isNaN(valor) ? 0 : valor;
}

export function FormularioEventoChurrasco({
  empresaId,
  valoresIniciais,
  preparosPorCategoria,
  action,
  rotuloEnvio,
}: FormularioEventoChurrascoProps) {
  const [qtdAdultos, setQtdAdultos] = useState(
    valoresIniciais?.qtd_adultos?.toString() ?? ""
  );
  const [qtdCriancasAte5, setQtdCriancasAte5] = useState(
    valoresIniciais?.qtd_criancas_ate_5?.toString() ?? ""
  );
  const [qtdCriancas5a10, setQtdCriancas5a10] = useState(
    valoresIniciais?.qtd_criancas_5_a_10?.toString() ?? ""
  );
  const [qtdGarcons, setQtdGarcons] = useState(
    valoresIniciais?.qtd_garcons?.toString() ?? ""
  );
  const [precoPessoa, setPrecoPessoa] = useState(
    valoresIniciais?.preco_pessoa?.toString() ?? ""
  );
  const [precoCriancaMeia, setPrecoCriancaMeia] = useState(
    valoresIniciais?.preco_crianca_meia?.toString() ?? ""
  );
  const [valorGarcom, setValorGarcom] = useState(
    valoresIniciais?.valor_garcom?.toString() ?? ""
  );
  const [taxaDeslocamento, setTaxaDeslocamento] = useState(
    valoresIniciais?.taxa_deslocamento?.toString() ?? ""
  );

  const valorSugerido =
    paraNumero(qtdAdultos) * paraNumero(precoPessoa) +
    (paraNumero(qtdCriancasAte5) + paraNumero(qtdCriancas5a10)) *
      paraNumero(precoCriancaMeia) +
    paraNumero(qtdGarcons) * paraNumero(valorGarcom) +
    paraNumero(taxaDeslocamento);

  const valorSugeridoFormatado = valorSugerido.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="empresaId" value={empresaId} />

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
            <label htmlFor="contato" className={rotuloClasse}>
              Contato (se diferente do cliente)
            </label>
            <input
              id="contato"
              name="contato"
              type="text"
              defaultValue={valoresIniciais?.contato ?? ""}
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="telefone" className={rotuloClasse}>
              Celular
            </label>
            <input
              id="telefone"
              name="telefone"
              type="text"
              defaultValue={valoresIniciais?.telefone ?? ""}
              className={campoClasse}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="horaChegadaEquipe" className={rotuloClasse}>
              Chegada da equipe
            </label>
            <input
              id="horaChegadaEquipe"
              name="horaChegadaEquipe"
              type="time"
              defaultValue={
                valoresIniciais?.hora_chegada_equipe
                  ? paraInputTime(valoresIniciais.hora_chegada_equipe)
                  : ""
              }
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="horaAperitivo" className={rotuloClasse}>
              Aperitivo
            </label>
            <input
              id="horaAperitivo"
              name="horaAperitivo"
              type="time"
              defaultValue={
                valoresIniciais?.hora_aperitivo
                  ? paraInputTime(valoresIniciais.hora_aperitivo)
                  : ""
              }
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="horaAlmoco" className={rotuloClasse}>
              Almoço
            </label>
            <input
              id="horaAlmoco"
              name="horaAlmoco"
              type="time"
              defaultValue={
                valoresIniciais?.hora_almoco
                  ? paraInputTime(valoresIniciais.hora_almoco)
                  : ""
              }
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="horaEncerramento" className={rotuloClasse}>
              Limpeza/encerramento
            </label>
            <input
              id="horaEncerramento"
              name="horaEncerramento"
              type="time"
              defaultValue={
                valoresIniciais?.hora_encerramento
                  ? paraInputTime(valoresIniciais.hora_encerramento)
                  : ""
              }
              className={campoClasse}
            />
          </div>
        </div>
      </section>

      {/* Convidados */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Convidados</h3>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div className="flex flex-col justify-end gap-1.5">
            <label htmlFor="qtdAdultos" className={rotuloClasse}>
              Adultos
            </label>
            <input
              id="qtdAdultos"
              name="qtdAdultos"
              type="number"
              min={0}
              value={qtdAdultos}
              onChange={(e) => setQtdAdultos(e.target.value)}
              className={campoClasse}
            />
          </div>

          <div className="flex flex-col justify-end gap-1.5">
            <label htmlFor="qtdCriancasAte5" className={rotuloClasse}>
              Crianças até 5 anos
            </label>
            <input
              id="qtdCriancasAte5"
              name="qtdCriancasAte5"
              type="number"
              min={0}
              value={qtdCriancasAte5}
              onChange={(e) => setQtdCriancasAte5(e.target.value)}
              className={campoClasse}
            />
          </div>

          <div className="flex flex-col justify-end gap-1.5">
            <label htmlFor="qtdCriancas5a10" className={rotuloClasse}>
              Crianças de 5 a 10 anos
            </label>
            <input
              id="qtdCriancas5a10"
              name="qtdCriancas5a10"
              type="number"
              min={0}
              value={qtdCriancas5a10}
              onChange={(e) => setQtdCriancas5a10(e.target.value)}
              className={campoClasse}
            />
          </div>

          <div className="flex flex-col justify-end gap-1.5">
            <label htmlFor="qtdFornecedores" className={rotuloClasse}>
              Fornecedores
            </label>
            <input
              id="qtdFornecedores"
              name="qtdFornecedores"
              type="number"
              min={0}
              defaultValue={valoresIniciais?.qtd_fornecedores ?? ""}
              className={campoClasse}
            />
          </div>
        </div>
      </section>

      {/* Cardápio */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Cardápio</h3>
        <p className="text-sm text-paper-dim">
          Puxando da base de fichas técnicas do NocoDB.
        </p>

        <SeletorCardapio
          preparosPorCategoria={preparosPorCategoria}
          valoresIniciais={valoresIniciais}
        />
      </section>

      {/* Valores */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Valores</h3>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="precoPessoa" className={rotuloClasse}>
              Preço por pessoa (R$)
            </label>
            <input
              id="precoPessoa"
              name="precoPessoa"
              type="number"
              min={0}
              step="0.01"
              value={precoPessoa}
              onChange={(e) => setPrecoPessoa(e.target.value)}
              className={campoClasse}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="precoCriancaMeia" className={rotuloClasse}>
              Preço criança meia (R$)
            </label>
            <input
              id="precoCriancaMeia"
              name="precoCriancaMeia"
              type="number"
              min={0}
              step="0.01"
              value={precoCriancaMeia}
              onChange={(e) => setPrecoCriancaMeia(e.target.value)}
              className={campoClasse}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="valorGarcom" className={rotuloClasse}>
              Valor por garçom (R$)
            </label>
            <input
              id="valorGarcom"
              name="valorGarcom"
              type="number"
              min={0}
              step="0.01"
              value={valorGarcom}
              onChange={(e) => setValorGarcom(e.target.value)}
              className={campoClasse}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="taxaDeslocamento" className={rotuloClasse}>
              Taxa de deslocamento (R$)
            </label>
            <input
              id="taxaDeslocamento"
              name="taxaDeslocamento"
              type="number"
              min={0}
              step="0.01"
              value={taxaDeslocamento}
              onChange={(e) => setTaxaDeslocamento(e.target.value)}
              className={campoClasse}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="valorSugerido" className={rotuloClasse}>
              Valor sugerido (R$)
            </label>
            <input
              id="valorSugerido"
              type="text"
              readOnly
              disabled
              value={valorSugeridoFormatado}
              title="Calculado automaticamente a partir de convidados, garçons e taxa de deslocamento. Apenas referência."
              className={`${campoClasse} cursor-not-allowed text-paper-dim`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="valor" className={rotuloClasse}>
              Valor total do evento (R$)
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
      </section>

      {/* Serviços */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Serviços</h3>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdGarcons" className={rotuloClasse}>
              Quantidade de garçons
            </label>
            <input
              id="qtdGarcons"
              name="qtdGarcons"
              type="number"
              min={0}
              value={qtdGarcons}
              onChange={(e) => setQtdGarcons(e.target.value)}
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdChurrasqueiros" className={rotuloClasse}>
              Quantidade de churrasqueiros
            </label>
            <input
              id="qtdChurrasqueiros"
              name="qtdChurrasqueiros"
              type="number"
              min={0}
              defaultValue={valoresIniciais?.qtd_churrasqueiros ?? ""}
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdCopeiras" className={rotuloClasse}>
              Quantidade de copeiras
            </label>
            <input
              id="qtdCopeiras"
              name="qtdCopeiras"
              type="number"
              min={0}
              defaultValue={valoresIniciais?.qtd_copeiras ?? ""}
              className={campoClasse}
            />
          </div>
        </div>
      </section>

      {/* Financeiro / observações */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Financeiro/observações</h3>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prazoPagamento" className={rotuloClasse}>
              Prazo de pagamento
            </label>
            <input
              id="prazoPagamento"
              name="prazoPagamento"
              type="date"
              defaultValue={
                valoresIniciais?.prazo_pagamento
                  ? paraInputDate(valoresIniciais.prazo_pagamento)
                  : ""
              }
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="chavePix" className={rotuloClasse}>
              Chave PIX
            </label>
            <input
              id="chavePix"
              name="chavePix"
              type="text"
              defaultValue={valoresIniciais?.chave_pix ?? ""}
              className={campoClasse}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="observacoes" className={rotuloClasse}>
            Observações gerais
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

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
            placeholder="/uploads/contratos/senhor-churrasco/arquivo.pdf"
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
