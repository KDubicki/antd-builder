'use client';

import { Button, Result } from 'antd';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Result
      status="error"
      title="Something went wrong"
      subTitle={error.digest ? `Reference: ${error.digest}` : undefined}
      extra={
        <Button type="primary" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
