// api/extract.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on Vercel.' });

  try {
    const { prompt, maxTokens, useWebSearch } = req.body;

    const body = {
      model: 'claude-sonnet-4-20250514',   // latest model
      max_tokens: maxTokens || 1200,
      messages: [{ role: 'user', content: prompt }]
    };

    // Enable web search when the frontend requests it
    if (useWebSearch) {
      body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    // Collect all text blocks (web search may return multiple)
    const textOutput = data.content
      .map(b => b.type === 'text' ? b.text : '')
      .filter(Boolean)
      .join('');

    return res.status(200).json({ text: textOutput });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
