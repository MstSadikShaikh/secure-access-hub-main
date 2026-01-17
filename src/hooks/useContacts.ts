import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type ContactStatus = 'trusted' | 'new' | 'flagged';

export interface Contact {
  id: string;
  user_id: string;
  upi_id: string;
  contact_name: string | null;
  status: ContactStatus;
  created_at: string;
  updated_at: string;
}

export function useContacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ['contacts', user?.id],
    queryFn: async (): Promise<Contact[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('trusted_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const updateContactStatus = useMutation({
    mutationFn: async ({ contactId, status }: { contactId: string; status: ContactStatus }) => {
      const { data, error } = await supabase
        .from('trusted_contacts')
        .update({ status })
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Contact status updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update contact', description: error.message, variant: 'destructive' });
    },
  });

  const updateContactName = useMutation({
    mutationFn: async ({ contactId, name }: { contactId: string; name: string }) => {
      const { data, error } = await supabase
        .from('trusted_contacts')
        .update({ contact_name: name })
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Contact name updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update contact name', description: error.message, variant: 'destructive' });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('trusted_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Contact removed' });
    },
    onError: (error) => {
      toast({ title: 'Failed to remove contact', description: error.message, variant: 'destructive' });
    },
  });

  return {
    contacts: contacts || [],
    isLoading,
    error,
    updateContactStatus,
    updateContactName,
    deleteContact,
  };
}
