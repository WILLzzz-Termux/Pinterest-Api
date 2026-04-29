const axios = require("axios");

// ===== NORMALIZE URL (pin.it -> pinterest.com) =====
async function normalizeUrl(url) {
  try {
    if (url.includes("pin.it")) {
      const res = await axios.get(url, {
        maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      return res.request.res.responseUrl;
    }
    return url;
  } catch {
    return url;
  }
}

// ===== SCRAPER =====
async function scrapePinterest(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    const json = data.match(/<script id="__PWS_DATA__".*?>(.*?)<\/script>/);
    if (!json) return null;

    const parsed = JSON.parse(json[1]);

    const pins =
      parsed?.props?.initialReduxState?.pins ||
      parsed?.props?.pageProps?.initialReduxState?.pins;

    if (!pins) return null;

    const key = Object.keys(pins)[0];
    const pin = pins[key];

    // ===== IMAGE =====
    const image = pin?.images?.orig?.url || null;

    // ===== VIDEO (BEST QUALITY) =====
    let video = null;

    if (pin?.videos?.video_list) {
      const videos = Object.values(pin.videos.video_list);

      const sorted = videos.sort((a, b) => {
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

  } catch (err) {
    console.log("Scrape error:", err.message);
    return null;
  }
}

// ===== HANDLER VERCEL =====
module.exports = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Parameter url diperlukan"
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

    // ===== FORMAT SAMA DENGAN BOT KAMU =====
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
