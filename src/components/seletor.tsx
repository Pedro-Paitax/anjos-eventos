"use client";

import { useEffect, useRef, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { campoClasse } from "@/components/campo";

// Select do Brasa (DESIGN-SYSTEM §11.3). Troca o <select> nativo mantendo o payload: o valor
// vai num <input name> próprio, na mesma posição do DOM (mesmo name, valor e ordem no FormData).
// Não usamos `name`/`required` do Radix: o select nativo escondido dele não aceita value="".
// "" é o "sem seleção": opção com valor "" vira item com sentinela; `placeholder` mostra o texto
// quando o valor é "" e não há opção "".

export type OpcaoSeletor = {
  valor: string;
  rotulo: string;
  desabilitada?: boolean;
};

type SeletorProps = {
  id?: string;
  name?: string;
  /** Só layout (largura, flex). Aceita o `className` do `Campo`: a classe do campo é do gatilho. */
  className?: string;
  opcoes: OpcaoSeletor[];
  /** Não controlado (como `defaultValue` do <select>). */
  defaultValue?: string;
  /** Controlado (como `value` do <select>). */
  value?: string;
  onChange?: (valor: string) => void;
  required?: boolean;
  disabled?: boolean;
  /** Mostrado quando o valor é "" e nenhuma opção tem valor "". Também vale como "" válido. */
  placeholder?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

const VAZIO = "__vazio__";

// O <select> nativo cai na primeira opção habilitada quando o valor não existe nas opções;
// repetimos isso para o valor enviado ser o mesmo de antes.
function normalizar(valor: string, opcoes: OpcaoSeletor[], placeholder?: string) {
  if (opcoes.some((o) => o.valor === valor)) return valor;
  if (placeholder !== undefined && valor === "") return "";
  return opcoes.find((o) => !o.desabilitada)?.valor ?? "";
}

export function Seletor({
  id,
  name,
  className,
  opcoes,
  defaultValue = "",
  value,
  onChange,
  required,
  disabled,
  placeholder = "Selecione…",
  ...aria
}: SeletorProps) {
  const [interno, setInterno] = useState(() => normalizar(defaultValue, opcoes, placeholder));
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const layout = (className ?? "").split(" ").filter((c) => c && c !== campoClasse).join(" ");
  const controlado = value !== undefined;
  const atual = normalizar(controlado ? value : interno, opcoes, placeholder);
  const defaultRef = useRef(normalizar(defaultValue, opcoes, placeholder));

  // <form> resetado (React 19 reseta o form depois de uma action): volta ao valor inicial.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form || controlado) return;
    const aoResetar = () => setInterno(defaultRef.current);
    form.addEventListener("reset", aoResetar);
    return () => form.removeEventListener("reset", aoResetar);
  }, [controlado]);

  const selecionada = opcoes.find((o) => o.valor === atual);
  const temOpcaoVazia = opcoes.some((o) => o.valor === "");
  const valorRadix = atual === "" ? (temOpcaoVazia ? VAZIO : "") : atual;

  function aoMudar(v: string) {
    const novo = v === VAZIO ? "" : v;
    if (!controlado) setInterno(novo);
    onChange?.(novo);
  }

  return (
    <div className={`relative ${layout}`}>
      <Select.Root
        value={valorRadix}
        onValueChange={aoMudar}
        disabled={disabled}
      >
        <Select.Trigger
          ref={gatilhoRef}
          id={id}
          className={`${campoClasse} seletor-gatilho`}
          {...aria}
        >
          <Select.Value placeholder={placeholder}>
            {selecionada ? selecionada.rotulo : undefined}
          </Select.Value>
          <Select.Icon asChild>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width={20}
              height={20}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="seletor-seta"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="seletor-painel"
            position="popper"
            sideOffset={6}
            collisionPadding={8}
            // Dentro do Modal, o Esc do Radix fecha só a lista (o Modal escuta o `document`).
            onEscapeKeyDown={(e) => e.stopPropagation()}
          >
            <Select.Viewport className="seletor-viewport">
              {opcoes.map((o) => (
                <Select.Item
                  key={o.valor}
                  value={o.valor === "" ? VAZIO : o.valor}
                  disabled={o.desabilitada}
                  className="seletor-item"
                >
                  <Select.ItemText>{o.rotulo}</Select.ItemText>
                  <Select.ItemIndicator className="seletor-marca">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      width={18}
                      height={18}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      {/* O valor enviado. Com `required`, vira campo de texto que cobre o gatilho (campo oculto
          não valida); o aviso do navegador aparece nele e o foco vai para o gatilho. */}
      <input
        ref={inputRef}
        name={name}
        value={atual}
        onChange={() => {}}
        disabled={disabled}
        required={required}
        type={required ? "text" : "hidden"}
        tabIndex={-1}
        aria-hidden={required ? true : undefined}
        onFocus={() => gatilhoRef.current?.focus()}
        className={required ? "seletor-validacao" : undefined}
      />
    </div>
  );
}
