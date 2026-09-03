const express = require('express');
const cors = require('cors');
const Iyzipay = require('iyzipay');
const Groq = require("groq-sdk");
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(cors({
    origin: ['https://alicci-tr.vercel.app', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
}));

// ÖNEMLİ: Shopier webhook imzası, gönderdiği isteğin HAM (raw) byte'ları
// üzerinden hesaplanıyor. Body'yi JSON.parse edip sonra tekrar
// JSON.stringify ile string'e çevirirsek (key sırası/boşluk/sayı formatı
// farklılaşabildiği için) imza asla eşleşmeyebilir. Bu yüzden 'verify'
// callback'i ile ham body'yi req.rawBody içinde saklıyoruz; webhook
// route'u imza kontrolünü bunun üzerinden yapacak.
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true })); // Shopier form POST + callback için gerekli

// Iyzico Bağlantı Ayarları
const iyzipay = new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY || '',
    secretKey: process.env.IYZICO_SECRET_KEY || '',
    uri: 'https://sandbox-api.iyzipay.com'
});

// Groq AI Başlatma
let groq = null;
if (process.env.GROQ_API_KEY) {
    try {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    } catch (e) {
        console.error("Groq Başlatma Hatası:", e);
    }
}

// Supabase Bağlantı Ayarları
// ÖNEMLİ: Burada SERVICE_ROLE key kullanıyoruz (anon key değil), çünkü
// artık orders tablosunda public UPDATE/DELETE policy'si yok — sadece
// backend'in (bu servisin) sipariş durumunu güncelleyebilmesi gerekiyor.
// SUPABASE_SERVICE_ROLE_KEY'i ASLA frontend'e veya GitHub'a koyma,
// sadece Render'ın Environment Variables kısmına ekle.
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getProductData() {
    try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
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

// ==========================================
// 1b. KARGO TAKİP ROTASI (RATE LIMIT'Lİ)
// ==========================================
// Direkt Supabase'e frontend'den sorgulamak yerine buradan geçiriyoruz,
// çünkü IP bazlı sınır (rate limit) sadece backend'de koyulabilir.
// Aynı IP 10 dakikada en fazla 8 deneme yapabilir — kod tahmin etmeye
// çalışan biri (brute-force) engellenmiş olur.
const trackOrderLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 dakika
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.' },
});

app.post('/api/track-order', trackOrderLimiter, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'Sipariş kodu gerekli.' });
        }

        // Basit format kontrolü: ALC-123456 gibi
        const cleanCode = code.trim().toUpperCase();
        if (!/^ALC-[A-Z0-9]{3,}$/.test(cleanCode)) {
            return res.status(400).json({ error: 'Geçersiz sipariş kodu formatı.' });
        }

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('order_code', cleanCode);

        if (error) {
            console.error('Sipariş sorgu hatası:', error);
            return res.status(500).json({ error: 'Sipariş sorgulanırken bir hata oluştu.' });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Sipariş bulunamadı. Lütfen kodu kontrol edin.' });
        }

        return res.json({ order: data[0] });
    } catch (error) {
        console.error('Kargo Takip Hatası:', error);
        return res.status(500).json({ error: 'Sipariş sorgulanırken bir hata oluştu.' });
    }
});

app.get('/', (req, res) => {
    res.send('ALICCI Backend Aktif ve Çalışıyor! 🚀');
});

