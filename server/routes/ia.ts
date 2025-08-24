import { Router } from "express";
import axios from "axios";

const router = Router();

/**
 * POST /api/ia/identificar-especie
 * Body: { inspecao_id: string, organs?: string[], lang?: string }
 * - Busca a foto no Object Storage
 * - Chama a Pl@ntNet API e devolve candidatos
 * - NÃO expõe a API key no frontend
 */
router.post("/identificar-especie", async (req, res) => {
  try {
    const { inspecao_id, organs = ["leaf","flower","fruit","bark","habit"], lang = "pt" } = req.body || {};
    if (!inspecao_id) return res.status(400).json({ error: "inspecao_id é obrigatório" });
    if (!process.env.PLANTNET_API_KEY) return res.status(500).json({ error: "PLANTNET_API_KEY não configurada" });

    // Para este projeto, vamos usar a foto que foi enviada diretamente
    // já que não temos Supabase configurado ainda, vamos adaptar para o fluxo atual
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: "imageUrl é obrigatória" });
    }

    // Montar chamada à Pl@ntNet
    const params = new URLSearchParams();
    params.append("api-key", process.env.PLANTNET_API_KEY as string);
    params.append("images", imageUrl);
    // múltiplos órgãos ajudam a precisão; envie todos os selecionados
    organs.forEach((o: string) => params.append("organs", o));
    params.append("lang", lang);
    params.append("include-related-images", "false");
    params.append("no-reject", "false");

    const url = `https://my-api.plantnet.org/v2/identify/all?${params.toString()}`;
    const { data } = await axios.get(url, { timeout: 20000 });

    const candidatos = (data?.results || []).map((r: any) => ({
      nome_cientifico: r?.species?.scientificName || r?.species?.scientificNameWithoutAuthor || null,
      nome_comum: r?.species?.commonNames?.[0] || null,
      confianca: Math.round((r?.score || 0) * 100),
    }));

    // calcular confiança média só dos top 5
    const top = candidatos.slice(0, 5);
    const confianca_media = top.length
      ? Math.round(top.reduce((acc, c) => acc + (c.confianca || 0), 0) / top.length)
      : null;

    // NÃO salvamos direto; devolvemos para o front decidir/confirmar
    return res.json({
      especie_sugerida: candidatos[0]?.nome_cientifico || null,
      candidatos,
      confianca_media,
      fonte: "Pl@ntNet",
    });
  } catch (e: any) {
    const detail = e?.response?.data || e?.message || "Erro desconhecido";
    const status = e?.response?.status || 500;
    console.error("Erro na identificação Pl@ntNet:", { error: e, detail, status });
    return res.status(status).json({ error: "Falha na identificação (Pl@ntNet)", detail });
  }
});

export default router;