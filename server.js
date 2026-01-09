const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();

app.use(express.text({ type: 'text/html', limit: '10mb' }));

function resolveChromiumPath() {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;

  // Log what we have (this is the "temporary log" you wanted)
  console.log('PUPPETEER_EXECUTABLE_PATH:', envPath);
  console.log('exists?', envPath ? fs.existsSync(envPath) : false);

  // Prefer env path if it exists
  if (envPath && fs.existsSync(envPath)) return envPath;

  // Common Linux paths
  const candidates = ['/usr/bin/chromium', '/usr/bin/chromium-browser'];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  // Last resort: let puppeteer decide (may be empty if skip download is true)
  try {
    const p = puppeteer.executablePath();
    console.log('puppeteer.executablePath():', p);
    console.log('exists?', p ? fs.existsSync(p) : false);
    if (p && fs.existsSync(p)) return p;
  } catch (e) {
    console.log('puppeteer.executablePath() failed:', e.message);
  }

  return null;
}

app.post('/generate-pdf', async (req, res) => {
  let browser;
  try {
    const html = req.body;

    const executablePath = resolveChromiumPath();
    if (!executablePath) {
      throw new Error('Chromium executable not found in container.');
    }

    browser = await puppeteer.launch({
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ],
      headless: 'new'
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    });

    await browser.close();

    res.contentType('application/pdf');
    res.send(pdf);
  } catch (error) {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    console.error('PDF generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
