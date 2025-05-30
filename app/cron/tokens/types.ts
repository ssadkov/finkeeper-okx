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

export interface TokensResponse {
    code: number;
    msg: string;
    data: TokenData[];
}

export interface TokenStorageData {
    timestamp: string;
    tokens: TokenData[];
} 