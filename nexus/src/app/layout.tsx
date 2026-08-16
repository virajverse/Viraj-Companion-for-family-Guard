import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ultron Nexus • Sovereign Multi-Device Perception & Command Deck',
  description: 'VirajVerse Universe #1 Brain — Real-time Multi-Phone Vision, Telemetry & Tactical Command Suite',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
