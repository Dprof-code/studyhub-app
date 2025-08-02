# 📚 StudyHub

**StudyHub** is a collaborative learning platform designed for students and lecturers to share academic resources, engage in discussions, find study partners, contribute to course documentation, and earn merit-based badges — all within a modern, scalable web app architecture.

## 🚀 Features

- 🔐 **Authentication** – Sign up with Google or email/password using secure credentials
- 📁 **Resource Repository** – Upload, organize, and search study materials by course, department, and tags
- 💬 **Discussion Forums** – Threaded, real-time conversations tied to specific courses
- 👥 **Peer Matching** – Find study partners based on topics, availability, and interests
- 📘 **Course Documentation** – Collaboratively edit syllabi, learning outcomes, and notes with review history
- 🏆 **Gamified Badges** – Earn contributor and expert badges through meaningful activity
- 🔔 **Notifications** – In-app and push notifications for replies, matches, and more

## 🛠 Tech Stack

- **Frontend:** [Next.js](https://nextjs.org/), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend:** [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction), [Prisma ORM](https://www.prisma.io/), [PostgreSQL](https://www.postgresql.org/)
- **Auth:** [NextAuth.js](https://next-auth.js.org/) with Google OAuth and Credentials provider
- **Storage:** Cloudinary for file uploads
- **Realtime:** WebSockets (for chat and live threads)
- **Deployment:** Vercel / Railway / Supabase (optional)

## 📂 Project Structure

```
src/
├── app/                   # Next.js 13 app directory
│   ├── (auth)/           # Authentication routes
│   ├── api/              # API routes
│   ├── courses/          # Course-related pages
│   ├── discussions/      # Discussion forum pages
│   ├── resources/        # Resource repository pages
│   └── layout.tsx        # Root layout
│
├── components/           # Reusable components
│   ├── auth/            # Authentication components
│   ├── courses/         # Course-related components
│   ├── discussions/     # Discussion components
│   ├── layout/          # Layout components
│   ├── resources/       # Resource components
│   └── ui/              # UI components (buttons, inputs, etc.)
│
├── lib/                 # Utility libraries
│   ├── auth.ts         # Authentication configuration
│   ├── dbconfig.ts     # Database configuration
│   ├── cloudinary.ts   # File upload configuration
│   └── utils.ts        # Helper functions
│
├── hooks/              # Custom React hooks
│   ├── useDebounce.ts
│   └── useWebSocket.ts
│
├── types/             # TypeScript type definitions
│   └── index.d.ts
│
└── styles/           # Global styles
    └── globals.css

prisma/
├── schema.prisma    # Database schema
└── migrations/      # Database migrations

public/             # Static files
├── icons/          # SVG icons
└── images/         # Static images
```

### Key Directories

- `app/`: Contains all pages and API routes using Next.js 13 App Router
- `components/`: Reusable React components organized by feature
- `lib/`: Core functionality and configurations
- `hooks/`: Custom React hooks for shared logic
- `types/`: TypeScript type definitions
- `prisma/`: Database schema and migrations


## 🧪 Local Development

1. **Clone the repo:**

```bash
git clone https://github.com/dprof-code/studyhub.git
cd studyhub
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure `.env`:**
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

4. **Run Prisma migrations:**
```bash
npx prisma migrate dev --name init
```

5. **Start the dev server:**
```bash
npm run dev
```


## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a PR if you'd like to help improve StudyHub.


## 📄 License
This project is licensed under the [MIT License](https://opensource.org/license/mit).



Made with ❤️ by Abraham Adedamola Olawale