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
if (process.env.GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    } catch (e) {
        console.error("Gemini Başlatma Hatası:", e);
    }
}

// Temel test rotası
app.get('/', (req, res) => {
    res.send('ALICCI Backend Aktif ve Çalışıyor! 🚀');
});

// ==========================================
// 1. ALICCI AI CHATBOT ENDPOINT (Kesintisiz Mod)
// ==========================================
app.post('/api/chat', async (req, res) => {
    let userLastMessage = "";

    try {
        const { history, message } = req.body;
        
        // Kullanıcının son mesajını alma
        if (message) {
            userLastMessage = message;
        } else if (history && Array.isArray(history) && history.length > 0) {
            const lastItem = history[history.length - 1];
            userLastMessage = lastItem.text || lastItem.message;
        }

        if (!userLastMessage) {
            return res.status(400).json({ error: "Boş mesaj gönderilemez." });
        }

        if (genAI) {
            const systemInstruction = `Sen ALICCI giyim markasının Müşteri Destek Asistanısın.

KURALLAR:
1. Kullanıcının sorduğu soruya DOĞRUDAN cevap ver. Sohbet dışı sorular gelirse kibarca kısa cevap verip konuyu e-ticarete/yardıma getir.
2. Kargo takibi sorulursa:
   - Eğer mesajda ALC- ile başlayan kod VARSA (Örn: ALC-123456): "ALC-123456 numaralı siparişinizin durumunu sitemizdeki "Kargo Takip" butonuna tıklayarak kontrol edebilirsiniz." de.
   - Eğer mesajda henüz sipariş kodu YOKSA: "Siparişinizi kontrol edebilmem için lütfen ALC- ile başlayan sipariş numaranızı yazar mısınız?" de.
3. Asla sahte kargo durumu uydurma.
4. Cevapların her zaman 1-2 cümle, kısa, resmi ve kibar olsun.
5. Eğer şakacı tavır edinilirse sende hafiften şakacı ol`;

            const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                systemInstruction: systemInstruction 
            });

            let reply = "";

            // Geçmiş mesajları Gemini'nin istediği formata getirme
            let formattedHistory = [];
            if (history && Array.isArray(history) && history.length > 1) {
                const previousMessages = history.slice(0, -1);
                
                for (const msg of previousMessages) {
                    const textContent = msg.text || msg.message;
                    if (!textContent) continue;

                    const role = (msg.sender === 'user' || msg.role === 'user') ? 'user' : 'model';
                    
                    // Gemini geçmişinin İLK mesajı mutlaka 'user' olmak zorundadır
                    if (formattedHistory.length === 0 && role !== 'user') {
                        continue; // Botun ilk karşılama mesajını atla
                    }

                    // Ardışık aynı rolleri engelle (user -> model -> user)
                    if (formattedHistory.length === 0 || formattedHistory[formattedHistory.length - 1].role !== role) {
                        formattedHistory.push({
                            role: role,
                            parts: [{ text: textContent }]
                        });
                    }
                }

                // Geçmiş en son 'user' ile bitiyorsa çıkar (çünkü yeni mesaj ayrıca gönderilecek)
                if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
                    formattedHistory.pop();
                }
            }

            if (formattedHistory.length > 0) {
                const chat = model.startChat({ history: formattedHistory });
                const result = await chat.sendMessage(userLastMessage);
                reply = result.response.text();
            } else {
                const result = await model.generateContent(userLastMessage);
                reply = result.response.text();
            }

            if (reply) {
                return res.json({ reply });
            }
        }

    } catch (error) {
        console.warn("AI Servis Hatası (Yedek Yerel Cevap Veriliyor):", error.message);
    }

    // KOTA VEYA API HATASI DURUMUNDA ÇALIŞAN YEREL MOTOR (Fallback)
    const lowerMsg = userLastMessage.toLowerCase();
    let fallbackReply = "Şu anda canlı destek yoğunluğumuz bulunuyor. Sorularınız için alicci.tr@gmail.com e-posta gönderebilirsiniz.";

    if (lowerMsg.includes("alc-") || (lowerMsg.includes("kargo") && lowerMsg.includes("numara"))) {
        fallbackReply = "ALC- numaralı siparişinizin durumunu 'Kargo Takip' butonuna tıklayıp bakabilirsiniz.";
    } else if (lowerMsg.includes("kargo") || lowerMsg.includes("sipariş") || lowerMsg.includes("nerede")) {
        fallbackReply = "Sipariş durumunuzu sorgulayabilmemiz için lütfen ALC- ile başlayan sipariş numaranızı paylaşır mısınız?";
    } else if (lowerMsg.includes("iade") || lowerMsg.includes("değişim")) {
        fallbackReply = "İade ve değişim işlemlerinizi 14 gün içinde alicci.tr@gmail.com üzerinden iletişime geçerek başlatabilirsiniz.";
    } else if (lowerMsg.includes("merhaba") || lowerMsg.includes("selam")) {
        fallbackReply = "Merhaba! ALICCI Müşteri Hizmetleri'ne hoş geldiniz. Size nasıl yardımcı olabilirim?";
    }

    return res.json({ reply: fallbackReply });
});

// ==========================================
// 2. ÖDEME FORMU BAŞLATMA ROTASI (İYZİCO)
// ==========================================
app.post('/api/iyzico-checkout', (req, res) => {
    try {
        const { basketItems, totalPrice, buyerInfo } = req.body;

        const formattedPrice = parseFloat(totalPrice || 0).toFixed(2);

        const request = {
            locale: Iyzipay.LOCALE.TR,
            conversationId: '123456789',
            price: formattedPrice,
            paidPrice: formattedPrice,
            currency: Iyzipay.CURRENCY.TRY,
            basketId: 'B' + Date.now(),
            paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
            callbackUrl: 'https://alicci-backend-us.onrender.com/payment-callback', 
            
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
                contactName: buyerInfo?.name ? `${buyerInfo.name} ${buyerInfo.surname || ''}` : 'Misafir Kullanıcı',
                city: buyerInfo?.city || 'Istanbul',
                country: 'Turkey',
                address: buyerInfo?.address || 'Türkiye Merkez',
                zipCode: '34000'
            },
            billingAddress: {
                contactName: buyerInfo?.name ? `${buyerInfo.name} ${buyerInfo.surname || ''}` : 'Misafir Kullanıcı',
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
                price: parseFloat(item.price || 0).toFixed(2)
            }))
        };

        iyzipay.checkoutFormInitialize.create(request, (err, result) => {
            if (err || result.status === 'failure') {
                console.error('Iyzico Hatası:', err || result?.errorMessage);
                return res.status(400).json({
                    success: false,
                    message: result?.errorMessage || 'Ödeme formu oluşturulamadı.'
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
