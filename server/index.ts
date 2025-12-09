
import express from 'express';
import type { Request as ExRequest, Response as ExResponse, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from "@google/genai";
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';

const { Pool } = pg;

// --- Module Augmentation to add 'user' to Express Request ---
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; };
    }
  }
}

// --- Environment Variable Validation ---
const requiredEnvVars = ['API_KEY', 'DB_PASSWORD', 'JWT_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'CLIENT_URL'];
for (const envVar of requiredEnvVars) { 
    if (!process.env[envVar]) { 
        console.error(`FATAL: Environment variable ${envVar} is not set.`); 
        (process as any).exit(1); 
    } 
}
const PORT = process.env.PORT || 8080;

// --- Initialize Express App ---
const app = express();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME || 'vfin-prod-instance:us-central1:vfin-prod-db';
const dbPool = new Pool({ user: 'postgres', database: 'vfin_data', password: process.env.DB_PASSWORD!, host: `/cloudsql/${connectionName}`, port: 5432 });


// Stripe Webhook Handler - needs to be before express.json() to get raw body
// Cast express.raw to RequestHandler to fix overload mismatch
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}) as unknown as RequestHandler, async (req: ExRequest, res: ExResponse) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    const session = event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
    const customerId = session.customer as string;
    const dbClient = await dbPool.connect();
    try {
        await dbClient.query('BEGIN');
        const userResult = await dbClient.query('SELECT id FROM users WHERE stripe_customer_id = $1', [customerId]);
        if (userResult.rows.length === 0) throw new Error(`Webhook Error: No user found for Stripe customer ID ${customerId}`);
        const userId = userResult.rows[0].id;
        
        switch (event.type) {
            case 'checkout.session.completed': {
                const checkoutSession = event.data.object as Stripe.Checkout.Session;
                if (!checkoutSession.subscription) break;
                const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription as string);
                
                const tierResult = await dbClient.query('SELECT tier_name FROM products WHERE stripe_price_id = $1', [subscription.items.data[0].price.id]);
                if (tierResult.rows.length === 0) throw new Error('Product tier not found for price ID');
                const tierName = tierResult.rows[0].tier_name;
                // Cast to any to handle potential type definitions mismatches
                const currentPeriodEnd = (subscription as any).current_period_end;
                await dbClient.query(`INSERT INTO subscriptions (user_id, stripe_subscription_id, status, tier_name, current_period_end) VALUES ($1, $2, $3, $4, TO_TIMESTAMP($5)) ON CONFLICT (stripe_subscription_id) DO UPDATE SET status = $3, tier_name = $4, current_period_end = TO_TIMESTAMP($5)`, [userId, subscription.id, subscription.status, tierName, currentPeriodEnd]);
                await dbClient.query('UPDATE users SET subscription_tier = $1, subscription_status = $2 WHERE id = $3', [tierName, subscription.status, userId]);
                break;
            }
            case 'customer.subscription.updated': {
                const updatedSubscription = event.data.object as Stripe.Subscription;
                const updatedTierResult = await dbClient.query('SELECT tier_name FROM products WHERE stripe_price_id = $1', [updatedSubscription.items.data[0].price.id]);
                if (updatedTierResult.rows.length === 0) throw new Error('Product tier not found for price ID');
                const updatedTierName = updatedTierResult.rows[0].tier_name;
                // Cast to any to handle potential type definitions mismatches
                const currentPeriodEnd = (updatedSubscription as any).current_period_end;
                await dbClient.query('UPDATE subscriptions SET status = $1, tier_name = $2, current_period_end = TO_TIMESTAMP($3) WHERE stripe_subscription_id = $4', [updatedSubscription.status, updatedTierName, currentPeriodEnd, updatedSubscription.id]);
                await dbClient.query('UPDATE users SET subscription_tier = $1, subscription_status = $2 WHERE id = $3', [updatedTierName, updatedSubscription.status, userId]);
                break;
            }
            case 'customer.subscription.deleted': {
                const deletedSubscription = event.data.object as Stripe.Subscription;
                await dbClient.query('UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2', ['canceled', deletedSubscription.id]);
                await dbClient.query("UPDATE users SET subscription_tier = 'free', subscription_status = 'canceled' WHERE id = $1", [userId]);
                break;
            }
        }
        await dbClient.query('COMMIT');
        res.json({ received: true });
    } catch (error) {
        await dbClient.query('ROLLBACK');
        console.error("Error processing webhook:", error);
        res.status(500).json({ error: "Webhook processing failed." });
    } finally {
        dbClient.release();
    }
});

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });


