import axios from 'axios';

const query = `query { Page(page: 800, perPage: 24) { pageInfo { total hasNextPage lastPage } media(type: ANIME, sort: [TRENDING_DESC], status_in: [RELEASING]) { id } } }`;

axios.post('https://graphql.anilist.co', { query })
  .then(r => console.log(r.data.data.Page.pageInfo))
  .catch(e => console.log(e.response?.data || e.message));
