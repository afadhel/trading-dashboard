const { Client } = require('pg');

// Main handler for the cleanup function
const main = async (context) => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        
        console.log('Starting daily cleanup process...');
        
        // Run the cleanup function
        const result = await client.query('SELECT cleanup_stale_symbols() as deleted_count');
        const deletedCount = result.rows[0]?.deleted_count || 0;
        
        // Get current symbol statistics
        const symbolStats = await client.query(`
            SELECT 
                COUNT(*) as total_symbols,
                COUNT(*) FILTER (WHERE is_active = true) as active_symbols,
                COUNT(*) FILTER (WHERE is_active = false) as inactive_symbols,
                COUNT(*) FILTER (WHERE last_seen < CURRENT_TIMESTAMP - INTERVAL '7 days') as stale_7d,
                COUNT(*) FILTER (WHERE last_seen < CURRENT_TIMESTAMP - INTERVAL '30 days') as stale_30d
            FROM symbols
        `);
        
        // Update symbol analytics
        await updateSymbolAnalytics(client);
        
        // Log cleanup results
        const stats = symbolStats.rows[0];
        console.log('Cleanup completed:', {
            symbolsMarkedInactive: deletedCount,
            totalSymbols: stats.total_symbols,
            activeSymbols: stats.active_symbols,
            inactiveSymbols: stats.inactive_symbols,
            stale7Days: stats.stale_7d,
            stale30Days: stats.stale_30d,
            timestamp: new Date().toISOString()
        });
        
        return {
            success: true,
            message: `Cleanup completed. ${deletedCount} symbols marked inactive.`,
            stats: stats
        };
        
    } catch (error) {
        console.error('Cleanup process failed:', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        await client.end();
    }
};

// Update daily analytics for all symbols
async function updateSymbolAnalytics(client) {
    const today = new Date().toISOString().split('T')[0];
    
    try {
        await client.query(`
            INSERT INTO symbol_analytics (
                symbol_id, date, signal_count, avg_score, score_volatility,
                price_change_percent, max_score, min_score, dominant_trend
            )
            SELECT 
                s.symbol_id,
                $1::date as date,
                COUNT(s.id) as signal_count,
                AVG(s.trend_score::decimal) as avg_score,
                STDDEV(s.trend_score::decimal) as score_volatility,
                CASE 
                    WHEN MIN(s.price) > 0 THEN 
                        ((MAX(s.price) - MIN(s.price)) / MIN(s.price) * 100)
                    ELSE 0 
                END as price_change_percent,
                MAX(s.trend_score) as max_score,
                MIN(s.trend_score) as min_score,
                CASE 
                    WHEN AVG(s.trend_score::decimal) > 1 THEN 'UP'
                    WHEN AVG(s.trend_score::decimal) < -1 THEN 'DOWN'
                    ELSE 'NEUTRAL'
                END as dominant_trend
            FROM signals s
            WHERE s.created_at::date = $1::date
            GROUP BY s.symbol_id
            ON CONFLICT (symbol_id, date) 
            DO UPDATE SET
                signal_count = EXCLUDED.signal_count,
                avg_score = EXCLUDED.avg_score,
                score_volatility = EXCLUDED.score_volatility,
                price_change_percent = EXCLUDED.price_change_percent,
                max_score = EXCLUDED.max_score,
                min_score = EXCLUDED.min_score,
                dominant_trend = EXCLUDED.dominant_trend
        `, [today]);
        
        console.log('Symbol analytics updated for', today);
    } catch (error) {
        console.error('Failed to update symbol analytics:', error);
    }
}

module.exports = { main }; 