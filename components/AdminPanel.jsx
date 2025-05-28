import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient"; // supabaseClient.js'nin doğru yolunu belirtin

export default function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");

  // Kargo Takip Bilgileri için state'ler
  const [trackingEmail, setTrackingEmail] = useState("");
  const [trackingOrderId, setTrackingOrderId] = useState("");
  const [trackingFirm, setTrackingFirm] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("");
  const [allTrackingEntries, setAllTrackingEntries] = useState([]); // Tüm takip kayıtları

  // Supabase'den ürünleri getir
  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*");
    if (error) console.error("Ürün çekme hatası:", error);
    else setProducts(data);
  };

  // LocalStorage'dan kargo takip bilgilerini getir
  const fetchTrackingInfo = () => {
    const data = JSON.parse(localStorage.getItem("kargoTakipBilgileri")) || [];
    setAllTrackingEntries(data);
  };

  useEffect(() => {
    fetchProducts();
    fetchTrackingInfo(); // Sayfa yüklendiğinde takip bilgilerini de çek
  }, []);

  // Ürün ekle
  const handleAddProduct = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("products").insert([
      { name, price: parseFloat(price), image },
    ]);
    if (error) {
      alert("Ürün ekleme hatası!");
      console.error(error);
    } else {
      setName("");
      setPrice("");
      setImage("");
      fetchProducts(); // Listeyi güncelle
    }
  };

  // Ürün sil
  const handleDeleteProduct = async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      alert("Silme hatası!");
      console.error(error);
    } else {
      fetchProducts(); // Listeyi güncelle
    }
  };

  // Kargo takip bilgisi ekle
  const handleAddTrackingInfo = (e) => {
    e.preventDefault();
    const newEntry = {
      email: trackingEmail,
      orderId: trackingOrderId,
      kargoFirmasi: trackingFirm,
      takipKodu: trackingCode,
      kargoDurumu: trackingStatus,
    };

    const updatedEntries = [...allTrackingEntries, newEntry];
    localStorage.setItem("kargoTakipBilgileri", JSON.stringify(updatedEntries));
    setAllTrackingEntries(updatedEntries); // State'i güncelle
    alert("Kargo takip bilgisi eklendi!");
    // Formu sıfırla
    setTrackingEmail("");
    setTrackingOrderId("");
    setTrackingFirm("");
    setTrackingCode("");
    setTrackingStatus("");
  };

  // Kargo takip bilgisi sil
  const handleDeleteTrackingInfo = (indexToDelete) => {
    const updatedEntries = allTrackingEntries.filter((_, index) => index !== indexToDelete);
    localStorage.setItem("kargoTakipBilgileri", JSON.stringify(updatedEntries));
    setAllTrackingEntries(updatedEntries);
    alert("Kargo takip bilgisi silindi!");
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto", backgroundColor: "#f8f8f8", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: "2.5rem", marginBottom: "2rem", textAlign: "center", color: "#111" }}>Admin Panel</h2>

      {/* Ürün Yönetimi */}
      <h3 style={{ fontSize: "1.8rem", marginBottom: "1.5rem", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>Ürün Yönetimi</h3>
      <form onSubmit={handleAddProduct} style={{ marginBottom: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
        <input
          type="text"
          placeholder="Ürün adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
        />
        <input
          type="number"
          placeholder="Fiyat"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
        />
        <input
          type="text"
          placeholder="Görsel URL"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          required
          style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px", gridColumn: "span 2" }}
        />
        <button type="submit" style={{ padding: "12px 20px", backgroundColor: "#111", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", gridColumn: "span 2", fontFamily: 'inherit' }}>Ürün Ekle</button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
        {products.map((p) => (
          <div key={p.id} style={{ border: "1px solid #eee", borderRadius: "6px", padding: "15px", backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <h4 style={{ fontSize: "1.2rem", marginBottom: "5px", color: "#222" }}>{p.name}</h4>
            <p style={{ color: "#555", marginBottom: "10px" }}>{p.price}₺</p>
            <img src={p.image} alt={p.name} style={{ maxWidth: "100%", height: "120px", objectFit: "cover", borderRadius: "4px", marginBottom: "10px" }} />
            <button onClick={() => handleDeleteProduct(p.id)} style={{ padding: "8px 15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontFamily: 'inherit' }}>Sil</button>
          </div>
        ))}
      </div>

      <hr style={{ margin: "3rem 0", borderTop: "1px solid #eee" }} />

      {/* Kargo Takip Yönetimi */}
      <h3 style={{ fontSize: "1.8rem", marginBottom: "1.5rem", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>Kargo Takip Yönetimi</h3>
      <form onSubmit={handleAddTrackingInfo} style={{ marginBottom: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
        <input
          type="email"
          placeholder="Müşteri E-posta"
          value={trackingEmail}
          onChange={(e) => setTrackingEmail(e.target.value)}
          required
          style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px", gridColumn: "span 2" }}
        />
        <input
          type="text"
          placeholder="Sipariş Numarası (örn: ALC-12345)"
          value={trackingOrderId}
          onChange={(e) => setTrackingOrderId(e.target.value)}
          required
          style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px", gridColumn: "span 2" }}
        />
        <input
          type="text"
          placeholder="Kargo Firması (örn: Yurtiçi Kargo)"
          value={trackingFirm}
          onChange={(e) => setTrackingFirm(e.target.value)}
          required
          style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
        />
        <input
          type="text"
          placeholder="Takip Kodu"
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value)}
          required
          style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
        />
        <input
          type="text"
          placeholder="Kargo Durumu (örn: Yolda, Teslim Edildi)"
          value={trackingStatus}
          onChange={(e) => setTrackingStatus(e.target.value)}
          required
          style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px", gridColumn: "span 2" }}
        />
        <button type="submit" style={{ padding: "12px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", gridColumn: "span 2", fontFamily: 'inherit' }}>Kargo Bilgisi Ekle</button>
      </form>

      <h4 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Mevcut Kargo Bilgileri</h4>
      {allTrackingEntries.length === 0 ? (
        <p>Henüz kayıtlı kargo bilgisi yok.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {allTrackingEntries.map((entry, index) => (
            <li key={index} style={{ border: "1px solid #eee", borderRadius: "6px", padding: "15px", marginBottom: "10px", backgroundColor: "white", boxShadow: "0 2px 5px rgba(0,0,0,0.01)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>E-posta:</strong> {entry.email}<br />
                <strong>Sipariş No:</strong> {entry.orderId}<br />
                <strong>Firma:</strong> {entry.kargoFirmasi}<br />
                <strong>Takip Kodu:</strong> {entry.takipKodu}<br />
                <strong>Durum:</strong> {entry.kargoDurumu}
              </div>
              <button onClick={() => handleDeleteTrackingInfo(index)} style={{ padding: "8px 15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontFamily: 'inherit' }}>Sil</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}