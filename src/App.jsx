import React, { useState, useRef, useEffect } from "react";
import emailjs from "emailjs-com";
import "./index.css";
import { Analytics } from "@vercel/analytics/react";
import { supabase } from "./supabaseclient";

const ProductCard = ({ product, openProductModal, setIsCartOpen }) => {
    const [hoveredImageIndex, setHoveredImageIndex] = useState(0);

    // Skeleton loader kontrolü için basit bir check
    if (!product) return <div className="product-card skeleton"></div>;

    const handleMouseMove = (e) => {
        if (!product || !product.image || product.image.length <= 1) return;
        const { left, width } = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - left;
        const segmentWidth = width / product.image.length;
        let newIndex = Math.floor(mouseX / segmentWidth);
        newIndex = Math.max(0, Math.min(newIndex, product.image.length - 1));
        if (newIndex !== hoveredImageIndex) setHoveredImageIndex(newIndex);
    };

    return (
        <div className="product-card" onClick={() => { setIsCartOpen(false); openProductModal(product); }} onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredImageIndex(0)}>
            <img src={product.image ? product.image[hoveredImageIndex] : "/logo.png"} alt={product.name} className="product-card-image" />
            <div className="info">
                <h4>{product.name}</h4>
                <p>{product.price} TL</p>
            </div>
        </div>
    );
};

function App() {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Skeleton için
    const [isDarkMode, setIsDarkMode] = useState(false); // Karanlık mod
    const [couponCode, setCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);
    
    // ... diğer mevcut state'lerin (selectedProduct, cartItems vb.) kalsın
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedSize, setSelectedSize] = useState("");
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [currentModalImageIndex, setCurrentModalImageIndex] = useState(0);
    const [showOrderOptionsModal, setShowOrderOptionsModal] = useState(false);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const form = useRef();
    const WHATSAPP_NUMBER = "905511903118";
    const INSTAGRAM_USERNAME = "alicci.official";

    // Dark Mode Etkisi
    useEffect(() => {
        if (isDarkMode) document.body.classList.add("dark-mode");
        else document.body.classList.remove("dark-mode");
    }, [isDarkMode]);

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            const { data } = await supabase.from("products").select("*");
            setProducts(data || []);
            setIsLoading(false);
        };
        fetchProducts();
    }, []);

    const getTotalPrice = () => {
        const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
        return (subtotal - (subtotal * discount)).toFixed(2);
    };

    const applyCoupon = () => {
        if (couponCode === "ALICCI20") setDiscount(0.2);
        else alert("Geçersiz Kupon");
    };

    // ... (Diğer fonksiyonların aynı kalacak: handleAddToCart, handleCheckout vb.)

    return (
        <>
            <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
                {isDarkMode ? "☀️" : "🌙"}
            </button>

            <nav>
                <h1>ALICCI</h1>
                {/* Nav menün ve diğer yapın aynen burada devam ediyor */}
            </nav>

            <main>
                <section id="products" className="products">
                    <h3>Ürünlerimiz</h3>
                    <div className="products-grid">
                        {isLoading 
                          ? Array(4).fill(0).map((_, i) => <div key={i} className="skeleton-card" />)
                          : products.map((product) => (
                              <ProductCard key={product.id} product={product} openProductModal={setSelectedProduct} setIsCartOpen={setIsCartOpen} />
                          ))
                        }
                    </div>
                </section>
            </main>

            {/* Modal içerisine zoom efekti için .product-modal-image class'ına 
                transition: transform 0.3s; eklendi. */}
            
            {/* Sepet paneline kupon inputu eklendi */}
            {isCartOpen && (
                <div className="cart-panel">
                    {/* ... diğer sepet kodları */}
                    <input placeholder="Kupon Kodu" onChange={(e) => setCouponCode(e.target.value)} />
                    <button onClick={applyCoupon}>Uygula</button>
                    <div className="total">Toplam: {getTotalPrice()} TL</div>
                </div>
            )}
        </>
    );
}

export default App;
