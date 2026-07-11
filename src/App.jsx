import React, { useState, useRef, useEffect } from "react";
import emailjs from "emailjs-com";
import "./index.css";
import { Analytics } from "@vercel/analytics/react";
import { supabase } from "./supabaseclient";

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

    const handleMouseLeave = () => {
        setHoveredImageIndex(0);
    };

    const handleClick = () => {
        if (closeCart) closeCart();
        openProductModal(product);
    };

    return (
        <div
            className="product-card reveal"
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
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
    const [showOrderOptionsModal, setShowOrderOptionsModal] = useState(false);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [isTrackingClosing, setIsTrackingClosing] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileMenuClosing, setIsMobileMenuClosing] = useState(false); 
    const [currentSection, setCurrentSection] = useState("home");
    const [isLoading, setIsLoading] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [couponInput, setCouponInput] = useState("");
    const [discount, setDiscount] = useState(0);
    const [toast, setToast] = useState(null);
    const [removingId, setRemovingId] = useState(null);

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
        }, { threshold: 0.1 });

        const revealElements = document.querySelectorAll(".reveal");
        revealElements.forEach((el) => observer.observe(el));

        return () => {
            revealElements.forEach((el) => observer.unobserve(el));
        };
    }, [products, isLoading]);

    useEffect(() => {
        setDiscount(0);
        setCouponInput("");
    }, [cartItems]);

    useEffect(() => {
        const preventInstallPrompt = (e) => {
            e.preventDefault();
        };
        window.addEventListener("beforeinstallprompt", preventInstallPrompt);
        return () => window.removeEventListener("beforeinstallprompt", preventInstallPrompt);
    }, []);

    useEffect(() => {
        const savedTheme = localStorage.getItem("darkMode") === "true";
        setIsDarkMode(savedTheme);
        if (savedTheme) {
            document.body.classList.add("dark-mode");
        }
    }, []);

    const toggleDarkMode = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        localStorage.setItem("darkMode", newTheme);
        if (newTheme) {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.remove("dark-mode");
        }
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
                        if (Array.isArray(rawImg)) {
                            finalImages = rawImg;
                        } else if (typeof rawImg === "string") {
                            if (rawImg.startsWith("[") && rawImg.endsWith("]")) {
                                try {
                                    finalImages = JSON.parse(rawImg);
                                } catch (e) {
                                    finalImages = [rawImg];
                                }
                            } else {
                                finalImages = [rawImg];
                            }
                        }
                    }
                    
                    return {
                        ...prod,
                        image: finalImages
                    };
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
            try {
                setCartItems(JSON.parse(storedCartItems));
            } catch (e) {
                console.error("Sepet verisi yüklenirken hata:", e);
                localStorage.removeItem("alicciCartItems");
            }
        }
    }, []);
    
    useEffect(() => {
        localStorage.setItem("alicciCartItems", JSON.stringify(cartItems));
    }, [cartItems]);

    useEffect(() => {
        const isAnyModalOpen = selectedProduct || showOrderOptionsModal || showConfirmationModal || showTrackingModal || isCartOpen;
        if (isAnyModalOpen) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
        return () => {
            document.body.classList.remove('no-scroll');
        };
    }, [selectedProduct, showOrderOptionsModal, showConfirmationModal, showTrackingModal, isCartOpen]);

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

    const nextModalImage = (e) => {
        e.stopPropagation();
        if (selectedProduct && selectedProduct.image) {
            setCurrentModalImageIndex((prevIndex) =>
                (prevIndex + 1) % selectedProduct.image.length
            );
        }
    };

    const prevModalImage = (e) => {
        e.stopPropagation();
        if (selectedProduct && selectedProduct.image) {
            setCurrentModalImageIndex((prevIndex) =>
                (prevIndex - 1 + selectedProduct.image.length) % selectedProduct.image.length
            );
        }
    };

    const handleAddToCart = () => {
        if (!selectedSize) {
            showToast("Lütfen bir beden seçin.");
            return;
        }
        if (selectedProduct) {
            const existingItemIndex = cartItems.findIndex(
                (item) => item.id === selectedProduct.id && item.size === selectedSize
            );

            if (existingItemIndex > -1) {
                const updatedCartItems = [...cartItems];
                updatedCartItems[existingItemIndex].quantity += 1;
                setCartItems(updatedCartItems);
            } else {
                setCartItems([
                    ...cartItems,
                    { ...selectedProduct, quantity: 1, size: selectedSize },
                ]);
            }
            closeProductModal();
            setIsCartOpen(true);
        }
    };

    const removeFromCart = (itemToRemove) => {
        const uniqueId = `${itemToRemove.id}-${itemToRemove.size}`;
        setRemovingId(uniqueId);

        setTimeout(() => {
            setCartItems(
                cartItems.filter(
                    (item) => !(item.id === itemToRemove.id && item.size === itemToRemove.size)
                )
            );
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

        const { data, error } = await supabase
            .from("coupons")
            .select("*")
            .ilike("code", cleanInput) 
            .eq("is_active", true);

        if (error || !data || data.length === 0) {
            setDiscount(0);
            showToast("Kupon bulunamadı.");
            return;
        }

        const coupon = data[0];
        const discountValue = coupon.discount_percentage / 100;
        setDiscount(discountValue);
        showToast(`Kupon başarıyla uygulandı! %${coupon.discount_percentage} İndirim kazandınız.`);
    };
    
    const getTotalPrice = () => {
        const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
        const finalTotal = subtotal - (subtotal * discount);
        return Number.isInteger(finalTotal) ? finalTotal : finalTotal.toFixed(2);
    };

    const handleCheckout = () => {
        if (cartItems.length === 0) {
            showToast("Sepetiniz boş.");
            return;
        }
        closeCart(); 
        setTimeout(() => {
            setShowOrderOptionsModal(true);
        }, 300); 
    };

    const closeOrderOptionsModal = () => {
        setShowOrderOptionsModal(false);
    };

    const openTrackingModal = () => {
        setShowTrackingModal(true);
        setIsTrackingClosing(false);
    };

    const closeTrackingModal = () => {
        setIsTrackingClosing(true);
        setTimeout(() => {
            setShowTrackingModal(false);
            setIsTrackingClosing(false);
        }, 300);
    };

    const handleContactFormSubmit = async (e) => {
        e.preventDefault();

        try {
            await emailjs.sendForm(
                "service_iyppib9",
                "template_ftuypl8",
                form.current,
                "5dI_FI0HT2oHrlQj5"
            );
            showToast("Mesajınız başarıyla gönderildi!");
            e.target.reset();
        } catch (error) {
            console.error("Mesaj gönderilirken hata oluştu:", error);
            showToast("Mesajınız gönderilirken bir hata oluştu. Lütfen tekrar deneyin.");
        }
    };

    const openConfirmationModal = () => {
        setShowConfirmationModal(true);
    };

    const closeConfirmationModal = () => {
        setShowConfirmationModal(false);
    };

    const closeMobileMenu = () => {
        if (!isMobileMenuOpen) return;
        setIsMobileMenuClosing(true);
        setTimeout(() => {
            setIsMobileMenuOpen(false);
            setIsMobileMenuClosing(false);
        }, 300);
    };

    const toggleMobileMenu = () => {
        if (isMobileMenuOpen) {
            closeMobileMenu();
        } else {
            setIsMobileMenuOpen(true);
        }
    };

    const handleNavLinkClick = (sectionId, customAction = null) => {
        if (customAction) {
            customAction();
        } else {
            setCurrentSection(sectionId);
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        if (isMobileMenuOpen) {
            closeMobileMenu(); 
        }
    };

    return (
        <>
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
                @keyframes slide-up { from { transform: scale(0.95) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                @keyframes slide-down { from { transform: scale(1) translateY(0); opacity: 1; } to { transform: scale(0.95) translateY(20px); opacity: 0; } }
                @keyframes menu-slide-in { from { opacity: 0; transform: translateY(-15px); } to { opacity: 1; transform: translateY(0); } }
                
                @keyframes menu-slide-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-15px); pointer-events: none; } }
                @keyframes cart-slide-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }

                .cart-panel { z-index: 1001 !important; }
                .cart-panel.closing { animation: cart-slide-out 0.3s ease forwards !important; }
                .nav-menu.closing { animation: menu-slide-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important; }

                /* TOAST BİLDİRİMİNİN EN ÜSTTE KALMASI İÇİN EKLENEN KISIM */
                .toast-container { z-index: 9999 !important; }

                @media (max-width: 768px) {
                    .nav-controls .theme-toggle-btn { display: none !important; }
                    .mobile-theme-toggle { display: block !important; margin-top: 10px; padding-top: 15px; border-top: 1px solid rgba(128, 128, 128, 0.2); color: inherit; font-weight: bold; }
                    .nav-menu.open { animation: menu-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                    body.dark-mode .nav-menu { background-color: #1a1a1a !important; color: #fff !important; }
                }

                @media (min-width: 769px) { .mobile-theme-toggle { display: none !important; } }
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                        {cartItems.length > 0 && (
                            <span className="cart-count mobile-hamburger-cart-count">
                                {cartItems.length}
                            </span>
                        )}
                    </div>
                </div>
            </nav>

            {(isCartOpen || isCartClosing) && (
                <div 
                    className="modal-backdrop cart-backdrop" 
                    onClick={closeCart} 
                    style={{ 
                        animation: isCartClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards",
                        zIndex: 1000 
                    }} 
                />
            )}

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
                                    <span className="item-quantity">
                                        Adet: {item.quantity} x {item.price} TL
                                    </span>
                                </div>
                                <button className="remove-item-button" onClick={() => removeFromCart(item)}>
                                    &times;
                                </button>
                            </li>
                        ))
                    )}
                </ul>

                {cartItems.length > 0 && (
                    <div className="coupon-container">
                        <input 
                            type="text" 
                            placeholder="Kupon Kodu" 
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value)}
                        />
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
                <button className="close-modal close-modal-small" onClick={closeCart}>
                    &times;
                </button>
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
                                <div key={index} className="product-card skeleton-card">
                                    <div className="skeleton-image"></div>
                                    <div className="info">
                                        <div className="skeleton-text"></div>
                                        <div className="skeleton-text short"></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    openProductModal={openProductModal}
                                    closeCart={closeCart}
                                />
                            ))
                        )}
                    </div>
                </section>

                <section id="about" className="about reveal">
                    <h3>Hakkımızda</h3>
                    <p>ALICCI, zamansız şıklığı ve modern tasarımları bir araya getiren bir giyim markasıdır.</p>
                    <p>Sürdürülebilir moda ilkelerini benimseyerek, çevreye duyarlı üretim süreçlerini destekliyor ve uzun ömürlü, kaliteli ürünler sunmaya özen gösteriyoruz.</p>
                </section>

                <section id="contact" className="contact reveal">
                    <h3>İletişim</h3>
                    <form ref={form} onSubmit={handleContactFormSubmit}>
                        <input type="text" name="user_name" placeholder="Adınız Soyadınız" required />
                        <input type="email" name="user_email" placeholder="E-posta Adresiniz" required />
                        <textarea name="message" placeholder="Mesajınız" required></textarea>
                        <button type="submit">Gönder</button>
                    </form>
                    <div className="contact-dm-buttons">
                        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="themed-social-button whatsapp-contact">WhatsApp ile İletişime Geç</a>
                        <a href={`https://www.instagram.com/${INSTAGRAM_USERNAME}`} target="_blank" rel="noopener noreferrer" className="themed-social-button instagram-contact">Instagram ile İletişime Geç</a>
                    </div>
                </section>
            </main>

            <footer>
                <p>&copy; 2025 ALICCI. Tüm Hakları Saklıdır.</p>
                <div className="instagram">
                    <a href={`https://www.instagram.com/${INSTAGRAM_USERNAME}`} target="_blank" rel="noopener noreferrer">Instagram</a>
                </div>
            </footer>

            {(selectedProduct || isProductClosing) && (
                <div className="modal-backdrop" onClick={closeProductModal} style={{ animation: isProductClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards" }}>
                    <div className="modal-content-base product-modal" onClick={(e) => e.stopPropagation()} style={{ animation: isProductClosing ? "slide-down 0.3s ease forwards" : "slide-up 0.3s ease forwards" }}>
                        <button className="close-modal close-modal-small" onClick={closeProductModal}>&times;</button>
                        {selectedProduct && (
                            <div className="product-modal-content-wrapper">
                                <div className="product-modal-image-wrapper">
                                    <img 
                                        src={selectedProduct.image ? selectedProduct.image[currentModalImageIndex] : "/logo.png"} 
                                        alt={selectedProduct.name} 
                                        className="product-modal-image zoomable-image" 
                                        style={{ maxHeight: '60vh', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} 
                                        loading="lazy"
                                    />
                                    {selectedProduct.image && selectedProduct.image.length > 1 && (
                                        <div className="modal-image-navigation">
                                            <button className="modal-nav-arrow left" onClick={prevModalImage}>&#x2039;</button>
                                            <button className="modal-nav-arrow right" onClick={nextModalImage}>&#x203A;</button>
                                        </div>
                                    )}
                                </div>
                                <div className="product-info-mobile-order">
                                    <h2>{selectedProduct.name}</h2>
                                    <p className="desc">{selectedProduct.description || "Bu ürün ALICCI koleksiyonunun zarif parçalarındandır."}</p>
                                    <div className="size-select">
                                        <p>Beden Seç:</p>
                                        {(selectedProduct.sizes && selectedProduct.sizes.length > 0 ? selectedProduct.sizes : ["S", "M", "L", "XL", "XXL"]).map((size) => (
                                            <button key={size} className={selectedSize === size ? "selected" : ""} onClick={() => setSelectedSize(size)}>{size}</button>
                                        ))}
                                    </div>
                                    <button className="add-to-cart-button" onClick={handleAddToCart} disabled={!selectedSize}>Sepete Ekle</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showOrderOptionsModal && (
                <div className="modal-backdrop" onClick={closeOrderOptionsModal}>
                    <div className="modal-content-base order-options-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal close-modal-small" onClick={closeOrderOptionsModal}>&times;</button>
                        <h2>Siparişinizi Tamamlayın</h2>
                        <p>Siparişiniz için ödeme yapmak üzere bizimle iletişime geçebilirsiniz:</p>
                        <div className="contact-dm-buttons">
                            <button className="themed-social-button whatsapp-contact" onClick={() => {
                                const message = `Merhaba, sepetimdeki ürünleri sipariş etmek istiyorum:\n${cartItems.map(item => `- ${item.name} (${item.size}) x${item.quantity}`).join('\n')}\nToplam: ${getTotalPrice()} TL`;
                                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
                                setShowOrderOptionsModal(false);
                                openConfirmationModal();
                            }}>WhatsApp ile Sipariş Ver</button>
                            <button className="themed-social-button instagram-contact" onClick={() => {
                                window.open(`https://www.instagram.com/${INSTAGRAM_USERNAME}`, '_blank');
                                setShowOrderOptionsModal(false);
                                openConfirmationModal();
                            }}>Instagram DM ile Sipariş Ver</button>
                        </div>
                    </div>
                </div>
            )}

            {showTrackingModal && (
                <div className="modal-backdrop" style={{ animation: isTrackingClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards" }} onClick={closeTrackingModal}>
                    <div className="modal-content-base tracking-modal-content" style={{ animation: isTrackingClosing ? "slide-down 0.3s ease forwards" : "slide-up 0.3s ease forwards" }} onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal close-modal-small" onClick={closeTrackingModal}>&times;</button>
                        <h2>Kargo Takip Bilgisi İçin İletişime Geçin</h2>
                        <div className="contact-dm-buttons tracking-dm-buttons">
                            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="themed-social-button whatsapp-contact">WhatsApp Destek</a>
                            <a href={`https://www.instagram.com/${INSTAGRAM_USERNAME}`} target="_blank" rel="noopener noreferrer" className="themed-social-button instagram-contact">Instagram Destek</a>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmationModal && (
                <div className="modal-backdrop" onClick={closeConfirmationModal}>
                    <div className="modal-content-base order-confirmation" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal close-modal-small" onClick={closeConfirmationModal}>&times;</button>
                        <h2>Yönlendiriliyorsunuz...</h2>
                        <p>Siparişinizi tamamlamak için lütfen açılan uygulamada mesajı <strong>göndermeyi unutmayın.</strong></p>
                        <button onClick={closeConfirmationModal}>Anladım</button>
                    </div>
                </div>
            )}
            
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
