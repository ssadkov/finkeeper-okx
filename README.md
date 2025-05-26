# 🚀 FinKeeper OKX

A modern web application for tracking and managing your OKX Exchange portfolio alongside your Solana wallet assets.

## 🌟 Features

- 💼 **Wallet Integration**
  - Connect and manage Solana wallet
  - View token balances and values
  - Real-time price updates
  - Hide small assets (<$1)

- 💱 **OKX Exchange Integration**
  - Secure API key connection
  - Real-time balance tracking
  - Token price monitoring
  - Portfolio value calculation

- 📊 **Portfolio Overview**
  - Total value calculation across all assets
  - Position tracking
  - DeFi protocol integration
  - Small assets filtering

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context
- **UI Components**: Custom components with Heroicons

### Backend
- **API Routes**: Next.js API Routes
- **Authentication**: Custom HMAC signature implementation
- **Caching**: Next.js built-in caching

### External APIs
- **OKX API**
  - REST API integration
  - HMAC-SHA256 authentication
  - Real-time balance fetching
  - Secure credential storage

- **Price API**
  - Custom price fetching endpoint
  - Token price aggregation
  - Caching implementation

## 🔐 Security Features

- Secure API key storage
- HMAC signature generation
- CORS protection
- Rate limiting
- Error handling

## 🚀 Getting Started

1. Clone the repository
```bash
git clone https://github.com/yourusername/finkeeper-okx.git
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up environment variables
```env
NEXT_PUBLIC_OKX_API_URL=https://www.okx.com
NEXT_PUBLIC_PRICE_API_URL=https://finkeeper.pro
```

4. Run the development server
```bash
npm run dev
# or
yarn dev
```

## 📱 Demo

Check out the live demo: [FinKeeper OKX](https://finkeeper-okx.vercel.app/)

## 🔄 OKX API Integration

The application uses OKX's REST API with the following features:

- **Authentication**: HMAC-SHA256 signature generation
- **Endpoints**:
  - `/api/v5/account/balance` - Fetch account balances
  - `/api/v5/account/positions` - Get current positions
  - `/api/v5/market/tickers` - Get market data

### API Security

```typescript
// Example of HMAC signature generation
const timestamp = new Date().toISOString();
const signature = createSignature(
  timestamp,
  'GET',
  '/api/v5/account/balance',
  '',
  apiSecret
);
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OKX API Documentation
- Next.js Team
- Solana Web3.js
- Tailwind CSS
