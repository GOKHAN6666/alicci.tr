import React, { useState, useRef, useEffect } from "react";
import emailjs from "emailjs-com"; // EmailJS'i dahil ettiğinizden emin olun
import "./index.css"; // Ana stil dosyanızın yolu
import AdminPanel from "./AdminPanel"; // AdminPanel bileşenini import et
import { supabase } from "./supabaseClient"; // Supabase client'ı import et

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Sipariş sonrası başarı modalı
  // Sipariş geçmişini kontrol etmek için yerel depolamayı kullan (opsiyonel)
  const [hasOrdered, setHasOrdered] = useState(() => localStorage.getItem("hasOrdered") === "true");

  // Supabase'den çekilecek ürünler için state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true); // Ürünler yükleniyor mu?
  const [productsError, setProductsError] = useState(null); // Ürün yükleme hatası

  // Kargo takip sistemi için state'ler
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingEmail, setTrackingEmail] = useState("");
  const [trackingOrderId, setTrackingOrderId] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState("");
  const [loadingTracking, setLoadingTracking] = useState(false); // Kargo takip bilgisi yükleniyor mu?

  // Admin Panel için yeni state'ler
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loggedInAsAdmin, setLoggedInAsAdmin] = useState(false);

  // Ref'ler (bölümlere kaydırma ve form elemanları için)
  const aboutRef = useRef(null);
  const contactRef = useRef(null);
  const productsRef = useRef(null);
  const customerNameRef = useRef(null); // Ödeme formundaki müşteri adı ref'i
  const customerEmailRef = useRef(null); // Ödeme formundaki müşteri e-posta ref'i
  const customerAddressRef = useRef(null); // Ödeme formundaki müşteri adres ref'i
  const customerPhoneRef = useRef(null); // Ödeme formundaki müşteri telefon ref'i

  // Admin şifresi (gerçek bir projede .env'den gelmeli veya daha güvenli yönetilmeli)
  // .env dosyanızda VITE_ADMIN_PASSWORD="sizin_admin_sifreniz" şeklinde tanımlı olmalı
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "alicci123"; // Varsayılanı daha güvenli yapın veya .env kullanın

  // Sepet öğelerini localStorage'dan yükle (uygulama ilk yüklendiğinde)
  const [cartItems, setCartItems] = useState(() => {
    try {
      const storedCartItems = localStorage.getItem('cartItems');
      return storedCartItems ? JSON.parse(storedCartItems) : [];
    } catch (error) {
      console.error("Sepet öğeleri localStorage'dan yüklenirken hata oluştu:", error);
      return [];
    }
  });

  // Sepet öğeleri değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  // Supabase'den ürünleri çekme fonksiyonu
  useEffect(() => {
    const fetchProductsData = async () => {
      setLoadingProducts(true);
      setProductsError(null);
      // 'products' tablosundan tüm veriyi seç
      const { data, error } = await supabase.from("products").select("*");
      if (error) {
        console.error("Ürün çekme hatası:", error);
        setProductsError("Ürünler yüklenirken bir hata oluştu.");
      } else {
        setProducts(data);
      }
      setLoadingProducts(false);
    };
    fetchProductsData();
  }, []); // [] ile sadece bileşen yüklendiğinde bir kez çalışır


  // Kargo firmalarına özel link oluşturma fonksiyonu
  const getCargoTrackingLink = (firmName, trackingCode) => {
    switch (firmName.toLowerCase()) {
      case "aras kargo":
        return `https://www.araskargo.com.tr/tr/online-servisler/gonderi-takip?kod=${trackingCode}`;
      case "yurtiçi kargo":
        return `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${trackingCode}`;
      case "mng kargo":
        return `https://www.mngkargo.com.tr/gonderi-takip?kargotakipno=${trackingCode}`;
      default:
        return "#"; // Bilinmeyen firma için boş link
    }
  };

  // Kargo takip sorgulama (Supabase'den çekecek şekilde güncellendi)
  const handleTrackingSearch = async () => {
    setTrackingResult(null);
    setTrackingError("");
    setLoadingTracking(true);

    try {
      // 'KARGO' tablosu adı büyük harfle kullanıldı (Supabase'deki gibi)
      const { data, error } = await supabase
        .from("KARGO")
        .select("*")
        .eq("email", trackingEmail) // E-posta ile filtrele
        .eq("order_id", trackingOrderId) // Sipariş ID'si ile filtrele
        .single(); // Sadece tek bir sonuç bekliyoruz

      if (error && error.code === 'PGRST116') { // PGRST116: "no rows in result" (Supabase'den veri bulunamadı)
        setTrackingError("Bu takip koduyla ilgili kayıt bulunamadı. E-posta ve sipariş numarasını kontrol ediniz.");
      } else if (error) {
        console.error("Kargo sorgulama hatası:", error);
        setTrackingError("Kargo bilgisi alınırken bir hata oluştu: " + error.message);
      } else {
        // Eğer data varsa, takip linkini oluştur
        if (data) {
          data.takipLinki = getCargoTrackingLink(data.cargo_company, data.tracking_code);
          setTrackingResult(data);
        } else {
          // Bu kısma normalde düşmemeli, çünkü PGRST116 hatası yukarıda yakalanıyor.
          setTrackingError("Kargo bilgisi bulunamadı. E-posta ve sipariş numarasını kontrol ediniz.");
        }
      }
    } catch (err) {
      console.error("Kargo takibi sırasında beklenmeyen bir hata oluştu:", err);
      setTrackingError("Kargo takibi sırasında beklenmeyen bir hata oluştu.");
    } finally {
      setLoadingTracking(false); // Yükleme durumunu kapat
    }
  };

  // Bölüme kaydırma fonksiyonu
  const scrollToSection = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
      setMenuOpen(false); // Menüyü kapat
    }
  };

  // Admin Giriş İşlemi
  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setLoggedInAsAdmin(true); // Admin olarak giriş yapıldı
      setShowAdminLogin(false); // Giriş modalını kapat
      setAdminPassword(""); // Şifreyi temizle
    } else {
      alert("Hatalı şifre!");
      setAdminPassword(""); // Şifreyi temizle
    }
  };

  // Sepete ürün ekleme fonksiyonu
  const handleAddToCart = () => {
    if (selectedProduct && selectedSize) {
      const existingItemIndex = cartItems.findIndex(
        (item) => item.id === selectedProduct.id && item.size === selectedSize
      );

      if (existingItemIndex > -1) {
        // Eğer ürün zaten sepetteyse miktarını artır
        const updatedCartItems = [...cartItems];
        updatedCartItems[existingItemIndex].quantity += 1;
        setCartItems(updatedCartItems);
      } else {
        // Ürün sepette yoksa yeni olarak ekle
        setCartItems([
          ...cartItems,
          {
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            image: selectedProduct.image,
            size: selectedSize,
            quantity: 1,
          },
        ]);
      }
      setSelectedProduct(null); // Seçili ürünü sıfırla
      setSelectedSize(null); // Seçili bedeni sıfırla
      setIsCartOpen(true); // Sepete eklendikten sonra sepeti aç
    } else {
      alert('Lütfen bir ürün ve beden seçin.');
    }
  };

  // Sepetten ürün çıkarma
  const handleRemoveFromCart = (itemToRemove) => {
    setCartItems(cartItems.filter(item => !(item.id === itemToRemove.id && item.size === itemToRemove.size)));
  };

  // Sepet miktarını güncelleme
  const handleUpdateQuantity = (itemToUpdate, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveFromCart(itemToUpdate); // Miktar 0 veya altına düşerse ürünü kaldır
      return;
    }
    setCartItems(
      cartItems.map((item) =>
        item.id === itemToUpdate.id && item.size === itemToUpdate.size
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  // Sepet toplamını hesaplama
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
  };

  // Benzersiz sipariş ID'si oluşturma (kargo takibi için)
  const generateUniqueOrderId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000); // Daha fazla rastgelelik
    return `ALC-${timestamp}-${random}`; // Kendi formatınızı kullanın
  };

  // Sipariş verme işlemi (Supabase'e kaydedecek)
