import { useState } from 'react';
import './index.css';

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  return (
    <>
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
          <li>Koleksiyon</li>
          <li>Hakkımızda</li>
          <li>İletişim</li>
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

      <section className="hero">
        <h2>Sessiz Lüksün Yeni Tanımı</h2>
        <p>Sadelik, zarafet ve kalite. ALICCI, görünmeyeni giyenler için.</p>
        <button>Koleksiyonu Keşfet</button>
      </section>

      <section className="products">
        <h3>Yeni Sezon</h3>
        <div className="products-grid">
          {[1, 2, 3].map((item) => (
            <div key={item} className="product-card">
              <div className="image"></div>
              <div className="info">
                <h4>Ürün {item}</h4>
                <p>₺4.950</p>
                <button onClick={() => setCartItems([...cartItems, item])}>
                  Sepete Ekle
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer>© 2025 ALICCI • Tüm hakları saklıdır.</footer>

      {isCartOpen && (
        <>
          <div className="cart-overlay" onClick={() => setIsCartOpen(false)}></div>
          <div className="cart-panel">
            <button className="close-cart" onClick={() => setIsCartOpen(false)}>×</button>
            <h3>Sepetiniz</h3>
            {cartItems.length === 0 ? (
              <p>Sepetiniz boş.</p>
            ) : (
              <ul>
                {cartItems.map((item, index) => (
                  <li key={index}>Ürün {item}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  );
}
