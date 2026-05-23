// api/extract.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });

  try {
    const { prompt, maxTokens, useWebSearch, fetchUrl } = req.body;

    let finalPrompt = prompt;

    // Only fetch page content when fetchUrl is explicitly passed (Discovery tab only)
    if (fetchUrl) {
      try {
        const pageRes = await fetch(fetchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          signal: AbortSignal.timeout(8000)
        });

        if (pageRes.ok) {
          let html = await pageRes.text();
          html = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<nav[\s\S]*?<\/nav>/gi, '')
            .replace(/<footer[\s\S]*?<\/footer>/gi, '')
            .replace(/<header[\s\S]*?<\/header>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim()
            .slice(0, 12000);

          finalPrompt = `${prompt}\n\nHere is the actual page content:\n---\n${html}\n---\nUse this to extract all gear mentions accurately.`;
        }
      } catch (fetchErr) {
        console.log('Page fetch failed, falling back to AI:', fetchErr.message);
      }
    }

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens || 1200,
      messages: [{ role: 'user', content: finalPrompt }]
    };

    // Web search only used when no page was fetched
    if (useWebSearch && !fetchUrl) {
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

    const textOutput = data.content
      .map(b => b.type === 'text' ? b.text : '')
      .filter(Boolean)
      .join('');

    return res.status(200).json({ text: textOutput });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
