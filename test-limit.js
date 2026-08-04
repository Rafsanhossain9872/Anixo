import axios from 'axios';

const ANIME_QUERY = `
  query ($page: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: 24) {
      pageInfo { total hasNextPage lastPage }
      media(type: ANIME, sort: $sort, isAdult: false) {
        id
      }
    }
  }
`;

async function testAniListLimit() {
  console.log("=== VERIFYING GRACEFUL DEGRADATION AT PAGE 210 (5000 LIMIT) ===\n");
  try {
    console.log("Attempting to fetch Page 210 from AniList GraphQL...");
    const res = await axios.post("https://graphql.anilist.co", {
      query: ANIME_QUERY,
      variables: { page: 210, sort: ["START_DATE_DESC"] }
    });
    console.log("Success! (This shouldn't happen, AniList should block it).");
  } catch (err) {
    console.log(`Received Error: ${err.response?.status} ${err.response?.statusText}`);
    console.log("Error Details:", JSON.stringify(err.response?.data?.errors));
    
    // Test our catch logic
    const isDepthError = err.response?.status === 400 && 
      err.response?.data?.errors?.some(e => e.message?.includes("Page depth exceeds maximum allowed"));
      
    if (isDepthError) {
      console.log("\n[SUCCESS] The error matches our catch block logic!");
      console.log("The UI will gracefully return: { media: [], pageInfo: { total: 0, hasNextPage: false } }");
      console.log("The Next button will disable smoothly without a crash.");
    } else {
      console.log("\n[FAIL] The error did not match our catch logic.");
    }
  }
}

testAniListLimit();
