import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  notification_email: string | null;
  phone: string | null;
  sos_enabled: boolean;
  shake_detection_enabled: boolean;
  alarm_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  full_name?: string;
  notification_email?: string;
  phone?: string;
  sos_enabled?: boolean;
  shake_detection_enabled?: boolean;
  alarm_enabled?: boolean;
}

export function useUserSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
  });

  const updateProfile = useMutation({
    mutationFn: async (updateData: UpdateProfileData) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({
        title: 'Settings Saved',
        description: 'Your profile settings have been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      });
    },
  });

  return {
    profile,
    isLoading,
    updateProfile,
    sosEnabled: profile?.sos_enabled ?? false,
    shakeDetectionEnabled: profile?.shake_detection_enabled ?? false,
    alarmEnabled: profile?.alarm_enabled ?? false,
  };
}
