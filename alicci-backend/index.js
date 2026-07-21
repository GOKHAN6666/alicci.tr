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
// 1. ALICCI AI CHATBOT ENDPOINT (KUSURSUZ HAFIZA)
// ==========================================
app.post('/api/chat', async (req, res) => {
    try {
        if (!genAI || !process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "AI servisi yapılandırılmamış (API Anahtarı eksik)." });
        }

        const { history } = req.body;
        
        if (!history || !Array.isArray(history)) {
            return res.status(400).json({ error: "Sohbet geçmişi (history) bulunamadı. Frontend kodunu güncellediğinizden emin olun." });
        }

const systemInstruction = `Sen ALICCI markasının profesyonel, ciddi ve kurumsal müşteri destek asistanısın. Minimalist ve modern oversize giyim ürünleri satıyoruz. 
AŞAĞIDAKİ KURALLARA KESİNLİKLE UYACAKSIN:
1. ASLA "ters köşe oldu", "karıştırdık", "harika bir uyum yakaladık", "tatlı" gibi ciddiyetsiz, laubali veya rol yapma (roleplay) tarzı ifadeler kullanma. Her zaman resmi, kibar ve net ol.
2. Gerçek bir kargo veritabanına bağlı DEĞİLSİN. Bu yüzden KESİNLİKLE sahte kargo durumu uydurma (örneğin "kargonuz hazırlanıyor", "yola çıktı", "lojistik merkezinde" DEME).
3. Kullanıcı kargo kodunu verip kargosunun nerede olduğunu sorarsa, sistemde uydurma bilgi vermek yerine SADECE şu standart yanıtı ver: "Güvenlik gereği kargo durumunuzu buradan görüntüleyemiyorum. Lütfen siparişinizin durumunu size e-posta/SMS ile iletilen kargo takip linki üzerinden kontrol ediniz veya destek@alicci.com adresine yazınız."
4. Kısa ve sadece e-ticaret odaklı cevaplar ver, sohbeti uzatma.`;
        
        const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await apiResponse.json();

        if (!data.models || data.models.length === 0) {
            return res.status(500).json({ error: "API anahtarınız hiçbir modele erişemiyor." });
        }

        const geminiModels = data.models.filter(m => m.name.toLowerCase().includes('gemini'));

        // GEMINI API KURALI: Geçmiş mutlaka 'user' ile başlamalı ve 'user -> model' şeklinde sırayla gitmeli.
        const previousMessages = history.slice(0, -1);
        let formattedHistory = [];
        let expectedRole = 'user'; // İlk beklenen mesaj her zaman user olmalı

        for (const msg of previousMessages) {
            const role = msg.sender === 'user' ? 'user' : 'model';
            // Eğer gelen mesajın rolü beklediğimiz role uygunsa geçmişe ekle
            if (role === expectedRole) {
                formattedHistory.push({
                    role: role,
                    parts: [{ text: msg.text }]
                });
                // Sıradaki rolü değiştir (user ise model, model ise user bekle)
                expectedRole = role === 'user' ? 'model' : 'user';
            }
        }

        // Eğer geçmiş 'user' ile bitiyorsa ve biz son mesaj olarak yine 'user' yollarsak API çöker. 
        // Bunu önlemek için sondaki user mesajını çıkarıyoruz.
        if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
            formattedHistory.pop();
        }

        const lastMessage = history[history.length - 1].text;
        let reply = null;
        let lastError = null;

        for (const m of geminiModels) {
            const modelName = m.name.replace('models/', '');
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    systemInstruction: systemInstruction 
                });

                const chat = model.startChat({ history: formattedHistory });
                const result = await chat.sendMessage(lastMessage);
                reply = result.response.text();
                
                console.log(`Başarıyla yanıt veren model: ${modelName}`);
                break; 
            } catch (err) {
                lastError = err.message;
                console.warn(`${modelName} modeli yanıt vermedi, hata: ${lastError}`);
            }
        }

        if (!reply) {
            return res.status(500).json({ error: "Modellerden yanıt alınamadı. Son hata: " + lastError });
        }

        return res.json({ reply });
    } catch (error) {
        console.error("AI Chatbot Genel Hatası:", error);
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
