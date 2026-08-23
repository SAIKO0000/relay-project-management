#!/bin/bash

# ===========================================
# RELAY PORTFOLIO SETUP SCRIPT
# ===========================================
# Automates the migration process for portfolio setup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ===========================================
# INITIAL SETUP AND VALIDATION
# ===========================================

print_status "Starting Relay Portfolio Migration Setup..."

# Check required tools
print_status "Checking required tools..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "Node.js and npm are installed"

# Check if Supabase CLI is installed
if ! command_exists supabase; then
    print_warning "Supabase CLI not found. Installing via npm as dev dependency..."
    npm install supabase --save-dev
    print_success "Supabase CLI installed as dev dependency"
    print_warning "Note: Use 'npx supabase' for commands in this project"
else
    print_success "Supabase CLI is available"
fi

# ===========================================
# ENVIRONMENT SETUP
# ===========================================

print_status "Setting up environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

if [ ! -f "next.config.js" ]; then
    print_error "next.config.js not found. This doesn't appear to be a Next.js project."
    exit 1
fi

print_success "Project structure validated"

# Backup existing .env.local if it exists
if [ -f ".env.local" ]; then
    print_warning "Backing up existing .env.local file..."
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    print_success "Backup created"
fi

# ===========================================
# SUPABASE PROJECT SETUP
# ===========================================

print_status "Setting up new Supabase project..."

# Check if user is logged in to Supabase
print_status "Checking Supabase authentication..."
if ! npx supabase projects list >/dev/null 2>&1; then
    print_warning "Not logged in to Supabase. Please login..."
    npx supabase login
fi

print_success "Supabase authentication verified"

# ===========================================
# COLLECT PROJECT INFORMATION
# ===========================================

print_status "Collecting project information..."

echo ""
echo -e "${YELLOW}Please provide the following information for your new Supabase project:${NC}"
echo ""

# Get project information
read -p "Enter your new Supabase project URL (e.g., https://abcdefg.supabase.co): " SUPABASE_URL
read -p "Enter your new Supabase anon key: " SUPABASE_ANON_KEY
read -p "Enter your new Supabase service role key: " SUPABASE_SERVICE_ROLE_KEY

# Validate URLs
if [[ ! $SUPABASE_URL =~ ^https://.*\.supabase\.co$ ]]; then
    print_error "Invalid Supabase URL format. Please check and try again."
    exit 1
fi

print_success "Project information collected"

# ===========================================
# CREATE NEW ENVIRONMENT FILE
# ===========================================

print_status "Creating new environment configuration..."

cat > .env.local << EOF
# ===========================================
# RELAY PORTFOLIO ENVIRONMENT VARIABLES
# ===========================================
# Generated on $(date)

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase Configuration (if using)
# NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
# NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Development Settings
NODE_ENV=development
EOF

print_success "Environment file created"

# ===========================================
# DATABASE SCHEMA SETUP
# ===========================================

print_status "Setting up database schema..."

# Extract project reference from URL
PROJECT_REF=$(echo $SUPABASE_URL | sed 's/https:\/\/\([^.]*\)\.supabase\.co/\1/')

print_status "Applying database schema to project: $PROJECT_REF"

# Check if schema file exists
if [ ! -f "scripts/export-database-schema.sql" ]; then
    print_error "Schema file not found at scripts/export-database-schema.sql"
    exit 1
fi

# Apply schema using Supabase CLI
print_status "Applying database schema..."
echo "Please apply the schema manually via Supabase Dashboard:"
echo "1. Go to: $SUPABASE_URL/project/default/sql"
echo "2. Copy the contents of scripts/export-database-schema.sql"
echo "3. Paste and run the query"
echo ""
read -p "Press Enter after you've applied the schema..."

print_success "Database schema setup completed"

# ===========================================
# DEMO DATA SEEDING
# ===========================================

print_status "Setting up demo data..."

# Check if demo data file exists
if [ ! -f "scripts/seed-demo-data.sql" ]; then
    print_error "Demo data file not found at scripts/seed-demo-data.sql"
    exit 1
fi

print_status "Seeding demo data..."
echo "Please apply the demo data manually via Supabase Dashboard:"
echo "1. Go to: $SUPABASE_URL/project/default/sql"  
echo "2. Copy the contents of scripts/seed-demo-data.sql"
echo "3. Paste and run the query"
echo ""
read -p "Press Enter after you've applied the demo data..."

print_success "Demo data setup completed"

# ===========================================
# DEPENDENCY INSTALLATION
# ===========================================

print_status "Installing project dependencies..."

npm install

print_success "Dependencies installed"

# ===========================================
# LOCAL TESTING
# ===========================================

print_status "Setting up local development environment..."

echo ""
echo -e "${YELLOW}Ready to test locally!${NC}"
echo ""
echo "Run the following commands to start development:"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""

read -p "Would you like to start the development server now? (y/n): " START_DEV

if [[ $START_DEV =~ ^[Yy]$ ]]; then
    print_status "Starting development server..."
    npm run dev
else
    print_success "Setup completed successfully!"
fi

# ===========================================
# FINAL INSTRUCTIONS
# ===========================================

echo ""
echo -e "${GREEN}===========================================\nSETUP COMPLETED SUCCESSFULLY!\n===========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. ✅ Database schema applied"
echo "2. ✅ Demo data seeded"  
echo "3. ✅ Environment configured"
echo "4. ✅ Dependencies installed"
echo ""
echo -e "${YELLOW}To deploy to production:${NC}"
echo "1. Create new Vercel project"
echo "2. Connect to your GitHub repository"
echo "3. Add environment variables to Vercel"
echo "4. Update NEXT_PUBLIC_APP_URL for production"
echo "5. Update Supabase Auth settings"
echo ""
echo -e "${YELLOW}Important files created/updated:${NC}"
echo "- .env.local (your new environment configuration)"
echo "- .env.local.backup.* (backup of old environment)"
echo ""
echo -e "${YELLOW}For troubleshooting, see:${NC}"
echo "- scripts/migration-guide.md"
echo ""
echo -e "${GREEN}Your Relay portfolio is ready! 🚀${NC}"

exit 0
