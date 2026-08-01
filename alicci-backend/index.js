const express = require('express');
const cors = require('cors');
const Iyzipay = require('iyzipay');
const Groq = require("groq-sdk");
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit'); // Rate limit kütüphanesi eklendi
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Render/Vercel reverse-proxy arkasında doğru IP tespiti için
app.set('trust proxy', 1);

// CORS Ayarları (Vercel frontend adresine tam yetki)
app.use(cors({
    origin: ['https://alicci-tr.vercel.app', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// ==========================================
// SPAM KORUMASI (Rate Limiter Ayarı)
// ==========================================
const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 dakikalık zaman penceresi
    max: 10, // Aynı IP adresinden 1 dakikada en fazla 10 mesaj atılabilir
    message: {
        reply: "Çok fazla mesaj gönderdiniz. Lütfen 1 dakika bekleyip tekrar deneyiniz."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Iyzico Bağlantı Ayarları
const iyzipay = new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY || '',
    secretKey: process.env.IYZICO_SECRET_KEY || '',
    uri: 'https://sandbox-api.iyzipay.com'
});

// Groq AI Güvenli Başlatma
let groq = null;
if (process.env.GROQ_API_KEY) {
    try {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    } catch (e) {
        console.error("Groq Başlatma Hatası:", e);
    }
}

// Supabase Bağlantı Ayarları
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
);

// Supabase'den 'products' tablosundaki tek ürünü çeken fonksiyon
async function getProductData() {
    try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            return null;
        }
        const { data, error } = await supabase
            .from('products')
            .select('name, price, description, stock')
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("Supabase Ürün Verisi Okunamadı:", error);
            return null;
        }
        return data;
    } catch (err) {
        console.error("Supabase Bağlantı Hatası:", err);
        return null;
    }
}

// Temel test rotası
app.get('/', (req, res) => {
    res.send('ALICCI Backend Aktif ve Çalışıyor! 🚀');
});

// ==========================================
// 1. ALICCI AI CHATBOT ENDPOINT (chatLimiter Korumalı)
// ==========================================
app.post('/api/chat', chatLimiter, async (req, res) => {
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

        if (groq) {
            // 1. Supabase'den güncel ürün bilgisini çekiyoruz
            const product = await getProductData();

            let productDetailsText = "Şu an sistemde aktif ürün bilgisi bulunamadı.";
            if (product) {
                productDetailsText = `
- Ürün Adı: ${product.name}
- Fiyatı: ${product.price} TL
- Açıklama / Detay: ${product.description}
- Stok Durumu: ${product.stock > 0 ? `${product.stock} adet stokta var` : 'Stok tükendi'}
                `;
            }

            // 2. Dinamik Sistem Talimatı (Güncellenmiş Kesin Kurallar)
            const systemInstruction = `Sen ALICCI e-ticaret markasının uzman satış ve stil danışmanısın.

MAĞAZAMIZDAKİ GÜNCEL ÜRÜN BİLGİSİ:
${productDetailsText}

KURALLAR:
1. YAZIM HATALARI VE GÜNLÜK DİL (KRİTİK):
   - Müşterinin yazım hatalarını (örn: "ilgileirim", "meraba", "slm"), ufak harf eksikliklerini ve günlük ifadeleri ("yaw", "agabey" vb.) esneklikle anla ve TOLERE ET.
   - Sadece "asdfghj", "qwerty" gibi tamamen rastgele ve anlamsız harf yığınlarında spam korumasını devreye sok.

2. ÜRÜN SUNUMU: Müşteri ürün sorduğunda veri alanlarını ham olarak okuma. Bir Mağaza Danışmanı gibi ürünü şık bir şekilde sun.

3. ONAY VEYA İSTEK YANITLARINDA KESİN EYLEM (DÖNGÜ YASAK):
   - Müşteri "isterim", "evet", "olur", "ilgilenirim", "alıyorum", "daha detaylı bilgi" gibi olumlu HERHANGİ bir yanıt verdiğinde:
   - ÜRÜN BİLGİSİNİ, FİYATINI VEYA "İSTER MİSİNİZ?" SORUSUNU ASLA TEKRARLAMA.
   - Doğrudan eyleme geç ve satın almaya yönlendir.
   - Örnek Yanıt: "Harika bir seçim! Ürünümüzü hemen sipariş vermek için yukarıdaki 'Sepetim' butonunu kullanabilir veya sepetinize ekleyerek alışverişe devam edebilirsiniz. Başka bir sorunuz var mıydı?"

4. KARGO TAKİBİ: Kargo durumu sorulursa kullanıcıyı sitemizdeki arayüze yönlendir: "Sipariş durumunuzu sitemizdeki 'Kargo Takip' butonuna tıklayarak kontrol edebilirsiniz." de.

5. SAHTE BİLGİ UYDURMA: Ürün fiyatı veya özellikleri hakkında sana verilen veri dışına çıkma.

6. ÜSLUP: Kibar, havalı, müşteri dostu ve 2-3 cümlelik akıcı yanıtlar ver.`;
            // 3. Düzeltilmiş Geçmiş (History) Yapılandırması
            const messages = [
                { role: "system", content: systemInstruction }
            ];

            if (history && Array.isArray(history)) {
                for (const msg of history) {
                    const textContent = msg.text || msg.message;
                    if (!textContent) continue;

                    const role = (msg.sender === 'user' || msg.role === 'user') ? 'user' : 'assistant';
                    
                    // İlk karşılama mesajını atla (varsa)
                    if (messages.length === 1 && role === 'assistant') {
                        continue;
                    }

                    // Aynı rolden üst üste mesaj eklenmesini engelle (Groq format zorunluluğu)
                    if (messages[messages.length - 1].role !== role) {
                        messages.push({
                            role: role,
                            content: textContent
                        });
                    }
                }
            }

            // Kullanıcının attığı son mesaj dizide yoksa ekle
            if (messages[messages.length - 1]?.role !== 'user') {
                messages.push({ role: "user", content: userLastMessage });
            }

            // Groq API İsteği (Llama 3.3 Modeli)
            const completion = await groq.chat.completions.create({
                messages: messages,
                model: "llama-3.3-70b-versatile",
                temperature: 0.4
            });

            const reply = completion.choices[0]?.message?.content;

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

    if (lowerMsg.includes("alc-") || lowerMsg.includes("kargo")) {
        fallbackReply = "Siparişinizin durumunu sitemizdeki 'Kargo Takip' butonuna tıklayarak bakabilirsiniz.";
    } else if (lowerMsg.includes("fiyat") || lowerMsg.includes("ürün") || lowerMsg.includes("kaç tl")) {
        fallbackReply = "Güncel ürün detaylarımız ve fiyat bilgimiz için sitemizi inceleyebilir veya müşteri hizmetlerimizle iletişime geçebilirsiniz.";
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