const handlePlaceOrder = async () => {
  // Ref'lerden müşteri bilgilerini al
  const customerName = customerNameRef.current.value;
  const customerEmail = customerEmailRef.current.value;
  const customerAddress = customerAddressRef.current.value;
  const customerPhone = customerPhoneRef.current.value;

  if (cartItems.length === 0) {
    alert('Sepetiniz boş. Lütfen ürün ekleyin.');
    return;
  }
  if (!customerName || !customerEmail || !customerAddress || !customerPhone) {
    alert('Lütfen tüm müşteri bilgilerini doldurun.');
    return;
  }

  const orderId = generateUniqueOrderId(); // Benzersiz sipariş ID'si oluştur

  try {
    const { data: orderData, error: orderError } = await supabase
      .from('order')
      .insert([
        {
          order_id: orderId, // Kendi oluşturduğumuz sipariş ID'si
          customer_name: customerName,
          customer_email: customerEmail,
          customer_address: customerAddress,
          customer_phone: customerPhone,
          order_items: cartItems, // Sepet içeriğini JSON olarak sakla
          total_price: parseFloat(calculateTotal()), // calculateTotal() string döndürüyor, number'a çeviriyoruz
          order_status: 'pending' // Varsayılan durum (küçük harfle 'pending' kullanmak daha yaygındır)
        }
      ])
      .select('*'); // <-- BURAYI EKLEDİK! Eklenen veriyi geri döndürmesini sağlarız.

    if (orderError) {
      console.error('Sipariş verilirken hata oluştu:', orderError.message);
      alert('Sipariş verilirken hata oluştu: ' + orderError.message);
      return;
    }

    console.log('Sipariş başarıyla verildi:', orderData);
    alert('Siparişiniz başarıyla alındı!');
    // Sipariş başarıyla verildikten sonra yapılacak işlemler:
    clearCart(); // Sepeti temizle
    // İsterseniz başka bir sayfaya yönlendirebilirsiniz
    // navigate('/order-success', { state: { orderId: orderId } });
  } catch (err) {
    console.error('Beklenmedik bir hata oluştu:', err);
    alert('Beklenmedik bir hata oluştu: ' + err.message);
  }
};

    const orderId = generateUniqueOrderId(); // Benzersiz sipariş ID'si oluştur

    try {
      const { data: orderData, error: orderError } = await supabase.from('order').insert([
        {
          order_id: orderId, // Kendi oluşturduğumuz sipariş ID'si
          customer_name: customerName,
          customer_email: customerEmail,
          customer_address: customerAddress,
          customer_phone: customerPhone,
          order_items: cartItems, // Sepet içeriğini JSON olarak sakla
          total_price: parseFloat(calculateTotal()),
          order_status: 'Pending', // Varsayılan durum
        },
      ]).select(); // Eklenen veriyi geri almak için select() kullan

      if (orderError) {
        console.error('Sipariş verilirken hata oluştu:', orderError);
        alert('Sipariş verilirken bir hata oluştu: ' + orderError.message);
      } else {
        // İyzipay'e yönlendirme öncesi sipariş bilgilerini kaydet
        localStorage.setItem("orderInfo", JSON.stringify({
          name: customerName,
          email: customerEmail,
          items: cartItems.map((item) => `${item.name} (${item.size}) x${item.quantity}`).join(", "),
          total: calculateTotal(),
          custom_order_id: orderId,
        }));
        localStorage.setItem("hasOrdered", "true");
        localStorage.setItem("emailSent", "false"); // EmailJS için bayrak

        // Sepeti temizle
        setCartItems([]);
        localStorage.removeItem('cartItems');

        // Ödeme modalını göster ve İyzipay'e yönlendir (simülasyon)
        setShowPaymentModal(true);
        // Gerçek bir senaryoda burada iyzipay ödeme akışı başlatılır
        // Örn: window.location.href = "https://sandbox-merchant.iyzipay.com/checkoutform/initialize/sample";

        // Kargo takibi için de otomatik bir giriş oluştur
        // Bu giriş, yönetici tarafından daha sonra güncellenecektir.
        const { error: cargoError } = await supabase.from('KARGO').insert({
          order_id: orderId,
          email: customerEmail,
          cargo_company: 'Beklemede', // Yönetici tarafından güncellenecek
          tracking_code: 'Beklemede', // Yönetici tarafından güncellenecek
          status: 'Sipariş Alındı', // Başlangıç durumu
        });

        if (cargoError) {
          console.error('Kargo bilgisi eklenirken hata oluştu (otomatik):', cargoError);
          // Kullanıcıya bu hatayı göstermek yerine loglamak daha iyi olabilir.
        }
      }
    } catch (err) {
      console.error('Sipariş işlemi sırasında beklenmeyen bir hata oluştu:', err);
      alert('Sipariş verilirken beklenmeyen bir hata oluştu.');
    }
  };

  // İade formu gönderme (emailjs ile)
