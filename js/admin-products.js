import { supabase } from './supabase.js';

let currentPage = 1;
const itemsPerPage = 10;
let allProducts = [];
let selectedProductId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeProductsPage();
});

async function initializeProductsPage() {
    await loadProducts();
    await loadCategoriesForFilter();
    setupEventListeners();
}

async function loadProducts(page = 1) {
    showLoading(true);
    
    try {
        // Charger les produits avec leurs catégories
        const { data: products, error, count } = await supabase
            .from('products')
            .select(`
                *,
                categories (name)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

        if (error) throw error;

        allProducts = products || [];
        displayProducts(allProducts);
        updatePagination(count, page);
        
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        showNotification('Erreur lors du chargement des produits', 'error');
    } finally {
        showLoading(false);
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    Aucun produit trouvé
                </td>
            </tr>
        `;
        return;
    }

    products.forEach(product => {
        const tr = document.createElement('tr');
        const categoryName = product.categories ? product.categories.name : 'Non classé';
        const statusClass = product.is_active ? 'status-active' : 'status-inactive';
        const statusText = product.is_active ? 'Actif' : 'Inactif';
        
        // Déterminer la classe pour le stock
        let stockClass = 'text-success';
        let stockText = product.stock;
        
        if (product.stock === 0) {
            stockClass = 'text-danger';
            stockText = 'Rupture';
        } else if (product.stock < 10) {
            stockClass = 'text-warning';
            stockText = `${product.stock} (Faible)`;
        }

        tr.innerHTML = `
            <td>
                <input type="checkbox" class="product-checkbox" data-id="${product.id}">
            </td>
            <td>
                <div class="product-info">
                    ${product.image_url ? 
                        `<img src="${product.image_url}" alt="${product.name}" class="product-thumb">` : 
                        `<div class="product-thumb placeholder">📦</div>`
                    }
                    <div class="product-details">
                        <div class="product-name">${product.name}</div>
                        <div class="product-id">#${product.id}</div>
                    </div>
                </div>
            </td>
            <td>${categoryName}</td>
            <td>${parseFloat(product.price).toFixed(2)} €</td>
            <td class="${stockClass}">${stockText}</td>
            <td>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon edit-product" data-id="${product.id}" title="Modifier">
                        ✏️
                    </button>
                    <button class="btn-icon delete-product" data-id="${product.id}" title="Supprimer">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });

    // Mettre à jour le compteur
    document.getElementById('products-count').textContent = `${products.length} produit(s)`;
    
    // Ajouter les écouteurs d'événements pour les boutons
    attachProductEventListeners();
}

function attachProductEventListeners() {
    // Édition
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.currentTarget.getAttribute('data-id');
            editProduct(productId);
        });
    });

    // Suppression
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.currentTarget.getAttribute('data-id');
            confirmDeleteProduct(productId);
        });
    });
}

async function editProduct(productId) {
    showLoading(true);
    
    try {
        // Charger les données du produit
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;

        // Charger les catégories pour le select
        await loadCategoriesForForm();
        
        // Remplir le formulaire
        document.getElementById('modal-title').textContent = 'Modifier le produit';
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-image').value = product.image_url || '';
        document.getElementById('product-status').value = product.is_active.toString();
        document.getElementById('product-category').value = product.category_id || '';
        
        // Afficher l'aperçu de l'image si elle existe
        if (product.image_url) {
            document.getElementById('preview-image').src = product.image_url;
            document.getElementById('image-preview').style.display = 'block';
        }
        
        // Stocker l'ID du produit pour la mise à jour
        selectedProductId = productId;
        
        // Ouvrir la modal
        openModal('product-modal');
        
    } catch (error) {
        console.error('Erreur lors du chargement du produit:', error);
        showNotification('Erreur lors du chargement du produit', 'error');
    } finally {
        showLoading(false);
    }
}

function confirmDeleteProduct(productId) {
    selectedProductId = productId;
    openModal('delete-modal');
}

async function deleteProduct() {
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', selectedProductId);

        if (error) throw error;

        showNotification('Produit supprimé avec succès', 'success');
        closeModal('delete-modal');
        await loadProducts(currentPage);
        
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showNotification('Erreur lors de la suppression du produit', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadCategoriesForFilter() {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('id, name')
            .order('name');

        if (error) throw error;

        const select = document.getElementById('category-filter');
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
    }
}

async function loadCategoriesForForm() {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('id, name')
            .order('name');

        if (error) throw error;

        const select = document.getElementById('product-category');
        // Garder la première option et vider le reste
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
    }
}

function setupEventListeners() {
    // Nouveau produit
    document.getElementById('add-product-btn').addEventListener('click', () => {
        document.getElementById('modal-title').textContent = 'Ajouter un produit';
        document.getElementById('product-form').reset();
        document.getElementById('image-preview').style.display = 'none';
        selectedProductId = null;
        loadCategoriesForForm();
        openModal('product-modal');
    });

    // Soumission du formulaire
    document.getElementById('product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProduct();
    });

    // Confirmation de suppression
    document.getElementById('delete-confirm').addEventListener('click', deleteProduct);

    // Filtres
    document.getElementById('category-filter').addEventListener('change', filterProducts);
    document.getElementById('status-filter').addEventListener('change', filterProducts);
    document.getElementById('stock-filter').addEventListener('change', filterProducts);
    document.getElementById('product-search').addEventListener('input', filterProducts);

    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            loadProducts(currentPage - 1);
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        loadProducts(currentPage + 1);
    });

    // Aperçu de l'image
    document.getElementById('product-image').addEventListener('input', (e) => {
        const url = e.target.value;
        if (url) {
            document.getElementById('preview-image').src = url;
            document.getElementById('image-preview').style.display = 'block';
        } else {
            document.getElementById('image-preview').style.display = 'none';
        }
    });

    // Export
    document.getElementById('export-products').addEventListener('click', exportProducts);
    
    // Actualiser
    document.getElementById('refresh-products').addEventListener('click', () => {
        loadProducts(currentPage);
    });
}

async function saveProduct() {
    showLoading(true);
    
    try {
        const formData = new FormData(document.getElementById('product-form'));
        const productData = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            stock: parseInt(formData.get('stock')),
            image_url: formData.get('image_url') || null,
            category_id: formData.get('category_id') || null,
            is_active: formData.get('is_active') === 'true'
        };

        let error;
        
        if (selectedProductId) {
            // Mise à jour
            const { error: updateError } = await supabase
                .from('products')
                .update(productData)
                .eq('id', selectedProductId);
                
            error = updateError;
        } else {
            // Création
            const { error: insertError } = await supabase
                .from('products')
                .insert([productData]);
                
            error = insertError;
        }

        if (error) throw error;

        showNotification(selectedProductId ? 'Produit mis à jour' : 'Produit créé', 'success');
        closeModal('product-modal');
        await loadProducts(currentPage);
        
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showNotification('Erreur lors de la sauvegarde du produit', 'error');
    } finally {
        showLoading(false);
    }
}

function filterProducts() {
    const searchTerm = document.getElementById('product-search').value.toLowerCase();
    const categoryId = document.getElementById('category-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    const stockFilter = document.getElementById('stock-filter').value;

    let filtered = allProducts;

    if (searchTerm) {
        filtered = filtered.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description?.toLowerCase().includes(searchTerm)
        );
    }

    if (categoryId) {
        filtered = filtered.filter(product => product.category_id === categoryId);
    }

    if (statusFilter) {
        const isActive = statusFilter === 'active';
        filtered = filtered.filter(product => product.is_active === isActive);
    }

    if (stockFilter) {
        if (stockFilter === 'in-stock') {
            filtered = filtered.filter(product => product.stock > 10);
        } else if (stockFilter === 'low-stock') {
            filtered = filtered.filter(product => product.stock > 0 && product.stock <= 10);
        } else if (stockFilter === 'out-of-stock') {
            filtered = filtered.filter(product => product.stock === 0);
        }
    }

    displayProducts(filtered);
}

function updatePagination(totalCount, page) {
    currentPage = page;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    
    document.getElementById('current-page').textContent = page;
    document.getElementById('total-pages').textContent = totalPages;
    
    document.getElementById('prev-page').disabled = page <= 1;
    document.getElementById('next-page').disabled = page >= totalPages;
}

function exportProducts() {
    // Simplifié pour cet exemple - en production, on utiliserait une librairie comme SheetJS
    const productsToExport = allProducts.map(p => ({
        Nom: p.name,
        Catégorie: p.categories?.name || 'Non classé',
        Prix: `${p.price} €`,
        Stock: p.stock,
        Statut: p.is_active ? 'Actif' : 'Inactif',
        Description: p.description || ''
    }));
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + [Object.keys(productsToExport[0]).join(";")]
        .concat(productsToExport.map(item => Object.values(item).join(";")))
        .join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "produits_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Fonctions utilitaires (à déplacer dans admin.js si partagées)
function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

function showNotification(message, type = 'info') {
    // Implémentation simplifiée
    alert(`${type.toUpperCase()}: ${message}`);
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}
