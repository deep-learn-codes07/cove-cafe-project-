# Cove Cafe — Modern Digital Menu

A premium, responsive cafe menu application built with vanilla JavaScript, Supabase, and Firebase Hosting. Features a hierarchical category structure (Categories → Subcategories → Menu Items), glassmorphism UI, and full admin dashboard.

## Features

✨ **User Interface**
- Dark premium cafe theme with glassmorphism cards
- Mobile-first responsive design
- Lazy loading for images
- Loading skeletons for better UX
- Smooth animations and transitions

🎯 **Navigation**
- Hierarchical menu structure (3 levels)
- Category cards with banner images
- Subcategory cards with item counts
- Breadcrumb navigation for easy back-tracking
- Search functionality across all levels

🍽️ **Menu Display**
- Dynamic menu items from Supabase
- Item details: name, description, price, ingredients, allergens
- Veg/Non-Veg badges
- Bestseller indicators
- Availability status
- High-quality image support with lazy loading

👨‍💼 **Admin Dashboard**
- Full CRUD operations for categories, subcategories, and menu items
- Image upload to Supabase Storage
- Real-time data updates
- Secure authentication

🔒 **Security**
- Row-level security (RLS) on all tables
- Authenticated user access only
- Secure image upload with validation
- HTTPS on Firebase Hosting

## Project Structure

```
cafe-menu/
├── index.html                 # Landing page with featured items
├── menu.html                  # Main menu with hierarchical navigation
├── admin.html                 # Admin dashboard
├── 404.html                   # Error page
│
├── css/
│   ├── styles.css            # Main stylesheet with glassmorphism
│   ├── ui-ux-enhancements.css # Modal and UX improvements
│   └── index.css              # Legacy styles
│
├── js/
│   ├── supabase.js           # Supabase client & API functions
│   ├── menu.js               # Menu navigation logic (3-level hierarchy)
│   ├── admin.js              # Admin CRUD operations
│   ├── auth-gate.js          # Authentication and authorization
│   ├── home.js               # Landing page logic
│   ├── page-transition.js    # Page transition effects
│   ├── ui.js                 # UI utility functions
│   └── ui-ux-enhancements.js # Modal and interaction enhancements
│
├── supabase/
│   └── schema.sql            # Database schema and RLS policies
│
├── assets/
│   ├── logo/                 # Logo files
│   ├── background.mp4        # Hero video
│   └── og-cover.jpg          # Open Graph image
│
├── firebase.json             # Firebase Hosting configuration
├── .firebaserc               # Firebase project ID
├── FIREBASE_DEPLOYMENT.md    # Deployment guide
├── README.md                 # This file
└── package.json              # Project metadata
```

## Database Schema

### Categories Table
```sql
- id (UUID, PK)
- name (Text, UNIQUE)
- image_url (Text)
- display_order (Int)
- created_at (Timestamp)
```

### Subcategories Table
```sql
- id (UUID, PK)
- category_id (UUID, FK)
- name (Text)
- image_url (Text)
- display_order (Int)
- created_at (Timestamp)
```

### Menu Items Table
```sql
- id (UUID, PK)
- subcategory_id (UUID, FK)
- name (Text)
- description (Text)
- ingredients (Text)
- allergens (Text)
- price (Decimal)
- image_url (Text)
- is_available (Boolean)
- is_bestseller (Boolean)
- is_veg (Boolean)
- created_at (Timestamp)
```

## Setup Instructions

### 1. Clone Repository
```bash
git clone <repository-url>
cd cafe-menu
```

### 2. Configure Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run SQL from `supabase/schema.sql` in Supabase SQL Editor
3. Create storage bucket named `menu-images` (public)
4. Copy your Supabase URL and Anon Key

### 3. Update Configuration
Edit `js/supabase.js`:
```javascript
export const SUPABASE_URL = "your-supabase-url";
export const SUPABASE_ANON_KEY = "your-anon-key";
```

### 4. Customize Cafe Details
Edit `js/supabase.js` - CAFE object:
```javascript
export const CAFE = {
  name: "Your Cafe Name",
  phone: "+91 XXXXXXXXXX",
  whatsapp: "91 XXXXXXXXXX",
  mapsUrl: "https://maps.link",
  hours: { open: 8, close: 23 },
  storageBucket: "menu-images"
};
```

### 5. Local Testing
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using VS Code
# Right-click index.html → "Open with Live Server"
```

Visit `http://localhost:8000`

### 6. Deploy to Firebase
See [FIREBASE_DEPLOYMENT.md](FIREBASE_DEPLOYMENT.md)

## Usage

### For Customers

1. **Browse Menu**
   - Start at categories level
   - Click category to see subcategories
   - Click subcategory to see menu items
   - Use breadcrumb to navigate back

2. **Search**
   - Use search bar to find items across all views
   - Search works on name, description, ingredients, allergens

