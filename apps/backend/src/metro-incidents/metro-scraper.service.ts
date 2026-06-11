import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MetroScraperService {
  private readonly logger = new Logger(MetroScraperService.name);

  async fetchStatusHtml(): Promise<string> {
    try {
      const response = await fetch('https://datosdechile.cl/metro', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-CL,es;q=0.9',
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const html = await response.text();
      this.logger.log(
        `METRO_SCRAPER_OK: ${html.length} bytes from datosdechile.cl`,
      );
      return html;
    } catch (err) {
      this.logger.error(`METRO_SCRAPER_ERROR: ${err}`);
      return '';
    }
  }
}
