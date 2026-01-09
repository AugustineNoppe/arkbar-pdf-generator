const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();

app.use(express.text({ type: 'text/html', limit: '10mb' }));

function resolveChromePath() {
  // 1) Prefer Railway env var if it’s valid
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  // 2) Try common Linux chromium locations
  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  // 3) Fall back to Puppeteer’s bundled chromium (only works if Puppeteer downloaded it)
  try {
    const bundled = puppeteer.executablePath();
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch (e) {
    // ignore
  }

  return null;
}

app.post('/generate-pdf', async (req, res) => {
  let browser;
  try {
    const html = req.body;

    const chromePath = resolveChromePath();

    // DEBUG (your requested one-time step)
    console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
    console.log('exists?', process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH));
    console.log('Resolved chromePath:', chromePath);
    console.log('Resolved exists?', chromePath && fs.existsSync(chromePath));

    if (!chromePath) {
      return res.status(500).json({
        error: 'No Chromium/Chrome executable found. Install chromium in Dockerfile or fix PUPPETEER_EXECUTABLE_PATH.'
      });
    }

    browser = await puppeteer.launch({
      executablePath: chromePath,
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

    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  } catch (error) {
    console.error('PDF generation error:', error);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
