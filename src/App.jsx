import React, { useState, useRef, useEffect } from "react";
import emailjs from "emailjs-com";
import "./index.css";
import { supabase } from "./supabaseclient";

const ProductCard = ({ product, openProductModal, setIsCartOpen }) => {
    const [hoveredImageIndex, setHoveredImageIndex] = useState(0);

    const handleMouseMove = (e) => {
        if (!product.image || product.image.length <= 1) {
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
        setIsCartOpen(false);
        openProductModal(product);
    };

    return (
        <div
            className="product-card"
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <img
                src={product.image[hoveredImageIndex]}
                alt={product.name}
                className="product-card-image"
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
    const [selectedSize, setSelectedSize] = useState("");
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [currentModalImageIndex, setCurrentModalImageIndex] = useState(0);
    const [showOrderOptionsModal, setShowOrderOptionsModal] = useState(false);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [orderCode, setOrderCode] = useState("");
    const [trackingInfo, setTrackingInfo] = useState(null);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentSection, setCurrentSection] = useState("home");

    const form = useRef();

    const WHATSAPP_NUMBER = "905511903118";
    const INSTAGRAM_USERNAME = "alicci.official";

    useEffect(() => {
        const fetchProducts = async () => {
            const { data, error } = await supabase.from("products").select("*");
            if (error) {
                console.error("Ürünler çekilirken hata oluştu:", error);
            } else {
                setProducts(data);
            }
        };

        fetchProducts();
    }, []);

    useEffect(() => {
        const storedCartItems = localStorage.getItem("alicciCartItems");
        if (storedCartItems) {
            try {
                setCartItems(JSON.parse(storedCartItems));
            } catch (e) {
                console.error("Sepet öğeleri yüklenirken hata oluştu:", e);
                localStorage.removeItem("alicciCartItems");
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("alicciCartItems", JSON.stringify(cartItems));
    }, [cartItems]);

    const openProductModal = (product) => {
        setSelectedProduct(product);
        setCurrentModalImageIndex(0);
        setSelectedSize("");
    };

    const closeProductModal = () => {
        setSelectedProduct(null);
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
            alert("Lütfen bir beden seçin.");
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
            setSelectedProduct(null);
            setIsCartOpen(true);
        }
    };

    const removeFromCart = (itemToRemove) => {
        setCartItems(
            cartItems.filter(
                (item) => !(item.id === itemToRemove.id && item.size === itemToRemove.size)
            )
        );
    };

    const getTotalPrice = () => {
        return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    };

    const handleCheckout = () => {
        if (cartItems.length === 0) {
            alert("Sepetiniz boş.");
            return;
        }
        setIsCartOpen(false);
        setShowOrderOptionsModal(true);
    };

    const closeOrderOptionsModal = () => {
        setShowOrderOptionsModal(false);
    };

    const openTrackingModal = () => {
        setShowTrackingModal(true);
        setTrackingInfo(null);
        setOrderCode("");
    };

    const closeTrackingModal = () => {
        setShowTrackingModal(false);
        setTrackingInfo(null);
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
            alert("Mesajınız başarıyla gönderildi!");
            e.target.reset();
        } catch (error) {
            console.error("Mesaj gönderilirken hata oluştu:", error);
            alert("Mesajınız gönderilirken bir hata oluştu. Lütfen tekrar deneyin.");
        }
    };

    const openConfirmationModal = () => {
        setShowConfirmationModal(true);
    };

    const closeConfirmationModal = () => {
        setShowConfirmationModal(false);
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const handleNavLinkClick = (sectionId, customAction = null) => {
        if (customAction) {
            customAction();
        } else {
            setCurrentSection(sectionId);
            document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            <nav>
                <h1>ALICCI</h1>
                <ul className={`nav-menu ${isMobileMenuOpen ? "open" : ""}`}>
                    <li onClick={() => handleNavLinkClick("home")}>Ana Sayfa</li>
                    <li onClick={() => handleNavLinkClick("products")}>Ürünler</li>
                    <li onClick={() => handleNavLinkClick("about")}>Hakkımızda</li>
                    <li onClick={() => handleNavLinkClick("contact")}>İletişim</li>
                    <li onClick={() => handleNavLinkClick(null, openTrackingModal)}>
                        Kargo Takip
                    </li>
                    {/* Move cart button inside mobile menu */}
                    <li className="mobile-cart-button" onClick={() => setIsCartOpen(!isCartOpen)}>
                        Sepetim {cartItems.length > 0 && `(${cartItems.length})`}
                    </li>
                </ul>

                <div className="hamburger" onClick={toggleMobileMenu}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-menu">
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

                {/* Removed standalone cart icon */}
            </nav>

            <div className={`cart-panel ${isCartOpen ? "open" : ""}`}>
                <h3>Sepetiniz</h3>
                <ul>
                    {cartItems.length === 0 ? (
                        <p>Sepetinizde ürün bulunmamaktadır.</p>
                    ) : (
                        cartItems.map((item, index) => (
                            <li key={`${item.id}-${item.size}-${index}`}>
                                <div className="item-details">
                                    <span>
                                        {item.name} ({item.size})
                                    </span>
                                    <span className="item-quantity">
                                        Adet: {item.quantity} x {item.price} TL
                                    </span>
                                </div>
                                <button
                                    className="remove-item-button"
                                    onClick={() => removeFromCart(item)}
                                >
                                    &times;
                                </button>
                            </li>
                        ))
                    )}
                </ul>
                {cartItems.length > 0 && (
                    <div className="total">Toplam: {getTotalPrice()} TL</div>
                )}
                <button onClick={handleCheckout}>Sepeti Onayla</button>
                <button className="close-modal close-modal-small" onClick={() => setIsCartOpen(false)}>
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
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                openProductModal={openProductModal}
                                setIsCartOpen={setIsCartOpen}
                            />
                        ))}
                    </div>
                </section>

                <section id="about" className="about">
                    <h3>Hakkımızda</h3>
                    <p>
                        ALICCI, zamansız şıklığı ve modern tasarımları bir araya getiren bir giyim markasıdır. Her parçamız, kaliteden ödün vermeden özenle tasarlanır ve üretilir. Müşterilerimize sadece giysi değil, aynı zamanda kendilerini özel hissedecekleri bir deneyim sunmayı hedefliyoruz.
                    </p>
                    <p>
                        Sürdürülebilir moda ilkelerini benimseyerek, çevreye duyarlı üretim süreçlerini destekliyor ve uzun ömürlü, kaliteli ürünler sunmaya özen gösteriyoruz. ALICCI ile gardırobunuzda fark yaratın.
                    </p>
                </section>

                <section id="contact" className="contact">
                    <h3>İletişim</h3>
                    <p>Sorularınız veya geri bildirimleriniz için bize ulaşın.</p>
                    <form ref={form} onSubmit={handleContactFormSubmit}>
                        <input type="text" name="user_name" placeholder="Adınız Soyadınız" required />
                        <input type="email" name="user_email" placeholder="E-posta Adresiniz" required />
                        <textarea name="message" placeholder="Mesajınız" required></textarea>
                        <button type="submit">Gönder</button>
                    </form>
                    <div className="contact-dm-buttons">
                        <a
                            href={`https://wa.me/${WHATSAPP_NUMBER}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="themed-social-button whatsapp-contact"
                        >
                            WhatsApp ile İletişime Geç
                        </a>
                        <a
                            href={`https://www.instagram.com/${INSTAGRAM_USERNAME}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="themed-social-button instagram-contact"
                        >
                            Instagram ile İletişime Geç
                        </a>
                    </div>
                </section>
            </main>

            <footer>
                <p>&copy; 2025 ALICCI. Tüm Hakları Saklıdır.</p>
                <div className="instagram">
                    <a href={`https://www.instagram.com/${INSTAGRAM_USERNAME}`} target="_blank" rel="noopener noreferrer">
                        Instagram
                    </a>
                </div>
            </footer>

            {selectedProduct && (
                <div className="modal-backdrop" onClick={closeProductModal}>
                    <div className="modal-content-base product-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal close-modal-small" onClick={closeProductModal}>
                            &times;
                        </button>
                        <div className="product-modal-image-wrapper">
                            <img
                                src={selectedProduct.image[currentModalImageIndex]}
                                alt={selectedProduct.name}
                                className="product-modal-image"
                                // Adjusted styling for larger images in modal
                                style={{
                                    maxHeight: '80vh', /* Increased max-height */
                                    width: 'auto',
                                    maxWidth: '100%',
                                    objectFit: 'contain'
                                }}
                            />
                            {selectedProduct.image && selectedProduct.image.length > 1 && (
                                <div className="modal-image-navigation">
                                    <button className="modal-nav-arrow left" onClick={prevModalImage}>
                                        &#x2039;
                                    </button>
                                    <button className="modal-nav-arrow right" onClick={nextModalImage}>
                                        &#x203A;
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="product-info">
                            <h2>{selectedProduct.name}</h2>
                            <p className="desc">
                                {selectedProduct.description || "Bu ürün ALICCI koleksiyonunun zarif parçalarındandır."}
                            </p>
                            <div className="size-select">
                                <p>Beden Seç:</p>
                                {(selectedProduct.sizes && selectedProduct.sizes.length > 0
                                    ? selectedProduct.sizes
                                    : ["S", "M", "L", "XL", "XXL"]
                                ).map((size) => (
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
                                className="add-to-cart-button"
                                onClick={handleAddToCart}
                                disabled={!selectedSize}
                            >
                                Sepete Ekle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showOrderOptionsModal && (
                <div className="modal-backdrop" onClick={closeOrderOptionsModal}>
                    <div className="modal-content-base order-options-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal close-modal-small" onClick={closeOrderOptionsModal}>
                            &times;
                        </button>
                        <h2>Siparişinizi Tamamlayın</h2>
                        <p>Siparişiniz için ödeme yapmak üzere bizimle iletişime geçebilirsiniz:</p>
                        <div className="contact-dm-buttons">
                            <a
                                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="themed-social-button whatsapp-contact"
                                onClick={() => {
                                    const message = `Merhaba, sepetimdeki ürünleri sipariş etmek istiyorum:\n${cartItems.map(item => `- ${item.name} (${item.size}) x${item.quantity}`).join('\n')}\nToplam: ${getTotalPrice()} TL`;
                                    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
                                    setShowOrderOptionsModal(false);
                                    setCartItems([]);
                                    openConfirmationModal();
                                }}
                            >
                                WhatsApp ile Sipariş Ver
                            </a>
                            <a
                                href={`https://www.instagram.com/${INSTAGRAM_USERNAME}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="themed-social-button instagram-contact"
                                onClick={() => {
                                    setShowOrderOptionsModal(false);
                                    setCartItems([]);
                                    openConfirmationModal();
                                }}
                            >
                                Instagram DM ile Sipariş Ver
                            </a>
                        </div>
                        <p className="small-text">
                            Siparişiniz ödeme yapıldıktan sonra işleme alınacaktır.
                        </p>
                    </div>
                </div>
            )}

            {showTrackingModal && (
                <div className="modal-backdrop" onClick={closeTrackingModal}>
                    <div className="modal-content-base tracking-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal close-modal-small" onClick={closeTrackingModal}>
                            &times;
                        </button>
                        <h2>Kargo Takip Bilgisi İçin İletişime Geçin</h2>
                        <p>Kargonuzun durumu hakkında bilgi almak için aşağıdaki kanallardan bize ulaşabilirsiniz:</p>
                        <div className="contact-dm-buttons tracking-dm-buttons">
                            <a
                                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="themed-social-button whatsapp-contact"
                            >
                                WhatsApp Destek
                            </a>
                            <a
                                href={`https://www.instagram.com/${INSTAGRAM_USERNAME}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="themed-social-button instagram-contact"
                            >
                                Instagram Destek
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmationModal && (
                <div className="modal-backdrop" onClick={closeConfirmationModal}>
                    <div className="modal-content-base order-confirmation" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal close-modal-small" onClick={closeConfirmationModal}>
                            &times;
                        </button>
                        <h2>Bizimle İletişime Geçtiğiniz İçin Teşekkürler!</h2>
                        <p>
                            Siparişiniz için teşekkür ederiz. Ödeme bilgilerini iletmek ve siparişinizi tamamlamak için en kısa sürede sizinle iletişime geçilecektir.
                        </p>
                        <p>Bizi tercih ettiğiniz için teşekkür ederiz.</p>
                        <button onClick={closeConfirmationModal}>Kapat</button>
                    </div>
                </div>
            )}
        </>
    );
}

export default App;