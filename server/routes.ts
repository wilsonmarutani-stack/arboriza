import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService } from "./objectStorage";
import { exportService } from "./exportService";
import { insertInspecaoSchema, insertEspecieCandidatoSchema, insertArvoreSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Setup multer for file uploads to local storage
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `tree-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(uploadsDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'Arquivo não encontrado' });
    }
  });

  // Object storage endpoint for serving private objects (for uploaded tree images)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if ((error as any).name === "ObjectNotFoundError") {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Object storage upload URL endpoint
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Erro ao obter URL de upload" });
    }
  });

  // Reference data endpoints
  app.get("/api/refs/eas", async (req, res) => {
    try {
      const eas = await storage.getEas();
      res.json(eas);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar EAs" });
    }
  });

  app.get("/api/refs/municipios", async (req, res) => {
    try {
      const eaId = req.query.ea_id as string;
      const municipios = await storage.getMunicipios(eaId);
      res.json(municipios);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar municípios" });
    }
  });

  app.get("/api/refs/alimentadores", async (req, res) => {
    try {
      const alimentadores = await storage.getAlimentadores();
      res.json(alimentadores);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar alimentadores" });
    }
  });

  app.get("/api/refs/subestacoes", async (req, res) => {
    try {
      const subestacoes = await storage.getSubestacoes();
      res.json(subestacoes);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar subestações" });
    }
  });

  // Inspections CRUD
  app.get("/api/inspecoes", async (req, res) => {
    try {
      const filters = {
        eaId: req.query.ea_id as string,
        municipioId: req.query.municipio_id as string,
        alimentadorId: req.query.alimentador_id as string,
        prioridade: req.query.prioridade as string,
        dataInicio: req.query.data_inicio ? new Date(req.query.data_inicio as string) : undefined,
        dataFim: req.query.data_fim ? new Date(req.query.data_fim as string) : undefined,
        numeroNota: req.query.numeroNota as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const inspecoes = await storage.getInspecoes(filters);
      res.json(inspecoes);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar inspeções" });
    }
  });

  app.get("/api/inspecoes/:id", async (req, res) => {
    try {
      const inspecao = await storage.getInspecao(req.params.id);
      if (!inspecao) {
        return res.status(404).json({ error: "Inspeção não encontrada" });
      }
      res.json(inspecao);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar inspeção" });
    }
  });

  app.post("/api/inspecoes", upload.single('foto'), async (req, res) => {
    try {
      // Parse and validate inspection data with proper number handling
      const latitude = req.body.latitude ? parseFloat(req.body.latitude) : undefined;
      const longitude = req.body.longitude ? parseFloat(req.body.longitude) : undefined;
      
      // Validate coordinates are valid numbers
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: "Coordenadas inválidas: latitude e longitude devem ser números válidos" });
      }
      
      const inspecaoData = {
        ...req.body,
        dataInspecao: new Date(req.body.dataInspecao),
        latitude,
        longitude,
        especieConfiancaMedia: req.body.especieConfiancaMedia ? parseFloat(req.body.especieConfiancaMedia) : undefined,
        fotoUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
      };

      const validatedData = insertInspecaoSchema.parse(inspecaoData);
      const inspecao = await storage.createInspecao(validatedData);

      // Handle multiple trees if provided
      if (req.body.items) {
        try {
          const items = JSON.parse(req.body.items);
          for (const item of items) {
            // Validate tree coordinates
            const treeLat = typeof item.latitude === 'number' ? item.latitude : parseFloat(item.latitude);
            const treeLng = typeof item.longitude === 'number' ? item.longitude : parseFloat(item.longitude);
            
            if (isNaN(treeLat) || isNaN(treeLng)) {
              console.warn("Árvore com coordenadas inválidas ignorada:", item);
              continue;
            }
            
            const arvoreData = {
              inspecaoId: inspecao.id,
              latitude: treeLat,
              longitude: treeLng,
              endereco: item.endereco,
              observacao: item.observacao,
              especieFinal: item.especieFinal,
              especieConfiancaMedia: item.especieConfiancaMedia ? parseFloat(item.especieConfiancaMedia) : undefined,
            };
            
            const validatedArvore = insertArvoreSchema.parse(arvoreData);
            const arvore = await storage.createArvore(validatedArvore);
            
            // Create photos for this tree
            if (item.fotos && item.fotos.length > 0) {
              const fotosData = item.fotos.map((url: string) => ({
                arvoreId: arvore.id,
                url
              }));
              await storage.createArvoreFotos(fotosData);
            }
          }
        } catch (itemsError) {
          console.error("Erro ao processar árvores:", itemsError);
        }
      }

      res.status(201).json({ id: inspecao.id });
    } catch (error) {
      console.error("Erro ao criar inspeção:", error);
      res.status(400).json({ error: "Dados inválidos para criação da inspeção" });
    }
  });

  app.put("/api/inspecoes/:id", upload.single('foto'), async (req, res) => {
    try {
      const updateData = {
        ...req.body,
        dataInspecao: req.body.dataInspecao ? new Date(req.body.dataInspecao) : undefined,
        latitude: req.body.latitude ? parseFloat(req.body.latitude) : undefined,
        longitude: req.body.longitude ? parseFloat(req.body.longitude) : undefined,
        especieConfiancaMedia: req.body.especieConfiancaMedia ? parseFloat(req.body.especieConfiancaMedia) : undefined,
      };

      if (req.file) {
        updateData.fotoUrl = `/uploads/${req.file.filename}`;
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => 
        updateData[key] === undefined && delete updateData[key]
      );

      const inspecao = await storage.updateInspecao(req.params.id, updateData);
      res.json(inspecao);
    } catch (error) {
      console.error("Erro ao atualizar inspeção:", error);
      res.status(400).json({ error: "Erro ao atualizar inspeção" });
    }
  });

  app.delete("/api/inspecoes/:id", async (req, res) => {
    try {
      await storage.deleteInspecao(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir inspeção" });
    }
  });

  // AI species identification
  // PlantNet API route - replaced by dedicated ia routes
  app.post("/api/ia/identificar-especie", async (req, res) => {
    try {
      const { imageUrl, organs = ["leaf","flower","fruit","bark","habit"], lang = "pt" } = req.body || {};
      if (!imageUrl) return res.status(400).json({ error: "imageUrl é obrigatória" });
      if (!process.env.PLANTNET_API_KEY) return res.status(500).json({ error: "PLANTNET_API_KEY não configurada" });

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
      const axios = await import('axios');
      const { data } = await axios.default.get(url, { timeout: 20000 });

      const candidatos = (data?.results || []).map((r: any) => ({
        nome: r?.species?.scientificName || r?.species?.scientificNameWithoutAuthor || "Desconhecido",
        confianca: Math.round((r?.score || 0) * 100),
      }));

      // calcular confiança média só dos top 5
      const top = candidatos.slice(0, 5);
      const confianca_media = top.length
        ? Math.round(top.reduce((acc: number, c: any) => acc + (c.confianca || 0), 0) / top.length)
        : 0;

      // NÃO salvamos direto; devolvemos para o front decidir/confirmar
      return res.json({
        especie_sugerida: candidatos[0]?.nome || "Espécie não identificada",
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

  // Simple image upload for species identification
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      
      // Return the URL that can be accessed by PlantNet
      const serverUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      res.json({ url: serverUrl });
    } catch (error) {
      console.error("Erro no upload:", error);
      res.status(500).json({ error: "Erro ao fazer upload da imagem" });
    }
  });

  // Object storage based species identification (for cloud storage)

  // Save uploaded tree image with ACL policy
  app.put("/api/tree-images", async (req, res) => {
    try {
      const { imageUrl, inspecaoId } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: "URL da imagem é obrigatória" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(imageUrl);

      // Set ACL policy for public access (tree images can be viewed by anyone)
      await objectStorageService.trySetObjectEntityAclPolicy(imageUrl, {
        owner: "system", // System-owned as these are inspection photos
        visibility: "public", // Public visibility for tree inspection photos
      });

      res.json({ objectPath });
    } catch (error) {
      console.error("Erro ao salvar imagem da árvore:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Species candidates management
  app.post("/api/inspecoes/:id/candidatos", async (req, res) => {
    try {
      const candidatos = req.body.candidatos.map((c: any) => ({
        ...c,
        inspecaoId: req.params.id
      }));

      const validatedCandidatos = candidatos.map((c: any) => 
        insertEspecieCandidatoSchema.parse(c)
      );

      // Delete existing candidates first
      await storage.deleteEspecieCandidatos(req.params.id);
      
      // Create new candidates
      const newCandidatos = await storage.createEspecieCandidatos(validatedCandidatos);
      res.json(newCandidatos);
    } catch (error) {
      console.error("Erro ao salvar candidatos:", error);
      res.status(400).json({ error: "Erro ao salvar candidatos de espécie" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const filters = {
        eaId: req.query.ea_id as string,
        municipioId: req.query.municipio_id as string
      };
      const stats = await storage.getDashboardStats(filters);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // Árvores routes
  app.get("/api/arvores", async (req, res) => {
    try {
      const arvores = await storage.getAllArvores();
      res.json(arvores);
    } catch (error) {
      console.error("Erro ao buscar árvores:", error);
      res.status(500).json({ error: "Erro ao buscar árvores" });
    }
  });

  app.get("/api/inspecoes/:id/arvores", async (req, res) => {
    try {
      const arvores = await storage.getArvoresByInspecao(req.params.id);
      res.json(arvores);
    } catch (error) {
      console.error("Erro ao buscar árvores:", error);
      res.status(500).json({ error: "Erro ao buscar árvores" });
    }
  });

  app.post("/api/inspecoes/:id/arvores", async (req, res) => {
    try {
      const arvoreData = { ...req.body, inspecaoId: req.params.id };
      const validatedArvore = insertArvoreSchema.parse(arvoreData);
      const arvore = await storage.createArvore(validatedArvore);
      
      // Create photos if provided
      if (req.body.fotos && req.body.fotos.length > 0) {
        const fotosData = req.body.fotos.map((url: string) => ({
          arvoreId: arvore.id,
          url
        }));
        await storage.createArvoreFotos(fotosData);
      }
      
      res.json(arvore);
    } catch (error) {
      console.error("Erro ao criar árvore:", error);
      res.status(400).json({ error: "Erro ao criar árvore" });
    }
  });

  app.put("/api/inspecoes/:id/arvores/:arvoreId", async (req, res) => {
    try {
      // Parse and validate coordinates if provided
      const updateData = { ...req.body };
      
      if (updateData.latitude !== undefined) {
        const lat = parseFloat(updateData.latitude);
        if (isNaN(lat)) {
          return res.status(400).json({ error: "Latitude inválida" });
        }
        updateData.latitude = lat;
      }
      
      if (updateData.longitude !== undefined) {
        const lng = parseFloat(updateData.longitude);
        if (isNaN(lng)) {
          return res.status(400).json({ error: "Longitude inválida" });
        }
        updateData.longitude = lng;
      }
      
      if (updateData.especieConfiancaMedia !== undefined && updateData.especieConfiancaMedia !== null) {
        const conf = parseFloat(updateData.especieConfiancaMedia);
        updateData.especieConfiancaMedia = isNaN(conf) ? undefined : conf;
      }
      
      const validatedArvore = insertArvoreSchema.partial().parse(updateData);
      const arvore = await storage.updateArvore(req.params.arvoreId, validatedArvore);
      res.json(arvore);
    } catch (error) {
      console.error("Erro ao atualizar árvore:", error);
      res.status(400).json({ error: "Erro ao atualizar árvore" });
    }
  });

  app.delete("/api/inspecoes/:id/arvores/:arvoreId", async (req, res) => {
    try {
      await storage.deleteArvore(req.params.arvoreId);
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao deletar árvore:", error);
      res.status(500).json({ error: "Erro ao deletar árvore" });
    }
  });

  app.post("/api/arvores/:arvoreId/fotos", async (req, res) => {
    try {
      const { urls } = req.body;
      const fotosData = urls.map((url: string) => ({
        arvoreId: req.params.arvoreId,
        url
      }));
      const fotos = await storage.createArvoreFotos(fotosData);
      res.json(fotos);
    } catch (error) {
      console.error("Erro ao adicionar fotos:", error);
      res.status(400).json({ error: "Erro ao adicionar fotos" });
    }
  });

  app.delete("/api/arvores/:arvoreId/fotos/:fotoId", async (req, res) => {
    try {
      await storage.deleteArvoreFoto(req.params.fotoId);
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao deletar foto:", error);
      res.status(500).json({ error: "Erro ao deletar foto" });
    }
  });

  // Export endpoints
  app.get("/api/export/csv", async (req, res) => {
    try {
      const filters = {
        eaId: req.query.ea_id as string,
        municipioId: req.query.municipio_id as string,
        alimentadorId: req.query.alimentador_id as string,
        prioridade: req.query.prioridade as string,
        dataInicio: req.query.data_inicio ? new Date(req.query.data_inicio as string) : undefined,
        dataFim: req.query.data_fim ? new Date(req.query.data_fim as string) : undefined,
      };

      const inspecoes = await storage.getInspecoes(filters);
      const csvContent = await exportService.exportToCSV(inspecoes);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="inspecoes.csv"');
      res.send('\ufeff' + csvContent); // Add BOM for UTF-8
    } catch (error) {
      res.status(500).json({ error: "Erro ao exportar CSV" });
    }
  });

  app.get("/api/export/kml", async (req, res) => {
    try {
      const filters = {
        eaId: req.query.ea_id as string,
        municipioId: req.query.municipio_id as string,
        alimentadorId: req.query.alimentador_id as string,
        prioridade: req.query.prioridade as string,
        dataInicio: req.query.data_inicio ? new Date(req.query.data_inicio as string) : undefined,
        dataFim: req.query.data_fim ? new Date(req.query.data_fim as string) : undefined,
      };

      const inspecoes = await storage.getInspecoes(filters);
      const kmlContent = await exportService.exportToKML(inspecoes);

      res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
      res.setHeader('Content-Disposition', 'attachment; filename="inspecoes.kml"');
      res.send(kmlContent);
    } catch (error) {
      res.status(500).json({ error: "Erro ao exportar KML" });
    }
  });

  app.get("/api/export/pdf", async (req, res) => {
    try {
      const filters = {
        eaId: req.query.ea_id as string,
        municipioId: req.query.municipio_id as string,
        alimentadorId: req.query.alimentador_id as string,
        prioridade: req.query.prioridade as string,
        dataInicio: req.query.data_inicio ? new Date(req.query.data_inicio as string) : undefined,
        dataFim: req.query.data_fim ? new Date(req.query.data_fim as string) : undefined,
      };

      const inspecoes = await storage.getInspecoes(filters);
      const pdfBuffer = await exportService.generatePDFReport(inspecoes);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio-inspecoes.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar PDF" });
    }
  });

  // Reverse geocoding proxy (using Nominatim)
  app.get("/api/geocoding/reverse", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ error: "Latitude e longitude são obrigatórias" });
      }

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt-BR`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Sistema-Arborizacao-Urbana/1.0'
        }
      });

      if (!response.ok) {
        throw new Error('Erro na consulta de geocodificação');
      }

      const data = await response.json();
      
      let endereco = "Endereço não encontrado";
      if (data.display_name) {
        const parts = data.display_name.split(', ');
        const street = parts[0] || "";
        const neighborhood = parts[1] || "";
        const city = parts[2] || "";
        const state = parts[parts.length - 2] || "";
        
        endereco = `${street}${neighborhood ? `, ${neighborhood}` : ""} - ${city}/${state}`.trim();
      }

      res.json({ endereco });
    } catch (error) {
      console.error("Erro no geocoding reverso:", error);
      res.status(500).json({ error: "Erro ao obter endereço" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
