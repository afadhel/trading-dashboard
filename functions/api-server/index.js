const { Pool } = require('pg');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Express app setup
const app = express();
const server = http.createServer(app);

// WebSocket server setup
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Store active WebSocket connections
const activeConnections = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    activeConnections.add(ws);
    
    // Send welcome message with connection info
    ws.send(JSON.stringify({
        type: 'CONNECTION_ESTABLISHED',
        timestamp: new Date().toISOString(),
        activeConnections: activeConnections.size
    }));
    
    ws.on('close', () => {
        activeConnections.delete(ws);
        console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        activeConnections.delete(ws);
    });
});

// Broadcast function for real-time updates
function broadcast(message) {
    const data = JSON.stringify(message);
    activeConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });
}

// API Routes

// Get current states with enhanced categorization
app.get('/current-states', async (req, res) => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT 
                s.symbol,
                s.display_name,
                s.exchange,
                s.asset_type,
                s.last_seen,
                cs.*,
                -- Calculate additional metrics
                ROUND(cs.confidence_score, 1) as confidence,
                CASE 
                    WHEN cs.short_term_count > 0 AND cs.long_term_count > 0 THEN 'DIVERSE'
                    WHEN cs.short_term_count > 0 THEN 'SHORT_TERM_ONLY'  
                    WHEN cs.long_term_count > 0 THEN 'LONG_TERM_ONLY'
                    ELSE 'NO_DATA'
                END as timeframe_coverage,
                -- Time since last update
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - cs.updated_at))/60 as minutes_since_update
            FROM symbols s
            JOIN current_states cs ON s.id = cs.symbol_id
            WHERE s.is_active = true
            ORDER BY s.last_seen DESC
        `;
        
        const result = await client.query(query);
        
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString(),
            total_symbols: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching current states:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Database error',
            message: error.message 
        });
    } finally {
        client.release();
    }
});

// Get timeframe analysis for a specific symbol
app.get('/timeframe-analysis/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const client = await pool.connect();
    
    try {
        // Get latest signal with timeframe breakdown
        const query = `
            WITH latest_signal AS (
                SELECT s.id, s.symbol_id, s.created_at
                FROM signals s
                JOIN symbols sym ON s.symbol_id = sym.id
                WHERE sym.symbol = $1
                ORDER BY s.created_at DESC
                LIMIT 1
            ),
            categorized_timeframes AS (
                SELECT 
                    stf.*,
                    tf.display_name,
                    tf.minutes,
                    tf.is_short_term,
                    tc.category_name,
                    tc.description as category_description
                FROM signal_timeframes stf
                JOIN latest_signal ls ON stf.signal_id = ls.id
                LEFT JOIN timeframes tf ON stf.tf_key = tf.tf_key AND stf.period = tf.period
                LEFT JOIN timeframe_categories tc ON tf.category_id = tc.id
                ORDER BY tf.minutes ASC
            )
            SELECT 
                -- Short-term summary
                (SELECT json_build_object(
                    'count', COUNT(*),
                    'bullish', COUNT(*) FILTER (WHERE status = 'UP'),
                    'bearish', COUNT(*) FILTER (WHERE status = 'DOWN'),
                    'inactive', COUNT(*) FILTER (WHERE status = 'INACTIVE'),
                    'net_score', COUNT(*) FILTER (WHERE status = 'UP') - COUNT(*) FILTER (WHERE status = 'DOWN'),
                    'timeframes', json_agg(json_build_object(
                        'tf_key', tf_key,
                        'period', period,
                        'status', status,
                        'display_name', display_name,
                        'category', category_name
                    ))
                ) FROM categorized_timeframes WHERE is_short_term = true) as short_term,
                
                -- Long-term summary
                (SELECT json_build_object(
                    'count', COUNT(*),
                    'bullish', COUNT(*) FILTER (WHERE status = 'UP'),
                    'bearish', COUNT(*) FILTER (WHERE status = 'DOWN'),
                    'inactive', COUNT(*) FILTER (WHERE status = 'INACTIVE'),
                    'net_score', COUNT(*) FILTER (WHERE status = 'UP') - COUNT(*) FILTER (WHERE status = 'DOWN'),
                    'timeframes', json_agg(json_build_object(
                        'tf_key', tf_key,
                        'period', period,
                        'status', status,
                        'display_name', display_name,
                        'category', category_name
                    ))
                ) FROM categorized_timeframes WHERE is_short_term = false) as long_term,
                
                -- Overall summary
                (SELECT json_build_object(
                    'total_count', COUNT(*),
                    'total_bullish', COUNT(*) FILTER (WHERE status = 'UP'),
                    'total_bearish', COUNT(*) FILTER (WHERE status = 'DOWN'),
                    'total_inactive', COUNT(*) FILTER (WHERE status = 'INACTIVE'),
                    'overall_net_score', COUNT(*) FILTER (WHERE status = 'UP') - COUNT(*) FILTER (WHERE status = 'DOWN'),
                    'alignment_percentage', ROUND(
                        GREATEST(
                            COUNT(*) FILTER (WHERE status = 'UP'),
                            COUNT(*) FILTER (WHERE status = 'DOWN')
                        )::decimal / NULLIF(COUNT(*) FILTER (WHERE status != 'INACTIVE'), 0) * 100, 1
                    ),
                    'dominant_trend', CASE 
                        WHEN COUNT(*) FILTER (WHERE status = 'UP') > COUNT(*) FILTER (WHERE status = 'DOWN') THEN 'BULLISH'
                        WHEN COUNT(*) FILTER (WHERE status = 'DOWN') > COUNT(*) FILTER (WHERE status = 'UP') THEN 'BEARISH'
                        ELSE 'NEUTRAL'
                    END
                ) FROM categorized_timeframes) as overall
        `;
        
        const result = await client.query(query, [symbol]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Symbol not found or no recent signals'
            });
        }
        
        res.json({
            success: true,
            symbol: symbol,
            data: result.rows[0],
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error fetching timeframe analysis:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Database error',
            message: error.message 
        });
    } finally {
        client.release();
    }
});

// Get all active symbols with summary
app.get('/symbols', async (req, res) => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT * FROM active_symbols_summary
            ORDER BY last_seen DESC
        `;
        
        const result = await client.query(query);
        
        res.json({
            success: true,
            data: result.rows,
            total_count: result.rows.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching symbols:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Database error',
            message: error.message 
        });
    } finally {
        client.release();
    }
});

