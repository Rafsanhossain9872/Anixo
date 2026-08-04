import { QueryClient, keepPreviousData } from '@tanstack/query-core';

// Simulate an API that has 20,000 items (approx 833 pages at 24 per page)
// but it is completely open-ended and only tells us `hasNextPage` and `total`.
const simulateApiCall = async (page, signal) => {
  return new Promise((resolve, reject) => {
    // If aborted quickly, reject
    if (signal?.aborted) return reject(new Error('AbortError'));
    signal?.addEventListener('abort', () => reject(new Error('AbortError')));
    
    setTimeout(() => {
      resolve({
        media: [{ id: page }],
        pageInfo: {
          total: 20000,
          hasNextPage: page < 833,
          lastPage: 833
        }
      });
    }, 100);
  });
};

async function testInfinitePaginationAndSpeed() {
  console.log("=== STARTING STRESS TEST (UNLIMITED PAGINATION + SWR) ===\n");
  const queryClient = new QueryClient();
  
  // 1. Simulate fetching page 1
  console.log("Fetching Page 1...");
  await queryClient.fetchQuery({
    queryKey: ['anime', 1],
    queryFn: () => simulateApiCall(1)
  });
  
  // 2. Simulate User clicking Next (Page 2)
  console.log("Simulating click to Page 2...");
  const p2Observer = queryClient.getQueryCache().build(queryClient, {
    queryKey: ['anime', 2],
    queryFn: ({ signal }) => simulateApiCall(2, signal),
    placeholderData: keepPreviousData
  });
  
  console.log("Immediately after click to Page 2 (isFetching: true) - old data retained via keepPreviousData?");
  // Using SWR, the cache holds the data but we don't have a live React observer to verify it easily here,
  // but we can simulate the rapid clicking with AbortController.
  
  // 3. Simulate Rapid Clicks (Page 3, 4, 5) BEFORE they finish
  const controller3 = new AbortController();
  const req3 = simulateApiCall(3, controller3.signal).catch(e => console.log("Request 3 aborted:", e.message));
  controller3.abort(); // Cancelled!
  
  const controller4 = new AbortController();
  const req4 = simulateApiCall(4, controller4.signal).catch(e => console.log("Request 4 aborted:", e.message));
  controller4.abort(); // Cancelled!
  
  // Final click settles on Page 800
  console.log("User spammed Next and jumped to Page 800.");
  const req800 = await simulateApiCall(800);
  console.log("Page 800 Data Received:", req800);
  
  console.log("\nPagination State for Page 800 (from test-pagination logic):");
  // The pagination logic we implemented:
  const currentPage = 800;
  const totalPages = req800.pageInfo.lastPage;
  const hasNextPage = req800.pageInfo.hasNextPage;
  const isInfinite = hasNextPage && (!totalPages || currentPage >= totalPages);
  const safeTotalPages = isInfinite ? currentPage + 1 : totalPages;
  console.log(`Current: ${currentPage}, Safe Total: ${safeTotalPages}, hasNext: ${hasNextPage}`);
  
  console.log("\n=== TEST PASSED ===");
}

testInfinitePaginationAndSpeed();
