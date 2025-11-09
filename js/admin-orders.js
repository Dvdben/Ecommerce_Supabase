import { supabase } from './supabase.js';

let currentPage = 1;
const itemsPerPage = 10;
let allOrders = [];
let selectedOrderId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeOrdersPage();
});

async function initializeOrdersPage() {
    await loadOrders();
    setupEventListeners();
    updatePendingOrdersCount();
}

async function loadOrders(page = 1) {
    showLoading(true);
    
    try {
        // Charger les commandes avec les informations utilisateur
        const { data: orders, error, count } = await supabase
            .from('orders')
            .select(`
                *,
                users (id, email, full_name, phone)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

        if (error) throw error;

        allOrders = orders || [];
        displayOrders(allOrders);
        updatePagination(count, page);
        
    } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
        showNotification('Erreur lors du chargement des commandes', 'error');
    } finally {
        showLoading(false);
    }
}

function displayOrders(orders) {
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = '';

    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    Aucune commande trouvée
                </td>
            </tr>
        `;
        return;
    }

    orders.forEach(order => {
        const tr = document.createElement('tr');
        const orderDate = new Date(order.created_at).toLocaleDateString('fr-FR');
        const statusClass = `status-${order.status}`;
        
        tr.innerHTML = `
            <td>
                <div class="order-info">
                    <div class="order-number">#${order.id}</div>
                </div>
            </td>
            <td>
                <div class="customer-info-small">
                    <div class="customer-name">${order.users?.full_name || 'Client inconnu'}</div>
                    <div class="customer-email">${order.users?.email || ''}</div>
                </div>
            </td>
            <td>${orderDate}</td>
            <td>${parseFloat(order.total_amount).toFixed(2)} €</td>
            <td>
                <span class="status-badge ${statusClass}">${getStatusText(order.status)}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon view-order" data-id="${order.id}" title="Voir les détails">
                        👁️
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });

    // Mettre à jour le compteur
    document.getElementById('orders-count').textContent = `${orders.length} commande(s)`;
    
    // Ajouter les écouteurs d'événements
    attachOrderEventListeners();
}

function attachOrderEventListeners() {
    // Voir les détails
    document.querySelectorAll('.view-order').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const orderId = e.currentTarget.getAttribute('data-id');
            viewOrderDetails(orderId);
        });
    });
}

async function viewOrderDetails(orderId) {
    showLoading(true);
    selectedOrderId = orderId;
    
    try {
        // Charger les détails de la commande avec les articles
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                users (*),
                order_items (
                    *,
                    products (name, price, image_url)
                )
            `)
            .eq('id', orderId)
            .single();

        if (error) throw error;

        // Remplir les détails de la commande
        document.getElementById('order-id').textContent = order.id;
        document.getElementById('order-date').textContent = new Date(order.created_at).toLocaleDateString('fr-FR');
        document.getElementById('order-total').textContent = `${parseFloat(order.total_amount).toFixed(2)} €`;
        document.getElementById('order-payment').textContent = order.payment_method || 'Non spécifié';
        document.getElementById('order-status').value = order.status;
        
        // Informations client
        document.getElementById('customer-name').textContent = order.users?.full_name || 'Non spécifié';
        document.getElementById('customer-email').textContent = order.users?.email || 'Non spécifié';
        document.getElementById('customer-phone').textContent = order.users?.phone || 'Non spécifié';
        
        // Adresse de livraison
        const address = order.shipping_address ? 
            `${order.shipping_address.street}, ${order.shipping_address.postal_code} ${order.shipping_address.city}` :
            'Non spécifiée';
        document.getElementById('shipping-address').textContent = address;
        
        // Articles de la commande
        displayOrderItems(order.order_items, order);
        
        // Ouvrir la modal
        openModal('order-modal');
        
    } catch (error) {
        console.error('Erreur lors du chargement des détails:', error);
        showNotification('Erreur lors du chargement des détails de la commande', 'error');
    } finally {
        showLoading(false);
    }
}

function displayOrderItems(items, order) {
    const tbody = document.getElementById('order-items');
    tbody.innerHTML = '';
    
    let subtotal = 0;
    
    items.forEach(item => {
        const itemTotal = item.quantity * item.unit_price;
        subtotal += itemTotal;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="product-info-small">
                    ${item.products?.image_url ? 
                        `<img src="${item.products.image_url}" alt="${item.products.name}" class="product-thumb-small">` : 
                        `<div class="product-thumb-small placeholder">📦</div>`
                    }
                    <div class="product-details">
                        <div class="product-name">${item.products?.name || 'Produit inconnu'}</div>
                    </div>
                </div>
            </td>
            <td>${parseFloat(item.unit_price).toFixed(2)} €</td>
            <td>${item.quantity}</td>
            <td>${parseFloat(itemTotal).toFixed(2)} €</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Calculer les totaux
    const shipping = order.shipping_cost || 0;
    const taxes = order.tax_amount || 0;
    const total = subtotal + shipping + taxes;
    
    document.getElementById('order-subtotal').textContent = `${parseFloat(subtotal).toFixed(2)} €`;
    document.getElementById('order-shipping').textContent = `${parseFloat(shipping).toFixed(2)} €`;
    document.getElementById('order-taxes').textContent = `${parseFloat(taxes).toFixed(2)} €`;
    document.getElementById('order-grand-total').textContent = `${parseFloat(total).toFixed(2)} €`;
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'En attente',
        'processing': 'En cours',
        'shipped': 'Expédié',
        'delivered': 'Livré',
        'cancelled': 'Annulé',
        'completed': 'Terminé'
    };
    return statusMap[status] || status;
}

async function updateOrderStatus() {
    showLoading(true);
    
    try {
        const newStatus = document.getElementById('order-status').value;
        
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', selectedOrderId);

        if (error) throw error;

        showNotification('Statut de la commande mis à jour', 'success');
        closeModal('order-modal');
        await loadOrders(currentPage);
        await updatePendingOrdersCount();
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        showNotification('Erreur lors de la mise à jour du statut', 'error');
    } finally {
        showLoading(false);
    }
}

async function updatePendingOrdersCount() {
    try {
        const { count, error } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (error) throw error;

        const badge = document.getElementById('pending-orders-count');
        if (badge) {
            badge.textContent = count || 0;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
        
    } catch (error) {
        console.error('Erreur lors du comptage des commandes en attente:', error);
    }
}

function setupEventListeners() {
    // Filtres
    document.getElementById('status-filter').addEventListener('change', filterOrders);
    document.getElementById('date-filter').addEventListener('change', filterOrders);
    document.getElementById('order-search').addEventListener('input', filterOrders);

    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            loadOrders(currentPage - 1);
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        loadOrders(currentPage + 1);
    });

    // Sauvegarder le statut
    document.getElementById('save-status').addEventListener('click', updateOrderStatus);

    // Export
    document.getElementById('export-orders').addEventListener('click', exportOrders);
    
    // Actualiser
    document.getElementById('refresh-orders').addEventListener('click', () => {
        loadOrders(currentPage);
        updatePendingOrdersCount();
    });
}

function filterOrders() {
    const searchTerm = document.getElementById('order-search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    const dateFilter = document.getElementById('date-filter').value;

    let filtered = allOrders;

    if (searchTerm) {
        filtered = filtered.filter(order => 
            order.id.toString().includes(searchTerm) ||
            order.users?.email.toLowerCase().includes(searchTerm) ||
            order.users?.full_name?.toLowerCase().includes(searchTerm)
        );
    }

    if (statusFilter) {
        filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (dateFilter) {
        const now = new Date();
        let startDate;
        
        switch (dateFilter) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }
        
        if (startDate) {
            filtered = filtered.filter(order => {
                const orderDate = new Date(order.created_at);
                return orderDate >= startDate;
            });
        }
    }

    displayOrders(filtered);
}

function updatePagination(totalCount, page) {
    currentPage = page;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    
    document.getElementById('current-page').textContent = page;
    document.getElementById('total-pages').textContent = totalPages;
    
    document.getElementById('prev-page').disabled = page <= 1;
    document.getElementById('next-page').disabled = page >= totalPages;
}

function exportOrders() {
    // Simplifié pour cet exemple
    const ordersToExport = allOrders.map(o => ({
        'N° Commande': o.id,
        'Client': o.users?.full_name || 'Inconnu',
        'Email': o.users?.email || '',
        'Date': new Date(o.created_at).toLocaleDateString('fr-FR'),
        'Montant': `${o.total_amount} €`,
        'Statut': getStatusText(o.status),
        'Méthode de paiement': o.payment_method || 'Non spécifié'
    }));
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + [Object.keys(ordersToExport[0]).join(";")]
        .concat(ordersToExport.map(item => Object.values(item).join(";")))
        .join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "commandes_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
