import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");

  // Ürünleri getir
  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*");
    if (error) console.error("Ürün çekme hatası:", error);
    else setProducts(data);
  };

  useEffect(() => {
    fetchProducts();
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

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Admin Panel</h2>

      <form onSubmit={handleAddProduct} style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Ürün adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Fiyat"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Görsel URL"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          required
        />
        <button type="submit">Ürün Ekle</button>
      </form>

      <ul>
        {products.map((p) => (
          <li key={p.id} style={{ marginBottom: "1rem" }}>
            <strong>{p.name}</strong> – {p.price}₺<br />
            <img src={p.image} alt={p.name} style={{ maxWidth: "100px" }} />
            <br />
            <button onClick={() => handleDeleteProduct(p.id)}>Sil</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
