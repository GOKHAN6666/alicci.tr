// src/pages/Cart.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // Supabase istemcisini import et

export default function Cart() {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchCartItems();
    }, []);

    const fetchCartItems = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setCartItems([]);
                setLoading(false);
                return;
            }

            // Supabase'den kullanıcının sepetindeki ürünleri, adlarını VE FİYATLARINI çekiyoruz
            const { data, error } = await supabase
                .from('cart_items') // Kendi sepet tablonuzun adını buraya yazın (Örn: 'user_cart' veya 'shopping_cart')
                .select(`
                    id, // Sepet öğesinin kendi ID'si, silme işlemi için gerekli
                    product_id,
                    products (name, price) // <-- Ürün tablosundan adı ve FİYATI çekiyoruz!
                `)
                .eq('user_id', user.id); // Kullanıcının ID'sine göre filtrele. 'user_id' sütununuzun adını buraya yazın

            if (error) {
                throw error;
            }

            const formattedCartItems = data.map(item => ({
                id: item.id,
                productName: item.products ? item.products.name : 'Bilinmeyen Ürün',
                productPrice: item.products ? item.products.price : 0 // Fiyatı da alıyoruz
            }));

            setCartItems(formattedCartItems);

        } catch (err) {
            console.error('Sepet öğeleri çekilirken hata:', err);
            setError('Sepetiniz yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveItem = async (itemId, productName) => {
        if (!window.confirm(`${productName} ürününü sepetten kaldırmak istediğinizden emin misiniz?`)) {
            return; // Kullanıcı iptal ettiyse hiçbir şey yapma
        }
        try {
            const { error } = await supabase
                .from('cart_items') // Kendi sepet tablonuzun adını buraya yazın
                .delete()
                .eq('id', itemId);

            if (error) {
                throw error;
            }

            setCartItems(cartItems.filter(item => item.id !== itemId));
            console.log(`Sepet öğesi ${itemId} (${productName}) başarıyla silindi.`);

        } catch (err) {
            console.error('Sepet öğesi silinirken hata:', err);
            setError('Ürün sepetten silinirken bir sorun oluştu. Lütfen tekrar deneyin.');
        }
    };

    // Sepet toplam fiyatını hesapla
    const calculateTotalPrice = () => {
        return cartItems.reduce((total, item) => total + (item.productPrice || 0), 0).toFixed(2);
    };

    if (loading) return (
        <div className="cart-container">
            <div className="loading-spinner"></div> {/* Basit bir yükleme animasyonu */}
            <p>Sepetiniz yükleniyor...</p>
        </div>
    );
    if (error) return <div className="cart-container"><p className="error-message">{error}</p></div>;

    return (
        <div className="cart-container">
            <h1>Sepetim</h1>

            {cartItems.length === 0 ? (
                <div className="empty-cart-state">
                    <p className="empty-cart-message">Sepetiniz şu an boş.</p>
                    <p className="empty-cart-subtext">Hemen alışverişe başlayın ve harika ürünler keşfedin!</p>
                    {/* İsterseniz buraya anasayfaya yönlendiren bir buton ekleyebilirsiniz */}
                    {/* <button className="go-shopping-button">Alışverişe Başla</button> */}
                </div>
            ) : (
                <div className="cart-items-wrapper">
                    <ul className="cart-items-list">
                        {cartItems.map((item) => (
                            <li key={item.id} className="cart-item">
                                <div className="product-info">
                                    <span className="product-name">{item.productName}</span>
                                    <span className="product-price">₺{item.productPrice.toFixed(2)}</span>
                                </div>
                                <button
                                    className="remove-button"
                                    onClick={() => handleRemoveItem(item.id, item.productName)}
                                    aria-label={`Sepetten ${item.productName} ürününü sil`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-x">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className="cart-summary">
                        <div className="summary-row total-price">
                            <span>Toplam Fiyat:</span>
                            <span>₺{calculateTotalPrice()}</span>
                        </div>
                        <button className="checkout-button">Siparişi Tamamla</button>
                    </div>
                </div>
            )}
        </div>
    );
}