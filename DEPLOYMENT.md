# 🚀 Deployment Guide - Private STL Pipeline

This guide covers multiple ways to deploy your **private** STL Pipeline web app.

## 🔒 Security Notice

This app includes password authentication to keep it private. Make sure to:
1. Change the default password before deployment
2. Use HTTPS in production
3. Keep your password secure

---

## Option 1: Run Locally (Easiest Start)

Perfect for testing and personal use on your local machine.

### Steps:

1. **Set up environment**:
```bash
cp .env.example .env
nano .env  # Edit to set your password
```

2. **Start the server**:
```bash
npm run server
```

3. **Access the app**:
- Open browser to `http://localhost:3000`
- Enter your password
- Start converting!

**Access from other devices on your network**:
- Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Access from other devices: `http://YOUR_IP:3000`

---

## Option 2: Docker (Recommended)

Best for consistent deployment across any system.

### Prerequisites:
- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- Docker Compose (included with Docker Desktop)

### Steps:

1. **Set password** (create `.env` file):
```bash
echo "APP_PASSWORD=your-secure-password" > .env
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
```

2. **Build and run**:
```bash
docker-compose up -d
```

3. **Access**:
- Local: `http://localhost:3000`
- Network: `http://YOUR_IP:3000`

### Docker Commands:
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose up -d --build
```

---

## Option 3: Deploy to Cloud (Public Internet)

Deploy to a cloud provider for access from anywhere.

### A. Railway.app (Free Tier Available)

1. **Create account**: [railway.app](https://railway.app)

2. **Deploy from GitHub**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your STLPipeline repository
   - Railway auto-detects Node.js

3. **Set environment variables**:
   - Go to Variables tab
   - Add:
     - `APP_PASSWORD`: your-secure-password
     - `SESSION_SECRET`: random-secret-key
     - `PORT`: 3000

4. **Get your URL**:
   - Railway provides: `https://your-app.railway.app`

### B. Render.com (Free Tier)

1. **Create account**: [render.com](https://render.com)

2. **New Web Service**:
   - Connect GitHub repository
   - Name: `stl-pipeline`
   - Build Command: `npm install`
   - Start Command: `node server/app.js`

3. **Environment Variables**:
   ```
   APP_PASSWORD=your-secure-password
   SESSION_SECRET=random-secret-key
   NODE_ENV=production
   ```

4. **Deploy**: Click "Create Web Service"

### C. DigitalOcean Droplet (More Control)

1. **Create droplet**:
   - Ubuntu 22.04
   - Minimum: $6/month (1GB RAM)

2. **SSH into server**:
```bash
ssh root@YOUR_DROPLET_IP
```

3. **Install Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
```

4. **Clone and setup**:
```bash
git clone YOUR_REPO_URL
cd STLPipeline
npm install
```

5. **Set environment**:
```bash
nano .env
# Add your password and secret
```

6. **Install PM2 (process manager)**:
```bash
npm install -g pm2
pm2 start server/app.js --name stl-pipeline
pm2 save
pm2 startup
```

7. **Setup Nginx (optional, for HTTPS)**:
```bash
apt install nginx certbot python3-certbot-nginx
```

Configure Nginx:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

8. **Get SSL certificate**:
```bash
certbot --nginx -d yourdomain.com
```

---

## Option 4: Home Server / NAS

Run on devices like Raspberry Pi, Synology NAS, etc.

### Raspberry Pi:

1. **Install Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Clone and setup** (same as above)

3. **Auto-start with systemd**:

Create `/etc/systemd/system/stl-pipeline.service`:
```ini
[Unit]
Description=STL Pipeline
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/STLPipeline
ExecStart=/usr/bin/node server/app.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable stl-pipeline
sudo systemctl start stl-pipeline
```

### Synology NAS (Docker):

1. Open Docker package
2. Go to Image → Add from file → Upload Dockerfile
3. Launch container with environment variables
4. Map port 3000

---

## 🔐 Security Best Practices

### 1. Strong Password
```bash
# Generate strong password
openssl rand -base64 20
```

### 2. HTTPS in Production
- Use Let's Encrypt (free SSL)
- Cloudflare (free tier includes SSL)
- Railway/Render provide HTTPS automatically

### 3. Firewall Rules
```bash
# Allow only specific IPs (if self-hosted)
ufw allow from YOUR_IP to any port 3000
```

### 4. Additional Auth Options

Add IP whitelist in `server/app.js`:
```javascript
const allowedIPs = ['YOUR_IP_HERE'];

app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).send('Access denied');
  }
  next();
});
```

---

## 📊 Monitoring

### Check if server is running:
```bash
curl http://localhost:3000/api/health
```

### View logs:
```bash
# PM2
pm2 logs stl-pipeline

# Docker
docker-compose logs -f

# systemd
journalctl -u stl-pipeline -f
```

---

## 🛠️ Troubleshooting

### Can't access from other devices:
- Check firewall: `sudo ufw status`
- Ensure server binds to `0.0.0.0`, not `127.0.0.1`

### Out of memory errors:
- Increase Node.js memory:
  ```bash
  NODE_OPTIONS="--max-old-space-size=2048" node server/app.js
  ```

### Sharp installation fails:
- Install build tools:
  ```bash
  # Ubuntu/Debian
  apt-get install build-essential

  # Alpine (Docker)
  apk add python3 make g++
  ```

---

## 🎯 Recommended Setup

**For personal use**: Option 1 (Local) or Option 2 (Docker on local machine)

**For team access**: Option 3B (Render) - free and easy

**For full control**: Option 3C (DigitalOcean) with Nginx + SSL

**For home lab**: Option 4 (Raspberry Pi with systemd)

---

## 📝 Quick Reference

| Method | Cost | Difficulty | Access |
|--------|------|-----------|---------|
| Local | Free | Easy | Local network only |
| Docker | Free | Easy | Configurable |
| Railway | Free tier | Very easy | Internet |
| Render | Free tier | Very easy | Internet |
| DigitalOcean | $6/mo | Medium | Internet |
| Home Server | Free | Medium | Local/VPN |

---

## Need Help?

Check the main README.md or open an issue on GitHub!