const initializeDatabase = async () => {
    const client = await dbPool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                company_name VARCHAR(255) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                stripe_customer_id VARCHAR(255) UNIQUE,
                subscription_tier VARCHAR(50) DEFAULT 'free' NOT NULL,
                subscription_status VARCHAR(50) DEFAULT 'free' NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Add new columns separately to avoid errors on subsequent runs
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS company_logo_url TEXT;');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS client_profile JSONB;');

        await client.query(`CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, description TEXT, tier_name VARCHAR(50) UNIQUE NOT NULL, stripe_price_id VARCHAR(255) UNIQUE NOT NULL);`);
        const products = [
            { name: 'vCPA Starter', tier_name: 'starter', description: 'Core financial analysis and dashboard.', stripe_price_id: 'price_1PgQWzRvyMLtsA1yq4F8dJzQ' },
            { name: 'vCPA Growth', tier_name: 'growth', description: 'Trend analysis and goal setting.', stripe_price_id: 'price_1PgQXxRvyMLtsA1yLzP2PjN6' },
            { name: 'vCFO', tier_name: 'vcfo', description: 'Forecasting and scenario modeling.', stripe_price_id: 'price_1PgQYjRvyMLtsA1yn5a3nUf8' },
            { name: 'VWA (Virtual Wealth Advisor)', tier_name: 'vwa', description: 'Connect business performance to personal financial freedom.', stripe_price_id: 'price_1PgQZKRvyMLtsA1yN3B65jSJ' },
        ];
        for (const product of products) { await client.query('INSERT INTO products (name, tier_name, description, stripe_price_id) VALUES ($1, $2, $3, $4) ON CONFLICT (tier_name) DO NOTHING', [product.name, product.tier_name, product.description, product.stripe_price_id]); }
        await client.query(`CREATE TABLE IF NOT EXISTS subscriptions (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL, status VARCHAR(50) NOT NULL, tier_name VARCHAR(50) NOT NULL REFERENCES products(tier_name), current_period_end TIMESTAMP WITH TIME ZONE NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`);
        await client.query(`CREATE TABLE IF NOT EXISTS financial_periods (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, period_name VARCHAR(100) NOT NULL, parsed_data JSONB NOT NULL, ai_analysis JSONB NOT NULL, financial_health_score JSONB, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, period_name));`);
        await client.query(`CREATE TABLE IF NOT EXISTS scenarios (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, name VARCHAR(255) NOT NULL, assumptions JSONB NOT NULL, result JSONB NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`);
        await client.query(`CREATE TABLE IF NOT EXISTS vwa_data (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE, ownership_stake NUMERIC(5, 2) NOT NULL, freedom_goal TEXT NOT NULL, target_age INTEGER NOT NULL, target_net_worth NUMERIC(15, 2) NOT NULL, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`);
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("ERROR: Could not initialize database schema:", error);
        (process as any).exit(1);
    } finally { client.release(); }
};

const verifyToken = (req: ExRequest, res: ExResponse, next: NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied.' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; email: string; };
        next();
    } catch (e) { res.status(403).json({ error: 'Invalid token.' }); }
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req: ExRequest, res: ExResponse) => {
    const { email, password, companyName } = req.body;
    if (!email || !password || !companyName) return res.status(400).json({ error: "Email, password, and company name are required." });
    let dbClient; try { dbClient = await dbPool.connect(); await dbClient.query('BEGIN'); const customer = await stripe.customers.create({ email: email.toLowerCase(), name: companyName }); const salt = await bcrypt.genSalt(10); const password_hash = await bcrypt.hash(password, salt); const newUserResult = await dbClient.query('INSERT INTO users (email, company_name, password_hash, stripe_customer_id) VALUES ($1, $2, $3, $4) RETURNING *', [email.toLowerCase(), companyName, password_hash, customer.id]); await dbClient.query('COMMIT'); const user = newUserResult.rows[0]; const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' }); res.status(201).json({ user: { email: user.email, companyName: user.company_name, subscriptionTier: user.subscription_tier, subscriptionStatus: 'free', companyLogoUrl: user.company_logo_url, clientProfile: user.client_profile }, token }); } catch (error: any) { if(dbClient) await dbClient.query('ROLLBACK'); if (error.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' }); res.status(500).json({ error: "Failed to register user." }); } finally { if (dbClient) dbClient.release(); }
});

