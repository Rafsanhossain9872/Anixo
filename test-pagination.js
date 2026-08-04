const testPagination = (currentPage, totalPages) => {
  let pages = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    
    if (currentPage > 3) {
      pages.push("...");
    }
    
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);
    
    if (currentPage === 1) end = 3;
    if (currentPage === totalPages) start = totalPages - 2;
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      pages.push("...");
    }
    
    pages.push(totalPages);
  }
  
  return pages;
};

console.log("Page 1 of 800:", testPagination(1, 800));
console.log("Page 400 of 800:", testPagination(400, 800));
console.log("Page 799 of 800:", testPagination(799, 800));
console.log("Page 800 of 800:", testPagination(800, 800));
