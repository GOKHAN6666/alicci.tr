import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Supabase client'ı import et
import './AdminPanel.css'; // AdminPanel için stil dosyanızı import edin

const AdminPanel = () => {
    // Ürün Yönetimi State'leri
    const [products, setProducts] = useState([]);
    const [newProductName, setNewProductName] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('');
    const [newProductDescription, setNewProductDescription] = useState('');
    const [newProductImage, setNewProductImage] = useState(''); // Resim URL'si için

    // Sipariş Yönetimi State'leri
    const [orders, setOrders] = useState([]);
    const [orderStatusOptions] = useState(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']); // Sipariş durumları

    // Kargo Takibi Yönetimi State'leri
    const [cargoEntries, setCargoEntries] = useState([]);
    const [newCargoOrderId, setNewCargoOrderId] = useState('');
    const [newCargoEmail, setNewCargoEmail] = useState('');
    const [newCargoCompany, setNewCargoCompany] = useState('');
    const [newTrackingCode, setNewTrackingCode] = useState('');
    const [newCargoStatus, setNewCargoStatus] = useState('');
    const [cargoStatusOptions] = useState(['Preparing', 'On the Way', 'Delivered', 'Problem']); // Kargo durumları

    // Veri çekme ve güncelleme durumları
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Veri çekme fonksiyonları
    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('products').select('*');
        if (error) {
            console.error('Ürünler çekilirken hata oluştu:', error);
            setError('Ürünler yüklenemedi.');
        } else {
            setProducts(data);
        }
        setLoading(false);
    };

    const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('order').select('*');
        if (error) {
            console.error('Siparişler çekilirken hata oluştu:', error);
            setError('Siparişler yüklenemedi.');
        } else {
            setOrders(data);
        }
        setLoading(false);
    };

    const fetchCargoEntries = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('KARGO').select('*'); // Supabase'deki tablo adı 'KARGO' (büyük harf)
        if (error) {
            console.error('Kargo bilgileri çekilirken hata oluştu:', error);
            setError('Kargo bilgileri yüklenemedi.');
        } else {
            setCargoEntries(data);
        }
        setLoading(false);
    };

    // Tüm verileri başlangıçta çek
    useEffect(() => {
        fetchProducts();
        fetchOrders();
        fetchCargoEntries();
    }, []);

    // Ürün Yönetimi Fonksiyonları
    const handleAddProduct = async () => {
        if (!newProductName || !newProductPrice || !newProductImage) {
            alert('Lütfen ürün adı, fiyatı ve resim URL\'si girin.');
            return;
        }
        const { data, error } = await supabase.from('products').insert([
            {
                name: newProductName,
                price: parseFloat(newProductPrice), // Fiyatı sayıya çevir
                description: newProductDescription,
                image: newProductImage,
            },
        ]).select(); // Eklenen veriyi geri almak için select() kullan

        if (error) {
            console.error('Ürün eklenirken hata oluştu:', error);
            alert('Ürün eklenirken bir hata oluştu: ' + (error.message || 'Bilinmeyen Hata'));
        } else {
            setProducts([...products, data[0]]); // Yeni ürünü state'e ekle
            setNewProductName('');
            setNewProductPrice('');
            setNewProductDescription('');
            setNewProductImage('');
            alert('Ürün başarıyla eklendi!');
        }
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
            const { error } = await supabase.from('products').delete().eq('id', id); // 'id' kullanılmalı
            if (error) {
                console.error('Ürün silinirken hata oluştu:', error);
                alert('Ürün silinirken bir hata oluştu: ' + error.message);
            } else {
                setProducts(products.filter(product => product.id !== id));
                alert('Ürün başarıyla silindi!');
            }
        }
    };

    // Sipariş Yönetimi Fonksiyonları
    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        const { error } = await supabase.from('order').update({ order_status: newStatus }).eq('id', orderId);
        if (error) {
            console.error('Sipariş durumu güncellenirken hata oluştu:', error);
            alert('Sipariş durumu güncellenirken bir hata oluştu: ' + error.message);
        } else {
            setOrders(orders.map(order =>
                order.id === orderId ? { ...order, order_status: newStatus } : order
            ));
            alert('Sipariş durumu başarıyla güncellendi!');
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (window.confirm('Bu siparişi silmek istediğinizden emin misiniz?')) {
            const { error } = await supabase.from('order').delete().eq('id', orderId);
            if (error) {
                console.error('Sipariş silinirken hata oluştu:', error);
                alert('Sipariş silinirken bir hata oluştu: ' + error.message);
            } else {
                setOrders(orders.filter(order => order.id !== orderId));
                alert('Sipariş başarıyla silindi!');
            }
        }
    };

    // Kargo Yönetimi Fonksiyonları
    const handleAddCargoEntry = async () => {
        if (!newCargoOrderId || !newCargoEmail || !newCargoCompany || !newTrackingCode || !newCargoStatus) {
            alert('Lütfen tüm kargo bilgilerini girin.');
            return;
        }
        const { data, error } = await supabase.from('KARGO').insert([
            {
                order_id: newCargoOrderId,
                email: newCargoEmail,
                cargo_company: newCargoCompany,
                tracking_code: newTrackingCode,
                status: newCargoStatus,
            },
        ]).select(); // Eklenen veriyi geri almak için select() kullan

        if (error) {
            console.error('Kargo bilgisi eklenirken hata oluştu:', error);
            alert('Kargo bilgisi eklenirken bir hata oluştu: ' + (error.message || 'Bilinmeyen Hata'));
        } else {
            setCargoEntries([...cargoEntries, data[0]]);
            setNewCargoOrderId('');
            setNewCargoEmail('');
            setNewCargoCompany('');
            setNewTrackingCode('');
            setNewCargoStatus('');
            alert('Kargo bilgisi başarıyla eklendi!');
        }
    };

    const handleDeleteCargoEntry = async (id) => {
        if (window.confirm('Bu kargo bilgisini silmek istediğinizden emin misiniz?')) {
            const { error } = await supabase.from('KARGO').delete().eq('id', id);
            if (error) {
                console.error('Kargo bilgisi silinirken hata oluştu:', error);
                alert('Kargo bilgisi silinirken bir hata oluştu: ' + error.message);
            } else {
                setCargoEntries(cargoEntries.filter(entry => entry.id !== id));
                alert('Kargo bilgisi başarıyla silindi!');
            }
        }
    };

    return (
        <div className="admin-panel-container">
            <h1 className="admin-panel-title">Admin Paneli</h1>

            {loading && <p>Veriler yükleniyor...</p>}
            {error && <p className="error-message">{error}</p>}

            {/* Ürün Yönetimi */}
            <section className="admin-section product-management">
                <h2>Ürün Yönetimi</h2>
                <div className="add-product-form">
                    <input
                        type="text"
                        placeholder="Ürün Adı"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                    />
                    <input
                        type="number" // Price için type="number" kullanmak daha iyi
                        placeholder="Fiyat"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Açıklama (isteğe bağlı)"
                        value={newProductDescription}
                        onChange={(e) => setNewProductDescription(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Resim URL'si"
                        value={newProductImage}
                        onChange={(e) => setNewProductImage(e.target.value)}
                    />
                    <button onClick={handleAddProduct}>Ürün Ekle</button>
                </div>

                <h3>Mevcut Ürünler</h3>
                <ul className="product-list">
                    {products.map(product => (
                        <li key={product.id} className="product-item">
                            <img src={product.image} alt={product.name} className="product-thumb" />
                            <span>{product.name} - ₺{product.price}</span>
                            <button onClick={() => handleDeleteProduct(product.id)}>Sil</button>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Sipariş Yönetimi */}
            <section className="admin-section order-management">
                <h2>Sipariş Yönetimi</h2>
                <ul className="order-list">
                    {orders.map(order => (
                        <li key={order.id} className="order-item">
                            <div className="order-details">
                                <strong>Sipariş ID:</strong> {order.order_id}<br />
                                <strong>Müşteri:</strong> {order.customer_name} ({order.customer_email})<br />
                                <strong>Ürünler:</strong>
                                <ul>
                                    {order.order_items && Array.isArray(order.order_items) && order.order_items.map((item, idx) => (
                                        <li key={idx}>
                                            {item.name} ({item.quantity}) - ₺{item.price}
                                        </li>
                                    ))}
                                </ul>
                                <strong>Toplam:</strong> ₺{order.total_price}<br />
                                <strong>Durum:</strong>
                                <select
                                    value={order.order_status}
                                    onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                >
                                    {orderStatusOptions.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                            <button onClick={() => handleDeleteOrder(order.id)}>Siparişi Sil</button>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Kargo Takibi Yönetimi */}
            <section className="admin-section cargo-management">
                <h2>Kargo Takibi Yönetimi</h2>
                <div className="add-cargo-form">
                    <input
                        type="text"
                        placeholder="Sipariş ID"
                        value={newCargoOrderId}
                        onChange={(e) => setNewCargoOrderId(e.target.value)}
                    />
                    <input
                        type="email"
                        placeholder="Müşteri E-posta"
                        value={newCargoEmail}
                        onChange={(e) => setNewCargoEmail(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Kargo Firması"
                        value={newCargoCompany}
                        onChange={(e) => setNewCargoCompany(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Takip Kodu"
                        value={newTrackingCode}
                        onChange={(e) => setNewTrackingCode(e.target.value)}
                    />
                    <select
                        value={newCargoStatus}
                        onChange={(e) => setNewCargoStatus(e.target.value)}
                    >
                        <option value="">Durum Seçin</option>
                        {cargoStatusOptions.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <button onClick={handleAddCargoEntry}>Kargo Bilgisi Ekle</button>
                </div>

                <h3>Mevcut Kargo Bilgileri</h3>
                <ul className="cargo-list">
                    {cargoEntries.map(entry => (
                        <li key={entry.id} className="cargo-item">
                            <strong>Sipariş ID:</strong> {entry.order_id}<br />
                            <strong>Müşteri E-posta:</strong> {entry.email}<br />
                            <strong>Firma:</strong> {entry.cargo_company}<br />
                            <strong>Takip Kodu:</strong> {entry.tracking_code}<br />
                            <strong>Durum:</strong> {entry.status}
                            <button onClick={() => handleDeleteCargoEntry(entry.id)}>Sil</button>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
};

export default AdminPanel;