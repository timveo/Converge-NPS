import { useState, useEffect } from 'react';
import { Search, UserCog, Shield, X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type AppRole = 'admin' | 'staff' | 'participant' | 'faculty' | 'student' | 'industry';

interface UserWithRoles {
  id: string;
  full_name: string;
  email: string;
  role: string | null;
  organization: string | null;
  created_at: string;
  roles: AppRole[];
}

interface UsersResponse {
  success: boolean;
  data: Array<{
    id: string;
    email: string;
    fullName?: string;
    full_name?: string;
    role?: string;
    organization?: string;
    createdAt?: string;
    created_at?: string;
    roles?: string[];
    userRoles?: Array<{ role: string }>;
  }>;
}

interface UserManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserManagementModal({ open, onOpenChange }: UserManagementModalProps) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRoles[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [roleToAdd, setRoleToAdd] = useState<AppRole | ''>('');
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get<UsersResponse>('/admin/users?limit=100');
      if (response.success) {
        const usersWithRoles: UserWithRoles[] = response.data.map((profile) => {
          const roles =
            profile.roles ||
            profile.userRoles?.map((r) => r.role as AppRole) ||
            [];

          return {
            id: profile.id,
            full_name: profile.full_name || profile.fullName || profile.email,
            email: profile.email,
            role: profile.role || null,
            organization: profile.organization || null,
            created_at: profile.created_at || profile.createdAt || new Date().toISOString(),
            roles: roles as AppRole[],
          };
        });

        setUsers(usersWithRoles);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (u) =>
        u.email.toLowerCase().includes(query) ||
        u.full_name.toLowerCase().includes(query) ||
        u.organization?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  };

  const handleAddRole = async () => {
    if (!selectedUser || !roleToAdd) return;

    try {
      await api.post(`/admin/users/${selectedUser.id}/roles`, {
        role: roleToAdd,
      });

      toast.success(`${roleToAdd} role assigned to ${selectedUser.full_name}`);
      setShowAddRoleDialog(false);
      setRoleToAdd('');
      setSelectedUser(null);
      await fetchUsers();
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error('User already has this role');
      } else {
        console.error('Failed to add role:', error);
        toast.error('Failed to add role');
      }
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole, userName: string) => {
    try {
      await api.delete(`/admin/users/${userId}/roles/${role}`);
      toast.success(`${role} role removed from ${userName}`);
      await fetchUsers();
    } catch (error) {
      console.error('Failed to remove role:', error);
      toast.error('Failed to remove role');
    }
  };

  const openAddRoleDialog = (u: UserWithRoles) => {
    setSelectedUser(u);
    setRoleToAdd('');
    setShowAddRoleDialog(true);
  };

  const getRoleBadgeVariant = (role: AppRole): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'admin':
      case 'staff':
        return 'default';
      case 'faculty':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const UserCardSkeleton = () => (
    <Card className="p-4 border-border">
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-48 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="mt-3">
        <Skeleton className="h-3 w-20 mb-2" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
      </div>
    </Card>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-24px)] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <DialogTitle className="text-lg">User Management</DialogTitle>
                <DialogDescription className="text-sm">
                  {users.length} total users
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or organization..."
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-3 py-4">
              {loading ? (
                <>
                  <UserCardSkeleton />
                  <UserCardSkeleton />
                  <UserCardSkeleton />
                </>
              ) : filteredUsers.length === 0 ? (
                <Card className="p-8 text-center">
                  <UserCog className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground mb-2">No users found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search query
                  </p>
                </Card>
              ) : (
                filteredUsers.map((u) => (
                  <Card
                    key={u.id}
                    className="p-4 border-border hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-900 to-blue-800 flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm">
                        {u.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {u.full_name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        {u.organization && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {u.organization}
                          </p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAddRoleDialog(u)}
                        className="gap-1 h-8 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                        Add Role
                      </Button>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Assigned Roles
                      </p>
                      {u.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {u.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={getRoleBadgeVariant(role)}
                              className="gap-1 pr-1 text-xs"
                            >
                              {role}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => handleRemoveRole(u.id, role, u.full_name)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No roles assigned</p>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Role to {selectedUser?.full_name}</DialogTitle>
            <DialogDescription>
              Assign a new role to this user. They will gain the associated permissions
              immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={roleToAdd} onValueChange={(value) => setRoleToAdd(value as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role to add" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>

            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Role Descriptions:</strong>
              </p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>
                  <strong>Admin:</strong> Full system access
                </li>
                <li>
                  <strong>Staff:</strong> Event check-in access
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole} disabled={!roleToAdd}>
              Add Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
