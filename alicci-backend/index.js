const express = require('express');
const cors = require('cors');
const Iyzipay = require('iyzipay');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Ayarları (Vercel frontend adresine tam yetki)
app.use(cors({
    origin: ['https://alicci-tr.vercel.app', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// Iyzico Bağlantı Ayarları
const iyzipay = new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY || '',
    secretKey: process.env.IYZICO_SECRET_KEY || '',
    uri: 'https://sandbox-api.iyzipay.com'
});

// Gemini AI Güvenli Başlatma
let genAI = null;
try {
    if (process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
} catch (e) {
    console.error("Gemini Başlatma Hatası:", e);
}

// Temel test rotası
app.get('/', (req, res) => {
    res.send('ALICCI Backend Aktif ve Çalışıyor! 🚀');
});

// ==========================================
// 1. ALICCI AI CHATBOT ENDPOINT
// ==========================================
app.post('/api/chat', async (req, res) => {
    try {
        if (!genAI) {
            return res.status(500).json({ error: "AI servisi yapılandırılmamış (API Anahtarı eksik)." });
        }

        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Mesaj boş olamaz." });
        }

        // Model adını güncel ve kararlı sürüm olarak ayarladık
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const systemInstruction = "Sen ALICCI markasının müşteri destek asistanısın. Minimalist, modern kesim ve oversize giyim ürünleri satıyoruz. Müşterilere kısa, kibar, samimi ve yardımsever yanıtlar ver.";
        const prompt = `${systemInstruction}\nMüşteri: ${message}\nAsistan:`;

        const result = await model.generateContent(prompt);
        const reply = result.response.text();

        return res.json({ reply });
    } catch (error) {
        console.error("AI Chatbot Hatası:", error);
        return res.status(500).json({ error: error.message || "AI servisi şu an yanıt veremiyor." });
    }
});

// ==========================================
// 2. ÖDEME FORMU BAŞLATMA ROTASI (İYZİCO)
// ==========================================
app.post('/api/iyzico-checkout', (req, res) => {
    try {
        const { basketItems, totalPrice, buyerInfo } = req.body;

        const request = {
            locale: Iyzipay.LOCALE.TR,
            conversationId: '123456789',
            price: totalPrice.toString(),
            paidPrice: totalPrice.toString(),
            currency: Iyzipay.CURRENCY.TRY,
            basketId: 'B' + Date.now(),
            paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
            callbackUrl: 'https://alicci-backend.onrender.com/payment-callback', 
            
            buyer: {
                id: buyerInfo?.id || 'BY99',
                name: buyerInfo?.name || 'Misafir',
                surname: buyerInfo?.surname || 'Kullanıcı',
                gsmNumber: buyerInfo?.phone || '+905555555555',
                email: buyerInfo?.email || 'test@alicci.com',
                identityNumber: '11111111111',
                lastLoginDate: '2015-10-05 12:43:35',
                registrationDate: '2013-04-21 15:12:09',
                registrationAddress: buyerInfo?.address || 'Türkiye Merkez',
                ip: req.ip || '85.100.100.100',
                city: buyerInfo?.city || 'Istanbul',
                country: 'Turkey',
                zipCode: '34000'
            },
            shippingAddress: {
                contactName: (buyerInfo?.name + ' ' + buyerInfo?.surname) || 'Misafir Kullanıcı',
                city: buyerInfo?.city || 'Istanbul',
                country: 'Turkey',
                address: buyerInfo?.address || 'Türkiye Merkez',
                zipCode: '34000'
            },
            billingAddress: {
                contactName: (buyerInfo?.name + ' ' + buyerInfo?.surname) || 'Misafir Kullanıcı',
                city: buyerInfo?.city || 'Istanbul',
                country: 'Turkey',
                address: buyerInfo?.address || 'Türkiye Merkez',
                zipCode: '34000'
            },
            basketItems: (basketItems || []).map((item, index) => ({
                id: item.id || `BI${index}`,
                name: item.title || item.name || 'ALICCI Ürün',
                category: 'E-Ticaret',
                itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
                price: item.price.toString()
            }))
        };

        iyzipay.checkoutFormInitialize.create(request, (err, result) => {
            if (err || result.status === 'failure') {
                console.error('Iyzico Hatası:', err || result.errorMessage);
                return res.status(400).json({
                    success: false,
                    message: result.errorMessage || 'Ödeme formu oluşturulamadı.'
                });
            }

            res.json({
                success: true,
                checkoutFormContent: result.checkoutFormContent,
                token: result.token
            });
        });
    } catch (e) {
        console.error("Iyzico Sunucu Hatası:", e);
        res.status(500).json({ success: false, message: "Sunucu hatası oluştu." });
    }
});

// ==========================================
// 3. ÖDEME SONUCU CALLBACK ROTASI
// ==========================================
app.post('/payment-callback', (req, res) => {
    const { token } = req.body;

    iyzipay.checkoutForm.retrieve({
        locale: Iyzipay.LOCALE.TR,
        conversationId: '123456789',
        token: token
    }, (err, result) => {
        if (err || result.paymentStatus !== 'SUCCESS') {
            return res.redirect('https://alicci-tr.vercel.app/payment-failed');
        }

        res.redirect('https://alicci-tr.vercel.app/payment-success');
    });
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
