export interface TokenInfo {
    tokenId: string;
    tokenSymbol: string;
    network: string;
    logoUrl: string;
    tokenAddress: string;
    tokenDecimal: string;
}

export interface TokenData {
    symbol: string;
    tokenInfos: TokenInfo[];
}

export interface TokenStorageData {
    timestamp: string;
    tokens: TokenData[];
}

export interface Product {
    investmentId: string;
    investmentName: string;
    chainId: string;
    rate: string;
    investType: string;
    platformName: string;
    platformId: number;
    platformUrl: string;
    poolVersion: string;
    rateType: string;
    tvl: string;
    underlyingToken: {
        tokenSymbol: string;
        tokenAddress: string;
        isBaseToken: boolean;
    }[];
    tokenAddr: string;
    network: string;
    protocolLogo?: string;
    platformWebSite?: string;
    [key: string]: any; // For other properties
}

export interface EnrichedProduct extends Product {
    tokenId?: string;
    logoUrl?: string;
    tokenDecimal?: string;
    protocolLogo?: string;
    platformWebSite?: string;
}

export interface ProductsResponse {
    code: number;
    msg: string;
    data: {
        investments: Product[];
        total: string;
    };
}

export interface ProductStorageData {
    timestamp: string;
    network: string;
    products: EnrichedProduct[];
}

export interface AllProductsStorageData {
    timestamp: string;
    networks: Record<string, EnrichedProduct[]>;
    products: EnrichedProduct[];
}

export interface UpdateProductsResult {
    timestamp: string;
    totalCount: number;
    networkCounts: Record<string, number>;
    enrichedCount: number;
}

export interface TokensResponse {
    code: number;
    msg: string;
    data: TokenData[];
} 