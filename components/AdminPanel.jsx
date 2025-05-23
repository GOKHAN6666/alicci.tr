// src/components/AdminPanel.jsx
import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";

export default function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", image: "" });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*");
    if (!error) setProducts(data);
  };

  const handleAddProduct = async () => {
    const { data, error } = await supabase.from("products").insert([newProduct]);
    if (!error) {
      setNewProduct({ name: "", price: "", image: "" });
      fetchProducts();
    }
  };

  const handleDeleteProduct = async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) fetchProducts();
  };

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>

      <div className="form">
        <input
          type="text"
          placeholder="Ürün adı"
          value={newProduct.name}
          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Fiyat"
          value={newProduct.price}
          onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
        />
        <input
          type="text"
          placeholder="Görsel URL"
          value={newProduct.image}
          onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
        />
        <button onClick={handleAddProduct}>Ürün Ekle</button>
      </div>

      <ul>
        {products.map((p) => (
          <li key={p.id}>
            {p.name} - ₺{p.price}
            <button onClick={() => handleDeleteProduct(p.id)}>Sil</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
