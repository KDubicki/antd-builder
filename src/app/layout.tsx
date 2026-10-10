import { AntdRegistry } from '@ant-design/nextjs-registry';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'antd-builder',
  description: 'Visual builder for Ant Design frontends',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The CSP nonce is per request, so every page must render dynamically.
  await connection();

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
