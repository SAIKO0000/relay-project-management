# ProjTrack Portfolio Demo

> **Engineering Management System - Portfolio Demonstration**

A comprehensive project management dashboard built with modern web technologies, showcasing full-stack development capabilities for engineering and construction project oversight.

## 🎯 **Live Demo**

🌐 **[View Live Demo](https://projtrack-portfolio-demo.vercel.app)**

See [PRIVATE_BETA_AND_BACKUP_PLAN.md](./PRIVATE_BETA_AND_BACKUP_PLAN.md) for the planned invite-only deployment, data-isolation, security, and backup model.

---

## 📋 **About This Project**

This is a **portfolio demonstration** of a sophisticated engineering management system designed for construction and infrastructure projects. The application demonstrates my expertise in:

- **Full-Stack Development** with Next.js 16 and TypeScript
- **Real-time Database Management** with Supabase/PostgreSQL
- **Modern UI/UX Design** with Tailwind CSS and shadcn/ui
- **Advanced Features** including Gantt charts, file management, and notifications

### **⚠️ Demo Data Notice**
This application contains **fictional demo data** for portfolio purposes. All projects, personnel, and company information are completely fabricated for demonstration.

---

## 🚀 **Key Features**

### **📊 Project Management**
- **Dashboard Overview** with project metrics and progress tracking
- **Gantt Chart Visualization** for project timelines and dependencies
- **Task Management** with priority levels and assignment tracking
- **Milestone Tracking** with completion status

### **👥 Team Management**
- **Personnel Directory** with role-based access
- **Profile Management** with avatar uploads
- **Team Assignment** to projects and tasks

### **📁 Document Management**
- **File Upload System** for project documents and reports
- **Photo Gallery** for project progress documentation
- **Secure Storage** with role-based access controls

### **📱 Modern UX**
- **Responsive Design** for desktop and mobile
- **Real-time Updates** with optimistic UI
- **Interactive Notifications** system
- **Calendar Integration** for events and deadlines

---

## 🛠 **Technology Stack**

### **Frontend**
- **Next.js 16** (App Router, React 19)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Framer Motion** for animations
- **Recharts** for data visualization

### **Backend & Database**
- **Supabase** (PostgreSQL + Real-time + Storage)
- **Row Level Security (RLS)** for data protection
- **Database Functions & Triggers** for automation

### **Additional Tools**
- **React Query** for state management
- **React Hook Form** with Zod validation
- **Lucide React** for icons
- **PDF Export** capabilities
- **Firebase** for push notifications

---

## 🏗 **Architecture Highlights**

### **Database Design**
- **9 Interconnected Tables** with proper relationships
- **Foreign Key Constraints** ensuring data integrity
- **Optimized Indexes** for performance
- **Row Level Security** policies for multi-tenant security

### **Performance Optimizations**
- **40-50% Query Performance Improvement** through optimized hooks
- **Cached Query Results** with React Query
- **Optimistic Updates** for smooth UX
- **Lazy Loading** for large datasets

### **Security Features**
- **Authentication** with Supabase Auth
- **Role-Based Access Control** 
- **Secure File Storage** with access policies
- **Environment Variable Protection**

---

## 📸 **Screenshots**

### Dashboard Overview
*![Dashboard](./public/screenshots/dashboard.png)*

### Gantt Chart View
*![Gantt](./public/screenshots/gantt.png)*

### Project Management
*![Projects](./public/screenshots/projects.png)*

---

## 🚦 **Getting Started**

### **Prerequisites**
- Node.js 22
- npm or yarn
- A Supabase account only for private live-backend development

### **Environment Setup**
```bash
# Clone the repository
git clone https://github.com/yourusername/projtrack-portfolio-demo.git
cd projtrack-portfolio-demo

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Browser-local Demo Mode works without cloud credentials
```

### **Private Live-backend Variables (Optional)**
```env
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never expose or configure a Supabase service-role key in a public portfolio deployment.

### **Database Setup**
Only required for private live-backend mode:
1. Create a new Supabase project
2. Run the schema script: `scripts/export-database-schema.sql`
3. Seed with demo data: `scripts/seed-demo-data.sql`
4. Apply any patches: `scripts/fix-photos-view.sql`

### **Development**
```bash
npm run dev
```

---

## 📁 **Project Structure**

```
projtrack-portfolio-demo/
├── app/                    # Next.js App Router pages
├── components/             # Reusable UI components
├── lib/                    # Utilities, hooks, and services
├── scripts/                # Database setup scripts
├── public/                 # Static assets
└── sql/                    # Additional SQL scripts
```

---

## 🎨 **Design System**

- **Color Palette:** Professional blue/gray theme
- **Typography:** Clean, readable font hierarchy
- **Icons:** Lucide React icon set
- **Components:** Consistent shadcn/ui design system
- **Responsive:** Mobile-first approach

---

## 🧪 **Demo Data**

The application includes realistic demo data:
- **6 Sample Projects** across different industries
- **8 Personnel Members** with various roles
- **Multiple Tasks** with dependencies and assignments
- **Events & Milestones** for timeline demonstration

---

## 🚀 **Deployment**

This project is optimized for deployment on:
- **Vercel** (recommended)
- **Netlify**
- **Railway**
- Any Node.js hosting platform

### **Deploy to Vercel**
```bash
npm i -g vercel
vercel --prod
```

---

## 🎯 **For Employers**

This project demonstrates my capabilities in:

### **Technical Skills**
- Modern React/Next.js development
- TypeScript implementation
- Database design and optimization
- Real-time application architecture
- Performance optimization techniques

### **Software Engineering Practices**
- Clean, maintainable code structure
- Comprehensive error handling
- Security best practices
- Responsive design principles
- Documentation and code comments

### **Project Management Understanding**
- Domain knowledge in construction/engineering
- User experience design for complex workflows
- Data visualization and reporting
- Multi-user collaboration features

---

## 📞 **Contact**

**[Your Name]**
- 📧 Email: your.email@example.com
- 💼 LinkedIn: [linkedin.com/in/yourprofile](https://linkedin.com/in/yourprofile)
- 🌐 Portfolio: [yourportfolio.com](https://yourportfolio.com)

---

## 📄 **License**

This project is for **portfolio demonstration purposes only**. 

**Note:** This is a showcase project and not intended for commercial use.

---

<div align="center">

**Built with ❤️ for demonstration purposes**

*Thank you for reviewing my work!*

</div>
