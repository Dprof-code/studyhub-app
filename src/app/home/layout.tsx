import { Navigation } from '@/components/layout/Navigation';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <Navigation />
                <main>
                    {children}
                </main>
            </body>
        </html>
    );
}