// ==========================================
// 1. ALICCI AI CHATBOT ENDPOINT
// ==========================================
app.post('/api/chat', async (req, res) => {
    let userLastMessage = "";

    try {
        const { history, message } = req.body;
        
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
            const product = await getProductData();

            let productDetailsText = "Şu an sistemde aktif ürün bilgisi bulunamadı.";
            if (product) {
                const shortDescription = (product.description || "")
                    .toString()
                    .slice(0, 220)
                    .trim();
                productDetailsText = `
- Ürün Adı: ${product.name}
- Fiyatı: ${product.price} TL
- Açıklama (özet, bunu birebir kopyalama): ${shortDescription}${(product.description || "").length > 220 ? "..." : ""}
- Stok Durumu: ${product.stock > 0 ? `${product.stock} adet stokta var` : 'Stok tükendi'}
                `;
            }

       const systemInstruction = `GÖREV: ALICCI markasının nazik, profesyonel ve müşteri odaklı e-ticaret asistanısın.

GÜNCEL ÜRÜN BİLGİLERİ:
${productDetailsText}

RESMİ İADE VE DEĞİŞİM KOŞULLARI (KESİNLİKLE BU BİLGİLERİ KULLAN):
- İade/Değişim Süresi: Ürün teslim alındıktan sonra 14 gündür.
- İletişim Kanalı: İade veya değişim talepleri alicci.tr@gmail.com adresi üzerinden alınır.
- Şartlar: Ürünün kullanılmamış, etiketli ve orijinal ambalajında olması zorunludur.

KESİN KURAL VE YASAKLAR:
1. SADECE Türkçe yanıt ver.
2. Soru sorma ve soru işareti (?) kullanma.
3. Müşteri sadece selam verdiğinde ürün veya iade anlatma. Sadece kibarca karşıla.
4. Müşteri kargo takip kodu yazdığında örn."alc-123456" ona bu kodu yukarıdaki kargo takip menüsüne girmesi gerektiğini söyle.
5. Müşteri genel kültür, tarih, günlük sohbet veya e-ticaret dışı bir soru sorduğunda sorusunu cevapsız bırakma; kısa ve doğru yanıt verdikten sonra konuyu mağazaya bağla.
6. Aynı bilgiyi, cümleyi veya açıklamayı yanıt içinde ASLA iki kez tekrar etme. Ürün açıklamasını olduğu gibi kopyalayıp yapıştırma; kendi cümlelerinle EN FAZLA 2-3 cümlede özetle.
7. Yanıtların kısa ve öz olsun, gereksiz uzatma.

MÜŞTERİ YÖNLENDİRME AKIŞI:

1. AŞAMA - SELAMLAŞMA ("selam", "merhaba", "slm"):
   - "Merhaba! ALICCI'ye hoş geldiniz. Size nasıl yardımcı olabilirim."

2. AŞAMA - İADE VE DEĞİŞİM SORULARI ("iade", "değişim", "iade koşulları"):
   - Yukarıdaki RESMİ İADE VE DEĞİŞİM KOŞULLARI bilgilerini net bir şekilde aktar.
   - Örnek: "ALICCI üzerinden satın aldığınız ürünleri teslim aldıktan sonra 14 gün içinde iade edebilirsiniz. İade talebinizi alicci.tr@gmail.com adresimiz üzerinden iletebilirsiniz. Ürünün ambalajında ve kullanılmamış olması gerekmektedir."

3. AŞAMA - ÜRÜN VEYA SATIN ALMA İSTEĞİ:
   - Öne çıkan ürünü, fiyatını ve stok bilgisini özetle.

4. AŞAMA - DETAY VEYA ALMA ONAYI:
   - Ürünü kendi cümlelerinle KISA (2-3 cümle) anlat, veritabanındaki açıklamayı birebir/uzun şekilde kopyalama. Sonrasında sepete yönlendir.

5. AŞAMA - GENEL BİLGİ VE SİTE DIŞI SORULAR (örneğin "İstanbul'u kim aldı"):
   - Sorulan genel soruyu doğrudan, doğru ve kısa bir şekilde yanıtla. Yanıtın sonuna soru işareti kullanmadan mağaza yardımına hazır olduğunu ekle.
   - Örnek yanıt: "İstanbul 1453 yılında Fatih Sultan Mehmet tarafından fethedilmiştir. ALICCI siparişleriniz veya ürünlerimiz hakkında bilgi almak isterseniz yardımcı olmaya hazırım."`;
            const messages = [
                { role: "system", content: systemInstruction }
            ];

            if (history && Array.isArray(history)) {
                for (const msg of history) {
                    const textContent = msg.text || msg.message;
                    if (!textContent) continue;

                    const role = (msg.sender === 'user' || msg.role === 'user') ? 'user' : 'assistant';
                    
                    if (messages.length === 1 && role === 'assistant') {
                        continue;
                    }

                    if (messages[messages.length - 1].role !== role) {
                        messages.push({
                            role: role,
                            content: textContent
                        });
                    }
                }
            }

            if (messages[messages.length - 1]?.role !== 'user') {
                messages.push({ role: "user", content: userLastMessage });
            }

            const completion = await groq.chat.completions.create({
                messages: messages,
                model: "openai/gpt-oss-120b", // <-- HATA VEREN KISIM BURADA GÜNCELLENDİ
                temperature: 0.1
            });

            let reply = completion.choices[0]?.message?.content;

            if (reply) {
                // 1. Çince ve yabancı karakter temizliği
                reply = reply.replace(/[\u4e00-\u9fa5]/g, "");

                // 2. Marka adını KESİN BÜYÜK HARFE zorlama
                reply = reply.replace(/alicci/gi, "ALICCI");

                // 3. Boşluk düzenleme
                reply = reply.replace(/\s+/g, " ").trim();

                // 4. Tekrar eden cümleleri temizle (model aynı bilgiyi iki kez yazarsa)
                const sentences = reply.split(/(?<=[.!])\s+/);
                const seen = new Set();
                const deduped = [];
                for (const sentence of sentences) {
                    const key = sentence.toLowerCase().replace(/[^a-zçğıöşü0-9]/gi, "").trim();
                    if (key.length > 15 && seen.has(key)) continue;
                    if (key.length > 15) seen.add(key);
                    deduped.push(sentence);
                }
                reply = deduped.join(" ").trim();

                return res.json({ reply });
            }
        }

    } catch (error) {
        console.warn("AI Servis Hatası:", error.message);
    }

    // YEDEK MOTOR (Fallback)
    const lowerMsg = userLastMessage.toLowerCase();
    let fallbackReply = "Şu anda canlı destek yoğunluğumuz bulunuyor. Sorularınız için alicci.tr@gmail.com e-posta gönderebilirsiniz.";

    if (lowerMsg.includes("alc-") || lowerMsg.includes("kargo")) {
        fallbackReply = "Siparişinizin durumunu sitemizdeki 'Kargo Takip' butonuna tıklayarak bakabilirsiniz.";
    } else if (lowerMsg.includes("fiyat") || lowerMsg.includes("ürün") || lowerMsg.includes("kaç tl") || lowerMsg.includes("bilgi") || lowerMsg.includes("isterim") || lowerMsg.includes("ilgilenirim")) {
        fallbackReply = "Öne çıkan ALICCI ürünümüz %100 pamuklu olup 150 TL'dir. Bedeninizi seçip sepetinize ekleyebilirsiniz.";
    } else if (lowerMsg.includes("iade") || lowerMsg.includes("değişim")) {
        fallbackReply = "İade ve değişim işlemlerinizi 14 gün içinde alicci.tr@gmail.com üzerinden iletişime geçerek başlatabilirsiniz.";
    } else if (lowerMsg.includes("merhaba") || lowerMsg.includes("selam") || lowerMsg.includes("slm")) {
        fallbackReply = "Merhaba! ALICCI Müşteri Hizmetleri'ne hoş geldiniz. Size nasıl yardımcı olabilirim?";
    }

    return res.json({ reply: fallbackReply });
});

