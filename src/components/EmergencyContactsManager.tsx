import { useState } from 'react';
import { useEmergencyContacts, EmergencyContact } from '@/hooks/useEmergencyContacts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Star, Phone, Mail, User, Users, Loader2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function EmergencyContactsManager() {
  const { contacts, isLoading, createContact, updateContact, deleteContact } = useEmergencyContacts();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setRelationship('');
    setIsPrimary(false);
    setEditingContact(null);
  };

  const handleOpenDialog = (contact?: EmergencyContact) => {
    if (contact) {
      setEditingContact(contact);
      setName(contact.name);
      setPhone(contact.phone);
      setEmail(contact.email || '');
      setRelationship(contact.relationship || '');
      setIsPrimary(contact.is_primary);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      toast({
        title: 'Error',
        description: 'Name and phone are required',
        variant: 'destructive',
      });
      return;
    }

    // Basic phone validation
    const phoneRegex = /^[\d\s+()-]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      toast({
        title: 'Invalid Phone',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingContact) {
        await updateContact.mutateAsync({
          id: editingContact.id,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          relationship: relationship.trim() || null,
          is_primary: isPrimary,
        });
        toast({
          title: 'Contact Updated',
          description: `${name} has been updated`,
        });
      } else {
        await createContact.mutateAsync({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          relationship: relationship.trim() || undefined,
          is_primary: isPrimary,
        });
        toast({
          title: 'Contact Added',
          description: `${name} has been added as an emergency contact`,
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleDelete = async (contact: EmergencyContact) => {
    try {
      await deleteContact.mutateAsync(contact.id);
      toast({
        title: 'Contact Removed',
        description: `${contact.name} has been removed`,
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleSetPrimary = async (contact: EmergencyContact) => {
    try {
      await updateContact.mutateAsync({ id: contact.id, is_primary: true });
      toast({
        title: 'Primary Contact Set',
        description: `${contact.name} is now your primary emergency contact`,
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Emergency Contacts
            </CardTitle>
            <CardDescription>
              Contacts to notify when SOS is triggered (email required for notifications)
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingContact 
                      ? 'Update the contact information'
                      : 'Add someone who will be notified in case of emergency'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contact-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contact-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email (Optional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-relationship">Relationship (Optional)</Label>
                    <Input
                      id="contact-relationship"
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      placeholder="e.g., Spouse, Parent, Friend"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="is-primary">Primary Contact</Label>
                      <p className="text-xs text-muted-foreground">
                        First person to be contacted
                      </p>
                    </div>
                    <Switch
                      id="is-primary"
                      checked={isPrimary}
                      onCheckedChange={setIsPrimary}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createContact.isPending || updateContact.isPending}>
                    {(createContact.isPending || updateContact.isPending) ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : editingContact ? (
                      'Update Contact'
                    ) : (
                      'Add Contact'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No emergency contacts added yet</p>
            <p className="text-sm mt-1">Add contacts to be notified during SOS</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{contact.name}</p>
                      {contact.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Primary
                        </Badge>
                      )}
                      {!contact.email && (
                        <Badge variant="outline" className="text-xs text-warning border-warning">
                          No email (won't receive SOS)
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                      )}
                      {contact.relationship && (
                        <span>• {contact.relationship}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!contact.is_primary && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSetPrimary(contact)}
                      title="Set as primary"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(contact)}
                    title="Edit contact"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Contact</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {contact.name} from your emergency contacts?
                          They will no longer be notified during SOS.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(contact)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
