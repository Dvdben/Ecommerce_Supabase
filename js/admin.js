// Module d'administration
import { supabase } from './supabase.js';
import { checkAuthState, showNotification } from './auth.js';

// Variables globales
let salesChart, categoriesChart;
let currentUser = null;

// Initialisation de l'administration
document.addEventListener('DOMContentLoaded', async function() {
    await checkAdminAuth();
    initializeAdmin();
    loadDashboardData();
    setupEventListeners();
});

// Vérifier l'authentification admin
async function checkAdminAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        window.location.href = '../login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return;
    }
    
    currentUser = session.user;
    
    // Vérifier si l'utilisateur est administrateur
    const { data: userData, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', currentUser.id)
        .single();
    
    if (error || !userData?.is_admin) {
        showNotification('Accès réservé aux administrateurs', 'error');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
        return;
    }
    
    updateAdminUI();
}

// Initialiser l'interface admin
function initializeAdmin() {
    // Mettre à jour le nom de l'admin
    const adminName = document.getElementById('admin-user-name');
    const adminAvatar = document.getElementById('admin-user-avatar');
    
    if (currentUser) {
        if (currentUser.user_metadata?.full_name) {
            adminName.textContent = currentUser.user_metadata.full_name;
        } else if (currentUser.email) {
            adminName.textContent = currentUser.email;
        }
        
        if (adminAvatar) {
            adminAvatar.textContent = adminName.textContent.charAt(0).toUpperCase();
        }
    }
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Toggle sidebar
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Déconnexion admin
    const logoutBtn = document.getElementById('admin-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleAdminLogout);
    }
    
    // Filtre des ventes
    const salesPeriod = document.getElementById('sales-period');
    if (salesPeriod) {
        salesPeriod.addEventListener('change', function() {
            loadSalesData(parseInt(this.value));
        });
    }
}

// Basculer la sidebar
function toggleSidebar() {
    document.body.classList.toggle('sidebar-collapsed');
}

// Mettre à jour l'UI admin
function updateAdminUI() {
    // Cacher l'overlay de chargement
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Charger les données du dashboard
async function loadDashboardData() {
    try {
        await Promise.all([
            loadStats(),
            loadSalesData(30),
            loadCategoriesData(),
            loadRecentOrders(),
            loadPopularProducts()
        ]);
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        showNotification('Erreur lors du chargement des données', 'error');
    }
}

// Charger les statistiques
async function loadStats() {
    try {
        // Récupérer les statistiques en parallèle
        const [
            revenueData,
            ordersData,
            productsData,
            usersData
        ] = await Promise.all([
            getTotalRevenue(),
            getTotalOrders(),
            getTotalProducts(),
            getTotalUsers()
        ]);
        
        // Mettre à jour l'UI
        updateStatsUI(revenueData, ordersData, productsData, usersData);
        
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        throw error;
    }
}

// Obtenir le chiffre d'affaires total
async function getTotalRevenue() {
    const { data, error } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'completed');
    
    if (error) throw error;
    
    const total = data.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
    return total.toFixed(2);
}

// Obtenir le nombre total de commandes
async function getTotalOrders() {
    const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact' });
    
    if (error) throw error;
    return count;
}

// Obtenir le nombre total de produits actifs
async function getTotalProducts() {
    const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_active', true);
    
    if (error) throw error;
    return count;
}

// Obtenir le nombre total d'utilisateurs actifs
async function getTotalUsers() {
    const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact' });
    
    if (error) throw error;
    return count;
}

// Mettre à jour l'UI des statistiques
function updateStatsUI(revenue, orders, products, users) {
    const revenueEl = document.getElementById('total-revenue');
    const ordersEl = document.getElementById('total-orders');
    const productsEl = document.getElementById('total-products');
    const usersEl = document.getElementById('total-users');
    
    if (revenueEl) revenueEl.textContent = `${revenue} €`;
    if (ordersEl) ordersEl.textContent = orders;
    if (productsEl) productsEl.textContent = products;
    if (usersEl) usersEl.textContent = users;
}

// Charger les données de vente
async function loadSalesData(days = 30) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('created_at, total_amount')
            .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        // Grouper les données par jour
        const salesByDay = groupSalesByDay(data, days);
        renderSalesChart(salesByDay);
        
    } catch (error) {
        console.error('Erreur lors du chargement des données de vente:', error);
    }
}

// Grouper les ventes par jour
function groupSalesByDay(orders, days) {
    const salesMap = new Map();
    const now = new Date();
    
    // Initialiser les jours avec 0
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        salesMap.set(key, 0);
    }
    
    // Compiler les ventes
    orders.forEach(order => {
        if (order.total_amount && order.created_at) {
            const date = new Date(order.created_at).toISOString().split('T')[0];
            if (salesMap.has(date)) {
                salesMap.set(date, salesMap.get(date) + parseFloat(order.total_amount));
            }
        }
    });
    
    return Array.from(salesMap.entries()).map(([date, amount]) => ({
        date,
        amount: parseFloat(amount.toFixed(2))
    }));
}

