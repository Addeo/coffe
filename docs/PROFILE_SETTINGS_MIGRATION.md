# Profile Settings Migration

## 📝 Overview

Settings page functionality has been migrated to the Profile page for better UX. Users now have all their personal settings in one place.

## ✅ What Changed

### Before:
- **Profile page**: Personal info, security, engineer data
- **Settings page**: Theme selection, notifications, general settings

### After:
- **Profile page**: Personal info, security, **theme settings**, engineer data
- **Settings page**: ❌ Removed from navigation (can be deleted)

## 🎯 Why This Change?

1. **Better UX**: All user-related settings in one place
2. **Simpler Navigation**: One less menu item
3. **More Logical**: Theme is a personal preference, belongs in Profile
4. **Cleaner**: Settings page had too little content to justify a separate page

## 🔧 Technical Changes

### Files Modified:

#### 1. `profile.component.ts`
- Added `ThemeService` injection
- Added `MatSelectModule` and `MatSlideToggleModule`
- Added theme selection state and methods
- Added `onThemeChange()` method

#### 2. `profile.component.html`
- Added new "Настройки оформления" (Preferences) section
- Theme selector with icons
- Live theme preview box
- Shows current theme status

#### 3. `profile.component.scss`
- Added `.preferences-card` styles
- Added `.theme-preview` styles
- Added responsive styles for mobile

#### 4. `navigation.component.ts`
- Removed "Settings" menu item for admins
- Simplified navigation items

## 🎨 New Features in Profile

### Theme Selection Section

Located in the "Общие данные" (General Information) tab, after the Security section.

**Features:**
- ☀️ Light theme option
- 🌙 Dark theme option
- 🔄 Auto theme option (follows system)
- Live preview of current theme
- Instant feedback when changing theme

**UI Components:**
- Theme icon indicator
- Dropdown selector with icons
- Hint text for auto mode
- Preview box showing active theme

## 📱 Location

**Desktop & Mobile:**
```
Profile → Общие данные tab → Scroll down → "Настройки оформления"
```

**Path:**
```
/profile → first tab → third card
```

## 🚀 How to Use

### For Users:

1. Go to **Profile** page
2. Stay on **"Общие данные"** tab
3. Scroll down to **"Настройки оформления"** section
4. Select your preferred theme from dropdown
5. Theme changes **instantly**

### For Developers:

```typescript
// Theme service is injected in ProfileComponent
private themeService = inject(ThemeService);

// Theme selection handler
onThemeChange(theme: Theme): void {
  this.themeService.setTheme(theme);
  this.snackBar.open(`Тема изменена`, 'OK', { duration: 2000 });
}

// Current theme signal
currentTheme = this.themeService.currentTheme;

// Effective theme (resolved from auto)
effectiveTheme = this.themeService.effectiveTheme;
```

## 🗑️ Can Be Deleted

The following files are no longer used and can be safely deleted:

- `frontend/src/app/pages/settings/settings.component.ts`
- `frontend/src/app/pages/settings/settings.component.html`
- `frontend/src/app/pages/settings/settings.component.scss`

**Note:** Keep them for now if you plan to add more settings in the future. Otherwise, delete them to reduce codebase size.

## 🔄 Migration Path

If you want to revert or add Settings page back:

1. Restore Settings route in `app.routes.ts`
2. Add Settings menu item back to `navigation.component.ts`
3. Move theme section from Profile back to Settings

But current UX is recommended - keeps everything user-related in Profile.

## ✨ Benefits

### For Users:
- ✅ Fewer clicks to change theme
- ✅ All personal settings in one place
- ✅ Simpler navigation
- ✅ Logical organization

### For Developers:
- ✅ Less code duplication
- ✅ Simpler navigation structure
- ✅ Easier to maintain
- ✅ Better code organization

## 📊 Impact

### Navigation Changes:

**Before:**
```
- Users
- Organizations
- Statistics
- Orders
- Profile
- Notifications
- Settings  ← Removed
```

**After:**
```
- Users
- Organizations
- Statistics
- Orders
- Profile     ← Now includes theme settings
- Notifications
```

### Profile Page Structure:

```
Profile
├── Avatar Section (top)
└── Tabs
    ├── Общие данные
    │   ├── Информация о профиле
    │   ├── Безопасность
    │   └── Настройки оформления  ← NEW
    ├── Ставки по организациям (engineers only)
    └── Данные по машине (engineers only)
```

## 🎓 Code Examples

### Theme Selection UI

```html
<mat-card class="preferences-card">
  <mat-card-header>
    <mat-card-title>
      <mat-icon>palette</mat-icon>
      Настройки оформления
    </mat-card-title>
  </mat-card-header>

  <mat-card-content>
    <div class="preference-item">
      <div class="preference-info">
        <mat-icon>{{ currentThemeIcon }}</mat-icon>
        <div>
          <h4>Тема оформления</h4>
          <p>Выберите тему</p>
        </div>
      </div>
      <mat-form-field>
        <mat-select 
          [value]="currentTheme()" 
          (selectionChange)="onThemeChange($event.value)"
        >
          <mat-option *ngFor="let theme of themes" [value]="theme.value">
            <mat-icon>{{ theme.icon }}</mat-icon>
            {{ theme.label }}
          </mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <!-- Preview -->
    <div class="theme-preview" [class.dark-preview]="effectiveTheme() === 'dark'">
      <mat-icon>{{ effectiveTheme() === 'dark' ? 'dark_mode' : 'light_mode' }}</mat-icon>
      <span>{{ effectiveTheme() === 'dark' ? 'Темная' : 'Светлая' }} тема активна</span>
    </div>
  </mat-card-content>
</mat-card>
```

### Theme Change Handler

```typescript
onThemeChange(theme: Theme): void {
  this.themeService.setTheme(theme);
  const themeLabel = this.themes.find(t => t.value === theme)?.label;
  this.snackBar.open(`Тема изменена на: ${themeLabel}`, 'OK', {
    duration: 2000,
  });
}
```

## 🐛 Troubleshooting

### Theme not changing?

**Check:**
1. ThemeService is properly injected
2. Browser localStorage is enabled
3. No console errors
4. Page refresh (Ctrl+F5)

### Preview not updating?

**Check:**
1. Signals are properly bound: `currentTheme()` with parentheses
2. `effectiveTheme()` is used in template
3. CSS variables are loaded (themes.scss)

### Mobile layout broken?

**Check:**
1. Responsive styles in `profile.component.scss`
2. `.preference-item` has proper flex direction on mobile
3. Theme preview has proper padding

## 📞 Support

For questions or issues:
1. Check this documentation
2. Review `profile.component.ts` implementation
3. Check browser console for errors
4. Verify theme.service.ts is working

---

**Migration Date**: October 2025  
**Version**: 2.0.0  
**Status**: ✅ Complete

