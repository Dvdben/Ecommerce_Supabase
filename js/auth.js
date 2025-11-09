// Configuration de Supabase
import { supabase } from './supabase.js';

// Éléments du DOM
let loginForm, registerForm;
let userAvatar, userDropdown, loginLink, registerLink, profileLink, ordersLink, logoutLink;

// Initialisation de l'authentification
document.addEventListener('DOMContentLoaded', function() {
    initializeAuthElements();
    checkAuthState();
    setupEventListeners();
});

// Initialiser les éléments d'authentification
function initializeAuthElements() {
    // Formulaires
    loginForm = document.getElementById('login-form');
    registerForm = document.getElementById('register-form');
    
    // Menu utilisateur
    userAvatar = document.getElementById('user-avatar');
    userDropdown = document.getElementById('user-dropdown');
    loginLink = document.getElementById('login-link');
    registerLink = document.getElementById('register-link');
    profileLink = document.getElementById('profile-link');
    ordersLink = document.getElementById('orders-link');
    logoutLink = document.getElementById('logout-link');
}

// Vérifier l'état d'authentification
async function checkAuthState() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            updateUIForLoggedInUser(session.user);
            await createUserProfileIfNeeded(session.user);
        } else {
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('Erreur vérification auth state:', error);
    }
}

// Créer le profil utilisateur si nécessaire
async function createUserProfileIfNeeded(user) {
    try {
        // Vérifier si le profil existe déjà
        const { data: existingProfile } = await supabase
            .from('app_users')
            .select('id')
            .eq('id', user.id)
            .single();

        if (!existingProfile) {
            // Créer le profil dans app_users
            const { error } = await supabase
                .from('app_users')
                .insert([{
                    id: user.id,
                    email: user.email,
                    first_name: user.user_metadata?.first_name || '',
                    last_name: user.user_metadata?.last_name || '',
                    newsletter_sul: user.user_metadata?.newsletter_subscribed || false
                }]);

            if (error) console.warn('Profil non créé (peut exister ailleurs):', error);
        }
    } catch (error) {
        console.log('Profil utilisateur déjà existant ou autre table utilisée');
    }
}

// Mettre à jour l'UI pour un utilisateur connecté
function updateUIForLoggedInUser(user) {
    if (userAvatar) {
        const initials = getUserInitials(user);
        userAvatar.textContent = initials;
        userAvatar.style.display = 'flex';
    }
    
    [loginLink, registerLink].forEach(link => {
        if (link) link.style.display = 'none';
    });
    
    [profileLink, ordersLink, logoutLink].forEach(link => {
        if (link) link.style.display = 'block';
    });
}

// Mettre à jour l'UI pour un utilisateur non connecté
function updateUIForLoggedOutUser() {
    if (userAvatar) {
        userAvatar.style.display = 'none';
    }
    
    [loginLink, registerLink].forEach(link => {
        if (link) link.style.display = 'block';
    });
    
    [profileLink, ordersLink, logoutLink].forEach(link => {
        if (link) link.style.display = 'none';
    });
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Menu utilisateur
    if (userAvatar) {
        userAvatar.addEventListener('click', toggleUserDropdown);
    }
    
    // Formulaires
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        setupPasswordValidation();
    }
    
    // Déconnexion
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
    
    // Fermer le menu déroulant en cliquant à l'extérieur
    document.addEventListener('click', function(event) {
        if (userDropdown && userAvatar && 
            !userAvatar.contains(event.target) && 
            !userDropdown.contains(event.target)) {
            userDropdown.classList.remove('show');
        }
    });
}

// Basculer le menu déroulant utilisateur
function toggleUserDropdown() {
    userDropdown?.classList.toggle('show');
}