// ==========================================
// 2b. ÖDEME BAŞLATMA ROTASI (SHOPIER — GERÇEK REST API v1)
// ==========================================
// Shopier'ın yeni REST API'si: sepet tutarı kadar bir "ürün"
// oluşturuyoruz, Shopier bize o ürünün ödeme linkini (url) dönüyor,
// müşteriyi oraya yönlendiriyoruz. Kimlik doğrulama: Bearer token (PAT).
app.post('/api/shopier-checkout', async (req, res) => {
    try {
        const SHOPIER_PAT = process.env.SHOPIER_PAT || '';
        if (!SHOPIER_PAT) {
            return res.status(500).json({ error: 'SHOPIER_PAT tanımlı değil (.env dosyasını kontrol et).' });
        }

        const { cartItems, totalPrice } = req.body;

        let parsedItems = [];
        try {
            parsedItems = typeof cartItems === 'string' ? JSON.parse(cartItems) : (cartItems || []);
        } catch (e) {
            parsedItems = [];
        }

        const formattedPrice = parseFloat(totalPrice || 0).toFixed(2);

        // Kendi takip kodumuzu Shopier'a gitmeden ÖNCE üretiyoruz ve ürün
        // başlığına/açıklamasına gömüyoruz. Böylece müşteri, Shopier'ın kendi
        // ödeme sayfasında/onay e-postasında bu kodu görecek ve "Kargo Takip"
        // özelliğimizde kullanabilecek.
        const ourOrderCode = 'ALC-' + Math.floor(100000 + Math.random() * 900000);
        const orderTitle = `ALICCI Sipariş — Kod: ${ourOrderCode}`;
        const orderDescription = `Sipariş Takip Kodunuz: ${ourOrderCode}\nBu kodu "Kargo Takip" bölümüne girerek sipariş durumunuzu sorgulayabilirsiniz.\n\nÜrünler: ${parsedItems.map(i => `${i.name} (${i.size || 'Standart'}) x${i.quantity || 1}`).join(', ')}`;

        // Ürün görseli zorunlu (media alanı required) — sepetteki ilk ürünün
        // görselini kullan (image alanı dizi olabilir), yoksa genel bir marka
        // görseline düş.
        const fallbackImage = 'https://alicci-tr.vercel.app/favicon.png';
        let productImage = fallbackImage;
        if (parsedItems[0] && parsedItems[0].image) {
            productImage = Array.isArray(parsedItems[0].image)
                ? (parsedItems[0].image[0] || fallbackImage)
                : parsedItems[0].image;
        }

        const shopierResponse = await fetch('https://api.shopier.com/v1/products', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SHOPIER_PAT}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: orderTitle,
                description: orderDescription,
                type: 'physical',
                media: [
                    { type: 'image', url: productImage, placement: 1 }
                ],
                priceData: {
                    currency: 'TRY',
                    price: formattedPrice,
                },
                shippingPayer: 'buyerPays', // İstersen 'sellerPays' yap
                customListing: true,
            }),
        });

        const shopierData = await shopierResponse.json();

        if (!shopierResponse.ok) {
            console.error('Shopier ürün oluşturma hatası:', shopierData);
            return res.status(400).json({ error: 'Ödeme başlatılamadı.', details: shopierData });
        }

        // Siparişi Supabase'e KENDİ kodumuzla kaydet (Shopier'ın id'sini de
        // ayrıca sakla, webhook geldiğinde eşleştirmek için işe yarayabilir).
        try {
            await supabase.from('orders').insert([{
                order_code: ourOrderCode,
                shopier_product_id: shopierData.id || null,
                items: JSON.stringify(parsedItems),
                total: formattedPrice,
                status: 'ödeme bekleniyor',
            }]);
        } catch (dbErr) {
            console.warn("Sipariş Supabase'e kaydedilemedi:", dbErr.message);
        }

        // Frontend bu URL'e yönlendirecek (window.location.href = redirectUrl)
        return res.json({ redirectUrl: shopierData.url, orderCode: ourOrderCode });
    } catch (error) {
        console.error('Shopier Checkout Hatası:', error);
        return res.status(500).json({ error: 'Ödeme başlatılırken bir hata oluştu.' });
    }
});

