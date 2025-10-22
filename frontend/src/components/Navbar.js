import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Package, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="glass sticky top-0 z-50 border-b border-white/30">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div 
            onClick={() => navigate('/')}
            className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent cursor-pointer"
            data-testid="logo"
          >
            CryptoGadgets
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/products')}
              data-testid="nav-products-link"
            >
              Products
            </Button>
            
            {user ? (
              <>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/cart')}
                  data-testid="nav-cart-btn"
                >
                  <ShoppingCart className="w-5 h-5" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/orders')}
                  data-testid="nav-orders-btn"
                >
                  <Package className="w-5 h-5" />
                </Button>

                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50">
                  <User className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium" data-testid="user-name">{user.name}</span>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleLogout}
                  data-testid="logout-btn"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600"
                data-testid="nav-login-btn"
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
