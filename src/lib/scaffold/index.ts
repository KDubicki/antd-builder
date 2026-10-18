import { boundSourceIds, generatePage } from '@/lib/codegen';
import { type ProjectContent, projectSlug } from '@/lib/project';

/** Dependency ranges for the exported app: the versions this builder renders with. */
const DEPENDENCIES = {
  '@ant-design/nextjs-registry': '^1.3.0',
  antd: '^6.6.6',
  next: '^16.4.0',
  react: '^19.3.0',
  'react-dom': '^19.3.0',
};
const DEV_DEPENDENCIES = {
  '@types/node': '^24.19.2',
  '@types/react': '^19.3.0',
  '@types/react-dom': '^19.3.0',
  typescript: '~6.0.3',
};

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const LAYOUT = `import { AntdRegistry } from '@ant-design/nextjs-registry';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: __TITLE__ };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
`;

/** A route handler serving a data source's sample, standing in for the real API. */
const dataRoute = (name: string) => `import ${name} from '@/data/${name}.json';

// Stub API: serves the sample response from the builder. Replace with your real backend.
export function GET() {
  return Response.json(${name});
}
`;

function readme(name: string, sourceNames: readonly string[]): string {
  const data =
    sourceNames.length === 0
      ? ''
      : `
## Mock data

The page imports its sample API responses from \`data/\`:

${sourceNames.map((source) => `- \`data/${source}.json\`, also served by \`GET /api/${source}\``).join('\n')}

The routes under \`app/api/\` are stubs. To use real data, fetch it in \`app/page.tsx\` (or in
a server component that passes it down) and delete the stubs.
`;
  return `# ${name}

Exported from antd-builder: a Next.js app with Ant Design.

## Getting started

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

Then open http://localhost:3000. The page lives in \`app/page.tsx\`.
${data}`;
}

/**
 * Files of a runnable Next.js project for the page: the generated page, its mock data as JSON
 * files with stub API routes serving them, and the configuration to build it. Paths are
 * relative to the project folder.
 */
export function buildScaffold(content: ProjectContent): Record<string, string> {
  const name = projectSlug(content.name);
  const used = boundSourceIds(content.root);
  const sources = content.mockData.filter((source) => used.has(source.id));

  const files: Record<string, string> = {
    'package.json': json({
      name,
      version: '0.1.0',
      private: true,
      scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
      dependencies: DEPENDENCIES,
      devDependencies: DEV_DEPENDENCIES,
    }),
    'tsconfig.json': json({
      compilerOptions: {
        target: 'ES2023',
        lib: ['dom', 'dom.iterable', 'esnext'],
        strict: true,
        noEmit: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'react-jsx',
        incremental: true,
        skipLibCheck: true,
        plugins: [{ name: 'next' }],
        paths: { '@/*': ['./*'] },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    }),
    'next.config.ts': `import type { NextConfig } from 'next';\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n`,
    '.gitignore': ['node_modules/', '.next/', 'next-env.d.ts', '*.tsbuildinfo', ''].join('\n'),
    'README.md': readme(
      content.name,
      sources.map((source) => source.name),
    ),
    'app/layout.tsx': LAYOUT.replace('__TITLE__', JSON.stringify(content.name)),
    'app/page.tsx': generatePage(content, {
      dataModule: (source) => `@/data/${source.name}.json`,
    }),
  };
  for (const source of sources) {
    files[`data/${source.name}.json`] = json(source.data);
    files[`app/api/${source.name}/route.ts`] = dataRoute(source.name);
  }
  return files;
}
