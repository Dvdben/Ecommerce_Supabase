import { getProducts, getCategories, getProductById } from './supabase.js';

// Cart module
const cart = {
    items: [],
    
    // Initialize cart
    init() {
        this.loadFromStorage();
        this.updateCartUI();
        this.setupEventListeners();
    },
    
    // Load cart from localStorage
    loadFromStorage() {
        const savedCart = localStorage.getItem('eshop_cart');
        if (savedCart) {
            this.items = JSON.parse(savedCart);
        }
    },
    
    // Save cart to localStorage
    saveToStorage() {
        localStorage.setItem('eshop_cart', JSON.stringify(this.items));
    },
    
    // Add product to cart
    addProduct(product, quantity = 1) {
        const existingItem = this.items.find(item => item.id === product.id);
        
        if (existingItem) {
            // Update quantity if product already in cart
            existingItem.quantity += quantity;
        } else {
            // Add new product to cart
            this.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                quantity: quantity,
                stock: product.stock
            });
        }
        
        this.saveToStorage();
        this.updateCartUI();
        
        // Show notification
        this.showNotification('Produit ajouté au panier !');
    },
    
    // Remove product from cart
    removeProduct(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveToStorage();
        this.updateCartUI();
    },
    
    // Update product quantity
    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity = Math.max(1, Math.min(quantity, item.stock));
            this.saveToStorage();
            this.updateCartUI();
        }
    },
    
    // Get cart total
    getTotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    },
    
    // Get items count
    getItemsCount() {
        return this.items.reduce((count, item) => count + item.quantity, 0);
    },
    
    // Clear cart
    clear() {
        this.items = [];
        this.saveToStorage();
        this.updateCartUI();
    },
    
    // Update cart UI (cart icon count)
    updateCartUI() {
        const cartCountElements = document.querySelectorAll('.cart-count');
        const count = this.getItemsCount();
        
        cartCountElements.forEach(element => {
            element.textContent = count;
        });
        
        // Update cart page if we're on it
        if (window.location.pathname.includes('cart.html')) {
            this.renderCartPage();
        }
    },
    
    // Render cart page
    async renderCartPage() {
        const cartItemsContainer = document.getElementById('cart-items');
        const emptyCartContainer = document.getElementById('empty-cart');
        const cartContent = document.querySelector('.cart-content');
        
        if (this.items.length === 0) {
            if (cartContent) cartContent.style.display = 'none';
            if (emptyCartContainer) emptyCartContainer.style.display = 'block';
            return;
        }
        
        if (cartContent) cartContent.style.display = 'grid';
        if (emptyCartContainer) emptyCartContainer.style.display = 'none';
        
        // Update cart items
        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = this.items.map(item => `
                <div class="cart-item" data-product-id="${item.id}">
                    <img src="${item.image_url}" alt="${item.name}" class="cart-item-image">
                    
                    <div class="cart-item-details">
                        <h3 class="cart-item-title">${item.name}</h3>
                        <p class="cart-item-price">${item.price.toFixed(2)} €</p>
                    </div>
                    
                    <div class="cart-item-quantity">
                        <button class="quantity-btn decrease" data-product-id="${item.id}">-</button>
                        <input type="number" value="${item.quantity}" min="1" max="${item.stock}" data-product-id="${item.id}">
                        <button class="quantity-btn increase" data-product-id="${item.id}">+</button>
                    </div>
                    
                    <div class="cart-item-total">
                        ${(item.price * item.quantity).toFixed(2)} €
                    </div>
                    
                    <button class="cart-item-remove" data-product-id="${item.id}">
                        &times;
                    </button>
                </div>
            `).join('');
        }
        
        // Update cart summary
        const subtotal = this.getTotal();
        const shipping = subtotal > 0 ? 5.99 : 0;
        const total = subtotal + shipping;
        
        if (document.getElementById('cart-subtotal')) {
            document.getElementById('cart-subtotal').textContent = `${subtotal.toFixed(2)} €`;
        }
        
        if (document.getElementById('cart-shipping')) {
            document.getElementById('cart-shipping').textContent = `${shipping.toFixed(2)} €`;
        }
        
        if (document.getElementById('cart-total')) {
            document.getElementById('cart-total').textContent = `${total.toFixed(2)} €`;
        }
        
        // Load recently viewed products
        await this.loadRecentlyViewed();
        
        // Load footer categories
        await this.loadFooterCategories();
    },
    
    // Load recently viewed products
    async loadRecentlyViewed() {
        try {
            // Get recently viewed from localStorage
            const recentlyViewed = JSON.parse(localStorage.getItem('eshop_recently_viewed') || '[]');
            
            if (recentlyViewed.length === 0) return;
            
            // Get product details
            const recentlyViewedProducts = [];
            for (const productId of recentlyViewed.slice(0, 4)) {
                if (productId) {
                    const product = await getProductById(productId);
                    if (product) {
                        recentlyViewedProducts.push(product);
                    }
                }
            }
            
            // Display recently viewed products
            const recentContainer = document.getElementById('recent-products');
            if (recentContainer && recentlyViewedProducts.length > 0) {
                recentContainer.innerHTML = recentlyViewedProducts.map(product => `
                    <div class="product-card">
                        <img src="${product.image_url}" alt="${product.name}" class="product-image">
                        <div class="product-info">
                            <h3 class="product-title">${product.name}</h3>
                            <p class="product-price">${product.price.toFixed(2)} €</p>
                            <div class="product-actions">
                                <a href="product-detail.html?id=${product.id}" class="btn btn-secondary">Voir détails</a>
                                <button class="btn btn-primary" data-product-id="${product.id}">Ajouter au panier</button>
                            </div>
                        </div>
                    </div>
                `).join('');
                
                // Add event listeners to add to cart buttons
                document.querySelectorAll('.btn-primary[data-product-id]').forEach(button => {
                    button.addEventListener('click', function() {
                        const productId = this.dataset.productId;
                        const product = recentlyViewedProducts.find(p => p.id === productId);
                        if (product) {
                            cart.addProduct(product);
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Error loading recently viewed products:', error);
        }
    },
    
    // Load footer categories
    async loadFooterCategories() {
        try {
            const categories = await getCategories();
            
            const footerCategories = document.getElementById('footer-categories');
            if (footerCategories) {
                footerCategories.innerHTML = categories.map(category => `
                    <li><a href="shop.html?category=${category.id}">${category.name}</a></li>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading footer categories:', error);
        }
    },
    
    // Setup event listeners for cart page
    setupEventListeners() {
        // Delegate events for cart items
        document.addEventListener('click', (e) => {
            // Quantity decrease
            if (e.target.classList.contains('decrease')) {
                const productId = e.target.dataset.productId;
                const item = this.items.find(item => item.id === productId);
                if (item && item.quantity > 1) {
                    this.updateQuantity(productId, item.quantity - 1);
                }
            }
            
            // Quantity increase
            if (e.target.classList.contains('increase')) {
                const productId = e.target.dataset.productId;
                const item = this.items.find(item => item.id === productId);
                if (item && item.quantity < item.stock) {
                    this.updateQuantity(productId, item.quantity + 1);
                }
            }
            
            // Remove item
            if (e.target.classList.contains('cart-item-remove')) {
                const productId = e.target.dataset.productId;
                this.removeProduct(productId);
            }
        });
        
        // Input change for quantity
        document.addEventListener('change', (e) => {
            if (e.target.matches('.cart-item-quantity input')) {
                const productId = e.target.dataset.productId;
                const quantity = parseInt(e.target.value);
                
                if (!isNaN(quantity)) {
                    this.updateQuantity(productId, quantity);
                }
            }
        });
        
        // Checkout button
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', (e) => {
                if (this.items.length === 0) {
                    e.preventDefault();
                    this.showNotification('Votre panier est vide', 'error');
                }
            });
        }
    },
    
    // Show notification
    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
};

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    cart.init();
    
    // Render cart page if we're on it
    if (window.location.pathname.includes('cart.html')) {
        cart.renderCartPage();
    }
});

// Export cart for use in other modules
export default cart;
