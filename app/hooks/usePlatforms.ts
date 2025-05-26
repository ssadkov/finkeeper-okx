import { useState, useEffect } from 'react';

interface PlatformInfo {
    investmentId: string;
    protocolId: string;
    network: string;
    chainId: string;
}

interface Platform {
    platformId: number;
    platformName: string;
    logo: string;
    network: string;
    platformWebSite: string;
    platformMinInfos: PlatformInfo[];
}

interface PlatformsResponse {
    code: number;
    msg: string;
    data: Platform[];
}

export function usePlatforms() {
    const [platforms, setPlatforms] = useState<Record<string, Platform>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlatforms = async () => {
            try {
                const response = await fetch('/api/defi/platforms?network=SOL');
                const data: PlatformsResponse = await response.json();

                if (data.code !== 0) {
                    throw new Error(data.msg);
                }

                // Convert array to object with platformName as key
                const platformsMap = data.data.reduce((acc, platform) => {
                    acc[platform.platformName] = platform;
                    return acc;
                }, {} as Record<string, Platform>);

                setPlatforms(platformsMap);
            } catch (err) {
                console.error('Error fetching platforms:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch platforms');
            } finally {
                setLoading(false);
            }
        };

        fetchPlatforms();
    }, []);

    return { platforms, loading, error };
} 