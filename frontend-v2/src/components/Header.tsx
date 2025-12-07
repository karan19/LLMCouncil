'use client';

import { LogOut, User, ChevronDown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface HeaderProps {
    onLogout: () => void;
    onBack?: () => void;
    title?: string;
    showBackButton?: boolean;
}

export default function Header({
    onLogout,
    onBack,
    title,
    showBackButton = false
}: HeaderProps) {
    return (
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
                {showBackButton && onBack && (
                    <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                )}
                {title && (
                    <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
                )}
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                        <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                                <User className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white">
                    <DropdownMenuItem onClick={onLogout} className="text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
}
