# 🚀 Beginner's Guide: Deploy RHINO Trading Dashboard to DigitalOcean

## Using Your Domain: moneywire.io

This guide assumes you're a complete beginner. We'll deploy your trading dashboard to DigitalOcean step by step.

---

## 📋 **What You Need Before Starting**

1. **DigitalOcean Account** (Sign up at digitalocean.com - you'll need a credit card)
2. **GitHub Account** (to store your code)
3. **Domain Control** (you already own moneywire.io - perfect!)

---

## 🎯 **Option 1: DigitalOcean App Platform (EASIEST - RECOMMENDED)**

### **Step 1: Put Your Code on GitHub**

1. Go to [GitHub.com](https://github.com) and create a new repository called `trading-dashboard`
2. Follow GitHub's instructions to upload your code:

```bash
# In your project directory
git init
git add .
git commit -m "Initial trading dashboard code"
git remote add origin https://github.com/YOUR-USERNAME/trading-dashboard.git
git push -u origin main
```

### **Step 2: Create DigitalOcean Database**

1. Log into DigitalOcean
2. Go to "Databases" → "Create Database"
3. Choose:
   - **Engine**: PostgreSQL
   - **Version**: 14
   - **Size**: Basic ($15/month)
   - **Region**: New York (or closest to you)
   - **Database Name**: `rhino-trading-db`
4. Wait 5-10 minutes for creation
5. **Save the connection details** (you'll need them later)

### **Step 3: Deploy the App**

1. In DigitalOcean, go to "Apps" → "Create App"
2. Choose "GitHub" as source
3. Connect your GitHub account
4. Select your `trading-dashboard` repository
5. **IMPORTANT**: Before creating, click "Edit Plan" and update the `app.yaml` file in your repo:

```yaml
# Update this line in app.yaml:
github:
  repo: YOUR-GITHUB-USERNAME/trading-dashboard  # Replace with your actual username
```

6. Upload/paste this configuration or use the web interface to match these settings:
   - **Frontend**: Static Site from `/frontend` folder
   - **API Functions**: Node.js apps from `/functions` folders
   - **Database**: Link the PostgreSQL database you created

### **Step 4: Configure Your Domain**

1. In your DigitalOcean App settings, go to "Domains"
2. Add `moneywire.io` as a custom domain
3. DigitalOcean will give you DNS records to update
4. Go to your domain registrar (where you bought moneywire.io) and update the DNS:
   - **A Record**: `@` → `IP address from DigitalOcean`
   - **CNAME Record**: `www` → `moneywire.io`
5. Wait 24-48 hours for DNS propagation

### **Step 5: Set Environment Variables**

In your App settings, add these environment variables:
```
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database  # From Step 2
REACT_APP_API_URL=https://moneywire.io/api
REACT_APP_WS_URL=wss://moneywire.io/api
```

### **Cost Estimate**: ~$25-50/month

---

## 🎯 **Option 2: DigitalOcean Droplets (More Control)**

### **Step 1: Create a Droplet**

1. Go to "Droplets" → "Create Droplet"
2. Choose:
   - **Image**: Ubuntu 22.04
   - **Size**: Basic $12/month (2GB RAM)
   - **Region**: New York
   - **Add SSH Key** (or use password)

### **Step 2: Install Prerequisites**

SSH into your droplet:
```bash
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (web server)
apt install -y nginx

# Install PostgreSQL
apt install -y postgresql postgresql-contrib
```

### **Step 3: Set Up Database**

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE rhino_trading_db;
CREATE USER rhino_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE rhino_trading_db TO rhino_user;
\q
```

### **Step 4: Deploy Your Code**

```bash
# Clone your repository
git clone https://github.com/YOUR-USERNAME/trading-dashboard.git
cd trading-dashboard

# Install dependencies
npm install
cd frontend && npm install && npm run build
cd ..

# Set up environment variables
echo "DATABASE_URL=postgresql://rhino_user:secure_password_here@localhost:5432/rhino_trading_db" > .env
echo "NODE_ENV=production" >> .env
```

### **Step 5: Configure Nginx for Your Domain**

Create Nginx configuration:
```bash
nano /etc/nginx/sites-available/moneywire.io
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name moneywire.io www.moneywire.io;

    # Serve frontend
    location / {
        root /root/trading-dashboard/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/moneywire.io /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### **Step 6: Set Up SSL Certificate**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d moneywire.io -d www.moneywire.io
```

### **Step 7: Start Your Services**

```bash
# Start your API server with PM2
cd /root/trading-dashboard
pm2 start functions/api-server/index.js --name "trading-api"
pm2 start functions/webhook-receiver/index.js --name "webhook-receiver"
pm2 startup
pm2 save
```

### **Cost Estimate**: ~$25/month

---

## 🎯 **Option 3: DigitalOcean Functions (Serverless)**

### **Step 1: Install DigitalOcean CLI**

```bash
# Download and install doctl
wget https://github.com/digitalocean/doctl/releases/latest/download/doctl-1.102.0-linux-amd64.tar.gz
tar xf doctl-1.102.0-linux-amd64.tar.gz
sudo mv doctl /usr/local/bin

# Authenticate
doctl auth init
```

### **Step 2: Deploy Functions**

```bash
# Deploy all functions
doctl serverless deploy functions

# Set environment variables
doctl serverless functions config set DATABASE_URL "your-database-connection-string"
```

### **Step 3: Deploy Frontend to App Platform**

Use the web interface to deploy just the frontend as a static site.

### **Cost Estimate**: ~$15-30/month

---

## 📊 **Cost Comparison**

| Option | Monthly Cost | Complexity | Beginner Friendly |
|--------|-------------|------------|-------------------|
| App Platform | $25-50 | ⭐ Low | ✅ Yes |
| Droplets | $25 | ⭐⭐⭐ Medium | ⚠️ Some tech knowledge |
| Functions | $15-30 | ⭐⭐ Low-Medium | ✅ Yes |

---

## 🚨 **Important Next Steps**

### **Update Your Pine Script**

Once deployed, update your Pine Script webhook URL to:
```
https://moneywire.io/webhook
```

### **Test Your Deployment**

1. Visit `https://moneywire.io` - you should see your dashboard
2. Send a test webhook from TradingView
3. Check if data appears in your dashboard

### **Monitor Your Application**

- **DigitalOcean Monitoring**: Enable built-in monitoring
- **Database Backups**: Set up automatic backups
- **Uptime Monitoring**: Use services like UptimeRobot (free)

---

## 🆘 **Need Help?**

**Common Issues:**

1. **Domain not working**: DNS takes 24-48 hours to propagate
2. **Database connection issues**: Check your connection string format
3. **Build failures**: Make sure all dependencies are in package.json
4. **SSL certificate issues**: Wait for domain to propagate first

**Support Resources:**
- DigitalOcean Community Forums
- DigitalOcean Documentation
- GitHub Issues on your repository

---

## 🏁 **You're Done!**

Your trading dashboard should now be live at `https://moneywire.io`! 

The dashboard will:
- ✅ Receive webhooks from your Pine Script
- ✅ Store data in PostgreSQL
- ✅ Display real-time trading signals
- ✅ Work on your custom domain with SSL

**Congratulations on deploying your first web application!** 🎉 