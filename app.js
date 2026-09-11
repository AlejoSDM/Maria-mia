import { cargarProductos, configurarCatalogo } from "./catalogo.js";
import { configurarCarrito } from "./carrito.js";
import { configurarCheckout } from "./checkout.js";


document.addEventListener("DOMContentLoaded", async () => {
    document.querySelector("#currentYear").textContent = new Date().getFullYear();

    const siteHeader = document.querySelector(".site-header");
    window.addEventListener("scroll", () => {
        if (!siteHeader) return;
        siteHeader.classList.toggle("is-scrolled", window.scrollY > 40);
    }, { passive: true });

    configurarCatalogo();
    configurarCarrito();
    configurarCheckout();

    await cargarProductos();
});