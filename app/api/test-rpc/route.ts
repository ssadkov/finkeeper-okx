import { NextResponse } from 'next/server';
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_ENDPOINT = "https://go.getblock.io/fdb42ef4c1254d90adfc4c40b8a9969e";
const PROGRAM_ID = new PublicKey("MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA");

// Known MarginFi addresses
const MARGINFI_ADDRESSES = [
  {
    name: "Program ID",
    address: "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA"
  },
  {
    name: "Main Group (v2)",
    address: "4qp6Fx6tnZkY5WropqCS4UYuLwKuZxNvzXzQyQzKqQqB"
  },
  {
    name: "Main Group (v1)",
    address: "4qp6Fx6tnZkY5WropqCS4UYuLwKuZxNvzXzQyQzKqQqB"
  },
  {
    name: "Devnet Group",
    address: "4qp6Fx6tnZkY5WropqCS4UYuLwKuZxNvzXzQyQzKqQqB"
  }
];

export async function GET() {
  const results = [];
  const connection = new Connection(RPC_ENDPOINT, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000
  });

  try {
    // Test 1: Get recent blockhash
    const startTime1 = Date.now();
    const blockhash = await connection.getLatestBlockhash();
    const endTime1 = Date.now();

    // Test 2: Get all program accounts
    const startTime2 = Date.now();
    const programAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      commitment: 'confirmed',
      filters: [
        {
          dataSize: 1024, // Typical size for a group account
        }
      ]
    });
    const endTime2 = Date.now();

    // Test 3: Get accounts with specific data pattern
    const startTime3 = Date.now();
    const groupAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      commitment: 'confirmed',
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: "group" // Look for accounts that might be groups
          }
        }
      ]
    });
    const endTime3 = Date.now();

    results.push({
      endpoint: RPC_ENDPOINT,
      status: 'success',
      blockhashTest: {
        time: endTime1 - startTime1,
        result: blockhash ? 'success' : 'failed',
        blockhash: blockhash?.blockhash
      },
      programAccounts: {
        time: endTime2 - startTime2,
        count: programAccounts.length,
        accounts: programAccounts.map(acc => ({
          address: acc.pubkey.toBase58(),
          dataSize: acc.account.data.length,
          owner: acc.account.owner.toBase58(),
          executable: acc.account.executable,
          lamports: acc.account.lamports
        }))
      },
      groupAccounts: {
        time: endTime3 - startTime3,
        count: groupAccounts.length,
        accounts: groupAccounts.map(acc => ({
          address: acc.pubkey.toBase58(),
          dataSize: acc.account.data.length,
          owner: acc.account.owner.toBase58(),
          executable: acc.account.executable,
          lamports: acc.account.lamports
        }))
      }
    });
  } catch (error) {
    results.push({
      endpoint: RPC_ENDPOINT,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return NextResponse.json(results);
} 