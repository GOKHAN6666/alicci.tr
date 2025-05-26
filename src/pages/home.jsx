import { Link } from 'react-router-dom';

export default function Home() {
  const products = [
    { id: 1, title: 'Oversize Tişört', price: '₺4.950', image: '/images/a.jpg' },
    { id: 2, title: 'Kaşmir Sweat', price: '₺8.500', image: '/images/b.jpg' },
    { id: 3, title: 'Minimal Ceket', price: '₺12.750', image: '/images/c.jpg' },
  ];

  return (
    <section className="products">
      <h3>Yeni Sezon</h3>
      <div className="products-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <div className="image">
              <img src={product.image} alt={product.title} />
            </div>
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
