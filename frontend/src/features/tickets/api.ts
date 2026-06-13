import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiGetPaginated, downloadFile, type QueryParams } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { Ticket, TicketSummary } from '@/types';

export interface TicketFilters {
  status?: string;
  priority?: string;
  department?: string;
  assignee?: string;
  requester?: string;
  q?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  department: string;
  category: string;
  priority?: string;
  requester?: string;
  isInternal?: boolean;
}

export function useTickets(filters: TicketFilters) {
  return useQuery({
    queryKey: queryKeys.tickets(filters),
    queryFn: () => apiGetPaginated<TicketSummary>('/tickets', filters as QueryParams),
    placeholderData: keepPreviousData,
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: queryKeys.ticket(id),
    queryFn: () => api.get<{ ticket: Ticket }>(`/tickets/${id}`),
    select: (data) => data.ticket,
    enabled: Boolean(id),
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => api.post<{ ticket: Ticket }>('/tickets', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateTicket(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      api.patch<{ ticket: Ticket }>(`/tickets/${id}`, input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.ticket(id), data);
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useAssignTicket(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignee: string | null) =>
      api.patch<{ ticket: Ticket }>(`/tickets/${id}/assign`, { assignee }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.ticket(id), data);
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useAddComment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.post<{ ticket: Ticket }>(`/tickets/${id}/comments`, { body }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.ticket(id), data);
    },
  });
}

export function useUploadAttachments(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      for (const file of files) form.append('files', file);
      return api.post<{ ticket: Ticket }>(`/tickets/${id}/attachments`, form);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.ticket(id), data);
    },
  });
}

export function downloadAttachment(
  ticketId: string,
  attachmentId: string,
  fileName: string,
): Promise<void> {
  return downloadFile(`/tickets/${ticketId}/attachments/${attachmentId}`, fileName);
}
