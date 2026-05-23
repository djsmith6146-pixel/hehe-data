// api/get-data.js
export default async function handler(request, response) {
  // 1. Grab the hidden API key securely from the environment variables
  const apiKey = process.env.MY_SECRET_API_KEY;

  // 2. Fetch data from the actual third-party API securely
  try {
    const apiResponse = await fetch('https://api.example.com/v1/data', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await apiResponse.json();

    // 3. Send the clean data back to your HTML frontend
    return response.status(200).json(data);
  } catch (error) {
    return response.status(500).json({ error: 'Failed to fetch data safely' });
  }
}
