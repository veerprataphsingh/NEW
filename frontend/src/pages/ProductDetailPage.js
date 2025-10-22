import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import AuthModal from '@/components/AuthModal';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      toast.error('Failed to load product');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    try {
      await axios.post(`${API}/cart/add`, {
        product_id: product.id,
        quantity: quantity,
        name: product.name,
        price: product.price,
        image_url: product.image_url
      });
      toast.success('Added to cart!');
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/products')}
          className="mb-6"
          data-testid="back-to-products-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="glass rounded-3xl p-8">
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-full h-auto rounded-2xl object-cover"
            />
          </div>

          {/* Product Details */}
          <div>
            <Badge className="mb-4" data-testid="product-category">
              {product.category}
            </Badge>
            
            <h1 className="text-4xl font-bold mb-4" data-testid="product-name">
              {product.name}
            </h1>
            
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-4xl font-bold text-purple-600" data-testid="product-price">
                ${product.price.toFixed(2)}
              </span>
              <span className="text-lg text-gray-500">
                ≈ ${product.crypto_price.toFixed(2)} crypto
              </span>
            </div>

            <p className="text-gray-600 mb-8 leading-relaxed" data-testid="product-description">
              {product.description}
            </p>

            {/* Features */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Key Features</h3>
              <div className="space-y-2">
                {product.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stock */}
            <div className="mb-6">
              <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </span>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-3 glass rounded-full px-6 py-3">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="text-xl font-bold w-8 h-8 flex items-center justify-center"
                  data-testid="decrease-quantity-btn"
                >
                  -
                </button>
                <span className="text-lg font-semibold w-12 text-center" data-testid="quantity-value">
                  {quantity}
                </span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="text-xl font-bold w-8 h-8 flex items-center justify-center"
                  data-testid="increase-quantity-btn"
                >
                  +
                </button>
              </div>

              <Button
                onClick={addToCart}
                disabled={product.stock === 0}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-6 rounded-full text-lg font-semibold"
                data-testid="add-to-cart-btn"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};

export default ProductDetailPage;