// Gérer la connexion
async function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(loginForm);
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        showNotification('Connexion réussie !', 'success');
        setTimeout(() => window.location.href = getRedirectUrl(), 1000);
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Gérer l'inscription
async function handleRegister(event) {
    event.preventDefault();
    
    const formData = new FormData(registerForm);
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirm_password');
    const firstName = formData.get('first_name');
    const lastName = formData.get('last_name');
    const terms = formData.get('terms');
    const newsletter = formData.get('newsletter');
    
    // Validations
    if (password !== confirmPassword) {
        showNotification('Les mots de passe ne correspondent pas', 'error');
        return;
    }
    
    if (!terms) {
        showNotification('Veuillez accepter les conditions', 'error');
        return;
    }
    
    try {
        // 1. Créer le compte Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { first_name: firstName, last_name: lastName }
            }
        });
        
        if (authError) throw authError;
        
        // 2. Créer le profil dans app_users
        if (authData.user) {
            const { error: profileError } = await supabase
                .from('app_users')
                .insert([{
                    id: authData.user.id,
                    email: email,
                    first_name: firstName,
                    last_name: lastName,
                    newsletter_sul: newsletter || false
                }]);
            
            if (profileError) {
                console.warn('Profil non créé:', profileError);
            }
        }
        
        showNotification('Inscription réussie ! Vérifiez votre email.', 'success');
        setTimeout(() => window.location.href = 'login.html', 2000);
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Gérer la déconnexion
async function handleLogout(event) {
    event.preventDefault();
    
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        showNotification('Déconnexion réussie', 'success');
        setTimeout(() => window.location.href = '../index.html', 1000);
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Configuration validation mot de passe
function setupPasswordValidation() {
    const passwordInput = document.getElementById('register-password');
    const confirmInput = document.getElementById('confirm-password');
    const strengthFill = document.getElementById('password-strength-fill');
    const strengthText = document.getElementById('password-strength-text');
    const matchError = document.getElementById('password-match-error');
    
    if (passwordInput && strengthFill && strengthText) {
        passwordInput.addEventListener('input', () => {
            const strength = checkPasswordStrength(passwordInput.value);
            updatePasswordStrengthUI(strength, strengthFill, strengthText);
            if (confirmInput?.value) checkPasswordMatch(passwordInput.value, confirmInput.value, matchError);
        });
    }
    
    if (confirmInput && matchError) {
        confirmInput.addEventListener('input', () => {
            if (passwordInput) checkPasswordMatch(passwordInput.value, confirmInput.value, matchError);
        });
    }
}

// Vérifier la force du mot de passe
function checkPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    
    return strength <= 2 ? 'weak' : strength <= 4 ? 'medium' : 'strong';
}

// Mettre à jour l'UI de force
function updatePasswordStrengthUI(strength, strengthFill, strengthText) {
    const strengthLabels = { 'weak': 'Faible', 'medium': 'Moyen', 'strong': 'Fort' };
    
    strengthFill.className = `strength-fill ${strength}`;
    strengthText.className = `strength-text ${strength}`;
    strengthText.textContent = strengthLabels[strength];
}

// Vérifier la correspondance
function checkPasswordMatch(password, confirmPassword, errorElement) {
    if (errorElement) {
        errorElement.style.display = password !== confirmPassword ? 'block' : 'none';
    }
}

// Obtenir les initiales
function getUserInitials(user) {
    if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
        return `${user.user_metadata.first_name[0]}${user.user_metadata.last_name[0]}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || 'U';
}

// Obtenir l'URL de redirection
function getRedirectUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    
    if (redirect) return decodeURIComponent(redirect);
    
    const referrer = document.referrer;
    if (referrer && !referrer.includes('auth')) {
        return referrer;
    }
    
    return '../index.html';
}

// Afficher une notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
    
    setTimeout(() => notification.remove(), 5000);
}

// Écouter les changements d'état
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        updateUIForLoggedInUser(session.user);
    } else if (event === 'SIGNED_OUT') {
        updateUIForLoggedOutUser();
    }
});

export { checkAuthState, getUserInitials, showNotification };
