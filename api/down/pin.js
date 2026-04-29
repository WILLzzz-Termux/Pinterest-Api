import axios from "axios";

async function pindlVideo(url) {
  const payload = {
    endpoint: "/v1/scraper/pinterest/video-downloader",
    url: url,
  };

  const config = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  };

  try {
    const { data } = await axios.post(
      "https://www.famety.com/v2/fallout-api",
      payload,
      config
    );
    return data;
  } catch (error) {
    throw new Error(error.response?.data || error.message);
  }
}

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'url' diperlukan",
    });
  }

  try {
    const result = await pindlVideo(url);

    console.log("API RESULT:", result);

    return res.status(200).json({
      status: true,
      result: result?.data || result || null,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
}
