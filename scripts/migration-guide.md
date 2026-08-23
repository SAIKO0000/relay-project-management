# 🚀 Relay Database Migration Guide

## 📋 Overview
This guide will help you migrate your Relay database from your private company Supabase instance to a new public portfolio instance.

## 🎯 Goals
- ✅ Create a portfolio-ready version of Relay
- ✅ Preserve all database schema and functionality  
- ✅ Use demo data instead of company data
- ✅ Enable public GitHub repository
- ✅ Deploy to new Vercel instance

## 📂 Files Included
- `export-database-schema.sql` - Complete database schema
- `seed-demo-data.sql` - Realistic demo data for portfolio
- `migration-guide.md` - This guide
- `setup-new-project.sh` - Automation script

## 🛠️ Migration Steps

### Step 1: Create New Supabase Project
```bash
# Install Supabase CLI (choose one method):

# Method 1: Windows via Scoop (Recommended for Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Method 2: Via npm as dev dependency (Project-specific)
npm i supabase --save-dev

# Method 3: Via Homebrew (macOS/Linux)
brew install supabase/tap/supabase

# Method 4: Via Go (if you have Go installed)
go install github.com/supabase/cli@latest

# Login to Supabase
supabase login

# Create new project (via dashboard or CLI)
# Go to: https://supabase.com/dashboard/new-project
# Project Name: "projtrack-portfolio"
# Database Password: (save this securely)
# Region: Choose closest to your target audience
```

### Step 2: Get New Project Credentials
```bash
# After creating project, get these values from Dashboard > Settings > API:
# - Project URL: https://your-project-ref.supabase.co
# - anon key: eyJ... 
# - service_role key: eyJ...
```

### Step 3: Apply Database Schema
```bash
# Method 1: Via Supabase Dashboard SQL Editor
# 1. Go to Dashboard > SQL Editor
# 2. Copy contents of export-database-schema.sql
# 3. Run the query

# Method 2: Via CLI (if you have connection string)
psql "postgresql://postgres:password@db.your-project-ref.supabase.co:5432/postgres" < scripts/export-database-schema.sql
```

### Step 4: Seed Demo Data
```bash
# Apply demo data via SQL Editor or CLI
# Via Dashboard:
# 1. Go to Dashboard > SQL Editor
# 2. Copy contents of seed-demo-data.sql  
# 3. Run the query

# Via CLI:
psql "postgresql://postgres:password@db.your-project-ref.supabase.co:5432/postgres" < scripts/seed-demo-data.sql
```

### Step 5: Update Environment Variables
```bash
# Create new .env.local file
cp .env.local .env.local.backup

# Update with new Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-new-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key

# Keep other settings the same
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 6: Test Locally
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Test key functionality:
# ✅ Login/Signup works
# ✅ Projects load with demo data
# ✅ Tasks and reports display
# ✅ File uploads work
# ✅ Real-time features function
```

### Step 7: Deploy to New Vercel Project
```bash
# Create new Vercel project
npx vercel

# Follow prompts:
# - Link to new GitHub repository
# - Set project name: "projtrack-portfolio"
# - Configure environment variables in Vercel dashboard

# Or via Vercel Dashboard:
# 1. Import from GitHub
# 2. Select your repository
# 3. Add environment variables
# 4. Deploy
```

### Step 8: Update Production URLs
```bash
# Update NEXT_PUBLIC_APP_URL for production
# In Vercel Dashboard > Settings > Environment Variables:
NEXT_PUBLIC_APP_URL=https://your-new-vercel-app.vercel.app

# Update Supabase Auth settings:
# Dashboard > Authentication > URL Configuration
# - Site URL: https://your-new-vercel-app.vercel.app
# - Redirect URLs: https://your-new-vercel-app.vercel.app/auth/callback
```

## 🔐 Storage Bucket Setup

