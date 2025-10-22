import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Bitcoin } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cryptoTxHash, setCryptoTxHash] = useState('');
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    country: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchCart();
  }, [user]);

  const fetchCart = async () => {
    try {
      const response = await axios.get(`${API}/cart`);
      setCart(response.data);
      if (!response.data.items || response.data.items.length === 0) {
        navigate('/cart');
      }
    } catch (error) {
      toast.error('Failed to load cart');
    }
  };

  const getTotalPrice = () => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleInputChange = (field, value) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitOrder = async () => {
    // Validate shipping address
    if (!shippingAddress.name || !shippingAddress.address || !shippingAddress.city) {
      toast.error('Please fill in all shipping details');
      return;
    }

    if (paymentMethod === 'crypto' && !cryptoTxHash) {
      toast.error('Please enter your transaction hash');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API}/orders`, {
        items: cart.items,
        total: getTotalPrice(),
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
        crypto_tx_hash: paymentMethod === 'crypto' ? cryptoTxHash : null
      });
      
      toast.success('Order placed successfully!');
      navigate('/orders');
    } catch (error) {
      toast.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !cart) return null;

  const total = getTotalPrice();

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-4xl font-bold mb-8">Checkout</h1>

        <div className="space-y-8">
          {/* Shipping Address */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Shipping Address</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={shippingAddress.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="John Doe"
                  data-testid="shipping-name-input"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={shippingAddress.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Main St"
                  data-testid="shipping-address-input"
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={shippingAddress.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="New York"
                  data-testid="shipping-city-input"
                />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input
                  value={shippingAddress.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  placeholder="10001"
                  data-testid="shipping-postal-input"
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={shippingAddress.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="USA"
                  data-testid="shipping-country-input"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Payment Method</h2>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer hover:bg-purple-50 transition-colors" data-testid="card-payment-option">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                  <div>
                    <div className="font-semibold">Credit/Debit Card</div>
                    <div className="text-sm text-gray-500">Pay securely with your card</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer hover:bg-purple-50 transition-colors" data-testid="crypto-payment-option">
                <RadioGroupItem value="crypto" id="crypto" />
                <Label htmlFor="crypto" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Bitcoin className="w-6 h-6 text-orange-500" />
                  <div>
                    <div className="font-semibold">Cryptocurrency</div>
                    <div className="text-sm text-gray-500">Pay with Bitcoin or Ethereum</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {paymentMethod === 'crypto' && (
              <div className="mt-6">
                <Label>Transaction Hash</Label>
                <Input
                  value={cryptoTxHash}
                  onChange={(e) => setCryptoTxHash(e.target.value)}
                  placeholder="Enter your blockchain transaction hash"
                  data-testid="crypto-tx-hash-input"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Please send ${total.toFixed(2)} worth of crypto to our wallet and enter the transaction hash above.
                </p>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Order Summary</h2>
            <div className="space-y-3 mb-6">
              {cart.items.map((item) => (
                <div key={item.product_id} className="flex justify-between">
                  <span>{item.name} x {item.quantity}</span>
                  <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-purple-600" data-testid="checkout-total-price">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Place Order Button */}
          <Button
            onClick={handleSubmitOrder}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-6 rounded-full text-lg font-semibold"
            data-testid="place-order-btn"
          >
            {loading ? 'Placing Order...' : 'Place Order'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
