'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, UserCircle, Settings, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <Button variant="ghost" size="icon" disabled className="h-8 w-8">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (session?.user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
            <Avatar className="h-9 w-9">
              <AvatarImage src={session.user.image || undefined} alt={session.user.name || "User"} />
              <AvatarFallback>
                {session.user.name ? session.user.name.charAt(0).toUpperCase() : <UserCircle size={18}/>}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {session.user.name || "User"}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {session.user.email}
              </p>
               {session.user.role && (
                 <p className="text-xs leading-none text-muted-foreground capitalize pt-1">
                    Role: {session.user.role}
                 </p>
               )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
             <Link href="/dashboard" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" /> Dashboard
             </Link>
           </DropdownMenuItem>
          {session.user.role === 'manager' && (
             <DropdownMenuItem asChild>
                <Link href="/admin/employees" className="flex items-center">
                    <Users className="mr-2 h-4 w-4" /> Employee Management
                </Link>
             </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={() => signIn()} variant="outline" size="sm">
      <LogIn className="mr-2 h-4 w-4" />
      Login
    </Button>
  );
}
