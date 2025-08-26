// src/services/ia.ts
// PlantNet API service
export async function identificarEspecie(
  imageUrl: string, 
  organs: string[] = ["leaf","flower","fruit","bark","habit"]
) {
  const resp = await fetch("/api/ia/identificar-especie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl, organs, lang: "pt" }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || "Falha ao identificar espécie");
  }
  return resp.json();
}