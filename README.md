# Streams of Joy Owerri Media Hub

A multiple-page static web application built for the Streams of Joy Owerri media team to seamlessly manage service archives, stream resources, and export weekly bulletins.

## 🚀 Live Demo
The project is optimized for instant deployment via Vercel.
* **URL:** [Insert your Vercel deployment link here]

## ✨ Key Features
* **Service Archive:** A fully searchable, filterable grid layout displaying past church services and sermon media.
* **Bulletin Export:** Built-in tool to instantly generate and print a cleanly formatted A5 PDF church bulletin including the complete order of service.
* **Database Flexibility:** Supports both local browser `localStorage` and remote database syncing.

## 📂 Project Layout
```text
church-media-hub/
├── assets/              # Images, ministry graphics, and media assets
├── css/                 # Stylesheets
│   ├── main.css         # Global variables, typography, and core layouts
│   └── landing.css      # Isolated styles designed specifically for the landing page
├── js/                  # Application runtime scripts
│   ├── app.js           # Core UI logic and PDF bulletin generation
│   └── data.js          # Media records, settings, and database toggle
├── index.html           # Website home dashboard
├── about.html           # Ministry vision and information page
├── archive.html         # Complete sermon and video database index
├── contact.html         # Church location and contact info
├── give.html            # Tithing and donation portal
├── login.html           # Media administrator portal login
└── vercel.json          # Modern Vercel deployment configuration
```

## 🛠️ Database Setup (Supabase Integration)
By default, the application runs entirely inside local browser storage. To hook up your live backend:
1. Open `js/data.js` and toggle `USE_SUPABASE = true`.
2. Input your custom Supabase Project URL and Anonymous Key variables.
3. Execute the following queries inside your **Supabase SQL Editor** to construct the required tables:

```sql
CREATE TABLE service_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    person TEXT,
    duration_minutes INTEGER NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sermons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    speaker TEXT NOT NULL,
    date DATE NOT NULL,
    series TEXT,
    duration_minutes INTEGER,
    tags TEXT[],
    scripture TEXT,
    media_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## ⚙️ Deployment Notes
* **File System Routing:** The provided `vercel.json` removes ugly `.html` extensions from your web browser path for a polished presentation layer.
* **Linux Compatibility:** All asset extensions, references, and folder links are explicitly lowercase to strictly enforce compatibility with modern cloud hosting platforms.
