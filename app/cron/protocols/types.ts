export interface PlatformMinInfo {
    investmentId: string;
    protocolId: string;
    network: string;
    chainId: string;
}

export interface ProtocolData {
    platformId: number;
    platformName: string;
    logo: string;
    network: string;
    platformWebSite: string;
    platformMinInfos: PlatformMinInfo[];
}

export interface ProtocolsResponse {
    code: number;
    msg: string;
    data: ProtocolData[];
}

export interface ProtocolStorageData {
    timestamp: string;
    protocols: ProtocolData[];
} 