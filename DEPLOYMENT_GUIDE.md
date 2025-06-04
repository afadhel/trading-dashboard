# RHINO Trading Dashboard - DigitalOcean Deployment Guide

## 🚀 Complete Deployment Guide

This guide will help you deploy the RHINO Trading Dashboard on DigitalOcean with dynamic symbol discovery, stale data cleanup, and enhanced timeframe categorization.

## 📋 Prerequisites

1. **DigitalOcean Account** with billing enabled
2. **GitHub Repository** for your code
3. **DigitalOcean CLI** (`doctl`) installed
4. **Node.js 18+** for local development

## 🏗 Architecture Overview

```
TradingView Pine Script → DigitalOcean Functions → PostgreSQL → React Dashboard
                    ↓
               Webhook Receiver → API Server → WebSocket → Frontend
                    ↓
               Cleanup Function (Daily Scheduled)
```

## 💾 Database Setup

### 1. Create PostgreSQL Database

```bash
# Create a managed PostgreSQL cluster
doctl databases create rhino-trading-db \
  --engine postgres \
  --version 14 \
  --size db-s-1vcpu-1gb \
  --region nyc1 \
  --num-nodes 1
```

### 2. Get Database Connection Details

```bash
# Get connection details
doctl databases connection rhino-trading-db
```

### 3. Initialize Database Schema

```bash
# Connect to your database and run:
psql "postgresql://username:password@host:port/database?sslmode=require"

# Run the enhanced schema
\i database/schema-enhanced.sql
```

## ⚡ Functions Deployment

### 1. Install DigitalOcean CLI

```bash
# Install doctl
curl -OL https://github.com/digitalocean/doctl/releases/latest/download/doctl-1.94.0-linux-amd64.tar.gz
tar xf doctl-1.94.0-linux-amd64.tar.gz
sudo mv doctl /usr/local/bin

# Authenticate
doctl auth init
```

### 2. Deploy Functions

```bash
# Deploy all functions
doctl serverless deploy functions

# Or deploy individually:
doctl serverless deploy functions/webhook-receiver
doctl serverless deploy functions/api-server
doctl serverless deploy functions/maintenance/cleanup-stale-data
```

### 3. Set Environment Variables

```bash
# Set database URL for all functions
doctl serverless functions config set DATABASE_URL "postgresql://username:password@host:port/database?sslmode=require"

# Set other environment variables
doctl serverless functions config set NODE_ENV "production"
doctl serverless functions config set WS_PORT "8080"
```

## 🌐 Frontend Deployment

### 1. Update Environment Variables

Create `frontend/.env.production`:

```env
REACT_APP_API_URL=https://your-api-function-url
REACT_APP_WS_URL=wss://your-api-function-url
```

### 2. Deploy to DigitalOcean App Platform

```bash
# Create app from GitHub
doctl apps create .do/app.yaml

# Monitor deployment
doctl apps list
doctl apps get-deployment <app-id> <deployment-id>
```

## 🔧 Configuration

### 1. Webhook Receiver Function URL

After deployment, get your webhook receiver URL:

```bash
doctl serverless functions list
```

Use this URL in your Pine Script webhook configuration.

### 2. Enhanced Pine Script Configuration

Update your Pine Script with the webhook URL:

```pinescript
// Webhook configuration
webhook_url = input.string("https://your-webhook-function-url", "Webhook URL")

// Enhanced payload with dynamic symbol discovery
webhook_payload = str.format('{{
    "symbol": "{0}",
    "display_name": "{1}",
    "exchange": "{2}",
    "asset_type": "crypto",
    "trend_score": {3},
    "previous_score": {4},
    "price": {5},
    "pattern": "{6}",
    "trend_direction": "{7}",
    "total_active_timeframes": {8},
    "uptrend_count": {9},
    "downtrend_count": {10},
    "alignment_ratio": "{11}",
    "score_description": "{12}",
    "chart_timeframe": "{13}",
    "timeframes": {{
        "tf1": {{"period": "{14}", "status": "{15}", "support": {16}, "resistance": {17}}},
        "tf2": {{"period": "{18}", "status": "{19}", "support": {20}, "resistance": {21}}},
        // ... add all your timeframes
    }},
    "timestamp": "{22}"
}}', 
syminfo.ticker, syminfo.description, syminfo.exchange,
trend_score, prev_score, close, pattern_description, trend_direction,
total_active, uptrend_count, downtrend_count, alignment_ratio,
score_description, timeframe.period,
tf1_period, tf1_status, tf1_support, tf1_resistance,
tf2_period, tf2_status, tf2_support, tf2_resistance,
// ... all timeframes
time_close)
```

## 🛠 Key Features Implemented

### ✅ Dynamic Symbol Discovery
- **No hardcoded symbols** - all symbols are discovered from incoming webhooks
- **Automatic symbol metadata** - exchange, asset type, display names
- **Symbol lifecycle tracking** - first seen, last seen timestamps

