/**
 * /api/products.js — Vercel Serverless Function
 * Proxies WooCommerce REST API for products.
 * Secrets stay server-side; never exposed to client.
 *
 * Query params:
 *   ?category=slug      Filter by WooCommerce category slug
 *   ?featured=true      Return only featured products
 *   ?per_page=N         Number of results (default 20, max 50)
 *   ?page=N             Pagination (default 1)
 *   ?search=query       Search by name
 */

export default async function handler(req, res) {
    // CORS — allow same origin + your frontend domain
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'https://truelifepeptides.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600'); // 5min CDN cache

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const WC_URL = process.env.WC_URL;
    const WC_KEY = process.env.WC_CONSUMER_KEY;
    const WC_SECRET = process.env.WC_CONSUMER_SECRET;

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
        console.error('[TLP API] WooCommerce environment variables not configured.');
        return res.status(503).json({
            error: 'Commerce API not configured',
            message: 'Please set WC_URL, WC_CONSUMER_KEY, and WC_CONSUMER_SECRET in environment variables.'
        });
    }

    try {
        const { category, featured, per_page = '20', page = '1', search } = req.query;

        // Build WooCommerce API URL
        const params = new URLSearchParams({
            per_page: Math.min(parseInt(per_page, 10) || 20, 50).toString(),
            page: page,
            status: 'publish',
        });

        if (category) params.set('category', category);
        if (featured === 'true') params.set('featured', 'true');
        if (search) params.set('search', search);

        const wcUrl = `${WC_URL}/wp-json/wc/v3/products?${params.toString()}`;

        const response = await fetch(wcUrl, {
            headers: {
                'Accept': 'application/json',
                'Authorization': 'Basic ' + btoa(WC_KEY + ':' + WC_SECRET),
            },
            signal: AbortSignal.timeout(8000), // 8s timeout
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[TLP API] WooCommerce error:', response.status, errorText);
            return res.status(response.status).json({
                error: 'Commerce API error',
                status: response.status
            });
        }

        const products = await response.json();

        // Include total/pages headers for pagination
        const totalProducts = response.headers.get('X-WP-Total');
        const totalPages = response.headers.get('X-WP-TotalPages');
        if (totalProducts) res.setHeader('X-Total', totalProducts);
        if (totalPages) res.setHeader('X-Total-Pages', totalPages);

        // Normalize product data — only expose what the frontend needs
        const normalized = products.map(normalizeProduct);

        return res.status(200).json(normalized);

    } catch (err) {
        console.error('[TLP API] products.js error:', err);
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            return res.status(504).json({ error: 'Commerce API timeout' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Normalize a WooCommerce product to a clean frontend shape.
 * Never leaks internal WooCommerce fields.
 */
function normalizeProduct(p) {
    return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        permalink: p.permalink,
        status: p.status,
        featured: p.featured,
        description: p.description,
        short_description: p.short_description,
        price: p.price,
        regular_price: p.regular_price,
        sale_price: p.sale_price,
        on_sale: p.on_sale,
        purchasable: p.purchasable,
        stock_status: p.stock_status, // 'instock' | 'outofstock' | 'onbackorder'
        manage_stock: p.manage_stock,
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
        meta_data: [], // intentionally stripped for security
    };
}
