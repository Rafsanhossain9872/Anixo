import axios from 'axios';
axios.post('https://graphql.anilist.co', { 
  query: '{ Page(page: 1, perPage: 1) { media(search: "One Piece", type: ANIME) { id title { romaji english native } bannerImage coverImage { extraLarge } trailer { id site } } } }' 
}).then(r => console.log(JSON.stringify(r.data.data.Page.media, null, 2)))
