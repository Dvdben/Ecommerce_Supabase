import { supabase } from './supabase.js';

let currentPage = 1;
const itemsPerPage = 10;
let allUsers = [];
let selectedUserId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeUsersPage();
});

async function initializeUsersPage() {
    await loadUsers();
    setupEventListeners();
    updateUserStats();
}

async function loadUsers(page = 1) {
    showLoading(true);
    
    try {
        // Charger les utilisateurs avec le nombre de commandes
        const { data: users, error, count } = await supabase
            .from('users')
            .select(`
                *,
                orders (id)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

        if (error) throw error;

        allUsers = users || [];
        displayUsers(allUsers);
        updatePagination(count, page);
        
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        showNotification('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
        showLoading(false);
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    Aucun utilisateur trouvé
                </td>
            </tr>
        `;
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');
        const orderCount = user.orders ? user.orders.length : 0;
        const createdDate = new Date(user.created_at).toLocaleDateString('fr-FR');
        const statusClass = user.is_active ? 'status-active' : 'status-inactive';
        const statusText = user.is_active ? 'Actif' : 'Inactif';
        const roleText = user.is_admin ? 'Administrateur' : 'Utilisateur';
        
        tr.innerHTML = `
            <td>
                <div class="user-info">
                    <div class="user-avatar-small">${getInitials(user.full_name)}</div>
                    <div class="user-details">
                        <div class="user-name">${user.full_name || 'Utilisateur sans nom'}</div>
                        <div class="user-id">#${user.id}</div>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>${roleText}</td>
            <td>${orderCount} commande(s)</td>
            <td>${createdDate}</td>
            <td>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon view-user" data-id="${user.id}" title="Voir les détails">
                        👁️
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });

    // Mettre à jour le compteur
    document.getElementById('users-count').textContent = `${users.length} utilisateur(s)`;
    
    // Ajouter les écouteurs d'événements
    attachUserEventListeners();
}

function attachUserEventListeners() {
    // Voir les détails
    document.querySelectorAll('.view-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.currentTarget.getAttribute('data-id');
            viewUserDetails(userId);
        });
    });
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
}

async function viewUserDetails(userId) {
    showLoading(true);
    selectedUserId = userId;
    
    try {
        // Charger les détails de l'utilisateur avec le total des commandes
        const { data: user, error } = await supabase
            .from('users')
            .select(`
                *,
                orders (id, total_amount, status)
            `)
            .eq('id', userId)
            .single();

        if (error) throw error;

        // Calculer le total dépensé
        const totalSpent = user.orders
            .filter(order => order.status === 'completed' || order.status === 'delivered')
            .reduce((sum, order) => sum + (order.total_amount || 0), 0);
        
        const orderCount = user.orders.length;

        // Remplir les détails de l'utilisateur
        document.getElementById('user-full-name').textContent = user.full_name || 'Utilisateur sans nom';
        document.getElementById('user-email').textContent = user.email;
        document.getElementById('user-avatar-large').textContent = getInitials(user.full_name);
        
        document.getElementById('user-id').textContent = user.id;
        document.getElementById('user-created-at').textContent = new Date(user.created_at).toLocaleDateString('fr-FR');
        document.getElementById('user-last-login').textContent = user.last_sign_in_at ? 
            new Date(user.last_sign_in_at).toLocaleDateString('fr-FR') : 'Jamais';
        document.getElementById('user-role').value = user.is_admin.toString();
        
        document.getElementById('user-phone').textContent = user.phone || 'Non spécifié';
        document.getElementById('user-address').textContent = formatAddress(user);
        
        document.getElementById('user-orders').textContent = orderCount;
        document.getElementById('user-total-spent').textContent = `${parseFloat(totalSpent).toFixed(2)} €`;
        
        // Ouvrir la modal
        openModal('user-modal');
        
    } catch (error) {
        console.error('Erreur lors du chargement des détails:', error);
        showNotification('Erreur lors du chargement des détails de l\'utilisateur', 'error');
    } finally {
        showLoading(false);
    }
}

function formatAddress(user) {
    if (!user.address && !user.city && !user.postal_code && !user.country) {
        return 'Non spécifiée';
    }
    
    const parts = [];
    if (user.address) parts.push(user.address);
    if (user.postal_code) parts.push(user.postal_code);
    if (user.city) parts.push(user.city);
    if (user.country) parts.push(user.country);
    
    return parts.join(', ');
}

async function updateUser() {
    showLoading(true);
    
    try {
        const isAdmin = document.getElementById('user-role').value === 'true';
        
        const { error } = await supabase
            .from('users')
            .update({ is_admin: isAdmin })
            .eq('id', selectedUserId);

        if (error) throw error;

        showNotification('Rôle utilisateur mis à jour', 'success');
        closeModal('user-modal');
        await loadUsers(currentPage);
        await updateUserStats();
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        showNotification('Erreur lors de la mise à jour du rôle', 'error');
    } finally {
        showLoading(false);
    }
}

async function updateUserStats() {
    try {
        // Compter le nombre total d'utilisateurs
        const { count: totalUsers, error: totalError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (totalError) throw totalError;

        // Compter le nombre d'administrateurs
        const { count: adminUsers, error: adminError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('is_admin', true);

        if (adminError) throw adminError;

        // Compter les nouveaux utilisateurs (30 derniers jours)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: newUsers, error: newError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString());

        if (newError) throw newError;

        // Mettre à jour les statistiques
        document.getElementById('total-users').textContent = totalUsers || 0;
        document.getElementById('admin-users').textContent = adminUsers || 0;
        document.getElementById('new-users').textContent = newUsers || 0;
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour des statistiques:', error);
    }
}

function setupEventListeners() {
    // Filtres
    document.getElementById('role-filter').addEventListener('change', filterUsers);
    document.getElementById('status-filter').addEventListener('change', filterUsers);
    document.getElementById('user-search').addEventListener('input', filterUsers);

    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            loadUsers(currentPage - 1);
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        loadUsers(currentPage + 1);
    });

    // Sauvegarder les modifications
    document.getElementById('save-user').addEventListener('click', updateUser);

    // Export
    document.getElementById('export-users').addEventListener('click', exportUsers);
    
    // Actualiser
    document.getElementById('refresh-users').addEventListener('click', () => {
        loadUsers(currentPage);
        updateUserStats();
    });
}

function filterUsers() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    const roleFilter = document.getElementById('role-filter').value;
    const statusFilter = document.getElementById('status-filter').value;

    let filtered = allUsers;

    if (searchTerm) {
        filtered = filtered.filter(user => 
            user.email.toLowerCase().includes(searchTerm) ||
            user.full_name?.toLowerCase().includes(searchTerm) ||
            user.id.toString().includes(searchTerm)
        );
    }

    if (roleFilter) {
        const isAdmin = roleFilter === 'admin';
        filtered = filtered.filter(user => user.is_admin === isAdmin);
    }

    if (statusFilter) {
        const isActive = statusFilter === 'active';
        filtered = filtered.filter(user => user.is_active === isActive);
    }

    displayUsers(filtered);
}

function updatePagination(totalCount, page) {
    currentPage = page;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    
    document.getElementById('current-page').textContent = page;
    document.getElementById('total-pages').textContent = totalPages;
    
    document.getElementById('prev-page').disabled = page <= 1;
    document.getElementById('next-page').disabled = page >= totalPages;
}

function exportUsers() {
    // Simplifié pour cet exemple
    const usersToExport = allUsers.map(u => ({
        'ID': u.id,
        'Nom': u.full_name || 'Non spécifié',
        'Email': u.email,
        'Rôle': u.is_admin ? 'Administrateur' : 'Utilisateur',
        'Téléphone': u.phone || 'Non spécifié',
        'Commandes': u.orders?.length || 0,
        'Inscrit le': new Date(u.created_at).toLocaleDateString('fr-FR'),
        'Statut': u.is_active ? 'Actif' : 'Inactif'
    }));
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + [Object.keys(usersToExport[0]).join(";")]
        .concat(usersToExport.map(item => Object.values(item).join(";")))
        .join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "utilisateurs_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
