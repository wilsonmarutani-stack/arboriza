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

// OpenAI API service
export async function identificarEspecieOpenAI(imageBase64: string) {
  const resp = await fetch("/api/ia/openai/identificar-especie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || "Falha ao identificar espécie com OpenAI");
  }
  return resp.json();
}

// Convert image URL to base64
export async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]; // Remove data:image/... prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error("Erro ao converter imagem para base64");
  }
}