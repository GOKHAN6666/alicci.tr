import { Link } from 'react-router-dom';

export default function Home() {
  const products = [
    { id: 1, title: 'Oversize Tişört', price: '₺4.950' },
    { id: 2, title: 'Kaşmir Sweat', price: '₺8.500' },
    { id: 3, title: 'Minimal Ceket', price: '₺12.750' },
  ];

  return (
    <section className="products">
      <h3>Yeni Sezon</h3>
      <div className="products-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <div className="image"></div>
            <div className="info">
              <h4>{product.title}</h4>
              <p>{product.price}</p>
              <Link to={`/product/${product.id}`}>
                <button>Detay</button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
