const express = require('express');
const cors = require('cors');
const Iyzipay = require('iyzipay');
const Groq = require("groq-sdk");
const crypto = require('crypto');
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

app.use(express.json());
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
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
);

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
// 2b. ÖDEME FORMU BAŞLATMA ROTASI (SHOPIER)
// ==========================================
// Shopier klasik entegrasyonu Iyzico gibi JSON API değil; tarayıcıyı
// gizli bir <form> ile doğrudan Shopier'ın ödeme sayfasına
// yönlendiriyor. Bu yüzden frontend buraya gerçek bir <form
// method="POST"> ile geliyor (fetch değil), biz de HTML döndürüyoruz.
function generateShopierSignature(randomNr, orderId, apiSecret) {
    return crypto
        .createHmac('sha256', apiSecret)
        .update(randomNr + orderId)
        .digest('base64');
}

app.post('/api/shopier-checkout', async (req, res) => {
    try {
        const API_KEY = process.env.SHOPIER_API_KEY || '';
        const API_SECRET = process.env.SHOPIER_API_SECRET || '';

        if (!API_KEY || !API_SECRET) {
            return res.status(500).send('Shopier API anahtarları tanımlı değil (.env dosyasını kontrol et).');
        }

        const {
            cartItems,      // JSON string olarak gelen sepet
            totalPrice,
            buyerName,
            buyerSurname,
            buyerEmail,
            buyerPhone,
            buyerAddress,
            buyerCity,
        } = req.body;

        const platformOrderId = 'ALC-' + Date.now();
        const randomNr = Math.floor(Math.random() * 999999).toString();
        const signature = generateShopierSignature(randomNr, platformOrderId, API_SECRET);
        const formattedPrice = parseFloat(totalPrice || 0).toFixed(2);

        // Siparişi Supabase'e "ödeme bekleniyor" durumuyla kaydet
        try {
            await supabase.from('orders').insert([{
                order_code: platformOrderId,
                items: cartItems,
                total: formattedPrice,
                buyer_name: `${buyerName || ''} ${buyerSurname || ''}`.trim(),
                buyer_email: buyerEmail || '',
                buyer_phone: buyerPhone || '',
                status: 'ödeme bekleniyor',
            }]);
        } catch (dbErr) {
            console.warn('Sipariş Supabase\'e kaydedilemedi:', dbErr.message);
        }

        const fields = {
            API_key: API_KEY,
            website_index: '1',
            platform_order_id: platformOrderId,
            product_name: `ALICCI Sipariş (${platformOrderId})`,
            product_type: '1', // 1 = fiziksel ürün
            buyer_name: buyerName || '',
            buyer_surname: buyerSurname || '',
            buyer_email: buyerEmail || '',
            buyer_account_age: '0',
            buyer_id_nr: '11111111111',
            buyer_phone: buyerPhone || '',
            billing_address: buyerAddress || '',
            billing_city: buyerCity || 'Istanbul',
            billing_country: 'Turkey',
            billing_postcode: '00000',
            shipping_address: buyerAddress || '',
            shipping_city: buyerCity || 'Istanbul',
            shipping_country: 'Turkey',
            shipping_postcode: '00000',
            total_order_value: formattedPrice,
            currency: '0', // 0 = TL
            platform: '0',
            is_in_frame: '0',
            current_language: '0', // 0 = TR
            modul_version: '1.0.0',
            random_nr: randomNr,
            signature: signature,
        };

        const inputsHtml = Object.entries(fields)
            .map(([key, value]) => `<input type="hidden" name="${key}" value="${String(value).replace(/"/g, '&quot;')}" />`)
            .join('\n');

        const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8" /><title>Ödemeye yönlendiriliyorsunuz...</title></head>
<body style="font-family: sans-serif; text-align:center; padding-top: 80px;">
    <p>Güvenli ödeme sayfasına yönlendiriliyorsunuz, lütfen bekleyin...</p>
    <form id="shopierForm" method="POST" action="https://www.shopier.com/ShowProduct/api_pay4.php">
        ${inputsHtml}
    </form>
    <script>document.getElementById('shopierForm').submit();</script>
</body>
</html>`;

        res.set('Content-Type', 'text/html');
        return res.send(html);
    } catch (error) {
        console.error('Shopier Checkout Hatası:', error);
        res.status(500).send('Ödeme başlatılırken bir hata oluştu.');
    }
});

// ==========================================
// 2c. SHOPIER SONUÇ BİLDİRİMİ (OSB - Otomatik Sipariş Bildirimi)
// ==========================================
// Bu URL'i Shopier panelinde Ayarlar > API Ayarları kısmındaki
// "Bildirim URL'si" alanına gireceksin, örn:
// https://alicci-backend-us.onrender.com/api/shopier-callback
app.post('/api/shopier-callback', async (req, res) => {
    try {
        const API_SECRET = process.env.SHOPIER_API_SECRET || '';
        const { status, platform_order_id, payment_id, installment, random_nr, signature } = req.body;

        // Gelen bildirimin gerçekten Shopier'dan geldiğini imza ile doğrula
        const expectedSignature = generateShopierSignature(random_nr || '', platform_order_id || '', API_SECRET);
        if (signature !== expectedSignature) {
            console.warn('Shopier callback: imza doğrulanamadı, istek yok sayıldı.');
            return res.status(400).send('invalid signature');
        }

        const newStatus = status === 'success' ? 'ödendi' : 'ödeme başarısız';

        await supabase
            .from('orders')
            .update({ status: newStatus, payment_id: payment_id || null, installment: installment || null })
            .eq('order_code', platform_order_id);

        return res.status(200).send('OK');
    } catch (error) {
        console.error('Shopier Callback Hatası:', error);
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
