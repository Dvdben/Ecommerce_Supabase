// Configuration de Supabase
import { supabase } from './supabase.js';

// Éléments du DOM
let loginForm, registerForm, forgotPasswordForm;
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
    forgotPasswordForm = document.getElementById('forgot-password-form');
    
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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        updateUIForLoggedInUser(session.user);
    } else {
        updateUIForLoggedOutUser();
    }
}

// Mettre à jour l'UI pour un utilisateur connecté
function updateUIForLoggedInUser(user) {
    // Mettre à jour l'avatar utilisateur
    if (userAvatar) {
        const initials = getUserInitials(user);
        userAvatar.textContent = initials;
    }
    
    // Afficher/masquer les liens du menu
    if (loginLink) loginLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';
    if (profileLink) profileLink.style.display = 'block';
    if (ordersLink) ordersLink.style.display = 'block';
    if (logoutLink) logoutLink.style.display = 'block';
    
    // Remplir automatiquement les champs du checkout si disponible
    if (window.location.pathname.includes('checkout')) {
        prefillCheckoutForm(user);
    }
}

// Mettre à jour l'UI pour un utilisateur non connecté
function updateUIForLoggedOutUser() {
    if (userAvatar) {
        userAvatar.textContent = 'U';
    }
    
    if (loginLink) loginLink.style.display = 'block';
    if (registerLink) registerLink.style.display = 'block';
    if (profileLink) profileLink.style.display = 'none';
    if (ordersLink) ordersLink.style.display = 'none';
    if (logoutLink) logoutLink.style.display = 'none';
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
    
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
    
    // Déconnexion
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
    
    // Fermer le menu déroulant en cliquant à l'extérieur
    document.addEventListener('click', function(event) {
        if (userDropdown && userAvatar && !userAvatar.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.classList.remove('show');
        }
    });
}

// Basculer le menu déroulant utilisateur
function toggleUserDropdown() {
    userDropdown.classList.toggle('show');
}

// Gérer la connexion
async function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(loginForm);
    const email = formData.get('email');
    const password = formData.get('password');
    const remember = formData.get('remember');
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        
        if (error) throw error;
        
        showNotification('Connexion réussie !', 'success');
        
        // Rediriger vers la page précédente ou l'accueil
        setTimeout(() => {
            const redirectUrl = getRedirectUrl();
            window.location.href = redirectUrl;
        }, 1000);
        
    } catch (error) {
        console.error('Erreur de connexion:', error.message);
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
    
    // Validation des mots de passe
    if (password !== confirmPassword) {
        showNotification('Les mots de passe ne correspondent pas', 'error');
        return;
    }
    
    if (!terms) {
        showNotification('Veuillez accepter les conditions d\'utilisation', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    newsletter_subscribed: newsletter || false
                }
            }
        });
        
        if (error) throw error;
        
        showNotification('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.', 'success');
        
        // Rediriger vers la page de connexion après inscription
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        
    } catch (error) {
        console.error('Erreur d\'inscription:', error.message);
        showNotification(error.message, 'error');
    }
}

// Gérer la réinitialisation du mot de passe
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const formData = new FormData(forgotPasswordForm);
    const email = formData.get('email');
    
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`,
        });
        
        if (error) throw error;
        
        showNotification('Instructions de réinitialisation envoyées à votre email', 'success');
        
        // Fermer la modale
        closeModal('forgot-password-modal');
        
    } catch (error) {
        console.error('Erreur d\'envoi d\'email:', error.message);
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
        
        // Rediriger vers l'accueil
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Erreur de déconnexion:', error.message);
        showNotification(error.message, 'error');
    }
}

// Configurer la validation du mot de passe
function setupPasswordValidation() {
    const passwordInput = document.getElementById('register-password');
    const confirmInput = document.getElementById('confirm-password');
    const strengthFill = document.getElementById('password-strength-fill');
    const strengthText = document.getElementById('password-strength-text');
    const matchError = document.getElementById('password-match-error');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const strength = checkPasswordStrength(this.value);
            updatePasswordStrengthUI(strength, strengthFill, strengthText);
            
            // Vérifier la correspondance des mots de passe
            if (confirmInput && confirmInput.value) {
                checkPasswordMatch(passwordInput.value, confirmInput.value, matchError);
            }
        });
    }
    
    if (confirmInput) {
        confirmInput.addEventListener('input', function() {
            if (passwordInput) {
                checkPasswordMatch(passwordInput.value, this.value, matchError);
            }
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
    
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
}

// Mettre à jour l'UI de force du mot de passe
function updatePasswordStrengthUI(strength, strengthFill, strengthText) {
    if (!strengthFill || !strengthText) return;
    
    strengthFill.className = 'strength-fill';
    strengthText.className = 'strength-text';
    
    strengthFill.classList.add(strength);
    strengthText.classList.add(strength);
    
    const strengthLabels = {
        'weak': 'Faible',
        'medium': 'Moyen',
        'strong': 'Fort'
    };
    
    strengthText.textContent = strengthLabels[strength];
}

// Vérifier la correspondance des mots de passe
function checkPasswordMatch(password, confirmPassword, errorElement) {
    if (!errorElement) return;
    
    if (password !== confirmPassword && confirmPassword.length > 0) {
        errorElement.style.display = 'block';
    } else {
        errorElement.style.display = 'none';
    }
}

// Obtenir les initiales de l'utilisateur
function getUserInitials(user) {
    if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
        return `${user.user_metadata.first_name[0]}${user.user_metadata.last_name[0]}`.toUpperCase();
    }
    
    if (user.email) {
        return user.email[0].toUpperCase();
    }
    
    return 'U';
}

// Pré-remplir le formulaire de checkout
function prefillCheckoutForm(user) {
    const emailInput = document.getElementById('checkout-email');
    const firstNameInput = document.getElementById('checkout-first-name');
    const lastNameInput = document.getElementById('checkout-last-name');
    
    if (emailInput && user.email) {
        emailInput.value = user.email;
    }
    
    if (firstNameInput && user.user_metadata?.first_name) {
        firstNameInput.value = user.user_metadata.first_name;
    }
    
    if (lastNameInput && user.user_metadata?.last_name) {
        lastNameInput.value = user.user_metadata.last_name;
    }
}

// Obtenir l'URL de redirection
function getRedirectUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    
    if (redirect) {
        return decodeURIComponent(redirect);
    }
    
    // Rediriger vers la page précédente ou l'accueil
    const referrer = document.referrer;
    if (referrer && !referrer.includes('login') && !referrer.includes('register')) {
        return referrer;
    }
    
    return '../index.html';
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Ajouter au body
    document.body.appendChild(notification);
    
    // Fermer la notification
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Supprimer automatiquement après 5 secondes
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Fermer une modale
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Écouter les changements d'état d'authentification
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        updateUIForLoggedInUser(session.user);
    } else if (event === 'SIGNED_OUT') {
        updateUIForLoggedOutUser();
    }
});

// Exporter les fonctions pour une utilisation externe
export {
    checkAuthState,
    getUserInitials,
    showNotification
};
