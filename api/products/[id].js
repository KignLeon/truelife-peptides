/**
 * /api/products/[id].js — Vercel Serverless Function
 * Returns a single WooCommerce product by ID.
 * Supports future product detail pages.
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (!id || isNaN(parseInt(id, 10))) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }

    const WC_URL = process.env.WC_URL;
    const WC_KEY = process.env.WC_CONSUMER_KEY;
    const WC_SECRET = process.env.WC_CONSUMER_SECRET;

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
        return res.status(503).json({ error: 'Commerce API not configured' });
    }

    try {
        const params = new URLSearchParams({
            consumer_key: WC_KEY,
            consumer_secret: WC_SECRET,
        });

        const wcUrl = `${WC_URL}/wp-json/wc/v3/products/${id}?${params.toString()}`;

        const response = await fetch(wcUrl, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(6000),
        });

        if (response.status === 404) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Commerce API error' });
        }

        const p = await response.json();

        // Normalize
        const product = {
            id: p.id,
            name: p.name,
            slug: p.slug,
            status: p.status,
            featured: p.featured,
            description: p.description,
            short_description: p.short_description,
            price: p.price,
            regular_price: p.regular_price,
            sale_price: p.sale_price,
            on_sale: p.on_sale,
            purchasable: p.purchasable,
            stock_status: p.stock_status,
            images: (p.images || []).map(img => ({
                id: img.id,
                src: img.src,
                alt: img.alt || p.name,
            })),
            categories: (p.categories || []).map(cat => ({
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
            })),
            attributes: (p.attributes || []).map(attr => ({
                name: attr.name,
                options: attr.options,
            })),
            variations: p.variations || [],
        };

        return res.status(200).json(product);

    } catch (err) {
        console.error('[TLP API] products/[id].js error:', err);
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            return res.status(504).json({ error: 'Commerce API timeout' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}