const sendReturnEmail = (e) => {
  e.preventDefault();

  // EmailJS servis, şablon ve kullanıcı ID'lerini ortam değişkenlerinden al
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  // Hata ayıklama için konsola yazdırın
  console.log("EmailJS Service ID from env:", serviceId);
  console.log("EmailJS Template ID from env:", templateId);
  console.log("EmailJS Public Key from env:", publicKey);

  // Eğer herhangi bir değişken eksikse hata fırlat.
  if (!serviceId || !templateId || !publicKey) {
    console.error("EmailJS environment variables are missing.");
    alert("E-posta gönderme için gerekli bilgiler eksik. Lütfen daha sonra tekrar deneyin.");
    return; // Fonksiyonu durdur
  }

  emailjs
    .sendForm(
      serviceId, // Ortam değişkeninden alındı
      templateId, // Ortam değişkeninden alındı
      e.target,
      publicKey // Ortam değişkeninden alındı
    )
    .then(
      (result) => {
        console.log(result.text);
        alert("İade talebiniz başarıyla gönderildi!");
        setShowReturnForm(false); // Formu kapat
      },
      (error) => {
        console.error("İade talebi gönderilirken hata oluştu:", error);
        alert("İade talebi gönderilirken bir hata oluştu.");
      }
    );
};
  // Modallar açıldığında body'nin kaymasını engelle
  useEffect(() => {
    const anyModalOpen =
      selectedProduct ||
      isCartOpen ||
      showPaymentModal ||
      showReturnForm ||
      showSuccessModal ||
      showTrackingModal ||
      showAdminLogin;

    if (anyModalOpen) {
      document.body.style.overflow = "hidden"; // Kaydırmayı kapat
    } else {
      document.body.style.overflow = "unset"; // Kaydırmayı aç
    }

    // Bileşen ayrıldığında veya bağımlılıklar değiştiğinde temizleme
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedProduct, isCartOpen, showPaymentModal, showReturnForm, showSuccessModal, showTrackingModal, showAdminLogin]);

  // Sayfa yüklendiğinde ve iyzipay'den geri dönüldüğünde EmailJS ile sipariş e-postası gönderimi
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const isSuccess = query.get("odeme") === "basarili"; // URL'deki parametreyi kontrol et
    const emailSentFlag = localStorage.getItem("emailSent"); // Bayrak kontrolü

    if (isSuccess && emailSentFlag !== "true") {
      const orderInfo = JSON.parse(localStorage.getItem("orderInfo"));
      if (orderInfo) {
        // İyzipay'den geri döndüğümüzde e-postayı gönder
        emailjs
          .send("service_iyppib9", "template_ftuypl8", orderInfo, "5dI_FI0HT2oHrlQj5") // Sizin EmailJS şablonunuzu kullanın
          .then(() => {
            console.log("Sipariş e-postası başarıyla gönderildi!");
            localStorage.setItem("emailSent", "true"); // E-postanın gönderildiğini işaretle
            setShowSuccessModal(true); // Başarı modalını göster
            localStorage.removeItem("orderInfo"); // Sipariş bilgisini temizle
          })
          .catch((error) => {
            console.error("Sipariş e-postası gönderilirken hata oluştu:", error);
          });
      }
      // URL'deki parametreyi temizle (sayfa yenilenince tekrar tetiklenmemesi için)
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []); // Sadece bir kez çalışır


  // Eğer admin olarak giriş yapılmışsa AdminPanel'i göster
  if (loggedInAsAdmin) {
    return <AdminPanel />;
  }

  // Normal uygulama arayüzü
  return (
    <>
      {/* Sadece geliştirme ortamında ve admin girişi yapılmamışsa Admin giriş butonu */}
      {import.meta.env.DEV && !loggedInAsAdmin && (
        <button
          onClick={() => setShowAdminLogin(true)}
          style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            zIndex: 1001,
            padding: '8px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Admin Girişi
        </button>
      )}

      {/* Navbar */}
      <nav>
        <h1>ALICCI</h1>
        <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </div>
        <ul className={menuOpen ? 'open' : ''}>
          <li onClick={() => scrollToSection(productsRef)}>Koleksiyon</li>
          <li onClick={() => scrollToSection(aboutRef)}>Hakkımızda</li>
          <li onClick={() => scrollToSection(contactRef)}>İletişim</li>
          {hasOrdered && <li onClick={() => { setShowReturnForm(true); setMenuOpen(false); }}>İade Talebi</li>}
          <li onClick={() => { setShowTrackingModal(true); setMenuOpen(false); }}>Kargo Takibi</li>
        </ul>
        {/* Sepet işareti artık menü dışında, h1 ile birlikte sağa hizalı duracak */}
        <div className="cart-button-wrapper">
            <div className="cart-button" onClick={() => { setIsCartOpen(true); setMenuOpen(false); }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" stroke="#111" strokeWidth="1.5" fill="none">
                <path d="M3 3h2l.4 2M7 13h13l-1.5 7H6L5 6H3" />
                <circle cx="9" cy="21" r="1" />
                <circle cx="18" cy="21" r="1" />
              </svg>
              {cartItems.length > 0 && <div className="cart-count">{cartItems.length}</div>}
            </div>
        </div>
      </nav>

      {/* Admin Giriş Modalı */}
      {showAdminLogin && (
        <div className="modal-backdrop" onClick={() => setShowAdminLogin(false)}>
          <div className="modal-content-base tracking-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowAdminLogin(false)}>×</button>
            <h2>Admin Girişi</h2>
            <input
              type="password"
              placeholder="Şifre"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAdminLogin();
                }
              }}
              required
            />
            <button onClick={handleAdminLogin}>Giriş Yap</button>
          </div>
        </div>
      )}


      {/* Hero Section */}
      <section className="hero">
        <h2>Sessiz Lüksün Yeni Tanımı</h2>
        <p>Sadelik, zarafet ve kalite. ALICCI, görünmeyeni giyenler için.</p>
        <button onClick={() => scrollToSection(productsRef)}>Koleksiyonu Keşfet</button>
      </section>

      {/* Products Section (Şimdi Supabase'den ürünleri çekecek) */}
      <section className="products" ref={productsRef}>
        <h3>Yeni Sezon</h3>
        <div className="products-grid">
          {loadingProducts ? (
            <p>Ürünler yükleniyor...</p>
          ) : productsError ? (
            <p className="error-message">{productsError}</p>
          ) : products.length === 0 ? (
            <p>Gösterilecek ürün bulunmamaktadır.</p>
          ) : (
            products.map((item) => (
              <div key={item.id} className="product-card">
                <img
                  src={item.image} // Supabase'deki sütun adı 'image'
                  alt={item.name}
                  className="product-card-image"
                  onClick={() => {
                    setSelectedProduct(item);
                    setSelectedSize(null);
                  }}
                />
                <div className="info">
                  <h4>{item.name}</h4>
                  <p>₺{item.price}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="about" ref={aboutRef}>
        <h3>Hakkımızda</h3>
        <p>ALICCI, sadeliği ve zarafeti benimseyen erkekler için kuruldu. Sessiz lüks; gösterişten uzak, detayda gizli bir zenginliktir.</p>
        <p>Koleksiyonlarımız, yüksek kalite kumaşlar ve özenli işçilikle hazırlanır.</p>
      </section>

      {/* Contact Section */}
      <section className="contact" ref={contactRef}>
        <h3>İletişim</h3>
        <form action="https://formspree.io/f/xeogwvzd" method="POST">
          <input type="text" name="name" placeholder="Adınız" required />
          <input type="email" name="email" placeholder="E-posta" required />
          <textarea name="message" placeholder="Mesajınız" required></textarea>
          <button type="submit">Gönder</button>
        </form>
      </section>

      {/* Footer */}
      <footer>
        © 2025 ALICCI • Tüm hakları saklıdır.
        <div className="instagram">
          <a href="https://instagram.com/alicci.official" target="_blank" rel="noopener noreferrer">
            Instagram / @alicci.official
          </a>
        </div>
      </footer>

      {/* Sepet Paneli (Modal) */}
      {isCartOpen && (
        <div className="modal-backdrop" onClick={() => setIsCartOpen(false)}> {/* Sepet modalı için backdrop */}
          <div className={`cart-panel ${isCartOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setIsCartOpen(false)}>×</button> {/* Sepet modalı için 'x' işareti */}
            <h3>Sepetiniz</h3>
            {cartItems.length === 0 ? (
              <p>Sepetiniz boş.</p>
            ) : (
              <>
                <ul>
                  {cartItems.map((item, index) => (
                    <li key={`${item.id}-${item.size}-${index}`}>
                      <div className="item-details">
                        <span>{item.name} – ₺{item.price.toFixed(2)} ({item.size})</span>
                        <span className="item-quantity">Adet: {item.quantity}</span>
                      </div>
                      <button className="remove-item-button" onClick={() => handleRemoveFromCart(item)}>Sil</button>
                    </li>
                  ))}
                </ul>
                <p className="total">Toplam: ₺{calculateTotal()}</p>
                {/* Ödeme formuna geçiş için müşteri bilgileri */}
                <div className="customer-info-form">
                    <input type="text" placeholder="Adınız Soyadınız" ref={customerNameRef} required />
                    <input type="email" placeholder="E-posta adresiniz" ref={customerEmailRef} required />
                    <input type="text" placeholder="Adresiniz" ref={customerAddressRef} required />
                    <input type="tel" placeholder="Telefon Numaranız" ref={customerPhoneRef} required />
                </div>
                <button onClick={handlePlaceOrder}>Siparişi Tamamla</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Kargo Takip Modal */}
      {showTrackingModal && (
        <div className="modal-backdrop" onClick={() => { setShowTrackingModal(false); setTrackingResult(null); setTrackingEmail(""); setTrackingOrderId(""); setTrackingError(""); }}>
          <div
            className="modal-content-base tracking-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-modal" onClick={() => { setShowTrackingModal(false); setTrackingResult(null); setTrackingEmail(""); setTrackingOrderId(""); setTrackingError(""); }}>×</button> {/* Kargo takip modalı için 'x' işareti */}
            <h2 className="text-xl mb-4 font-semibold">Kargo Takibi</h2>
            {!trackingResult ? (
              <>
                <input
                  type="email"
                  placeholder="E-posta adresiniz"
                  value={trackingEmail}
                  onChange={(e) => setTrackingEmail(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Sipariş Numaranız (ALC- ile başlayan)"
                  value={trackingOrderId}
                  onChange={(e) => setTrackingOrderId(e.target.value)}
                  required
                />
                <button
                  onClick={handleTrackingSearch}
                  className="bg-black text-white py-2"
                  disabled={loadingTracking}
                >
                  {loadingTracking ? "Sorgulanıyor..." : "Sorgula"}
                </button>
                {trackingError && <p className="text-red-500 mt-2">{trackingError}</p>}
              </>
            ) : (
              <div className="mt-4 text-sm text-left">
                <p><strong>Kargo Firması:</strong> {trackingResult.cargo_company}</p>
                <p><strong>Takip Kodu:</strong> {trackingResult.tracking_code}</p>
                <p><strong>Durum:</strong> {trackingResult.status}</p>
                <a
                  href={trackingResult.takipLinki}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline mt-2 inline-block"
                >
                  Kargo Takip Sayfasına Git
                </a>
                <br />
                <button
                  onClick={() => setTrackingResult(null)}
                  className="bg-gray-200 text-black py-2 mt-4"
                >
                  Yeni Sorgu
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Ödeme Modalı (Sadece bilgilendirme, gerçek ödeme değil) */}
      {showPaymentModal && (
        <div className="modal-backdrop" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content-base order-confirmation" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowPaymentModal(false)}>×</button>
            <h2>Ödeme Ekranı Simülasyonu</h2>
            <p>Gerçek bir ödeme entegrasyonu olmadığı için, ödeme sayfasına yönlendirme simüle ediliyor.</p>
            <p>Şimdi aşağıdaki butona tıklayarak iyzipay'in örnek ödeme sayfasına gidebilirsiniz.</p>
            <a href="https://sandbox-merchant.iyzipay.com/checkoutform/initialize/sample" target="_blank" rel="noopener noreferrer">
              <button>İyzipay Ödeme Sayfasına Git</button>
            </a>
            <p className="mt-4">Ödeme tamamlandıktan sonra bu siteye geri dönebilirsiniz. Siparişiniz otomatik olarak işlenecektir.</p>
          </div>
        </div>
      )}

      {/* Başarılı Sipariş Modalı */}
      {showSuccessModal && (
        <div className="modal-backdrop" onClick={() => setShowSuccessModal(false)}>
          <div className="modal-content-base order-confirmation" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowSuccessModal(false)}>×</button>
            <h2>Teşekkürler!</h2>
            <p>Siparişiniz başarıyla alındı ve e-posta adresinize gönderildi.</p>
            <p>Sipariş Numaranız: <strong>{JSON.parse(localStorage.getItem("orderInfo"))?.custom_order_id}</strong></p>
            <button onClick={() => setShowSuccessModal(false)}>Kapat</button>
          </div>
        </div>
      )}

      {/* İade Formu Modalı */}
      {showReturnForm && (
        <div className="modal-backdrop" onClick={() => setShowReturnForm(false)}>
          <div className="modal-content-base order-confirmation" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowReturnForm(false)}>×</button> {/* İade formu modalı için 'x' işareti */}
            <h2>İade Talebi</h2>
            <form onSubmit={sendReturnEmail}>
              <input type="text" name="name" placeholder="Ad Soyad" required />
              <input type="email" name="email" placeholder="E-posta" required />
              <input type="text" name="order" placeholder="Sipariş Numarası veya Detayı" required />
              <textarea name="reason" placeholder="İade Sebebi" required />
              <button type="submit">Gönder</button>
            </form>
          </div>
        </div>
      )}

      {/* Ürün Detay Modalı */}
      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content-base product-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setSelectedProduct(null)}>×</button> {/* Ürün detay modalı için 'x' işareti */}
            <img src={selectedProduct.image} alt={selectedProduct.name} className="product-modal-image" />
            <div className="product-info">
              <h2>{selectedProduct.name}</h2>
              <p className="desc">{selectedProduct.description || "Bu ürün ALICCI koleksiyonunun zarif parçalarındandır."}</p> {/* Açıklama eklendi */}
              <div className="size-select">
                <p>Beden Seç:</p>
                {/* Supabase'den gelen bedenler varsa onları kullan, yoksa varsayılanları */}
                {(selectedProduct.sizes && selectedProduct.sizes.length > 0
                  ? selectedProduct.sizes
                  : ["S", "M", "L", "XL"]
                ).map((size) => (
                  <button key={size} className={selectedSize === size ? "selected" : ""} onClick={() => setSelectedSize(size)}>
                    {size}
                  </button>
                ))}
              </div>
              <button
                className="add-to-cart-btn"
                onClick={handleAddToCart} // Fonksiyon çağrısı basitleştirildi
                disabled={!selectedSize} // Beden seçilmeden sepete eklenemez
              >
                Sepete Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}