// Get timeframe categories overview
app.get('/timeframe-categories', async (req, res) => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT * FROM timeframe_category_summary
        `;
        
        const result = await client.query(query);
        
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching timeframe categories:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Database error',
            message: error.message 
        });
    } finally {
        client.release();
    }
});

// Get signal history for a symbol with pagination
app.get('/history/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const client = await pool.connect();
    try {
        const query = `
            SELECT 
                s.*,
                sym.symbol,
                -- Calculate score change
                s.trend_score - COALESCE(s.previous_score, 0) as score_change,
                -- Time since previous signal
                LAG(s.created_at) OVER (ORDER BY s.created_at DESC) - s.created_at as time_since_previous
            FROM signals s
            JOIN symbols sym ON s.symbol_id = sym.id
            WHERE sym.symbol = $1
            ORDER BY s.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        
        const countQuery = `
            SELECT COUNT(*) as total
            FROM signals s
            JOIN symbols sym ON s.symbol_id = sym.id
            WHERE sym.symbol = $1
        `;
        
        const [result, countResult] = await Promise.all([
            client.query(query, [symbol, limit, offset]),
            client.query(countQuery, [symbol])
        ]);
        
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching signal history:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Database error',
            message: error.message 
        });
    } finally {
        client.release();
    }
});

// Get system statistics
app.get('/stats', async (req, res) => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM symbols WHERE is_active = true) as active_symbols,
                (SELECT COUNT(*) FROM symbols WHERE is_active = false) as inactive_symbols,
                (SELECT COUNT(*) FROM signals WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as signals_24h,
                (SELECT COUNT(*) FROM signals WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as signals_7d,
                (SELECT COUNT(*) FROM signals WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as signals_30d,
                (SELECT COUNT(DISTINCT symbol_id) FROM signals WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as active_symbols_24h,
                (SELECT AVG(ABS(trend_score)) FROM signals WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as avg_score_24h,
                (SELECT COUNT(*) FROM timeframes) as total_timeframes,
                (SELECT COUNT(*) FROM timeframe_categories) as total_categories
        `;
        
        const result = await client.query(query);
        
        res.json({
            success: true,
            data: result.rows[0],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Database error',
            message: error.message 
        });
    } finally {
        client.release();
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
            websocket_connections: activeConnections.size
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Export broadcast function for use by webhook receiver
module.exports = { broadcast };

// Main handler for serverless deployment
const main = async (args) => {
    const port = process.env.WS_PORT || 8080;
    
    return new Promise((resolve) => {
        server.listen(port, () => {
            console.log(`RHINO Trading API Server running on port ${port}`);
            console.log(`WebSocket server ready for connections`);
            resolve({
                statusCode: 200,
                body: JSON.stringify({
                    message: 'API Server started successfully',
                    port: port,
                    endpoints: [
                        'GET /current-states',
                        'GET /timeframe-analysis/:symbol',
                        'GET /symbols',
                        'GET /timeframe-categories',
                        'GET /history/:symbol',
                        'GET /stats',
                        'GET /health'
                    ]
                })
            });
        });
    });
};

module.exports.main = main; 