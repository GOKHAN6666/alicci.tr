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

    // Fare ürün kartından çıktığında resmi ilk resme sıfırla
    const handleMouseLeave = () => {
        setHoveredImageIndex(0);
    };

    // Gösterilecek resmin URL'sini belirle, resim yoksa yer tutucu kullan
    const displayedImage = (product.image && product.image.length > 0)
        ? product.image[hoveredImageIndex]
        : "https://placehold.co/280x280/e0e0e0/000000?text=No+Image"; // Varsayılan yer tutucu resim

    return (
        <div className="product-card">
            <img
                src={displayedImage}
                alt={product.name}
                className="product-card-image"
                onClick={() => setSelectedProduct(product)} // Ürüne tıklayınca detay modalını aç
                onMouseMove={handleMouseMove} // Fare hareketi için olay dinleyici
                onMouseMoveCapture={handleMouseMove} // Fare hareketi için olay dinleyici (bubbling'i engellemez)
                onMouseLeave={handleMouseLeave} // Fare ayrılması için olay dinleyici
            />
            <div className="info">
                <h4>{product.name}</h4>
                <p>₺{product.price}</p>
            </div>
        </div>
    );
};

// AdminPanel bileşeni, App.jsx içinde tanımlandı
function AdminPanel() {
    // Ürün yönetimi için state'ler
    const [products, setProducts] = useState([]);
    const [newProductName, setNewProductName] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('');
    const [newProductDescription, setNewProductDescription] = useState('');
    const [newProductImages, setNewProductImages] = useState([]); // File nesneleri dizisi
    const [newProductSizes, setNewProductSizes] = useState(''); // Virgülle ayrılmış bedenler (S,M,L gibi)
    const [uploadingImages, setUploadingImages] = useState(false); // Resim yükleme durumu

    // Sipariş yönetimi için state'ler
    const [orders, setOrders] = useState([]);

    // Kargo yönetimi için state'ler
    const [cargoList, setCargoList] = useState([]);
    const [editingCargoId, setEditingCargoId] = useState(null);
    const [editedCargoCompany, setEditedCargoCompany] = useState('');
    const [editedTrackingCode, setEditedTrackingCode] = useState('');
    const [editedCargoStatus, setEditedCargoStatus] = useState('');
    const [editedTrackingUrl, setEditedTrackingUrl] = useState(''); // Kargo takip URL'si

    // Veri çekme fonksiyonları
    useEffect(() => {
        fetchProducts();
        fetchOrders();
        fetchCargoList();
    }, []);

    const fetchProducts = async () => {
        const { data, error } = await supabase.from('products').select('*');
        if (error) console.error('Ürünler çekilirken hata oluştu:', error);
        else setProducts(data);
    };

    const fetchOrders = async () => {
        const { data, error } = await supabase.from('order').select('*');
        if (error) console.error('Siparişler çekilirken hata oluştu:', error);
        else setOrders(data);
    };

    const fetchCargoList = async () => {
        const { data, error } = await supabase.from('KARGO').select('*');
        if (error) console.error('Kargo listesi çekilirken hata oluştu:', error);
        else setCargoList(data);
    };

    // Resim dosyalarını seçme işlemi
    const handleFileChange = (e) => {
        setNewProductImages(Array.from(e.target.files)); // Seçilen tüm dosyaları diziye at
    };

    // Ürün Yönetimi Fonksiyonları
    const handleAddProduct = async () => {
        if (!newProductName || !newProductPrice || !newProductDescription || newProductImages.length === 0 || !newProductSizes) {
            alert('Lütfen tüm ürün bilgilerini doldurun ve en az bir resim seçin!');
            return;
        }

        setUploadingImages(true);
        let imageUrls = [];

        // Resimleri Supabase Storage'a yükle
        try {
            for (const file of newProductImages) {
                const fileName = `${Date.now()}-${file.name}`;
                const { data, error } = await supabase.storage
                    .from('product-images') // Kovamızın adı
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false // Eğer aynı isimde dosya varsa üzerine yazma
                    });

                if (error) {
                    throw error;
                }

                // Yüklenen dosyanın herkese açık URL'sini al
                const publicUrl = supabase.storage
                    .from('product-images')
                    .getPublicUrl(fileName).data.publicUrl;
                
                imageUrls.push(publicUrl);
            }
        } catch (error) {
            console.error('Resim yüklenirken hata oluştu:', error);
            alert('Resim yüklenirken bir hata oluştu: ' + error.message);
            setUploadingImages(false);
            return;
        }

        setUploadingImages(false);

        // Bedenleri virgüllerden ayırıp diziye dönüştür
        const sizesArray = newProductSizes.split(',').map(size => size.trim().toUpperCase()).filter(size => size !== '');

        if (sizesArray.length === 0) {
            alert('Lütfen ürün bedenlerini girin (örn: S, M, L).');
            return;
        }

        const { data, error } = await supabase
            .from('products')
            .insert([{
                name: newProductName,
                price: parseFloat(newProductPrice),
                description: newProductDescription,
                image: imageUrls, // Yüklenen resim URL'lerinin dizisi
                sizes: sizesArray
            }]);

        if (error) {
            console.error('Ürün eklenirken hata oluştu:', error);
            alert('Ürün eklenirken bir hata oluştu: ' + error.message);
        } else {
            alert('Ürün başarıyla eklendi!');
            setNewProductName('');
            setNewProductPrice('');
            setNewProductDescription('');
            setNewProductImages([]); // Dosya listesini temizle
            setNewProductSizes('');
            fetchProducts();
        }
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) console.error('Ürün silinirken hata oluştu:', error);
            else fetchProducts();
        }
    };

    // Sipariş Yönetimi Fonksiyonları
    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        const { error } = await supabase
            .from('order')
            .update({ order_status: newStatus })
            .eq('order_id', orderId);
        if (error) console.error('Sipariş durumu güncellenirken hata oluştu:', error);
        else fetchOrders();
    };

    const handleDeleteOrder = async (orderId) => {
        if (window.confirm('Bu siparişi silmek istediğinizden emin misiniz?')) {
            const { error } = await supabase.from('order').delete().eq('order_id', orderId);
            if (error) console.error('Sipariş silinirken hata oluştu:', error);
            else fetchOrders();
        }
    };

    // Kargo Yönetimi Fonksiyonları
    const handleEditCargo = (cargo) => {
        setEditingCargoId(cargo.id);
        setEditedCargoCompany(cargo.cargo_company);
        setEditedTrackingCode(cargo.tracking_code);
        setEditedCargoStatus(cargo.status);
        setEditedTrackingUrl(cargo.tracking_url || ''); // Eğer yoksa boş string
    };

    const handleSaveCargo = async () => {
        if (!editingCargoId) return;

        const { error } = await supabase
            .from('KARGO')
            .update({
                cargo_company: editedCargoCompany,
                tracking_code: editedTrackingCode,
                status: editedCargoStatus,
                tracking_url: editedTrackingUrl // Takip URL'si kaydediliyor
            })
            .eq('id', editingCargoId);

        if (error) {
            console.error('Kargo güncellenirken hata oluştu:', error);
            alert('Kargo bilgisi güncellenirken bir hata oluştu: ' + error.message);
        } else {
            alert('Kargo bilgisi başarıyla güncellendi!');
            setEditingCargoId(null);
            setEditedCargoCompany('');
            setEditedTrackingCode('');
            setEditedCargoStatus('');
            setEditedTrackingUrl('');
            fetchCargoList();
        }
    };

    const handleDeleteCargo = async (id) => {
        if (window.confirm('Bu kargo kaydını silmek istediğinizden emin misiniz?')) {
            const { error } = await supabase.from('KARGO').delete().eq('id', id);
            if (error) console.error('Kargo silinirken hata oluştu:', error);
            else fetchCargoList();
        }
    };

    return (
        <div className="admin-panel-container">
            <h1>Admin Paneli</h1>

            {/* Ürün Yönetimi */}
            <div className="admin-section product-management">
                <h2>Ürün Yönetimi</h2>
                <div className="add-product-form">
                    <input
                        type="text"
                        placeholder="Ürün Adı"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                    />
                    <input
                        type="number"
                        placeholder="Fiyat"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value)}
                    />
                    <textarea
                        placeholder="Açıklama"
                        value={newProductDescription}
                        onChange={(e) => setNewProductDescription(e.target.value)}
                    ></textarea>
                    {/* Resim dosyası yükleme alanı */}
                    <label className="file-upload-label">
                        Resim(ler) Seç
                        <input
                            type="file"
                            multiple // Birden fazla dosya seçimi için
                            onChange={handleFileChange}
                            style={{ display: 'none' }} // Gizli input
                            accept="image/*" // Sadece resim dosyalarını kabul et
                        />
                    </label>
                    {/* Seçilen dosyaların isimlerini göster */}
                    {newProductImages.length > 0 && (
                        <div className="selected-files-preview">
                            <p>Seçilen Dosyalar:</p>
                            <ul>
                                {newProductImages.map((file, index) => (
                                    <li key={index}>{file.name}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                     <input
                        type="text"
                        placeholder="Bedenler (örn: S, M, L, XL)"
                        value={newProductSizes}
                        onChange={(e) => setNewProductSizes(e.target.value)}
                    />
                    <button onClick={handleAddProduct} disabled={uploadingImages}>
                        {uploadingImages ? 'Resimler Yükleniyor...' : 'Ürün Ekle'}
                    </button>
                </div>
                <ul className="product-list">
                    {products.map((product) => (
                        <li key={product.id} className="product-item">
                            {/* İlk resmi göster (image bir dizi olduğu için) */}
                            {product.image && Array.isArray(product.image) && product.image.length > 0 && (
                                <img src={product.image[0]} alt={product.name} className="product-thumb" />
                            )}
                            <span>{product.name} - ₺{product.price}</span>
                            <button onClick={() => handleDeleteProduct(product.id)}>Sil</button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Sipariş Yönetimi */}
            <div className="admin-section order-management">
                <h2>Sipariş Yönetimi</h2>
                <ul className="order-list">
                    {orders.map((order) => (
                        <li key={order.order_id} className="order-item">
                            <div className="order-details">
                                <strong>Sipariş ID:</strong> {order.order_id}<br />
                                <strong>Müşteri:</strong> {order.customer_name} ({order.customer_email})<br />
                                <strong>Adres:</strong> {order.customer_address}<br />
                                <strong>Telefon:</strong> {order.customer_phone}<br />
                                <strong>Toplam Fiyat:</strong> ₺{order.total_price}<br />
                                <strong>Ürünler:</strong>
                                <ul>
                                    {order.order_items && order.order_items.map((item, idx) => (
                                        <li key={idx}>{item.name} ({item.size}) x{item.quantity}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="order-actions">
                                <select
                                    value={order.order_status}
                                    onChange={(e) => handleUpdateOrderStatus(order.order_id, e.target.value)}
                                >
                                    <option value="pending">Beklemede</option>
                                    <option value="processing">Hazırlanıyor</option>
                                    <option value="shipped">Kargoya Verildi</option>
                                    <option value="delivered">Teslim Edildi</option>
                                    <option value="cancelled">İptal Edildi</option>
                                </select>
                                <button onClick={() => handleDeleteOrder(order.order_id)}>Sil</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Kargo Yönetimi */}
            <div className="admin-section cargo-management">
                <h2>Kargo Yönetimi</h2>
                <ul className="cargo-list">
                    {cargoList.map((cargo) => (
                        <li key={cargo.id} className="cargo-item">
                            {editingCargoId === cargo.id ? (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Kargo Şirketi"
                                        value={editedCargoCompany}
                                        onChange={(e) => setEditedCargoCompany(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Takip Kodu"
                                        value={editedTrackingCode}
                                        onChange={(e) => setEditedTrackingCode(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Durum"
                                        value={editedCargoStatus}
                                        onChange={(e) => setEditedCargoStatus(e.target.value)}
                                    />
                                    {/* Kargo Takip URL'i girişi */}
                                    <input
                                        type="text"
                                        placeholder="Tam Takip URL'si"
                                        value={editedTrackingUrl}
                                        onChange={(e) => setEditedTrackingUrl(e.target.value)}
                                        style={{ flexBasis: '100%' }}
                                    />
                                    <button onClick={handleSaveCargo}>Kaydet</button>
                                    <button onClick={() => setEditingCargoId(null)}>İptal</button>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <strong>Sipariş ID:</strong> {cargo.order_id}<br/>
                                        <strong>Müşteri E-posta:</strong> {cargo.email}<br/>
                                        <span>Kargo Firması: {cargo.cargo_company}</span><br/>
                                        <span>Takip Kodu: {cargo.tracking_code}</span><br/>
                                        <span>Durum: {cargo.status}</span><br/>
                                        {cargo.tracking_url && (
                                            <span>Takip Linki: <a href={cargo.tracking_url} target="_blank" rel="noopener noreferrer">{cargo.tracking_url}</a></span>
                                        )}
                                    </div>
                                    <button onClick={() => handleEditCargo(cargo)}>Düzenle</button>
                                    <button onClick={() => handleDeleteCargo(cargo.id)}>Sil</button>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasOrdered, setHasOrdered] = useState(() => localStorage.getItem("hasOrdered") === "true");

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState(null);

  // Kargo takip sistemi için state'ler (sorgulama kaldırıldığı için basitleştirildi)
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  // Admin Panel için yeni state'ler
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loggedInAsAdmin, setLoggedInAsAdmin] = useState(false);

  // Ürün detay modalı için mevcut resim indeksi
  const [currentModalImageIndex, setCurrentModalImageIndex] = useState(0);


  // Ref'ler
  const aboutRef = useRef(null);
  const contactRef = useRef(null);
  const productsRef = useRef(null);

  // Admin şifresi (App.jsx içinde tanımlı)
  const ADMIN_PASSWORD = "AliC1482.!"; // Önceden belirttiğiniz şifre

  // Sepet öğelerini localStorage'dan yükle
  const [cartItems, setCartItems] = useState(() => {
    try {
      const storedCartItems = localStorage.getItem('cartItems');
      return storedCartItems ? JSON.parse(storedCartItems) : [];
    } catch (error) {
      console.error("Sepet öğeleri localStorage'dan yüklenirken hata oluştu:", error);
      return [];
    }
  });

  // Sepet öğeleri değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  // Supabase'den ürünleri çekme fonksiyonu
  useEffect(() => {
    const fetchProductsData = async () => {
      setLoadingProducts(true);
      setProductsError(null);
      const { data, error } = await supabase.from("products").select("*");
      if (error) {
        console.error("Ürün çekme hatası:", error);
        setProductsError("Ürünler yüklenirken bir hata oluştu.");
      } else {
        setProducts(data);
      }
      setLoadingProducts(false);
    };
    fetchProductsData();
  }, []);

  // Bölüme kaydırma fonksiyonu
  const scrollToSection = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
      setMenuOpen(false);
    }
  };

  // Admin Giriş İşlemi
  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setLoggedInAsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword("");
    } else {
      alert("Hatalı şifre!");
      setAdminPassword("");
    }
  };

  // Sepete ürün ekleme fonksiyonu
  const handleAddToCart = () => {
    if (selectedProduct && selectedSize) {
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
          {
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            // image bir dizi olduğu için sepete eklerken ilk resmi alıyoruz
            image: Array.isArray(selectedProduct.image) ? selectedProduct.image[0] : selectedProduct.image,
            size: selectedSize,
            quantity: 1,
          },
        ]);
      }
      setSelectedProduct(null);
      setSelectedSize(null);
    } else {
      alert('Lütfen bir ürün ve beden seçin.');
    }
  };

  // Sepetten ürün çıkarma
  const handleRemoveFromCart = (itemToRemove) => {
    setCartItems(cartItems.filter(item => !(item.id === itemToRemove.id && item.size === itemToRemove.size)));
  };

  // Sepet miktarını güncelleme
  const handleUpdateQuantity = (itemToUpdate, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveFromCart(itemToUpdate);
      return;
    }
    setCartItems(
      cartItems.map((item) =>
        item.id === itemToUpdate.id && item.size === itemToUpdate.size
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  // Sepet toplamını hesaplama
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
  };

  // Sepeti temizleme
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cartItems');
  };

  // Sipariş verme işlemi (sadece ödeme seçim modalını gösterecek)
  const handlePlaceOrder = () => {
    if (cartItems.length === 0) {
      alert('Sepetiniz boş. Lütfen ürün ekleyin.');
      return;
    }
    setShowPaymentModal(true);
    setIsCartOpen(false); // Sepet modalını kapat
  };

  // İade formu gönderme (emailjs ile)
  const sendReturnEmail = (e) => {
    e.preventDefault();

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    console.log("EmailJS Service ID from env:", serviceId);
    console.log("EmailJS Template ID from env:", templateId);
    console.log("EmailJS Public Key from env:", publicKey);

    if (!serviceId || !templateId || !publicKey) {
      console.error("EmailJS environment variables are missing.");
      alert("E-posta gönderme için gerekli bilgiler eksik. Lütfen daha sonra tekrar deneyin.");
      return;
    }

    emailjs
      .sendForm(
        serviceId,
        templateId,
        e.target,
        publicKey
      )
      .then(
        (result) => {
          console.log(result.text);
          alert("İade talebiniz başarıyla gönderildi!");
          setShowReturnForm(false);
        },
        (error) => {
          console.error("İade talebi gönderilirken hata oluştu:", error);
          alert("İade talebi gönderilirken bir hata oluştu.");
        }
      );
  };
  // Modallar açıldığında body'nin kaymasını engelle
  useEffect(() => {
    const anyModalOpen =
      selectedProduct ||
      isCartOpen ||
      showPaymentModal ||
      showReturnForm ||
      showSuccessModal ||
      showTrackingModal ||
      showAdminLogin;

    if (anyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedProduct, isCartOpen, showPaymentModal, showReturnForm, showSuccessModal, showTrackingModal, showAdminLogin]);

  // Sayfa yüklendiğinde ve iyzipay'den geri dönüldüğünde EmailJS ile sipariş e-postası gönderimi
  // ve Supabase'e sipariş kaydetme işlemi burada olacak.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const isSuccess = query.get("odeme") === "basarili";
    const emailSentFlag = localStorage.getItem("emailSent");

    // Sipariş bilgileri ve SUPABASE_ORDER_PROCESSED bayrağını da kontrol edelim
    const orderInfo = JSON.parse(localStorage.getItem("orderInfo"));
    const supabaseOrderProcessed = localStorage.getItem("supabaseOrderProcessed") === "true";

    if (isSuccess && orderInfo && !supabaseOrderProcessed) {
        const processOrder = async () => { // Bu fonksiyon async olmalı
            try {
                // Supabase 'order' tablosuna sipariş bilgilerini ekle
                const { data: orderData, error: orderError } = await supabase.from('order').insert([
                    {
                        order_id: orderInfo.custom_order_id,
                        customer_name: orderInfo.from_name,
                        customer_email: orderInfo.from_email,
                        customer_address: orderInfo.customer_address,
                        customer_phone: orderInfo.customer_phone,
                        total_price: parseFloat(orderInfo.total_price),
                        order_items: JSON.parse(localStorage.getItem('cartItems')), // Sepetteki ürünleri JSON olarak kaydet
                        order_status: 'Sipariş Alındı', // Varsayılan durum
                    }
                ]);

                if (orderError) {
                    throw orderError;
                }

                // Supabase 'KARGO' tablosuna başlangıç kargo bilgisini ekle
                const { error: cargoError } = await supabase.from('KARGO').insert([
                    {
                        order_id: orderInfo.custom_order_id,
                        email: orderInfo.from_email,
                        cargo_company: 'Belirlenmedi',
                        tracking_code: 'Beklemede',
                        status: 'Sipariş Alındı',
                        tracking_url: '',
                    }
                ]);

                if (cargoError) {
                    console.error("Kargo bilgisi eklenirken hata oluştu:", cargoError);
                    // Kargo bilgisi eklenemese bile siparişin tamamlanması için burada durmuyoruz
                }

                // EmailJS ile sipariş bilgilendirme e-postası gönder
                emailjs
                    .send("service_iyppib9", "template_ftuypl8", orderInfo, "5dI_FI0HT2oHrlQj5")
                    .then(() => {
                        console.log("Sipariş bilgilendirme e-postası başarıyla gönderildi!");
                        localStorage.setItem("emailSent", "true"); // E-posta gönderildi bayrağını ayarla
                        localStorage.setItem("supabaseOrderProcessed", "true"); // Supabase'ye kaydedildi bayrağını ayarla
                        setShowSuccessModal(true); // Başarılı modalı göster
                        localStorage.removeItem("orderInfo"); // Geçici sipariş bilgilerini temizle
                        clearCart(); // Sepeti temizle
                    })
                    .catch((error) => {
                        console.error("Sipariş bilgilendirme e-postası gönderilirken hata oluştu:", error);
                    });

            } catch (error) {
                console.error("Sipariş veritabanına kaydedilirken hata oluştu:", error);
                alert("Siparişiniz işlenirken bir hata oluştu: " + error.message);
                localStorage.removeItem("orderInfo"); // Hata durumunda da temizle
                localStorage.removeItem("supabaseOrderProcessed"); // Hata durumunda da temizle
            } finally {
                // URL'deki ödeme parametresini temizle
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        };

        processOrder(); // Async fonksiyonu çağır
    }
  }, []); // Bağımlılık dizisi boş bırakılabilir, sadece sayfa yüklendiğinde bir kere çalışmasını sağlar.

  // Eğer admin olarak giriş yapılmışsa AdminPanel'i göster
  if (loggedInAsAdmin) {
    return <AdminPanel />;
  }

  return (
    <>
      {/* Sadece geliştirme ortamında ve admin girişi yapılmamışsa Admin giriş butonu */}
      {import.meta.env.DEV && !loggedInAsAdmin && (
        <button
          onClick={() => setShowAdminLogin(true)}
          style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            zIndex: 1001,
            padding: '8px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Admin Girişi
        </button>
      )}

      {/* Navbar */}
      <nav>
        <h1>ALICCI</h1>
        {/* Masaüstü menü öğeleri */}
        <ul className="desktop-nav-menu">
          <li onClick={() => scrollToSection(productsRef)}>Koleksiyon</li>
          <li onClick={() => scrollToSection(aboutRef)}>Hakkımızda</li>
          <li onClick={() => scrollToSection(contactRef)}>İletişim</li>
          <li onClick={() => { setShowTrackingModal(true); setMenuOpen(false); }}>Kargo Takibi</li>
        </ul>

        {/* Masaüstü Sepet Butonu */}
        <div className="desktop-cart-button-wrapper">
          <div className="cart-button" onClick={() => setIsCartOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" stroke="#111" strokeWidth="1.5" fill="none">
              <path d="M3 3h2l.4 2M7 13h13l-1.5 7H6L5 6H3" />
              <circle cx="9" cy="21" r="1" />
              <circle cx="18" cy="21" r="1" />
            </svg>
            {cartItems.length > 0 && <div className="cart-count">{cartItems.length}</div>}
          </div>
        </div>

        {/* Hamburger menü ikonu (sadece mobilde görünür) */}
        <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          {cartItems.length > 0 && <div className="cart-count mobile-hamburger-cart-count">{cartItems.length}</div>}
        </div>
        
        {/* Mobil menü (varsayılan olarak gizli, hamburger ile açılır) */}
        <ul className={`mobile-nav-menu ${menuOpen ? 'open' : ''}`}>
          <li onClick={() => scrollToSection(productsRef)}>Koleksiyon</li>
          <li onClick={() => scrollToSection(aboutRef)}>Hakkımızda</li>
          <li onClick={() => scrollToSection(contactRef)}>İletişim</li>
          {hasOrdered && <li onClick={() => { setShowReturnForm(true); setMenuOpen(false); }}>İade Talebi</li>}
          <li onClick={() => { setIsCartOpen(true); setMenuOpen(false); }}>
            Sepet {cartItems.length > 0 && `(${cartItems.length})`}
          </li>
          <li onClick={() => { setShowTrackingModal(true); setMenuOpen(false); }}>Kargo Takibi</li>
        </ul>
      </nav>

      {/* Admin Giriş Modalı */}
      {showAdminLogin && (
        <div className="modal-backdrop" onClick={() => setShowAdminLogin(false)}>
          <div className="modal-content-base tracking-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowAdminLogin(false)}>×</button>
            <h2>Admin Girişi</h2>
            <input
              type="password"
              placeholder="Şifre"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAdminLogin();
                }
              }}
              required
            />
            <button onClick={handleAdminLogin}>Giriş Yap</button>
          </div>
        </div>
      )}


      {/* Hero Section */}
      <section className="hero">
        <h2>Sessiz Lüksün Yeni Tanımı</h2>
        <p>Sadelik, zarafet ve kalite. ALICCI, görünmeyeni giyenler için.</p>
        <button onClick={() => scrollToSection(productsRef)}>Koleksiyonu Keşfet</button>
      </section>

      {/* Products Section (Şimdi ProductCard bileşenini kullanacak) */}
      <section className="products" ref={productsRef}>
        <h3>Yeni Sezon</h3>
        <div className="products-grid">
          {loadingProducts ? (
            <p>Ürünler yükleniyor...</p>
          ) : productsError ? (
            <p className="error-message">{productsError}</p>
          ) : products.length === 0 ? (
            <p>Gösterilecek ürün bulunmamaktadır.</p>
          ) : (
            products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                setSelectedProduct={(p) => {
                  setSelectedProduct(p);
                  setSelectedSize(null);
                  setCurrentModalImageIndex(0); // Modal açıldığında resmi sıfırla
                }}
              />
            ))
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="about" ref={aboutRef}>
        <h3>Hakkımızda</h3>
        <p>ALICCI, sadeliği ve zarafeti benimseyen erkekler için kuruldu. Sessiz lüks; gösterişten uzak, detayda gizli bir zenginliktir.</p>
        <p>Koleksiyonlarımız, yüksek kalite kumaşlar ve özenli işçilikle hazırlanır.</p>
      </section>

      {/* Contact Section */}
      <section className="contact" ref={contactRef}>
        <h3>İletişim</h3>
        <form action="https://formspree.io/f/xeogwvzd" method="POST">
          <input type="text" name="name" placeholder="Adınız" required />
          <input type="email" name="email" placeholder="E-posta" required />
          <textarea name="message" placeholder="Mesajınız" required></textarea>
          <button type="submit">Gönder</button>
        </form>
        {/* WhatsApp ve Instagram DM butonları (temalı renklerde kalacak) */}
        <div className="contact-dm-buttons">
            <a 
                href={`https://wa.me/905511903118?text=${encodeURIComponent('Merhaba, ALICCI hakkında bilgi almak istiyorum.')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="themed-social-button" 
            >
                WhatsApp ile İletişim
            </a>
            <a 
                href="https://www.instagram.com/alicci.official/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="themed-social-button" 
            >
                Instagram DM ile İletişim
            </a>
        </div>
      </section>

      {/* Footer */}
      <footer>
        © 2025 ALICCI • Tüm hakları saklıdır.
        <div className="instagram">
          <a href="https://instagram.com/alicci.official" target="_blank" rel="noopener noreferrer">
            Instagram / @alicci.official
          </a>
        </div>
      </footer>

      {/* Sepet Paneli (Modal) */}
      {isCartOpen && (
        <div className="modal-backdrop" onClick={() => setIsCartOpen(false)}>
          <div className={`cart-panel ${isCartOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setIsCartOpen(false)}>×</button>
            <h3>Sepetiniz</h3>
            {cartItems.length === 0 ? (
              <p>Sepetiniz boş.</p>
            ) : (
              <>
                <ul>
                  {cartItems.map((item, index) => (
                    <li key={`${item.id}-${item.size}-${index}`}>
                      <div className="item-details">
                        <span>{item.name} – ₺{item.price.toFixed(2)} ({item.size})</span>
                        <span className="item-quantity">Adet: {item.quantity}</span>
                      </div>
                      {/* Sepetteki x işaretini sadeleştir */}
                      <button className="remove-item-button-simple" onClick={() => handleRemoveFromCart(item)}>
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="total">Toplam: ₺{calculateTotal()}</p>
                <button onClick={handlePlaceOrder}>Siparişi Tamamla</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Kargo Takip Modal - Sorgulama Alanları Kaldırıldı, Sadece Butonlar Kaldı */}
      {showTrackingModal && (
        <div className="modal-backdrop" onClick={() => { setShowTrackingModal(false); }}>
          <div
            className="modal-content-base tracking-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl mb-4 font-semibold">Kargo Takibi</h2>
            <p className="mb-4">Kargo takibi için lütfen aşağıdaki iletişim kanallarımızdan bize ulaşın:</p>
            <div className="payment-options-buttons"> {/* WhatsApp ve Instagram için orijinal renk sınıflarını kullan */}
                <a 
                    href={`https://wa.me/905511903118?text=${encodeURIComponent('Merhaba, kargomun durumunu öğrenmek istiyorum.')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="payment-button whatsapp-button" 
                >
                    WhatsApp ile Sor
                </a>
                <a 
                    href="https://www.instagram.com/alicci.official/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="payment-button instagram-button" 
                >
                    Instagram DM ile Sor
                </a>
            </div>
            {/* Kapat butonu modalın altında olacak */}
            <button onClick={() => setShowTrackingModal(false)} className="bg-gray-200 text-black py-2 mt-4">Kapat</button>
          </div>
        </div>
      )}

      {/* Ödeme Seçim Modalı */}
      {showPaymentModal && (
        <div className="modal-backdrop" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content-base order-confirmation" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowPaymentModal(false)}>×</button>
            <h2>Ödeme Yöntemi</h2>
            <p>Ödemelerimizi WhatsApp veya Instagram DM üzerinden alıyoruz. Lütfen birini seçin:</p>
            <div className="payment-options-buttons">
              <a 
                href={`https://wa.me/905511903118?text=${encodeURIComponent('Merhaba, ALICCI siparişimle ilgili ödeme yapmak istiyorum. Sepetimdeki ürünler: ' + cartItems.map(item => `${item.name} (${item.size}) x${item.quantity}`).join(', ') + ' Toplam: ₺' + calculateTotal())}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="payment-button whatsapp-button" 
              >
                WhatsApp ile Öde
              </a>
              <a 
                href="https://www.instagram.com/alicci.official/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="payment-button instagram-button" 
              >
                Instagram DM ile Öde
              </a>
            </div>
            <p className="mt-4">İletişime geçtiğinizde sepetinizdeki ürünleri ve toplam tutarı belirterek siparişinizi tamamlayabilirsiniz.</p>
            {/* Burada sipariş bilgilerini localStorage'a kaydetme işlemini tetiklemeliyiz. */}
            {/* Kullanıcının bu butona basması, siparişin "ödeme bekliyor" aşamasına geçtiğini varsayabiliriz. */}
            {/* Iyzipay entegrasyonu yoksa, sipariş bu aşamada elle işlenecek demektir. */}
            <button onClick={() => { 
                // Bu kısımda bir simülasyon yapalım, normalde bir ödeme ağ geçidine yönlendirme olur
                // Ancak şu an için sadece sipariş bilgilerini kaydedip Başarılı modalı gösterelim.
                const customerName = "Misafir Müşteri"; // Gerçek bir formdan alınmalı
                const customerEmail = "musteri@example.com"; // Gerçek bir formdan alınmalı
                const customerAddress = "Varsayılan Adres"; // Gerçek bir formdan alınmalı
                const customerPhone = "5551234567"; // Gerçek bir formdan alınmalı
                
                const customOrderId = `ALC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                const orderInfo = {
                    from_name: customerName,
                    from_email: customerEmail,
                    message: cartItems.map(item => `${item.name} (${item.size}) x${item.quantity}`).join(', '),
                    total_price: calculateTotal(),
                    customer_address: customerAddress,
                    customer_phone: customerPhone,
                    custom_order_id: customOrderId,
                };
                localStorage.setItem("orderInfo", JSON.stringify(orderInfo));
                // Supabase kaydı ve email gönderme işlemi useEffect içinde "odeme=basarili" ile tetiklenecek.
                // Bu durumda ödeme butonuna basıldığında direkt başarılı modala geçmek yerine
                // WhatsApp/Instagram ile ödeme denildiği için orada siparişin manuel takip edilmesi bekleniyor.
                // Eğer otomatik bir ödeme entegrasyonu (iyzipay gibi) olsaydı, o zaman yönlendirme olurdu.
                // Şu anki senaryoda, direkt "Anladım ve Sepeti Temizle" diyerek ödeme seçeneğini kapatıp,
                // manuel sürece bırakıyoruz.
                setShowPaymentModal(false);
                setShowSuccessModal(true); // Direkt başarılı modalı göster
                clearCart();
                setHasOrdered(true); // Sipariş verildi olarak işaretle
                localStorage.setItem("hasOrdered", "true");
                // Normalde burada iyzipay'e yönlendirme olurdu, şimdilik yorum satırı yapıyorum.
                // window.location.href = `https://iyzipay-test.com/pay?amount=${calculateTotal()}&orderId=${customOrderId}`;
             }}>Anladım ve Sepeti Temizle</button>
          </div>
        </div>
      )}

      {/* Başarılı Sipariş Modalı */}
      {showSuccessModal && (
        <div className="modal-backdrop" onClick={() => setShowSuccessModal(false)}>
          <div className="modal-content-base order-confirmation" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowSuccessModal(false)}>×</button>
            <h2>Teşekkürler!</h2>
            <p>Siparişinizle ilgili bilgilendirme e-postanız gönderildi.</p>
            <p>Sipariş Numaranız: <strong>{JSON.parse(localStorage.getItem("orderInfo"))?.custom_order_id || 'Bilgi Yok'}</strong></p>
            <button onClick={() => setShowSuccessModal(false)}>Kapat</button>
          </div>
        </div>
      )}

      {/* İade Formu Modalı */}
      {showReturnForm && (
        <div className="modal-backdrop" onClick={() => setShowReturnForm(false)}>
          <div className="modal-content-base order-confirmation" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowReturnForm(false)}>×</button>
            <h2>İade Talebi</h2>
            <form onSubmit={sendReturnEmail}>
              <input type="text" name="name" placeholder="Ad Soyad" required />
              <input type="email" name="email" placeholder="E-posta" required />
              <input type="text" name="order" placeholder="Sipariş Numarası veya Detayı" required />
              <textarea name="reason" placeholder="İade Sebebi" required />
              <button type="submit">Gönder</button>
            </form>
          </div>
        </div>
      )}

      {/* Ürün Detay Modalı */}
      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content-base product-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setSelectedProduct(null)}>×</button>
            <div className="product-modal-image-wrapper"> {/* Resim ve oklar için sarmalayıcı */}
                <img 
                    src={(selectedProduct.image && selectedProduct.image.length > 0) ? selectedProduct.image[currentModalImageIndex] : "https://placehold.co/400x400/e0e0e0/000000?text=No+Image"} 
                    alt={selectedProduct.name} 
                    className="product-modal-image" 
                />
                {selectedProduct.image && selectedProduct.image.length > 1 && (
                    <div className="modal-image-navigation">
                        <button
                            className="modal-nav-arrow left"
                            onClick={(e) => {
                                e.stopPropagation(); // Modalın kapanmasını engelle
                                setCurrentModalImageIndex(prevIndex =>
                                    (prevIndex - 1 + selectedProduct.image.length) % selectedProduct.image.length
                                );
                            }}
                        >
                            &#x2039; {/* Sol ok */}
                        </button>
                        <button
                            className="modal-nav-arrow right"
                            onClick={(e) => {
                                e.stopPropagation(); // Modalın kapanmasını engelle
                                setCurrentModalImageIndex(prevIndex =>
                                    (prevIndex + 1) % selectedProduct.image.length
                                );
                            }}
                        >
                            &#x203A; {/* Sağ ok */}
                        </button>
                    </div>
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
    </>
  );
}