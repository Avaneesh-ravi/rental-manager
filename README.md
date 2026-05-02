# RentFlow — Property Management System

A full-stack rental revenue collection app for managing 30 houses and 10 shops.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore + Auth + Storage)
- **Hosting**: Vercel
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Export**: jsPDF + xlsx

---

## Folder Structure

```
rental-manager/
├── src/
│   ├── app/
│   │   ├── auth/login/         # Login page
│   │   ├── dashboard/          # Dashboard overview
│   │   ├── properties/         # Property management
│   │   ├── tenants/            # Tenant management + history
│   │   ├── payments/           # Payment tracking
│   │   ├── reports/            # Reports + export
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Redirect to /dashboard
│   ├── components/
│   │   ├── ui/                 # StatCard, Modal, Badge, etc.
│   │   ├── layout/             # Sidebar, AuthGuard
│   │   └── forms/              # PropertyForm, TenantForm, PaymentForm
│   ├── lib/
│   │   ├── firebase/           # config, auth, properties, tenants, payments
│   │   ├── hooks/              # useAuth context
│   │   ├── types/              # TypeScript interfaces
│   │   └── utils/              # helpers, formatters, export
│   └── styles/
│       └── globals.css
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── vercel.json
└── .env.local.example
```

---

## Firestore Schema

### `properties` collection
```
{
  id: string (auto),
  propertyNumber: "H001" | "S001",
  type: "house" | "shop",
  address: string,
  area?: string,
  monthlyRent: number,
  currentTenantId?: string,
  notes?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `tenants` collection
```
{
  id: string (auto),
  propertyId: string,
  fullName: string,
  aadhaarNumber: string (12 digits),
  phoneNumber: string (10 digits),
  address: string,
  photoUrl?: string,
  moveInDate: Timestamp,
  moveOutDate?: Timestamp,
  isActive: boolean,
  monthlyRent: number,
  depositAmount?: number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `payments` collection
```
{
  id: string (auto),
  tenantId: string,
  propertyId: string,
  tenantName: string,
  propertyNumber: string,
  amount: number,
  month: number (1–12),
  year: number,
  dueDate: Timestamp,
  paidDate?: Timestamp,
  status: "paid" | "pending" | "overdue" | "partial",
  partialAmount?: number,
  notes?: string,
  createdAt: Timestamp
}
```

---

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Create your admin user in Authentication → Users
5. Enable **Firestore Database** (start in production mode)
6. Enable **Storage**
7. Go to Project Settings → Your apps → Add web app
8. Copy the config values

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Firebase values:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 3. Deploy Firestore Rules & Indexes

Install Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init firestore
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

### 4. Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or push to GitHub and import in [vercel.com](https://vercel.com).

**Add environment variables** in Vercel Dashboard → Project Settings → Environment Variables (same keys as .env.local).

---

## Features

- ✅ Admin login (Firebase Auth)
- ✅ Property management (houses + shops)
- ✅ Tenant management with photo upload
- ✅ Automatic tenant archiving when new tenant added (houses)
- ✅ Full tenant history per property
- ✅ Monthly payment tracking (paid/pending/overdue/partial)
- ✅ One-click generate payments for all tenants
- ✅ Dashboard with charts
- ✅ Search & filter everywhere
- ✅ Export to PDF and Excel
- ✅ Mobile responsive
- ✅ Aadhaar masking for privacy

---

## Usage Tips

1. **First run**: Add your properties first, then add tenants
2. **Monthly workflow**: Use "Generate Monthly" in Payments each month to create records for all tenants
3. **New tenant (house)**: Adding a new tenant automatically archives the previous one
4. **History**: Click the history icon on any tenant to see all past tenants and payments for that property
5. **Overdue**: Payments past due date auto-update to "overdue" status
