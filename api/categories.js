/**
 * /api/categories.js — Vercel Serverless Function
 * Returns WooCommerce product categories for dynamic nav/filter rendering.
 * Cached aggressively (15min) since categories change infrequently.
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'https://truelifepeptide.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800'); // 15min CDN cache

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const WC_URL = process.env.WC_URL;
    const WC_KEY = process.env.WC_CONSUMER_KEY;
    const WC_SECRET = process.env.WC_CONSUMER_SECRET;

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
        return res.status(503).json({ error: 'Commerce API not configured' });
    }

    try {
        const params = new URLSearchParams({
            per_page: '50',
            hide_empty: 'true', // only show categories with products
            orderby: 'menu_order',
            order: 'asc',
        });

        const wcUrl = `${WC_URL}/wp-json/wc/v3/products/categories?${params.toString()}`;

        const response = await fetch(wcUrl, {
            headers: {
                'Accept': 'application/json',
                'Authorization': 'Basic ' + btoa(WC_KEY + ':' + WC_SECRET),
            },
            signal: AbortSignal.timeout(6000),
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Commerce API error' });
        }

        const categories = await response.json();

        // Normalize — remove internal WooCommerce fields
        const normalized = categories
            .filter(c => c.slug !== 'uncategorized')
            .map(c => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                description: c.description,
                count: c.count,
                image: c.image ? { src: c.image.src, alt: c.image.alt || c.name } : null,
            }));

        return res.status(200).json(normalized);

    } catch (err) {
        console.error('[TLP API] categories.js error:', err);
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            return res.status(504).json({ error: 'Commerce API timeout' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}
