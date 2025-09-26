# 📚 StudyHub – Community-Driven Learning Platform

StudyHub is a collaborative learning system for students, faculty, and administrators. It enables sharing resources, discussions, peer matching, collaborative course documentation, and gamified recognition.

---

## 🎯 Core Goals
- Facilitate **student-to-student collaboration** (resources, discussions, peer study groups).
- Allow **faculty to validate content** and mentor contributors.
- Provide **structured course documentation** with version control.
- Gamify participation using a **badge & reputation system**.
- Support **moderation, governance, and access control** for admins.

---

## 👥 Actor Roles
1. **Student**
   - Sign up / sign in with password or Google.
   - Edit profile, track badge progress.
   - Upload and share resources.
   - Participate in discussion forums.
   - Collaboratively edit course docs.
   - Find study partners via peer matching.
   - Earn badges.

2. **Faculty Member**
   - Validate and moderate content.
   - Create official course descriptions.
   - Mentor contributors.
   - Participate in discussions.

3. **Course Creator** (advanced student or faculty)
   - Structure course learning pathways.
   - Organize collaborative content development.
   - Coordinate course documentation.

4. **Administrator**
   - Manage user roles and permissions.
   - Resolve disputes, enforce policies.
   - Oversee governance and compliance.
   - Moderate flagged content.

5. **Guest User**
   - Browse public resources.
   - Participate in open discussions (limited).

---

## 🛠 Feature Breakdown

### 1. Authentication & Profiles
- Email/password login with secure hashing.
- Google OAuth login.
- User profile with avatar, department, level, bio.
- Role management (student, faculty, creator, admin).
- Badge progression tracker.

### 2. Resource Repository
- Upload resources (PDF, DOC, links, media).
- Metadata: title, description, course, tags.
- Cloud storage integration (e.g., Cloudinary).
- Search and filter by course, tag, type.
- Version history of resources.
- Validation workflow (faculty/admin review).

### 3. Discussion Forums
- Course-specific discussion hubs.
- Threaded conversations with nested replies.
- Markdown/WYSIWYG editor.
- Reactions (👍, 🎓, ❤️).
- Moderation controls (report, approve, delete).

### 4. Peer Matching & Chat
- Form for study requests (topics, availability).
- Matching algorithm (based on similarity).
- One-to-one and group chat.
- Real-time messaging with WebSockets.
- Match history and notifications.

### 5. Collaborative Course Documentation
- Course overview pages (objectives, prerequisites).
- Markdown-based editor with live preview.
- Revision history (track changes, diffs).
- Review system (approve or request changes).
- Multi-user editing with version control.

### 6. Badges & Reputation System
- Abstract Badge class with:
  - Merit Badges (based on contributions).
  - Role Badges (assigned by admins/faculty).
  - Expert Badges (validated by peer/faculty).
- Automatic progression logic.
- Badge display on user profile.
- Leaderboard by department/course.

### 7. Moderation & Governance
- Reporting system (flag resources, posts).
- Moderation queue (approve/reject reports).
- User role/permission management.
- Governance workflows for dispute resolution.

### 8. Notifications & Engagement
- In-app notifications (replies, new matches, badge earned).
- Email + push notifications.
- Offline access via PWA caching.

### 9. Admin Dashboard
- Metrics: active users, uploads, matches.
- Content moderation overview.
- User management (ban, reinstate, assign badges).
- Export analytics.

---

## 🧩 Technical Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes + Prisma ORM
- **Database:** PostgreSQL
- **Auth:** NextAuth.js (Credentials + Google)
- **Storage:** Cloudinary for file uploads
- **Realtime:** WebSockets (chat, live threads)
- **Notifications:** Next-push / OneSignal
- **Deployment:** Vercel (frontend + API), Railway / Supabase (Postgres)
- **Testing:** Jest + Playwright

---

## 📊 Database Models (high-level)

- **User**: id, name, email, role, dept, profile info
- **Credential**: provider, providerId, passwordHash
- **Course**: id, title, description, objectives
- **Resource**: id, title, url, type, uploaderId, courseId
- **Discussion**: id, topic, courseId
- **Thread**: id, title, authorId, discussionId
- **Post**: id, content, authorId, threadId, parentId
- **Badge (abstract)**: id, name, type → MeritBadge, RoleBadge, ExpertBadge
- **UserBadge**: userId, badgeId
- **StudyBuddyRequest**: id, requesterId, topics, availability
- **Match**: userAId, userBId, status
- **ChatRoom**: id, isGroup
- **ChatMessage**: id, content, senderId, roomId
- **Report**: id, reporterId, reason, resourceId?, postId?
- **ModerationAction**: id, reportId, moderatorId, action
- **Notification**: id, userId, type, payload

---

## 📌 Roadmap (Phased Development)

1. **Phase 1 – Authentication & Profiles**
2. **Phase 2 – Resource Repository**
3. **Phase 3 – Discussion Forums**
4. **Phase 4 – Peer Matching & Chat**
5. **Phase 5 – Course Documentation**
6. **Phase 6 – Badges & Governance**
7. **Phase 7 – Notifications & PWA**
8. **Phase 8 – Admin Dashboard & Analytics**
9. **Phase 9 – Pilot Testing & Feedback**

