import { GeistSans } from 'geist/font/sans';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import './globals.css';
import Providers from './providers';
import { AIAssistant } from '../components/AIAssistant';

export const metadata = {
  title: 'RecruitAI',
  description: 'ATS Built for Speed',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>
        <Providers>
          {children}
          <Toaster position="bottom-right" richColors />
          <AIAssistant />
        </Providers>
      </body>
    </html>
  );
}
