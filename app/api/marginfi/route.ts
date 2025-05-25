import { NextResponse } from 'next/server';
import { MarginfiClient, Bank } from "@mrgnlabs/marginfi-client-v2";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { nativeToUi, numeralFormatter, percentFormatterDyn } from "@mrgnlabs/mrgn-common";
import BN from 'bn.js';

// GetBlock RPC endpoint
const RPC_ENDPOINT = "https://go.getblock.io/fdb42ef4c1254d90adfc4c40b8a9969e";
const PROGRAM_ID = new PublicKey("MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA");
const GROUP_PK = new PublicKey("4qp6Fx6tnZkY5WropqCS4UYuLwKuZxNvzXzQyQzKqQqB");

async function getMarginfiClient() {
  const connection = new Connection(RPC_ENDPOINT, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000
  });

  // Create a dummy wallet for read-only operations
  const dummyWallet = {
    publicKey: Keypair.generate().publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs
  };

  try {
    // Initialize the client with direct configuration
    const client = await MarginfiClient.fetch(
      {
        environment: "production",
        cluster: "mainnet-beta",
        programId: PROGRAM_ID,
        groupPk: GROUP_PK
      },
      dummyWallet,
      connection,
      {
        readOnly: true,
        confirmOpts: { commitment: 'confirmed' }
      }
    );

    // Ensure the client is properly initialized
    if (!client || !client.banks) {
      throw new Error("Client initialization failed");
    }

    return client;
  } catch (error) {
    console.error('Client initialization error:', error);
    throw error;
  }
}

function sortByTvl(client: MarginfiClient, banks: Map<string, Bank>) {
  const banksArray = Array.from(banks.entries());
  banksArray.sort(([addr1, b1], [addr2, b2]) => {
    const oraclePrice1 = client.getOraclePriceByBank(addr1);
    if (!oraclePrice1) {
      throw new Error("No oracle price");
    }
    const oraclePrice2 = client.getOraclePriceByBank(addr2);
    if (!oraclePrice2) {
      throw new Error("No oracle price");
    }
    const bankTvl1 = b1.computeTvl(oraclePrice1);
    const bankTvl2 = b2.computeTvl(oraclePrice2);

    return bankTvl2.minus(bankTvl1).toNumber();
  });
  return banksArray;
}

interface BankInfo {
  tokenSymbol: string;
  bankAddress: string;
  tvl: number;
  riskTier: string;
  status: string;
  depositCap: number;
  borrowCap: number;
  assetWeightInitial: number;
  assetWeightMaintenance: number;
  liabilityWeightInitial: number;
  liabilityWeightMaintenance: number;
  oracleType: string;
  oracleAddresses: string[];
  totalAssetValueInitLimit: number;
  insuranceFeeFixedApr: number;
  insuranceIrFee: number;
  protocolFixedFeeApr: number;
  protocolIrFee: number;
  optimalUtilizationRate: number;
  plateauInterestRate: number;
  maxInterestRate: number;
  hasLendingEmissions: boolean;
  hasBorrowingEmissions: boolean;
}

function formatBankInfo(bankAddress: string, bank: Bank, client: MarginfiClient): BankInfo {
  try {
    const tvl = bank.computeTvl(client.getOraclePriceByBank(bankAddress)!);
    const oracleAddresses = bank.config.oracleKeys
      .filter((k) => !k.equals(PublicKey.default))
      .map(addr => addr.toString());

    return {
      tokenSymbol: bank.tokenSymbol || "Unknown",
      bankAddress,
      tvl: tvl.toNumber(),
      riskTier: bank.config.riskTier,
      status: bank.config.operationalState,
      depositCap: nativeToUi(bank.config.depositLimit, bank.mintDecimals),
      borrowCap: nativeToUi(bank.config.borrowLimit, bank.mintDecimals),
      assetWeightInitial: bank.config.assetWeightInit.toNumber(),
      assetWeightMaintenance: bank.config.assetWeightMaint.toNumber(),
      liabilityWeightInitial: bank.config.liabilityWeightInit.toNumber(),
      liabilityWeightMaintenance: bank.config.liabilityWeightMaint.toNumber(),
      oracleType: bank.config.oracleSetup,
      oracleAddresses,
      totalAssetValueInitLimit: bank.config.totalAssetValueInitLimit.toNumber(),
      insuranceFeeFixedApr: bank.config.interestRateConfig.insuranceFeeFixedApr.toNumber(),
      insuranceIrFee: bank.config.interestRateConfig.insuranceIrFee.toNumber(),
      protocolFixedFeeApr: bank.config.interestRateConfig.protocolFixedFeeApr.toNumber(),
      protocolIrFee: bank.config.interestRateConfig.protocolIrFee.toNumber(),
      optimalUtilizationRate: bank.config.interestRateConfig.optimalUtilizationRate.toNumber(),
      plateauInterestRate: bank.config.interestRateConfig.plateauInterestRate.toNumber(),
      maxInterestRate: bank.config.interestRateConfig.maxInterestRate.toNumber(),
      hasLendingEmissions: bank.emissionsActiveLending,
      hasBorrowingEmissions: bank.emissionsActiveBorrowing
    };
  } catch (error) {
    console.error('Error formatting bank info:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const client = await getMarginfiClient();
    const sortedBanks = sortByTvl(client, client.banks);
    const formattedBanks = sortedBanks.map(([addr, bank]) => formatBankInfo(addr, bank, client));
    
    return NextResponse.json(formattedBanks);
  } catch (error) {
    console.error('Error fetching MarginFi data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch MarginFi data' },
      { status: 500 }
    );
  }
} 