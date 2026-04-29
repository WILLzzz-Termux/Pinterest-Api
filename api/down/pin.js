import axios from "axios";
import FormData from "form-data";

async function pindlVideo(url) {
  const payload = {
    endpoint: "/v1/scraper/pinterest/video-downloader",
    url: url,
  };

  const config = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36",
    },
  };

  const { data } = await axios.post(
    "https://www.famety.com/v2/fallout-api",
    payload,
    config
  );

  return data;
}

// 🔥 upload ke catbox
async function uploadToCatbox(buffer) {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", buffer, {
    filename: "video.mp4",
    contentType: "video/mp4",
  });

  const { data } = await axios.post("https://catbox.moe/user/api.php", form, {
    headers: form.getHeaders(),
  });

  return data; // link catbox
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ status: false });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({
      status: false,
      message: "url diperlukan",
    });
  }

  try {
    // 1. ambil data pinterest
    const result = await pindlVideo(url);

    const videoUrl =
      result?.data?.video ||
      result?.data?.url ||
      result?.data?.download;

    if (!videoUrl) {
      return res.status(404).json({
        status: false,
        message: "Video tidak ditemukan",
        raw: result,
      });
    }

    // 2. download video jadi buffer
    const videoRes = await axios.get(videoUrl, {
      responseType: "arraybuffer",
    });

    const buffer = Buffer.from(videoRes.data);

    // 3. upload ke catbox
    const catboxUrl = await uploadToCatbox(buffer);

    return res.status(200).json({
      status: true,
      result: {
        original: videoUrl,
        catbox: catboxUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
}
