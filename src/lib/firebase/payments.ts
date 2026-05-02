// src/lib/firebase/payments.ts
import {
  collection, doc, addDoc, updateDoc, getDocs, deleteDoc,
  query, where, orderBy, Timestamp
} from 'firebase/firestore'
import { db } from './config'
import type { Payment } from '../types'

const COL = 'payments'

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined
  if (v instanceof Timestamp) return v.toDate()
  if (v instanceof Date) return v
  return new Date(v as string)
}

function mapDoc(id: string, data: Record<string, unknown>): Payment {
  return {
    id,
    ...(data as Omit<Payment, 'id' | 'paidDate' | 'dueDate' | 'createdAt'>),
    paidDate: toDate(data.paidDate),
    dueDate: toDate(data.dueDate)!,
    createdAt: toDate(data.createdAt)!,
  }
}

export async function getPayments(): Promise<Payment[]> {
  const q = query(collection(db, COL), orderBy('dueDate', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => mapDoc(d.id, d.data() as Record<string, unknown>))
}

export async function getPaymentsByTenant(tenantId: string): Promise<Payment[]> {
  const q = query(
    collection(db, COL),
    where('tenantId', '==', tenantId),
    orderBy('dueDate', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => mapDoc(d.id, d.data() as Record<string, unknown>))
}

export async function getPaymentsByProperty(propertyId: string): Promise<Payment[]> {
  const q = query(
    collection(db, COL),
    where('propertyId', '==', propertyId),
    orderBy('dueDate', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => mapDoc(d.id, d.data() as Record<string, unknown>))
}

export async function getPaymentsByMonth(month: number, year: number): Promise<Payment[]> {
  const q = query(
    collection(db, COL),
    where('month', '==', month),
    where('year', '==', year)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => mapDoc(d.id, d.data() as Record<string, unknown>))
}

export async function getPendingPayments(): Promise<Payment[]> {
  const q = query(
    collection(db, COL),
    where('status', 'in', ['pending', 'overdue', 'partial'])
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => mapDoc(d.id, d.data() as Record<string, unknown>))
}

export async function deletePayment(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

export async function addPayment(
  data: Omit<Payment, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    amount: Number(data.amount),
    partialAmount: data.partialAmount ? Number(data.partialAmount) : null,
    dueDate: data.dueDate instanceof Date ? Timestamp.fromDate(data.dueDate) : data.dueDate,
    paidDate: data.paidDate instanceof Date ? Timestamp.fromDate(data.paidDate) : (data.paidDate || null),
    createdAt: Timestamp.now(),
  })
  return ref.id
}

export async function recordPayment(
  paymentId: string,
  amountPaid: number,
  paidDate: Date,
  notes?: string
): Promise<void> {
  const paymentRef = doc(db, COL, paymentId)
  const { getDoc } = await import('firebase/firestore')
  const paySnap = await getDoc(paymentRef)
  if (!paySnap.exists()) return

  const payment = paySnap.data() as Record<string, unknown>
  const totalAmount = payment.amount as number
  const statusToSet: Payment['status'] = amountPaid === 0 ? 'pending' : (amountPaid < totalAmount ? 'partial' : 'paid')

  await updateDoc(paymentRef, {
    status: statusToSet,
    paidDate: amountPaid > 0 ? Timestamp.fromDate(paidDate) : null,
    partialAmount: amountPaid < totalAmount && amountPaid > 0 ? amountPaid : null,
    notes: notes || null,
  })
}

export async function updatePayment(id: string, data: Partial<Payment>): Promise<void> {
  const payload: Record<string, unknown> = { ...data }
  if (data.dueDate !== undefined) {
    payload.dueDate = data.dueDate instanceof Date ? Timestamp.fromDate(data.dueDate) : data.dueDate
  }
  if (data.paidDate !== undefined) {
    payload.paidDate = data.paidDate
      ? (data.paidDate instanceof Date ? Timestamp.fromDate(data.paidDate) : Timestamp.fromDate(new Date(data.paidDate as unknown as string)))
      : null
  }
  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined) payload[key] = null
  })
  await updateDoc(doc(db, COL, id), payload)
}

export async function generateMonthlyPayments(
  tenantId: string,
  propertyId: string,
  tenantName: string,
  propertyNumber: string,
  monthlyRent: number,
  month: number,
  year: number,
  moveInDate?: Date | string | Timestamp
): Promise<void> {
  // Get all existing payment months for this tenant
  const existingQ = query(collection(db, COL), where('tenantId', '==', tenantId))
  const existingSnap = await getDocs(existingQ)
  const existingKeys = new Set(
    existingSnap.docs.map(d => {
      const data = d.data() as Record<string, unknown>
      return `${data.month}-${data.year}`
    })
  )

  let dueDay = 5
  if (moveInDate) {
    const d = moveInDate instanceof Timestamp ? moveInDate.toDate() : new Date(moveInDate as string | Date)
    if (!isNaN(d.getTime())) dueDay = d.getDate()
  }

  // Generate from move-in month up to current month
  const startDate = moveInDate
    ? (moveInDate instanceof Timestamp ? moveInDate.toDate() : new Date(moveInDate as string | Date))
    : new Date(year, month - 1, 1)

  const now = new Date()
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const { writeBatch: wb } = await import('firebase/firestore')
  const batch = wb(db)
  let count = 0

  while (cursor <= endMonth) {
    const m = cursor.getMonth() + 1
    const y = cursor.getFullYear()
    const key = `${m}-${y}`

    if (!existingKeys.has(key)) {
      const dueDate = new Date(y, m - 1, dueDay)
      const newRef = doc(collection(db, COL))
      batch.set(newRef, {
        tenantId, propertyId, tenantName, propertyNumber,
        amount: monthlyRent, month: m, year: y,
        dueDate: Timestamp.fromDate(dueDate),
        status: new Date() > dueDate ? 'overdue' : 'pending',
        partialAmount: null,
        paidDate: null,
        notes: null,
        createdAt: Timestamp.now(),
      })
      count++
      // Firestore batch limit is 500
      if (count % 499 === 0) {
        await batch.commit()
      }
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }

  if (count > 0 && count % 499 !== 0) await batch.commit()
}

export async function updateOverduePayments(): Promise<void> {
  const now = new Date()
  const q = query(collection(db, COL), where('status', '==', 'pending'))
  const snap = await getDocs(q)
  const { writeBatch } = await import('firebase/firestore')
  const batch = writeBatch(db)
  snap.docs.forEach(d => {
    const data = d.data() as Record<string, unknown>
    const dueDate = toDate(data.dueDate)!
    if (dueDate < now) batch.update(d.ref, { status: 'overdue' })
  })
  await batch.commit()
}
export async function deleteDuplicatePayments(): Promise<void> {
  const snap = await getDocs(collection(db, COL))
  const seen = new Map<string, string>() // key -> first doc id
  const { writeBatch: wb } = await import('firebase/firestore')
  const batch = wb(db)
  let count = 0

  snap.docs.forEach(d => {
    const data = d.data() as Record<string, unknown>
    const key = `${data.tenantId}-${data.month}-${data.year}`
    if (seen.has(key)) {
      // Delete the duplicate
      batch.delete(doc(db, COL, d.id))
      count++
    } else {
      seen.set(key, d.id)
    }
  })

  if (count > 0) await batch.commit()
}