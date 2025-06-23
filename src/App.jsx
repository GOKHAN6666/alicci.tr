import React, { useState, useRef, useEffect } from "react";
import emailjs from "emailjs-com";
import "./index.css"; // Ana stil dosyanızın yolu
import { supabase } from "./supabaseClient"; // Supabase client'ı import et

// ProductCard bileşeni: Ürün kartlarının üzerine gelindiğinde resim değiştirmeyi yönetir
const ProductCard = ({ product, openProductModal, setIsCartOpen }) => { // openProductModal prop olarak eklendi
    // Üzerine gelindiğinde gösterilecek resmin indeksi
    const [hoveredImageIndex, setHoveredImageIndex] = useState(0);

    // Fare ürün kartı üzerinde hareket ettiğinde resmin indeksini değiştir
    const handleMouseMove = (e) => {
        // Ürünün birden fazla resmi yoksa veya hiç resmi yoksa işlem yapma
        if (!product.image || product.image.length <= 1) {
            setHoveredImageIndex(0); // Tek resim varsa hep ilkini göster
            return;
        }

        const { currentTarget } = e;
        const { left, width } = currentTarget.getBoundingClientRect(); // Kartın konumu ve genişliği
        const mouseX = e.clientX - left; // Fare pozisyonu kartın sol kenarına göre

        // Kartı resim sayısına göre segmentlere ayır
        const segmentWidth = width / product.image.length;
        let newIndex = Math.floor(mouseX / segmentWidth); // Fare pozisyonuna göre yeni indeks

        // İndeksin sınırları içinde kalmasını sağla
        newIndex = Math.max(0, Math.min(newIndex, product.image.length - 1));

        // Eğer indeks değiştiyse state'i güncelle
        if (newIndex !== hoveredImageIndex) {
            setHoveredImageIndex(newIndex);
        }
    };

    // Fare karttan ayrıldığında ilk resme dön
    const handleMouseLeave = () => {
        setHoveredImageIndex(0);
    };

    const handleClick = () => {
        setIsCartOpen(false); // Ürüne tıklanınca sepeti kapat
        openProductModal(product); // Ürün modalını açmak için App'den gelen fonksiyonu kullan
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

// Ana Uygulama Bileşeni
function App() {
    // State Tanımlamaları
    const [products, setProducts] = useState([]); // Ürünleri tutar
    const [selectedProduct, setSelectedProduct] = useState(null); // Detayları gösterilecek ürünü tutar
    const [selectedSize, setSelectedSize] = useState(""); // Seçilen bedeni tutar
    const [cartItems, setCartItems] = useState([]); // Sepetteki ürünleri tutar
    const [isCartOpen, setIsCartOpen] = useState(false); // Sepet panelinin açık/kapalı durumu
    const [currentModalImageIndex, setCurrentModalImageIndex] = useState(0); // Ürün detay modalındaki resim indeksi
    const [showOrderOptionsModal, setShowOrderOptionsModal] = useState(false); // Sipariş seçenekleri modalı
    const [showTrackingModal, setShowTrackingModal] = useState(false); // Kargo takip modalı
    const [orderCode, setOrderCode] = useState(""); // Kargo takip kodu - Bu state artık kullanılmayacak ama kaldırmıyorum
    const [trackingInfo, setTrackingInfo] = useState(null); // Kargo takip bilgisi - Bu state artık kullanılmayacak ama kaldırmıyorum
    const [showConfirmationModal, setShowConfirmationModal] = useState(false); // Sipariş onay/başarı modalı
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobil menü açık/kapalı durumu
    const [currentSection, setCurrentSection] = useState("home"); // Aktif bölüm (navigasyon için)

    const form = useRef(); // EmailJS için referans - İletişim formu için kullanılacak

    // Sabit WhatsApp ve Instagram bilgileri
    const WHATSAPP_NUMBER = "905511903118"; // WhatsApp numarası '90' ülke kodu ile
    const INSTAGRAM_USERNAME = "alicci.official";
    // Eğer Instagram Direct linki için kullanıcı ID'si gerekirse:
    // const INSTAGRAM_USER_ID = "YOUR_INSTAGRAM_USER_ID"; // Bu alanı manuel olarak bulmanız gerekebilir
    // const INSTAGRAM_DIRECT_LINK = `https://www.instagram.com/direct/t/${INSTAGRAM_USER_ID}`;


    // Ürünleri Supabase'ten çekme
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

    // Sepet öğelerini localStorage'dan yükle (sayfa yenilendiğinde kalıcı olması için)
    useEffect(() => {
        const storedCartItems = localStorage.getItem("alicciCartItems");
        if (storedCartItems) {
            try {
                setCartItems(JSON.parse(storedCartItems));
            } catch (e) {
                console.error("Sepet öğeleri yüklenirken hata oluştu:", e);
                localStorage.removeItem("alicciCartItems"); // Bozuk veriyi temizle
            }
        }
    }, []);

    // Sepet öğeleri değiştiğinde localStorage'a kaydet
    useEffect(() => {
        localStorage.setItem("alicciCartItems", JSON.stringify(cartItems));
    }, [cartItems]);


    // Sepet ve diğer modal işlemlerini yöneten fonksiyonlar
    const openProductModal = (product) => {
        setSelectedProduct(product);
        setCurrentModalImageIndex(0); // Modalı açarken ilk resmi göster
        setSelectedSize(""); // Modal açıldığında bedeni sıfırla
    };

    const closeProductModal = () => {
        setSelectedProduct(null);
    };

    const nextModalImage = (e) => {
        e.stopPropagation(); // Modalın kapanmasını engelle
        if (selectedProduct && selectedProduct.image) {
            setCurrentModalImageIndex((prevIndex) =>
                (prevIndex + 1) % selectedProduct.image.length
            );
        }
    };

    const prevModalImage = (e) => {
        e.stopPropagation(); // Modalın kapanmasını engelle
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
            setSelectedProduct(null); // Modalı kapat
            setIsCartOpen(true); // Sepet panelini aç
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
        setIsCartOpen(false); // Sepeti kapat
        setShowOrderOptionsModal(true); // Sipariş seçenekleri modalını aç
    };

    const closeOrderOptionsModal = () => {
        setShowOrderOptionsModal(false);
    };

    // Kargo takip işlemleri
    const openTrackingModal = () => {
        setShowTrackingModal(true);
        // Bu modal artık trackingInfo veya orderCode kullanmayacak
        setTrackingInfo(null);
        setOrderCode("");
    };

    const closeTrackingModal = () => {
        setShowTrackingModal(false);
        setTrackingInfo(null);
    };

    // Kargo takip butonu artık bir şey yapmayacak, sadece iletişim butonları olacak
    // const handleTrackOrder = async () => { /* ... kaldırıldı ... */ };

    // İletişim Formu gönderme (EmailJS ile)
    const handleContactFormSubmit = async (e) => {
        e.preventDefault();

        try {
            // E-posta gönderme (EmailJS ile) - Kendi ID'lerinizi girmeyi unutmayın!
            await emailjs.sendForm(
                "YOUR_SERVICE_ID", // Kendi Service ID'niz
                "YOUR_TEMPLATE_ID_CONTACT", // İletişim Formu için ayrı bir Template ID'niz olabilir
                form.current,
                "YOUR_USER_ID" // Kendi User ID'niz (Public Key)
            );
            alert("Mesajınız başarıyla gönderildi!");
            e.target.reset(); // Formu temizle
        } catch (error) {
            console.error("Mesaj gönderilirken hata oluştu:", error);
            alert("Mesajınız gönderilirken bir hata oluştu. Lütfen tekrar deneyin.");
        }
    };

    // Sipariş Onay Modalını Açma
    const openConfirmationModal = () => {
        setShowConfirmationModal(true);
    };

    const closeConfirmationModal = () => {
        setShowConfirmationModal(false);
    };

    // Mobil menü toggle
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    // Navigasyon tıklamalarında mobil menüyü kapat ve ilgili bölüme git
    const handleNavLinkClick = (sectionId, customAction = null) => {
        if (customAction) {
            customAction(); // Özel bir eylem varsa onu çağır (örn: openTrackingModal)
        } else {
            setCurrentSection(sectionId);
            // Smooth scroll
            document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }
        setIsMobileMenuOpen(false); // Menüyü kapat
    };

    return (
        <>
            <nav>
                <h1>ALICCI</h1>
                <ul className={`nav-menu ${isMobileMenuOpen ? "open" : ""}`}>
                    {/* Masaüstü ve mobil menü öğeleri */}
                    <li onClick={() => handleNavLinkClick("home")}>Ana Sayfa</li>
                    <li onClick={() => handleNavLinkClick("products")}>Ürünler</li>
                    <li onClick={() => handleNavLinkClick("about")}>Hakkımızda</li>
                    <li onClick={() => handleNavLinkClick("contact")}>İletişim</li>
                    {/* Kargo Takip Linki */}
                    <li onClick={() => handleNavLinkClick(null, openTrackingModal)}>
                        Kargo Takip
                    </li>
                    {/* Mobil menüde sadece görünür sepet öğesi */}
                    <li className="mobile-only-cart-item">
                        <div className="cart-button" onClick={() => setIsCartOpen(!isCartOpen)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-shopping-cart">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            {cartItems.length > 0 && (
                                <span className="cart-count">{cartItems.length}</span>
                            )}
                        </div>
                    </li>
                </ul>

                <div className="hamburger" onClick={toggleMobileMenu}>
                    {/* Hamburger menü ikonu */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-menu">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                    {/* Hamburger ikonu yanında sepet sayısı (mobil için) */}
                    {cartItems.length > 0 && (
                        <span className="cart-count mobile-hamburger-cart-count">
                            {cartItems.length}
                        </span>
                    )}
                </div>

                {/* Masaüstü Sepet Butonu */}
                <div className="desktop-cart-button-wrapper">
                    <div className="cart-button" onClick={() => setIsCartOpen(!isCartOpen)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-shopping-cart">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        {cartItems.length > 0 && (
                            <span className="cart-count">{cartItems.length}</span>
                        )}
                    </div>
                </div>
            </nav>

            {/* Sepet Paneli */}
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
                                openProductModal={openProductModal} // openProductModal'ı ProductCard'a geçir
                                setIsCartOpen={setIsCartOpen} // setIsCartOpen'ı ProductCard'a geçir
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
                    {/* İletişim Formu */}
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
                            Instagram'dan Mesaj Gönder
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

            {/* Ürün Detay Modalı */}
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
                            />
                            {selectedProduct.image && selectedProduct.image.length > 1 && (
                                <div className="modal-image-navigation">
                                    <button className="modal-nav-arrow left" onClick={prevModalImage}>
                                        &#x2039; {/* Sol ok */}
                                    </button>
                                    <button className="modal-nav-arrow right" onClick={nextModalImage}>
                                        &#x203A; {/* Sağ ok */}
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
                                    : ["S", "M", "L", "XL"]
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

            {/* Sipariş Seçenekleri Modalı */}
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
                                    // WhatsApp'a sepettekileri otomatik mesaj olarak ekleme (isteğe bağlı)
                                    const message = `Merhaba, sepetimdeki ürünleri sipariş etmek istiyorum:\n${cartItems.map(item => `- ${item.name} (${item.size}) x${item.quantity}`).join('\n')}\nToplam: ${getTotalPrice()} TL`;
                                    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
                                    setShowOrderOptionsModal(false); // Modalı kapat
                                    setCartItems([]); // Sepeti boşalt
                                    openConfirmationModal(); // Onay modalını göster
                                }}
                            >
                                WhatsApp ile Sipariş Ver
                            </a>
                            <a
                                href={`https://www.instagram.com/${INSTAGRAM_USERNAME}`} // Instagram kullanıcı adı kullanıldı
                                target="_blank"
                                rel="noopener noreferrer"
                                className="themed-social-button instagram-contact"
                                onClick={() => {
                                    setShowOrderOptionsModal(false); // Modalı kapat
                                    setCartItems([]); // Sepeti boşalt
                                    openConfirmationModal(); // Onay modalını göster
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

            {/* Kargo Takip Modalı - SADECE İLETİŞİM BUTONLARI İLE GÜNCELLENDİ */}
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

            {/* Sipariş Onay / Başarı Modalı */}
            {showConfirmationModal && (
                <div className="modal-backdrop" onClick={closeConfirmationModal}>
                    <div className="modal-content-base order-confirmation" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal close-modal-small" onClick={closeConfirmationModal}>
                            &times;
                        </button>
                        <h2>Siparişiniz Alındı!</h2>
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