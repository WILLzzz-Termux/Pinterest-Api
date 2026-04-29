const axios = require("axios")

module.exports = async (req, res) => {
    if (req.method !== "GET") {
        return res.status(405).json({
            status: false,
            message: "Method tidak diizinkan"
        })
    }

    const { url } = req.query

    if (!url) {
        return res.status(400).json({
            status: false,
            message: "Parameter url wajib"
        })
    }

    try {
        // =========================
        // 1. VALIDASI URL
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
                message: "URL Pinterest tidak valid"
            })
        }

        const pinId = match[1]

        // =========================
        // 3. REQUEST KE PINTEREST
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
                    "user-agent": "Mozilla/5.0",
                    "x-requested-with": "XMLHttpRequest",
                    "referer": "https://www.pinterest.com/"
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
        // 4. PARSE MEDIA
        // =========================
        let media = []

        // VIDEO
        if (pin.videos?.video_list) {
            const first = Object.values(pin.videos.video_list)[0]
            if (first?.url) {
                media.push({
                    type: "video",
                    url: first.url,
                    thumbnail: first.thumbnail
                })
            }
        }

        // IMAGE
        if (pin.images?.orig?.url) {
            media.push({
                type: "image",
                url: pin.images.orig.url
            })
        }

        // =========================
        // 5. RESPONSE
        // =========================
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
            message: "Internal server error",
            error: err.message
        })
    }
}
