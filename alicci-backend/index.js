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
// 1. ALICCI AI CHATBOT ENDPOINT (AKILLI VE ESNEK)
// ==========================================
app.post('/api/chat', async (req, res) => {
    try {
        if (!genAI || !process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "AI servisi yapılandırılmamış." });
        }

        // Frontend'den hem 'history' hem de 'message' gelebilmesine izin veriyoruz
        const { history, message } = req.body;
        
        // Kullanıcı son mesajı ne gönderdi?
        let userLastMessage = "";
        if (message) {
            userLastMessage = message;
        } else if (history && Array.isArray(history) && history.length > 0) {
            userLastMessage = history[history.length - 1].text || history[history.length - 1].message;
        }

        if (!userLastMessage) {
            return res.status(400).json({ error: "Boş mesaj gönderilemez." });
        }

        const systemInstruction = `Sen ALICCI giyim markasının Müşteri Destek Asistanısın.

KURALLAR:
1. Kullanıcının sorduğu soruya DOĞRUDAN cevap ver. Sohbet dışı veya genel sorular gelirse (örn: hal hatır, komik sorular) kibarca kısa cevap verip konuyu e-ticarete/yardıma getir.
2. Kargo takibi sorulursa:
   - Eğer mesajda ALC- ile başlayan kod VARSA (Örn: ALC-123456): "ALC-123456 numaralı siparişinizin durumunu size SMS/E-posta ile gönderilen kargo takip linkinden kontrol edebilirsiniz. Dilerseniz destek@alicci.com adresine yazabilirsiniz." de.
   - Eğer mesajda henüz sipariş kodu YOKSA: "Siparişinizi kontrol edebilmem için lütfen ALC- ile başlayan sipariş numaranızı yazar mısınız?" de.
3. Gerçek kargo sistemine bağlı değilsin, asla "yola çıktı", "hazırlanıyor" gibi SAHTE bilgi uydurma.
4. Cevapların her zaman 1-2 cümle, kısa, resmi ve kibar olsun.`;

        // API anahtarına bağlı modelleri çek
        const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await apiResponse.json();

        if (!data.models || data.models.length === 0) {
            return res.status(500).json({ error: "Model listesi alınamadı." });
        }

        const geminiModels = data.models.filter(m => m.name.toLowerCase().includes('gemini'));
        let reply = null;

        for (const m of geminiModels) {
            const modelName = m.name.replace('models/', '');
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    systemInstruction: systemInstruction 
                });

                // Eğer history varsa chat modunu başlat, yoksa doğrudan yanıt üret
                if (history && Array.isArray(history) && history.length > 1) {
                    const formattedHistory = [];
                    let expectedRole = 'user';

                    for (const msg of history.slice(0, -1)) {
                        const role = msg.sender === 'user' ? 'user' : 'model';
                        if (role === expectedRole) {
                            formattedHistory.push({ role: role, parts: [{ text: msg.text || msg.message }] });
                            expectedRole = role === 'user' ? 'model' : 'user';
                        }
                    }

                    if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
                        formattedHistory.pop();
                    }

                    const chat = model.startChat({ history: formattedHistory });
                    const result = await chat.sendMessage(userLastMessage);
                    reply = result.response.text();
                } else {
                    const prompt = `${systemInstruction}\nMüşteri: ${userLastMessage}\nAsistan:`;
                    const result = await model.generateContent(prompt);
                    reply = result.response.text();
                }

                if (reply) break;
            } catch (err) {
                console.warn(`${modelName} hatası:`, err.message);
            }
        }

        if (!reply) {
            return res.status(500).json({ error: "AI yanıt üretemedi." });
        }

        return res.json({ reply });
    } catch (error) {
        console.error("Chatbot Hatası:", error);
        return res.status(500).json({ error: "Sunucu hatası oluştu." });
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
