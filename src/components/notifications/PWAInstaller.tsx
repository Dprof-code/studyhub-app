'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, X, Smartphone, Bell } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
    interface WindowEventMap {
        beforeinstallprompt: BeforeInstallPromptEvent;
    }
}

export function PWAInstaller() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Check if app is already installed
        const checkInstallStatus = () => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
            const isIOSStandalone = (window.navigator as any).standalone === true;

            setIsStandalone(isStandaloneMode || isIOSStandalone);
            setIsInstalled(isStandaloneMode || isIOSStandalone);
        };

        checkInstallStatus();

        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Show install banner after a short delay and if user hasn't dismissed it recently
            const dismissed = localStorage.getItem('pwa-install-dismissed');
            const dismissedTime = dismissed ? parseInt(dismissed) : 0;
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

            if (!dismissed || dismissedTime < oneDayAgo) {
                setTimeout(() => setShowInstallBanner(true), 3000);
            }
        };

        // Listen for app installation
        const handleAppInstalled = () => {
            console.log('StudyHub PWA was installed');
            setIsInstalled(true);
            setShowInstallBanner(false);
            setDeferredPrompt(null);

            toast({
                title: 'App Installed!',
                description: 'StudyHub has been installed on your device.',
            });
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered successfully:', registration);

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New version available
                                    toast({
                                        title: 'Update Available',
                                        description: 'A new version of StudyHub is available. Refresh to update.',
                                        action: (
                                            <Button onClick={() => window.location.reload()}>
                                                Refresh
                                            </Button>
                                        ),
                                    });
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [toast]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        try {
            await deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;

            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }

            setDeferredPrompt(null);
            setShowInstallBanner(false);
        } catch (error) {
            console.error('Error during installation:', error);
            toast({
                title: 'Installation Error',
                description: 'Failed to install the app. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleDismiss = () => {
        setShowInstallBanner(false);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    // Don't show if already installed or no prompt available
    if (isStandalone || isInstalled || !showInstallBanner || !deferredPrompt) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:w-96">
            <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Smartphone className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Install StudyHub</CardTitle>
                                <CardDescription>
                                    Get the full app experience
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDismiss}
                            className="h-8 w-8 text-gray-500 hover:text-gray-700"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-0">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Bell className="w-4 h-4" />
                            <span>Push notifications</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Download className="w-4 h-4" />
                            <span>Offline access</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Smartphone className="w-4 h-4" />
                            <span>Native app experience</span>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button onClick={handleInstallClick} className="flex-1">
                                <Download className="w-4 h-4 mr-2" />
                                Install App
                            </Button>
                            <Button variant="outline" onClick={handleDismiss}>
                                Not now
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default PWAInstaller;