// ==========================================
// 2c. SHOPIER WEBHOOK — ÖDEME TAMAMLANDI BİLDİRİMİ
// ==========================================
// Shopier'ın resmi Node.js webhook örneğine göre:
// - İmza 'shopier-signature' header'ında geliyor
// - İmza = HMAC-SHA256(webhook token, JSON.stringify(body)) hex
// - Event tipi 'shopier-event' header'ında geliyor (body'de değil)
app.post('/api/shopier-webhook', async (req, res) => {
    try {
        const WEBHOOK_TOKEN = process.env.SHOPIER_WEBHOOK_TOKEN || '';
        const data = req.body;
        const shopierSignature = req.headers['shopier-signature'];
        const shopierEvent = req.headers['shopier-event'];

        if (!WEBHOOK_TOKEN) {
            console.error('SHOPIER_WEBHOOK_TOKEN tanımlı değil.');
            return res.status(500).send('webhook token missing');
        }

        if (!req.rawBody) {
            console.error('Shopier webhook: ham (raw) body bulunamadı, imza doğrulanamaz.');
            return res.status(400).send('raw body missing');
        }

        const expectedHash = crypto
            .createHmac('sha256', WEBHOOK_TOKEN)
            .update(req.rawBody)
            .digest('hex');

        if (expectedHash !== shopierSignature) {
            console.warn('Shopier webhook: imza doğrulanamadı, istek reddedildi.', {
                expectedHash,
                gelenImza: shopierSignature,
            });
            return res.status(401).send('invalid request');
        }

        console.log(`Shopier webhook doğrulandı — event: ${shopierEvent}`, JSON.stringify(data));

        if (shopierEvent === 'order.created' && data.paymentStatus === 'paid') {
            const shopierOrderId = data.id;

            // Order modelinde ürün referansı lineItems[].productId altında geliyor.
            const productRef = Array.isArray(data.lineItems) && data.lineItems[0]
                ? data.lineItems[0].productId
                : null;

            const shipping = data.shippingInfo || {};
            const buyerName = `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim();

            if (productRef) {
                const { data: updated, error: updateError } = await supabase
                    .from('orders')
                    .update({
                        status: 'ödendi',
                        shopier_order_id: shopierOrderId,
                        buyer_name: buyerName || null,
                        buyer_email: shipping.email || null,
                        buyer_phone: shipping.phone || null,
                    })
                    .eq('shopier_product_id', productRef)
                    .select();

                if (updateError) {
                    console.error('Sipariş güncellenemedi:', updateError);
                } else if (!updated || updated.length === 0) {
                    console.warn(`Webhook: shopier_product_id=${productRef} ile eşleşen sipariş bulunamadı.`);
                }
            } else {
                console.warn('Webhook: lineItems içinde productId bulunamadı. Payload:', JSON.stringify(data));
            }
        }

        return res.status(200).send('success');
    } catch (error) {
        console.error('Shopier Webhook Hatası:', error);
        return res.status(500).send('error');
    }
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

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
