# Grantify Frontend

Next.js 16 web application for grant submission, tracking, and agent activity visualization.

---

## 🎨 Features

- **Grant Submission** - Multi-step form with validation and file uploads
- **Grant Dashboard** - View all grants, filter by status, search
- **Agent Activity** - Real-time AI agent evaluations and votes
- **Grant Pipeline** - Visual workflow tracking
- **My Grants** - Personal grant management
- **Admin Dashboard** - Platform administration and controls
- **Wallet Integration** - Thirdweb wallet connection
- **Email Authentication** - OTP-based login system

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Running Python services (port 8000)
- Deployed smart contracts
- Ethereum wallet with Sepolia testnet ETH

### Installation

```bash
cd frontend
npm install
```

### Environment Configuration

Create `.env.local`:

```env
# Thirdweb Configuration
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id

# Smart Contract Addresses (from deployed-contracts.json)
NEXT_PUBLIC_GRANT_REGISTRY_ADDRESS=0x6d77f3a5dcad33cbEbf431Fee6F67E5930148D17
NEXT_PUBLIC_GRANT_TREASURY_ADDRESS=0x71C74477ae190d7eeF762d01AC091D021a5AbAa6
NEXT_PUBLIC_AGENT_VOTING_ADDRESS=0x19Fe9e5e12fc5C1657E299aC69878965367A294D

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# MCP Server
NEXT_PUBLIC_MCP_URL=http://localhost:3001

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_NETWORK_NAME=sepolia
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Homepage
│   │   ├── submit/            # Grant submission
│   │   ├── grants/            # My grants page
│   │   ├── pipeline/          # Grant pipeline view
│   │   ├── activity/          # Agent activity feed
│   │   ├── admin/             # Admin dashboard
│   │   ├── login/             # Authentication
│   │   ├── terms/             # Terms & conditions
│   │   └── layout.tsx         # Root layout
│   │
│   ├── components/            # React components
│   │   ├── Navigation.tsx     # Main navigation
│   │   ├── WalletConnection.tsx
│   │   ├── GrantCard.tsx
│   │   ├── AgentEvaluation.tsx
│   │   └── PageLayout.tsx
│   │
│   ├── context/              # React Context providers
│   │   ├── AuthContext.tsx   # Authentication state
│   │   └── ThemeContext.tsx
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── useApi.ts         # API call hooks
│   │   ├── useContract.ts    # Smart contract hooks
│   │   └── useAuth.ts
│   │
│   ├── lib/                  # Utility functions
│   │   ├── api.ts            # API client
│   │   ├── contracts.ts      # Contract ABIs
│   │   └── adminAuth.ts      # Admin authentication
│   │
│   └── types/                # TypeScript types
│       └── index.ts
│
├── public/                   # Static assets
├── .env.local               # Environment variables (not in git)
├── .env.example             # Environment template
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS config
└── tsconfig.json           # TypeScript configuration
```

---

## 🎯 Key Pages

### Homepage (`/`)
- Hero section with call-to-action
- Live statistics dashboard
- AI agent council introduction
- Feature highlights

### Grant Submission (`/submit`)
Multi-step form with sections:
1. Basic Information
2. Team Information
3. Budget & Funding
4. Timeline & Milestones
5. Technical Details
6. Links & Resources
7. Legal & Payment

**Features:**
- Form validation with Zod
- File uploads to IPFS
- Draft saving to localStorage
- Real-time validation feedback

### Grant Dashboard (`/grants`)
- View all your submitted grants
- Filter by status (pending, approved, rejected, active)
- Quick actions (view details, edit, withdraw)
- Status badges and progress indicators

### Grant Pipeline (`/pipeline`)
- Kanban-style workflow visualization
- Drag-and-drop status updates (admin only)
- Real-time status changes
- Evaluation progress tracking

### Agent Activity (`/activity`)
- Live feed of AI agent evaluations
- Vote breakdowns by agent type
- Evaluation summaries and scores
- Filter by grant or agent

### Admin Dashboard (`/admin`)
Protected route with password authentication.

**Features:**
- Platform statistics
- Grant management (approve/reject)
- User management
- System health monitoring
- Bulk operations

