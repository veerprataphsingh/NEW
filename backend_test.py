import requests
import sys
import json
from datetime import datetime
import time

class CryptoGadgetAPITester:
    def __init__(self, base_url="https://crypto-gadget.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_seed_data(self):
        """Seed the database with products"""
        success, response = self.run_test(
            "Seed Database",
            "POST",
            "seed",
            200
        )
        return success

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(time.time())
        test_user_data = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.test_email = test_user_data['email']
            self.test_password = test_user_data['password']
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        if not hasattr(self, 'test_email'):
            self.log_test("User Login", False, "No test user created")
            return False
            
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_get_user_profile(self):
        """Test getting user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_get_products(self):
        """Test getting all products"""
        success, response = self.run_test(
            "Get All Products",
            "GET",
            "products",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            self.test_product = response[0]  # Store first product for later tests
            return True
        return False

    def test_get_products_by_category(self):
        """Test filtering products by category"""
        categories = ['phones', 'laptops', 'metaglass', 'cameras']
        
        for category in categories:
            success, response = self.run_test(
                f"Get Products - Category: {category}",
                "GET",
                f"products?category={category}",
                200
            )
            if not success:
                return False
        return True

    def test_get_single_product(self):
        """Test getting a single product"""
        if not hasattr(self, 'test_product'):
            self.log_test("Get Single Product", False, "No test product available")
            return False
            
        success, response = self.run_test(
            "Get Single Product",
            "GET",
            f"products/{self.test_product['id']}",
            200
        )
        return success

    def test_cart_operations(self):
        """Test cart operations"""
        if not hasattr(self, 'test_product'):
            self.log_test("Cart Operations", False, "No test product available")
            return False

        # Get empty cart
        success, response = self.run_test(
            "Get Empty Cart",
            "GET",
            "cart",
            200
        )
        if not success:
            return False

        # Add item to cart
        cart_item = {
            "product_id": self.test_product['id'],
            "quantity": 2,
            "name": self.test_product['name'],
            "price": self.test_product['price'],
            "image_url": self.test_product['image_url']
        }
        
        success, response = self.run_test(
            "Add Item to Cart",
            "POST",
            "cart/add",
            200,
            data=cart_item
        )
        if not success:
            return False

        # Get cart with items
        success, response = self.run_test(
            "Get Cart with Items",
            "GET",
            "cart",
            200
        )
        if not success:
            return False

        # Remove item from cart
        success, response = self.run_test(
            "Remove Item from Cart",
            "DELETE",
            f"cart/remove/{self.test_product['id']}",
            200
        )
        if not success:
            return False

        # Clear cart
        success, response = self.run_test(
            "Clear Cart",
            "DELETE",
            "cart/clear",
            200
        )
        return success

    def test_order_operations(self):
        """Test order creation and retrieval"""
        if not hasattr(self, 'test_product'):
            self.log_test("Order Operations", False, "No test product available")
            return False

        # First add item to cart
        cart_item = {
            "product_id": self.test_product['id'],
            "quantity": 1,
            "name": self.test_product['name'],
            "price": self.test_product['price'],
            "image_url": self.test_product['image_url']
        }
        
        self.run_test("Add Item for Order", "POST", "cart/add", 200, data=cart_item)

        # Create order with card payment
        order_data = {
            "items": [cart_item],
            "total": self.test_product['price'],
            "payment_method": "card",
            "shipping_address": {
                "name": "Test User",
                "address": "123 Test St",
                "city": "Test City",
                "postal_code": "12345",
                "country": "USA"
            }
        }
        
        success, response = self.run_test(
            "Create Order - Card Payment",
            "POST",
            "orders",
            200,
            data=order_data
        )
        
        if success and 'id' in response:
            self.test_order_id = response['id']
        else:
            return False

        # Create order with crypto payment
        order_data_crypto = {
            "items": [cart_item],
            "total": self.test_product['price'],
            "payment_method": "crypto",
            "crypto_tx_hash": "0x1234567890abcdef",
            "shipping_address": {
                "name": "Test User",
                "address": "123 Test St",
                "city": "Test City",
                "postal_code": "12345",
                "country": "USA"
            }
        }
        
        success, response = self.run_test(
            "Create Order - Crypto Payment",
            "POST",
            "orders",
            200,
            data=order_data_crypto
        )
        if not success:
            return False

        # Get all orders
        success, response = self.run_test(
            "Get All Orders",
            "GET",
            "orders",
            200
        )
        if not success:
            return False

        # Get specific order
        if hasattr(self, 'test_order_id'):
            success, response = self.run_test(
                "Get Specific Order",
                "GET",
                f"orders/{self.test_order_id}",
                200
            )
            return success
        
        return True

    def test_ai_recommendations(self):
        """Test AI recommendations"""
        ai_request = {
            "user_preferences": "I need a secure phone for crypto trading",
            "category": "phones"
        }
        
        success, response = self.run_test(
            "AI Recommendations - Phones",
            "POST",
            "ai/recommend",
            200,
            data=ai_request
        )
        
        if not success:
            return False

        # Test AI recommendations without category
        ai_request_all = {
            "user_preferences": "I want high-performance devices for blockchain development"
        }
        
        success, response = self.run_test(
            "AI Recommendations - All Categories",
            "POST",
            "ai/recommend",
            200,
            data=ai_request_all
        )
        
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Crypto Gadget E-commerce API Tests")
        print("=" * 60)
        
        # Test sequence
        tests = [
            ("Seed Database", self.test_seed_data),
            ("User Registration", self.test_user_registration),
            ("User Login", self.test_user_login),
            ("Get User Profile", self.test_get_user_profile),
            ("Get Products", self.test_get_products),
            ("Get Products by Category", self.test_get_products_by_category),
            ("Get Single Product", self.test_get_single_product),
            ("Cart Operations", self.test_cart_operations),
            ("Order Operations", self.test_order_operations),
            ("AI Recommendations", self.test_ai_recommendations)
        ]
        
        for test_name, test_func in tests:
            print(f"\n📋 Running {test_name}...")
            try:
                test_func()
            except Exception as e:
                self.log_test(test_name, False, f"Exception: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = CryptoGadgetAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())