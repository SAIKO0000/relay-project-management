# 📁 Scripts Directory

This directory contains migration and setup scripts for creating a portfolio version of Relay.

## 📋 Files Overview

### 🗄️ `export-database-schema.sql`
**Complete database schema export including:**
- ✅ All table structures with proper data types
- ✅ Foreign key relationships
- ✅ Row Level Security (RLS) policies  
- ✅ Storage bucket configurations
- ✅ Indexes for performance optimization
- ✅ Functions and triggers
- ✅ Extension requirements

**Usage:**
```sql
-- Apply via Supabase Dashboard SQL Editor
-- Copy contents and run in new project
```

### 🌱 `seed-demo-data.sql`
**Realistic demo data for portfolio showcase:**
- 👥 8 Personnel records (engineers, managers, inspectors)
- 🏗️ 6 Projects (various types and statuses)
- ✅ 9 Tasks (spanning different phases)
- 📅 5 Events (meetings, inspections, deliveries)
- 🎯 8 Milestones (project checkpoints)
- 📄 5 Reports (progress, safety, technical documents)

**Features:**
- 🎭 Fictional but realistic data
- 📈 Shows project progression from planning to completion
- 🔄 Demonstrates all app functionality
- 🏢 Covers multiple project types and industries

### 📖 `migration-guide.md`
**Comprehensive step-by-step migration guide:**
- 🎯 Clear goals and objectives
- 📋 Detailed migration steps
- ✅ Testing checklist
- 🔧 Troubleshooting section
- 📈 Performance optimization tips

### 🚀 `setup-new-project.sh`
**Automated setup script that:**
- ✅ Validates required tools (Node.js, npm, Supabase CLI)
- 🔑 Handles Supabase authentication
- 📝 Creates new environment configuration
- 🛠️ Guides through schema and data setup
- 📦 Installs dependencies
- 🧪 Prepares for local testing

## 🎯 Quick Start

### Option 1: Automated Setup (Recommended)
```bash
# Make script executable (if needed)
chmod +x scripts/setup-new-project.sh

# Run the automated setup
./scripts/setup-new-project.sh
```

### Option 2: Manual Setup
1. **Create new Supabase project**
2. **Apply schema:** Copy `export-database-schema.sql` to SQL Editor
3. **Seed data:** Copy `seed-demo-data.sql` to SQL Editor  
4. **Update environment:** Create new `.env.local` with new credentials
5. **Test locally:** `npm run dev`

## 🔍 What Gets Migrated

### ✅ Database Structure
- All tables with exact schema
- Foreign key relationships
- Check constraints and validations
- Indexes for optimal performance

### ✅ Security Setup
- Row Level Security policies
- Storage bucket policies
- Authentication configuration
- User permissions

### ✅ Demo Content
- Sample projects showcasing different industries
- Realistic task progression and workflows
- File references for document management
- Event scheduling and milestone tracking

### ❌ What Doesn't Get Migrated
- Real company data (replaced with demo data)
- Production API keys and secrets
- User accounts and authentication tokens
- Actual uploaded files (template references only)

## 🎨 Demo Data Highlights

### 🏢 Sample Projects
1. **Downtown Office Complex** - Large commercial development (65% complete)
2. **Riverside Elementary School** - Educational facility (40% complete)
3. **Green Valley Residential** - Sustainable housing project (100% complete)
4. **Tech Manufacturing Facility** - Industrial facility (15% complete)
5. **City Bridge Renovation** - Infrastructure project (75% complete)
6. **Lakeside Community Center** - Community facility (5% complete)

### 👥 Sample Personnel
- Project Managers and Site Engineers
- Civil and Electrical Engineers
- Safety Inspectors and Architects
- Environmental and Quality Control specialists

### 📊 Demonstrates Features
- 📈 Project progress tracking
- 📋 Task management and Gantt charts
- 📄 Document upload and review workflows
- 📅 Event scheduling and calendar integration
- 🔔 Notification systems
- 👥 Team collaboration tools

## 🛠️ Customization

### Adding More Demo Data
Edit `seed-demo-data.sql` to add:
```sql
-- More projects
INSERT INTO public.projects (name, description, ...) VALUES (...);

-- Additional tasks  
INSERT INTO public.tasks (title, description, ...) VALUES (...);

-- Extra personnel
INSERT INTO public.personnel (name, email, ...) VALUES (...);
```

### Modifying Schema
Edit `export-database-schema.sql` to:
- Add new tables or columns
- Modify constraints or indexes  
- Update RLS policies
- Add custom functions

### Environment Configuration
Update `.env.local` with:
```bash
# Production URLs
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Additional services
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

## 🔍 Verification Steps

After migration, verify:

### ✅ Database
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Verify data
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM personnel;
SELECT COUNT(*) FROM tasks;
```

### ✅ Application
- [ ] Login/signup functionality
- [ ] Project list loads with demo data
- [ ] Task management works
- [ ] File upload interface functions
- [ ] Real-time updates operate
- [ ] Responsive design on mobile

### ✅ Performance
- [ ] Page load times < 3 seconds
- [ ] Query optimization working
- [ ] No console errors
- [ ] Database queries efficient

## 📞 Support

If you encounter issues:

1. **Check Logs:** Supabase Dashboard > Logs
2. **Verify Environment:** Ensure all variables are correct
3. **Test Connection:** Try connecting to database directly
4. **Review Guide:** Reference `migration-guide.md`
5. **Start Fresh:** Delete project and recreate if needed

## 🎉 Success Metrics

Your migration is successful when:

- ✅ **Demo site is live** and accessible
- ✅ **All features work** with demo data
- ✅ **GitHub repo is public** and showcases your skills
- ✅ **Performance is optimal** (fast loading, smooth interactions)
- ✅ **Code is clean** and well-documented
- ✅ **Portfolio-ready** for showing to employers

## 📈 Next Steps

After successful migration:

1. **Deploy to Vercel** for live demo
2. **Update README.md** with new demo links
3. **Create demo video** showcasing features
4. **Write blog post** about the development process
5. **Add to portfolio** as a featured project

Your Relay portfolio is ready to demonstrate! 🚀
