# Device Feature Matrix

**Document Version:** 1.0
**Date:** 2025-12-02
**Purpose:** Quick reference for device-specific feature availability

---

## Platform Strategy

**Single Responsive PWA** with device-based feature flagging
- One codebase
- Adapts to device capabilities (camera, screen size, touch)
- Same user sees different features on mobile vs. desktop

---

## Responsive Breakpoints

| Device | Width | Primary Input | Navigation | Layout |
|--------|-------|---------------|------------|--------|
| **Mobile** | <768px | Touch | Bottom nav | Single column |
| **Tablet** | 768-1024px | Touch/Mouse | Bottom nav | 1-2 columns |
| **Desktop** | >1024px | Mouse/Keyboard | Sidebar | Multi-column |

---

## Feature Availability Matrix

### Core Features

| Feature | Mobile | Desktop | Tablet | Device Detection | Notes |
|---------|--------|---------|--------|------------------|-------|
| **QR Scanner** | ✅ Primary | ❌ Hidden | ✅ If camera | Camera required | Desktop users must use manual entry |
| **Manual Code Entry** | ✅ Fallback | ✅ Primary | ✅ Available | Always on | Backup for QR scanner |
| **Profile Management** | ✅ Full | ✅ Full | ✅ Full | Screen size | Same features, responsive layout |
| **Privacy Controls** | ✅ 4 toggles | ✅ 4 toggles | ✅ 4 toggles | None | Identical across devices |
| **QR Badge** | ✅ Full/downloadable | ✅ Full/downloadable | ✅ Full/downloadable | None | Identical |

### Networking

| Feature | Mobile | Desktop | Tablet | Device Detection | Notes |
|---------|--------|---------|--------|------------------|-------|
| **Connections List** | ✅ Card view | ✅ Table view | ✅ Card view | Screen size | Different layouts, same data |
| **Connection Notes** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **Search/Filter** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **CSV Export** | ⚠️ Admin only | ✅ Admin primary | ⚠️ Admin only | Role-based | Desktop optimized |

### Schedule

| Feature | Mobile | Desktop | Tablet | Device Detection | Notes |
|---------|--------|---------|--------|------------------|-------|
| **Browse Sessions** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **Session Search** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **RSVP** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **Conflict Detection** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **List View** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **Timeline View** | ✅ Scrollable | ✅ Wide | ✅ Medium | Screen size | Responsive width |

### Research & Opportunities

| Feature | Mobile | Desktop | Tablet | Device Detection | Notes |
|---------|--------|---------|--------|------------------|-------|
| **Browse Projects** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **Browse Opportunities** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **Filters** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **Bookmarking** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **Express Interest** | ✅ Full | ✅ Full | ✅ Full | None | Identical |

### Messaging

| Feature | Mobile | Desktop | Tablet | Device Detection | Notes |
|---------|--------|---------|--------|------------------|-------|
| **Conversation List** | ✅ Full-screen | ✅ Split view | ✅ Adaptive | Screen size | Desktop shows list + chat side-by-side |
| **Active Chat** | ✅ Full-screen | ✅ Split view | ✅ Adaptive | Screen size | Mobile: back button to list; Desktop: persistent list |
| **Send Messages** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **Read Receipts** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **Rate Limiting** | ✅ 40/day | ✅ 40/day | ✅ 40/day | None | Identical |

### Admin & Staff

| Feature | Mobile | Desktop | Tablet | Device Detection | Notes |
|---------|--------|---------|--------|------------------|-------|
| **Admin Dashboard** | ✅ Works | ✅ Optimized | ✅ Works | Screen size | Desktop: multi-column grid; Mobile: single column |
| **User Management** | ✅ Works | ✅ Optimized | ✅ Works | Screen size | Desktop: table view; Mobile: card view |
| **Smartsheet Import** | ✅ Works | ✅ Primary | ✅ Works | None | Desktop preferred for admin tasks |
| **Analytics** | ✅ Works | ✅ Optimized | ✅ Works | Screen size | Desktop: side-by-side charts; Mobile: stacked |
| **Staff Check-In** | ✅ Optimized | ✅ Works | ✅ Optimized | Screen size + camera | Mobile-first for event floor |
| **Walk-In Registration** | ✅ Optimized | ✅ Works | ✅ Optimized | Screen size | Mobile-first for event floor |
| **Attendance Stats** | ✅ Full | ✅ Full | ✅ Full | None | Identical |

