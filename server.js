require('dotenv').config();
const express = require('express');
const Airtable = require('airtable');
const cors = require('cors');

const app = express();
// Usa la porta assegnata da Render o la 80 in locale
const PORT = process.env.PORT || 80;

app.use(cors());
app.use(express.json());

// Inizializzazione Airtable con il Base ID di UnderIndex
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base('appEkpxkkqg3JZ2wj');

// Middleware x402 (Coinbase CDP Facilitator logic)
const requirePayment = (req, res, next) => {
    const paymentHeader = req.headers['x-cdp-payment-proof']; 
    if (!paymentHeader) {
        // HTTP 402 Payment Required come da architettura
        return res.status(402).json({
            error: "Payment Required",
            amount: "0.01",
            currency: "USDC",
            network: "base",
            payTo: "0xb5842a407e6b37925DafEcf265a80A697f2B474C",
            message: "Send 0.01 USDC on Base to access this subculture's curated dataset."
        });
    }
    // Qui andrà la validazione effettiva dell'hash della transazione tramite CDP
    next();
};

// ENDPOINT 1: Health (Gratuito)
app.get('/api/health', (req, res) => {
    res.json({ status: "ok" });
});

// ENDPOINT 2: Catalogo Subculture (Gratuito - Menu)
app.get('/api/subcultures', async (req, res) => {
    try {
        const records = await base('Subculture').select({
            filterByFormula: "{Status} = 'Published'"
        }).all();

        const subcultures = records.map(record => record.get('Name'));
        res.json(subcultures);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error connecting to Airtable" });
    }
});

// ENDPOINT 3: Dettaglio Singola Subcultura (402 - A pagamento)
app.get('/api/subculture/:name', requirePayment, async (req, res) => {
    const requestedName = req.params.name.toLowerCase();

    try {
        // Recupera tutte le subculture pubblicate per il check preventivo
        const allPublished = await base('Subculture').select({
            filterByFormula: "{Status} = 'Published'"
        }).all();
        
        const availableNames = allPublished.map(r => r.get('Name'));
        const targetRecord = allPublished.find(r => r.get('Name').toLowerCase() === requestedName);

        // Protezione contro le chiavi inesistenti (nessuna moneta persa)
        if (!targetRecord) {
            return res.status(404).json({
                error: "Subculture not found",
                available: availableNames
            });
        }

        // Ritorna il record completo (1 sola riga) con la struttura corretta
        res.json({
            Name: targetRecord.get('Name'),
            Years: targetRecord.get('Years'),
            Description: targetRecord.get('Description'),
            KeyBrands: targetRecord.get('Key Brands'),
            IconicItems: targetRecord.get('Iconic Items'),
            MusicGenre: targetRecord.get('Music Genre'),
            Artists: targetRecord.get('Artists'),
            VideoGames: targetRecord.get('Video Games'),
            WhereToBuy: targetRecord.get('Where to Buy'),
            PriceRange: targetRecord.get('Price Range'),
            Notes: targetRecord.get('Notes')
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error processing request" });
    }
});

app.listen(PORT, () => {
    console.log(`UnderIndex API server is running on port ${PORT}`);
});
