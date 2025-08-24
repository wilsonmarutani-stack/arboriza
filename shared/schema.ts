import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// EA (Estação Avançada) table
export const eas = pgTable("eas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Municipalities table
export const municipios = pgTable("municipios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  uf: text("uf").notNull().default("SP"),
  eaId: varchar("ea_id").references(() => eas.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Substations table
export const subestacoes = pgTable("subestacoes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Feeders table
export const alimentadores = pgTable("alimentadores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  codigo: text("codigo").notNull().unique(), // ITU01, PGO10, etc.
  subestacaoId: varchar("subestacao_id").references(() => subestacoes.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Main inspections table
export const inspecoes = pgTable("inspecoes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  numeroNota: text("numero_nota").notNull(),
  numeroOperativo: text("numero_operativo"),
  dataInspecao: timestamp("data_inspecao").notNull(),
  eaId: varchar("ea_id").references(() => eas.id).notNull(),
  municipioId: varchar("municipio_id").references(() => municipios.id).notNull(),
  alimentadorId: varchar("alimentador_id").references(() => alimentadores.id).notNull(),
  subestacaoId: varchar("subestacao_id").references(() => subestacoes.id).notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  endereco: text("endereco"),
  prioridade: text("prioridade").notNull(), // baixa, media, alta
  observacoes: text("observacoes"),
  especieFinal: text("especie_final"),
  especieConfiancaMedia: real("especie_confianca_media"),
  fotoUrl: text("foto_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Species candidates from AI
export const especieCandidatos = pgTable("especie_candidatos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspecaoId: varchar("inspecao_id").references(() => inspecoes.id).notNull(),
  nome: text("nome").notNull(),
  confianca: real("confianca").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertEaSchema = createInsertSchema(eas).pick({
  nome: true,
});

export const insertMunicipioSchema = createInsertSchema(municipios).pick({
  nome: true,
  uf: true,
  eaId: true,
});

export const insertSubestacaoSchema = createInsertSchema(subestacoes).pick({
  nome: true,
});

export const insertAlimentadorSchema = createInsertSchema(alimentadores).pick({
  codigo: true,
  subestacaoId: true,
}).extend({
  codigo: z.string().regex(/^[A-Z]{3}\d{2}$/, "Código deve ter 3 letras maiúsculas + 2 números"),
});

export const insertInspecaoSchema = createInsertSchema(inspecoes).pick({
  numeroNota: true,
  numeroOperativo: true,
  dataInspecao: true,
  eaId: true,
  municipioId: true,
  alimentadorId: true,
  subestacaoId: true,
  latitude: true,
  longitude: true,
  endereco: true,
  prioridade: true,
  observacoes: true,
  especieFinal: true,
  especieConfiancaMedia: true,
  fotoUrl: true,
}).extend({
  prioridade: z.enum(["baixa", "media", "alta"]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const insertEspecieCandidatoSchema = createInsertSchema(especieCandidatos).pick({
  inspecaoId: true,
  nome: true,
  confianca: true,
});

// Types
export type Ea = typeof eas.$inferSelect;
export type InsertEa = z.infer<typeof insertEaSchema>;

export type Municipio = typeof municipios.$inferSelect;
export type InsertMunicipio = z.infer<typeof insertMunicipioSchema>;

export type Subestacao = typeof subestacoes.$inferSelect;
export type InsertSubestacao = z.infer<typeof insertSubestacaoSchema>;

export type Alimentador = typeof alimentadores.$inferSelect;
export type InsertAlimentador = z.infer<typeof insertAlimentadorSchema>;

export type Inspecao = typeof inspecoes.$inferSelect;
export type InsertInspecao = z.infer<typeof insertInspecaoSchema>;

export type EspecieCandidato = typeof especieCandidatos.$inferSelect;
export type InsertEspecieCandidato = z.infer<typeof insertEspecieCandidatoSchema>;

// Extended types for joins
export type InspecaoCompleta = Inspecao & {
  ea: Ea;
  municipio: Municipio;
  alimentador: Alimentador;
  subestacao: Subestacao;
  candidatos: EspecieCandidato[];
};
