# Converge-NPS Page Update Plan

## Current Status

The dashboard has been completely rebuilt to match loveable-converge. All remaining pages need similar updates.

## Critical Changes Needed

### 1. Remove MainLayout from All Pages
- **Current**: Pages use MainLayout with TopBar and BottomNav
- **Target**: Pages should be standalone like loveable-converge (no persistent nav)
- **Action**: Replace `<MainLayout>` with `<SimpleLayout>` or remove entirely

### 2. Apply NPS Branding
- Use `bg-gradient-navy` for headers
- Use `bg-gradient-subtle` for backgrounds
- Use proper color tokens (primary=navy, accent=cyan)
- Add NPS logo where appropriate

### 3. Mobile Optimization
- Ensure all pages are Apple HIG compliant
- Touch targets minimum 44x44px
- Proper safe area handling
- Mobile-first responsive design

## Page-by-Page Updates

### ✅ Completed
1. **DashboardPage.tsx** - Fully redesigned to match original

### 🔴 High Priority (User-Facing)

2. **ScannerPage.tsx / ScanPage.tsx**
   - Most complex page (QR scanning, camera access)
   - Copy from loveable-converge `/pages/Scanner.tsx`
   - Install dependencies: `@zxing/library`

3. **SchedulePage.tsx**
   - Copy from loveable-converge `/pages/Schedule.tsx`
   - Event schedule with sessions

4. **MessagesPage.tsx**
   - Copy from loveable-converge `/pages/Messages.tsx`
   - Real-time messaging interface

5. **ConnectionsPage.tsx**
   - Copy from loveable-converge `/pages/Connections.tsx`
   - Network connections and invites

6. **ProfilePage.tsx**
   - Copy from loveable-converge `/pages/Profile.tsx`
   - User profile view

7. **ProfileEditPage.tsx**
   - Copy from loveable-converge `/pages/EditProfile.tsx`
   - Profile editing

### 🟡 Medium Priority

8. **OpportunitiesPage.tsx**
   - Copy from loveable-converge `/pages/Opportunities.tsx` or `/pages/CollaborationOpportunities.tsx`

9. **ProjectsPage.tsx**
   - May need to create based on loveable-converge patterns

10. **LoginPage.tsx / RegisterPage.tsx**
    - Copy from loveable-converge `/pages/Auth.tsx`
    - Add NPS branding to auth forms

### 🟢 Low Priority

11. **MySchedulePage.tsx** - Personal schedule view
12. **PartnersPage.tsx** - Industry partners
13. **SettingsPage.tsx** - App settings
14. **PrivacySettingsPage.tsx** - Privacy controls
15. **ChatPage.tsx** - Individual chat threads

## Quick Update Template

For each page, follow this pattern:

```tsx
// Remove MainLayout import
// import { MainLayout } from '@/components/layout/MainLayout';

// Add if needed
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function PageName() {
  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 md:pb-8">
      {/* Optional Header */}
      <header className="bg-gradient-navy text-primary-foreground shadow-lg rounded-xl mx-3 md:mx-4 mt-3 md:mt-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-primary-foreground hover:text-accent">
              ← Back
            </Link>
            <h1 className="text-xl font-bold">Page Title</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
        <Card className="p-6">
          {/* Page content */}
        </Card>
      </main>
    </div>
  );
}
```

## Dependencies to Install

Run these commands to add missing packages:

```bash
cd /Users/timmartin/.claude-worktrees/Product-Creator-Multi-Agent-/Converge-NPS/frontend

# QR Code related
npm install react-qr-code @zxing/library

# Additional if needed
npm install date-fns recharts
```

## Testing Checklist

After updates:
- [ ] Dashboard displays correctly on iPhone
- [ ] QR Scanner works on iPhone camera
- [ ] All pages use NPS navy/cyan colors
- [ ] No MainLayout/BottomNav on pages
- [ ] Touch targets meet 44x44px minimum
- [ ] Safe areas respected (notch, home indicator)
- [ ] All gradients render correctly
- [ ] Dark mode works (if implemented)

## Next Steps

1. Install react-qr-code: `npm install react-qr-code`
2. Test dashboard on iPhone
3. Update Scanner page (most important for event)
4. Update remaining pages in priority order
5. Remove or update BottomNav/TopBar components
6. Final testing on iPhone

## Notes

- Original loveable-converge is a single-page app (no persistent navigation)
- Converge-NPS rebuild added multi-page architecture (TopBar + BottomNav)
- This architectural difference is the root cause of UI mismatch
- Consider: Keep navigation for secondary pages, remove from main flow