app.post('/api/auth/login', async (req: ExRequest, res: ExResponse) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    try { const userResult = await dbPool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]); if (userResult.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials.' }); const user = userResult.rows[0]; const isMatch = await bcrypt.compare(password, user.password_hash); if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' }); const token = jwt.sign({ id: user.id, email: user.email, }, process.env.JWT_SECRET!, { expiresIn: '7d' }); res.json({ user: { email: user.email, companyName: user.company_name, subscriptionTier: user.subscription_tier, subscriptionStatus: user.subscription_status, companyLogoUrl: user.company_logo_url, clientProfile: user.client_profile }, token }); } catch (e) { res.status(500).json({ error: "Server error during login." }); }
});

app.get('/api/auth/me', verifyToken, async (req: ExRequest, res: ExResponse) => {
    try { const userId = req.user!.id; const userResult = await dbPool.query('SELECT * FROM users WHERE id = $1', [userId]); if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found.' }); const user = userResult.rows[0]; res.json({ email: user.email, companyName: user.company_name, subscriptionTier: user.subscription_tier, subscriptionStatus: user.subscription_status, companyLogoUrl: user.company_logo_url, clientProfile: user.client_profile }); } catch (e) { res.status(500).json({ error: 'Failed to fetch user data.' }); }
});

app.post('/api/vcpa/save-profile', verifyToken, async (req: ExRequest, res: ExResponse) => {
    const { profile, companyLogoUrl } = req.body;
    try {
        await dbPool.query('UPDATE users SET client_profile = $1, company_logo_url = $2 WHERE id = $3', [profile, companyLogoUrl, req.user!.id]);
        res.status(200).json({ message: 'Profile updated successfully.' });
    } catch(e) { res.status(500).json({ error: 'Failed to save profile.' }); }
});

// --- SUBSCRIPTION ROUTES ---
app.get('/api/products', async (req: ExRequest, res: ExResponse) => { try { const result = await dbPool.query('SELECT name, description, tier_name, stripe_price_id FROM products ORDER BY id'); res.json(result.rows); } catch (e) { res.status(500).json({ error: 'Could not fetch product plans.' }); } });

app.post('/api/create-checkout-session', verifyToken, async (req: ExRequest, res: ExResponse) => { const { priceId } = req.body; const userId = req.user!.id; try { const userResult = await dbPool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]); if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) return res.status(404).json({ error: 'Stripe customer not found for this user.' }); const customerId = userResult.rows[0].stripe_customer_id; const session = await stripe.checkout.sessions.create({ customer: customerId, payment_method_types: ['card'], line_items: [{ price: priceId, quantity: 1 }], mode: 'subscription', success_url: `${process.env.CLIENT_URL}/vcpa?subscription_success=true`, cancel_url: `${process.env.CLIENT_URL}/pricing`, allow_promotion_codes: true, }); res.json({ url: session.url }); } catch (e: any) { res.status(500).json({ error: `Failed to create checkout session: ${e.message}` }); } });

