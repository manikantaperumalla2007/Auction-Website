import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Play, Pause, SkipForward, History, Undo, 
  PlusCircle, RotateCcw, Megaphone,
  Bell, Wallet, Gavel, Ban, Loader2, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface AdminDashboardProps {
  user: any;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [session, setSession] = useState<any>(null);
  const [activePlayer, setActivePlayer] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [finishedPlayers, setFinishedPlayers] = useState<any[]>([]);
  const [upcomingPlayers, setUpcomingPlayers] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualAmount, setManualAmount] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAdmin();

    const sub = supabase
      .channel('admin-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_session' }, (payload: any) => {
        setSession(payload.new);
        if (payload.new?.current_player_id) {
          fetchPlayer(payload.new.current_player_id);
          fetchBids(payload.new.current_player_id);
        } else {
          setActivePlayer(null);
          setBids([]);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, (payload: any) => {
        // Only add if the bid belongs to our active player
        if (activePlayer && payload.new.player_id === activePlayer.id) {
          setBids(prev => {
            // Avoid duplicate bids if already fetched
            if (prev.some(b => b.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players' }, (payload: any) => {
        if (activePlayer && payload.new.id === activePlayer.id) setActivePlayer(payload.new);
        if (payload.new.status === 'UPCOMING' || payload.new.status === 'SOLD' || payload.new.status === 'UNSOLD') {
          setTimeout(() => {
            fetchUpcoming();
            fetchFinished();
          }, 500);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [activePlayer?.id]);


  async function initAdmin() {
    const { data: sess } = await supabase.from('auction_session').select('*').single();
    setSession(sess);
    if (sess?.current_player_id) {
       fetchPlayer(sess.current_player_id);
       fetchBids(sess.current_player_id);
    }
    fetchUpcoming();
    fetchFinished();
    fetchAllTeams();
    setLoading(false);
  }

  async function fetchAllTeams() {
    const { data } = await supabase.from('teams').select('*').order('name');
    setAllTeams(data || []);
  }

  async function fetchFinished() {
    const { data } = await supabase
      .from('players')
      .select('*, teams(*)')
      .or('status.eq.SOLD,status.eq.UNSOLD')
      .order('updated_at', { ascending: false });
    setFinishedPlayers(data || []);
  }


  async function fetchPlayer(id: string) {
    const { data } = await supabase.from('players').select('*').eq('id', id).single();
    setActivePlayer(data);
  }

  async function fetchBids(playerId: string) {
    const { data } = await supabase
      .from('bids')
      .select('*, teams(name)')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });
    setBids(data || []);
  }

  async function fetchUpcoming() {
    const { data } = await supabase.from('players').select('*').eq('status', 'UPCOMING').order('queue_order', { ascending: true });
    setUpcomingPlayers(data || []);
  }

  async function startAuction(playerId: string) {
    setIsProcessing(true);
    try {
      // Start Auction via RPC (P1 Fix: Atomicity)
      const { data: result, error: rpcError } = await supabase.rpc('spotlight_player', {
        p_player_id: playerId
      });

      if (rpcError) throw rpcError;
      if (result && !result.success) throw new Error(result.message);
      
      console.log('Auction Spotlight Active');
    } catch (err: any) {
      console.error('Error starting auction:', err);
      alert('Failed to start auction: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSold() {
    const latestBid = bids[0];
    if (!activePlayer || !latestBid) return;
    setIsProcessing(true);

    try {
      // Execute Atomic Sale via RPC (P1 Fix)
      const { data: result, error: rpcError } = await supabase.rpc('finalize_sale', {
        p_player_id: activePlayer.id
      });

      if (rpcError) throw rpcError;

      if (result && !result.success) {
        alert(result.message || "Failed to finalize sale.");
        return;
      }

      console.log("🏆 SOLD");

      setActivePlayer(null);
      setBids([]);
    } catch (err: any) {
      console.error('Error finalizing sale:', err);
      alert('Sale failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleUnsold() {
    if (!activePlayer) return;
    setIsProcessing(true);
    try {
      // Execute Atomic Unsold via RPC (P1 Fix)
      const { data: result, error: rpcError } = await supabase.rpc('mark_unsold', {
        p_player_id: activePlayer.id
      });

      if (rpcError) throw rpcError;
      if (result && !result.success) throw new Error(result.message);

      setActivePlayer(null);
      setBids([]);
    } catch (err: any) {
      console.error('Error marking unsold:', err);
      alert('Action failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function togglePause() {
    if (!session) return;
    try {
      // Atomic toggle
      await supabase.rpc('toggle_auction_pause');
    } catch (err) {
      console.error('Error toggling pause:', err);
    }
  }

  async function undoLastBid() {
    if (!activePlayer || bids.length === 0) return;
    const lastBid = bids[0];

    try {
      // Execute Atomic Undo via RPC (P2 Fix: Non-destructive audit trail)
      const { data: result, error: rpcError } = await supabase.rpc('undo_last_bid', {
        p_player_id: activePlayer.id
      });

      if (rpcError) throw rpcError;
      if (result && !result.success) alert(result.message);

    } catch (err) {
      console.error('Error undoing bid:', err);
    }
  }

  async function handleManualOverrideBid() {
    if (!activePlayer || !selectedTeamId || !manualAmount) {
      alert("Select team and enter amount");
      return;
    }
    const amount = parseInt(manualAmount);
    if (isNaN(amount) || amount <= (bids[0]?.amount || 0)) {
       alert("Invalid amount or lower than current high bid");
       return;
    }

    setIsProcessing(true);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('place_bid', {
        p_player_id: activePlayer.id,
        p_team_id: selectedTeamId,
        p_amount: amount,
        p_increment: 0,
        p_is_override: true
      });

      if (rpcError) throw rpcError;
      if (result && !result.success) throw new Error(result.message);
      setManualAmount('');
      setSelectedTeamId('');
    } catch (err: any) {
      alert("Failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function postAnnouncement() {
    if (!announcement) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        message: announcement,
        created_by_admin_id: user?.id
      });
      if (error) throw error;
      setAnnouncement('');
      alert('Broadcast dispatched successfully!');
    } catch (err: any) {
      console.error('Error posting announcement:', err);
      alert('Broadcast failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-surface text-white font-body selection:bg-primary selection:text-surface">
      {/* Top Navigation */}
      <header className="bg-black/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto">
          <div className="text-2xl font-black italic tracking-tighter text-primary font-headline text-glow uppercase">VFL Arena Ops</div>
          <div className="flex items-center gap-4">
             <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", session?.status === 'LIVE' ? "bg-emerald-500 animate-pulse" : "bg-white/20")}></div>
                <span className="text-[10px] font-black uppercase tracking-widest">{session?.status || 'OFFLINE'}</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-6 lg:p-10 space-y-8">
        {/* Command Controls */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-5xl font-black font-headline tracking-tighter uppercase italic text-glow">Arena Ops</h1>
            <p className="text-white/40 font-label text-[10px] uppercase tracking-[0.4em]">Draft Cycle Control Panel</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={togglePause}
              className={cn(
                "border px-8 py-4 flex items-center gap-3 transition-all rounded-lg",
                session?.status === 'PAUSED' ? "bg-emerald-500 border-emerald-500 text-surface" : "bg-surface-container-high border-white/10 hover:bg-surface-bright"
              )}
            >
              {session?.status === 'PAUSED' ? <Play className="w-5 h-5 fill-surface" /> : <Pause className="w-5 h-5 text-tertiary fill-tertiary" />}
              <span className="font-headline font-bold uppercase tracking-tight text-sm">
                {session?.status === 'PAUSED' ? 'Resume Hub' : 'Pause Hub'}
              </span>
            </button>
            <div className="h-12 w-px bg-white/10"></div>
            <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                {upcomingPlayers.slice(0, 1).map(p => (
                  <button 
                  key={p.id}
                  disabled={isProcessing}
                  onClick={() => startAuction(p.id)}
                  className="bg-primary hover:bg-primary-dim disabled:opacity-50 text-surface px-8 py-3 flex items-center gap-3 transition-all rounded-lg shadow-[0_0_20px_rgba(255,231,146,0.3)]"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4 fill-surface" />}
                    <span className="font-label font-black uppercase text-xs tracking-widest">Call {p.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Active Card */}
          <div className="lg:col-span-4 space-y-6">
            {activePlayer ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              >
                <div className="p-8 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
                  <div className="flex items-center gap-6">
                    <img src={activePlayer.photo_url} className="w-24 h-24 rounded-2xl object-cover ring-2 ring-primary ring-offset-4 ring-offset-black/50" />
                    <div>
                      <h3 className="font-headline text-3xl font-black italic uppercase text-primary italic-bold">{activePlayer.name}</h3>
                      <div className="flex gap-2 mt-2">
                        <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">{activePlayer.position}</span>
                        <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">BASE: {activePlayer.base_price} VFL</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Current High Bid</div>
                    <div className="font-headline text-5xl font-black italic text-primary text-glow">{bids[0]?.amount || activePlayer.base_price}</div>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-2 gap-4 bg-white/5 backdrop-blur-3xl">
                   <button 
                    onClick={handleSold} 
                    disabled={bids.length === 0 || isProcessing} 
                    className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 p-5 rounded-2xl transition-all flex flex-col items-center gap-2 group disabled:opacity-20 disabled:cursor-not-allowed"
                   >
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : <Gavel className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                      <span className="font-black uppercase text-[10px] tracking-widest">Confirm Sale</span>
                   </button>
                   <button 
                    onClick={handleUnsold} 
                    disabled={isProcessing}
                    className="bg-error/10 hover:bg-error text-error hover:text-white border border-error/20 p-5 rounded-2xl transition-all flex flex-col items-center gap-2 group disabled:opacity-20"
                   >
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin text-error" /> : <Ban className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                      <span className="font-black uppercase text-[10px] tracking-widest">Mark Unsold</span>
                   </button>
                 </div>
              </motion.div>
            ) : (
              <div className="aspect-[3/4] border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center p-10 bg-white/[0.02]">
                  <Loader2 className="w-10 h-10 text-white/10 mb-4 animate-spin" />
                  <p className="font-label text-xs uppercase tracking-widest text-white/20">Awaiting next entry...</p>
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="lg:col-span-8 flex flex-col gap-6">
             <div className="flex-1 bg-surface-container-low rounded-3xl border border-white/5 flex flex-col overflow-hidden max-h-[600px] shadow-inner">
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <History className="w-5 h-5 text-primary" />
                      <span className="font-headline font-black uppercase text-sm tracking-tight">Bid Sequence</span>
                   </div>
                   <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Sync Active</span>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                   {bids.map((bid, index) => (
                      <motion.div 
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        key={bid.id} 
                        className={cn(
                          "flex justify-between items-center bg-white/5 p-4 rounded-xl border-l-4 shadow-lg",
                          index === 0 ? "border-primary bg-primary/5" : "border-white/10"
                        )}
                      >
                         <div>
                            <p className={cn("text-[10px] font-black uppercase mb-1", index === 0 ? "text-primary" : "text-white/40")}>
                               {index === 0 ? '🏆 HIGHEST BID' : 'PREVIOUS BID'}
                            </p>
                            <p className="font-headline text-3xl font-black italic tracking-tighter text-white">{bid.amount} VFL</p>
                            <p className="text-[10px] font-bold text-white/60 uppercase">{bid.teams?.name || 'Unknown Team'}</p>
                         </div>
                         <div className="text-right">
                             <div className={cn("px-2 py-1 rounded text-[9px] font-black uppercase", index === 0 ? "bg-primary/20 text-primary" : "bg-white/5 text-white/20")}>
                                {index === 0 ? 'Leading' : 'Outbid'}
                             </div>
                             <p className="text-[9px] text-white/20 mt-2">{new Date(bid.created_at).toLocaleTimeString()}</p>
                         </div>
                      </motion.div>
                   ))}
                   {bids.length === 0 && <div className="text-center py-20 text-white/10 font-black uppercase tracking-[0.5em] text-xs">Waiting for opening bid</div>}
                </div>
                <div className="p-6 bg-black/40 border-t border-white/5 space-y-4">
                   <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest">Marshall Override</p>
                      <div className="flex gap-2">
                         <select 
                           value={selectedTeamId}
                           onChange={(e) => setSelectedTeamId(e.target.value)}
                           className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none transition-all"
                         >
                            <option value="">Select Team</option>
                            {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                         </select>
                         <input 
                           type="number"
                           placeholder="Price"
                           value={manualAmount}
                           onChange={(e) => setManualAmount(e.target.value)}
                           className="w-20 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-black placeholder:text-white/20 outline-none focus:border-primary transition-all text-center"
                         />
                         <button 
                           onClick={handleManualOverrideBid}
                           disabled={isProcessing || !selectedTeamId || !manualAmount}
                           className="bg-primary text-surface font-black px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest hover:brightness-110 disabled:opacity-20 transition-all"
                         >
                           Bid
                         </button>
                      </div>
                   </div>

                   <button 
                    onClick={undoLastBid}
                    disabled={bids.length === 0}
                    className="w-full py-4 flex items-center justify-center gap-3 text-error bg-error/5 hover:bg-error hover:text-white border border-error/10 rounded-xl transition-all group disabled:opacity-20"
                   >
                      <Undo className="w-5 h-5 group-hover:-rotate-45 transition-transform" />
                      <span className="font-black uppercase text-xs tracking-widest">Invert Last Call</span>
                   </button>
                </div>
             </div>
          </div>

          {/* Auxiliary Ops */}
          <div className="lg:col-span-3 space-y-6">

             <div className="bg-surface-container p-6 rounded-3xl border border-white/5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                   <Megaphone className="w-4 h-4 text-primary" />
                   <span className="font-black uppercase text-[10px] tracking-widest text-white/40">Global Feed</span>
                </div>
                <textarea 
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-body italic focus:border-primary transition-all h-24 outline-none resize-none" 
                  placeholder="Enter message for all portals..."
                />
                <button onClick={postAnnouncement} className="w-full bg-primary hover:bg-primary-dim text-surface font-black uppercase text-[10px] tracking-[0.2em] py-4 rounded-xl transition-all shadow-xl">
                   Dispatch Broadcast
                </button>
             </div>

             <div className="bg-white/5 p-6 rounded-3xl border border-white/5 max-h-[300px] overflow-y-auto">
                <h4 className="font-black uppercase text-[9px] tracking-widest text-primary mb-4 flex justify-between">
                   <span>Auction Ledger</span>
                   <span className="text-white/20">{finishedPlayers.length} Total</span>
                </h4>
                <div className="space-y-3">
                   {finishedPlayers.map(p => (
                      <div key={p.id} className="flex justify-between items-center group">
                         <div className="flex flex-col">
                            <span className="text-xs font-bold text-white uppercase">{p.name}</span>
                            <span className={cn("text-[9px] font-black uppercase tracking-widest", p.status === 'SOLD' ? 'text-emerald-500' : 'text-error')}>
                               {p.status === 'SOLD' ? `SOLD to ${p.teams?.name || (p as any).teams?.[0]?.name || 'Team'}` : 'UNSOLD'}
                            </span>
                         </div>
                         <div className="text-right">
                            <span className="text-xs font-headline font-black italic">{p.sold_price || '-'}</span>
                         </div>
                      </div>
                   ))}
                   {finishedPlayers.length === 0 && <p className="text-[9px] italic text-white/20 text-center py-4 uppercase">No players settled yet</p>}
                </div>
             </div>

             <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                <h4 className="font-black uppercase text-[9px] tracking-widest text-white/20 mb-4">Upcoming Bench</h4>
                <div className="space-y-3">
                   {upcomingPlayers.slice(0, 5).map(p => (
                      <div key={p.id} className="flex justify-between items-center group cursor-help">
                         <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors uppercase">{p.name}</span>
                         <span className="text-[9px] font-black uppercase text-white/20">{p.tier}</span>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-2xl border-t border-white/5 py-3 px-8 flex items-center z-[100]">
         <div className="flex items-center gap-4 w-full">
            <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 whitespace-nowrap">Broadcast Protocol Alpha Enabled</span>
            <div className="w-px h-4 bg-white/10 mx-2"></div>
            <div className="flex-1 overflow-hidden">
               <div className="text-[10px] font-bold text-white uppercase tracking-widest marquee">
                  SYSTEM STATUS: GREEN ::: TOTAL DATA SYNC: 99.8% ::: SESSION {session?.id?.slice(0,5)} RUNNING ::: 
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
}
