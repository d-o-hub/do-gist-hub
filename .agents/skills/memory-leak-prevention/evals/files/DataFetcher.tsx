import { useEffect, useState } from 'react';

interface DataFetcherProps {
  url: string;
  refreshInterval?: number;
}

export function DataFetcher({ url, refreshInterval = 5000 }: DataFetcherProps) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Fetch data initially
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError);

    // Set up polling interval
    const intervalId = setInterval(() => {
      fetch(url)
        .then(res => res.json())
        .then(setData)
        .catch(setError);
    }, refreshInterval);

    // Add resize listener
    const handleResize = () => {
      console.log('Window resized');
    };
    window.addEventListener('resize', handleResize);

    // BUG: No cleanup function - causes memory leaks!
    // Interval continues running after unmount
    // Event listener is never removed
  }, [url, refreshInterval]);

  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>Loading...</div>;

  return <div>{JSON.stringify(data)}</div>;
}
