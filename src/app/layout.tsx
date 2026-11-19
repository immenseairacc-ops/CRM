import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Immense Air Pvt Ltd — Sales, Support & Billing CRM',
  description:
    'Immense Air Pvt Ltd multi-team CRM for Lead Distribution, Agent Calling & Reminders, Meet Approvals, Support Operations, Recharges, and Tax Billing.',
  icons: {
    icon: '/immense-logo.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