### PWA

| Feature | Mobile | Desktop | Tablet | Device Detection | Notes |
|---------|--------|---------|--------|------------------|-------|
| **Install Prompt** | ✅ Encouraged | ⚠️ Optional | ✅ Encouraged | Device type | Mobile/tablet prompted; desktop can use browser |
| **Offline Queue** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **Network-First Cache** | ✅ Full | ✅ Full | ✅ Full | None | Identical |
| **Push Notifications** | ✅ If installed | ⚠️ Browser only | ✅ If installed | Installation status | Better on installed PWA |

---

## Device Detection Methods

### 1. Screen Size (Responsive)
```typescript
const isMobile = window.innerWidth < 768;
const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
const isDesktop = window.innerWidth >= 1024;
```

**Used for:** Layout changes, navigation patterns, view modes

### 2. Camera Availability (Feature Detection)
```typescript
const hasCamera = await navigator.mediaDevices.enumerateDevices()
  .then(devices => devices.some(d => d.kind === 'videoinput'));
```

**Used for:** QR scanner availability

### 3. Touch Support (Feature Detection)
```typescript
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
```

**Used for:** Touch-optimized UI elements (larger tap targets, swipe gestures)

### 4. Role-Based Access (RBAC)
```typescript
const userRole = user.role; // 'student', 'faculty', 'industry', 'staff', 'admin'
```

**Used for:** Admin dashboard, staff check-in, data exports

---

## Layout Patterns by Device

### Mobile (<768px)
- **Navigation:** Bottom navigation bar (fixed position)
- **Layout:** Single column, vertical scroll
- **Lists:** Card view with large touch targets
- **Forms:** Full-width, stacked fields
- **Modals:** Full-screen overlays
- **Actions:** Bottom sheets, floating action buttons

### Tablet (768-1024px)
- **Navigation:** Bottom navigation bar (portrait), sidebar (landscape)
- **Layout:** 1-2 columns depending on orientation
- **Lists:** Card view (portrait), table view option (landscape)
- **Forms:** Responsive width, grouped fields
- **Modals:** Centered overlays with max-width
- **Actions:** Contextual buttons, drawer panels

### Desktop (>1024px)
- **Navigation:** Persistent sidebar
- **Layout:** Multi-column grid (2-4 columns)
- **Lists:** Table view with sortable columns, hover states
- **Forms:** Multi-column, inline validation
- **Modals:** Centered overlays with appropriate sizing
- **Actions:** Toolbar buttons, dropdown menus, keyboard shortcuts

---

## Example: Feature Flag Decision Tree

```
User wants to connect with attendee
├─ Device has camera?
│  ├─ YES → Show QR Scanner (primary) + Manual Entry (fallback)
│  └─ NO → Show Manual Entry only
│
Device Type?
├─ Mobile (<768px)
│  ├─ Show bottom navigation
│  ├─ Card view for connections list
│  └─ Full-screen modals
│
├─ Tablet (768-1024px)
│  ├─ Show bottom navigation (portrait) or sidebar (landscape)
│  ├─ Card or table view (user preference)
│  └─ Centered modals
│
└─ Desktop (>1024px)
   ├─ Show sidebar navigation
   ├─ Table view for connections list
   └─ Centered modals with max-width
```

---

## Testing Matrix

