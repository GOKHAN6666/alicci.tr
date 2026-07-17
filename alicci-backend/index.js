const express = require('express');
const cors = require('cors');
const Iyzipay = require('iyzipay');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Frontend'den gelen isteklere izin ver (CORS Ayarı)
app.use(cors({
    origin: '*', // Test aşamasında her yere izin veriyoruz, canlıya geçerken buraya sadece kendi site adresini yazabilirsin
    methods: ['GET', 'POST']
}));

app.use(express.json());

// Iyzico Bağlantı Ayarları
const iyzipay = new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    uri: 'https://sandbox-api.iyzipay.com' // Test (Sandbox) ortamı adresi. Canlıya geçerken değişir.
});

// Temel bir test rotası (Sunucu çalışıyor mu kontrol etmek için)
app.get('/', (req, res) => {
    res.send('ALICCI Backend Aktif ve Çalışıyor! 🚀');
});

// Ödeme Formu Başlatma Rotası (React buraya istek atacak)
app.post('/create-payment', (req, res) => {
    const { basketItems, totalPrice, buyerInfo } = req.body;

    // Ödeme formu başlatmak için Iyzico'nun istediği minimum veri yapısı
    const request = {
        locale: Iyzipay.LOCALE.TR,
        conversationId: '123456789', // Her işlem için benzersiz bir id üretebilirsin
        price: totalPrice.toString(),
        paidPrice: totalPrice.toString(),
        currency: Iyzipay.CURRENCY.TRY,
        basketId: 'B' + Date.now(),
        paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
        // Ödeme başarıyla tamamlandığında veya başarısız olduğunda yönlendirilecek sayfalar
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
        // Sepetteki ürünlerin listesi (Iyzico her ürün için detay ister)
        basketItems: basketItems.map((item, index) => ({
            id: item.id || `BI${index}`,
            name: item.title || item.name || 'ALICCI Ürün',
            category: 'E-Ticaret',
            itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
            price: item.price.toString()
        }))
    };

    // Iyzico üzerinden formu oluşturma isteği gönderiyoruz
    iyzipay.checkoutFormInitialize.create(request, (err, result) => {
        if (err || result.status === 'failure') {
            console.error('Iyzico Hatası:', err || result.errorMessage);
            return res.status(400).json({
                success: false,
                message: result.errorMessage || 'Ödeme formu oluşturulamadı.'
            });
        }

        // Başarılı ise Iyzico'nun verdiği HTML form kodunu frontend'e gönderiyoruz
        res.json({
            success: true,
            checkoutFormContent: result.checkoutFormContent, // İşte o meşhur form içeriği!
            token: result.token
        });
    });
});

// Ödeme Sonucu Callback Rotası (Iyzico ödeme bitince buraya yanıt döner)
app.post('/payment-callback', (req, res) => {
    const { token } = req.body;

    // Ödeme durumunu sorguluyoruz
    iyzipay.checkoutForm.retrieve({
        locale: Iyzipay.LOCALE.TR,
        conversationId: '123456789',
        token: token
    }, (err, result) => {
        if (err || result.paymentStatus !== 'SUCCESS') {
            // Ödeme başarısızsa kullanıcının göreceği sayfaya yönlendir
            return res.redirect('http://localhost:5173/payment-failed'); // Yerelde test ederken React portun neyse ona göre ayarla
        }

        // Ödeme başarılıysa siparişi tamamla ve başarılı sayfasına yönlendir
        res.redirect('http://localhost:5173/payment-success');
    });
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
