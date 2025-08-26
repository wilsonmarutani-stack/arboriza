import { 
  type Ea, type InsertEa,
  type Municipio, type InsertMunicipio,
  type Subestacao, type InsertSubestacao,
  type Alimentador, type InsertAlimentador,
  type Inspecao, type InsertInspecao, type InspecaoCompleta,
  type EspecieCandidato, type InsertEspecieCandidato,
  type Arvore, type InsertArvore, type ArvoreCompleta,
  type ArvoreFoto, type InsertArvoreFoto,
  eas, municipios, subestacoes, alimentadores, inspecoes, especieCandidatos, arvores, arvoreFotos
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface IStorage {
  // EAs
  getEas(): Promise<Ea[]>;
  createEa(ea: InsertEa): Promise<Ea>;

  // Municípios
  getMunicipios(eaId?: string): Promise<Municipio[]>;
  createMunicipio(municipio: InsertMunicipio): Promise<Municipio>;

  // Subestações
  getSubestacoes(): Promise<Subestacao[]>;
  createSubestacao(subestacao: InsertSubestacao): Promise<Subestacao>;

  // Alimentadores
  getAlimentadores(): Promise<Alimentador[]>;
  createAlimentador(alimentador: InsertAlimentador): Promise<Alimentador>;

  // Inspeções
  getInspecoes(filters?: {
    eaId?: string;
    municipioId?: string;
    alimentadorId?: string;
    prioridade?: string;
    dataInicio?: Date;
    dataFim?: Date;
    numeroNota?: string;
    limit?: number;
    offset?: number;
  }): Promise<InspecaoCompleta[]>;
  getInspecao(id: string): Promise<InspecaoCompleta | undefined>;
  createInspecao(inspecao: InsertInspecao): Promise<Inspecao>;
  updateInspecao(id: string, inspecao: Partial<InsertInspecao>): Promise<Inspecao>;
  deleteInspecao(id: string): Promise<void>;

  // Candidatos de espécie
  getEspecieCandidatos(inspecaoId: string): Promise<EspecieCandidato[]>;
  createEspecieCandidatos(candidatos: InsertEspecieCandidato[]): Promise<EspecieCandidato[]>;
  deleteEspecieCandidatos(inspecaoId: string): Promise<void>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalInspections: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    byMunicipality: { municipio: string; count: number }[];
  }>;

  // Árvores
  getAllArvores(): Promise<any[]>;
  getArvoresByInspecao(inspecaoId: string): Promise<ArvoreCompleta[]>;
  createArvore(arvore: InsertArvore): Promise<Arvore>;
  updateArvore(id: string, arvore: Partial<InsertArvore>): Promise<Arvore>;
  deleteArvore(id: string): Promise<void>;

  // Fotos de árvores
  getFotosByArvore(arvoreId: string): Promise<ArvoreFoto[]>;
  createArvoreFotos(fotos: InsertArvoreFoto[]): Promise<ArvoreFoto[]>;
  deleteArvoreFoto(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // EAs
  async getEas(): Promise<Ea[]> {
    return await db.select().from(eas);
  }

  async createEa(ea: InsertEa): Promise<Ea> {
    const [newEa] = await db.insert(eas).values(ea).returning();
    return newEa;
  }

  // Municípios
  async getMunicipios(eaId?: string): Promise<Municipio[]> {
    if (eaId) {
      return await db.select().from(municipios).where(eq(municipios.eaId, eaId));
    }
    return await db.select().from(municipios);
  }

  async createMunicipio(municipio: InsertMunicipio): Promise<Municipio> {
    const [newMunicipio] = await db.insert(municipios).values(municipio).returning();
    return newMunicipio;
  }

  // Subestações
  async getSubestacoes(): Promise<Subestacao[]> {
    return await db.select().from(subestacoes);
  }

  async createSubestacao(subestacao: InsertSubestacao): Promise<Subestacao> {
    const [newSubestacao] = await db.insert(subestacoes).values(subestacao).returning();
    return newSubestacao;
  }

  // Alimentadores
  async getAlimentadores(): Promise<Alimentador[]> {
    return await db.select().from(alimentadores);
  }

  async createAlimentador(alimentador: InsertAlimentador): Promise<Alimentador> {
    const [newAlimentador] = await db.insert(alimentadores).values(alimentador).returning();
    return newAlimentador;
  }

  // Inspeções
  async getInspecoes(filters?: {
    eaId?: string;
    municipioId?: string;
    alimentadorId?: string;
    prioridade?: string;
    dataInicio?: Date;
    dataFim?: Date;
    numeroNota?: string;
    limit?: number;
    offset?: number;
  }): Promise<InspecaoCompleta[]> {
    const conditions = [];
    if (filters?.eaId) conditions.push(eq(inspecoes.eaId, filters.eaId));
    if (filters?.municipioId) conditions.push(eq(inspecoes.municipioId, filters.municipioId));
    if (filters?.alimentadorId) conditions.push(eq(inspecoes.alimentadorId, filters.alimentadorId));
    if (filters?.prioridade) conditions.push(eq(inspecoes.prioridade, filters.prioridade));
    if (filters?.dataInicio) conditions.push(gte(inspecoes.dataInspecao, filters.dataInicio));
    if (filters?.dataFim) conditions.push(lte(inspecoes.dataInspecao, filters.dataFim));
    if (filters?.numeroNota) conditions.push(sql`${inspecoes.numeroNota} ILIKE ${'%' + filters.numeroNota + '%'}`);

    let queryBuilder = db
      .select({
        inspecao: inspecoes,
        ea: eas,
        municipio: municipios,
        alimentador: alimentadores,
        subestacao: subestacoes,
        totalArvores: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${arvores} 
          WHERE ${arvores.inspecaoId} = ${inspecoes.id}
        )`.as('total_arvores'),
      })
      .from(inspecoes)
      .leftJoin(eas, eq(inspecoes.eaId, eas.id))
      .leftJoin(municipios, eq(inspecoes.municipioId, municipios.id))
      .leftJoin(alimentadores, eq(inspecoes.alimentadorId, alimentadores.id))
      .leftJoin(subestacoes, eq(inspecoes.subestacaoId, subestacoes.id));

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    queryBuilder = queryBuilder.orderBy(desc(inspecoes.createdAt));

    if (filters?.offset) {
      queryBuilder = queryBuilder.offset(filters.offset);
    }
    if (filters?.limit) {
      queryBuilder = queryBuilder.limit(filters.limit);
    }

    const results = await queryBuilder;

    // Get candidates for each inspection
    const inspecoesWithCandidatos = await Promise.all(
      results.map(async (row) => {
        const candidatos = await this.getEspecieCandidatos(row.inspecao.id);
        return {
          ...row.inspecao,
          ea: row.ea!,
          municipio: row.municipio!,
          alimentador: row.alimentador!,
          subestacao: row.subestacao!,
          candidatos,
          totalArvores: row.totalArvores,
        };
      })
    );

    return inspecoesWithCandidatos;
  }

  async getInspecao(id: string): Promise<InspecaoCompleta | undefined> {
    const result = await db
      .select({
        inspecao: inspecoes,
        ea: eas,
        municipio: municipios,
        alimentador: alimentadores,
        subestacao: subestacoes,
      })
      .from(inspecoes)
      .leftJoin(eas, eq(inspecoes.eaId, eas.id))
      .leftJoin(municipios, eq(inspecoes.municipioId, municipios.id))
      .leftJoin(alimentadores, eq(inspecoes.alimentadorId, alimentadores.id))
      .leftJoin(subestacoes, eq(inspecoes.subestacaoId, subestacoes.id))
      .where(eq(inspecoes.id, id))
      .limit(1);

    if (result.length === 0) return undefined;

    const row = result[0];
    const candidatos = await this.getEspecieCandidatos(id);

    return {
      ...row.inspecao,
      ea: row.ea!,
      municipio: row.municipio!,
      alimentador: row.alimentador!,
      subestacao: row.subestacao!,
      candidatos,
    };
  }

  async createInspecao(inspecao: InsertInspecao): Promise<Inspecao> {
    const [newInspecao] = await db.insert(inspecoes).values(inspecao).returning();
    return newInspecao;
  }

  async updateInspecao(id: string, inspecao: Partial<InsertInspecao>): Promise<Inspecao> {
    const [updated] = await db
      .update(inspecoes)
      .set({ ...inspecao, updatedAt: new Date() })
      .where(eq(inspecoes.id, id))
      .returning();

    if (!updated) throw new Error("Inspeção não encontrada");
    return updated;
  }

  async deleteInspecao(id: string): Promise<void> {
    // Delete related candidates first
    await this.deleteEspecieCandidatos(id);
    // Delete the inspection
    await db.delete(inspecoes).where(eq(inspecoes.id, id));
  }

  // Candidatos de espécie
  async getEspecieCandidatos(inspecaoId: string): Promise<EspecieCandidato[]> {
    return await db
      .select()
      .from(especieCandidatos)
      .where(eq(especieCandidatos.inspecaoId, inspecaoId));
  }

  async createEspecieCandidatos(candidatos: InsertEspecieCandidato[]): Promise<EspecieCandidato[]> {
    if (candidatos.length === 0) return [];
    return await db.insert(especieCandidatos).values(candidatos).returning();
  }

  async deleteEspecieCandidatos(inspecaoId: string): Promise<void> {
    await db.delete(especieCandidatos).where(eq(especieCandidatos.inspecaoId, inspecaoId));
  }

  // Dashboard stats
  async getDashboardStats(filters?: { eaId?: string; municipioId?: string }): Promise<{
    totalInspections: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    byMunicipality: { municipio: string; count: number }[];
  }> {
    // Build where conditions based on filters
    const whereConditions = [];
    if (filters?.eaId) {
      whereConditions.push(eq(inspecoes.eaId, filters.eaId));
    }
    if (filters?.municipioId) {
      whereConditions.push(eq(inspecoes.municipioId, filters.municipioId));
    }

    const totalInspections = await db
      .select({ count: sql<number>`count(*)` })
      .from(inspecoes)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const priorityCounts = await db
      .select({ 
        prioridade: inspecoes.prioridade, 
        count: sql<number>`count(*)` 
      })
      .from(inspecoes)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(inspecoes.prioridade);

    const municipalityCounts = await db
      .select({
        municipio: municipios.nome,
        count: sql<number>`count(*)`
      })
      .from(inspecoes)
      .leftJoin(municipios, eq(inspecoes.municipioId, municipios.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(municipios.nome)
      .orderBy(desc(sql`count(*)`));

    const priorityMap = priorityCounts.reduce((acc, { prioridade, count }) => {
      acc[prioridade] = count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalInspections: totalInspections[0]?.count || 0,
      highPriority: priorityMap.alta || 0,
      mediumPriority: priorityMap.media || 0,
      lowPriority: priorityMap.baixa || 0,
      byMunicipality: municipalityCounts.map(({ municipio, count }) => ({
        municipio: municipio || "Desconhecido",
        count
      }))
    };
  }

  // Árvores
  async getAllArvores(): Promise<any[]> {
    const trees = await db.select().from(arvores);
    
    const treesWithInspectionInfo = await Promise.all(
      trees.map(async (tree) => {
        // Get inspection details
        const [inspecao] = await db
          .select()
          .from(inspecoes)
          .leftJoin(eas, eq(inspecoes.eaId, eas.id))
          .leftJoin(municipios, eq(inspecoes.municipioId, municipios.id))
          .leftJoin(alimentadores, eq(inspecoes.alimentadorId, alimentadores.id))
          .where(eq(inspecoes.id, tree.inspecaoId));
        
        // Get photos
        const fotos = await this.getFotosByArvore(tree.id);
        
        return {
          ...tree,
          inspecao: inspecao?.inspecoes,
          ea: inspecao?.eas,
          municipio: inspecao?.municipios,
          alimentador: inspecao?.alimentadores,
          fotos
        };
      })
    );

    return treesWithInspectionInfo;
  }

  async getArvoresByInspecao(inspecaoId: string): Promise<ArvoreCompleta[]> {
    const trees = await db.select().from(arvores).where(eq(arvores.inspecaoId, inspecaoId));
    
    const treesWithPhotos = await Promise.all(
      trees.map(async (tree) => {
        const fotos = await this.getFotosByArvore(tree.id);
        return {
          ...tree,
          fotos
        };
      })
    );

    return treesWithPhotos;
  }

  async createArvore(arvore: InsertArvore): Promise<Arvore> {
    const [newArvore] = await db.insert(arvores).values(arvore).returning();
    return newArvore;
  }

  async updateArvore(id: string, arvore: Partial<InsertArvore>): Promise<Arvore> {
    const [updated] = await db
      .update(arvores)
      .set(arvore)
      .where(eq(arvores.id, id))
      .returning();

    if (!updated) throw new Error("Árvore não encontrada");
    return updated;
  }

  async deleteArvore(id: string): Promise<void> {
    // Delete photos first
    await db.delete(arvoreFotos).where(eq(arvoreFotos.arvoreId, id));
    // Delete the tree
    await db.delete(arvores).where(eq(arvores.id, id));
  }

  // Fotos de árvores
  async getFotosByArvore(arvoreId: string): Promise<ArvoreFoto[]> {
    return await db
      .select()
      .from(arvoreFotos)
      .where(eq(arvoreFotos.arvoreId, arvoreId));
  }

  async createArvoreFotos(fotos: InsertArvoreFoto[]): Promise<ArvoreFoto[]> {
    if (fotos.length === 0) return [];
    return await db.insert(arvoreFotos).values(fotos).returning();
  }

  async deleteArvoreFoto(id: string): Promise<void> {
    await db.delete(arvoreFotos).where(eq(arvoreFotos.id, id));
  }
}

export const storage = new DatabaseStorage();
