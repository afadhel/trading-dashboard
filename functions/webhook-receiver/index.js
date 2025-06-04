const { Pool } = require('pg');
const Joi = require('joi');
const { Client } = require('pg');
const WebSocket = require('ws');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// WebSocket broadcaster (for real-time updates)
let wsServer = null;

// Enhanced validation schema
const webhookSchema = Joi.object({
    symbol: Joi.string().required().min(3).max(20),
    trend_score: Joi.number().integer().valid(-8, -7, -6, -5, 0, 5, 6, 7, 8).required(),
    previous_score: Joi.number().integer().valid(-8, -7, -6, -5, 0, 5, 6, 7, 8).optional(),
    price: Joi.number().positive().required(),
    pattern: Joi.string().required(),
    trend_direction: Joi.string().valid('UP', 'DOWN', 'NEUTRAL').required(),
    total_active_timeframes: Joi.number().integer().min(0).max(8).required(),
    uptrend_count: Joi.number().integer().min(0).max(8).required(),
    downtrend_count: Joi.number().integer().min(0).max(8).required(),
    alignment_ratio: Joi.string().required(),
    score_description: Joi.string().required(),
    chart_timeframe: Joi.string().required(),
    timeframes: Joi.object().pattern(
        Joi.string(), // tf_key (tf1, tf2, etc.)
        Joi.object({
            period: Joi.string().required(),
            status: Joi.string().valid('UP', 'DOWN', 'INACTIVE').required(),
            support: Joi.number().optional(),
            resistance: Joi.number().optional()
        })
    ).required(),
    timestamp: Joi.string().isoDate().optional(),
    // Optional symbol metadata
    exchange: Joi.string().optional(),
    asset_type: Joi.string().optional(),
    display_name: Joi.string().optional()
}).custom((value, helpers) => {
    // Validate that the trend_score matches the uptrend/downtrend count logic
    const { trend_score, uptrend_count, downtrend_count, total_active_timeframes } = value;
    
    // Check that uptrend + downtrend = total active (for active timeframes)
    if (uptrend_count + downtrend_count > total_active_timeframes) {
        return helpers.error('custom.invalidCounts', { 
            message: 'uptrend_count + downtrend_count cannot exceed total_active_timeframes' 
        });
    }
    
    // Check that trend_score = uptrend_count - downtrend_count
    const expectedScore = uptrend_count - downtrend_count;
    if (trend_score !== expectedScore) {
        return helpers.error('custom.invalidScore', { 
            message: `trend_score (${trend_score}) must equal uptrend_count (${uptrend_count}) - downtrend_count (${downtrend_count}) = ${expectedScore}` 
        });
    }
    
    // Validate that only valid score combinations are possible
    const validCombinations = [
        { score: -8, up: 0, down: 8 },
        { score: -7, up: 1, down: 7 },
        { score: -6, up: 2, down: 6 },
        { score: -5, up: 3, down: 5 },
        { score: 0, up: 4, down: 4 },
        { score: 5, up: 5, down: 3 },
        { score: 6, up: 6, down: 2 },
        { score: 7, up: 7, down: 1 },
        { score: 8, up: 8, down: 0 }
    ];
    
    const isValidCombination = validCombinations.some(combo => 
        combo.score === trend_score && 
        combo.up === uptrend_count && 
        combo.down === downtrend_count
    );
    
    if (!isValidCombination) {
        return helpers.error('custom.invalidCombination', { 
            message: `Invalid combination: score=${trend_score}, up=${uptrend_count}, down=${downtrend_count}. Only valid RHINO score combinations allowed.` 
        });
    }
    
    return value;
});

// Helper function to get or create symbol
async function getOrCreateSymbol(client, symbolName) {
    try {
        // Try to get existing symbol
        let result = await client.query(
            'SELECT id FROM symbols WHERE symbol = $1',
            [symbolName]
        );
        
        if (result.rows.length > 0) {
            return result.rows[0].id;
        }
        
        // Create new symbol if not exists
        result = await client.query(
            'INSERT INTO symbols (symbol, display_name, is_active) VALUES ($1, $2, true) RETURNING id',
            [symbolName, symbolName]
        );
        
        return result.rows[0].id;
    } catch (error) {
        console.error('Error in getOrCreateSymbol:', error);
        throw error;
    }
}

