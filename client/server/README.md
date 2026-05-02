# Coinbase Clone — Backend Server

Node.js + Express + MongoDB backend for the Coinbase Clone school project.

## Folder Structure

```
server/
├── app.js                  ← Express app setup, middleware, route mounting
├── server.js               ← Entry point — connects DB and starts HTTP server
├── .env.example            ← Copy to .env and fill in values
├── config/
│   └── db.js               ← Mongoose connection
├── models/
│   ├── User.js             ← User schema (email, password hash, KYC status)
│   ├── Wallet.js           ← Per-user per-asset wallet (balance + address)
│   ├── Transaction.js      ← All send/receive/swap records
│   ├── RefreshToken.js     ← Stored refresh tokens (DB-side invalidation)
│   ├── KycDocument.js      ← KYC uploaded document metadata
│   └── Subscription.js     ← Newsletter subscriptions
├── controllers/
│   ├── auth.controller.js       ← register, login, logout, refresh, OTP, password reset
│   ├── user.controller.js       ← getMe, updateMe
│   ├── wallet.controller.js     ← balances, receive address, portfolio summary
│   ├── transaction.controller.js ← list, get one, send crypto
│   ├── swap.controller.js       ← quote, execute swap, swap history
│   ├── kyc.controller.js        ← upload ID, upload address, KYC status
│   ├── market.controller.js     ← proxy Binance prices with 10s cache + mock fallback
│   └── subscription.controller.js ← newsletter subscribe
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── wallet.routes.js
│   ├── transaction.routes.js
│   ├── swap.routes.js
│   ├── market.routes.js
│   ├── kyc.routes.js
│   └── subscription.routes.js
├── middleware/
│   ├── auth.middleware.js     ← JWT protect middleware (reads Bearer token)
│   ├── validate.middleware.js ← express-validator error handler
│   └── upload.middleware.js   ← multer config for KYC file uploads
└── utils/
    ├── token.js     ← generateAccessToken, generateRefreshToken, generateOtp, generateResetToken
    ├── wallet.js    ← DEFAULT_ASSETS, MOCK_BALANCES, generateMockAddress
    └── swap.js      ← MOCK_PRICES_USD, getSwapQuote (fixed-rate simulation)
```

## Setup

```bash
cd server
cp .env.example .env
# Edit .env with your secrets
npm install
npm run dev
```

Requires MongoDB running locally: `mongod`

## API Endpoints

### Auth — /api/auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | No | Register with email + password + accountType |
| POST | /verify-email | No | Validate OTP → mark email verified |
| POST | /resend-otp | No | Resend email OTP |
| POST | /login | No | Returns accessToken + sets refreshToken cookie |
| POST | /refresh | Cookie | Rotate refresh token, return new accessToken |
| POST | /logout | Cookie | Delete refresh token, clear cookie |
| POST | /forgot-password | No | Sends reset token (logged to console in dev) |
| POST | /reset-password | No | Validates reset token, updates password |

### Users — /api/users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /me | Bearer | Get current user profile |
| PATCH | /me | Bearer | Update firstName / lastName |

### Wallet — /api/wallet
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /balances | Bearer | All wallet balances for the user |
| GET | /address/:asset | Bearer | Get or create receive address for an asset |
| GET | /portfolio | Bearer | Total USD value + per-asset breakdown |

### Transactions — /api/transactions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Bearer | Paginated list (?page=1&limit=20&asset=BTC) |
| GET | /:id | Bearer | Single transaction |
| POST | /send | Bearer | Send crypto (deducts balance, creates tx record) |

### Swap — /api/swap
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /quote?from=BTC&to=ETH&amount=0.1 | Bearer | Get swap quote with fee |
| POST | /execute | Bearer | Execute swap (adjusts both wallet balances) |
| GET | /history | Bearer | All past swaps for user |

### Market — /api/market
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /prices | No | Live Binance prices (10s cache, mock fallback) |

### KYC — /api/kyc
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /status | Bearer | KYC status + latest document |
| POST | /upload-id | Bearer | Upload ID front + back (multipart) |
| POST | /upload-address | Bearer | Upload address proof (multipart) |
| POST | /submit | Bearer | Mark KYC as submitted for review |

### Subscriptions — /api/subscriptions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | / | No | Subscribe email to newsletter |

## Auth Flow

1. `POST /api/auth/register` → receive `userId`
2. `POST /api/auth/verify-email` with `{ userId, otp }` (OTP printed to console in dev)
3. `POST /api/auth/login` → receive `accessToken` in body + `refreshToken` httpOnly cookie
4. Use `Authorization: Bearer <accessToken>` on all protected routes
5. When access token expires → `POST /api/auth/refresh` (cookie is sent automatically)
6. `POST /api/auth/logout` → clears cookie + deletes stored token

## Testing with Thunder Client / Postman

1. Register: `POST /api/auth/register` `{ "email": "test@test.com", "password": "password123", "accountType": "personal" }`
2. Check console for OTP
3. Verify: `POST /api/auth/verify-email` `{ "userId": "<id from step 1>", "otp": "<otp from console>" }`
4. Login: `POST /api/auth/login` → copy `accessToken`
5. Set header `Authorization: Bearer <token>` for all subsequent requests
6. Get balances: `GET /api/wallet/balances`
7. Get quote: `GET /api/swap/quote?from=BTC&to=ETH&amount=0.01`
8. Execute swap: `POST /api/swap/execute` `{ "fromAsset": "BTC", "toAsset": "ETH", "fromAmount": 0.01 }`
9. Send crypto: `POST /api/transactions/send` `{ "asset": "ETH", "toAddress": "0xabc123", "amount": 0.1 }`
