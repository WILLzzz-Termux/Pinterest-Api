const pinterest = require('../pinterest')

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { url } = req.query

    if (!url) {
        return res.status(400).json({
            status: false,
            message: 'Masukkan parameter url'
        })
    }

    try {
        const result = await pinterest.download(url)

        res.status(200).json({
            status: true,
            data: result
        })
    } catch (err) {
        res.status(500).json({
            status: false,
            message: err.message
        })
    }
}
