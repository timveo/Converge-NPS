# Installation & Testing Instructions

## 1. Install Missing Dependencies

Open Terminal and run:

```bash
cd /Users/timmartin/.claude-worktrees/Product-Creator-Multi-Agent-/Converge-NPS/frontend
npm install react-qr-code @zxing/library
```

## 2. Restart Development Servers

If servers are running, stop them (Ctrl+C) and restart:

```bash
# Start servers
cd /Users/timmartin/.claude-worktrees/Product-Creator-Multi-Agent-/Converge-NPS
./start-dev.sh
```

Or manually:

```bash
# Terminal Tab 1 - Frontend
cd /Users/timmartin/.claude-worktrees/Product-Creator-Multi-Agent-/Converge-NPS/frontend
npm run dev -- --host 0.0.0.0

# Terminal Tab 2 - Backend
cd /Users/timmartin/.claude-worktrees/Product-Creator-Multi-Agent-/Converge-NPS/backend
npm run dev
```

## 3. Test on iPhone

### Access the App
1. Make sure iPhone is on same WiFi as Mac
2. Open Safari on iPhone
3. Go to: `http://192.168.0.231:5173`

### What You Should See

#### Dashboard (Home Page)
✅ **Header**:
- Large NPS logo on left
- "Converge @ NPS" title
- "Naval Postgraduate School" in gold
- "January 28-30, 2026" in cyan
- Action buttons on right (Help, Messages, Settings, Profile)
- Navy gradient background

✅ **Welcome Banner**:
- "Welcome, [YourName]!" in large text
- White card with subtle gradient

✅ **QR Code Badge**:
- Your name and role
- Large QR code (tappable to enlarge)
- Manual code below QR
- "Your Digital Badge" info box

✅ **Scan to Connect**:
- Big blue button with QR icon
- "Scan Attendee's Badge" subtitle

✅ **Quick Action Cards**:
- 6 cards in 2-column grid (mobile)
- Each card has:
  - Gradient icon background (navy/cyan)
  - Title and description
  - Hover effects (cyan glow)

✅ **Colors**:
- **Navy Blue**: `#003366` (NPS Navy) - Headers, active states
- **Cyan**: `#00D9FF` (Tech Cyan) - Accents, hovers
- **Gold**: `#FFD700` (NPS Gold) - "Naval Postgraduate School"
- **White**: Backgrounds, text on navy

❌ **What You Should NOT See**:
- Generic gray/black colors
- Simple top bar with hamburger menu
- Bottom navigation bar (this is still there but will be removed)
- Small cards without gradients

## 4. Troubleshooting

### QR Code Not Showing
```bash
# Install react-qr-code if you haven't
cd /Users/timmartin/.claude-worktrees/Product-Creator-Multi-Agent-/Converge-NPS/frontend
npm install react-qr-code
```

### NPS Logo Not Showing
Check browser console for errors. Logo should be at `/nps-logo.png`

### Colors Look Wrong
- Clear browser cache (Safari: Settings → Safari → Clear History)
- Hard refresh: Hold Shift + Click Reload
- Check if CSS loaded correctly

### Can't Connect from iPhone
1. **Check WiFi**: Both devices on same network?
2. **Check IP**: Run `ifconfig | grep "inet " | grep -v 127.0.0.1` on Mac
3. **Check Firewall**: System Preferences → Security → Firewall → Allow node.js
4. **Check Servers**: Both frontend (5173) and backend (3000) running?

### Server Won't Start
```bash
# Kill existing processes
lsof -ti:5173 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Reinstall dependencies
cd frontend && npm install
cd ../backend && npm install

# Try again
npm run dev -- --host 0.0.0.0
```

## 5. Next Steps

Once the dashboard works correctly:

1. **Test Navigation**: Click on each quick action card
2. **Test QR Code**: Tap QR code to see full-screen view
3. **Test Mobile Features**: Check touch targets, scrolling, safe areas
4. **Report Issues**: Note any pages that don't match the original design

## 6. Comparison Screenshots

### Original (loveable-converge)
- Large header with logo
- QR badge prominently displayed
- Big "Scan to Connect" button
- Gradient cards with navy/cyan colors

### Current (Converge-NPS)
Should now match the original exactly!

## 7. Known Issues

1. **Bottom Navigation**: Still visible on mobile - will be removed in next update
2. **Other Pages**: Only dashboard updated so far, other pages still use old design
3. **Dependencies**: Need to install react-qr-code manually

## 8. File Changes Made

```
✅ frontend/src/index.css - NPS design system
✅ frontend/tailwind.config.js - Custom tokens
✅ frontend/src/pages/DashboardPage.tsx - Complete redesign
✅ frontend/src/components/QRCodeBadge.tsx - Added component
✅ frontend/public/nps-logo.png - NPS logo copied
✅ BRANDING_RESTORATION.md - Documentation
✅ APPLE_HIG_COMPLIANCE.md - Testing guide
```

## Success Criteria

✅ Dashboard displays NPS navy + cyan branding
✅ Large header with NPS logo visible
✅ QR code badge shows on dashboard
✅ "Scan to Connect" button prominent
✅ All touch targets ≥ 44x44px
✅ Safe areas respected (no overlap with notch/home indicator)
✅ Smooth scrolling and interactions
✅ No console errors

Once these are verified, we can proceed with updating the remaining pages!
