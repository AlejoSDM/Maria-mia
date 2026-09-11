import { cargarProductos, configurarCatalogo } from "./catalogo.js";
import { configurarCarrito } from "./carrito.js";
import { configurarCheckout } from "./checkout.js";


document.addEventListener("DOMContentLoaded", async () => {
    document.querySelector("#currentYear").textContent = new Date().getFullYear();

    configurarCatalogo();
    configurarCarrito();
    configurarCheckout();

    await cargarProductos();
});