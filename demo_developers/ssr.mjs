const puppeteer = require('puppeteer');

const RENDER_CACHE = new Map()

async function ssr(url) {
  if (RENDER_CACHE.has(url)) {
    return {html: RENDER_CACHE.get(url), ttRenderMs: 0}
  }

  const start = Date.now()


  const browser = await puppeteer.launch()
  const page = await browser.newPage()


  try {
    await page.goto(url, {waitUntil: 'networkidle0'})
    await page.waitForSelector('#posts')
  } catch (err) {
    console.error(err);
    throw new Error('page.goto/waitForSelector timed out.');
  }

  const html = await page.content(); // serialized HTML of page DOM.
  await browser.close();

  const ttRenderMs = Date.now() - start;
  console.info(`Headless rendered page in: ${ttRenderMs}ms`);

  RENDER_CACHE.set(url, html); // cache rendered page.

  return {html, ttRenderMs};
}

export { ssr as default }
