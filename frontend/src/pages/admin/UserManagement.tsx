import { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Search, UserCog, Shield, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
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

type AppRole = 'admin' | 'faculty' | 'student' | 'industry' | 'staff';

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
  pagination?: {
    total: number;
  };
}

export default function UserManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRoles[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [roleToAdd, setRoleToAdd] = useState<AppRole | ''>('');
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  const checkAdminAccess = async () => {
    if (!user) {
      toast.error('You must be logged in');
      navigate('/auth');
      return;
    }

    const hasAdminRole = user.roles?.includes('admin');

    if (!hasAdminRole) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }

    setIsAdmin(true);
    setCheckingAuth(false);
    await fetchUsers();
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get<UsersResponse>('/admin/users?limit=1000');
      if (response.success) {
        const usersWithRoles: UserWithRoles[] = response.data.map((profile) => {
          // Handle different response formats
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
        return 'default';
      case 'staff':
        return 'default';
      case 'faculty':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 md:h-12 md:w-12 animate-spin text-primary mx-auto mb-3 md:mb-4" />
          <p className="text-sm md:text-base text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      {/* Header */}
      <div className="container mx-auto px-3 md:px-4 pt-2 md:pt-4">
        <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg sticky top-0 z-10 rounded-lg">
          <div className="px-3 md:px-4 py-2 md:py-4">
            <div className="flex items-center gap-2 md:gap-4">
              <Link to="/admin">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-11 w-11 md:h-10 md:w-10"
                >
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </Link>
              <div>
                <h1 className="text-base md:text-xl font-bold flex items-center gap-1.5 md:gap-2">
                  <Shield className="h-4 w-4 md:h-5 md:w-5" />
                  User Management
                </h1>
                <p className="text-xs md:text-sm text-blue-200">{users.length} total users</p>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Search Bar */}
      <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or organization..."
            className="pl-9 md:pl-10 h-9 md:h-10 text-sm"
          />
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mt-2">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </div>

      {/* Users List */}
      <main className="container mx-auto px-3 md:px-4 space-y-2 md:space-y-4">
        {filteredUsers.length === 0 ? (
          <Card className="p-8 md:p-12 text-center">
            <UserCog className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 md:mb-4 text-muted-foreground" />
            <h3 className="text-sm md:text-lg font-semibold text-foreground mb-1 md:mb-2">
              No users found
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Try adjusting your search query
            </p>
          </Card>
        ) : (
          filteredUsers.map((u) => (
            <Card
              key={u.id}
              className="p-3 md:p-6 shadow-md border-gray-200 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start gap-2.5 md:gap-4 mb-2.5 md:mb-4">
                {/* Avatar */}
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-blue-900 to-blue-800 flex items-center justify-center text-white font-semibold flex-shrink-0 text-xs md:text-sm">
                  {u.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name & Email */}
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                    {u.full_name}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 truncate">{u.email}</p>
                  {u.organization && (
                    <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1 truncate">
                      {u.organization}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openAddRoleDialog(u)}
                  className="gap-1 md:gap-2 h-7 md:h-9 text-xs md:text-sm px-2 md:px-3"
                >
                  <Plus className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Add Role</span>
                </Button>
              </div>

              {/* Roles */}
              <div className="mt-2.5 md:mt-4">
                <p className="text-[10px] md:text-xs font-medium text-gray-500 mb-1.5 md:mb-2">
                  Assigned Roles
                </p>
                {u.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {u.roles.map((role) => (
                      <Badge
                        key={role}
                        variant={getRoleBadgeVariant(role)}
                        className="gap-1 md:gap-2 pr-0.5 md:pr-1 text-[10px] md:text-xs"
                      >
                        {role}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-3.5 w-3.5 md:h-4 md:w-4 p-0 hover:bg-transparent"
                          onClick={() => handleRemoveRole(u.id, role, u.full_name)}
                        >
                          <X className="h-2.5 w-2.5 md:h-3 md:w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs md:text-sm text-gray-500 italic">No roles assigned</p>
                )}
              </div>

              {/* User Info */}
              {u.role && (
                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200">
                  <p className="text-[10px] md:text-xs text-gray-500">
                    Profile Role: <span className="text-gray-900">{u.role}</span>
                  </p>
                </div>
              )}
            </Card>
          ))
        )}
      </main>

      {/* Add Role Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent className="max-w-[90vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">
              Add Role to {selectedUser?.full_name}
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Assign a new role to this user. They will gain the associated permissions
              immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 md:py-4">
            <Select value={roleToAdd} onValueChange={(value) => setRoleToAdd(value as AppRole)}>
              <SelectTrigger className="h-9 md:h-10 text-sm">
                <SelectValue placeholder="Select a role to add" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="industry">Industry</SelectItem>
              </SelectContent>
            </Select>

            <div className="mt-3 md:mt-4 p-2.5 md:p-3 bg-gray-100 rounded-lg">
              <p className="text-[10px] md:text-xs text-gray-500">
                <strong>Role Descriptions:</strong>
              </p>
              <ul className="text-[10px] md:text-xs text-gray-500 mt-1.5 md:mt-2 space-y-0.5 md:space-y-1 list-disc list-inside">
                <li>
                  <strong>Admin:</strong> Full system access
                </li>
                <li>
                  <strong>Staff:</strong> Event check-in access
                </li>
                <li>
                  <strong>Faculty:</strong> Research projects
                </li>
                <li>
                  <strong>Student:</strong> Standard access
                </li>
                <li>
                  <strong>Industry:</strong> Collaboration invites
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowAddRoleDialog(false)}
              className="h-11 md:h-10 text-sm md:text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddRole}
              disabled={!roleToAdd}
              className="h-11 md:h-10 text-sm md:text-base"
            >
              Add Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
