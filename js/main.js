// Code principal de l'application
$(document).ready(function() {
    // Initialiser les gestionnaires
    window.authManager = authManager;
    window.productManager = productManager;
    window.cartManager = cartManager;

    // Charger les produits en vedette sur la page d'accueil
    if ($('#featured-products').length) {
        productManager.loadProducts().then(products => {
            const featuredProducts = products.slice(0, 6); // Prendre les 6 premiers produits
            productManager.displayProducts(featuredProducts, 'featured-products');
        });
    }

    // Gérer l'ajout au panier
    $(document).on('click', '.add-to-cart', function() {
        const productId = $(this).data('product-id');
        cartManager.addToCart(productId, 1);
    });

    // Gérer la soumission du formulaire de commande
    $('#checkout-form').on('submit', async function(e) {
        e.preventDefault();
        
        const orderData = {
            customer_name: $('#customer-name').val(),
            delivery_address: $('#delivery-address').val(),
            customer_phone: $('#customer-phone').val(),
            payment_method: $('#payment-method').val()
        };
        
        try {
            const order = await cartManager.checkout(orderData);
            alert('Commande passée avec succès! Numéro de commande: ' + order.id);
            window.location.href = 'orders.html';
        } catch (error) {
            alert('Erreur lors de la commande: ' + error.message);
        }
    });
});
