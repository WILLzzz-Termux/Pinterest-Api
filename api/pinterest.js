const axios = require("axios")

module.exports = async (req, res) => {
    const { url } = req.query

    if (!url) {
        return res.status(400).json({
            status: false,
            message: "Parameter url wajib"
        })
    }

    try {
        // =========================
        // 1. FOLLOW REDIRECT
        // =========================
        let finalUrl = url

        try {
            const r = await axios.get(url, {
                maxRedirects: 5,
                timeout: 8000,
                headers: {
                    "user-agent": "Mozilla/5.0"
                }
            })
            finalUrl = r.request?.res?.responseUrl || url
        } catch {}

        // =========================
        // 2. AMBIL PIN ID
        // =========================
        const match = finalUrl.match(/\/pin\/(\d+)/)
        if (!match) {
            return res.status(400).json({
                status: false,
                message: "URL tidak valid"
            })
        }

        const pinId = match[1]

        // =========================
        // 3. AMBIL COOKIE DULU
        // =========================
        const home = await axios.get("https://www.pinterest.com/", {
            headers: {
                "user-agent": "Mozilla/5.0"
            }
        })

        const cookies = home.headers["set-cookie"]
            ?.map(c => c.split(";")[0])
            .join("; ")

        // =========================
        // 4. REQUEST PINTEREST
        // =========================
        const { data } = await axios.get(
            "https://www.pinterest.com/resource/PinResource/get/",
            {
                params: {
                    source_url: `/pin/${pinId}/`,
                    data: JSON.stringify({
                        options: {
                            id: pinId,
                            field_set_key: "detailed"
                        },
                        context: {}
                    }),
                    _: Date.now()
                },
                headers: {
                    "accept": "application/json, text/javascript, */*, q=0.01",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "no-cache",
                    "pragma": "no-cache",
                    "user-agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
                    "x-requested-with": "XMLHttpRequest",
                    "referer": "https://www.pinterest.com/",
                    "cookie": cookies
                },
                timeout: 10000
            }
        )

        const pin = data?.resource_response?.data

        if (!pin) {
            return res.status(404).json({
                status: false,
                message: "Pin tidak ditemukan"
            })
        }

        // =========================
        // 5. PARSE MEDIA
        // =========================
        let media = []

        if (pin.videos?.video_list) {
            const v = Object.values(pin.videos.video_list)[0]
            if (v?.url) {
                media.push({
                    type: "video",
                    url: v.url,
                    thumbnail: v.thumbnail
                })
            }
        }

        if (pin.images?.orig?.url) {
            media.push({
                type: "image",
                url: pin.images.orig.url
            })
        }

        return res.status(200).json({
            status: true,
            data: {
                id: pin.id,
                title: pin.title || "",
                description: pin.description || "",
                media
            }
        })

    } catch (err) {
        console.error("ERROR:", err.message)

        return res.status(500).json({
            status: false,
            message: "Gagal ambil data dari Pinterest",
            error: err.message
        })
    }
}