---

## 🔌 API Integration

### Python Services API

All API calls go through `/src/lib/api.ts`:

```typescript
import { apiClient } from '@/lib/api';

// Fetch grants
const grants = await apiClient.get('/api/v1/grants');

// Submit grant
const result = await apiClient.post('/api/v1/grants', grantData);

// Get evaluations
const evals = await apiClient.get(`/api/v1/evaluations/${grantId}`);
```

### React Query Hooks

Located in `/src/hooks/useApi.ts`:

```typescript
import { useGrants, useSubmitGrant } from '@/hooks/useApi';

// In component
const { data: grants, isLoading } = useGrants();
const { mutate: submitGrant } = useSubmitGrant();
```

---

## 🔐 Authentication

### Wallet Authentication

Using Thirdweb for Web3 wallet connection:

```typescript
import { useAddress, useDisconnect } from '@thirdweb-dev/react';

const address = useAddress();  // Connected wallet address
const disconnect = useDisconnect();
```

### Email/OTP Authentication

For users without wallets:

```typescript
import { useAuth } from '@/context/AuthContext';

const { login, verifyOTP, logout, isAuthenticated } = useAuth();

// Send OTP
await login('user@example.com');

// Verify OTP
await verifyOTP('user@example.com', '123456');
```

### Admin Authentication

Admin routes protected by password check:

```typescript
import { hasAdminAccess } from '@/lib/adminAuth';

const isAdmin = hasAdminAccess(walletAddress);
```

---

## 🎨 Styling

### Tailwind CSS

Using Tailwind v4 with custom configuration:

- **Colors**: Indigo, Cyan, Teal gradient palette
- **Components**: Pre-built UI components
- **Responsive**: Mobile-first design
- **Dark mode**: Ready (not yet implemented)

### Custom Components

Reusable components in `/src/components`:
- `PageLayout` - Consistent page wrapper
- `GrantCard` - Grant display card
- `StatusBadge` - Status indicators
- `LoadingSpinner` - Loading states

---

## 📝 Form Validation

Using `react-hook-form` + `zod`:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  projectName: z.string().min(5).max(100),
  email: z.string().email(),
  amount: z.number().positive(),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

---

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Testing Guide

See [`TESTING-GUIDE.md`](TESTING-GUIDE.md) for comprehensive testing checklist including:
- Form validation tests
- Component interaction tests
- API integration tests
- Responsive design tests

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

```bash
# Or use Vercel CLI
npm i -g vercel
vercel
```

### Self-Hosted

```bash
npm run build
npm start
```

Set environment variables in your hosting platform.

---

## 🔧 Configuration

### Next.js Config (`next.config.ts`)

```typescript
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['gateway.pinata.cloud'],  // IPFS images
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};
```

### TypeScript Config

Strict mode enabled with path aliases:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 🐛 Troubleshooting

### Contract Connection Issues

```bash
# Verify contract addresses in .env.local
# Ensure wallet is connected to Sepolia testnet
# Check Python services are running on port 8000
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Wallet Connection Problems

- Ensure Thirdweb client ID is valid
- Check wallet is on correct network (Sepolia)
- Try disconnecting and reconnecting wallet

### API Request Failures

- Verify Python services are running: http://localhost:8000/health
- Check CORS settings in Python services
- Verify API URL in `.env.local`

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Thirdweb Docs](https://portal.thirdweb.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com/)

---

## 🎯 Development Tips

### Hot Reload

Next.js automatically reloads on file changes. If it stops:

```bash
# Restart dev server
Ctrl+C
npm run dev
```

### Component Development

Use React DevTools browser extension for debugging.

### State Management

- Local state: `useState`
- Form state: `react-hook-form`
- Server state: `@tanstack/react-query`
- Auth state: `AuthContext`

### Performance

- Use `next/image` for images
- Implement code splitting with dynamic imports
- Use React.memo for expensive components
- Lazy load heavy components

---

## 📞 Support

Frontend issues?
- Check browser console for errors
- Open [GitHub Issue](https://github.com/pryyyynz/agentdao/issues)
- Email: dugboryeleprince@gmail.com