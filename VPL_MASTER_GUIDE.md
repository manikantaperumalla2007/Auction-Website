# 🏟️ VPL Auction Platform: The Digital Colosseum Master Guide

The **VPL Auction Platform** is a high-performance, real-time sports auction engine designed for live franchise player drafts. It is built on the "Digital Colosseum" design system, prioritizing speed, transparency, and data integrity.

---

## 🚀 1. Technology Architecture
*   **Frontend**: React + Vite (Typescript)
*   **Styling**: Tailwind CSS + Custom Glassmorphic CSS Extensions
*   **Backend**: Supabase (PostgreSQL + Realtime Sync)
*   **Animation**: Framer Motion (Cinematic Sold/Unsold Overlays)
*   **Icons**: Lucide React

---

## 🏛️ 2. Core Auction Rules
1.  **Bidding Engine**:
    *   **Minimum Opening**: Matches the legend's `base_price`.
    *   **Increments**: +1, +2, +3, +5, +10 (Custom amounts allowed via Marshall Override).
    *   **Persistence**: Every bid is a permanent ledger entry.
2.  **Sale Finalization**:
    *   Only the **Marshall (Admin)** can trigger a sale.
    *   A player is only marked **SOLD** if a team ID is correctly recorded.
    *   If no bids are placed, the player is marked **UNSOLD** and returns to a "Freelancer" pool.
3.  **Financial Governance**:
    *   **Initial Purse**: Each franchise starts with **100 VLL**.
    *   **Expenditure**: `points_spent` are only committed **at the moment the hammer falls (SOLD)**.
    *   **Constraint**: Teams CANNOT bid higher than their remaining budget.

---

## 🔑 3. User & Role Definitions
*   **MARSHALL (ADMIN)**: 
    *   Full control via the `AdminDashboard`. 
    *   Can Spotlight players, record manual bids, undo bids, and finalize sales.
*   **FRANCHISE CAPTAIN**: 
    *   Represented by a specific `team_id`.
    *   Active in `LiveAuction` view. 
    *   Real-time "Outbid" alerts and specific wallet monitoring.
*   **VIEWER (SPECTATOR)**: 
    *   Can view the session, live leaderboard, and market results.
    *   Cannot interact with the bidding table.

---

## 📊 4. Database Schema (Supabase)
*   **`players`**: The Source of Truth. Contains `status`, `sold_price`, and `sold_to_team_id`.
*   **`bids`**: The chronologically ordered ledger for every session call.
*   **`teams`**: Franchise profiles with `points_spent` tracking.
*   **`auction_session`**: A single-row controller managing who is currently under the spotlight.
*   **`users`**: Role-based access control and franchise associations.

---

## ⚙️ 5. Operational Instructions (How to Run)
1.  **Starting Development**: `npm run dev` in your local terminal.
2.  **Live Event**: The Marshall must keep the `AdminDashboard` open at all times.
3.  **Troubleshooting (Sync)**: All major UI components use Realtime listeners. If a browser lags, a simple refresh will re-sync the view to the DB's latest state.
4.  **Reset/Clean Start**: Use the `RESET_DATABASE` script commands for a fresh auction lifecycle.

---

## 🛠️ 6. Marshall's Toolkit (Safety Nets)
*   **Manual Override**: Built-in panel to manually assign a bid to a team if they miss a click during a shout-bid.
*   **Invert Last Call**: Undo a mistaken signature instantly without losing session data.
*   **Announcement Bar**: Deliver arena-wide messages (e.g., "5 Minute Intermission").

---

**© 2026 VPL Digital Colosseum | Built for the Future of Fantasy Sports**
