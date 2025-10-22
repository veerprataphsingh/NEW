import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import AuthModal from '@/components/AuthModal';

const ProductsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreference, setAiPreference] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [category]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/products?category=${category}`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;
    if (searchTerm) {
      filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredProducts(filtered);
  };

  const getAIRecommendations = async () => {
    if (!aiPreference.trim()) {
      toast.error('Please enter your preferences');
      return;
    }

    try {
      setAiLoading(true);
      const response = await axios.post(`${API}/ai/recommend`, {
        user_preferences: aiPreference,
        category: category !== 'all' ? category : null
      });
      
      if (response.data.recommendations && response.data.recommendations.length > 0) {
        setFilteredProducts(response.data.recommendations);
        toast.success('AI recommendations loaded!');
      } else {
        toast.info('No specific recommendations found, showing all products');
      }
    } catch (error) {
      toast.error('AI recommendations failed');
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  const addToCart = async (product) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    try {
      await axios.post(`${API}/cart/add`, {
        product_id: product.id,
        quantity: 1,
        name: product.name,
        price: product.price,
        image_url: product.image_url
      });
      toast.success('Added to cart!');
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Discover Products</h1>
          <p className="text-gray-600">Find the perfect crypto gadgets for your needs</p>
        </div>

        {/* AI Recommendations */}
        <div className="glass rounded-3xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-xl font-semibold">AI-Powered Recommendations</h3>
          </div>
          <div className="flex gap-3">
            <Input
              placeholder="Tell us what you're looking for... (e.g., 'secure phone for crypto trading')"
              value={aiPreference}
              onChange={(e) => setAiPreference(e.target.value)}
              className="flex-1"
              data-testid="ai-preference-input"
            />
            <Button 
              onClick={getAIRecommendations}
              disabled={aiLoading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600"
              data-testid="ai-recommend-btn"
            >
              {aiLoading ? 'Thinking...' : 'Get Recommendations'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:w-1/3"
            data-testid="search-input"
          />
          
          <div className="md:w-1/4 relative z-50">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full" data-testid="category-filter">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="phones">Phones</SelectItem>
                <SelectItem value="laptops">Laptops</SelectItem>
                <SelectItem value="metaglass">MetaGlass</SelectItem>
                <SelectItem value="cameras">Cameras</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="text-xl">Loading products...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-600">No products found</p>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => addToCart(product)}
                onViewDetails={() => navigate(`/product/${product.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};

export default ProductsPage;
