import { Injectable } from '@nestjs/common';
import {
  METRO_INCIDENTS_SOURCE,
  METRO_LINE_IDS,
  MetroIncident,
  MetroIncidentStatus,
  MetroLineId,
} from './metro-incidents.types';

interface ParsedLine {
  lineId: MetroLineId;
  status: MetroIncidentStatus;
  title: string;
  description?: string;
}

const LINE_TERMINAL_MAP: Record<string, string> = {
  'san pablo': 'L1',
  'los dominicos': 'L1',
  'hospital el pino': 'L2',
  'vespucio norte': 'L2',
  'castillo velasco': 'L3',
  'los libertadores': 'L3',
  quilicura: 'L3',
  'puente alto': 'L4',
  tobalaba: 'L4',
  'la cisterna': 'L4A',
  'vicu\u00f1a mackenna': 'L4A',
  'ma\u00edp\u00fa': 'L5',
  'plaza de maip': 'L5',
  'vicente vald\u00e9s': 'L5',
  cerrillos: 'L6',
  'los leones': 'L6',
};

const STATUS_PATTERNS: Array<{
  status: MetroIncidentStatus;
  pattern: RegExp;
}> = [
  { status: 'interrupted', pattern: /interrump|suspend|cerrad|sin servicio/i },
  {
    status: 'partial',
    pattern: /parcial|solo disponible|tramo|combinaci[oó]n/i,
  },
  { status: 'delay', pattern: /retras|demora|frecuencia|mayor tiempo/i },
  { status: 'normal', pattern: /servicio normal|normal|disponible/i },
];

@Injectable()
export class MetroIncidentsParser {
  parse(html: string, now = new Date()): MetroIncident[] {
    const scrapedAt = now.toISOString();
    const text = this.htmlToText(html);

    return METRO_LINE_IDS.map((lineId) => {
      const parsed = this.parseLine(text, lineId);
      return {
        id: this.buildId(lineId, parsed.status, now),
        lineId,
        status: parsed.status,
        title: parsed.title,
        description: parsed.description,
        source: METRO_INCIDENTS_SOURCE,
        scrapedAt,
        updatedAt: scrapedAt,
      };
    });
  }

  private parseLine(text: string, lineId: MetroLineId): ParsedLine {
    const lineText = this.extractLineContext(text, lineId);
    if (!lineText) {
      return {
        lineId,
        status: 'unknown',
        title: 'No fue posible verificar el estado',
        description: 'Consulte metro.cl para información actualizada.',
      };
    }

    const status = this.classify(lineText);
    const title = this.pickTitle(lineText, status);
    const description =
      status === 'normal' ? undefined : this.pickDescription(lineText, title);

    return { lineId, status, title, description };
  }

  private extractLineContext(text: string, lineId: MetroLineId): string | null {
    // Tenta por terminal da linha
    const terminalEntry = Object.entries(LINE_TERMINAL_MAP).find(
      ([, lid]) => lid === lineId,
    );
    if (terminalEntry) {
      const [terminal] = terminalEntry;
      const idx = text.toLowerCase().indexOf(terminal.toLowerCase());
      if (idx >= 0) {
        const start = Math.max(0, idx - 50);
        return text
          .slice(start, idx + 200)
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    const labels =
      lineId === 'L4A'
        ? ['L4A', 'Línea 4A', 'Linea 4A']
        : [lineId, `Línea ${lineId.slice(1)}`, `Linea ${lineId.slice(1)}`];
    const starts = labels
      .map((label) =>
        text.search(new RegExp(`\\b${this.escapeRegExp(label)}\\b`, 'i')),
      )
      .filter((index) => index >= 0);

    if (starts.length === 0) return null;

    const start = Math.min(...starts);
    const rest = text.slice(start);
    const nextLineMatch = rest
      .slice(4)
      .match(/\b(?:Línea|Linea|L)(?:\s?)(?:1|2|3|4A|4|5|6)\b/i);
    const end = nextLineMatch?.index ? 4 + nextLineMatch.index : 600;

    return rest.slice(0, end).replace(/\s+/g, ' ').trim();
  }

  private classify(text: string): MetroIncidentStatus {
    return (
      STATUS_PATTERNS.find(({ pattern }) => pattern.test(text))?.status ??
      'unknown'
    );
  }

  private pickTitle(text: string, status: MetroIncidentStatus): string {
    const statusTitle = STATUS_PATTERNS.find(({ pattern }) =>
      pattern.test(text),
    );
    if (statusTitle?.status === 'normal') return 'Servicio normal';
    if (status === 'unknown') return 'No fue posible verificar el estado';

    const sentences = text
      .split(/(?<=[.!?])\s+|\s{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
    return (
      sentences.find((sentence) => sentence.length > 12)?.slice(0, 120) ??
      this.defaultTitle(status)
    );
  }

  private pickDescription(text: string, title: string): string | undefined {
    const cleaned = text.replace(title, '').replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length < 8) return undefined;
    return cleaned.slice(0, 260);
  }

  private defaultTitle(status: MetroIncidentStatus): string {
    switch (status) {
      case 'delay':
        return 'Retraso en frecuencia habitual';
      case 'partial':
        return 'Servicio parcial';
      case 'interrupted':
        return 'Servicio interrumpido';
      case 'normal':
        return 'Servicio normal';
      default:
        return 'No fue posible verificar el estado';
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&aacute;/g, 'á')
      .replace(/&eacute;/g, 'é')
      .replace(/&iacute;/g, 'í')
      .replace(/&oacute;/g, 'ó')
      .replace(/&uacute;/g, 'ú')
      .replace(/&ntilde;/g, 'ñ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildId(
    lineId: MetroLineId,
    status: MetroIncidentStatus,
    now: Date,
  ): string {
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    return `${lineId}-${status}-${date}`;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
