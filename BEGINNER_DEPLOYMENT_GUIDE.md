# 🚀 Beginner's Guide: Deploy RHINO Trading Dashboard to DigitalOcean

## Using Your Domain: moneywire.io

This guide assumes you're a complete beginner. We'll deploy your trading dashboard to DigitalOcean step by step.

---

## 📋 **What You Need Before Starting**

1. ✅ **DigitalOcean Account** (Sign up at digitalocean.com - you'll need a credit card)
2. ✅ **GitHub Repository** - https://github.com/afadhel/trading-dashboard (DONE!)
3. ✅ **Domain Control** - moneywire.io (you already own this!)

---

## 🎯 **Option 1: DigitalOcean App Platform (EASIEST - RECOMMENDED)**

### **Step 1: Create DigitalOcean Account**

1. **Go to:** [digitalocean.com](https://digitalocean.com)
2. **Click "Sign Up"**
3. **Use GitHub to sign up** (easiest - links to your repository)
4. **Add payment method** (credit card required)
5. **Verify email** if prompted

### **Step 2: Create PostgreSQL Database**

1. **In DigitalOcean Dashboard, click "Databases"** in left sidebar
2. **Click "Create Database Cluster"**
3. **Choose these settings:**
   - **Engine:** PostgreSQL
   - **Version:** 14
   - **Configuration:** Basic (1 GB RAM, 1 vCPU, 10 GB SSD) - $15/month
   - **Datacenter region:** New York 1 (or closest to you)
   - **VPC Network:** Default VPC (leave as is)
   - **Database cluster name:** `rhino-trading-db`
4. **Click "Create Database Cluster"**
5. **Wait 5-10 minutes** for creation
6. **IMPORTANT:** Once created, click on your database and go to "Connection Details"
7. **Copy the connection string** - it looks like:
   ```
   postgresql://doadmin:XXXXXXXX@rhino-trading-db-do-user-XXXXXX-0.db.ondigitalocean.com:25060/defaultdb?sslmode=require
   ```
8. **Save this connection string** - you'll need it in Step 4!

### **Step 3: Deploy Your App to App Platform**

1. **In DigitalOcean Dashboard, click "Apps"** in left sidebar
2. **Click "Create App"**
3. **Choose "GitHub" as source**
4. **If not connected:** Click "Connect to GitHub" and authorize DigitalOcean
5. **Select Repository:**
   - **Repository:** `afadhel/trading-dashboard`
   - **Branch:** `main`
6. **Click "Next"**

### **Step 4: Configure Your App Components**

DigitalOcean will auto-detect your app structure. **You need to edit each component:**

#### **4a. Configure Frontend (React App)**
1. **Click "Edit" next to the detected React component**
2. **Settings:**
   - **Name:** `frontend`
   - **Source Directory:** `/frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `/build`
   - **Environment Variables:** (click "Edit" in Environment Variables section)
     - **REACT_APP_API_URL:** `${APP_URL}/api`
     - **REACT_APP_WS_URL:** `wss://${APP_DOMAIN}/api`
     - **GENERATE_SOURCEMAP:** `false`
3. **HTTP Request Routes:**
   - **Route:** `/` (this should be automatically set)
4. **Click "Save"**

#### **4b. Configure API Server**
1. **Click "Edit" next to the API server component** (if detected)
2. **OR click "Add Component" → "Service" if not detected**
3. **Settings:**
   - **Name:** `api-server`
   - **Source Directory:** `/functions/api-server`
   - **Build Command:** `npm install`
   - **Run Command:** `node index.js`
   - **HTTP Request Routes:**
     - **Route:** `/api`
   - **Environment Variables:**
     - **NODE_ENV:** `production`
     - **DATABASE_URL:** [paste the connection string from Step 2]
     - **WS_PORT:** `8080`
4. **Resource Size:** Basic (512 MB RAM, 0.5 vCPU) - $5/month
5. **Click "Save"**

#### **4c. Configure Webhook Receiver**
1. **Click "Add Component" → "Service"**
2. **Settings:**
   - **Name:** `webhook-receiver`
   - **Source Directory:** `/functions/webhook-receiver`
   - **Build Command:** `npm install`
   - **Run Command:** `node index.js`
   - **HTTP Request Routes:**
     - **Route:** `/webhook`
   - **Environment Variables:**
     - **NODE_ENV:** `production`
     - **DATABASE_URL:** [paste the connection string from Step 2]
4. **Resource Size:** Basic (512 MB RAM, 0.5 vCPU) - $5/month
5. **Click "Save"**

### **Step 5: Add Your Database**

1. **In the App configuration, click "Add Resource"**
2. **Select "Database"**
3. **Choose "Existing Database"**
4. **Select:** `rhino-trading-db` (the database you created in Step 2)
5. **Click "Add"**

### **Step 6: Review and Create**

1. **Review all components:**
   - ✅ Frontend (React app)
   - ✅ API Server
   - ✅ Webhook Receiver  
   - ✅ PostgreSQL Database
2. **Check estimated cost:** Should be around $30-40/month
3. **Click "Create Resources"**
4. **Wait 10-15 minutes** for deployment

### **Step 7: Set Up Your Domain (moneywire.io)**

Once your app is deployed:

1. **In your App dashboard, click "Settings"**
2. **Click "Domains"**
3. **Click "Add Domain"**
4. **Enter:** `moneywire.io`
5. **Click "Add Domain"**

DigitalOcean will show you DNS records to add:

#### **7a. Update Your DNS Settings**

**Go to your domain registrar** (where you bought moneywire.io):

1. **Find DNS Management** (usually called "DNS", "Name Servers", or "Domain Management")
2. **Add these records:**

   **A Record:**
   - **Name/Host:** `@` or leave blank
   - **Value:** The IP address shown by DigitalOcean
   - **TTL:** 3600

   **CNAME Record:**
   - **Name/Host:** `www`
   - **Value:** `moneywire.io`
   - **TTL:** 3600

   **CNAME Record (for DigitalOcean):**
   - **Name/Host:** The subdomain shown by DigitalOcean (like `abc123`)
   - **Value:** The target shown by DigitalOcean (like `abc123.ondigitalocean.app`)
   - **TTL:** 3600

3. **Save DNS changes**
4. **Wait 1-24 hours** for DNS propagation

#### **7b. Add www.moneywire.io (Optional)**

1. **Back in DigitalOcean, click "Add Domain" again**
2. **Enter:** `www.moneywire.io`
3. **Choose "Redirect to moneywire.io"**
4. **Click "Add Domain"**

### **Step 8: Initialize Your Database**

Once your app is running:

1. **Go to your database in DigitalOcean**
2. **Click "Connection Details"**
3. **Copy the connection string**
4. **Use a tool like pgAdmin or connect via command line:**

```sql
-- Connect to your database and run:
CREATE TABLE IF NOT EXISTS symbols (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    exchange VARCHAR(50),
    asset_type VARCHAR(20) DEFAULT 'crypto',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trading_signals (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    signal_type VARCHAR(50),
    trend_score INTEGER,
    previous_score INTEGER,
    price DECIMAL(20,8),
    trend_direction VARCHAR(10),
    pattern VARCHAR(100),
    timeframes JSONB,
    total_active_timeframes INTEGER,
    uptrend_count INTEGER,
    downtrend_count INTEGER,
    alignment_ratio DECIMAL(5,2),
    score_description TEXT,
    chart_timeframe VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_symbols_symbol ON symbols(symbol);
CREATE INDEX idx_signals_symbol ON trading_signals(symbol);
CREATE INDEX idx_signals_created_at ON trading_signals(created_at);
```

### **Step 9: Test Your Deployment**

1. **Visit your app URL** (shown in DigitalOcean)
2. **You should see:** Your RHINO Trading Dashboard
3. **Test the webhook:** Use the URL `https://moneywire.io/webhook` in your Pine Script
4. **Check database:** Send a test webhook and verify data appears

### **Step 10: Update Your Pine Script**

**In your TradingView Pine Script, update the webhook URL:**

```pinescript
// Old URL (remove this)
// webhook_url = "your-old-url"

// New URL (use this)
webhook_url = "https://moneywire.io/webhook"
```

### **Cost Estimate**: ~$30-45/month

- Frontend: $5/month
- API Server: $5/month  
- Webhook Receiver: $5/month
- Database: $15/month
- App Platform fee: $5-15/month
- **Domain & SSL: FREE**

---

## 🚨 **Important Next Steps After Deployment**

### **Monitor Your Application**

1. **DigitalOcean Monitoring:**
   - Go to your App → "Insights" 
   - Enable monitoring and alerts

2. **Database Backups:**
   - Go to Databases → Your database → "Backups"
   - Enable daily automated backups

3. **Application Logs:**
   - Go to your App → "Runtime Logs"
   - Monitor for any errors

### **Security Setup**

1. **Environment Variables:**
   - Never commit database passwords to Git
   - Use DigitalOcean's environment variable system

2. **Database Security:**
   - Your database is automatically secured with SSL
   - Only your app can access it (VPC network isolation)

### **Performance Optimization**

1. **CDN (Optional):**
   - DigitalOcean automatically serves your frontend via CDN
   
2. **Database Optimization:**
   - Monitor database performance in DigitalOcean dashboard
   - Upgrade size if needed as data grows

---

## 🆘 **Troubleshooting Common Issues**

### **App Won't Deploy**

1. **Check build logs** in DigitalOcean App Platform
2. **Common fixes:**
   - Make sure `package.json` exists in each component directory
   - Verify Node.js version compatibility
   - Check for typos in environment variables

### **Domain Not Working**

1. **DNS Propagation:** Can take up to 24 hours
2. **Check DNS:** Use tools like `dig moneywire.io` or [whatsmydns.net](https://whatsmydns.net)
3. **Verify records:** Make sure you added the correct A and CNAME records

### **Database Connection Issues**

1. **Check connection string:** Make sure it's exactly as provided by DigitalOcean
2. **Environment variables:** Verify DATABASE_URL is set correctly in all components
3. **SSL requirement:** DigitalOcean databases require SSL (already handled in connection string)

### **Webhook Not Receiving Data**

1. **Test webhook URL:** `https://moneywire.io/webhook` should return a response
2. **Check logs:** Look at webhook-receiver logs in DigitalOcean
3. **TradingView settings:** Verify webhook URL is correct in Pine Script

---

## 🏁 **You're Done!**

Your trading dashboard should now be live at `https://moneywire.io`! 

The dashboard will:
- ✅ Receive webhooks from your Pine Script at `https://moneywire.io/webhook`
- ✅ Store data in PostgreSQL database
- ✅ Display real-time trading signals with beautiful UI
- ✅ Work on your custom domain with automatic SSL
- ✅ Auto-scale based on traffic
- ✅ Include monitoring and backups

**Congratulations on deploying your first production web application!** 🎉

### **Next Steps:**
1. Update your Pine Script webhook URL
2. Send test signals from TradingView
3. Monitor your dashboard performance
4. Share your amazing trading dashboard at `https://moneywire.io`!

---

## 📞 **Need Help?**

**Support Resources:**
- [DigitalOcean Community](https://www.digitalocean.com/community)
- [DigitalOcean Documentation](https://docs.digitalocean.com/products/app-platform/)
- [Your GitHub Repository](https://github.com/afadhel/trading-dashboard) - Create an issue if you find bugs

**Quick Debug Commands:**
```bash
# Check your app status
curl -I https://moneywire.io

# Test webhook endpoint  
curl -X POST https://moneywire.io/webhook -H "Content-Type: application/json" -d '{"test": "data"}'
``` 