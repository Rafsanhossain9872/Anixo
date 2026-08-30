const fs = require('fs');

async function test() {
  const file = fs.readFileSync('src/services/api.js', 'utf-8');
  const queryMatch = file.match(/export const DETAIL_QUERY = `([\s\S]*?)`;/);
  if (!queryMatch) { console.log('Query not found'); process.exit(1); }
  const query = queryMatch[1];

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: query, variables: { id: 185874 } })
    });
    const data = await res.json();
    if (data.errors) {
      console.log('API Error:', JSON.stringify(data.errors, null, 2));
      process.exit(1);
    }
    console.log('Success! Media Title:', data.data.Media.title.romaji);
    console.log('Number of Relations:', data.data.Media.relations.edges.length);
  } catch (err) {
    console.log('Fetch Error:', err.message);
  }
}

test();
