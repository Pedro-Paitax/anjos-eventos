// Núcleo puro do Motor de Pacotes Fixos e Tolerância de Substituição —
// docs/DECISOES.md, seção "Motor de Pacotes Fixos e Tolerância de
// Substituição". Duas regras distintas, de propósito NÃO unificadas numa
// função só (mesmo raciocínio da divergência Simulador/Criar Evento em
// precificacao-cardapio.ts): o Simulador Público é incondicional, o
// Painel Administrativo tem tolerância paramétrica.

function arredondar(valor: number): number {
  return Math.round(Number(valor.toFixed(8)) * 100) / 100;
}

export type AvaliacaoTrocaPacoteFixo = {
  /** Custo por pessoa da seleção atual menos o do Cardápio Modelo original — pode ser negativa (custo caiu). */
  diferencaCustoPorPessoa: number;
  /** true = mantém Usar_Preco_Fixo_Modelo automaticamente, sem alerta. */
  dentroDaTolerancia: boolean;
};

/**
 * Painel Administrativo / Criar Evento — tolerância paramétrica
 * (Tolerancia_Troca_Preco_Fixo, lida de Configuracoes_Globais, nunca
 * hardcoded no chamador). Recalcula do zero a cada chamada: o chamador
 * deve sempre passar o custo por pessoa da seleção ATUAL COMPLETA e do
 * Cardápio Modelo ORIGINAL COMPLETO — nunca some incrementalmente
 * diferenças de trocas já aprovadas antes.
 *
 * Diferença ≤ tolerância (incluindo negativa, custo caiu) → dentro da
 * tolerância, sem alerta. Diferença > tolerância → fora, o chamador exibe
 * o aviso não-bloqueante com os dois botões (decisão do usuário) — essa
 * função só calcula, não decide o que fazer com o resultado.
 */
export function avaliarTrocaPacoteFixoCriarEvento(
  custoPorPessoaSelecaoAtual: number,
  custoPorPessoaCardapioModeloOriginal: number,
  toleranciaTrocaPrecoFixo: number
): AvaliacaoTrocaPacoteFixo {
  const diferencaCustoPorPessoa = arredondar(
    custoPorPessoaSelecaoAtual - custoPorPessoaCardapioModeloOriginal
  );

  return {
    diferencaCustoPorPessoa,
    dentroDaTolerancia: diferencaCustoPorPessoa <= toleranciaTrocaPrecoFixo,
  };
}

/**
 * Simulador Público — proteção estrita, sem exceção. Qualquer edição de
 * item (adicionar, remover, trocar) dentro de um Cardápio Modelo com
 * preço fixo quebra o pacote imediatamente. Incondicional por design —
 * não existe tolerância aqui, nunca chame isso com um cálculo de
 * diferença por trás; o simples fato de ter havido uma edição já é
 * suficiente pra quebrar.
 */
export function quebrarPacoteFixoSimuladorPublico(): { usarPrecoFixoModelo: false } {
  return { usarPrecoFixoModelo: false };
}
