export const config = { api: { bodyParser: true } };
// v5 — proxy per Open Food Facts + Claude

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body;

    // Se è una ricerca Open Food Facts
    if (body.type === 'openfoodfacts') {
      const { query } = body;
      const fields = body.fields || 'product_name,brands,nutriments,quantity';
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=8&fields=${fields}&search_simple=1&action=process`;
      const offRes = await fetch(url, {
        headers: { 'User-Agent': 'FitnessApp/1.0 (https://fitness-app-ecru-five.vercel.app)' }
      });
      const offData = await offRes.json();
      return res.status(200).json(offData);
    }

    // Altrimenti è una chiamata Claude normale
    const claudeBody = { ...body, max_tokens: 8000 };
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(claudeBody)
    });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
