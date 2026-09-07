import { NextResponse } from "next/server";

const NOCODB_URL =
  "http://100.77.218.36:8090/api/v2/tables/m3yr136ykw6ju2w/records?limit=1000";

export async function GET() {
  const token = process.env.NOCODB_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { erro: "NOCODB_API_TOKEN não configurado." },
      { status: 500 }
    );
  }

  const resposta = await fetch(NOCODB_URL, {
    headers: { "xc-token": token },
    cache: "no-store",
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    return NextResponse.json(
      { erro: `NocoDB respondeu ${resposta.status}`, detalhe: texto },
      { status: 502 }
    );
  }

  const dados = await resposta.json();
  return NextResponse.json(dados);
}
