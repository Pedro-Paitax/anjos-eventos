"use server";

import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { definirUsuarioAtual, limparUsuarioAtual } from "@/lib/usuario-atual";

export async function selecionarUsuario(formData: FormData) {
  const usuarioId = Number(formData.get("usuarioId"));

  const { rows } = await pool.query("SELECT id FROM usuarios WHERE id = $1", [
    usuarioId,
  ]);
  if (rows.length === 0) {
    throw new Error("Usuário inválido.");
  }

  await definirUsuarioAtual(usuarioId);
  redirect("/");
}

export async function trocarUsuario() {
  await limparUsuarioAtual();
  redirect("/login");
}
