# Grantify Frontend

🚀 **Live**: [https://grantify-neon.vercel.app](https://grantify-neon.vercel.app)

Next.js 16 web application for grant submission, tracking, and agent activity visualization.

> **Note**: This README covers the **production deployment**. For local development setup, see the [`local` branch](https://github.com/pryyyynz/agentdao/tree/local).

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

## 🚀 Production Access

### Live Application

**URL**: [https://grantify-neon.vercel.app](https://grantify-neon.vercel.app)

**Prerequisites**:
- MetaMask or compatible Web3 wallet
- Sepolia testnet configured
- Sepolia ETH for gas fees ([Get testnet ETH](https://sepoliafaucet.com/))

### Production Configuration

The frontend is deployed on **Vercel** with the following environment:

```env
NEXT_PUBLIC_API_URL=https://agentdao.onrender.com
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=[configured]
NEXT_PUBLIC_GRANT_REGISTRY_ADDRESS=0x6d77f3a5dcad33cbEbf431Fee6F67E5930148D17
NEXT_PUBLIC_GRANT_TREASURY_ADDRESS=0x71C74477ae190d7eeF762d01AC091D021a5AbAa6
NEXT_PUBLIC_AGENT_VOTING_ADDRESS=0x19Fe9e5e12fc5C1657E299aC69878965367A294D
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_NETWORK_NAME=sepolia
```

### Local Development

To run the frontend locally or contribute:

```bash
git clone https://github.com/pryyyynz/agentdao.git
cd agentdao
git checkout local
cd frontend
```

See the [`local` branch README](https://github.com/pryyyynz/agentdao/tree/local/frontend) for:
- Installation instructions
- Environment setup
- Development server
- Testing procedures

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

### Production Testing

The live application has been tested for:
- ✅ Grant submission flow
- ✅ Wallet connection (MetaMask, WalletConnect)
- ✅ Real-time agent activity updates
- ✅ Admin dashboard functionality
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Email OTP authentication

### Test the Platform

Try it yourself at [https://grantify-neon.vercel.app](https://grantify-neon.vercel.app)

### Local Testing & Development

For running tests locally, see the [`local` branch](https://github.com/pryyyynz/agentdao/tree/local) which includes:
- Unit test suite
- Integration tests
- Component testing with React Testing Library
- E2E testing guide

See [`TESTING-GUIDE.md`](TESTING-GUIDE.md) for comprehensive testing checklist.

---

## 🚢 Deployment

### Current Production Deployment

**Platform**: Vercel  
**URL**: [https://grantify-neon.vercel.app](https://grantify-neon.vercel.app)  
**Status**: ✅ Live

**Deployment Details**:
- Automatic deployments from `main` branch
- Environment variables configured in Vercel dashboard
- Edge functions for optimal performance
- CDN distribution globally

### Deploying Your Own Instance

#### Option 1: Vercel (Recommended)

1. Fork this repository
2. Import to Vercel: [https://vercel.com/new](https://vercel.com/new)
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`
   - `NEXT_PUBLIC_GRANT_REGISTRY_ADDRESS`
   - `NEXT_PUBLIC_GRANT_TREASURY_ADDRESS`
   - `NEXT_PUBLIC_AGENT_VOTING_ADDRESS`
   - `NEXT_PUBLIC_CHAIN_ID`
4. Deploy

#### Option 2: Self-Hosted

For self-hosting instructions, see the [`local` branch](https://github.com/pryyyynz/agentdao/tree/local).

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

### Common Issues

#### Wallet Won't Connect

- Ensure you're on Sepolia testnet
- Try disconnecting and reconnecting
- Clear browser cache
- Update MetaMask to latest version

#### Transaction Fails

- Check you have Sepolia ETH for gas
- Verify contract addresses are correct
- Check network congestion: [Sepolia Explorer](https://sepolia.etherscan.io/)

#### Page Not Loading

- Check your internet connection
- Try clearing browser cache
- Verify backend services are up: [https://agentdao.onrender.com/health](https://agentdao.onrender.com/health)

#### Grant Submission Stuck

- Check browser console for errors (F12)
- Ensure all required fields are filled
- Try refreshing and submitting again
- Contact support if issue persists

### Development Issues

For local development troubleshooting, see the [`local` branch README`](https://github.com/pryyyynz/agentdao/tree/local).

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