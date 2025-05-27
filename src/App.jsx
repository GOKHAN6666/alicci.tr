import React, { useState, useRef, useEffect } from "react";
import emailjs from "emailjs-com";
import "./index.css";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [hasOrdered, setHasOrdered] = useState(() => {
    return localStorage.getItem("hasOrdered") === "true";
  });

  const aboutRef = useRef(null);
  const contactRef = useRef(null);
  const productsRef = useRef(null);
  const nameRef = useRef();
  const emailRef = useRef();

  const scrollToSection = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow =
      selectedProduct || orderModalOpen || showPaymentModal || showReturnForm
        ? "hidden"
        : "";
  }, [selectedProduct, orderModalOpen, showPaymentModal, showReturnForm]);

  const productsData = [
    { id: 1, name: "Ürün 1", price: 4950 },
    { id: 2, name: "Ürün 2", price: 4950 },
    { id: 3, name: "Ürün 3", price: 4950 },
  ];

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

  const handleOrder = () => {
    if (!nameRef.current?.value || !emailRef.current?.value) {
      alert("Lütfen adınızı ve e-posta adresinizi girin.");
      return;
    }

    const templateParams = {
      name: nameRef.current.value,
      email: emailRef.current.value,
      items: cartItems.map((item) => `${item.name} (${item.size})`).join(", "),
      total: totalPrice,
    };

    emailjs
      .send("service_iyppib9", "template_ftuypl8", templateParams, "5dI_FI0HT2oHrlQj5")
      .then(() => {
        setCartItems([]);
        setIsCartOpen(false);
        setShowPaymentModal(true);
        setHasOrdered(true);
        localStorage.setItem("hasOrdered", "true"); // 🔐 Kalıcı olarak işaretle
      })
      .catch((error) => {
        console.error("Email gönderilemedi:", error);
      });
  };

  const handleReturnSubmit = (e) => {
    e.preventDefault();
    const form = e.target;

    const returnParams = {
      user_name: form.name.value,
      user_email: form.email.value,
      order_detail: form.order.value,
      reason: form.reason.value,
    };

    emailjs
      .send("service_iyppib9", "ALICCI_Return", returnParams, "5dI_FI0HT2oHrlQj5")
      .then(() => {
        setShowReturnForm(false);
        alert("İade talebiniz alınmıştır.");
      })
      .catch((error) => {
        console.error("İade formu gönderilemedi:", error);
      });
  };

  return (
    <>
      {!selectedProduct && (
        <nav>
          <h1>ALICCI</h1>
          <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </div>
          <ul className={menuOpen ? 'open' : ''}>
            <li onClick={() => scrollToSection(productsRef)}>Koleksiyon</li>
            <li onClick={() => scrollToSection(aboutRef)}>Hakkımızda</li>
            <li onClick={() => scrollToSection(contactRef)}>İletişim</li>
            {hasOrdered && (
              <li onClick={() => setShowReturnForm(true)}>İade Talebi</li>
            )}
            <div className="cart-button" onClick={() => setIsCartOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" stroke="#111" strokeWidth="1.5" fill="none">
                <path d="M3 3h2l.4 2M7 13h13l-1.5 7H6L5 6H3" />
                <circle cx="9" cy="21" r="1" />
                <circle cx="18" cy="21" r="1" />
              </svg>
              {cartItems.length > 0 && <div className="cart-count">{cartItems.length}</div>}
            </div>
          </ul>
        </nav>
      )}

      <section className="hero">
        <h2>Sessiz Lüksün Yeni Tanımı</h2>
        <p>Sadelik, zarafet ve kalite. ALICCI, görünmeyeni giyenler için.</p>
        <button onClick={() => scrollToSection(productsRef)}>Koleksiyonu Keşfet</button>
      </section>

      <section className="products" ref={productsRef}>
        <h3>Yeni Sezon</h3>
        <div className="products-grid">
          {productsData.map((item) => (
            <div key={item.id} className="product-card">
              <div className="image" onClick={() => {
                setSelectedProduct(item);
                setSelectedSize(null);
              }}></div>
              <div className="info">
                <h4>{item.name}</h4>
                <p>₺{item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="about" ref={aboutRef}>
        <h3>Hakkımızda</h3>
        <p>ALICCI, sadeliği ve zarafeti benimseyen erkekler için kuruldu. Sessiz lüks; gösterişten uzak, detayda gizli bir zenginliktir.</p>
        <p>Koleksiyonlarımız, yüksek kalite kumaşlar ve özenli işçilikle hazırlanır.</p>
      </section>

      <section className="contact" ref={contactRef}>
        <h3>İletişim</h3>
        <form action="https://formspree.io/f/xeogwvzd" method="POST">
          <input type="text" name="name" placeholder="Adınız" required />
          <input type="email" name="email" placeholder="E-posta" required />
          <textarea name="message" placeholder="Mesajınız" required></textarea>
          <button type="submit">Gönder</button>
        </form>
      </section>

      <footer>
        © 2025 ALICCI • Tüm hakları saklıdır.
        <div className="instagram">
          <a href="https://instagram.com/alicci.official" target="_blank" rel="noopener noreferrer">
            Instagram / @alicci.official
          </a>
        </div>
      </footer>

      {isCartOpen && (
        <>
          <div className="cart-overlay" onClick={() => setIsCartOpen(false)}></div>
          <div className="cart-panel open">
            <button className="close-cart" onClick={() => setIsCartOpen(false)}>×</button>
            <h3>Sepetiniz</h3>
            {cartItems.length === 0 ? (
              <p>Sepetiniz boş.</p>
            ) : (
              <>
                <ul>
                  {cartItems.map((item, index) => (
                    <li key={index}>
                      {item.name} – ₺{item.price} ({item.size})
                      <button onClick={() => {
                        const updated = [...cartItems];
                        updated.splice(index, 1);
                        setCartItems(updated);
                      }}>Sil</button>
                    </li>
                  ))}
                </ul>
                <p className="total">Toplam: ₺{totalPrice}</p>
                <input type="text" placeholder="Adınız Soyadınız" ref={nameRef} required />
                <input type="email" placeholder="E-posta adresiniz" ref={emailRef} required />
                <button onClick={handleOrder}>Siparişi Tamamla</button>
              </>
            )}
          </div>
        </>
      )}

      {showPaymentModal && (
        <div className="modal-backdrop" onClick={() => setShowPaymentModal(false)}>
          <div className="order-confirmation" onClick={(e) => e.stopPropagation()}>
            <h2>Ödeme Ekranı</h2>
            <p>Şimdi ödeme için yönlendiriliyorsunuz...</p>
            <a href="https://sandbox-merchant.iyzipay.com/checkoutform/initialize/sample" target="_blank" rel="noopener noreferrer">
              <button>Ödeme Sayfasına Git</button>
            </a>
            <button onClick={() => setShowPaymentModal(false)}>Kapat</button>
          </div>
        </div>
      )}

      {showReturnForm && (
        <div className="modal-backdrop" onClick={() => setShowReturnForm(false)}>
          <div className="order-confirmation" onClick={(e) => e.stopPropagation()}>
            <h2>İade Talebi</h2>
            <form onSubmit={handleReturnSubmit}>
              <input type="text" name="name" placeholder="Ad Soyad" required />
              <input type="email" name="email" placeholder="E-posta" required />
              <input type="text" name="order" placeholder="Sipariş Detayı" required />
              <textarea name="reason" placeholder="İade Sebebi" required />
              <button type="submit">Gönder</button>
            </form>
            <button onClick={() => setShowReturnForm(false)}>Kapat</button>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            <div className="product-image" />
            <div className="product-info">
              <h2>{selectedProduct.name}</h2>
              <p className="desc">Bu ürün ALICCI koleksiyonunun zarif parçalarındandır.</p>
              <div className="size-select">
                <p>Beden Seç:</p>
                {["S", "M", "L", "XL"].map((size) => (
                  <button
                    key={size}
                    className={selectedSize === size ? "selected" : ""}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  if (selectedSize) {
                    setCartItems([...cartItems, { ...selectedProduct, size: selectedSize }]);
                    setSelectedProduct(null);
                  } else {
                    alert("Lütfen beden seçin.");
                  }
                }}
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
