import { useState } from 'react';

export function usePagination(defaultLimit = 20) {
  const [page, setPage] = useState(1);
  const [limit] = useState(defaultLimit);

  function reset() { setPage(1); }

  return { page, limit, setPage, reset };
}
