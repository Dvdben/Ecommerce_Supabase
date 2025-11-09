import { supabase } from './supabase.js';

let allCategories = [];
let selectedCategoryId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeCategoriesPage();
});

async function initializeCategoriesPage() {
    await loadCategories();
    setupEventListeners();
    updateStats();
}

async function loadCategories() {
    showLoading(true);
    
    try {
        // Charger les catégories avec le nombre de produits
        const { data: categories, error } = await supabase
            .from('categories')
            .select(`
                *,
                products (id)
            `)
            .order('name');

        if (error) throw error;

        allCategories = categories || [];
        displayCategories(allCategories);
        
    } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
        showNotification('Erreur lors du chargement des catégories', 'error');
    } finally {
        showLoading(false);
    }
}

function displayCategories(categories) {
    const tbody = document.getElementById('categories-table-body');
    tbody.innerHTML = '';

    if (categories.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    Aucune catégorie trouvée
                </td>
            </tr>
        `;
        return;
    }

    categories.forEach(category => {
        const tr = document.createElement('tr');
        const productCount = category.products ? category.products.length : 0;
        const createdDate = new Date(category.created_at).toLocaleDateString('fr-FR');
        
        tr.innerHTML = `
            <td>
                <div class="category-info">
                    ${category.image_url ? 
                        `<img src="${category.image_url}" alt="${category.name}" class="category-thumb">` : 
                        `<div class="category-thumb placeholder">🏷️</div>`
                    }
                    <div class="category-details">
                        <div class="category-name">${category.name}</div>
                    </div>
                </div>
            </td>
            <td>${category.description || 'Aucune description'}</td>
            <td>${productCount} produit(s)</td>
            <td>${createdDate}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon edit-category" data-id="${category.id}" title="Modifier">
                        ✏️
                    </button>
                    <button class="btn-icon delete-category" data-id="${category.id}" 
                            ${productCount > 0 ? 'disabled' : ''} title="${productCount > 0 ? 'Impossible de supprimer - contient des produits' : 'Supprimer'}">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });

    // Ajouter les écouteurs d'événements
    attachCategoryEventListeners();
}

function attachCategoryEventListeners() {
    // Édition
    document.querySelectorAll('.edit-category').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryId = e.currentTarget.getAttribute('data-id');
            editCategory(categoryId);
        });
    });

    // Suppression
    document.querySelectorAll('.delete-category:not([disabled])').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryId = e.currentTarget.getAttribute('data-id');
            confirmDeleteCategory(categoryId);
        });
    });
}

async function editCategory(categoryId) {
    showLoading(true);
    
    try {
        // Charger les données de la catégorie
        const { data: category, error } = await supabase
            .from('categories')
            .select('*')
            .eq('id', categoryId)
            .single();

        if (error) throw error;

        // Remplir le formulaire
        document.getElementById('modal-title').textContent = 'Modifier la catégorie';
        document.getElementById('category-name').value = category.name;
        document.getElementById('category-description').value = category.description || '';
        document.getElementById('category-image').value = category.image_url || '';
        
        // Afficher l'aperçu de l'image si elle existe
        if (category.image_url) {
            document.getElementById('category-preview-image').src = category.image_url;
            document.getElementById('category-image-preview').style.display = 'block';
        }
        
        // Stocker l'ID de la catégorie pour la mise à jour
        selectedCategoryId = categoryId;
        
        // Ouvrir la modal
        openModal('category-modal');
        
    } catch (error) {
        console.error('Erreur lors du chargement de la catégorie:', error);
        showNotification('Erreur lors du chargement de la catégorie', 'error');
    } finally {
        showLoading(false);
    }
}

function confirmDeleteCategory(categoryId) {
    selectedCategoryId = categoryId;
    
    // Charger le nombre de produits pour l'avertissement
    const category = allCategories.find(c => c.id === categoryId);
    const productCount = category.products ? category.products.length : 0;
    
    document.getElementById('products-count').textContent = productCount;
    openModal('delete-modal');
}

async function deleteCategory() {
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', selectedCategoryId);

        if (error) throw error;

        showNotification('Catégorie supprimée avec succès', 'success');
        closeModal('delete-modal');
        await loadCategories();
        await updateStats();
        
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showNotification('Erreur lors de la suppression de la catégorie', 'error');
    } finally {
        showLoading(false);
    }
}

async function updateStats() {
    try {
        // Compter le nombre total de produits actifs
        const { count: activeProductsCount, error: productsError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        if (productsError) throw productsError;

        // Mettre à jour les statistiques
        document.getElementById('total-categories').textContent = allCategories.length;
        document.getElementById('total-products-cat').textContent = activeProductsCount || 0;
        
        // Calculer la moyenne des produits par catégorie
        const avgProducts = allCategories.length > 0 ? 
            Math.round((activeProductsCount || 0) / allCategories.length) : 0;
        document.getElementById('avg-products').textContent = avgProducts;
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour des statistiques:', error);
    }
}

function setupEventListeners() {
    // Nouvelle catégorie
    document.getElementById('add-category-btn').addEventListener('click', () => {
        document.getElementById('modal-title').textContent = 'Ajouter une catégorie';
        document.getElementById('category-form').reset();
        document.getElementById('category-image-preview').style.display = 'none';
        selectedCategoryId = null;
        openModal('category-modal');
    });

    // Soumission du formulaire
    document.getElementById('category-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveCategory();
    });

    // Confirmation de suppression
    document.getElementById('delete-confirm').addEventListener('click', deleteCategory);

    // Aperçu de l'image
    document.getElementById('category-image').addEventListener('input', (e) => {
        const url = e.target.value;
        if (url) {
            document.getElementById('category-preview-image').src = url;
            document.getElementById('category-image-preview').style.display = 'block';
        } else {
            document.getElementById('category-image-preview').style.display = 'none';
        }
    });

    // Actualiser
    document.getElementById('refresh-categories').addEventListener('click', async () => {
        await loadCategories();
        await updateStats();
    });
}

async function saveCategory() {
    showLoading(true);
    
    try {
        const formData = new FormData(document.getElementById('category-form'));
        const categoryData = {
            name: formData.get('name'),
            description: formData.get('description'),
            image_url: formData.get('image_url') || null
        };

        let error;
        
        if (selectedCategoryId) {
            // Mise à jour
            const { error: updateError } = await supabase
                .from('categories')
                .update(categoryData)
                .eq('id', selectedCategoryId);
                
            error = updateError;
        } else {
            // Création
            const { error: insertError } = await supabase
                .from('categories')
                .insert([categoryData]);
                
            error = insertError;
        }

        if (error) throw error;

        showNotification(selectedCategoryId ? 'Catégorie mise à jour' : 'Catégorie créée', 'success');
        closeModal('category-modal');
        await loadCategories();
        await updateStats();
        
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showNotification('Erreur lors de la sauvegarde de la catégorie', 'error');
    } finally {
        showLoading(false);
    }
}
