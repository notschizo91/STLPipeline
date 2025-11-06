#!/bin/bash

# STL Pipeline Deployment Script for Vultr Server
# This script will deploy in /opt/stl-pipeline without touching anything else

set -e  # Exit on any error

echo "========================================"
echo "STL Pipeline Deployment Script"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

# Variables
INSTALL_DIR="/opt/stl-pipeline"
APP_PORT="3000"
APP_PASSWORD="stl-secure-$(date +%s)"  # Generate random password
REPO_URL="https://github.com/notschizo91/STLPipeline.git"
BRANCH="claude/how-does-t-011CUqqEt788g81ZYXbhNoWc"

echo "📁 Installation directory: $INSTALL_DIR"
echo "🔌 Port: $APP_PORT"
echo ""

# Check if directory already exists
if [ -d "$INSTALL_DIR" ]; then
  echo "⚠️  Directory $INSTALL_DIR already exists!"
  read -p "Do you want to remove it and reinstall? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$INSTALL_DIR"
  else
    echo "Aborted."
    exit 1
  fi
fi

# Install Node.js if not present
echo "🔍 Checking for Node.js..."
if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js 18..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
else
  echo "✅ Node.js already installed: $(node --version)"
fi

# Install git if not present
if ! command -v git &> /dev/null; then
  echo "📦 Installing git..."
  apt-get update
  apt-get install -y git
fi

# Clone repository
echo ""
echo "📥 Cloning repository to $INSTALL_DIR..."
git clone "$REPO_URL" "$INSTALL_DIR"
cd "$INSTALL_DIR"
git checkout "$BRANCH"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install --production

# Create .env file
echo ""
echo "⚙️  Creating environment configuration..."
cat > .env << EOF
PORT=$APP_PORT
NODE_ENV=production
APP_PASSWORD=$APP_PASSWORD
SESSION_SECRET=$(openssl rand -base64 32)
EOF

# Create necessary directories
mkdir -p uploads output

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2 process manager..."
  npm install -g pm2
fi

# Stop existing process if running
pm2 delete stl-pipeline 2>/dev/null || true

# Start application with PM2
echo ""
echo "🚀 Starting application..."
pm2 start server/app.js --name stl-pipeline
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root
echo ""

# Configure firewall if ufw is installed
if command -v ufw &> /dev/null; then
  echo "🔥 Configuring firewall..."
  ufw allow $APP_PORT/tcp
  echo "✅ Firewall rule added for port $APP_PORT"
fi

# Get server IP
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

echo ""
echo "========================================"
echo "✅ Deployment Complete!"
echo "========================================"
echo ""
echo "📍 Installation: $INSTALL_DIR"
echo "🌐 Access URL: http://$SERVER_IP:$APP_PORT"
echo "🔒 Password: $APP_PASSWORD"
echo ""
echo "📝 Important: Save your password!"
echo "   Password is also stored in: $INSTALL_DIR/.env"
echo ""
echo "🔧 Management Commands:"
echo "   pm2 status              - Check status"
echo "   pm2 logs stl-pipeline   - View logs"
echo "   pm2 restart stl-pipeline - Restart app"
echo "   pm2 stop stl-pipeline    - Stop app"
echo ""
echo "📂 All files are in: $INSTALL_DIR"
echo "   This won't interfere with other apps!"
echo ""