| Test Case | Mobile | Desktop | Tablet | Expected Behavior |
|-----------|--------|---------|--------|-------------------|
| **QR Scanner on mobile with camera** | ✅ | N/A | ✅ | Scanner shown, camera activates |
| **QR Scanner on mobile without camera** | ✅ | N/A | ✅ | Manual entry shown with message |
| **QR Scanner on desktop** | N/A | ✅ | N/A | Hidden; only manual entry shown |
| **Admin dashboard on mobile** | ✅ | N/A | N/A | Single column, stacked widgets |
| **Admin dashboard on desktop** | N/A | ✅ | N/A | Multi-column grid layout |
| **Messaging on mobile** | ✅ | N/A | N/A | Full-screen chat, back button to list |
| **Messaging on desktop** | N/A | ✅ | N/A | Split view (list + chat) |
| **Staff check-in on mobile** | ✅ | N/A | N/A | Large touch targets, QR scanner |
| **Staff check-in on desktop** | N/A | ✅ | N/A | Table view, keyboard shortcuts |
| **Connections list on mobile** | ✅ | N/A | N/A | Card view with swipe actions |
| **Connections list on desktop** | N/A | ✅ | N/A | Table view with sortable columns |
| **Schedule timeline on mobile** | ✅ | N/A | N/A | Horizontal scroll, narrow width |
| **Schedule timeline on desktop** | N/A | ✅ | N/A | Wide timeline, multiple sessions visible |
| **PWA install prompt on mobile** | ✅ | N/A | N/A | Shown after onboarding |
| **PWA install prompt on desktop** | N/A | ✅ | N/A | Not shown (browser use OK) |
| **Orientation change on tablet** | N/A | N/A | ✅ | Layout adapts (portrait ↔ landscape) |

---

## User Journey Examples

### Example 1: Student on Mobile at Event

**Device:** iPhone 13, iOS Safari
**Detected:** Mobile (<768px), camera available, touch device
**Experience:**
1. Opens PWA from home screen (installed)
2. Bottom navigation visible
3. Taps "Scan QR" → Camera viewfinder opens (back camera default)
4. Scans faculty QR code → Profile preview (privacy-aware)
5. Selects collaborative intents → Connection saved
6. Views connections list → Card view with large touch targets
7. Checks schedule → List view, taps timeline → Horizontal scroll
8. Sends message → Full-screen chat

### Example 2: Admin on Desktop in Office

**Device:** MacBook Pro, Chrome browser
**Detected:** Desktop (>1024px), no camera, mouse/keyboard
**Experience:**
1. Opens web app in browser (not installed)
2. Sidebar navigation visible
3. Navigates to Admin Dashboard → Multi-column grid layout
4. User management → Table view with sortable columns, search bar
5. Smartsheet import → One-click import with progress bar
6. Views analytics → Side-by-side charts
7. Exports connections to CSV → Download file
8. Views messages → Split view (list + chat)

### Example 3: Staff on Tablet at Registration Desk

**Device:** iPad Pro 11", Safari
**Detected:** Tablet (768-1024px), camera available, touch device
**Experience:**
1. Opens PWA from home screen (installed)
2. Portrait: Bottom navigation; Landscape: Sidebar navigation
3. Staff check-in screen → Hybrid layout (touch buttons + table view)
4. Searches attendee → Table view with touch-optimized rows
5. OR scans attendee QR → Camera viewfinder
6. Checks in attendee → One-tap confirmation
7. Registers walk-in → Form with large touch inputs
8. Views attendance stats → Dashboard adapts to orientation

---

## Architecture Requirements for Architect

1. **Device Detection Service**
   - Implement DeviceService class with getDeviceType(), hasCamera(), isTouchDevice()
   - Hook into React context or global state

2. **Feature Flag System**
   - Configuration file (config/features.ts)
   - isFeatureAvailable() function
   - React hooks: useDeviceType(), useHasCamera(), useFeature()

3. **Responsive Components**
   - Mobile-first CSS (Tailwind responsive classes)
   - Conditional rendering based on device type
   - Adaptive layouts (single column → multi-column)

4. **Testing Infrastructure**
   - Device emulation in CI/CD
   - Visual regression testing at all breakpoints
   - Cross-browser testing (mobile Safari, Chrome, desktop browsers)

---

**Last Updated:** 2025-12-02
**Next Review:** Architecture phase
