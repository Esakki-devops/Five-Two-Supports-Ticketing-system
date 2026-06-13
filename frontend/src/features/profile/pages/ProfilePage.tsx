import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@/design-system';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { logout } from '@/lib/auth/session';
import { initialsOf } from '@/lib/utils/format';
import { Role } from '@/types';

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  if (!user) return null;

  const isEngineer = user.role === Role.Engineer;
  const department =
    typeof user.department === 'object' && user.department ? user.department.name : null;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Profile & settings" description="Your account details and preferences." />

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{initialsOf(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold tracking-tight">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2">
              <Badge variant={isEngineer ? 'primary' : 'outline'}>
                {isEngineer ? 'Engineer' : 'Employee'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Full name" value={user.name} />
          <Row label="Email" value={user.email} />
          <Row label="Role" value={isEngineer ? 'Engineer' : 'Employee'} />
          {department ? <Row label="Department" value={department} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
              >
                <Sun className="h-4 w-4" /> Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-4 w-4" /> Dark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-6">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">End your session on this device.</p>
          </div>
          <Button variant="outline" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
