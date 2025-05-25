import { useState, useRef, useEffect } from "react";
import "./index.css";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const aboutRef = useRef(null);
  const contactRef = useRef(null);

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
            <li onClick={() => scrollToSection(aboutRef)}>Hakkımızda</li>
            <li onClick={() => scrollToSection(contactRef)}>İletişim</li>
            <div className="cart-button" onClick={() => setIsCartOpen(true)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#111"
                strokeWidth="1.5"
              >
                <path d="M3 3h2l.4 2M7 13h13l-1.5 7H6L5 6H3" />
                <circle cx="9" cy="21" r="1" />
                <circle cx="18" cy="21" r="1" />
              </svg>
              {cartItems.length > 0 && (
                <div className="cart-count">{cartItems.length}</div>
              )}
            </div>
          </ul>
        </nav>
      )}

      <section className="hero">
        <h2>Sessiz Lüksün Yeni Tanımı</h2>
        <p>Sadelik, zarafet ve kalite. ALICCI, görünmeyeni giyenler için.</p>
        <button>Koleksiyonu Keşfet</button>
      </section>

      <section className="products">
        <h3>Yeni Sezon</h3>
        <div className="products-grid">
          {productsData.map((item) => (
            <div key={item.id} className="product-card">
              <div className="image" onClick={() => setSelectedProduct(item)}></div>
              <div className="info">
                <h4>{item.name}</h4>
                <p>₺{item.price}</p>
                <button onClick={() => setCartItems([...cartItems, item])}>
                  Sepete Ekle
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="about" ref={aboutRef}>
        <h3>Hakkımızda</h3>
        <p>
          ALICCI, sadeliği ve zarafeti benimseyen erkekler için kuruldu. Sessiz lüks;
          gösterişten uzak, detayda gizli bir zenginliktir. Koleksiyonlarımız,
          yüksek kalite kumaşlar ve özenli işçilikle hazırlanır.
        </p>
        <p>
          İstanbul'da doğan ALICCI, global düzeyde sessiz lüks anlayışını temsil
          etmeye kararlıdır. Her parça, zamansız bir stilin temsilcisi olarak
          tasarlanır.
        </p>
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
          <a href="https://instagram.com/alicciofficial" target="_blank" rel="noopener noreferrer">
            Instagram / @alicciofficial
          </a>
        </div>
      </footer>

      {isCartOpen && (
        <>
          <div className="cart-overlay" onClick={() => setIsCartOpen(false)}></div>
          <div className={`cart-panel open`}>
            <button className="close-cart" onClick={() => setIsCartOpen(false)}>×</button>
            <h3>Sepetiniz</h3>
            {cartItems.length === 0 ? (
              <p>Sepetiniz boş.</p>
            ) : (
              <>
                <ul>
                  {cartItems.map((item, index) => (
                    <li key={index}>
                      {item.name} – ₺{item.price}
                      <button onClick={() => {
                        const updated = [...cartItems];
                        updated.splice(index, 1);
                        setCartItems(updated);
                      }}>Sil</button>
                    </li>
                  ))}
                </ul>
                <p className="total">Toplam: ₺{totalPrice}</p>
              </>
            )}
          </div>
        </>
      )}

      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            <div className="product-image" />
            <div className="product-info">
              <h2>{selectedProduct.name}</h2>
              <p className="desc">Bu ürün ALICCI koleksiyonunun zarif parçalarındandır. Yüksek kaliteli kumaş ve modern kesim ile üretilmiştir.</p>
              <button
                onClick={() => {
                  setCartItems([...cartItems, selectedProduct]);
                  setSelectedProduct(null);
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
