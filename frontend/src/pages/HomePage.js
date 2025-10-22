import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Zap, Shield, Cpu, ArrowRight } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import Navbar from '@/components/Navbar';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [showAuth, setShowAuth] = useState(false);

  const categories = [
    { name: 'Phones', icon: '📱', color: 'from-blue-400 to-blue-600' },
    { name: 'Laptops', icon: '💻', color: 'from-purple-400 to-purple-600' },
    { name: 'MetaGlass', icon: '🥽', color: 'from-pink-400 to-pink-600' },
    { name: 'Cameras', icon: '📷', color: 'from-green-400 to-green-600' },
  ];

  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Secure Payments',
      description: 'Pay with crypto or traditional methods securely'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'AI Recommendations',
      description: 'Smart product suggestions powered by AI'
    },
    {
      icon: <Cpu className="w-8 h-8" />,
      title: 'Blockchain Ready',
      description: 'All devices optimized for Web3 and crypto'
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative px-6 py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 opacity-60"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-purple-200 mb-6">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Next-Gen Crypto Gadgets</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
              The Future of Tech<br />Meets Blockchain
            </h1>
            
            <p className="text-base sm:text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Discover cutting-edge gadgets built for the decentralized world.
              Secure, smart, and blockchain-ready devices for the modern crypto enthusiast.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={() => navigate('/products')}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-6 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                data-testid="explore-products-btn"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Explore Products
              </Button>
              
              {!user && (
                <Button 
                  onClick={() => setShowAuth(true)}
                  size="lg"
                  variant="outline"
                  className="px-8 py-6 rounded-full text-lg font-semibold border-2 border-purple-600 text-purple-600 hover:bg-purple-50"
                  data-testid="get-started-btn"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="px-6 py-16 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <div
                key={index}
                onClick={() => navigate(`/products?category=${category.name.toLowerCase()}`)}
                className="glass rounded-3xl p-8 text-center cursor-pointer card-hover group"
                data-testid={`category-${category.name.toLowerCase()}`}
              >
                <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center text-4xl group-hover:scale-110 transition-transform`}>
                  {category.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-800">{category.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="glass rounded-3xl p-8 text-center card-hover">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">Ready to Enter the Future?</h2>
          <p className="text-lg mb-8 opacity-90">Join thousands of crypto enthusiasts upgrading their tech arsenal</p>
          <Button 
            onClick={() => navigate('/products')}
            size="lg"
            className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-6 rounded-full text-lg font-semibold"
            data-testid="shop-now-btn"
          >
            Shop Now
          </Button>
        </div>
      </section>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};

export default HomePage;
