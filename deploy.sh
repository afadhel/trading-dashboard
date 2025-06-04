#!/bin/bash

# RHINO Trading Dashboard Deployment Script
# For beginners deploying to DigitalOcean

echo "🦏 RHINO Trading Dashboard Deployment Script"
echo "============================================="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "📁 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: RHINO Trading Dashboard"
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

# Build the frontend
echo "🔨 Building frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "🏗️ Building production frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend built successfully!"
else
    echo "❌ Frontend build failed. Please check for errors."
    exit 1
fi

cd ..

# Check if functions exist
if [ -d "functions" ]; then
    echo "✅ Functions directory exists"
else
    echo "⚠️ Functions directory not found. You may need to create your serverless functions."
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "📝 Creating .gitignore..."
    cat > .gitignore << EOL
# Dependencies
node_modules/
*/node_modules/

# Build outputs
build/
dist/

# Environment variables
.env
.env.local
.env.production.local

# Logs
*.log
npm-debug.log*

# Runtime data
pids
*.pid
*.seed

# Coverage directory used by tools like istanbul
coverage/

# OS generated files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
EOL
    echo "✅ .gitignore created"
fi

echo ""
echo "🎉 Preparation complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Create a GitHub repository at https://github.com/new"
echo "2. Add the remote: git remote add origin https://github.com/YOUR-USERNAME/trading-dashboard.git"
echo "3. Push your code: git push -u origin main"
echo "4. Follow the BEGINNER_DEPLOYMENT_GUIDE.md for DigitalOcean deployment"
echo ""
echo "💡 Tip: Start with Option 1 (App Platform) - it's the easiest!"
echo ""
echo "🌐 Your dashboard will be available at: https://moneywire.io"
echo "" 