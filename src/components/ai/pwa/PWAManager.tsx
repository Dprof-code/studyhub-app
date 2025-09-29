/**
 * Progressive Web App Manager
 * Phase 5C: Advanced Features & Optimization
 */
'use client';

import { useState, useEffect } from 'react';
import {
    DevicePhoneMobileIcon,
    CloudArrowDownIcon,
    SignalIcon,
    WifiIcon,
    BellIcon,
    MapIcon,
    CameraIcon,
    ShareIcon,
    CogIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import { classNames } from '@/lib/utils';

interface PWAFeature {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<any>;
    enabled: boolean;
    available: boolean;
    permission?: 'granted' | 'denied' | 'default';
    requirement?: string;
}

interface InstallPrompt {
    available: boolean;
    platform: 'android' | 'ios' | 'desktop' | 'unknown';
    dismissed: boolean;
}

interface ServiceWorkerStatus {
    registered: boolean;
    active: boolean;
    updating: boolean;
    error?: string;
    cacheSize: number;
    lastUpdated?: Date;
}

interface OfflineCapability {
    enabled: boolean;
    cachedRoutes: string[];
    cachedAssets: string[];
    syncEnabled: boolean;
    backgroundSync: {
        pending: number;
        failed: number;
    };
}

export default function PWAManager() {
    const [installPrompt, setInstallPrompt] = useState<InstallPrompt>({
        available: false,
        platform: 'unknown',
        dismissed: false
    });

    const [serviceWorkerStatus, setServiceWorkerStatus] = useState<ServiceWorkerStatus>({
        registered: false,
        active: false,
        updating: false,
        cacheSize: 0
    });

    const [offlineCapability, setOfflineCapability] = useState<OfflineCapability>({
        enabled: false,
        cachedRoutes: [],
        cachedAssets: [],
        syncEnabled: false,
        backgroundSync: { pending: 0, failed: 0 }
    });

    const [pwaFeatures, setPwaFeatures] = useState<PWAFeature[]>([
        {
            id: 'notifications',
            name: 'Push Notifications',
            description: 'Receive updates about study sessions, reminders, and chat messages',
            icon: BellIcon,
            enabled: false,
            available: 'Notification' in window,
            permission: 'default'
        },
        {
            id: 'offline',
            name: 'Offline Access',
            description: 'Access content and continue studying even without internet connection',
            icon: WifiIcon,
            enabled: false,
            available: 'serviceWorker' in navigator,
        },
        {
            id: 'install',
            name: 'App Installation',
            description: 'Install StudyHub as a native app on your device',
            icon: DevicePhoneMobileIcon,
            enabled: false,
            available: true,
        },
        {
            id: 'share',
            name: 'Native Sharing',
            description: 'Share study materials using your device\'s native share functionality',
            icon: ShareIcon,
            enabled: false,
            available: 'share' in navigator,
        },
        {
            id: 'camera',
            name: 'Camera Access',
            description: 'Scan documents and capture study materials directly',
            icon: CameraIcon,
            enabled: false,
            available: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
            permission: 'default'
        },
        {
            id: 'geolocation',
            name: 'Location Services',
            description: 'Find nearby study groups and locations',
            icon: MapIcon,
            enabled: false,
            available: 'geolocation' in navigator,
            permission: 'default'
        },
        {
            id: 'background-sync',
            name: 'Background Sync',
            description: 'Sync data automatically when connection is restored',
            icon: CloudArrowDownIcon,
            enabled: false,
            available: 'serviceWorker' in navigator,
        }
    ]);

    // Initialize PWA features detection
    useEffect(() => {
        checkInstallPrompt();
        checkServiceWorker();
        checkPermissions();
        loadOfflineCapabilities();
    }, []);

    const checkInstallPrompt = () => {
        // Check if install prompt is available
        if ('BeforeInstallPromptEvent' in window) {
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                setInstallPrompt({
                    available: true,
                    platform: detectPlatform(),
                    dismissed: false
                });
            });
        }
    };

    const detectPlatform = (): 'android' | 'ios' | 'desktop' | 'unknown' => {
        const userAgent = navigator.userAgent.toLowerCase();
        if (/android/.test(userAgent)) return 'android';
        if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
        if (/windows|mac|linux/.test(userAgent)) return 'desktop';
        return 'unknown';
    };

    const checkServiceWorker = () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                setServiceWorkerStatus(prev => ({
                    ...prev,
                    registered: true,
                    active: !!registration.active
                }));

                // Estimate cache size
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    navigator.storage.estimate().then(estimate => {
                        setServiceWorkerStatus(prev => ({
                            ...prev,
                            cacheSize: Math.round((estimate.usage || 0) / 1024 / 1024) // Convert to MB
                        }));
                    });
                }
            });
        }
    };

    const checkPermissions = async () => {
        const updatedFeatures = await Promise.all(
            pwaFeatures.map(async (feature) => {
                if (feature.id === 'notifications' && 'Notification' in window) {
                    return {
                        ...feature,
                        permission: Notification.permission as 'granted' | 'denied' | 'default'
                    };
                }

                if (feature.id === 'camera' && 'permissions' in navigator) {
                    try {
                        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
                        return {
                            ...feature,
                            permission: result.state as 'granted' | 'denied' | 'default'
                        };
                    } catch (error) {
                        return feature;
                    }
                }

                if (feature.id === 'geolocation' && 'permissions' in navigator) {
                    try {
                        const result = await navigator.permissions.query({ name: 'geolocation' });
                        return {
                            ...feature,
                            permission: result.state as 'granted' | 'denied' | 'default'
                        };
                    } catch (error) {
                        return feature;
                    }
                }

                return feature;
            })
        );

        setPwaFeatures(updatedFeatures);
    };

    const loadOfflineCapabilities = () => {
        // Mock offline capabilities - in real implementation, this would check actual cache
        setOfflineCapability({
            enabled: true,
            cachedRoutes: [
                '/dashboard',
                '/courses',
                '/resources',
                '/profile'
            ],
            cachedAssets: [
                'main.js',
                'styles.css',
                'icons.woff2',
                'avatar.jpg'
            ],
            syncEnabled: true,
            backgroundSync: {
                pending: 3,
                failed: 1
            }
        });
    };

    const toggleFeature = async (featureId: string) => {
        const feature = pwaFeatures.find(f => f.id === featureId);
        if (!feature) return;

        if (featureId === 'notifications' && !feature.enabled) {
            const permission = await Notification.requestPermission();
            setPwaFeatures(prev => prev.map(f =>
                f.id === featureId
                    ? { ...f, enabled: permission === 'granted', permission: permission as any }
                    : f
            ));
            return;
        }

        if (featureId === 'camera' && !feature.enabled) {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                setPwaFeatures(prev => prev.map(f =>
                    f.id === featureId
                        ? { ...f, enabled: true, permission: 'granted' }
                        : f
                ));
            } catch (error) {
                setPwaFeatures(prev => prev.map(f =>
                    f.id === featureId
                        ? { ...f, enabled: false, permission: 'denied' }
                        : f
                ));
            }
            return;
        }

        if (featureId === 'geolocation' && !feature.enabled) {
            navigator.geolocation.getCurrentPosition(
                () => {
                    setPwaFeatures(prev => prev.map(f =>
                        f.id === featureId
                            ? { ...f, enabled: true, permission: 'granted' }
                            : f
                    ));
                },
                () => {
                    setPwaFeatures(prev => prev.map(f =>
                        f.id === featureId
                            ? { ...f, enabled: false, permission: 'denied' }
                            : f
                    ));
                }
            );
            return;
        }

        // Toggle other features
        setPwaFeatures(prev => prev.map(f =>
            f.id === featureId ? { ...f, enabled: !f.enabled } : f
        ));
    };

    const installApp = () => {
        // In real implementation, this would trigger the install prompt
        setInstallPrompt(prev => ({ ...prev, dismissed: true }));

        // Show success message
        alert('App installation initiated! Check your browser or home screen.');
    };

    const updateServiceWorker = () => {
        setServiceWorkerStatus(prev => ({ ...prev, updating: true }));

        // Simulate update
        setTimeout(() => {
            setServiceWorkerStatus(prev => ({
                ...prev,
                updating: false,
                lastUpdated: new Date()
            }));
        }, 2000);
    };

    const clearCache = () => {
        // In real implementation, this would clear the service worker cache
        setServiceWorkerStatus(prev => ({ ...prev, cacheSize: 0 }));
        setOfflineCapability(prev => ({
            ...prev,
            cachedRoutes: [],
            cachedAssets: []
        }));
    };

    const getPermissionColor = (permission?: string) => {
        switch (permission) {
            case 'granted':
                return 'text-green-600 dark:text-green-400';
            case 'denied':
                return 'text-red-600 dark:text-red-400';
            default:
                return 'text-yellow-600 dark:text-yellow-400';
        }
    };

    const getPermissionIcon = (permission?: string) => {
        switch (permission) {
            case 'granted':
                return CheckCircleIcon;
            case 'denied':
                return ExclamationTriangleIcon;
            default:
                return InformationCircleIcon;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
                        <DevicePhoneMobileIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            PWA Manager
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            Configure Progressive Web App features
                        </p>
                    </div>
                </div>

                {/* Service Worker Status */}
                <div className="flex items-center gap-4">
                    <div className={classNames(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                        serviceWorkerStatus.active
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    )}>
                        <div className={classNames(
                            'w-2 h-2 rounded-full',
                            serviceWorkerStatus.active ? 'bg-green-500' : 'bg-red-500'
                        )} />
                        Service Worker {serviceWorkerStatus.active ? 'Active' : 'Inactive'}
                    </div>

                    <button
                        onClick={updateServiceWorker}
                        disabled={serviceWorkerStatus.updating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                    >
                        {serviceWorkerStatus.updating ? 'Updating...' : 'Update SW'}
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-8">
                {/* Install Prompt */}
                {installPrompt.available && !installPrompt.dismissed && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <DevicePhoneMobileIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                                        Install StudyHub App
                                    </h3>
                                    <p className="text-blue-700 dark:text-blue-300">
                                        Install StudyHub as a native app for the best experience on {installPrompt.platform}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setInstallPrompt(prev => ({ ...prev, dismissed: true }))}
                                    className="px-4 py-2 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors"
                                >
                                    Later
                                </button>
                                <button
                                    onClick={installApp}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Install Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PWA Features */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Progressive Web App Features
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pwaFeatures.map((feature) => {
                            const Icon = feature.icon;
                            const PermissionIcon = getPermissionIcon(feature.permission);

                            return (
                                <div
                                    key={feature.id}
                                    className={classNames(
                                        'p-4 rounded-xl border transition-all',
                                        feature.available
                                            ? 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                                            : 'border-gray-200 dark:border-gray-600 opacity-50'
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={classNames(
                                                'p-2 rounded-lg',
                                                feature.enabled
                                                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            )}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-900 dark:text-white">
                                                    {feature.name}
                                                </h4>
                                                {feature.permission && (
                                                    <div className={classNames(
                                                        'flex items-center gap-1 text-xs mt-1',
                                                        getPermissionColor(feature.permission)
                                                    )}>
                                                        <PermissionIcon className="h-3 w-3" />
                                                        {feature.permission}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {feature.available && (
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={feature.enabled}
                                                    onChange={() => toggleFeature(feature.id)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                            </label>
                                        )}
                                    </div>

                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                        {feature.description}
                                    </p>

                                    {!feature.available && (
                                        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                                            <ExclamationTriangleIcon className="h-4 w-4" />
                                            Not supported in this browser
                                        </div>
                                    )}

                                    {feature.requirement && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            Requires: {feature.requirement}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Offline Capabilities */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Offline Capabilities
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Cached Content */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    Cached Content
                                </h4>
                                <button
                                    onClick={clearCache}
                                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                >
                                    Clear Cache
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                        Routes ({offlineCapability.cachedRoutes.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {offlineCapability.cachedRoutes.map((route, index) => (
                                            <span
                                                key={index}
                                                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded"
                                            >
                                                {route}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                        Assets ({offlineCapability.cachedAssets.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {offlineCapability.cachedAssets.map((asset, index) => (
                                            <span
                                                key={index}
                                                className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded"
                                            >
                                                {asset}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Background Sync */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                                Background Sync
                            </h4>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                        Sync Status
                                    </span>
                                    <span className={classNames(
                                        'px-2 py-1 text-xs rounded-full',
                                        offlineCapability.syncEnabled
                                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                            : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                    )}>
                                        {offlineCapability.syncEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                        Pending Syncs
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {offlineCapability.backgroundSync.pending}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                        Failed Syncs
                                    </span>
                                    <span className="font-medium text-red-600 dark:text-red-400">
                                        {offlineCapability.backgroundSync.failed}
                                    </span>
                                </div>

                                {offlineCapability.backgroundSync.failed > 0 && (
                                    <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                        Retry Failed Syncs
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cache Statistics */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Cache Statistics
                        </h3>
                        {serviceWorkerStatus.lastUpdated && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Last updated: {serviceWorkerStatus.lastUpdated.toLocaleString()}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                {serviceWorkerStatus.cacheSize}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">MB Cached</p>
                        </div>

                        <div className="text-center">
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {offlineCapability.cachedRoutes.length + offlineCapability.cachedAssets.length}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Total Items</p>
                        </div>

                        <div className="text-center">
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                {pwaFeatures.filter(f => f.enabled).length}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Active Features</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}