import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { 
  Users, 
  Ruler, 
  ShoppingCart, 
  Home,
  LogOut,
  Menu,
  User,
  Receipt,
  Package,
  CreditCard,
  BarChart3,
  FileText,
  Settings,
  Scissors,
  ShoppingBag
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      {
        title: 'Dashboard',
        icon: Home,
        path: '/',
        roles: ['admin', 'cashier', 'tailor'],
      },
      {
        title: 'Customers',
        icon: Users,
        path: '/customers',
        roles: ['admin', 'cashier', 'tailor'],
      },
      {
        title: 'Measurements',
        icon: Ruler,
        path: '/measurements',
        roles: ['admin', 'cashier', 'tailor'],
      },
      {
        title: 'Orders',
        icon: ShoppingCart,
        path: '/orders',
        roles: ['admin', 'cashier', 'tailor'],
      },
      {
        title: 'Billing',
        icon: FileText,
        path: '/billing',
        roles: ['admin', 'cashier'],
      },
      {
        title: 'Inventory',
        icon: Package,
        path: '/inventory',
        roles: ['admin', 'cashier'],
      },
      {
        title: 'Reports',
        icon: BarChart3,
        path: '/reports',
        roles: ['admin'],
      },
      {
        title: 'Settings',
        icon: Settings,
        path: '/settings',
        roles: ['admin'],
      },
    ];

    return baseItems.filter(item => 
      profile?.role && item.roles.includes(profile.role)
    );
  };

  const navigationItems = getNavigationItems();

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'cashier':
        return 'Cashier';
      case 'tailor':
        return 'Tailor';
      default:
        return 'User';
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar */}
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center space-x-2 px-4 py-2">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                <Scissors className="h-5 w-5" />
              </div>
              <ShoppingBag className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-sm">A1 Billing</span>
                <span className="text-xs text-muted-foreground">Tailoring Solution</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.path} className="flex items-center space-x-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b bg-background px-6">
            <div className="flex items-center space-x-4">
              <SidebarTrigger />
              <h1 className="font-semibold text-lg">Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.full_name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {profile?.role ? getRoleDisplayName(profile.role) : 'Loading...'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;