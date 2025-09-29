# Phase 7: Notifications & PWA Setup Guide

## 🚀 Quick Setup

### 1. Environment Variables

Add these to your `.env` file:

```env
# Redis Configuration (required for background job processing)
REDIS_URL=redis://localhost:6379

# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_SUBJECT=mailto:your-email@domain.com

# Email Configuration (optional - for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 2. Generate VAPID Keys

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID key pair
web-push generate-vapid-keys

# Copy the keys to your .env file
```

### 3. Start Redis Server

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install Redis locally and run:
redis-server
```

### 4. Run Database Migration

The notification tables are already included in the Prisma schema:

```bash
npx prisma migrate dev --name add_notification_system
npx prisma generate
```

### 5. Start Development Server

```bash
npm run dev
```

## 📱 PWA Features

### Installation

- Visit the app in Chrome/Edge
- Look for the install prompt or use the floating install card
- Click "Install App" to add StudyHub to your device

### Features Included

- ✅ **Offline Access**: Core pages work without internet
- ✅ **Push Notifications**: Real-time notifications even when app is closed
- ✅ **App Shortcuts**: Quick access to Dashboard, Courses, Resources, Chat
- ✅ **Native Feel**: Standalone app experience
- ✅ **Background Sync**: Actions sync when connectivity returns

## 🔔 Notification System

### Notification Types

- **System**: Important system updates and maintenance
- **Course**: Course activities and updates
- **Assignment**: Deadline reminders and submissions
- **Discussion**: New posts and replies
- **Peer Match**: Study partner matches and invitations
- **Achievement**: Badges and milestone celebrations
- **Reminder**: Study reminders and scheduled alerts
- **Collaboration**: Team invitations and requests
- **Resource**: New learning materials available
- **Gamification**: Points, levels, and leaderboard updates
- **AI Recommendation**: Personalized study suggestions
- **General**: Miscellaneous platform notifications

### Priority Levels

- **LOW**: Silent notifications, batched for digest
- **MEDIUM**: Standard notifications with normal timing
- **HIGH**: Important notifications that bypass quiet hours
- **URGENT**: Critical notifications with immediate delivery

### User Controls

- **Delivery Methods**: Choose between push, email, and in-app notifications
- **Category Preferences**: Enable/disable specific notification types
- **Quiet Hours**: Set do-not-disturb periods
- **Email Digest**: Configure summary emails (daily/weekly/monthly)
- **Push Permissions**: Browser-level notification controls

## 🛠 For Developers

### Creating Notifications

```typescript
import { notificationService } from "@/lib/notificationService";

// Create a notification
await notificationService.createNotification({
  userId: 123,
  type: "COURSE",
  title: "New Course Available",
  message: "Introduction to Machine Learning is now available",
  priority: "MEDIUM",
  actionUrl: "/courses/ml-101",
});

// Create notifications for multiple users
await notificationService.createBulkNotifications([
  {
    userId: 1,
    type: "SYSTEM",
    title: "Maintenance",
    message: "Scheduled maintenance tonight",
  },
  {
    userId: 2,
    type: "ACHIEVEMENT",
    title: "Milestone!",
    message: "You completed your first course!",
  },
]);
```

### Background Jobs

```typescript
import { NotificationQueue, EmailQueue, AIQueue } from "@/lib/queue/bullQueues";

// Queue a notification
await NotificationQueue.add("pushNotification", {
  userId: 123,
  title: "Study Reminder",
  body: "Time for your daily review session!",
});

// Queue an email
await EmailQueue.add("sendEmail", {
  to: "user@example.com",
  subject: "Welcome to StudyHub",
  template: "welcome",
  data: { name: "John" },
});

// Queue AI processing
await AIQueue.add("processResource", {
  resourceId: 456,
  userId: 123,
});
```

### PWA Manifest Customization

Edit `/public/manifest.json` to customize:

- App name and description
- Theme colors and icons
- App shortcuts and categories
- Share targets and protocol handlers

### Service Worker Features

The service worker (`/public/sw.js`) provides:

- **Smart Caching**: Different strategies for different content types
- **Background Sync**: Queue failed requests for retry
- **Push Notifications**: Handle incoming push messages
- **Offline Fallbacks**: Show meaningful offline pages

## 📊 Monitoring & Analytics

### Notification Stats

Access `/api/notifications/stats` for:

- Total notification count
- Unread notifications
- High-priority alerts

### Queue Monitoring

The Bull dashboard will be available at `/admin/queues` (when implemented) showing:

- Job processing rates
- Failed jobs and retries
- Queue health metrics

### PWA Analytics

Track PWA effectiveness with:

- Installation rates
- Service worker cache performance
- Push notification engagement
- Offline usage patterns

## 🎯 User Experience

### Notification Bell

- **Live Updates**: Real-time unread count with animations
- **Visual Priorities**: Different colors for high-priority notifications
- **Quick Access**: Click to open notification center

### Notification Center

- **Smart Filtering**: All/Unread/Read views
- **Batch Actions**: Mark all as read
- **Rich Content**: Priority badges, timestamps, action buttons
- **Interactive**: Click notifications to navigate to relevant content

### Settings Panel

- **Granular Control**: Individual category toggles
- **Time-based Rules**: Quiet hours configuration
- **Delivery Preferences**: Multi-channel notification settings
- **Email Digest**: Customizable summary frequencies

## 🔧 Troubleshooting

### Push Notifications Not Working

1. Check VAPID keys are correctly set in environment
2. Verify Redis is running and accessible
3. Ensure HTTPS is used (required for push notifications)
4. Check browser notification permissions

### PWA Not Installing

1. Ensure manifest.json is accessible at `/manifest.json`
2. Verify HTTPS is enabled
3. Check service worker is registered successfully
4. Confirm all required manifest fields are present

### Background Jobs Not Processing

1. Confirm Redis connection is working
2. Check Bull queue workers are started
3. Verify job data format matches expected schema
4. Look for errors in queue processing logs

### Database Issues

```bash
# Reset database if needed
npx prisma migrate reset --force

# Or apply specific migration
npx prisma migrate deploy
```

## 🚀 Production Deployment

### Required Services

- **Redis**: For job queues and session storage
- **SMTP Server**: For email notifications (optional)
- **HTTPS Certificate**: Required for PWA and push notifications

### Environment Setup

```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=your_production_database_url
REDIS_URL=your_production_redis_url
NEXTAUTH_SECRET=your_secure_secret
NEXTAUTH_URL=https://your-domain.com
```

### Deployment Checklist

- [ ] VAPID keys generated and configured
- [ ] Redis instance running and accessible
- [ ] Database migrated with notification tables
- [ ] HTTPS enabled for domain
- [ ] Service worker accessible from root domain
- [ ] PWA icons and screenshots uploaded
- [ ] Email SMTP configured (if using email notifications)
- [ ] Environment variables set in production
- [ ] Background job workers started

---

**Phase 7 is now complete and ready for production deployment! 🎉**

The comprehensive notification system and PWA capabilities transform StudyHub into a modern, native-like educational platform with advanced communication features and offline functionality.
