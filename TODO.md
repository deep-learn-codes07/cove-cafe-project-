# TODO — Premium Supabase Menu UI

- [ ] Replace `cafe-menu/menu.html` with required premium structure:
  - [ ] Sticky top category bar
  - [ ] Desktop: left sticky vertical subcategory thumbnail nav
  - [ ] Desktop/right: sections grouped by subcategory on same page
  - [ ] Mobile: horizontal scroll subcategory cards; sections remain stacked
  - [ ] Keep item details modal + WhatsApp ordering button
- [ ] Replace `cafe-menu/css/menu.css` (or wire it up) with premium dark glassmorphism + gold accent + card hover animations + skeleton styles.
- [ ] Rewrite `cafe-menu/js/menu.js`:
  - [ ] Fetch categories from Supabase
  - [ ] On category click, fetch subcategories + menu items and render all sections in one page
  - [ ] Render menu cards with badges (veg/non-veg dot, bestseller, sold out)
  - [ ] Smooth scroll on left-nav click + active section tracking (IntersectionObserver)
  - [ ] Real-time search across item name/description/subcategory (instant re-render)
  - [ ] Skeleton loaders + lazy image loading
- [ ] Adjust `cafe-menu/js/supabase.js` only if needed for ordering (`display_order` over `created_at`) and WhatsApp link formatting.
- [ ] Run quick manual test in browser:
  - [ ] Category switch works
  - [ ] Scroll highlight works
  - [ ] Modal data correctness
  - [ ] Search filters correctly

