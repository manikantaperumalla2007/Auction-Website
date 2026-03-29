import { LayoutGrid, Gavel, Heart, Users, Shield, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

type ScreenID = 'landing' | 'admin' | 'directory' | 'auction' | 'watchlist' | 'team' | 'profile';

interface NavbarProps {
    currentScreen: string;
    setCurrentScreen: (screen: ScreenID) => void;
    isAdmin?: boolean;
}

export default function Navbar({ currentScreen, setCurrentScreen, isAdmin }: NavbarProps) {
    const navItems: { id: ScreenID; label: string; icon: any }[] = [
        { id: 'directory', label: 'Players', icon: LayoutGrid },
        { id: 'auction', label: 'Live', icon: Gavel },
        { id: 'team', label: 'Squads', icon: Users },
    ];

    if (isAdmin) {
        navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
    } else {
        navItems.push({ id: 'watchlist', label: 'Watchlist', icon: Heart });
    }
    navItems.push({ id: 'profile', label: 'Profile', icon: User });

    return (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 flex items-center gap-1 shadow-2xl scale-110 md:scale-100 min-w-fit">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentScreen === item.id;

                return (
                    <button
                        key={item.id}
                        onClick={() => setCurrentScreen(item.id)}
                        className={cn(
                            "flex flex-col items-center justify-center px-6 py-2 rounded-xl transition-all duration-300 relative group",
                            isActive ? "bg-primary text-surface" : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Icon className={cn("w-5 h-5 mb-1 relative z-10", isActive ? "stroke-[2.5]" : "stroke-[1.5]")} />
                        <span className="text-[10px] font-black uppercase tracking-widest relative z-10">{item.label}</span>
                        
                        {isActive && (
                            <motion.div 
                                layoutId="nav-active-pill"
                                className="absolute inset-0 bg-primary blur-0 rounded-xl"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                );
            })}
        </nav>
    );
}
