// api/extract.js
export default async function handler(req, res) {
  // 1. Allow frontend cross-origin requests (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle browser pre-flight checks smoothly
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Fetch the hidden API key safely from Vercel's environment variables
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Backend API key configuration is missing on Vercel.' });
  }

  try {
    const { prompt, maxTokens } = req.body;

    // 3. Make the secure request to Claude using standard API schemas
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022', 
        max_tokens: maxTokens || 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    // 4. Extract text response blocks and return them to your HTML page
    const textOutput = data.content.map(b => b.type === 'text' ? b.text : '').join('');
    return res.status(200).json({ text: textOutput });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error processing the AI extraction.' });
  }
}
