import { z } from "zod";

// Schema exato pedido pelo Pedro (2026-09-27, sugestão do Gemini) para
// estruturar `preparos.modo_preparo` (texto livre) em passos JSONB.
// `passos_eh_array` (src/db/schema/preparos.ts) garante no banco que o
// valor gravado é sempre um array — este schema garante o formato de
// cada elemento na camada de aplicação.
export const passoPreparoSchema = z.object({
  ordem: z.number().int().positive(),
  descricao: z.string().trim().min(1),
  tempo_estimado_min: z.number().int().positive().nullable(),
});

export const passosPreparoSchema = z.array(passoPreparoSchema);

export type PassoPreparo = z.infer<typeof passoPreparoSchema>;
export type PassosPreparo = z.infer<typeof passosPreparoSchema>;
