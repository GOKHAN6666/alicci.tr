import React from "react";

export default function ProductDetail({ product, onClose }) {
  return (
    <div className="product-detail">
      <div className="detail-card">
        <img src={product.image} alt={product.name} />
        <div>
          <h2>{product.name}</h2>
          <p>{product.description || "Açıklama yok."}</p>
          <p>₺{product.price}</p>
        </div>
        <button onClick={onClose}>Kapat</button>
      </div>
    </div>
  );
}
