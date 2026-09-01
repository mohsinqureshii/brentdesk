# Square Design System Specification for TechScoop Admin

## 1. Color Palette

### Primary Colors
- **Primary Blue**: `#0066FF` (RGB: 0, 102, 255) - Main action color, buttons, links
- **Primary Blue Dark**: `#0052CC` (RGB: 0, 82, 204) - Hover state, active state
- **Primary Blue Darker**: `#003D99` (RGB: 0, 61, 153) - Pressed state

### Neutral Colors
- **White**: `#FFFFFF` - Backgrounds, cards
- **Gray 50**: `#F9FAFB` - Light backgrounds, disabled states
- **Gray 100**: `#F3F4F6` - Subtle backgrounds
- **Gray 200**: `#E5E7EB` - Borders, dividers
- **Gray 300**: `#D1D5DB` - Secondary borders
- **Gray 400**: `#9CA3AF` - Placeholder text
- **Gray 500**: `#6B7280` - Secondary text
- **Gray 600**: `#4B5563` - Primary text
- **Gray 700**: `#374151` - Headings
- **Gray 900**: `#111827` - Dark text

### Status Colors
- **Success**: `#10B981` - Approved, published, active
- **Warning**: `#F59E0B` - In progress, pending, draft
- **Error**: `#EF4444` - Rejected, error, failed
- **Info**: `#3B82F6` - Information, neutral

### Semantic Colors
- **Background**: `#FFFFFF` (white)
- **Surface**: `#F9FAFB` (gray-50)
- **Border**: `#E5E7EB` (gray-200)
- **Text Primary**: `#111827` (gray-900)
- **Text Secondary**: `#6B7280` (gray-500)

## 2. Typography

### Font Family
- **Primary**: Google Sans (sans-serif)
- **Fallback**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif

### Font Sizes & Weights
- **Display (H1)**: 32px / 40px line-height, 600 weight
- **Heading 1 (H2)**: 24px / 32px line-height, 600 weight
- **Heading 2 (H3)**: 20px / 28px line-height, 600 weight
- **Heading 3 (H4)**: 16px / 24px line-height, 600 weight
- **Body Large**: 16px / 24px line-height, 400 weight
- **Body**: 14px / 20px line-height, 400 weight
- **Body Small**: 12px / 16px line-height, 400 weight
- **Caption**: 11px / 16px line-height, 400 weight

## 3. Spacing System (4px base)

- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 24px
- **2xl**: 32px
- **3xl**: 48px
- **4xl**: 64px

## 4. Component Specifications

### Tables
- **Row Height**: 44px (comfortable), 36px (compact)
- **Cell Padding**: 12px horizontal, 10px vertical
- **Header Background**: `#F9FAFB` (gray-50)
- **Header Font**: 12px, 600 weight, gray-600
- **Row Border**: 1px solid `#E5E7EB`
- **Hover State**: `#F3F4F6` (gray-100)
- **No extra white space** - Compact, efficient layout
- **Column alignment**: Left-aligned text, right-aligned numbers/currency

### Cards
- **Background**: `#FFFFFF` (white)
- **Border**: 1px solid `#E5E7EB`
- **Border Radius**: 4px (rounded-sm)
- **Shadow**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)` (shadow-sm)
- **Hover Shadow**: `0 4px 6px -1px rgba(0, 0, 0, 0.1)` (shadow-md)
- **Padding**: 16px (lg)
- **Gap between cards**: 16px

### Buttons
- **Primary Button**:
  - Background: `#0066FF`
  - Text: White
  - Padding: 8px 16px (py-2 px-4)
  - Border Radius: 4px
  - Font: 14px, 500 weight
  - Hover: `#0052CC`
  - Active: `#003D99`
  - Disabled: Gray-200 background, gray-400 text

- **Secondary Button**:
  - Background: `#F3F4F6`
  - Text: `#111827`
  - Border: 1px solid `#E5E7EB`
  - Padding: 8px 16px
  - Hover: `#E5E7EB` background

- **Ghost Button**:
  - Background: Transparent
  - Text: `#0066FF`
  - Border: None
  - Hover: `#F3F4F6` background

### Inputs
- **Background**: `#FFFFFF`
- **Border**: 1px solid `#E5E7EB`
- **Border Radius**: 4px
- **Padding**: 8px 12px
- **Font**: 14px, 400 weight
- **Focus**: 2px solid `#0066FF` border
- **Placeholder**: `#9CA3AF` (gray-400)
- **Disabled**: `#F9FAFB` background, `#D1D5DB` border

### Badges
- **Success**: Green-100 background, green-700 text
- **Warning**: Yellow-100 background, yellow-700 text
- **Error**: Red-100 background, red-700 text
- **Info**: Blue-100 background, blue-700 text
- **Padding**: 4px 8px
- **Border Radius**: 4px
- **Font**: 12px, 500 weight

## 5. Visual Hierarchy

### Shadows
- **None**: No shadow (flat design)
- **Shadow-sm**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)` - Cards, inputs
- **Shadow-md**: `0 4px 6px -1px rgba(0, 0, 0, 0.1)` - Hover states, elevated elements
- **Shadow-lg**: `0 10px 15px -3px rgba(0, 0, 0, 0.1)` - Modals, dropdowns

### Borders
- **Thin**: 1px solid `#E5E7EB`
- **Medium**: 2px solid `#E5E7EB`
- **Thick**: 3px solid `#0066FF`

## 6. Responsive Design

### Breakpoints
- **Mobile**: 0px - 640px (sm)
- **Tablet**: 641px - 1024px (md)
- **Desktop**: 1025px+ (lg)

### Layout Rules
- **Mobile**: Single column, full-width cards, simplified navigation
- **Tablet**: Two columns, adjusted spacing
- **Desktop**: Multi-column, full-featured layout

## 7. Spacing Guidelines

### Sections
- **Page Padding**: 16px (mobile), 24px (tablet), 32px (desktop)
- **Section Gap**: 24px
- **Card Gap**: 16px
- **Element Gap**: 8px - 12px

### Density Levels
- **Comfortable**: 44px row height, 12px padding
- **Compact**: 36px row height, 8px padding
- **Dense**: 32px row height, 6px padding

## 8. Implementation Rules

1. **No excessive white space** - Every pixel should serve a purpose
2. **Consistent spacing** - Use the 4px scale throughout
3. **Clear visual hierarchy** - Use size, weight, and color to guide attention
4. **Minimal shadows** - Use shadows sparingly for depth
5. **Rounded corners** - Use 4px radius for consistency
6. **Blue primary color** - Use `#0066FF` for all primary actions
7. **Google Sans font** - Use throughout for consistency
8. **Mobile-first** - Design for mobile, then enhance for larger screens
