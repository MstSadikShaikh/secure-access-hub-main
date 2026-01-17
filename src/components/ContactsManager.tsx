import { useState } from 'react';
import { useContacts, ContactStatus } from '@/hooks/useContacts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContactStatusBadge } from './ContactStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ChevronDown, Pencil, Trash2, Check, X } from 'lucide-react';

export function ContactsManager() {
  const { contacts, isLoading, updateContactStatus, updateContactName, deleteContact } = useContacts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleEditName = (contactId: string, currentName: string | null) => {
    setEditingId(contactId);
    setEditName(currentName || '');
  };

  const handleSaveName = (contactId: string) => {
    updateContactName.mutate({ contactId, name: editName });
    setEditingId(null);
  };

  const handleStatusChange = (contactId: string, status: ContactStatus) => {
    updateContactStatus.mutate({ contactId, status });
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            Trusted Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-lg font-display">Trusted Contacts</CardTitle>
            <CardDescription>Manage your saved UPI contacts</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No contacts yet</p>
            <p className="text-sm">Contacts are automatically added when you make transactions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  {editingId === contact.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Contact name"
                        className="h-8 bg-background"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-success hover:text-success"
                        onClick={() => handleSaveName(contact.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="font-mono text-foreground truncate">{contact.upi_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {contact.contact_name || 'No name set'}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 p-0 hover:bg-transparent">
                        <ContactStatusBadge status={contact.status} size="sm" />
                        <ChevronDown className="ml-1 h-3 w-3 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStatusChange(contact.id, 'trusted')}>
                        <ContactStatusBadge status="trusted" size="sm" />
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(contact.id, 'new')}>
                        <ContactStatusBadge status="new" size="sm" />
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(contact.id, 'flagged')}>
                        <ContactStatusBadge status="flagged" size="sm" />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {editingId !== contact.id && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEditName(contact.id, contact.contact_name)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteContact.mutate(contact.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
