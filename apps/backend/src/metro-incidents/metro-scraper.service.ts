import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import { METRO_INCIDENTS_SOURCE_URL } from './metro-incidents.types';

@Injectable()
export class MetroScraperService {
  private readonly logger = new Logger(MetroScraperService.name);

  async fetchStatusHtml(): Promise<string> {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        locale: 'es-CL',
      });

      await page.goto(METRO_INCIDENTS_SOURCE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 25_000,
      });
      await page
        .waitForLoadState('networkidle', { timeout: 15_000 })
        .catch(() => {
          this.logger.warn('METRO_SCRAPER_NETWORK_IDLE_TIMEOUT');
        });
      await page
        .waitForFunction(
          () => /Línea|Linea|L1|L2|L3|L4|L5|L6/i.test(document.body.innerText),
          null,
          { timeout: 15_000 },
        )
        .catch(() => {
          this.logger.warn('METRO_SCRAPER_STATUS_TEXT_TIMEOUT');
        });

      const html = await page.content();
      this.logger.log(`METRO_SCRAPER_HTML_SAMPLE: ${html.slice(0, 500)}`);
      return html;
    } finally {
      await browser.close();
    }
  }
}
