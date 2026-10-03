import { describe, expect, it } from "vitest";
import { valoresEnviados } from "@/lib/formulario-valores";

describe("valoresEnviados", () => {
  it("devolve os campos de texto enviados, inclusive vazios", () => {
    const fd = new FormData();
    fd.set("nome", "Maria");
    fd.set("telefone", "");
    expect(valoresEnviados(fd)).toEqual({ nome: "Maria", telefone: "" });
  });

  it("ignora arquivos e campos internos do React", () => {
    const fd = new FormData();
    fd.set("nome", "Ana");
    fd.set("$ACTION_ID_abc", "x");
    fd.set("anexo", new Blob(["x"]), "a.txt");
    expect(valoresEnviados(fd)).toEqual({ nome: "Ana" });
  });

  it("campo repetido fica com o primeiro valor", () => {
    const fd = new FormData();
    fd.append("colaboradorIds", "4");
    fd.append("colaboradorIds", "5");
    expect(valoresEnviados(fd)).toEqual({ colaboradorIds: "4" });
  });
});
