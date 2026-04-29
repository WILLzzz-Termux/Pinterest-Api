const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const axios = require("axios");

// ===== normalize pin.it =====
async function normalizeUrl(url) {
  try {
    if (url.includes("pin.it")) {
      const res = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        maxRedirects: 10
      });
      return res.request.res.responseUrl;
    }
    return url;
  } catch {
    return url;
  }
}

// ===== SCRAPE WITH BROWSER =====
async function scrapePinterest(url) {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // ===== EXTRACT DATA =====
    const result = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll("script"));

      let jsonData = null;

      for (const s of scripts) {
        if (s.innerText.includes("__PWS_DATA__") || s.innerText.includes("__INITIAL_STATE__")) {
          const match = s.innerText.match(/{.*}/s);
          if (match) {
            try {
              jsonData = JSON.parse(match[0]);
              break;
            } catch {}
          }
        }
      }

      if (!jsonData) return null;

      const pins =
        jsonData?.props?.initialReduxState?.pins ||
        jsonData?.pins ||
        jsonData?.props?.pins;

      if (!pins) return null;

      const key = Object.keys(pins)[0];
      const pin = pins[key];

      if (!pin) return null;

      // IMAGE
      const image = pin?.images?.orig?.url || null;

      // VIDEO BEST QUALITY
      let video = null;

      const videos = pin?.videos?.video_list;
      if (videos) {
        const sorted = Object.values(videos).sort((a, b) => {
          const aScore = (a.width || 0) * (a.height || 0) || a.bitrate || 0;
          const bScore = (b.width || 0) * (b.height || 0) || b.bitrate || 0;
          return bScore - aScore;
        });

        video = sorted[0]?.url || null;
      }

      return {
        image,
        video,
        title: pin?.title || null
      };
    });

    return result;

  } catch (err) {
    console.log("Puppeteer error:", err.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

// ===== API HANDLER =====
module.exports = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "URL diperlukan"
    });
  }

  try {
    const fixedUrl = await normalizeUrl(url);
    const result = await scrapePinterest(fixedUrl);

    if (!result) {
      return res.status(500).json({
        status: false,
        message: "Gagal mengambil data"
      });
    }

    return res.status(200).json({
      status: true,
      data: {
        image: result.image,
        video: result.video,
        title: result.title
      }
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};
