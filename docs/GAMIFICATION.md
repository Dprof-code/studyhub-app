# StudyHub Gamification System

A comprehensive gamification system for the StudyHub learning platform that includes XP, levels, achievements, reputation, leaderboards, and content voting.

## Features

### 🎮 Core Gamification

- **Experience Points (XP)**: Earn XP through various activities
- **Level System**: 10+ levels with increasing XP requirements
- **Reputation Score**: Community-driven reputation system
- **Activity Streaks**: Track consecutive days of activity

### 🏆 Achievements & Badges

- **Multiple Categories**: Learning, Participation, Contribution, Social, Streak, Special
- **Progress Tracking**: Track progress toward unlocking achievements
- **Badge System**: Visual badges for unlocked achievements
- **Real-time Notifications**: Toast notifications for unlocks

### 📊 Leaderboards

- **Multiple Types**: Overall score, XP, contributions, participation, streaks
- **Time Filters**: Weekly, monthly, all-time rankings
- **Department Filtering**: Department-specific leaderboards
- **User Ranking**: See your position even if not in top results

### 🗳️ Content Voting

- **Vote Types**: Upvote, Helpful, Quality Content, Expert Approval
- **Weighted Voting**: Votes weighted by user reputation
- **Vote History**: Track who voted and when
- **Real-time Updates**: Live vote count updates

## Database Schema

The gamification system uses the following Prisma models:

### UserStats

```prisma
model UserStats {
  id                   Int      @id @default(autoincrement())
  userId               Int      @unique
  level               Int      @default(1)
  xp                  Int      @default(0)
  reputationScore     Int      @default(0)
  streak              Int      @default(0)
  totalContributions  Int      @default(0)
  totalVotesReceived  Int      @default(0)
  totalVotesGiven     Int      @default(0)
  lastActivityDate    DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Achievement System

- `Achievement`: Achievement definitions
- `UserAchievement`: User progress on achievements
- `ActivityLog`: Activity tracking for XP calculation

### Voting System

- `ContentVote`: Individual votes on content
- `LeaderboardEntry`: Cached leaderboard positions

## API Endpoints

### Core Endpoints

- `GET /api/gamification/stats/[userId]` - Get user statistics
- `POST /api/gamification/activity` - Record user activity
- `GET /api/gamification/achievements` - Get achievements
- `GET /api/gamification/leaderboard` - Get leaderboard data
- `POST /api/gamification/vote` - Vote on content

## Activity Types & XP Rewards

```typescript
const ACTIVITY_POINTS = {
  RESOURCE_UPLOAD: 20,
  DISCUSSION_POST: 15,
  COMMENT: 5,
  RESOURCE_DOWNLOAD: 2,
  PROFILE_VIEW: 1,
  VOTE_CAST: 3,
  VOTE_RECEIVED: 5,
  ACHIEVEMENT_UNLOCK: 50,
  DAILY_LOGIN: 10,
  FIRST_RESOURCE: 30,
  FIRST_DISCUSSION: 25,
};
```

## React Components

### Main Components

#### GamificationDashboard

Complete dashboard with tabs for overview, achievements, leaderboard, and challenges.

```tsx
import { GamificationDashboard } from "@/components/gamification";

<GamificationDashboard userId="123" compact={false} />;
```

#### UserStatsDisplay

User statistics with progress bars and level information.

```tsx
import { UserStatsDisplay } from "@/components/gamification";

<UserStatsDisplay
  userId="123"
  variant="full" // 'full' | 'compact' | 'minimal'
/>;
```

#### AchievementsDisplay

Achievement gallery with progress tracking.

```tsx
import { AchievementsDisplay } from "@/components/gamification";

<AchievementsDisplay userId="123" showOnlyUnlocked={false} compact={false} />;
```

#### Leaderboard

Competitive rankings with filtering options.

```tsx
import { Leaderboard } from "@/components/gamification";

<Leaderboard
  department="CS"
  timeframe="weekly"
  limit={50}
  showUserRank={true}
/>;
```

#### ContentVoting

Voting interface for resources, posts, and comments.

```tsx
import { ContentVoting } from "@/components/gamification";

<ContentVoting
  contentId={123}
  contentType="resource"
  size="md"
  showDetails={true}
/>;
```

### Utility Components

#### GamificationWidget

Quick integration component for common use cases.

```tsx
import { GamificationWidget } from '@/components/gamification';

// Quick stats
<GamificationWidget type="quick-stats" userId="123" />

// Voting widget
<GamificationWidget
  type="voting"
  contentId={123}
  contentType="post"
  size="sm"
/>

// Stats display
<GamificationWidget type="stats" userId="123" size="lg" />
```

## Hooks

### useGamification

Primary hook for gamification data and actions.

```tsx
import { useGamification } from "@/components/gamification";

const {
  stats,
  achievements,
  loading,
  error,
  refreshStats,
  recordActivity,
  voteOnContent,
  calculateLevel,
  getXpForNextLevel,
  getProgressToNextLevel,
} = useGamification(userId);
```

### useQuickStats

Lightweight hook for basic stats.

```tsx
import { useQuickStats } from "@/components/gamification";

const { level, xp, reputation, streak, loading } = useQuickStats(userId);
```

### useAchievementProgress

Track specific achievement progress.

```tsx
import { useAchievementProgress } from "@/components/gamification";

const { progress, unlocked, unlockedAt } = useAchievementProgress(
  achievementId,
  userId
);
```

## Integration Examples

### Recording Activity

```tsx
const { recordActivity } = useGamification();

// When user uploads a resource
await recordActivity("RESOURCE_UPLOAD", { resourceId: 123 });

// When user comments
await recordActivity("COMMENT", { discussionId: 456 });
```

### Adding Voting to Content

```tsx
function ResourceCard({ resource }) {
  return (
    <div className="resource-card">
      <h3>{resource.title}</h3>
      <p>{resource.description}</p>

      <ContentVoting
        contentId={resource.id}
        contentType="resource"
        showDetails={true}
      />
    </div>
  );
}
```

### Profile Integration

```tsx
function UserProfile({ userId }) {
  return (
    <div className="profile">
      <h2>User Profile</h2>

      <UserStatsDisplay userId={userId} variant="full" />

      <div className="achievements-section">
        <AchievementsDisplay
          userId={userId}
          showOnlyUnlocked={true}
          compact={true}
        />
      </div>
    </div>
  );
}
```

## Customization

### Styling

All components use Tailwind CSS and can be customized via className props or by modifying the component styles.

### XP Values

Modify the `ACTIVITY_POINTS` object in `/lib/gamification.ts` to adjust XP rewards.

### Achievement Definitions

Add new achievements to the database via the Prisma schema and seed files.

### Level Thresholds

Customize level requirements in the `calculateLevel` function in `/lib/gamification.ts`.

## Performance Considerations

- Leaderboard data is cached and updated periodically
- User stats are fetched on-demand and cached in React state
- Activity logging is asynchronous and doesn't block user interactions
- Large leaderboards are paginated to improve load times

## Security

- All endpoints require authentication
- Vote weighting prevents manipulation
- Activity logging includes validation to prevent abuse
- User rankings respect privacy settings

## Future Enhancements

- Daily challenges system
- Team competitions
- Seasonal events
- Custom badge creation
- Advanced analytics dashboard
- Integration with external learning platforms
