import { getProductById, getProducts, getCategory } from './supabase.js';
import cart from './cart.js';

// Global variables
let currentProduct = null;

// Initialize the product detail page
document.addEventListener('DOMContentLoaded', function() {
    initProductDetail();
});

async function initProductDetail() {
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        displayError('Produit non spécifié');
        return;
    }
    
    // Load product details
    await loadProductDetail(productId);
    
    // Load related products
    await loadRelatedProducts();
    
    // Load categories for footer
    await loadFooterCategories();
    
    // Setup event listeners
    setupEventListeners();
}

// Load product details
async function loadProductDetail(productId) {
    try {
        const product = await getProductById(productId);
        
        if (!product) {
            displayError('Produit non trouvé');
            return;
        }
        
        currentProduct = product;
        
        // Get category name
        let categoryName = 'Non catégorisé';
        if (product.category_id) {
            const category = await getCategory(product.category_id);
            if (category) {
                categoryName = category.name;
            }
        }
        
        // Display product details
        const productContainer = document.getElementById('product-detail-container');
        productContainer.innerHTML = `
            <div class="breadcrumb">
                <a href="index.html">Accueil</a> > 
                <a href="shop.html">Boutique</a> > 
                <a href="shop.html?category=${product.category_id || ''}">${categoryName}</a> > 
                <span>${product.name}</span>
            </div>
            
            <div class="product-detail">
                <div class="product-image-column">
                    <div class="product-main-image">
                        <img src="${product.image_url}" alt="${product.name}" id="product-main-img">
                    </div>
                </div>
                
                <div class="product-info-column">
                    <h1>${product.name}</h1>
                    <div class="product-meta">
                        <span class="product-category">${categoryName}</span>
                        <span class="product-sku">Réf: ${product.sku || 'N/A'}</span>
                    </div>
                    
                    <div class="product-price-large">
                        ${product.price.toFixed(2)} €
                    </div>
                    
                    <div class="product-description">
                        <h3>Description</h3>
                        <p>${product.description || 'Aucune description disponible pour ce produit.'}</p>
                    </div>
                    
                    <div class="product-stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                        ${product.stock > 0 ? 
                            `${product.stock} disponible(s) en stock` : 
                            'Rupture de stock'}
                    </div>
                    
                    <div class="product-actions">
                        <div class="quantity-selector">
                            <label for="quantity">Quantité:</label>
                            <div class="quantity-controls">
                                <button type="button" class="quantity-btn" id="decrease-quantity">-</button>
                                <input type="number" id="quantity" name="quantity" value="1" min="1" max="${product.stock}">
                                <button type="button" class="quantity-btn" id="increase-quantity">+</button>
                            </div>
                        </div>
                        
                        <button class="btn btn-primary btn-large" id="add-to-cart-btn" ${product.stock === 0 ? 'disabled' : ''}>
                            ${product.stock > 0 ? 'Ajouter au panier' : 'Rupture de stock'}
                        </button>
                    </div>
                    
                    <div class="product-features">
                        <div class="feature">
                            <span>🚚</span>
                            <p>Livraison gratuite à partir de 50€</p>
                        </div>
                        <div class="feature">
                            <span>↩️</span>
                            <p>Retours gratuits sous 30 jours</p>
                        </div>
                        <div class="feature">
                            <span>🔒</span>
                            <p>Paiement sécurisé</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading product detail:', error);
        displayError('Erreur lors du chargement du produit');
    }
}

// Load related products
async function loadRelatedProducts() {
    if (!currentProduct) return;
    
    try {
        const products = await getProducts();
        
        // Filter products from same category (excluding current product)
        const relatedProducts = products.filter(p => 
            p.id !== currentProduct.id && 
            p.category_id === currentProduct.category_id
        ).slice(0, 4); // Limit to 4 products
        
        const relatedContainer = document.getElementById('related-products');
        
        if (relatedProducts.length > 0) {
            relatedContainer.innerHTML = relatedProducts.map(product => `
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
                    const product = relatedProducts.find(p => p.id === productId);
                    if (product) {
                        cart.addProduct(product);
                    }
                });
            });
        } else {
            relatedContainer.innerHTML = '<p>Aucun produit similaire trouvé</p>';
        }
    } catch (error) {
        console.error('Error loading related products:', error);
    }
}

// Load categories for footer
async function loadFooterCategories() {
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
}

// Setup event listeners
function setupEventListeners() {
    // Quantity controls
    document.addEventListener('click', function(e) {
        if (e.target.id === 'increase-quantity') {
            const quantityInput = document.getElementById('quantity');
            const max = parseInt(quantityInput.max);
            let value = parseInt(quantityInput.value);
            
            if (value < max) {
                quantityInput.value = value + 1;
            }
        }
        
        if (e.target.id === 'decrease-quantity') {
            const quantityInput = document.getElementById('quantity');
            let value = parseInt(quantityInput.value);
            
            if (value > 1) {
                quantityInput.value = value - 1;
            }
        }
    });
    
    // Add to cart button
    document.addEventListener('click', function(e) {
        if (e.target.id === 'add-to-cart-btn' && currentProduct) {
            const quantity = parseInt(document.getElementById('quantity').value);
            cart.addProduct(currentProduct, quantity);
            
            // Show confirmation
            showNotification('Produit ajouté au panier !');
        }
    });
    
    // Quantity input validation
    document.addEventListener('input', function(e) {
        if (e.target.id === 'quantity') {
            const quantityInput = e.target;
            const max = parseInt(quantityInput.max);
            let value = parseInt(quantityInput.value);
            
            if (isNaN(value) || value < 1) {
                quantityInput.value = 1;
            } else if (value > max) {
                quantityInput.value = max;
            }
        }
    });
}

// Display error message
function displayError(message) {
    const productContainer = document.getElementById('product-detail-container');
    productContainer.innerHTML = `
        <div class="error-message">
            <h2>${message}</h2>
            <a href="shop.html" class="btn btn-primary">Retour à la boutique</a>
        </div>
    `;
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success);
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
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
