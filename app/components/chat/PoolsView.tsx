'use client';

interface Pool {
  id: string;
  name: string;
  network: string;
  rate: number;
  tvl: number;
  type: string;
}

const testPools: Pool[] = [
  {
    id: '1',
    name: 'USDC/USDT',
    network: 'SOL',
    rate: 5.2,
    tvl: 1500000,
    type: 'Stablecoin'
  },
  {
    id: '2',
    name: 'SOL/USDC',
    network: 'SOL',
    rate: 12.5,
    tvl: 2500000,
    type: 'Single'
  },
  {
    id: '3',
    name: 'ETH/USDC',
    network: 'ETH',
    rate: 8.7,
    tvl: 3200000,
    type: 'Single'
  },
  {
    id: '4',
    name: 'USDC/USDT/DAI',
    network: 'BSC',
    rate: 4.8,
    tvl: 1800000,
    type: 'Stablecoin'
  }
];

export function PoolsView() {
  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TVL</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {testPools.map((pool) => (
              <tr key={pool.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{pool.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {pool.network}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{pool.rate.toFixed(2)}%</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">${pool.tvl.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{pool.type}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 