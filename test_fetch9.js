const query = `
query {
  Page(page: 1, perPage: 15) {
    pageInfo { total }
    media(type: ANIME, search: "One Piece", sort: [SEARCH_MATCH, POPULARITY_DESC]) { id title { romaji } }
  }
}`;

fetch('https://graphql.anilist.co', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  body: JSON.stringify({ query })
})
.then(r => r.json())
.then(d => console.log(JSON.stringify(d, null, 2)))
.catch(console.error);
