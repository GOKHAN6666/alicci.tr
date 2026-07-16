import React, { useState, useRef, useEffect } from "react";
import emailjs from "emailjs-com";
import "./index.css";
import { Analytics } from "@vercel/analytics/react"; 
import { supabase } from "./supabaseclient";

const getRecommendedSize = (height, weight, fitPreference) => {
    let baseSize = "M";
    if (height <= 168 && weight <= 54) {
        baseSize = "S"; 
    } else if (height <= 176 && weight <= 68) {
        baseSize = "M"; 
    } else if (height <= 184 && weight <= 82) {
        baseSize = "L"; 
    } else {
        baseSize = "XL"; 
    }

    if (fitPreference === "oversize") {
        if (baseSize === "S") return "M";
        if (baseSize === "M") return "L";
        if (baseSize === "L") return "XL";
        return "XXL";
    }
    return baseSize;
};

const ProductCard = ({ product, openProductModal, closeCart }) => {
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

        if (newIndex !== hoveredImageIndex) {
            setHoveredImageIndex(newIndex);
        }
    };

    const handleMouseLeave = () => setHoveredImageIndex(0);
    const handleClick = () => {
        if (closeCart) closeCart();
        openProductModal(product);
    };

    const isCompletelySoldOut = product.stock === 0;

    return (
        <div
            className={`product-card reveal ${isCompletelySoldOut ? "sold-out" : ""}`}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {isCompletelySoldOut && <div className="sold-out-badge">TÜKENDİ</div>}
            <img
                src={product.image ? product.image[hoveredImageIndex] : "/logo.png"}
                alt={product.name}
                className="product-card-image"
                loading="lazy"
            />
            <div className="info">
                <h4>{product.name}</h4>
                <p>{product.price} TL</p>
            </div>
        </div>
    );
};

