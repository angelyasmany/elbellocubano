const shareUrl = 'https://livecounts.nl/es/facebook-realtime/?u=elbellocubano';

export async function readRenderedCount() {
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import('@sparticuz/chromium'),
    import('puppeteer-core'),
  ]);
  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headless: 'shell',
    timeout: 6000,
    protocolTimeout: 10000,
  });

  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      const type = request.resourceType();
      const action = ['image', 'font', 'media'].includes(type) ? request.abort() : request.continue();
      action.catch(() => {}); // La página puede cerrarse mientras hay solicitudes en curso.
    });
    const response = await page.goto(shareUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
    if (!response?.ok() || new URL(page.url()).origin !== new URL(shareUrl).origin) {
      throw new Error('Livecounts no abrió la página del contador');
    }
    const reading = await page.waitForFunction(visibleFollowerCount, { polling: 250, timeout: 4500 });
    return await reading.jsonValue();
  } finally {
    await browser.close();
  }
}

export function visibleFollowerCount() {
  // Livecounts publica la cifra completa en #count-sr. #count contiene
  // los dígitos del odómetro y puede mostrar un valor intermedio.
  const account = document.querySelector('#fb-link');
  const label = document.querySelector('#count-sr')?.textContent.trim();
  if (!account || !label) return false;
  const link = new URL(account.href);
  if (!['facebook.com', 'www.facebook.com'].includes(link.hostname) ||
      link.pathname.replace(/\/$/, '').toLowerCase() !== '/elbellocubano') return false;
  const status = document.querySelector('#live-text')?.textContent.trim() || '';
  if (/estimad[oa]|redondead[oa]|aproximad[oa]|rounded|estimated|cargando|loading|reconectando|reconnecting/i.test(status)) return false;
  const match = /^([0-9]+|[0-9]{1,3}(?:[.,\s][0-9]{3})+)\s+(?:seguidores|followers)$/i.exec(label);
  if (!match) return false;
  const count = Number(match[1].replace(/[.,\s]/g, ''));
  return Number.isSafeInteger(count) && count > 0 ? count : false;
}
