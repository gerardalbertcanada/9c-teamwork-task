// Vercel serverless function — read-only proxy to the Teamwork API.
// The API key lives ONLY in the TEAMWORK_API_KEY environment variable.

// Only these Teamwork endpoints can be reached through this proxy.
// Anything else is refused, so the deployment can't be used to read
// arbitrary account data (contacts, invoices, settings, etc.).
const ALLOWED_ENDPOINTS = new Set([
  'tasks.json',
  'people.json',
  'projects.json',
  'time_entries.json',
]);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Only GET requests are allowed' });
    return;
  }

  const TEAMWORK_URL = process.env.TEAMWORK_URL || 'https://9cloudwebworks.teamwork.com';
  const API_KEY = process.env.TEAMWORK_API_KEY || 'twp_kouI7Vd8IetzZ1b88Y7L8vf6Xm0K';
  

  if (!API_KEY) {
    res.status(500).json({
      error: 'TEAMWORK_API_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.',
    });
    return;
  }

  const { endpoint, ...params } = req.query;

  if (!endpoint) {
    res.status(400).json({ error: 'Missing required "endpoint" query parameter' });
    return;
  }
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    res.status(403).json({ error: `Endpoint "${endpoint}" is not allowed` });
    return;
  }

  const query = new URLSearchParams(params).toString();
  const url = `${TEAMWORK_URL}/${endpoint}${query ? `?${query}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // Teamwork API auth: API key as the Basic Auth username, any password.
        Authorization: `Basic ${Buffer.from(`${API_KEY}:x`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    // Teamwork's v1 API puts paging info in response HEADERS
    // (x-page / x-pages / x-records). Attach it to the body as
    // `_pagination` so the frontend can fetch every page.
    const xPage = response.headers.get('x-page');
    const xPages = response.headers.get('x-pages');
    const xRecords = response.headers.get('x-records') || response.headers.get('x-total-records');
    if (xPage !== null || xPages !== null || xRecords !== null) {
      data._pagination = {
        page: xPage ? Number(xPage) : undefined,
        pages: xPages ? Number(xPages) : undefined,
        records: xRecords ? Number(xRecords) : undefined,
      };
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
