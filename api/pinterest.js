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
        // 1. AMBIL HTML PAGE
        // =========================
        const { data: html } = await axios.get(url, {
            headers: {
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
            },
            timeout: 10000
        })

        // =========================
        // 2. AMBIL JSON DARI SCRIPT
        // =========================
        const match = html.match(/<script id="__PWS_DATA__" type="application\/json">(.*?)<\/script>/)

        if (!match) {
            return res.status(500).json({
                status: false,
                message: "Gagal parse data Pinterest"
            })
        }

        const json = JSON.parse(match[1])

        // =========================
        // 3. AMBIL DATA PIN
        // =========================
        const pins = json?.props?.initialReduxState?.pins

        if (!pins) {
            return res.status(404).json({
                status: false,
                message: "Pin tidak ditemukan"
            })
        }

        const pin = Object.values(pins)[0]

        let media = []

        // VIDEO
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

        // IMAGE
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
            message: "Masih kena proteksi Pinterest",
            error: err.message
        })
    }
                    }
