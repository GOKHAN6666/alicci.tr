import React, { useState, useRef, useEffect } from "react";
import emailjs from "emailjs-com";
import "./index.css";
import { Analytics } from "@vercel/analytics/react";
import { supabase } from "./supabaseclient";

const ProductCard = ({ product, openProductModal }) => {
    const [hoveredImageIndex, setHoveredImageIndex] = useState(0);

    const handleMouseMove = (e) => {
        if (!product || !product.image || product.image.length <= 1) {
            setHoveredImageIndex(0);
            return;
        }
        const { currentTarget } = e;
        const { left, width } = currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - left;
        const segmentWidth = width / product.image.length;
        let newIndex = Math.floor(mouseX / segmentWidth);
        newIndex = Math.max(0, Math.min(newIndex, product.image.length - 1));
        if (newIndex !== hoveredImageIndex) setHoveredImageIndex(newIndex);
    };

    return (
        <div className="product-card" onClick={() => openProductModal(product)} onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredImageIndex(0)}>
            <img src={product.image ? product.image[hoveredImageIndex] : "/logo.png"} alt={product.name} className="product-card-image" />
            <div className="info">
                <h4>{product.name}</h4>
                <p>{product.price} TL</p>
            </div>
        </div>
    );
};

function App() {
    // State Tanımlamaları
    const [products, setProducts] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedSize, setSelectedSize] = useState("");
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showOrderOptionsModal, setShowOrderOptionsModal] = useState(false);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    
    // Kapanış Animasyonu Takibi (Tekli Menü Kuralı için)
    const [isClosing, setIsClosing] = useState({ cart: false, menu: false, tracking: false, product: false, order: false, confirmation: false });

    const [currentModalImageIndex, setCurrentModalImageIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [couponInput, setCouponInput] = useState("");
    const [discount, setDiscount] = useState(0);
    const [toast, setToast] = useState(null);
    const [currentSection, setCurrentSection] = useState("home");
    const form = useRef();

    const WHATSAPP_NUMBER = "905511903118";
    const INSTAGRAM_USERNAME = "alicci.official";

    // --- TEK MENÜ / MODAL YÖNETİMİ ---
    const closeAllOverlays = (except = null) => {
        const animDuration = 300; 
        
        // Kapanışa başla
        setIsClosing({
            cart: except !== 'cart' && isCartOpen,
            menu: except !== 'menu' && isMobileMenuOpen,
            tracking: except !== 'tracking' && showTrackingModal,
            product: except !== 'product' && selectedProduct,
            order: except !== 'order' && showOrderOptionsModal,
            confirmation: except !== 'confirmation' && showConfirmationModal
        });

        // Süre sonunda kapat
        setTimeout(() => {
            if (except !== 'cart') setIsCartOpen(false);
            if (except !== 'menu') setIsMobileMenuOpen(false);
            if (except !== 'tracking') setShowTrackingModal(false);
            if (except !== 'product') setSelectedProduct(null);
            if (except !== 'order') setShowOrderOptionsModal(false);
            if (except !== 'confirmation') setShowConfirmationModal(false);
            
            // Animasyon durumlarını sıfırla
            setIsClosing({ cart: false, menu: false, tracking: false, product: false, order: false, confirmation: false });
        }, animDuration);
    };

    // --- AÇMA FONKSİYONLARI ---
    const toggleCart = () => { if (isCartOpen) closeAllOverlays(); else { closeAllOverlays('cart'); setIsCartOpen(true); } };
    const toggleMobileMenu = () => { if (isMobileMenuOpen) closeAllOverlays(); else { closeAllOverlays('menu'); setIsMobileMenuOpen(true); } };
    const openProductModal = (product) => { closeAllOverlays('product'); setSelectedProduct(product); setCurrentModalImageIndex(0); };
    const openTrackingModal = () => { closeAllOverlays('tracking'); setShowTrackingModal(true); };
    const openOrderOptions = () => { closeAllOverlays('order'); setShowOrderOptionsModal(true); };
    const openConfirmationModal = () => { closeAllOverlays('confirmation'); setShowConfirmationModal(true); };

    // --- DİĞER GEREKLİ ETKİLEŞİMLER ---
    useEffect(() => {
        const fetchProducts = async () => {
            const { data } = await supabase.from("products").select("*");
            if (data) setProducts(data.map(p => ({...p, image: Array.isArray(p.image_url) ? p.image_url : [p.image_url]})));
            setIsLoading(false);
        };
        fetchProducts();
    }, []);

    const showToast = (message) => { setToast(message); setTimeout(() => setToast(null), 3000); };
    const toggleDarkMode = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        localStorage.setItem("darkMode", newTheme);
        document.body.classList.toggle("dark-mode");
    };

    // --- SEPET VE İŞLEM FONKSİYONLARI ---
    const handleAddToCart = () => {
        if (!selectedSize) { showToast("Lütfen bir beden seçin."); return; }
        const existingItemIndex = cartItems.findIndex(item => item.id === selectedProduct.id && item.size === selectedSize);
        if (existingItemIndex > -1) {
            const updated = [...cartItems];
            updated[existingItemIndex].quantity += 1;
            setCartItems(updated);
        } else {
            setCartItems([...cartItems, { ...selectedProduct, quantity: 1, size: selectedSize }]);
        }
        toggleCart(); // Sepeti aç, ürünü kapat (otomatik closeAllOverlays tetiklenir)
    };

    const handleCheckout = () => {
        if (cartItems.length === 0) { showToast("Sepetiniz boş."); return; }
        openOrderOptions();
    };

    return (
        <>
            <style>{`
                /* MODAL VE MENÜ ANIMASYONLARI */
                .modal-backdrop, .nav-menu, .cart-panel { transition: opacity 0.3s ease; }
                
                /* Gerekli CSS Animasyonları */
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
                
                /* Buraya orijinal index.css içerisindeki tüm class'larını ekleyebilirsin */
                .closing { animation: fade-out 0.3s forwards; }
                .open { animation: fade-in 0.3s forwards; }
            `}</style>

            <nav>
                <h1>ALICCI</h1>
                <ul className={`nav-menu ${isMobileMenuOpen ? "open" : isClosing.menu ? "closing" : ""}`}>
                    <li onClick={() => { closeAllOverlays(); setCurrentSection("home"); }}>Ana Sayfa</li>
                    <li onClick={() => { closeAllOverlays(); setCurrentSection("products"); }}>Ürünler</li>
                    <li onClick={openTrackingModal}>Kargo Takip</li>
                    <li onClick={toggleCart}>Sepetim ({cartItems.length})</li>
                    <li className="mobile-theme-toggle" onClick={toggleDarkMode}>Tema Değiştir</li>
                </ul>

                <div className="nav-controls">
                    <button onClick={toggleDarkMode}>{isDarkMode ? "☀️" : "🌙"}</button>
                    <div className="hamburger" onClick={toggleMobileMenu}>
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </nav>

            <main>
                <section id="products">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} openProductModal={openProductModal} />
                    ))}
                </section>
                {/* Diğer bölümler buraya */}
            </main>

            {/* MODALLAR (Örnek: Ürün Detay) */}
            {selectedProduct && (
                <div className={`modal-backdrop ${isClosing.product ? "closing" : "open"}`} onClick={() => closeAllOverlays()}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{selectedProduct.name}</h2>
                        {/* İçerik */}
                        <button onClick={handleAddToCart}>Sepete Ekle</button>
                    </div>
                </div>
            )}
            
            {/* Diğer modalları da benzer şekilde isClosing state'i ile kontrol et */}
        </>
    );
}

export default App;
