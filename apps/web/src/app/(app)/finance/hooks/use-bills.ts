'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import { financeKeys } from './use-finance';
import type {
  Bill,
  BillResponse,
  BillsListResponse,
  CreateBillInput,
  UpdateBillInput,
  BillQueryParams,
  BillTotals,
} from '../types';

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to fetch bills list with optional filters
 *
 * @param params - Query parameters for filtering
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function useBills(params: BillQueryParams = {}) {
  const api = useAuthenticatedApi();
  const { monthYear, category, status, isRecurring, limit = 50, offset = 0 } = params;

  return useQuery({
    queryKey: financeKeys.billsList({ monthYear, category, status, isRecurring, limit, offset }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (monthYear) searchParams.set('monthYear', monthYear);
      if (category) searchParams.set('category', category);
      if (status) searchParams.set('status', status);
      if (isRecurring !== undefined) searchParams.set('isRecurring', String(isRecurring));
      if (limit) searchParams.set('limit', String(limit));
      if (offset) searchParams.set('offset', String(offset));

      const query = searchParams.toString();
      const response = await api.get<BillsListResponse>(
        `/finance/bills${query ? `?${query}` : ''}`
      );
      return response;
    },
    enabled: api.isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch single bill by ID
 *
 * @param id - Bill ID
 */
export function useBill(id: string | undefined) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: [...financeKeys.bills(), id],
    queryFn: async () => {
      const response = await api.get<BillResponse>(`/finance/bills/${id}`);
      return response.bill;
    },
    enabled: api.isAuthenticated && !!id,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook to create a new bill
 */
export function useCreateBill() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBillInput) => {
      const response = await api.post<BillResponse>('/finance/bills', data);
      return response.bill;
    },
    onSuccess: (_, variables) => {
      // Invalidate bills list and summary for the month
      queryClient.invalidateQueries({ queryKey: financeKeys.bills() });
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(variables.monthYear) });
    },
  });
}

/**
 * Hook to update an existing bill
 */
export function useUpdateBill() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBillInput }) => {
      const response = await api.patch<BillResponse>(`/finance/bills/${id}`, data);
      return response.bill;
    },
    onSuccess: (bill) => {
      // Invalidate bills list and summary
      queryClient.invalidateQueries({ queryKey: financeKeys.bills() });
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(bill.monthYear) });
    },
  });
}

/**
 * Hook to delete a bill
 */
export function useDeleteBill() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, monthYear }: { id: string; monthYear: string }) => {
      await api.delete(`/finance/bills/${id}`);
      return { id, monthYear };
    },
    onSuccess: (_, variables) => {
      // Invalidate bills list and summary
      queryClient.invalidateQueries({ queryKey: financeKeys.bills() });
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(variables.monthYear) });
    },
  });
}

/**
 * Hook to mark a bill as paid
 */
export function useMarkBillPaid() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, monthYear }: { id: string; monthYear: string }) => {
      const response = await api.patch<BillResponse>(`/finance/bills/${id}/mark-paid`);
      return { bill: response.bill, monthYear };
    },
    onSuccess: (_, variables) => {
      // Invalidate bills list and summary
      queryClient.invalidateQueries({ queryKey: financeKeys.bills() });
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(variables.monthYear) });
    },
  });
}

/**
 * Hook to mark a bill as unpaid (revert to pending)
 */
export function useMarkBillUnpaid() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, monthYear }: { id: string; monthYear: string }) => {
      const response = await api.patch<BillResponse>(`/finance/bills/${id}/mark-unpaid`);
      return { bill: response.bill, monthYear };
    },
    onSuccess: (_, variables) => {
      // Invalidate bills list and summary
      queryClient.invalidateQueries({ queryKey: financeKeys.bills() });
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(variables.monthYear) });
    },
  });
}

// =============================================================================
// Computed Helpers
// =============================================================================

/**
 * Calculate bill totals from list
 *
 * @param bills - List of bills
 * @returns Aggregated totals
 */
export function calculateBillTotals(bills: Bill[]): BillTotals {
  return bills.reduce(
    (acc, bill) => {
      const amount = typeof bill.amount === 'string' ? parseFloat(bill.amount) : bill.amount;
      const isPaid = bill.status === 'paid';
      const isPending = bill.status === 'pending';
      const isOverdue = bill.status === 'overdue';

      return {
        total: acc.total + amount,
        paid: acc.paid + (isPaid ? amount : 0),
        pending: acc.pending + (isPending ? amount : 0),
        overdue: acc.overdue + (isOverdue ? amount : 0),
        count: acc.count + 1,
        paidCount: acc.paidCount + (isPaid ? 1 : 0),
        pendingCount: acc.pendingCount + (isPending ? 1 : 0),
        overdueCount: acc.overdueCount + (isOverdue ? 1 : 0),
      };
    },
    {
      total: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      count: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
    }
  );
}
