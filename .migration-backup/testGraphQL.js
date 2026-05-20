// Using native fetch in Node 20+
const DETAILS_QUERY = `
fragment MediaFields on Media {
  id
  idMal
  title { romaji english native }
  coverImage { large }
  episodes
  format
  startDate { year month day }
}
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    ...MediaFields
    relations {
      edges {
        relationType
        node {
          ...MediaFields
          relations {
            edges {
              relationType
              node {
                ...MediaFields
                relations {
                  edges {
                    relationType
                    node {
                      ...MediaFields
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
`;

async function test(id) {
    const PROXY_URL = "http://localhost:5000/api/anilist/proxy";
    console.log(`Testing via Proxy: ${PROXY_URL}`);
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: DETAILS_QUERY, variables: { id } }),
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
}

test(52991);
