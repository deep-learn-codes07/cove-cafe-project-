# Firebase Hosting Deployment Guide

This guide will help you deploy the Cove Cafe Menu application to Firebase Hosting.

## Prerequisites

1. **Firebase Account**: Create one at [firebase.google.com](https://firebase.google.com)
2. **Firebase CLI**: Install with `npm install -g firebase-tools` or `npm i firebase-tools`
3. **Supabase Project**: Already configured with:
   - Categories table with `image_url` field
   - Subcategories table with `category_id` and `image_url` fields
   - Menu Items table with `subcategory_id` field
   - Storage bucket named `menu-images`

## Setup Steps

### 1. Initialize Firebase (if not already done)

```bash
firebase init hosting
```

When prompted:
- Select your Firebase project from the list
- Use current directory as public directory
- Configure as single-page app: **No** (we're serving static HTML files)
- Set up automatic builds: **No** (optional)

### 2. Configure Environment (Optional)

Update `firebase.json` to customize:
- Build cache duration for static assets
- Custom domain settings
- URL rewriting rules

Current configuration in `firebase.json`:
- Static assets (images): 1 year cache (immutable)
- CSS/JS: 24 hour cache (for updates)
- Security headers included

### 3. Update .firebaserc

The `.firebaserc` file should contain your Firebase project ID:

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

Replace `your-firebase-project-id` with your actual Firebase project ID from the Firebase Console.

### 4. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Or for production:

```bash
firebase deploy --only hosting --project=default
```

### 5. View Your Site

After deployment, visit your Firebase Hosting URL:
- Default: `https://your-firebase-project-id.web.app`
- Or use your custom domain if configured

## Environment Variables

The application uses Supabase configuration from `js/supabase.js`. Ensure:

1. **Supabase URL** and **Anon Key** are correctly set
2. Storage bucket `menu-images` is public and readable
3. Row-level security policies allow:
   - Authenticated users to read all tables
   - Authenticated users to upload to storage bucket

## Troubleshooting

### Images Not Loading
- Verify Supabase Storage bucket is public
- Check RLS policies on `storage.objects` table
- Ensure image URLs are correct in database

### Authentication Issues
- Verify Supabase Auth is enabled
- Check token expiration settings
- Clear browser cache and local storage

### Performance Issues
- Enable compression in Firebase Hosting settings
- Check image sizes (optimize to <500KB)
- Use lazy loading (already implemented)

## Monitoring & Analytics

Access Firebase Console to view:
- Traffic and bandwidth usage
- Build times and deployment history
- Performance metrics

## Rollback

To rollback to a previous version:

```bash
firebase hosting:channel:list
firebase hosting:clone production staging  # Create staging from production
```

## Custom Domain

1. Go to Firebase Console → Hosting
2. Click "Connect domain"
3. Follow domain verification steps
4. Update DNS records as instructed

## SSL/TLS

Firebase Hosting automatically provides SSL/TLS with:
- Auto-renewal of certificates
- HTTPS redirects
- HTTP/2 support

## Size Limits

- Maximum project size: 10 GB per site
- Maximum file size: 400 MB
- Recommended: Keep project under 500 MB

## Next Steps

1. Set up GitHub integration for automatic deployments:
   ```bash
   firebase init hosting:github
   ```

2. Configure branch protection and preview deployments

3. Set up monitoring and error tracking

## Support

- **Firebase Docs**: [firebase.google.com/docs/hosting](https://firebase.google.com/docs/hosting)
- **Firebase CLI**: [firebase.google.com/docs/cli](https://firebase.google.com/docs/cli)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
