from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===== MODELS =====
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    crypto_price: float  # in USD equivalent
    category: str
    image_url: str
    stock: int
    features: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CartItem(BaseModel):
    product_id: str
    quantity: int
    name: str
    price: float
    image_url: str

class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[CartItem]
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[CartItem]
    total: float
    payment_method: str  # 'card' or 'crypto'
    payment_status: str  # 'pending', 'completed', 'failed'
    order_status: str  # 'processing', 'shipped', 'delivered'
    crypto_tx_hash: Optional[str] = None
    shipping_address: dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    items: List[CartItem]
    total: float
    payment_method: str
    shipping_address: dict
    crypto_tx_hash: Optional[str] = None

class AIRecommendationRequest(BaseModel):
    user_preferences: str
    category: Optional[str] = None

# ===== HELPER FUNCTIONS =====
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===== AUTHENTICATION ROUTES =====
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = pwd_context.hash(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name
    )
    
    user_doc = user.model_dump()
    user_doc['password_hash'] = hashed_password
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": user_data.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not pwd_context.verify(user_data.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create user object
    user = User(
        id=user_doc['id'],
        email=user_doc['email'],
        name=user_doc['name'],
        created_at=datetime.fromisoformat(user_doc['created_at']) if isinstance(user_doc['created_at'], str) else user_doc['created_at']
    )
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(user_id: str = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# ===== PRODUCT ROUTES =====
@api_router.get("/products", response_model=List[Product])
async def get_products(category: Optional[str] = None):
    query = {}
    if category and category != "all":
        query["category"] = category
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    
    for product in products:
        if isinstance(product['created_at'], str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if isinstance(product['created_at'], str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return Product(**product)

# ===== CART ROUTES =====
@api_router.get("/cart", response_model=Cart)
async def get_cart(user_id: str = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user_id}, {"_id": 0})
    if not cart:
        # Create empty cart
        new_cart = Cart(user_id=user_id, items=[])
        cart_doc = new_cart.model_dump()
        cart_doc['updated_at'] = cart_doc['updated_at'].isoformat()
        await db.carts.insert_one(cart_doc)
        return new_cart
    
    if isinstance(cart['updated_at'], str):
        cart['updated_at'] = datetime.fromisoformat(cart['updated_at'])
    
    return Cart(**cart)

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, user_id: str = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user_id})
    
    if not cart:
        new_cart = Cart(user_id=user_id, items=[item])
        cart_doc = new_cart.model_dump()
        cart_doc['updated_at'] = cart_doc['updated_at'].isoformat()
        await db.carts.insert_one(cart_doc)
    else:
        # Check if item exists
        items = cart.get('items', [])
        found = False
        for i, existing_item in enumerate(items):
            if existing_item['product_id'] == item.product_id:
                items[i]['quantity'] += item.quantity
                found = True
                break
        
        if not found:
            items.append(item.model_dump())
        
        await db.carts.update_one(
            {"user_id": user_id},
            {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": "Item added to cart"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, user_id: str = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user_id})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    items = [item for item in cart.get('items', []) if item['product_id'] != product_id]
    
    await db.carts.update_one(
        {"user_id": user_id},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Item removed from cart"}

@api_router.delete("/cart/clear")
async def clear_cart(user_id: str = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": user_id},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Cart cleared"}

# ===== ORDER ROUTES =====
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, user_id: str = Depends(get_current_user)):
    order = Order(
        user_id=user_id,
        items=order_data.items,
        total=order_data.total,
        payment_method=order_data.payment_method,
        payment_status="completed" if order_data.payment_method == "card" else "pending",
        order_status="processing",
        crypto_tx_hash=order_data.crypto_tx_hash,
        shipping_address=order_data.shipping_address
    )
    
    order_doc = order.model_dump()
    order_doc['created_at'] = order_doc['created_at'].isoformat()
    
    await db.orders.insert_one(order_doc)
    
    # Clear cart
    await db.carts.update_one(
        {"user_id": user_id},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(user_id: str = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    for order in orders:
        if isinstance(order['created_at'], str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, user_id: str = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if isinstance(order['created_at'], str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    return Order(**order)

# ===== AI RECOMMENDATION ROUTE =====
@api_router.post("/ai/recommend")
async def get_ai_recommendations(request: AIRecommendationRequest):
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Get products from database
        query = {}
        if request.category and request.category != "all":
            query["category"] = request.category
        
        products = await db.products.find(query, {"_id": 0}).to_list(100)
        
        # Create product summary
        product_list = "\n".join([
            f"- {p['name']} ({p['category']}): ${p['price']} - {p['description'][:100]}"
            for p in products
        ])
        
        # Use LLM for recommendations
        chat = LlmChat(
            api_key=api_key,
            session_id=f"recommendations_{uuid.uuid4()}",
            system_message="You are a helpful shopping assistant for a crypto gadget store. Recommend products based on user preferences. Return only product names separated by commas."
        ).with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(
            text=f"User preferences: {request.user_preferences}\n\nAvailable products:\n{product_list}\n\nRecommend 3-4 best matching products. Return ONLY the product names separated by commas, nothing else."
        )
        
        response = await chat.send_message(user_message)
        
        # Parse recommendations
        recommended_names = [name.strip() for name in response.split(',')]
        recommended_products = [p for p in products if p['name'] in recommended_names]
        
        return {"recommendations": recommended_products[:4], "explanation": response}
    
    except Exception as e:
        logging.error(f"AI recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# ===== SEED DATA ROUTE =====
@api_router.post("/seed")
async def seed_data():
    # Check if products already exist
    existing = await db.products.count_documents({})
    if existing > 0:
        return {"message": "Database already seeded"}
    
    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "CryptoPhone Pro X",
            "description": "Secure smartphone with built-in hardware wallet and encrypted communications. Features quantum-resistant encryption and biometric security.",
            "price": 999.99,
            "crypto_price": 999.99,
            "category": "phones",
            "image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
            "stock": 50,
            "features": ["Hardware Wallet", "Encrypted Calls", "Biometric Security", "6.7 inch OLED"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "BlockChain Laptop Elite",
            "description": "High-performance laptop optimized for crypto trading and mining. 32GB RAM, RTX 4080, advanced cooling system.",
            "price": 2499.99,
            "crypto_price": 2499.99,
            "category": "laptops",
            "image_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",
            "stock": 30,
            "features": ["Intel i9", "32GB RAM", "RTX 4080", "1TB NVMe SSD"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "MetaVision AR Glass",
            "description": "Next-gen AR glasses with blockchain integration. View real-time crypto prices and NFTs in augmented reality.",
            "price": 1499.99,
            "crypto_price": 1499.99,
            "category": "metaglass",
            "image_url": "https://images.unsplash.com/photo-1612480797665-c96d261eae09?w=800",
            "stock": 20,
            "features": ["AR Display", "Blockchain Integration", "Voice Control", "8 hours battery"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Web3 Camera 4K",
            "description": "Professional camera with NFT minting capabilities. Mint your photos directly to blockchain with built-in crypto wallet.",
            "price": 899.99,
            "crypto_price": 899.99,
            "category": "cameras",
            "image_url": "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800",
            "stock": 40,
            "features": ["4K Video", "NFT Minting", "Built-in Wallet", "AI Enhancement"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "SecurePhone Mini",
            "description": "Compact secure phone with hardware encryption. Perfect for secure communications and crypto transactions on the go.",
            "price": 599.99,
            "crypto_price": 599.99,
            "category": "phones",
            "image_url": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800",
            "stock": 60,
            "features": ["Compact Design", "Hardware Encryption", "Long Battery Life", "5G Support"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "CryptoBook Air",
            "description": "Lightweight laptop with secure enclave for crypto keys. Perfect for traders who need portability and security.",
            "price": 1799.99,
            "crypto_price": 1799.99,
            "category": "laptops",
            "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
            "stock": 35,
            "features": ["Ultra-light", "Secure Enclave", "16GB RAM", "All-day Battery"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "DecentralVision Pro",
            "description": "Premium AR/VR headset for metaverse exploration. Experience Web3 in immersive virtual reality.",
            "price": 1999.99,
            "crypto_price": 1999.99,
            "category": "metaglass",
            "image_url": "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=800",
            "stock": 15,
            "features": ["VR/AR Dual Mode", "4K per eye", "Wireless", "Metaverse Ready"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "BlockCam Studio",
            "description": "Professional studio camera with blockchain authentication. Every photo is timestamped and can be verified on-chain.",
            "price": 1599.99,
            "crypto_price": 1599.99,
            "category": "cameras",
            "image_url": "https://images.unsplash.com/photo-1606980623478-c63a7c5d3f86?w=800",
            "stock": 25,
            "features": ["6K Video", "Blockchain Auth", "Pro Lens Mount", "RAW Support"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.products.insert_many(products)
    
    return {"message": f"Seeded {len(products)} products"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
