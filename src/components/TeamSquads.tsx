import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wallet, Users, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface TeamSquadsProps {
  user: any;
}

export default function TeamSquads({ user }: TeamSquadsProps) {
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Live Sync for Roster Changes
    const channel = supabase
      .channel('roster-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true });
    
    const { data: playerData } = await supabase
      .from('players')
      .select('*, teams(name)')
      .eq('status', 'SOLD')
      .order('sold_price', { ascending: false });

    setTeams(teamData || []);
    setPlayers(playerData || []);
    setLoading(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-primary font-label uppercase text-[10px] tracking-widest font-black animate-pulse">Analyzing Squad Strength...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface text-white font-body selection:bg-primary selection:text-surface">
      <header className="bg-black/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto">
          <div className="text-2xl font-black italic tracking-tighter text-primary font-headline uppercase text-glow">
            Roster Review
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-12 pb-32">
        <div className="flex flex-col gap-2 mb-12">
           <h1 className="text-5xl font-headline font-black italic uppercase tracking-tighter text-white">Digital Colosseum Final Squads</h1>
           <p className="text-white/40 font-label text-sm uppercase tracking-[0.2em]">Comprehensive Roster Analysis & Final Stats</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          {teams.map((team, idx) => {
            const teamPlayers = players.filter(p => p.sold_to_team_id === team.id);
            const budgetUsed = teamPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={team.id}
                className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden group hover:border-primary/30 transition-all flex flex-col h-[600px]"
              >
                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-primary" />
                        <h2 className="text-3xl font-headline font-black italic uppercase tracking-tighter text-white group-hover:text-primary transition-colors">{team.name}</h2>
                      </div>
                      <p className="text-[10px] font-label font-bold text-white/20 uppercase tracking-[0.2em]">SQUAD SIZE: {teamPlayers.length} / 11</p>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-black uppercase tracking-widest text-primary font-label">Total Points Spent</span>
                       <p className="text-2xl font-headline font-black italic text-white">{budgetUsed} / {team.total_budget} VFL</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                  <div className="grid grid-cols-1 gap-4">
                     {teamPlayers.length > 0 ? teamPlayers.map((player) => (
                        <div key={player.id} className="flex justify-between items-center group/row hover:bg-white/5 p-3 rounded-xl transition-all border border-transparent hover:border-white/5">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-black/40">
                                 <img src={player.photo_url || 'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=1470&auto=format&fit=crop'} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={player.name} />
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-sm font-bold text-white uppercase">{player.name}</span>
                                 <span className="text-[9px] font-black uppercase text-white/40 tracking-widest leading-none mt-1">{player.department || player.position} • {player.tier}</span>
                              </div>
                           </div>
                           <div className="text-right">
                              <span className="text-lg font-headline font-black italic text-primary">{player.sold_price} VFL</span>
                           </div>
                        </div>
                     )) : (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-2xl">
                           <Users className="w-12 h-12 text-white/10 mb-4" />
                           <p className="text-[10px] font-label uppercase text-white/20 tracking-[0.3em] italic text-center px-10">No Legends Signed in this Pool yet</p>
                        </div>
                     )}
                  </div>
                </div>
                
                <div className="p-6 bg-black/20 border-t border-white/5 flex justify-between items-center flex-shrink-0">
                   <div className="flex items-center gap-4 text-white/40 font-label text-[10px] font-bold uppercase tracking-widest">
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full"><Wallet className="w-3 h-3" /> REMAINING: {team.total_budget - budgetUsed} VFL</div>
                   </div>
                   <div className="text-[9px] font-black text-white/10 uppercase italic tracking-widest">Official VFL Roster</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
