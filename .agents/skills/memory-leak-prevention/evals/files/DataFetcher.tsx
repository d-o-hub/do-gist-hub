import { useEffect, useState } from 'react';

interface DataFetcherProps {
  url: string;
  refreshInterval?: number;
}

export function DataFetcher({ url, refreshInterval = 5000 }: DataFetcherProps) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    // Fetch data initially
    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(setData)
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err);
        }
      });

    // Set up polling interval
    const intervalId = setInterval(() => {
      fetch(url, { signal: controller.signal })
        .then(res => res.json())
        .then(setData)
        .catch(err => {
          if (err.name !== 'AbortError') {
            setError(err);
          }
        });
    }, refreshInterval);

    // Add resize listener
    const handleResize = () => {
      console.log('Window resized');
    };
    window.addEventListener('resize', handleResize);

    return () => {
      controller.abort();
      clearInterval(intervalId);
      window.removeEventListener('resize', handleResize);
    };
  }, [url, refreshInterval]);

  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>Loading...</div>;

  return <div>{JSON.stringify(data)}</div>;
}
