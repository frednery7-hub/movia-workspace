const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType, PageBreak
} = require('docx');
const fs = require('fs');

// ─── Color Palette ───────────────────────────────────────────────────────────
const C = {
  primary:    "1A1A2E",
  accent:     "16213E",
  highlight:  "0F3460",
  danger:     "C0392B",
  warning:    "D35400",
  ok:         "1A6B3A",
  light:      "EAF0FB",
  lightGray:  "F5F5F5",
  border:     "CCCCCC",
  white:      "FFFFFF",
  text:       "1A1A2E",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const border = (color = C.border) => ({ style: BorderStyle.SINGLE, size: 1, color });
const borders = (color) => ({ top: border(color), bottom: border(color), left: border(color), right: border(color) });
const noBorders = () => ({ top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } });

const space = () => new Paragraph("");

function h1(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 }
  });
}

function body(text) {
  return new Paragraph({
    children: [new TextRun({ text: text, color: C.text, font: "Arial" })],
    spacing: { after: 120, line: 300 }
  });
}

function sectionBadge(number, title) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: C.primary, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `${number} | `, color: C.danger, bold: true, font: "Arial", size: 28 }),
                  new TextRun({ text: title, color: C.white, bold: true, font: "Arial", size: 28 })
                ],
                alignment: AlignmentType.LEFT
              })
            ]
          })
        ]
      })
    ]
  });
}

function callout(label, text, bgColor = C.light, labelColor = C.highlight) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { ...noBorders(), left: { style: BorderStyle.THICK, size: 12, color: labelColor } },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: bgColor, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 150, bottom: 150, left: 150, right: 150 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `${label}: `, bold: true, color: labelColor, font: "Arial" }),
                  new TextRun({ text: text, color: C.text, font: "Arial" })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function twoColTable(rowsData, headerBg = C.highlight) {
  const rows = rowsData.map((rowData, index) => {
    const isHeader = index === 0;
    return new TableRow({
      children: rowData.map(cellText => new TableCell({
        shading: isHeader ? { fill: headerBg, type: ShadingType.CLEAR, color: "auto" } : undefined,
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        borders: borders(C.border),
        children: [
          new Paragraph({
            children: [
              new TextRun({ 
                text: cellText, 
                color: isHeader ? C.white : C.text, 
                bold: isHeader, 
                font: "Arial" 
              })
            ],
            alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT
          })
        ]
      }))
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows
  });
}

// ─── DOCUMENT ────────────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Equipe de Engenharia Movia",
  title: "Movia Production Security Report",
  description: "Relatório de Arquitetura de Segurança, Privacidade e Proteção de Dados",
  sections: [{
    properties: {},
    children: [
      
      // Cover
      new Paragraph({
        children: [new TextRun({ text: "MOV", color: C.text, bold: true, size: 72 }), new TextRun({ text: "IA", color: C.danger, bold: true, size: 72 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1000, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: "PRODUCTION SECURITY & PRIVACY REPORT", color: C.highlight, bold: true, size: 32 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1000 }
      }),
      
      new Paragraph({ children: [new PageBreak()] }),

      sectionBadge("00", "EXECUTIVE SUMMARY"),
      space(),
      body("Este documento define as implementações de segurança necessárias para elevar o Movia de um projeto de portfólio para um sistema pronto para produção, com foco em privacidade diferencial, zero-trust e conformidade regulatória."),
      space(),
      callout("VISÃO", "O Movia adota Privacy-by-Design como princípio arquitetural central, diferenciando-se da maioria dos apps de mobilidade que coletam excessivamente dados de localização.", C.light, C.highlight),
      space(),
      
      new Paragraph({ children: [new PageBreak()] }),

      sectionBadge("01", "DADOS PROIBIDOS NO SERVIDOR"),
      space(),
      body("Os seguintes dados NÃO poderão ser armazenados sob nenhuma hipótese: Trilha contínua de GPS, histórico completo de movimentação, rotina casa/trabalho e mapas de deslocamento individual."),
      space(),

      sectionBadge("02", "DIFFERENTIAL PRIVACY & ZERO-KNOWLEDGE"),
      space(),
      body("Aplica-se o Mecanismo de Laplace e k-anonymity (≥ 50 usuários) para agregar dados de lotação e atraso, impossibilitando a re-identificação de padrões de usuários individuais. O cálculo de ETA e validação inercial ocorre de forma local no dispositivo."),
      space(),

      sectionBadge("12", "DIFERENCIAIS COMPETITIVOS DE SEGURANÇA"),
      space(),
      twoColTable([
        ["Feature", "Status"],
        ["Processamento Local-First", "100% implementado"],
        ["Differential Privacy (ε=0.5)", "Implementado"],
        ["Zero-Knowledge Route Calculation", "Parcial"],
        ["Transparency Dashboard", "Em planejamento"],
        ["On-Device ML (futuro)", "Roadmap Q4/2026"],
        ["Auditabilidade Pública", "GitHub Privacy Report trimestral"],
      ]),
      space(),

      sectionBadge("13", "PRODUCTION READINESS CHECKLIST"),
      space(),
      twoColTable([
        ["Requisito", "Validação"],
        ["ValidationPipe & Rate Limiting Global", "Aprovado (NestJS)"],
        ["JWT Hardening & RS256", "Aprovado"],
        ["Secure Store DeviceID", "Aprovado (React Native)"],
        ["Panic Button / Anti-stalking", "Aprovado"],
        ["TLS 1.3 / HSTS", "Dependência DevOps"],
      ], C.danger),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('./Movia_Production_Security_Report_v3.0.docx', buf);
  console.log('✅ Documento gerado com sucesso: Movia_Production_Security_Report_v3.0.docx');
});