### ✅ Stale Data Cleanup
- **30-day inactive threshold** - symbols marked inactive after 30 days without signals
- **90-day data purge** - old signals automatically deleted
- **Daily automated cleanup** - scheduled function runs daily at 2 AM
- **Analytics tracking** - daily symbol performance metrics

### ✅ Timeframe Categorization
- **Short-term** (≤2 hours): 1m, 5m, 15m, 30m, 1h, 2h
- **Long-term** (>2 hours): 4h, 6h, 8h, 12h, D, W, M, 3M, 6M, 12M
- **Intelligent grouping** - automatic categorization based on minutes
- **Summary analytics** - bullish/bearish counts per category
- **Overall alignment** - percentage and confidence scoring

### ✅ Enhanced Analytics
- **Confidence scoring** - based on timeframe alignment and diversity
- **Trend strength** - WEAK, MODERATE, STRONG, EXTREME classifications
- **Coverage analysis** - DIVERSE, SHORT_TERM_ONLY, LONG_TERM_ONLY
- **Real-time updates** - WebSocket broadcasting for live data

## 📊 Dashboard Features

### 🎯 Symbol Overview
- **Dynamic symbol list** - auto-populated from webhooks
- **Last seen timestamps** - track symbol activity
- **Confidence indicators** - visual confidence scoring
- **Timeframe coverage** - see which symbols have diverse analysis

### 📈 Categorized Analysis
- **Short-term summary** - quick scalping/day trading insights
- **Long-term summary** - swing/position trading view
- **Overall alignment** - comprehensive trend assessment
- **Interactive details** - expandable detailed breakdowns

### 🔄 Real-time Updates
- **WebSocket connectivity** - live signal updates
- **Connection status** - visual connection indicators
- **Auto-reconnection** - robust connection handling
- **Broadcast messaging** - real-time data synchronization

## 🎨 API Endpoints

### Enhanced API Structure:

```
GET /current-states           # All active symbols with categorization
GET /timeframe-analysis/:symbol   # Detailed symbol analysis
GET /symbols                  # Active symbols summary
GET /timeframe-categories     # Category definitions
GET /history/:symbol          # Paginated signal history
GET /stats                    # System statistics
GET /health                   # Health check with connection count
```

## 💡 Cost Estimation

### DigitalOcean Pricing (Monthly):
- **PostgreSQL Basic**: $15/month (1 vCPU, 1GB RAM, 10GB storage)
- **Functions**: ~$5-15/month (depending on webhook volume)
- **App Platform**: $12/month (Basic tier)
- **Total**: ~$32-42/month

### Scaling Considerations:
- **Functions auto-scale** based on demand
- **Database can be upgraded** as data grows
- **CDN caching** available for frontend assets

## 🔐 Security Best Practices

1. **Database Security**:
   - SSL-only connections enforced
   - Connection pooling with timeouts
   - Environment variable management

2. **Function Security**:
   - Input validation with Joi schemas
   - SQL injection prevention
   - Error handling without data exposure

3. **Network Security**:
   - CORS properly configured
   - HTTPS enforcement
   - WebSocket secure connections

## 📈 Monitoring & Alerts

### 1. Set up Function Monitoring

```bash
# View function logs
doctl serverless functions logs webhook-receiver

# Monitor function performance
doctl serverless functions get webhook-receiver
```

### 2. Database Monitoring

```bash
# Check database metrics
doctl databases get rhino-trading-db
```

### 3. Application Monitoring

- **Health endpoint**: Regular checks on `/health`
- **WebSocket monitoring**: Connection count tracking
- **Error logging**: Comprehensive error capture

## 🚨 Troubleshooting

### Common Issues:

1. **Database Connection Issues**:
   ```bash
   # Test connection
   psql "postgresql://username:password@host:port/database?sslmode=require" -c "SELECT 1;"
   ```

2. **Function Deployment Issues**:
   ```bash
   # Check function status
   doctl serverless functions list
   
   # View deployment logs
   doctl serverless functions logs <function-name>
   ```

3. **WebSocket Connection Issues**:
   - Check CORS configuration
   - Verify WebSocket URL format
   - Monitor connection count in health endpoint

4. **Stale Data Issues**:
   ```sql
   -- Check symbol activity
   SELECT symbol, last_seen, is_active FROM symbols ORDER BY last_seen DESC;
   
   -- Manual cleanup trigger
   SELECT cleanup_stale_symbols();
   ```

## 🔄 Maintenance

### Daily Tasks (Automated):
- Stale symbol cleanup
- Symbol analytics updates
- Performance metric calculations

### Weekly Tasks:
- Review system statistics
- Monitor database growth
- Check function performance

### Monthly Tasks:
- Database backup verification
- Cost optimization review
- Feature usage analysis

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review function logs
3. Test individual components
4. Monitor health endpoints

This deployment guide provides a complete, production-ready setup for the RHINO Trading Dashboard with all enhanced features including dynamic symbol discovery, intelligent timeframe categorization, and automated maintenance. 