// Afficher le graphique des ventes
function renderSalesChart(salesData) {
    const ctx = document.getElementById('sales-chart');
    if (!ctx) return;
    
    const labels = salesData.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    });
    
    const data = salesData.map(item => item.amount);
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventes (€)',
                data: data,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Charger les données des catégories
async function loadCategoriesData() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select(`
                id,
                name,
                products:products!inner (
                    order_items (
                        quantity
                    )
                )
            `);
        
        if (error) throw error;
        
        // Compiler les ventes par catégorie
        const categorySales = data.map(category => {
            const totalSales = category.products.reduce((total, product) => {
                return total + (product.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0);
            }, 0);
            
            return {
                name: category.name,
                sales: totalSales
            };
        }).filter(item => item.sales > 0)
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);
        
        renderCategoriesChart(categorySales);
        
    } catch (error) {
        console.error('Erreur lors du chargement des données des catégories:', error);
    }
}

// Afficher le graphique des catégories
function renderCategoriesChart(categoryData) {
    const ctx = document.getElementById('categories-chart');
    if (!ctx) return;
    
    const labels = categoryData.map(item => item.name);
    const data = categoryData.map(item => item.sales);
    
    if (categoriesChart) {
        categoriesChart.destroy();
    }
    
    categoriesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#4f46e5',
                    '#ec4899',
                    '#f59e0b',
                    '#10b981',
                    '#3b82f6'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Charger les commandes récentes
async function loadRecentOrders() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                id,
                total_amount,
                status,
                created_at,
                user:users (
                    full_name,
                    email
                )
            `)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        renderRecentOrders(data);
        
        // Mettre à jour le compteur de commandes en attente
        updatePendingOrdersCount(data);
        
    } catch (error) {
        console.error('Erreur lors du chargement des commandes récentes:', error);
    }
}

// Afficher les commandes récentes
function renderRecentOrders(orders) {
    const container = document.getElementById('recent-orders');
    if (!container) return;
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="text-center">Aucune commande récente</td></tr>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <tr>
            <td>#${order.id.slice(0, 8)}</td>
            <td>${order.user?.full_name || order.user?.email || 'Client inconnu'}</td>
            <td>${new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
            <td>${parseFloat(order.total_amount).toFixed(2)} €</td>
            <td><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></td>
            <td>
                <button class="btn-icon" onclick="viewOrder('${order.id}')">
                    👁️
                </button>
            </td>
        </tr>
    `).join('');
}

// Mettre à jour le compteur de commandes en attente
function updatePendingOrdersCount(orders) {
    const pendingCount = orders.filter(order => 
        order.status === 'pending' || order.status === 'processing'
    ).length;
    
    const countElement = document.getElementById('pending-orders-count');
    if (countElement) {
        countElement.textContent = pendingCount;
        countElement.style.display = pendingCount > 0 ? 'flex' : 'none';
    }
}

// Charger les produits populaires
async function loadPopularProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
                id,
                name,
                price,
                stock,
                is_active,
                order_items (
                    quantity
                )
            `)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        renderPopularProducts(data);
        
    } catch (error) {
        console.error('Erreur lors du chargement des produits populaires:', error);
    }
}

// Afficher les produits populaires
function renderPopularProducts(products) {
    const container = document.getElementById('popular-products');
    if (!container) return;
    
    if (!products || products.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="text-center">Aucun produit</td></tr>';
        return;
    }
    
    container.innerHTML = products.map(product => {
        const totalSales = product.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        
        return `
            <tr>
                <td>${product.name}</td>
                <td>${parseFloat(product.price).toFixed(2)} €</td>
                <td>${totalSales}</td>
                <td>
                    <span class="${product.stock > 0 ? 'text-success' : 'text-danger'}">
                        ${product.stock}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${product.is_active ? 'active' : 'inactive'}">
                        ${product.is_active ? 'Actif' : 'Inactif'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// Obtenir le texte du statut
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

// Gérer la déconnexion admin
async function handleAdminLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        showNotification('Déconnexion réussie', 'success');
        
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Erreur de déconnexion:', error.message);
        showNotification(error.message, 'error');
    }
}

// Voir les détails d'une commande
function viewOrder(orderId) {
    window.location.href = `orders.html?order=${orderId}`;
}

// Exporter les fonctions pour une utilisation externe
export {
    checkAdminAuth,
    loadDashboardData,
    getStatusText
};