### Create Storage Buckets
The schema automatically creates these buckets:
- `project-documents` (private)
- `project-photos` (public)  
- `avatars` (public)

### Upload Sample Files (Optional)
```bash
# You can upload sample files to demonstrate functionality
# Via Supabase Dashboard > Storage
# Or via CLI:
supabase storage cp ./sample-files/sample-report.pdf supabase://project-documents/sample/
```

## 📊 Demo Data Overview

### Projects (6 total)
- **Downtown Office Complex** - In Progress (65% complete)
- **Riverside Elementary School** - In Progress (40% complete)  
- **Green Valley Residential** - Completed (100% complete)
- **Tech Manufacturing Facility** - Planning (15% complete)
- **City Bridge Renovation** - In Progress (75% complete)
- **Lakeside Community Center** - Planning (5% complete)

### Personnel (8 total)
- Project Managers, Engineers, Architects, Inspectors
- Realistic names and contact information
- Various positions and specializations

### Tasks (9 total)
- Spanning all project phases
- Different priorities and statuses
- Realistic time estimates and progress

### Events & Milestones
- Meetings, inspections, deliveries
- Historical and upcoming events
- Project milestones with target/actual dates

## 🧪 Testing Checklist

### ✅ Authentication
- [ ] Sign up new account
- [ ] Email confirmation works
- [ ] Login/logout functions
- [ ] Password reset works

### ✅ Projects
- [ ] Project list loads
- [ ] Project details display
- [ ] Create new project
- [ ] Edit project information
- [ ] Project analytics work

### ✅ Tasks  
- [ ] Task list loads
- [ ] Gantt chart displays
- [ ] Create/edit tasks
- [ ] Task assignments work
- [ ] Progress tracking updates

### ✅ Reports
- [ ] Report list displays
- [ ] File upload works
- [ ] Document viewer functions
- [ ] Review workflow operates

### ✅ Real-time Features
- [ ] Notifications appear
- [ ] Live updates work
- [ ] Multi-user collaboration

### ✅ Performance
- [ ] Page load times reasonable
- [ ] Query optimization working
- [ ] No console errors

## 🔧 Troubleshooting

### Common Issues

**1. RLS Policies Not Working**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Re-enable if needed
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
```

**2. Storage Bucket Access Issues**
```sql
-- Check bucket policies
SELECT * FROM storage.policies;

-- Recreate storage policies if needed
-- (Run storage policy sections from schema file)
```

**3. Environment Variables Not Loading**
```bash
# Verify .env.local file exists
ls -la .env.local

# Check environment variables in app
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

**4. Database Connection Issues**
```bash
# Test connection
psql "postgresql://postgres:password@db.your-ref.supabase.co:5432/postgres" -c "SELECT version();"
```

## 📈 Performance Optimization

### Database Indexes
The schema includes optimized indexes for:
- Project queries by status, date, user
- Task queries by project, assignee, status  
- Report queries by project, status
- Notification queries by user, read status

### Query Optimization
- Uses TanStack Query for caching
- Implements proper select statements
- Includes foreign key relationships
- Optimized for real-time subscriptions

## 🚀 Next Steps

1. **Update README.md** - Update repository links and demo URL
2. **Create Demo Video** - Record walkthrough of functionality
3. **Documentation** - Add detailed API documentation
4. **Blog Post** - Write about the development process
5. **Portfolio Integration** - Add to personal portfolio site

## 📞 Support

If you encounter issues during migration:
1. Check Supabase logs in Dashboard > Logs
2. Verify environment variables are correct
3. Test database connection
4. Check browser console for errors
5. Review this guide step-by-step

## 🎉 Success!

Once complete, you'll have:
- ✅ Public GitHub repository showcasing your skills
- ✅ Live demo site for employers/clients
- ✅ Complete database schema preserved
- ✅ Professional portfolio piece
- ✅ No company data exposure

Your Relay portfolio is ready to demonstrate! 🚀
