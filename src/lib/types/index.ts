// src/lib/types/index.ts

export type PropertyType = 'house' | 'shop'

export interface Property {
  id: string
  propertyNumber: string
  type: PropertyType
  address: string
  area?: string
  monthlyRent: number
  currentTenantId?: string
  createdAt: Date
  updatedAt: Date
  notes?: string
}

export interface Tenant {
  id: string
  propertyId: string
  fullName: string
  aadhaarNumber: string
  phoneNumber: string
  address: string
  photoUrl?: string
  moveInDate: Date
  moveOutDate?: Date
  isActive: boolean
  monthlyRent: number
  depositAmount?: number
  createdAt: Date
  updatedAt: Date
}

export interface Payment {
  id: string
  tenantId: string
  propertyId: string
  tenantName: string
  propertyNumber: string
  amount: number
  month: number   // 1-12
  year: number
  paidDate?: Date
  dueDate: Date
  status: 'paid' | 'pending' | 'overdue' | 'partial'
  partialAmount?: number
  notes?: string
  createdAt: Date
}

export interface DashboardStats {
  totalProperties: number
  occupiedProperties: number
  vacantProperties: number
  totalMonthlyRent: number
  collectedThisMonth: number
  pendingThisMonth: number
  overduePayments: number
}

export interface TenantHistory {
  tenant: Tenant
  payments: Payment[]
}

export type MaintenanceStatus = 'pending' | 'inprogress' | 'resolved'

export interface MaintenanceRequest {
  id: string
  propertyId: string
  title: string
  description?: string
  status: MaintenanceStatus
  cost?: number
  dateRaised: Date
  dateResolved?: Date
  createdAt: Date
  updatedAt: Date
}