app.post('/api/create-portal-session', verifyToken, async (req: ExRequest, res: ExResponse) => { const userId = req.user!.id; try { const userResult = await dbPool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]); if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) return res.status(404).json({ error: 'Stripe customer not found.' }); const customerId = userResult.rows[0].stripe_customer_id; const portalSession = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${process.env.CLIENT_URL}/account`, }); res.json({ url: portalSession.url }); } catch (e: any) { res.status(500).json({ error: `Failed to create portal session: ${e.message}` }); } });

// --- VCPA ROUTES ---
const financialDataSchema = { type: Type.OBJECT, properties: { period: { type: Type.STRING }, totalRevenue: { type: Type.NUMBER }, netIncome: { type: Type.NUMBER }, totalAssets: { type: Type.NUMBER }, totalLiabilities: { type: Type.NUMBER }, cashFromOps: { type: Type.NUMBER }, equity: { type: Type.NUMBER }, costOfGoodsSold: { type: Type.NUMBER }, operatingExpenses: { type: Type.NUMBER }, currentAssets: { type: Type.NUMBER }, currentLiabilities: { type: Type.NUMBER }, interestBearingDebt: {type: Type.NUMBER}, accountsReceivable: {type: Type.NUMBER}, accountsPayable: {type: Type.NUMBER}, topExpenses: {type: Type.ARRAY, items: {type: Type.OBJECT, properties: {name: {type: Type.STRING}, amount: {type: Type.NUMBER}}}}, MRR: { type: Type.NUMBER, description: "Monthly Recurring Revenue, if the business is a SaaS." }, inventory: { type: Type.NUMBER, description: "Value of inventory, if the business is in retail/e-commerce." }, inventoryTurnover: {type: Type.NUMBER, description: "Inventory turnover ratio, if retail/e-commerce."}} };

app.post('/api/vcpa/process-statements', verifyToken, async (req: ExRequest, res: ExResponse) => { const { statements } = req.body; const userId = req.user!.id; try { const userResult = await dbPool.query('SELECT client_profile FROM users WHERE id = $1', [userId]); const profile = userResult.rows[0]?.client_profile || {}; const industryInfo = profile.industry ? `The business is in the ${profile.industry} industry. If it's SaaS, look for MRR. If it's retail/e-commerce, look for inventory and calculate inventory turnover.` : ''; const combinedContent = `Parse the key figures. ${industryInfo}\nBalance Sheet:\n${statements.balanceSheet}\n\nIncome Statement:\n${statements.incomeStatement}\n\nCash Flow:\n${statements.cashFlow}`; const parseResponse = await ai.models.generateContent({ model: "gemini-2.5-pro", contents: combinedContent, config: { responseMimeType: "application/json", responseSchema: financialDataSchema } }); const parsedData = JSON.parse(parseResponse.text ?? '{}'); const periodName = parsedData.period; const previousPeriodResult = await dbPool.query('SELECT parsed_data FROM financial_periods WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]); const previousData = previousPeriodResult.rows.length > 0 ? previousPeriodResult.rows[0].parsed_data : null; const analyzePrompt = `Analyze this financial data. Current: ${JSON.stringify(parsedData)}. Previous: ${JSON.stringify(previousData)}. Provide a JSON response with a 'summary' (array of strings) and 'recommendations' (array of strings).`; const analyzeResponse = await ai.models.generateContent({ model: "gemini-2.5-pro", contents: analyzePrompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { summary: { type: Type.ARRAY, items: { type: Type.STRING } }, recommendations: { type: Type.ARRAY, items: { type: Type.STRING } } } } } }); const aiAnalysis = JSON.parse(analyzeResponse.text ?? '{}'); const healthPrompt = `Calculate a financial health score. Current: ${JSON.stringify(parsedData)}. Previous: ${JSON.stringify(previousData)}. Provide JSON with 'score' (0-100), 'rating' ('Excellent'/'Good'/'Fair'/'Poor'), 'strengths' (array of strings), and 'weaknesses' (array of strings).`; const healthResponse = await ai.models.generateContent({ model: "gemini-2.5-pro", contents: healthPrompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, rating: { type: Type.STRING }, strengths: { type: Type.ARRAY, items: { type: Type.STRING } }, weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } } } } } }); const financialHealthScore = JSON.parse(healthResponse.text ?? '{}'); await dbPool.query(`INSERT INTO financial_periods (user_id, period_name, parsed_data, ai_analysis, financial_health_score) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, period_name) DO UPDATE SET parsed_data = $3, ai_analysis = $4, financial_health_score = $5;`, [userId, periodName, parsedData, aiAnalysis, financialHealthScore]); res.status(201).json({ message: "Analysis complete and saved." }); } catch (e) { console.error(e); res.status(500).json({ error: "Failed to process financial statements." }); } });

app.get('/api/vcpa/periods', verifyToken, async (req: ExRequest, res: ExResponse) => { try { const result = await dbPool.query('SELECT id, period_name FROM financial_periods WHERE user_id = $1 ORDER BY created_at ASC', [req.user!.id]); res.json(result.rows.map(row => ({ id: row.id, periodName: row.period_name }))); } catch (e) { res.status(500).json({ error: 'Could not fetch financial periods.' }); } });

app.get('/api/vcpa/period-data/:id', verifyToken, async (req: ExRequest, res: ExResponse) => { try { const { id } = req.params; const result = await dbPool.query('SELECT * FROM financial_periods WHERE id = $1 AND user_id = $2', [id, req.user!.id]); if (result.rows.length === 0) return res.status(404).json({ error: 'Period not found.' }); const row = result.rows[0]; res.json({ id: row.id, periodName: row.period_name, parsedData: row.parsed_data, aiAnalysis: row.ai_analysis, financialHealthScore: row.financial_health_score }); } catch (e) { res.status(500).json({ error: 'Could not fetch period data.' }); } });

app.delete('/api/vcpa/periods/:id', verifyToken, async (req: ExRequest, res: ExResponse) => { try { await dbPool.query('DELETE FROM financial_periods WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]); res.status(204).send(); } catch (e) { res.status(500).json({ error: 'Could not delete financial period.' }); } });

app.post('/api/vcpa/explain-kpi', verifyToken, async (req: ExRequest, res: ExResponse) => { const { kpiName, kpiValue } = req.body; const prompt = `Explain the KPI "${kpiName}" and a value of "${kpiValue}" simply for a small business owner.`; try { const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt }); res.json({ explanation: response.text ?? 'Could not generate explanation.' }); } catch (e) { res.status(500).json({ explanation: 'Could not generate explanation.' }); } });

app.post('/api/vcpa/validate-statement', verifyToken, async (req: ExRequest, res: ExResponse) => { const { content, expectedType } = req.body; const prompt = `Analyze this text. Respond with ONLY ONE of: "BalanceSheet", "IncomeStatement", "CashFlowStatement", or "None". Content:\n"""\n${content.substring(0, 4000)}\n"""`; try { const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt }); const classifiedType = (response.text ?? 'None').trim().toLowerCase(); const typeMap: any = { balanceSheet: "balancesheet", incomeStatement: "incomestatement", cashFlow: "cashflowstatement" }; res.json({ isValid: classifiedType === typeMap[expectedType] }); } catch (e) { res.status(500).json({ error: "AI validation failed.", isValid: false }); } });

// --- VCFO ROUTES ---
app.post('/api/vcfo/run-scenario', verifyToken, async (req: ExRequest, res: ExResponse) => { const { assumptions } = req.body; const userId = req.user!.id; try { const latestPeriod = await dbPool.query('SELECT parsed_data FROM financial_periods WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]); if (latestPeriod.rows.length === 0) return res.status(400).json({ error: 'No financial data found.' }); const baseData = latestPeriod.rows[0].parsed_data; const prompt = `Model a "what-if" scenario. Base data: ${JSON.stringify(baseData)}. Assumptions: ${JSON.stringify(assumptions)}. Calculate 'projectedNetIncome', 'projectedCashFlow', and a brief 'commentary'.`; const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { projectedNetIncome: { type: Type.NUMBER }, projectedCashFlow: { type: Type.NUMBER }, commentary: { type: Type.STRING } } } } }); const result = JSON.parse(response.text ?? '{}'); const savedScenario = await dbPool.query('INSERT INTO scenarios (user_id, name, assumptions, result) VALUES ($1, $2, $3, $4) RETURNING *', [userId, assumptions.name, assumptions, result]); res.status(201).json(savedScenario.rows[0]); } catch (e) { res.status(500).json({ error: 'Failed to run scenario.' }); } });

app.get('/api/vcfo/scenarios', verifyToken, async (req: ExRequest, res: ExResponse) => { try { const result = await dbPool.query('SELECT * FROM scenarios WHERE user_id = $1 ORDER BY created_at DESC', [req.user!.id]); res.json(result.rows); } catch(e) { res.status(500).json({error: 'Failed to fetch scenarios.'}) } });

app.delete('/api/vcfo/scenarios/:id', verifyToken, async (req: ExRequest, res: ExResponse) => { try { await dbPool.query('DELETE FROM scenarios WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]); res.status(204).send(); } catch(e) { res.status(500).json({error: 'Failed to delete scenario.'}) } });

// --- VWA ROUTES ---
app.get('/api/vwa/data', verifyToken, async(req: ExRequest, res: ExResponse) => {  try { const userId = req.user!.id; const vwaResult = await dbPool.query('SELECT * FROM vwa_data WHERE user_id = $1', [userId]); const latestPeriod = await dbPool.query('SELECT parsed_data FROM financial_periods WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]); if (vwaResult.rows.length === 0) return res.status(404).json({ error: 'VWA data not set up.' }); const businessValue = (latestPeriod.rows[0]?.parsed_data?.netIncome || 0) * 5; const ownerEquity = (latestPeriod.rows[0]?.parsed_data?.equity || 0) * (Number(vwaResult.rows[0].ownership_stake) / 100); const externalAccounts = [{ type: 'Investment', name: 'Brokerage Account', balance: 150000 }, { type: 'Retirement', name: '401(k)', balance: 320000 },]; res.json({ ...vwaResult.rows[0], businessValue, ownerEquity, externalAccounts }); } catch(e) { res.status(500).json({error: 'Failed to fetch VWA data.'}) } });

app.post('/api/vwa/onboarding', verifyToken, async(req: ExRequest, res: ExResponse) => { const { ownershipStake, freedomGoal, targetAge, targetNetWorth } = req.body; try { await dbPool.query(`INSERT INTO vwa_data (user_id, ownership_stake, freedom_goal, target_age, target_net_worth) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id) DO UPDATE SET ownership_stake = $2, freedom_goal = $3, target_age = $4, target_net_worth = $5`, [req.user!.id, ownershipStake, freedomGoal, targetAge, targetNetWorth]); res.status(201).json({ message: 'VWA data saved.' }); } catch(e) { res.status(500).json({error: 'Failed to save VWA data.'}) } });

app.post('/api/vwa/run-optimizer', verifyToken, async (req: ExRequest, res: ExResponse) => { const { salary, distribution, cashFromOps } = req.body; const prompt = `Analyze compensation. Cash from ops: ${cashFromOps}. Salary: ${salary}. Distributions: ${distribution}. Calculate JSON with 'takeHomePay', 'totalTaxBurden', 'businessCashImpact' ('Safe'/'Caution'/'Risky'), and 'coachAdvice'. Assume S-Corp.`; try { const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { takeHomePay: { type: Type.NUMBER }, totalTaxBurden: { type: Type.NUMBER }, businessCashImpact: { type: Type.STRING }, coachAdvice: { type: Type.STRING } } } } }); res.json(JSON.parse(response.text ?? '{}')); } catch (e) { res.status(500).json({ error: 'Failed to run optimizer.' }); } });

app.get('/api/vwa/valuation', verifyToken, async (req: ExRequest, res: ExResponse) => { try { const userId = req.user!.id; const latestPeriod = await dbPool.query('SELECT parsed_data FROM financial_periods WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]); if (latestPeriod.rows.length === 0) return res.status(404).json({ error: "No financial data available." }); const baseData = latestPeriod.rows[0].parsed_data; const prompt = `Based on this data: Net Income ${baseData.netIncome}, Revenue ${baseData.totalRevenue}, provide a single number for the estimated business value. Output only the number.`; const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }); const estimatedValue = parseFloat(response.text?.replace(/[^0-9.]/g, '')) || (baseData.netIncome || 0) * 5; const ownerEquity = (baseData.equity || 0); res.json({ businessValue: estimatedValue, ownerEquity: ownerEquity * (Number(req.query.ownership) || 1) }); } catch (e) { res.status(500).json({ error: "Failed to generate valuation." }); } });

app.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`LOG: VFIN Backend server listening on port ${PORT}`);
});
