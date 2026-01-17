import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  relationship: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateContactData {
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  is_primary?: boolean;
}

export function useEmergencyContacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['emergency-contacts', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmergencyContact[];
    },
    enabled: !!user,
  });

  const createContact = useMutation({
    mutationFn: async (contactData: CreateContactData) => {
      if (!user) throw new Error('Not authenticated');

      // If setting as primary, unset other primaries first
      if (contactData.is_primary) {
        await supabase
          .from('emergency_contacts')
          .update({ is_primary: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert({
          user_id: user.id,
          ...contactData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
      toast({
        title: 'Contact Added',
        description: 'Emergency contact has been added successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add contact',
        variant: 'destructive',
      });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<EmergencyContact> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');

      // If setting as primary, unset other primaries first
      if (updateData.is_primary) {
        await supabase
          .from('emergency_contacts')
          .update({ is_primary: false })
          .eq('user_id', user.id)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('emergency_contacts')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
      toast({
        title: 'Contact Updated',
        description: 'Emergency contact has been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update contact',
        variant: 'destructive',
      });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
      toast({
        title: 'Contact Deleted',
        description: 'Emergency contact has been removed',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete contact',
        variant: 'destructive',
      });
    },
  });

  return {
    contacts,
    isLoading,
    createContact,
    updateContact,
    deleteContact,
  };
}