function App() {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isProductClosing, setIsProductClosing] = useState(false);
    const [selectedSize, setSelectedSize] = useState("");
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCartClosing, setIsCartClosing] = useState(false); 
    const [currentModalImageIndex, setCurrentModalImageIndex] = useState(0);
    
    // Eski sipariş modalı state'leri (Kaldırmak istersen silebilirsin, şimdilik duruyor)
    const [showOrderOptionsModal, setShowOrderOptionsModal] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    
    // YENİ: İyzico Ödeme Modalı State'leri
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isPaymentClosing, setIsPaymentClosing] = useState(false);
    const [isInitializingPayment, setIsInitializingPayment] = useState(false);
    const [iyzicoFormHtml, setIyzicoFormHtml] = useState("");

    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [isTrackingClosing, setIsTrackingClosing] = useState(false);
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileMenuClosing, setIsMobileMenuClosing] = useState(false); 
    const [currentSection, setCurrentSection] = useState("home");
    const [isLoading, setIsLoading] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(false);
    
    const [showSizeCalcModal, setShowSizeCalcModal] = useState(false);
    const [isSizeCalcClosing, setIsSizeCalcClosing] = useState(false);
    const [modalTiltStyle, setModalTiltStyle] = useState({});
    
    const [calcHeight, setCalcHeight] = useState(170);
    const [calcWeight, setCalcWeight] = useState(65);
    const [calcFit, setCalcFit] = useState("oversize");
    const [calcResult, setCalcResult] = useState(null);
    
    const [couponInput, setCouponInput] = useState("");
    const [discount, setDiscount] = useState(0);
    const [appliedCouponCode, setAppliedCouponCode] = useState(""); 
    
    const [toast, setToast] = useState(null);
    const [removingId, setRemovingId] = useState(null);

    const [trackingCodeInput, setTrackingCodeInput] = useState("");
    const [searchedOrder, setSearchedOrder] = useState(null);
    const [trackingError, setTrackingError] = useState("");
    const [isTrackingLoading, setIsTrackingLoading] = useState(false);

    const form = useRef();

    const WHATSAPP_NUMBER = "905511903118";
    const INSTAGRAM_USERNAME = "alicci.official";

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("active");
                }
            });
        }, { threshold: 0.05 });

        const revealElements = document.querySelectorAll(".reveal");
        revealElements.forEach((el) => observer.observe(el));

        return () => revealElements.forEach((el) => observer.unobserve(el));
    }, [products, isLoading]);

    useEffect(() => {
        setDiscount(0);
        setCouponInput("");
        setAppliedCouponCode("");
    }, [cartItems]);

    useEffect(() => {
        const savedTheme = localStorage.getItem("darkMode") === "true";
        setIsDarkMode(savedTheme);
        if (savedTheme) document.body.classList.add("dark-mode");
    }, []);

    const toggleDarkMode = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        localStorage.setItem("darkMode", newTheme);
        if (newTheme) document.body.classList.add("dark-mode");
        else document.body.classList.remove("dark-mode");
    };

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.from("products").select("*");
            if (error) {
                console.error("Ürünler çekilirken hata oluştu:", error);
            } else {
                const normalizedData = (data || []).map(prod => {
                    let finalImages = ["/logo.png"]; 
                    const rawImg = prod.image_url || prod.image;
                    if (rawImg) {
                        if (Array.isArray(rawImg)) finalImages = rawImg;
                        else if (typeof rawImg === "string") {
                            try { finalImages = JSON.parse(rawImg); } 
                            catch (e) { finalImages = [rawImg]; }
                        }
                    }
                    let finalSoldOutSizes = [];
                    if (prod.sold_out_sizes) {
                        if (Array.isArray(prod.sold_out_sizes)) finalSoldOutSizes = prod.sold_out_sizes;
                        else if (typeof prod.sold_out_sizes === "string") {
                            try { finalSoldOutSizes = JSON.parse(prod.sold_out_sizes); } 
                            catch (e) { finalSoldOutSizes = prod.sold_out_sizes.split(",").map(s => s.trim()); }
                        }
                    }
                    return { ...prod, image: finalImages, sold_out_sizes: finalSoldOutSizes, stock: prod.stock !== undefined ? Number(prod.stock) : 10 };
                });
                setProducts(normalizedData);
            }
            setIsLoading(false);
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        const storedCartItems = localStorage.getItem("alicciCartItems");
        if (storedCartItems) {
            try { setCartItems(JSON.parse(storedCartItems)); } 
            catch (e) { localStorage.removeItem("alicciCartItems"); }
        }
    }, []);
    
    useEffect(() => {
        localStorage.setItem("alicciCartItems", JSON.stringify(cartItems));
    }, [cartItems]);

    // Kaydırmayı engelleme mantığına İyzico Modalı da eklendi
    useEffect(() => {
        const isAnyModalOpen = selectedProduct || showOrderOptionsModal || showConfirmationModal || showTrackingModal || isCartOpen || isMobileMenuOpen || showSizeCalcModal || showPaymentModal;
        if (isAnyModalOpen) document.body.classList.add('no-scroll');
        else document.body.classList.remove('no-scroll');
        return () => document.body.classList.remove('no-scroll');
    }, [selectedProduct, showOrderOptionsModal, showConfirmationModal, showTrackingModal, isCartOpen, isMobileMenuOpen, showSizeCalcModal, showPaymentModal]);

    // YENİ: İyzico Script Çalıştırıcısı (ÇOK ÖNEMLİ)
    // İyzico'dan dönen HTML içindeki <script> etiketleri React tarafından otomatik çalıştırılmaz. 
    // Bu hook, HTML geldikten sonra o scriptleri alır ve manuel olarak DOM'a ekleyip çalıştırır.
    useEffect(() => {
        if (iyzicoFormHtml) {
            const container = document.getElementById("iyzico-script-container");
            if (container) {
                container.innerHTML = iyzicoFormHtml;
                const scripts = container.getElementsByTagName("script");
                for (let i = 0; i < scripts.length; i++) {
                    const script = document.createElement("script");
                    script.type = "text/javascript";
                    if (scripts[i].src) {
                        script.src = scripts[i].src;
                    } else {
                        script.text = scripts[i].innerText;
                    }
                    document.body.appendChild(script);
                }
            }
        }
    }, [iyzicoFormHtml]);

    const getTotalPrice = () => {
        const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
        const finalTotal = subtotal - (subtotal * discount);
        return Number.isInteger(finalTotal) ? finalTotal : finalTotal.toFixed(2);
    };

    // DEĞİŞTİ: Sepeti onayla butonu artık İyzico Modalını tetikliyor
    const handleCheckout = () => {
        if (cartItems.length === 0) {
            showToast("Sepetiniz boş.");
            return;
        }
        closeCart(); 
        setTimeout(() => {
            initiateIyzicoPayment();
        }, 300); 
    };

    // YENİ: İyzico Ödemesini Başlatma Fonksiyonu
    const initiateIyzicoPayment = async () => {
        setShowPaymentModal(true);
        setIsInitializingPayment(true);
        
        try {
            // NOT: BURASI BACKEND (VERCEL/SUPABASE) ENTEGRASYONU İSTEYEN YERDİR.
            // Örnek kullanım:
            // const response = await fetch('/api/create-iyzico-checkout', { 
            //     method: 'POST', 
            //     body: JSON.stringify({ cartItems, totalPrice: getTotalPrice() }) 
            // });
            // const data = await response.json();
            // setIyzicoFormHtml(data.checkoutFormContent);
            // setIsInitializingPayment(false);

            // Şimdilik UI'ı test edebilmen için sahte (mock) bir yükleme simülasyonu koyuyoruz:
            setTimeout(() => {
                setIyzicoFormHtml(`
                    <div id="iyzipay-checkout-form" class="responsive"></div>
                    <div style="text-align:center; padding: 40px 20px; border: 2px dashed #ccc; border-radius: 8px; margin-top: 20px;">
                        <h4 style="margin-bottom:10px;">İyzico Bağlantısı Bekleniyor</h4>
                        <p style="font-size: 13px; opacity: 0.7;">Backend entegrasyonu tamamlandığında İyzico'nun güvenli ödeme formu burada otomatik olarak render edilecektir.</p>
                    </div>
                `);
                setIsInitializingPayment(false);
            }, 1800);

        } catch (error) {
            console.error("Ödeme başlatılamadı:", error);
            showToast("Ödeme sistemi yüklenirken hata oluştu.");
            setIsInitializingPayment(false);
        }
    };

    const closePaymentModal = () => {
        setIsPaymentClosing(true);
        setTimeout(() => {
            setShowPaymentModal(false);
            setIsPaymentClosing(false);
            setIyzicoFormHtml("");
        }, 300);
    };

    const openProductModal = (product) => {
        setSelectedProduct(product);
        setIsProductClosing(false);
        setCurrentModalImageIndex(0);
        setSelectedSize("");
    };

    const closeProductModal = () => {
        setIsProductClosing(true);
        setTimeout(() => {
            setSelectedProduct(null);
            setIsProductClosing(false);
        }, 300);
    };

    const closeSizeCalcModal = () => {
        setIsSizeCalcClosing(true);
        setTimeout(() => {
            setShowSizeCalcModal(false);
            setIsSizeCalcClosing(false);
            setModalTiltStyle({}); 
        }, 300);
    };

    const handleModalMouseMove = (e) => {
        const card = e.currentTarget;
        const box = card.getBoundingClientRect();
        const x = e.clientX - box.left - box.width / 2;
        const y = e.clientY - box.top - box.height / 2;
        const rotateX = -(y / (box.height / 2)) * 6;
        const rotateY = (x / (box.width / 2)) * 6;
        setModalTiltStyle({
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.015)`,
            transition: "transform 0.08s cubic-bezier(0.25, 1, 0.5, 1)"
        });
    };

    const handleModalMouseLeave = () => {
        setModalTiltStyle({
            transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)",
            transition: "transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)"
        });
    };

    const nextModalImage = (e) => {
        e.stopPropagation();
        if (selectedProduct && selectedProduct.image) {
            setCurrentModalImageIndex((prevIndex) => (prevIndex + 1) % selectedProduct.image.length);
        }
    };

    const prevModalImage = (e) => {
        e.stopPropagation();
        if (selectedProduct && selectedProduct.image) {
            setCurrentModalImageIndex((prevIndex) => (prevIndex - 1 + selectedProduct.image.length) % selectedProduct.image.length);
        }
    };

    const handleAddToCart = () => {
        if (!selectedSize) return showToast("Lütfen bir beden seçin.");
        if (selectedProduct) {
            const isSizeSoldOut = selectedProduct.sold_out_sizes?.includes(selectedSize);
            if (selectedProduct.stock === 0 || isSizeSoldOut) return showToast("Bu ürün veya beden maalesef tükendi.");
            const existingItemIndex = cartItems.findIndex(item => item.id === selectedProduct.id && item.size === selectedSize);
            if (existingItemIndex > -1) {
                const updatedCartItems = [...cartItems];
                updatedCartItems[existingItemIndex].quantity += 1;
                setCartItems(updatedCartItems);
            } else {
                setCartItems([...cartItems, { ...selectedProduct, quantity: 1, size: selectedSize }]);
            }
            closeProductModal();
            setIsCartOpen(true);
        }
    };

    const removeFromCart = (itemToRemove) => {
        setRemovingId(`${itemToRemove.id}-${itemToRemove.size}`);
        setTimeout(() => {
            setCartItems(cartItems.filter(item => !(item.id === itemToRemove.id && item.size === itemToRemove.size)));
            setRemovingId(null);
            showToast("Ürün sepetten kaldırıldı.");
        }, 400);
    };

    const closeCart = () => {
        setIsCartClosing(true);
        setTimeout(() => {
            setIsCartOpen(false);
            setIsCartClosing(false);
        }, 300);
    };

    const handleApplyCoupon = async () => {
        const cleanInput = couponInput.trim(); 
        if (!cleanInput) return;
        const today = new Date().toISOString().split('T')[0]; 
        const { data, error } = await supabase.from("coupons").select("*").ilike("code", cleanInput);

        if (error || !data || data.length === 0) {
            setDiscount(0); setAppliedCouponCode(""); return showToast("Geçersiz kupon kodu!");
        }
        const coupon = data[0];
        if (!coupon.is_active) {
            setDiscount(0); setAppliedCouponCode(""); return showToast("Bu kupon artık geçerli değil!");
        }
        if (coupon.is_used) {
            setDiscount(0); setAppliedCouponCode(""); return showToast("Bu kupon kodu daha önce kullanılmış!");
        }
        if (coupon.expiry_date && coupon.expiry_date < today) {
            setDiscount(0); setAppliedCouponCode(""); return showToast("Bu kuponun son kullanma tarihi geçmiş!");
        }
        setDiscount(coupon.discount_percentage / 100);
        setAppliedCouponCode(coupon.code);
        showToast(`Kupon başarıyla uygulandı! %${coupon.discount_percentage} İndirim kazandınız.`);
    };

    const openTrackingModal = () => {
        setShowTrackingModal(true); setIsTrackingClosing(false);
        setSearchedOrder(null); setTrackingCodeInput(""); setTrackingError("");
    };

    const closeTrackingModal = () => {
        setIsTrackingClosing(true);
        setTimeout(() => { setShowTrackingModal(false); setIsTrackingClosing(false); }, 300);
    };

    const handleTrackOrder = async () => {
        if (!trackingCodeInput.trim()) return setTrackingError("Lütfen sipariş kodunuzu girin.");
        let cleanCode = trackingCodeInput.replace(/\s+/g, '').toUpperCase().replace(/-/g, '');
        if (!cleanCode.startsWith('ALC')) cleanCode = 'ALC' + cleanCode;
        if (cleanCode.length > 3 && cleanCode[3] !== '-') cleanCode = cleanCode.slice(0, 3) + '-' + cleanCode.slice(3);

        setIsTrackingLoading(true); setTrackingError(""); setSearchedOrder(null);
        const { data, error } = await supabase.from("orders").select("*").eq("order_code", cleanCode);
        setIsTrackingLoading(false);

        if (error || !data || data.length === 0) return setTrackingError("Sipariş bulunamadı. Lütfen kodu kontrol edin.");
        setSearchedOrder(data[0]);
    };

    const handleContactFormSubmit = async (e) => {
        e.preventDefault();
        try {
            await emailjs.sendForm("service_iyppib9", "template_ftuypl8", form.current, "5dI_FI0HT2oHrlQj5");
            showToast("Mesajınız başarıyla gönderildi!");
            e.target.reset();
        } catch (error) {
            showToast("Mesajınız gönderilirken bir hata oluştu.");
        }
    };

    const closeMobileMenu = () => {
        if (!isMobileMenuOpen) return;
        setIsMobileMenuClosing(true);
        setTimeout(() => { setIsMobileMenuOpen(false); setIsMobileMenuClosing(false); }, 350);
    };

    const toggleMobileMenu = () => {
        if (isMobileMenuOpen) closeMobileMenu();
        else setIsMobileMenuOpen(true);
    };

    const handleNavLinkClick = (sectionId, customAction = null) => {
        if (customAction) customAction();
        else {
            setCurrentSection(sectionId);
            const element = document.getElementById(sectionId);
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (isMobileMenuOpen) closeMobileMenu(); 
    };

    return (
        <>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
                @keyframes slide-up { from { transform: scale(0.95) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                @keyframes slide-down { from { transform: scale(1) translateY(0); opacity: 1; } to { transform: scale(0.95) translateY(20px); opacity: 0; } }
                @keyframes cart-slide-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
                @keyframes spin { to { transform: rotate(360deg); } }

                .spinner {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 3px solid rgba(128, 128, 128, 0.3);
                    border-radius: 50%;
                    border-top-color: currentColor;
                    animation: spin 0.8s ease-in-out infinite;
                }

                @keyframes avatar-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
                @keyframes avatar-head-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
                @keyframes avatar-arm-sway-left { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-8deg); } }
                @keyframes avatar-arm-sway-right { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(8deg); } }

                .avatar-breathing-layer { animation: avatar-breathe 2s ease-in-out infinite; transform-origin: bottom center; }
                .avatar-head { animation: avatar-head-bob 2s ease-in-out infinite; transform-origin: 18px 11px; }
                .avatar-arm-left { animation: avatar-arm-sway-left 2s ease-in-out infinite; transform-origin: 8.5px 22.5px; }
                .avatar-arm-right { animation: avatar-arm-sway-right 2s ease-in-out infinite; transform-origin: 27.5px 22.5px; }

                /* CSS kısaltıldı... Eski tasarımlarının hepsi aynı şekilde korunuyor */
                
                .product-card.reveal { opacity: 0; transform: translateY(40px) scale(0.98); transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1); position: relative; }
                .product-card.reveal.active { opacity: 1; transform: translateY(0) scale(1); }
                .product-card.sold-out { opacity: 0.55; }
                .sold-out-badge { position: absolute; top: 12px; left: 12px; background-color: #ff3b30; color: #fff; font-size: 10px; font-weight: 800; padding: 5px 10px; letter-spacing: 1.5px; text-transform: uppercase; z-index: 10; border-radius: 2px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
                
                .size-select button.size-sold-out { opacity: 0.35; text-decoration: line-through; cursor: not-allowed; background-color: rgba(0,0,0,0.05); }
                body.dark-mode .size-select button.size-sold-out { background-color: rgba(255,255,255,0.05); }

                .marquee-wrapper { width: 100%; overflow: hidden; background-color: #000; color: #fff; padding: 10px 0; user-select: none; display: flex; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
                body.dark-mode .marquee-wrapper { background-color: #111; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
                .marquee-track { display: flex; width: max-content; animation: marquee-anim 25s linear infinite; }
                .marquee-track span { font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; white-space: nowrap; padding-right: 40px; flex-shrink: 0; }
                @keyframes marquee-anim { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

                nav { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background-color: #fff; position: relative; z-index: 999999; }
                body.dark-mode nav { background-color: #111; }
                
                .cart-panel { z-index: 1000001; }
                .cart-panel.closing { animation: cart-slide-out 0.3s ease forwards; }
                .toast-container { z-index: 9999999; }
                
                /* Responsive Menu & Hamburgers styles (Önceki kodunla birebir aynı) */
                @media (max-width: 768px) {
                    nav ul.nav-menu { display: flex; flex-direction: column; position: fixed; top: 0; right: 0; width: 280px; height: 100vh; background-color: #fff; padding: 80px 0 0 0; z-index: 1000000; transform: translateX(100%); opacity: 0; visibility: hidden; transition: transform 0.35s cubic-bezier(0.32, 0.94, 0.6, 1), opacity 0.3s ease, visibility 0.35s; }
                    body.dark-mode nav ul.nav-menu { background-color: #1a1a1a; color: #fff; }
                    nav ul.nav-menu.open { transform: translateX(0); opacity: 1; visibility: visible; }
                    nav ul.nav-menu.closing { transform: translateX(100%); opacity: 0; transition: transform 0.35s cubic-bezier(0.4, 0, 1, 1), opacity 0.3s ease; }
                    nav ul.nav-menu li { width: 100%; padding: 18px 25px; text-align: left; border-bottom: 1px solid rgba(128, 128, 128, 0.1); cursor: pointer; }
                }
                @media (min-width: 769px) { 
                    nav ul.nav-menu { display: flex; gap: 35px; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); opacity: 1; visibility: visible; }
                }
            `}</style>

            <nav>
                <h1>ALICCI</h1>
                <ul className={`nav-menu ${isMobileMenuOpen ? "open" : ""} ${isMobileMenuClosing ? "closing" : ""}`}>
                    <li onClick={() => handleNavLinkClick("home")}>Ana Sayfa</li>
                    <li onClick={() => handleNavLinkClick("products")}>Ürünler</li>
                    <li onClick={() => handleNavLinkClick("about")}>Hakkımızda</li>
                    <li onClick={() => handleNavLinkClick("contact")}>İletişim</li>
                    <li onClick={() => handleNavLinkClick(null, openTrackingModal)}>Kargo Takip</li>
                    <li className="mobile-cart-button" onClick={() => {
                        if (isCartOpen) closeCart();
                        else setIsCartOpen(true);
                        closeMobileMenu();
                    }}>
                        Sepetim {cartItems.length > 0 && `(${cartItems.length})`}
                    </li>
                    <li className="mobile-theme-toggle" onClick={toggleDarkMode}>
                        {isDarkMode ? "☀️ Açık Temaya Geç" : "🌙 Karanlık Temaya Geç"}
                    </li>
                </ul>

                <div className="nav-controls">
                    <button className="theme-toggle-btn" onClick={toggleDarkMode}>
                        {isDarkMode ? "☀️" : "🌙"}
                    </button>
                    <div className="hamburger" onClick={toggleMobileMenu}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        {cartItems.length > 0 && <span className="cart-count mobile-hamburger-cart-count">{cartItems.length}</span>}
                    </div>
                </div>
            </nav>

            <div className="marquee-wrapper">
                <div className="marquee-track">
                    <span>LIMITED DROP • TIMELESS PIECES • %100 PREMIUM COTTON • SHIPPED IN 24H • DISCOVER THE ART OF STREETWEAR • ALICCI • LIMITED DROP • TIMELESS PIECES • %100 PREMIUM COTTON • SHIPPED IN 24H • DISCOVER THE ART OF STREETWEAR • ALICCI •</span>
                    <span>LIMITED DROP • TIMELESS PIECES • %100 PREMIUM COTTON • SHIPPED IN 24H • DISCOVER THE ART OF STREETWEAR • ALICCI • LIMITED DROP • TIMELESS PIECES • %100 PREMIUM COTTON • SHIPPED IN 24H • DISCOVER THE ART OF STREETWEAR • ALICCI •</span>
                </div>
            </div>

            {/* Backdrop elements ... */}
            {(isMobileMenuOpen || isMobileMenuClosing) && ( <div className="modal-backdrop menu-backdrop" onClick={closeMobileMenu} style={{ animation: isMobileMenuClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards" }} /> )}
            {(isCartOpen || isCartClosing) && ( <div className="modal-backdrop cart-backdrop" onClick={closeCart} style={{ animation: isCartClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards", zIndex: 100000 }} /> )}

            <div className={`cart-panel ${isCartOpen ? "open" : ""} ${isCartClosing ? "closing" : ""}`}>
                <h3>Sepetiniz</h3>
                <ul>
                    {cartItems.length === 0 ? (
                        <p>Sepetinizde ürün bulunmamaktadır.</p>
                    ) : (
                        cartItems.map((item, index) => (
                            <li key={`${item.id}-${item.size}-${index}`} className={removingId === `${item.id}-${item.size}` ? 'removing' : ''}>
                                <div className="item-details">
                                    <span>{item.name} ({item.size})</span>
                                    <span className="item-quantity">Adet: {item.quantity} x {item.price} TL</span>
                                </div>
                                <button className="remove-item-button" onClick={() => removeFromCart(item)}>&times;</button>
                            </li>
                        ))
                    )}
                </ul>
                {cartItems.length > 0 && (
                    <div className="coupon-container">
                        <input type="text" placeholder="Kupon Kodu" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
                        <button className="coupon-btn" onClick={handleApplyCoupon}>Uygula</button>
                    </div>
                )}
                {cartItems.length > 0 && (
                    <div className="total">
                        Toplam: {getTotalPrice()} TL 
                        {discount > 0 && <span className="discount-label"> (%{(discount * 100)} İndirim Uygulandı)</span>}
                    </div>
                )}
                <button onClick={handleCheckout}>Sepeti Onayla</button>
                <button className="close-modal close-modal-small" onClick={closeCart}>&times;</button>
            </div>

            <main>
                <section id="home" className="hero">
                    <h2>ALICCI'ye Hoş Geldiniz</h2>
                    <p>En zarif ve şık giyim parçalarını keşfedin.</p>
                    <button onClick={() => handleNavLinkClick("products")}>Koleksiyonu Keşfet</button>
                </section>

                <section id="products" className="products">
                    <h3>Ürünlerimiz</h3>
                    <div className="products-grid">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="product-card skeleton-card"><div className="skeleton-image"></div><div className="info"><div className="skeleton-text"></div></div></div>
                            ))
                        ) : (
                            products.map((product) => <ProductCard key={product.id} product={product} openProductModal={openProductModal} closeCart={closeCart} />)
                        )}
                    </div>
                </section>
                
                {/* About & Contact ... */}
                <section id="contact" className="contact reveal">
                    <h3>İletişim</h3>
                    <form ref={form} onSubmit={handleContactFormSubmit}>
                        <input type="text" name="user_name" placeholder="Adınız Soyadınız" required />
                        <input type="email" name="user_email" placeholder="E-posta Adresiniz" required />
                        <textarea name="message" placeholder="Mesajınız" required></textarea>
                        <button type="submit">Gönder</button>
                    </form>
                </section>
            </main>

            <footer>
                <p>&copy; 2025 ALICCI. Tüm Hakları Saklıdır.</p>
            </footer>

            {/* YENİ: İYZİCO ÖDEME MODALI */}
            {showPaymentModal && (
                <div 
                    className="modal-backdrop" 
                    onClick={closePaymentModal} 
                    style={{ 
                        zIndex: 1000005,
                        animation: isPaymentClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards" 
                    }}
                >
                    <div 
                        className="modal-content-base payment-modal-content" 
                        onClick={(e) => e.stopPropagation()} 
                        style={{ 
                            animation: isPaymentClosing ? "slide-down 0.3s ease forwards" : "slide-up 0.3s ease forwards", 
                            maxWidth: '550px', 
                            width: '90%',
                            minHeight: '400px', 
                            display: 'flex', 
                            flexDirection: 'column',
                            padding: '30px 20px',
                            backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
                            color: isDarkMode ? '#fff' : '#000',
                            borderRadius: '12px'
                        }}
                    >
                        <button 
                            className="close-modal close-modal-small" 
                            onClick={closePaymentModal}
                            style={{ color: isDarkMode ? '#fff' : '#000', right: '15px', top: '15px' }}
                        >&times;</button>
                        
                        <h2 style={{ marginBottom: '5px', fontSize: '20px', borderBottom: isDarkMode ? '1px solid #333' : '1px solid #eee', paddingBottom: '15px' }}>
                            Güvenli Ödeme
                        </h2>
                        
                        {isInitializingPayment ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '300px' }}>
                                <span className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', marginBottom: '20px', borderTopColor: isDarkMode ? '#fff' : '#000' }}></span>
                                <p style={{ fontWeight: '500', fontSize: '14px', opacity: 0.8 }}>Ödeme altyapısı hazırlanıyor...</p>
                            </div>
                        ) : (
                            <div 
                                id="iyzico-script-container" 
                                style={{ flex: 1, width: '100%', minHeight: '300px', marginTop: '15px' }}
                            >
                                {/* İyzico HTML + Scriptleri buraya enjekte edilecek */}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Ürün & Beden Hesaplama Modalları ... (Önceki kodun aynısı) */}
            
            {toast && (
                <div className="toast-container">
                    <div className="toast-message">{toast}</div>
                </div>
            )}

            <Analytics />
        </>
    );
}

export default App;
