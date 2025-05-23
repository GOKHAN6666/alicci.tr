import { useParams, Link, useNavigate } from 'react-router-dom';

export default function ProductDetail({ cartItems, setCartItems }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const product = {
    id,
    name: `Ürün ${id}`,
    description: `Bu Ürün ${id} için detaylı açıklamadır. Kaliteli kumaş, sade tasarım.`,
    price: 4950,
    image: '', // Görsel URL eklersen burada kullanabilirsin
  };

  const addToCart = () => {
    setCartItems([...cartItems, { name: product.name, price: product.price }]);
    navigate('/');
  };

  return (
    <div className="product-detail">
      <div className="back">
        <Link to="/">&larr; Geri Dön</Link>
      </div>
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <p className="price">₺{product.price}</p>
      <button onClick={addToCart}>Sepete Ekle</button>
    </div>
  );
}