// Helper function to store signal timeframes
async function storeSignalTimeframes(client, signalId, timeframes) {
    try {
        const insertPromises = [];
        
        for (const [tfKey, tfData] of Object.entries(timeframes)) {
            const query = `
                INSERT INTO signal_timeframes (signal_id, tf_key, period, status, support_level, resistance_level)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;
            
            insertPromises.push(
                client.query(query, [
                    signalId,
                    tfKey,
                    tfData.period,
                    tfData.status,
                    tfData.support || null,
                    tfData.resistance || null
                ])
            );
        }
        
        await Promise.all(insertPromises);
    } catch (error) {
        console.error('Error storing signal timeframes:', error);
        throw error;
    }
}

// Helper function to update timeframes configuration
async function updateTimeframesConfig(client, timeframes) {
    try {
        for (const [tfKey, tfData] of Object.entries(timeframes)) {
            // Convert period to minutes for sorting
            const minutes = convertPeriodToMinutes(tfData.period);
            
            await client.query(`
                INSERT INTO timeframes (tf_key, period, display_name, minutes)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (tf_key, period) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    minutes = EXCLUDED.minutes
            `, [tfKey, tfData.period, tfData.period, minutes]);
        }
    } catch (error) {
        console.error('Error updating timeframes config:', error);
        // Don't throw - this is non-critical
    }
}

// Helper function to convert period to minutes
function convertPeriodToMinutes(period) {
    const periodMap = {
        '1': 1, '3': 3, '5': 5, '15': 15, '30': 30, '60': 60,
        '240': 240, '480': 480, 'D': 1440, 'W': 10080, 'M': 43200,
        '3M': 129600, '6M': 259200, '12M': 518400
    };
    return periodMap[period] || 0;
}

// Broadcast update to WebSocket clients
function broadcastUpdate(data) {
    if (wsServer && wsServer.clients) {
        const message = JSON.stringify({
            type: 'signal_update',
            data: data,
            timestamp: new Date().toISOString()
        });
        
        wsServer.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}

// Main handler function
const main = async (args) => {
    console.log('Webhook received:', JSON.stringify(args, null, 2));
    
    // Validate webhook payload
    const { error, value } = webhookSchema.validate(args);
    if (error) {
        console.error('Validation error:', error.details);
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'Invalid webhook payload',
                details: error.details
            })
        };
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        await client.query('BEGIN');

        // 1. Handle dynamic symbol discovery/creation
        const symbolResult = await ensureSymbolExists(client, value);
        const symbolId = symbolResult.symbol_id;

        // 2. Update/create timeframes dynamically
        await updateTimeframes(client, value.timeframes);

        // 3. Create signal record
        const signalResult = await client.query(`
            INSERT INTO signals (
                symbol_id, signal_type, trend_score, previous_score, price, 
                pattern, trend_direction, total_active_timeframes, 
                uptrend_count, downtrend_count, alignment_ratio, 
                score_description, chart_timeframe, raw_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
        `, [
            symbolId,
            'WEBHOOK_SIGNAL',
            value.trend_score,
            value.previous_score,
            value.price,
            value.pattern,
            value.trend_direction,
            value.total_active_timeframes,
            value.uptrend_count,
            value.downtrend_count,
            value.alignment_ratio,
            value.score_description,
            value.chart_timeframe,
            JSON.stringify(value)
        ]);

        const signalId = signalResult.rows[0].id;

        // 4. Create signal timeframes with categorization
        await createSignalTimeframes(client, signalId, value.timeframes);

        await client.query('COMMIT');

        // 5. Broadcast via WebSocket if available
        await broadcastUpdate(value);

        console.log(`Successfully processed signal for ${value.symbol} (${signalId})`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Signal processed successfully',
                signalId: signalId,
                symbol: value.symbol,
                score: value.trend_score
            })
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing webhook:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    } finally {
        await client.end();
    }
};

// Ensure symbol exists, create if new
async function ensureSymbolExists(client, payload) {
    try {
        // Try to get existing symbol
        const existingSymbol = await client.query(
            'SELECT id FROM symbols WHERE symbol = $1',
            [payload.symbol]
        );

        if (existingSymbol.rows.length > 0) {
            return { symbol_id: existingSymbol.rows[0].id, is_new: false };
        }

        // Create new symbol
        const newSymbol = await client.query(`
            INSERT INTO symbols (
                symbol, display_name, exchange, asset_type, is_active
            ) VALUES ($1, $2, $3, $4, true)
            RETURNING id
        `, [
            payload.symbol,
            payload.display_name || payload.symbol,
            payload.exchange || 'unknown',
            payload.asset_type || 'crypto'
        ]);

        console.log(`New symbol discovered: ${payload.symbol}`);
        
        return { symbol_id: newSymbol.rows[0].id, is_new: true };
        
    } catch (error) {
        console.error('Error ensuring symbol exists:', error);
        throw error;
    }
}

// Update timeframes table with new periods
async function updateTimeframes(client, timeframes) {
    const periodToMinutes = {
        '1': 1, '5': 5, '15': 15, '30': 30, '60': 60, '120': 120, '240': 240,
        'H': 60, '2H': 120, '4H': 240, '6H': 360, '8H': 480, '12H': 720,
        'D': 1440, 'W': 10080, 'M': 43200, '3M': 129600, '6M': 259200, '12M': 518400
    };

    for (const [tf_key, tfData] of Object.entries(timeframes)) {
        const minutes = periodToMinutes[tfData.period] || 0;
        
        // Get or create timeframe category
        const categoryResult = await client.query(`
            SELECT id FROM timeframe_categories 
            WHERE $1 BETWEEN min_minutes AND max_minutes
            ORDER BY sort_order
            LIMIT 1
        `, [minutes]);

        const categoryId = categoryResult.rows[0]?.id || null;

        // Insert or update timeframe
        await client.query(`
            INSERT INTO timeframes (tf_key, period, display_name, minutes, category_id)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (tf_key, period) 
            DO UPDATE SET 
                display_name = EXCLUDED.display_name,
                minutes = EXCLUDED.minutes,
                category_id = EXCLUDED.category_id
        `, [
            tf_key,
            tfData.period,
            `${tfData.period} (${tf_key})`,
            minutes,
            categoryId
        ]);
    }
}

// Create signal timeframes with short/long term categorization
async function createSignalTimeframes(client, signalId, timeframes) {
    for (const [tf_key, tfData] of Object.entries(timeframes)) {
        // Check if timeframe is short-term
        const tfResult = await client.query(
            'SELECT is_short_term FROM timeframes WHERE tf_key = $1 AND period = $2',
            [tf_key, tfData.period]
        );

        const isShortTerm = tfResult.rows[0]?.is_short_term || false;

        await client.query(`
            INSERT INTO signal_timeframes (
                signal_id, tf_key, period, status, 
                support_level, resistance_level, is_short_term
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            signalId,
            tf_key,
            tfData.period,
            tfData.status,
            tfData.support || null,
            tfData.resistance || null,
            isShortTerm
        ]);
    }
}

// Broadcast update via WebSocket (if WebSocket server is available)
async function broadcastUpdate(payload) {
    try {
        // In a real implementation, you'd connect to your WebSocket server
        // For now, we'll just log that we would broadcast
        console.log('Broadcasting update for symbol:', payload.symbol);
        
        const updateMessage = {
            type: 'SIGNAL_UPDATE',
            symbol: payload.symbol,
            score: payload.trend_score,
            price: payload.price,
            direction: payload.trend_direction,
            timestamp: new Date().toISOString()
        };
        
        // TODO: Implement actual WebSocket broadcasting
        // ws.broadcast(JSON.stringify(updateMessage));
        
    } catch (error) {
        console.error('Error broadcasting update:', error);
        // Don't throw - broadcasting failure shouldn't fail the webhook
    }
}

// Handle CORS preflight
async function handleOptions() {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        },
        body: {}
    };
}

// Export function for DigitalOcean Functions
exports.main = async function(args) {
    if (args.__ow_method === 'OPTIONS') {
        return handleOptions();
    }
    
    return main(args);
}; 