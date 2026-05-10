const query = `
query ($page: Int, $perPage: Int, $search: String) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total }
    media(type: ANIME, search: $search) { id title { romaji } }
  }
}`;

fetch('http://localhost:7860/api/anilist/proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query,
    variables: { search: 'naruto', page: 1, perPage: 15 }
  })
})
.then(r => r.json())
.then(d => console.log(JSON.stringify(d, null, 2)))
.catch(console.error);
