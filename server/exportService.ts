import { InspecaoCompleta } from "@shared/schema";
import fs from "fs";
import path from "path";

export class ExportService {
  
  // Export to CSV
  async exportToCSV(inspecoes: InspecaoCompleta[]): Promise<string> {
    const headers = [
      "Data da Inspeção",
      "EA",
      "Município",
      "Alimentador",
      "Subestação", 
      "Endereço",
      "Latitude",
      "Longitude",
      "Espécie Final",
      "Confiança IA (%)",
      "Prioridade",
      "Número da Nota",
      "Número Operativo",
      "Observações"
    ];

    const rows = inspecoes.map(inspecao => [
      inspecao.dataInspecao.toLocaleDateString("pt-BR"),
      inspecao.ea.nome,
      inspecao.municipio.nome,
      inspecao.alimentador.codigo,
      inspecao.subestacao.nome,
      inspecao.endereco || "",
      inspecao.latitude.toString(),
      inspecao.longitude.toString(),
      inspecao.especieFinal || "",
      inspecao.especieConfiancaMedia ? `${inspecao.especieConfiancaMedia.toFixed(1)}%` : "",
      inspecao.prioridade,
      inspecao.numeroNota,
      inspecao.numeroOperativo,
      inspecao.observacoes || ""
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return csvContent;
  }

  // Export to KML for Google Earth - now exports individual trees instead of inspections
  async exportToKML(inspecoes: InspecaoCompleta[]): Promise<string> {
    // Import storage to fetch tree data
    const { storage } = await import("./storage");
    
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Árvores - Arborização Urbana</name>
    <description>Localização individual das árvores inspecionadas</description>
    
    <!-- Tree Icon Style -->
    <Style id="tree-icon">
      <IconStyle>
        <Icon>
          <href>https://maps.google.com/mapfiles/kml/shapes/parks.png</href>
        </Icon>
        <scale>1.2</scale>
      </IconStyle>
      <LabelStyle>
        <scale>0.8</scale>
      </LabelStyle>
    </Style>
    
    <!-- Priority Styles -->
    <Style id="alta-prioridade">
      <IconStyle>
        <Icon>
          <href>https://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <Style id="media-prioridade">
      <IconStyle>
        <Icon>
          <href>https://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <Style id="baixa-prioridade">
      <IconStyle>
        <Icon>
          <href>https://maps.google.com/mapfiles/kml/pushpin/grn-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>
`;

    // Get all trees for each inspection and create placemarks
    const allPlacemarks = [];
    
    for (const inspecao of inspecoes) {
      const trees = await storage.getArvoresByInspecao(inspecao.id);
      
      for (const tree of trees) {
        const styleId = `${inspecao.prioridade}-prioridade`;
        const description = `
          <![CDATA[
            <b>Espécie:</b> ${tree.especieFinal || "Não identificada"}<br/>
            <b>EA:</b> ${inspecao.ea.nome}<br/>
            <b>Município:</b> ${inspecao.municipio.nome}<br/>
            <b>Alimentador:</b> ${inspecao.alimentador.codigo}<br/>
            <b>Subestação:</b> ${inspecao.subestacao.nome}<br/>
            <b>Endereço:</b> ${tree.endereco || "Não informado"}<br/>
            <b>Prioridade:</b> ${inspecao.prioridade}<br/>
            <b>Data:</b> ${inspecao.dataInspecao.toLocaleDateString("pt-BR")}<br/>
            <b>Número da Nota:</b> ${inspecao.numeroNota}<br/>
            ${tree.observacao ? `<b>Observações:</b> ${tree.observacao}<br/>` : ""}
            ${tree.especieConfiancaMedia ? `<b>Confiança IA:</b> ${tree.especieConfiancaMedia.toFixed(1)}%<br/>` : ""}
          ]]>
        `;

        const placemark = `
    <Placemark>
      <name>${tree.especieFinal || `Árvore - ${inspecao.numeroNota}`}</name>
      <description>${description}</description>
      <styleUrl>#${styleId}</styleUrl>
      <Point>
        <coordinates>${tree.longitude},${tree.latitude},0</coordinates>
      </Point>
    </Placemark>`;
        
        allPlacemarks.push(placemark);
      }
    }

    const kmlFooter = `
  </Document>
</kml>`;

    return kmlHeader + allPlacemarks.join("") + kmlFooter;
  }

  // Generate simple PDF report
  async generatePDFReport(inspecoes: InspecaoCompleta[], title: string = "Relatório de Inspeções"): Promise<Buffer> {
    // For a complete implementation, you would use a library like PDFKit or Puppeteer
    // This is a simplified text-based version that can be enhanced
    
    const reportContent = `
SISTEMA DE ARBORIZAÇÃO URBANA
${title}
Data de geração: ${new Date().toLocaleDateString("pt-BR")}

===============================================

RESUMO:
- Total de inspeções: ${inspecoes.length}
- Alta prioridade: ${inspecoes.filter(i => i.prioridade === "alta").length}
- Média prioridade: ${inspecoes.filter(i => i.prioridade === "media").length}
- Baixa prioridade: ${inspecoes.filter(i => i.prioridade === "baixa").length}

===============================================

DETALHES DAS INSPEÇÕES:

${inspecoes.map((inspecao, index) => `
${index + 1}. INSPEÇÃO ${inspecao.numeroNota}
   Data: ${inspecao.dataInspecao.toLocaleDateString("pt-BR")}
   EA: ${inspecao.ea.nome}
   Município: ${inspecao.municipio.nome}
   Alimentador: ${inspecao.alimentador.codigo}
   Subestação: ${inspecao.subestacao.nome}
   Localização: ${inspecao.latitude}, ${inspecao.longitude}
   Endereço: ${inspecao.endereco || "Não informado"}
   Espécie: ${inspecao.especieFinal || "Não identificada"}
   ${inspecao.especieConfiancaMedia ? `Confiança IA: ${inspecao.especieConfiancaMedia.toFixed(1)}%` : ""}
   Prioridade: ${inspecao.prioridade.toUpperCase()}
   ${inspecao.observacoes ? `Observações: ${inspecao.observacoes}` : ""}
   
`).join("")}

===============================================
Relatório gerado pelo Sistema de Arborização Urbana
`;

    // Convert text to buffer (in a real implementation, use proper PDF generation)
    return Buffer.from(reportContent, "utf-8");
  }
}

export const exportService = new ExportService();
