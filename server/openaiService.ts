import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "sk-default-key"
});

export interface SpeciesCandidate {
  nome: string;
  confianca: number;
}

export interface SpeciesIdentificationResult {
  especie_sugerida: string;
  candidatos: SpeciesCandidate[];
  confianca_media: number;
}

export async function identifyTreeSpecies(imageBase64: string): Promise<SpeciesIdentificationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
      messages: [
        {
          role: "system",
          content: `Você é um especialista em botânica brasileira. Analise a imagem da árvore e identifique a espécie. 
          Retorne em JSON com:
          - especie_sugerida: nome científico da espécie mais provável
          - candidatos: array com até 5 candidatos, cada um com "nome" (científico e comum) e "confianca" (0-100)
          - confianca_media: confiança média de todos os candidatos
          
          Foque em espécies comuns na arborização urbana brasileira como Eucalyptus, Tipuana tipu, Sibipiruna, Pau-ferro, etc.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identifique a espécie desta árvore urbana brasileira. Forneça o nome científico e comum, com nível de confiança."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate and format response
    const formattedResult: SpeciesIdentificationResult = {
      especie_sugerida: result.especie_sugerida || "Espécie não identificada",
      candidatos: (result.candidatos || []).slice(0, 5).map((c: any) => ({
        nome: c.nome || "Desconhecido",
        confianca: Math.max(0, Math.min(100, c.confianca || 0))
      })),
      confianca_media: Math.max(0, Math.min(100, result.confianca_media || 0))
    };

    return formattedResult;
  } catch (error) {
    console.error("Erro na identificação de espécie:", error);
    throw new Error("Falha ao identificar espécie da árvore. Verifique sua conexão e tente novamente.");
  }
}
