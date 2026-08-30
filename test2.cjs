const fs = require('fs');

async function run() {
  const content = fs.readFileSync('src/services/api.js', 'utf-8');
  const startIndex = content.indexOf('const DETAIL_QUERY = `');
  const backtickStart = content.indexOf('`', startIndex);
  const backtickEnd = content.indexOf('`', backtickStart + 1);
  const query = content.substring(backtickStart + 1, backtickEnd);

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
}

run();