---


# 📑 Feature-to-Screen Mapping for StudyHub

This table maps each **feature** of StudyHub to its **frontend screens** and **backend APIs**.  
Use this as a development guide when generating pages, components, and endpoints.

---

## 1. Authentication & Profiles
| Feature | Screens / Components | API Endpoints |
|---------|----------------------|---------------|
| Email & Google login | `LoginPage`, `SignupPage`, `OAuthButton` | `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/google` |
| Profile creation | `ProfileWizard`, `AvatarUpload` | `POST /api/user/profile` |
| Profile management | `ProfilePage`, `EditProfileForm` | `GET /api/user/:id`, `PUT /api/user/:id` |

---

## 2. Resource Repository
| Feature | Screens / Components | API Endpoints |
|---------|----------------------|---------------|
| Resource catalog | `ResourceList`, `ResourceCard`, `FilterSidebar` | `GET /api/resources` |
| Upload resource | `UploadModal`, `TagSelector` | `POST /api/resources` |
| Resource detail | `ResourceDetailPage`, `PreviewPane`, `CommentSection` | `GET /api/resources/:id` |
| Version history | `VersionHistoryDrawer` | `GET /api/resources/:id/versions` |

---

## 3. Discussion Forums
| Feature | Screens / Components | API Endpoints |
|---------|----------------------|---------------|
| Course forum hub | `CourseForumPage`, `ThreadList` | `GET /api/courses/:id/threads` |
| Thread view | `ThreadPage`, `ReplyList`, `RichTextEditor` | `GET /api/threads/:id`, `POST /api/threads/:id/replies` |
| Reactions | `ReactionBar` | `POST /api/posts/:id/reactions` |

---

## 4. Peer Matching & Chat
| Feature | Screens / Components | API Endpoints |
|---------|----------------------|---------------|
| Study buddy form | `MatchRequestForm` | `POST /api/matches/request` |
| Match results | `MatchResultsPage`, `MatchCard` | `GET /api/matches` |
| Chat | `ChatRoomPage`, `MessageBubble`, `ChatSidebar` | `GET /api/chat/:roomId`, `POST /api/chat/:roomId/messages` |

---

## 5. Collaborative Course Documentation
| Feature | Screens / Components | API Endpoints |
|---------|----------------------|---------------|
| Course overview | `CourseOverviewPage`, `LearningOutcomeList` | `GET /api/courses/:id/docs` |
| Doc editing | `CourseDocEditor`, `MarkdownPreview` | `POST /api/courses/:id/docs` |
| Revision history | `RevisionHistoryPage`, `DiffViewer` | `GET /api/courses/:id/docs/revisions` |
| Review system | `ReviewSidebar` | `POST /api/courses/:id/docs/review` |

---

## 6. Badges & Reputation
| Feature | Screens / Components | API Endpoints |
|---------|----------------------|---------------|
| Badge display | `BadgeList`, `BadgeCard` | `GET /api/user/:id/badges` |
| Leaderboard | `LeaderboardPage`, `LeaderboardTable` | `GET /api/leaderboard` |
| Badge criteria | `BadgeCriteriaModal` | `GET /api/badges` |

---

## 7. Moderation & Governance
| Feature | Screens / Components | API Endpoints |
|---------|----------------------|---------------|
| Reporting | `ReportModal` | `POST /api/reports` |
| Moderation queue | `ModerationDashboard`, `ReportCard` | `GET /api/moderation/reports`, `POST /api/moderation/action` |
| User role management | `UserManagementPage` | `PUT /api/users/:id/role` |

---

## 8. Notifications & Engagement
| Feature | Screens / Components | API Endpoints |
|---------|----------------------|---------------|
| Notification center | `NotificationDropdown`, `NotificationList` | `GET /api/notifications` |
| Push notifications | `SubscriptionPrompt` | `POST /api/notifications/subscribe` |
| Offline/PWA | `ServiceWorker` | (handled client-side) |

---

## 9. Admin Dashboard
| Feature | Screens / Components | API Endpoints |
|---------|----------------------|---------------|
| System metrics | `AdminDashboard`, `MetricsCard`, `Charts` | `GET /api/admin/metrics` |
| Content moderation | `ContentModerationPage` | `GET /api/moderation/content` |
| User management | `UserTable`, `RoleDropdown` | `GET /api/users`, `PUT /api/users/:id` |

---

## ✅ Development Flow
1. Start with **Authentication & Profiles**.
2. Build **Course & Resource Repository**.
3. Add **Discussion Forums**.
4. Implement **Peer Matching & Chat**.
5. Add **Course Docs** with revision tracking.
6. Integrate **Badges & Governance**.
7. Finalize with **Notifications** and **Admin Dashboard**.

---

## ✅ Deliverables for MVP
- Secure login (email + Google).
- User profiles + roles.
- Course structure with resource uploads.
- Discussion forums.
- Peer matching + chat.
- Badge system.
- Basic moderation.
