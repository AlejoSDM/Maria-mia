import { cargarProductos, configurarCatalogo } from "./catalogo.js";
import { configurarCarrito } from "./carrito.js";
import { configurarCheckout } from "./checkout.js";


document.addEventListener("DOMContentLoaded", async () => {
    document.querySelector("#currentYear").textContent = new Date().getFullYear();

    configurarAvisoPrivacidad();

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

function configurarAvisoPrivacidad() {
    const notice = document.querySelector("#privacyNotice");
    const acceptButton = document.querySelector("#privacyAccept");
    const moreButton = document.querySelector("#privacyMore");
    const footerLink = document.querySelector("#privacyFooterLink");
    const modal = document.querySelector("#privacyModal");
    if (!notice || !acceptButton) return;

    const abrirModal = event => {
        event?.preventDefault();
        if (!modal) return;
        modal.hidden = false;
        document.body.classList.add("privacy-modal-open");
    };

    moreButton?.addEventListener("click", abrirModal);
    footerLink?.addEventListener("click", abrirModal);
    modal?.querySelectorAll("[data-privacy-close]").forEach(element => {
        element.addEventListener("click", () => {
            modal.hidden = true;
            document.body.classList.remove("privacy-modal-open");
        });
    });

    if (localStorage.getItem("mariaMiaPrivacidadAceptada") === "si") {
        notice.remove();
        return;
    }

    acceptButton.addEventListener("click", () => {
        localStorage.setItem("mariaMiaPrivacidadAceptada", "si");
        notice.remove();
    });
}