import { 
  type Ea, type InsertEa,
  type Municipio, type InsertMunicipio,
  type Subestacao, type InsertSubestacao,
  type Alimentador, type InsertAlimentador,
  type Inspecao, type InsertInspecao, type InspecaoCompleta,
  type EspecieCandidato, type InsertEspecieCandidato
} from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private eas: Map<string, Ea> = new Map();
  private municipios: Map<string, Municipio> = new Map();
  private subestacoes: Map<string, Subestacao> = new Map();
  private alimentadores: Map<string, Alimentador> = new Map();
  private inspecoes: Map<string, Inspecao> = new Map();
  private especieCandidatos: Map<string, EspecieCandidato> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed EAs
    const eaSalto: Ea = { id: "ea1", nome: "EA Salto", createdAt: new Date() };
    const eaIndaiatuba: Ea = { id: "ea2", nome: "EA Indaiatuba", createdAt: new Date() };
    const eaItu: Ea = { id: "ea3", nome: "EA Itu", createdAt: new Date() };
    
    this.eas.set(eaSalto.id, eaSalto);
    this.eas.set(eaIndaiatuba.id, eaIndaiatuba);
    this.eas.set(eaItu.id, eaItu);

    // Seed Municípios
    const municipios = [
      { id: "mun1", nome: "Salto", uf: "SP", eaId: "ea1", createdAt: new Date() },
      { id: "mun2", nome: "Indaiatuba", uf: "SP", eaId: "ea2", createdAt: new Date() },
      { id: "mun3", nome: "Itu", uf: "SP", eaId: "ea3", createdAt: new Date() },
      { id: "mun4", nome: "Elias Fausto", uf: "SP", eaId: "ea1", createdAt: new Date() },
      { id: "mun5", nome: "Monte Mor", uf: "SP", eaId: "ea2", createdAt: new Date() },
      { id: "mun6", nome: "Mairinque", uf: "SP", eaId: "ea3", createdAt: new Date() },
    ];
    municipios.forEach(m => this.municipios.set(m.id, m));

    // Seed Subestações
    const subestacoes = [
      { id: "sub1", nome: "Salto1 – Porto Góes", createdAt: new Date() },
      { id: "sub2", nome: "Indaiatuba1 – Centro", createdAt: new Date() },
      { id: "sub3", nome: "Itu1 – Vila Padre Bento", createdAt: new Date() },
      { id: "sub4", nome: "Salto2 – Jardim", createdAt: new Date() },
      { id: "sub5", nome: "Indaiatuba2 – Morada do Sol", createdAt: new Date() },
      { id: "sub6", nome: "Itu2 – Centro", createdAt: new Date() },
    ];
    subestacoes.forEach(s => this.subestacoes.set(s.id, s));

    // Seed Alimentadores
    const alimentadores = [
      { id: "ali1", codigo: "ITU01", subestacaoId: "sub1", createdAt: new Date() },
      { id: "ali2", codigo: "IND02", subestacaoId: "sub2", createdAt: new Date() },
      { id: "ali3", codigo: "ITU03", subestacaoId: "sub3", createdAt: new Date() },
      { id: "ali4", codigo: "SAL04", subestacaoId: "sub4", createdAt: new Date() },
      { id: "ali5", codigo: "IND05", subestacaoId: "sub5", createdAt: new Date() },
      { id: "ali6", codigo: "ITU06", subestacaoId: "sub6", createdAt: new Date() },
    ];
    alimentadores.forEach(a => this.alimentadores.set(a.id, a));
  }

  async getEas(): Promise<Ea[]> {
    return Array.from(this.eas.values());
  }

  async createEa(ea: InsertEa): Promise<Ea> {
    const id = randomUUID();
    const newEa: Ea = { ...ea, id, createdAt: new Date() };
    this.eas.set(id, newEa);
    return newEa;
  }

  async getMunicipios(eaId?: string): Promise<Municipio[]> {
    const municipios = Array.from(this.municipios.values());
    return eaId ? municipios.filter(m => m.eaId === eaId) : municipios;
  }

  async createMunicipio(municipio: InsertMunicipio): Promise<Municipio> {
    const id = randomUUID();
    const newMunicipio: Municipio = { ...municipio, id, createdAt: new Date(), uf: municipio.uf || "SP" };
    this.municipios.set(id, newMunicipio);
    return newMunicipio;
  }

  async getSubestacoes(): Promise<Subestacao[]> {
    return Array.from(this.subestacoes.values());
  }

  async createSubestacao(subestacao: InsertSubestacao): Promise<Subestacao> {
    const id = randomUUID();
    const newSubestacao: Subestacao = { ...subestacao, id, createdAt: new Date() };
    this.subestacoes.set(id, newSubestacao);
    return newSubestacao;
  }

  async getAlimentadores(): Promise<Alimentador[]> {
    return Array.from(this.alimentadores.values());
  }

  async createAlimentador(alimentador: InsertAlimentador): Promise<Alimentador> {
    const id = randomUUID();
    const newAlimentador: Alimentador = { ...alimentador, id, createdAt: new Date() };
    this.alimentadores.set(id, newAlimentador);
    return newAlimentador;
  }

  async getInspecoes(filters?: {
    eaId?: string;
    municipioId?: string;
    alimentadorId?: string;
    prioridade?: string;
    dataInicio?: Date;
    dataFim?: Date;
    limit?: number;
    offset?: number;
  }): Promise<InspecaoCompleta[]> {
    let inspecoes = Array.from(this.inspecoes.values());

    if (filters) {
      if (filters.eaId) {
        inspecoes = inspecoes.filter(i => i.eaId === filters.eaId);
      }
      if (filters.municipioId) {
        inspecoes = inspecoes.filter(i => i.municipioId === filters.municipioId);
      }
      if (filters.alimentadorId) {
        inspecoes = inspecoes.filter(i => i.alimentadorId === filters.alimentadorId);
      }
      if (filters.prioridade) {
        inspecoes = inspecoes.filter(i => i.prioridade === filters.prioridade);
      }
      if (filters.dataInicio) {
        inspecoes = inspecoes.filter(i => i.dataInspecao >= filters.dataInicio!);
      }
      if (filters.dataFim) {
        inspecoes = inspecoes.filter(i => i.dataInspecao <= filters.dataFim!);
      }
    }

    // Sort by creation date desc
    inspecoes.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());

    if (filters?.offset) {
      inspecoes = inspecoes.slice(filters.offset);
    }
    if (filters?.limit) {
      inspecoes = inspecoes.slice(0, filters.limit);
    }

    // Join with related data
    return inspecoes.map(inspecao => ({
      ...inspecao,
      ea: this.eas.get(inspecao.eaId)!,
      municipio: this.municipios.get(inspecao.municipioId)!,
      alimentador: this.alimentadores.get(inspecao.alimentadorId)!,
      subestacao: this.subestacoes.get(inspecao.subestacaoId)!,
      candidatos: Array.from(this.especieCandidatos.values()).filter(c => c.inspecaoId === inspecao.id)
    }));
  }

  async getInspecao(id: string): Promise<InspecaoCompleta | undefined> {
    const inspecao = this.inspecoes.get(id);
    if (!inspecao) return undefined;

    return {
      ...inspecao,
      ea: this.eas.get(inspecao.eaId)!,
      municipio: this.municipios.get(inspecao.municipioId)!,
      alimentador: this.alimentadores.get(inspecao.alimentadorId)!,
      subestacao: this.subestacoes.get(inspecao.subestacaoId)!,
      candidatos: Array.from(this.especieCandidatos.values()).filter(c => c.inspecaoId === inspecao.id)
    };
  }

  async createInspecao(inspecao: InsertInspecao): Promise<Inspecao> {
    const id = randomUUID();
    const newInspecao: Inspecao = { 
      ...inspecao, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date(),
      endereco: inspecao.endereco || null,
      observacoes: inspecao.observacoes || null,
      especieFinal: inspecao.especieFinal || null,
      especieConfiancaMedia: inspecao.especieConfiancaMedia || null,
      fotoUrl: inspecao.fotoUrl || null
    };
    this.inspecoes.set(id, newInspecao);
    return newInspecao;
  }

  async updateInspecao(id: string, inspecao: Partial<InsertInspecao>): Promise<Inspecao> {
    const existing = this.inspecoes.get(id);
    if (!existing) throw new Error("Inspeção não encontrada");

    const updated: Inspecao = { 
      ...existing, 
      ...inspecao, 
      updatedAt: new Date() 
    };
    this.inspecoes.set(id, updated);
    return updated;
  }

  async deleteInspecao(id: string): Promise<void> {
    this.inspecoes.delete(id);
    // Also delete related candidates
    const candidatos = Array.from(this.especieCandidatos.entries())
      .filter(([_, c]) => c.inspecaoId === id);
    candidatos.forEach(([candidatoId]) => this.especieCandidatos.delete(candidatoId));
  }

  async getEspecieCandidatos(inspecaoId: string): Promise<EspecieCandidato[]> {
    return Array.from(this.especieCandidatos.values())
      .filter(c => c.inspecaoId === inspecaoId);
  }

  async createEspecieCandidatos(candidatos: InsertEspecieCandidato[]): Promise<EspecieCandidato[]> {
    const newCandidatos = candidatos.map(candidato => {
      const id = randomUUID();
      const newCandidato: EspecieCandidato = { 
        ...candidato, 
        id, 
        createdAt: new Date() 
      };
      this.especieCandidatos.set(id, newCandidato);
      return newCandidato;
    });
    return newCandidatos;
  }

  async deleteEspecieCandidatos(inspecaoId: string): Promise<void> {
    const candidatos = Array.from(this.especieCandidatos.entries())
      .filter(([_, c]) => c.inspecaoId === inspecaoId);
    candidatos.forEach(([candidatoId]) => this.especieCandidatos.delete(candidatoId));
  }

  async getDashboardStats(): Promise<{
    totalInspections: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    byMunicipality: { municipio: string; count: number }[];
  }> {
    const inspecoes = Array.from(this.inspecoes.values());
    
    const stats = {
      totalInspections: inspecoes.length,
      highPriority: inspecoes.filter(i => i.prioridade === "alta").length,
      mediumPriority: inspecoes.filter(i => i.prioridade === "media").length,
      lowPriority: inspecoes.filter(i => i.prioridade === "baixa").length,
      byMunicipality: [] as { municipio: string; count: number }[]
    };

    // Count by municipality
    const municipioCounts = new Map<string, number>();
    inspecoes.forEach(inspecao => {
      const municipio = this.municipios.get(inspecao.municipioId);
      if (municipio) {
        const current = municipioCounts.get(municipio.nome) || 0;
        municipioCounts.set(municipio.nome, current + 1);
      }
    });

    stats.byMunicipality = Array.from(municipioCounts.entries())
      .map(([municipio, count]) => ({ municipio, count }))
      .sort((a, b) => b.count - a.count);

    return stats;
  }
}

export const storage = new MemStorage();
