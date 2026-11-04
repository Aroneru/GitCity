import type { Metadata, Viewport } from 'next';
import { dotGothic, pressStart } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'GitCity', template: '%s · GitCity' },
  description: 'Turn a GitHub profile into a pixel-art Japanese street at night.',
};

export const viewport: Viewport = {
  themeColor: '#05071a',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${pressStart.variable} ${dotGothic.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
