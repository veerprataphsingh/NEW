import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Eye } from 'lucide-react';

const ProductCard = ({ product, onAddToCart, onViewDetails }) => {
  const handleCardClick = (e) => {
    // Don't navigate if clicking on buttons or their children
    const clickedButton = e.target.closest('button');
    if (!clickedButton) {
      onViewDetails();
    }
  };

  return (
    <div 
      className="glass rounded-2xl overflow-hidden card-hover cursor-pointer" 
      data-testid={`product-card-${product.id}`}
      onClick={handleCardClick}
    >
      <div className="relative">
        <img 
          src={product.image_url} 
          alt={product.name}
          className="w-full h-56 object-cover"
        />
        <Badge className="absolute top-4 right-4 bg-white/90 text-purple-600 pointer-events-none">
          {product.category}
        </Badge>
      </div>
      
      <div className="p-6">
        <h3 
          className="text-xl font-semibold mb-2 hover:text-purple-600 transition-colors"
          data-testid="product-card-name"
        >
          {product.name}
        </h3>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-bold text-purple-600" data-testid="product-card-price">
              ${product.price.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">
              ≈ ${product.crypto_price.toFixed(2)} crypto
            </div>
          </div>
          <div className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
            disabled={product.stock === 0}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600"
            data-testid="product-card-add-to-cart"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            variant="outline"
            size="icon"
            data-testid="product-card-view-details"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