3. **View Details**
   - Tap menu item to see full details
   - Check ingredients, allergens, price
   - See veg/non-veg and bestseller status

4. **Order**
   - Click "Order on WhatsApp" to send order directly

### For Admin

1. **Access Admin Panel**
   - Go to `/admin.html`
   - Sign in with Supabase credentials

2. **Manage Categories**
   - Add new categories with banner images
   - Set display order
   - Delete categories

3. **Manage Subcategories**
   - Create subcategories under categories
   - Upload subcategory images
   - Set order and display

4. **Manage Menu Items**
   - Create items with images, description, price
   - Set ingredients and allergens
   - Mark as veg/non-veg, bestseller, available
   - Edit or delete items

5. **Upload Images**
   - Use file input in item editor
   - Automatically uploaded to Supabase Storage
   - Images organized by category

## Technology Stack

- **Frontend**: Vanilla JavaScript ES6 Modules
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Hosting**: Firebase Hosting
- **Styling**: CSS3 with glassmorphism
- **Fonts**: Google Fonts (Cormorant Garamond, Inter)
- **Icons**: Lucide Icons

## Performance Features

⚡ **Optimization**
- Lazy loading images
- Skeleton loaders for UX
- Efficient DOM updates
- CSS animations (GPU accelerated)
- Responsive images with srcset
- Minified assets recommended

📱 **Mobile Optimization**
- Touch-friendly buttons (44px minimum)
- Readable font sizes
- Optimized viewport
- Fast interactions

🎨 **Accessibility**
- Semantic HTML
- ARIA labels
- Color contrast compliance
- Keyboard navigation support

## Security Considerations

🔐 **Best Practices Implemented**
- Row-level security on database
- Authenticated user checks
- Input sanitization (XSS prevention)
- Environment variable usage
- HTTPS enforcement on Firebase

⚠️ **Important Setup**
1. Never commit Supabase keys to version control
2. Use `.env` or `.env.local` for secrets
3. Enable RLS on all Supabase tables
4. Verify storage policies allow only authenticated uploads
5. Keep Supabase auth enabled

## Customization

### Change Theme Colors
Edit CSS variables in `css/styles.css`:
```css
:root {
  --gold: #d4a85c;
  --gold-2: #8a6524;
  --text: #f5f5f5;
  --surface: #15151c;
  /* ... more variables */
}
```

### Modify Cafe Info
Edit object in `js/supabase.js`:
- Cafe name, phone, hours
- WhatsApp number for orders
- Maps location
- Storage bucket name

### Customize Copy/Strings
Search for hardcoded strings in:
- `menu.html` - Page titles and descriptions
- `js/menu.js` - Loading/error messages
- `js/admin.js` - Admin text

### Add Languages
Create locale files:
- `js/i18n.en.js`
- `js/i18n.es.js`
Use dynamic imports based on `navigator.language`

## Troubleshooting

### Images Not Appearing
```javascript
// Check:
1. Supabase bucket is public
2. RLS policies allow anonymous read
3. Image URL is in correct format
4. File actually exists in storage
```

### Auth Issues
```javascript
// Verify:
1. Supabase auth enabled
2. User created in auth section
3. Check browser console for errors
4. Clear localStorage and try again
```

### Menu Not Loading
```javascript
// Check:
1. Supabase URL and key in supabase.js
2. Tables exist in Supabase
3. RLS policies allow authenticated read
4. Browser console for specific errors
```

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Performance Metrics

Typical performance (with optimization):
- **First Contentful Paint**: < 2s
- **Largest Contentful Paint**: < 3s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3.5s

## Future Enhancements

🚀 **Planned Features**
- [ ] Cart system with local storage
- [ ] Reservation system
- [ ] Customer reviews and ratings
- [ ] Multi-language support
- [ ] Progressive Web App (PWA)
- [ ] Real-time order notifications
- [ ] Analytics dashboard
- [ ] QR code generation
- [ ] Social media integration
- [ ] Email notifications

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check [FAQ](#faq)
- Review [FIREBASE_DEPLOYMENT.md](FIREBASE_DEPLOYMENT.md)
- Check Supabase documentation
- Create GitHub issue

## FAQ

**Q: How do I add a new category?**
A: Go to Admin → Categories form → Enter name and image URL → Click +

**Q: Can I use my own images?**
A: Yes, upload to Supabase Storage or use image URLs directly

**Q: How do customers order?**
A: Click menu item → Tap "Order on WhatsApp" to send order

**Q: Is it secure?**
A: Yes, uses Supabase RLS, auth, HTTPS, and input sanitization

**Q: Can I deploy to other platforms?**
A: Yes! Works on any static host - Vercel, Netlify, GitHub Pages, etc.

## Credits

Built with ❤️ for Cove Cafe using modern web technologies.

---

**Last Updated**: June 2026
**Version**: 2.0 (With Subcategories)
