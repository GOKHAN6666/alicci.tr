import React, { useState, useRef, useEffect } from "react";
import "./index.css";
import emailjs from "@emailjs/browser";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", surname: "", email: "" });

  const aboutRef = useRef(null);
  const contactRef = useRef(null);
  const productsRef = useRef(null);

  const scrollToSection = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = selectedProduct ? "hidden" : "";
  }, [selectedProduct]);

  const productsData = [
    { id: 1, name: "Ürün 1", price: 4950 },
    { id: 2, name: "Ürün 2", price: 4950 },
    { id: 3, name: "Ürün 3", price: 4950 },
  ];

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.surname || !formData.email) {
      alert("Lütfen tüm bilgileri doldurun.");
      return;
    }

    if (cartItems.length === 0) {
      alert("Sepetiniz boş.");
      return;
    }

    const templateParams = {
      name: formData.name,
      surname: formData.surname,
      email: formData.email,
      items: cartItems
        .map((item) => `${item.name} (${item.size}) - ₺${item.price}`)
        .join(", "),
    };

    emailjs
      .send("service_iyppib9", "ALICCI", templateParams, "5dI_FI0HT2oHrlQj5")
      .then(() => {
        setIsCartOpen(false);
        setCartItems([]);
        setIsOrderModalOpen(true);
      })
      .catch((error) => {
        console.error("EmailJS Error:", error);
        alert("Sipariş gönderilirken hata oluştu.");
      });
  };

  return (
    <>
      {!selectedProduct && (
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
            <li onClick={() => scrollToSection(aboutRef)}>Hakkımızda</li>
            <li onClick={() => scrollToSection(contactRef)}>İletişim</li>
            <div className="cart-button" onClick={() => setIsCartOpen(true)}>
              🛒 {cartItems.length > 0 && <div className="cart-count">{cartItems.length}</div>}
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
        <p>ALICCI, sadeliği ve zarafeti benimseyen erkekler için kuruldu.</p>
      </section>

      <section className="contact" ref={contactRef}>
        <h3>İletişim</h3>
        <form>
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
                <form onSubmit={handleCheckout} className="checkout-form">
                  <input
                    type="text"
                    placeholder="Ad"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Soyad"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    required
                  />
                  <input
                    type="email"
                    placeholder="E-posta"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <button type="submit">Ödeme Yap (iyzico yakında)</button>
                </form>
              </>
            )}
          </div>
        </>
      )}

      {isOrderModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsOrderModalOpen(false)}>
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Teşekkürler</h2>
            <p>Siparişiniz alınmıştır, 1-3 iş günü içinde kargolanacaktır.</p>
            <button onClick={() => setIsOrderModalOpen(false)}>Kapat</button>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            <div className="product-image" />
            <div className="product-info">
              <h2>{selectedProduct.name}</h2>
              <p className="desc">Yüksek kaliteli kumaş ve modern kesim.</p>
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
