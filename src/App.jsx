import React, { useState, useRef, useEffect } from "react";
import emailjs from "emailjs-com";
import "./index.css"; // Ana stil dosyanızın yolu
import { supabase } from "./supabaseClient"; // Supabase client'ı import et

// ProductCard bileşeni: Ürün kartlarının üzerine gelindiğinde resim değiştirmeyi yönetir
const ProductCard = ({ product, setSelectedProduct }) => {
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

    // Fare ürün kartından ayrıldığında ilk resmi göster
    const handleMouseLeave = () => {
        setHoveredImageIndex(0);
    };

    return (
        <div
            className="product-card"
            onClick={() => setSelectedProduct(product)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <img
                src={product.image[hoveredImageIndex]}
                alt={product.name}
                className="product-card-image"
            />
            <h3>{product.name}</h3>
            <p className="price">{product.price} TL</p>
            {/* <button className="add-to-cart-button">Sepete Ekle</button> */}
        </div>
    );
};

function App() {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null); // Detayı gösterilecek ürün
    const [isProductModalOpen, setIsProductModalOpen] = useState(false); // Ürün detayı modalının açık/kapalı durumu
    const [currentModalImageIndex, setCurrentModalImageIndex] = useState(0); // Modal içindeki resmin indeksi

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobil menü durumu
    const [isCartOpen, setIsCartOpen] = useState(false); // Sepet panelinin açık/kapalı durumu

    const [cartItems, setCartItems] = useState([]); // Sepet öğeleri state'i
    const [selectedSize, setSelectedSize] = useState(null); // Seçili beden state'i

    const [showContactModal, setShowContactModal] = useState(false); // İletişim modalı durumu
    const [showConfirmationModal, setShowConfirmationModal] = useState(false); // Sipariş onay modalı durumu

    const contactFormRef = useRef(); // EmailJS için form referansı


    // Sepet öğelerini localStorage'dan yükle
    useEffect(() => {
        const storedCartItems = localStorage.getItem("alicciCartItems");
        if (storedCartItems) {
            try {
                setCartItems(JSON.parse(storedCartItems));
            } catch (e) {
                console.error("Sepet öğeleri yüklenirken hata oluştu:", e);
                localStorage.removeItem("alicciCartItems"); // Hatalı veriyi temizle
            }
        }
    }, []);

    // Sepet öğeleri değiştiğinde localStorage'a kaydet
    useEffect(() => {
        localStorage.setItem("alicciCartItems", JSON.stringify(cartItems));
    }, [cartItems]);

    // Supabase'den ürünleri çek
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


    // Ürün detay modalını açma fonksiyonu
    useEffect(() => {
        if (selectedProduct) {
            setIsProductModalOpen(true);
            setCurrentModalImageIndex(0); // Modalı açarken ilk resmi göster
        }
    }, [selectedProduct]);

    // Ürün detay modalını kapatma fonksiyonu
    const closeProductModal = () => {
        setIsProductModalOpen(false);
        setSelectedProduct(null);
        setSelectedSize(null); // Modalı kapatırken seçili bedeni sıfırla
    };

    // Sepete ürün ekleme fonksiyonu
    const handleAddToCart = () => {
        if (!selectedProduct || !selectedSize) {
            alert("Lütfen bir beden seçin.");
            return;
        }

        const existingItemIndex = cartItems.findIndex(
            (item) => item.id === selectedProduct.id && item.selectedSize === selectedSize
        );

        if (existingItemIndex > -1) {
            // Ürün ve beden zaten sepette varsa miktarını artır
            const updatedCartItems = [...cartItems];
            updatedCartItems[existingItemIndex].quantity += 1;
            setCartItems(updatedCartItems);
        } else {
            // Yeni ürün ve bedeni sepete ekle
            setCartItems([
                ...cartItems,
                { ...selectedProduct, quantity: 1, selectedSize: selectedSize },
            ]);
        }
        closeProductModal(); // Modalı kapat
        setIsCartOpen(true); // Sepet panelini aç
    };

    // Sepetten ürün miktarını azaltma
    const handleDecreaseQuantity = (itemToRemove) => {
        const updatedCartItems = cartItems.map(item =>
            item.id === itemToRemove.id && item.selectedSize === itemToRemove.selectedSize
                ? { ...item, quantity: item.quantity - 1 }
                : item
        ).filter(item => item.quantity > 0); // Miktarı sıfır olanı sepetten çıkar
        setCartItems(updatedCartItems);
    };

    // Sepetten ürün miktarını artırma
    const handleIncreaseQuantity = (itemToIncrease) => {
        const updatedCartItems = cartItems.map(item =>
            item.id === itemToIncrease.id && item.selectedSize === itemToIncrease.selectedSize
                ? { ...item, quantity: item.quantity + 1 }
                : item
        );
        setCartItems(updatedCartItems);
    };

    // Sepetten öğeyi tamamen kaldırma
    const handleRemoveItem = (itemToRemove) => {
        const updatedCartItems = cartItems.filter(
            (item) => !(item.id === itemToRemove.id && item.selectedSize === itemToRemove.selectedSize)
        );
        setCartItems(updatedCartItems);
    };

    // Toplam sepet tutarını hesapla
    const calculateTotalPrice = () => {
        return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    };

    // EmailJS ile sipariş gönderme
    const sendOrderEmail = async (e) => {
        e.preventDefault();

        // Sepet boşsa uyarı ver
        if (cartItems.length === 0) {
            alert("Sepetiniz boş. Lütfen önce ürün ekleyiniz.");
            return;
        }

        const formData = new FormData(contactFormRef.current);
        const customerName = formData.get("user_name");
        const customerEmail = formData.get("user_email");
        const customerPhone = formData.get("user_phone");
        const customerAddress = formData.get("user_address");
        const customerNote = formData.get("user_note"); // Not alanını al

        // Sipariş detaylarını oluştur
        const orderDetails = cartItems
            .map(
                (item) =>
                    `${item.name} (${item.selectedSize}) x ${item.quantity} = ${item.price * item.quantity} TL`
            )
            .join("\n");
        const totalPrice = calculateTotalPrice();

        const emailParams = {
            user_name: customerName,
            user_email: customerEmail,
            user_phone: customerPhone,
            user_address: customerAddress,
            order_details: orderDetails,
            total_price: totalPrice,
            user_note: customerNote || "Yok", // Not boşsa "Yok" yazsın
            to_name: "ALICCI", // Alıcı adı
        };

        try {
            await emailjs.send(
                "service_pgyu09c", // EmailJS Service ID
                "template_7n47c4e", // EmailJS Template ID
                emailParams,
                "L9n3nK_E9W4j2lB-t" // EmailJS Public Key
            );
            console.log("Email başarıyla gönderildi!");
            setCartItems([]); // Sepeti boşalt
            setIsCartOpen(false); // Sepet panelini kapat
            setShowConfirmationModal(true); // Onay modalını göster
            closeContactModal(); // İletişim modalını kapat
        } catch (error) {
            console.error("Email gönderme hatası:", error);
            alert("Sipariş gönderilirken bir hata oluştu. Lütfen tekrar deneyin.");
        }
    };


    const openContactModal = () => setShowContactModal(true);
    const closeContactModal = () => setShowContactModal(false);
    const closeConfirmationModal = () => setShowConfirmationModal(false);


    // Mobil menü açma/kapatma
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <>
            <nav>
                <h1>ALICCI</h1>
                <ul className={`nav-menu ${isMobileMenuOpen ? "open" : ""}`}>
                    <li>
                        <a href="#home" onClick={() => setIsMobileMenuOpen(false)}>Anasayfa</a>
                    </li>
                    <li>
                        <a href="#products" onClick={() => setIsMobileMenuOpen(false)}>Ürünler</a>
                    </li>
                    <li>
                        <a href="#contact" onClick={() => setIsMobileMenuOpen(false)}>İletişim</a>
                    </li>
                    <li className="mobile-cart-item">
                        <button className="cart-button" onClick={() => setIsCartOpen(!isCartOpen)}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="feather feather-shopping-cart"
                            >
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            {cartItems.length > 0 && (
                                <span className="cart-count">{cartItems.length}</span>
                            )}
                        </button>
                    </li>
                </ul>

                <div className="hamburger" onClick={toggleMobileMenu}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="feather feather-menu"
                    >
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                    <button className="cart-button" onClick={() => setIsCartOpen(!isCartOpen)}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="feather feather-shopping-cart"
                        >
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        {cartItems.length > 0 && (
                            <span className="cart-count">{cartItems.length}</span>
                        )}
                    </button>
                </div>
            </nav>

            <section id="home" className="hero">
                <div className="hero-content">
                    <h1>ALICCI</h1>
                    <p>Zarafetin ve Kalitenin Buluşma Noktası</p>
                    <button className="cta-button" onClick={() => window.location.href = '#products'}>Şimdi Keşfet</button>
                </div>
            </section>

            <section id="products" className="products-section">
                <h2>Ürünlerimiz</h2>
                <div className="product-grid">
                    {products.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            setSelectedProduct={setSelectedProduct}
                        />
                    ))}
                </div>
            </section>

            <section id="contact" className="contact-section">
                <h2>İletişim</h2>
                <p>Bizimle iletişime geçmek veya sipariş vermek için aşağıdaki seçenekleri kullanabilirsiniz.</p>
                <div className="contact-buttons-container">
                    <a href="https://wa.me/90532xxxxxx" target="_blank" rel="noopener noreferrer" className="themed-social-button">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" />
                        WhatsApp ile İletişime Geç
                    </a>
                    <a href="https://instagram.com/alicci.tr" target="_blank" rel="noopener noreferrer" className="themed-social-button">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram" />
                        Instagram Destek
                    </a>
                </div>
            </section>

            <section id="payment" className="payment-section">
                <h2>Ödeme Seçenekleri</h2>
                <div className="payment-icons">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/40/Mastercard_2019_logo.svg" alt="Mastercard" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Visa_2021.svg" alt="Visa" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Garanti_BBVA_logo.png" alt="Garanti BBVA" />
                    {/* Diğer ödeme yöntemleri ikonları */}
                </div>
            </section>

            <footer className="footer">
                <p>&copy; 2025 ALICCI. Tüm Hakları Saklıdır.</p>
                <div className="social-links">
                    <a href="https://instagram.com/alicci.tr" target="_blank" rel="noopener noreferrer">Instagram</a>
                    {/* Diğer sosyal medya linkleri */}
                </div>
            </footer>

            {/* Sepet Paneli Modalı */}
            <div className={`cart-panel ${isCartOpen ? "open" : ""}`}>
                <div className="cart-header">
                    <h3>Sepetiniz ({cartItems.length} Ürün)</h3>
                    <button className="close-cart-button" onClick={() => setIsCartOpen(false)}>
                        &times;
                    </button>
                </div>
                <div className="cart-items-list">
                    {cartItems.length === 0 ? (
                        <p>Sepetinizde ürün bulunmamaktadır.</p>
                    ) : (
                        cartItems.map((item) => (
                            <div key={`${item.id}-${item.selectedSize}`} className="cart-item">
                                <img src={item.image[0]} alt={item.name} className="cart-item-image" />
                                <div className="cart-item-details">
                                    <h4>{item.name}</h4>
                                    <p>Beden: {item.selectedSize}</p>
                                    <p>Fiyat: {item.price} TL</p>
                                    <div className="cart-item-quantity">
                                        <button onClick={() => handleDecreaseQuantity(item)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => handleIncreaseQuantity(item)}>+</button>
                                    </div>
                                    <button
                                        className="remove-item-button"
                                        onClick={() => handleRemoveItem(item)}
                                    >
                                        Kaldır
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {cartItems.length > 0 && (
                    <div className="cart-footer">
                        <p>Toplam Tutar: {calculateTotalPrice()} TL</p>
                        <button className="checkout-button" onClick={openContactModal}>Siparişi Tamamla</button>
                    </div>
                )}
            </div>

            {/* Ürün Detay Modalı */}
            {isProductModalOpen && selectedProduct && (
                <div className="modal-backdrop" onClick={closeProductModal}>
                    <div className="modal-content-base product-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal" onClick={closeProductModal}>
                            &times;
                        </button>
                        <div className="product-modal-image-gallery">
                            {selectedProduct.image && selectedProduct.image.length > 1 && (
                                <button
                                    className="image-arrow left-arrow"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentModalImageIndex(prevIndex =>
                                            (prevIndex - 1 + selectedProduct.image.length) % selectedProduct.image.length
                                        );
                                    }}
                                >
                                    &#x2039;
                                </button>
                            )}
                            {selectedProduct.image && selectedProduct.image.length > 0 && (
                                <img
                                    src={selectedProduct.image[currentModalImageIndex]}
                                    alt={selectedProduct.name}
                                    className="product-modal-image"
                                />
                            )}
                            {selectedProduct.image && selectedProduct.image.length > 1 && (
                                <button
                                    className="image-arrow right-arrow"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentModalImageIndex(prevIndex =>
                                            (prevIndex + 1) % selectedProduct.image.length
                                        );
                                    }}
                                >
                                    &#x203A;
                                </button>
                            )}
                        </div>
                        <div className="product-info">
                            <h2>{selectedProduct.name}</h2>
                            <p className="desc">{selectedProduct.description || "Bu ürün ALICCI koleksiyonunun zarif parçalarındandır."}</p>
                            <div className="size-select">
                                <p>Beden Seç:</p>
                                {(selectedProduct.sizes && selectedProduct.sizes.length > 0
                                    ? selectedProduct.sizes
                                    : ["S", "M", "L", "XL"]
                                ).map((size) => (
                                    <button key={size} className={selectedSize === size ? "selected" : ""} onClick={() => setSelectedSize(size)}>
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

            {/* İletişim Formu Modalı */}
            {showContactModal && (
                <div className="modal-backdrop" onClick={closeContactModal}>
                    <div className="modal-content-base order-options-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal" onClick={closeContactModal}>
                            &times;
                        </button>
                        <h2>Siparişinizi Tamamlayın</h2>
                        <p>Aşağıdaki formu doldurarak siparişinizi bize iletebilirsiniz. Siparişiniz hakkında sizinle iletişime geçeceğiz.</p>
                        <form ref={contactFormRef} onSubmit={sendOrderEmail} className="contact-form">
                            <label htmlFor="user_name">Adınız Soyadınız</label>
                            <input type="text" name="user_name" id="user_name" required />

                            <label htmlFor="user_email">E-posta Adresiniz</label>
                            <input type="email" name="user_email" id="user_email" required />

                            <label htmlFor="user_phone">Telefon Numaranız</label>
                            <input type="tel" name="user_phone" id="user_phone" required />

                            <label htmlFor="user_address">Adresiniz</label>
                            <textarea name="user_address" id="user_address" rows="3" required></textarea>

                            <label htmlFor="user_note">Ek Not (İsteğe Bağlı)</label>
                            <textarea name="user_note" id="user_note" rows="2"></textarea>

                            <button type="submit" className="submit-button">Siparişi Gönder</button>
                        </form>

                        <div className="modal-divider">veya</div>

                        <div className="contact-dm-buttons">
                            <a href="https://wa.me/90532xxxxxx" target="_blank" rel="noopener noreferrer" className="themed-social-button">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" />
                                WhatsApp ile İletişime Geç
                            </a>
                            <a href="https://instagram.com/alicci.tr" target="_blank" rel="noopener noreferrer" className="themed-social-button">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram" />
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