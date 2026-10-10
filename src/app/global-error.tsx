'use client';

import { Button, Result } from 'antd';

/** Replaces the root layout when it fails, so it must render its own <html> and <body>. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <Result
          status="500"
          title="Something went wrong"
          subTitle={error.digest ? `Reference: ${error.digest}` : undefined}
          extra={
            <Button type="primary" onClick={reset}>
              Try again
            </Button>
          }
        />
      </body>
    </html>
  );
}
