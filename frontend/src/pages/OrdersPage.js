import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';

const OrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-xl">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-4xl font-bold mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <Package className="w-20 h-20 mx-auto mb-6 text-gray-300" />
            <h2 className="text-2xl font-semibold mb-4">No orders yet</h2>
            <p className="text-gray-600">Start shopping to see your orders here!</p>
          </div>
        ) : (
          <div className="space-y-6" data-testid="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="glass rounded-2xl p-6" data-testid={`order-${order.id}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Order ID</div>
                    <div className="font-mono text-sm" data-testid="order-id">{order.id}</div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(order.payment_status)} data-testid="payment-status">
                      Payment: {order.payment_status}
                    </Badge>
                    <Badge className={`${getStatusColor(order.order_status)} ml-2`} data-testid="order-status">
                      {order.order_status}
                    </Badge>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-2">Items</div>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name} x {item.quantity}</span>
                        <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div>
                    <div className="text-sm text-gray-500">Payment Method</div>
                    <div className="font-semibold capitalize" data-testid="payment-method">{order.payment_method}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total</div>
                    <div className="text-2xl font-bold text-purple-600" data-testid="order-total">
                      ${order.total.toFixed(2)}
                    </div>
                  </div>
                </div>

                {order.crypto_tx_hash && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-500">Crypto Transaction Hash</div>
                    <div className="font-mono text-xs break-all">{order.crypto_tx_hash}</div>
                  </div>
                )}

                <div className="mt-4 text-sm text-gray-500">
                  Ordered on {new Date(order.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
