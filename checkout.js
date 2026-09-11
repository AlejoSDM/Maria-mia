import {
    obtenerCarrito,
    obtenerSubtotal,
    vaciarCarrito
} from "./carrito.js";
import { CONFIG } from "./config.js";
import { formatearPrecio } from "./catalogo.js";

export function configurarCheckout() {
    document.querySelector("#checkoutButton").addEventListener("click", abrirCheckout);
    document.querySelector("#checkoutForm").addEventListener("submit", enviarPedido);
}

function abrirCheckout() {
    const carrito = obtenerCarrito();
    if (!carrito.length) return;

    document.querySelector("#checkoutSummary").innerHTML = carrito.map(item => `
        <div class="summary-line">
            <span>${escapeHtml(item.nombre)} x${item.cantidad}</span>
            <strong>${formatearPrecio(item.precio * item.cantidad)}</strong>
        </div>
    `).join("") + `
        <div class="summary-line total-line">
            <span>Subtotal sin envío</span>
            <strong>${formatearPrecio(obtenerSubtotal())}</strong>
        </div>
    `;

    bootstrap.Modal.getOrCreateInstance(
        document.querySelector("#checkoutModal")
    ).show();
}

function enviarPedido(event) {
    event.preventDefault();

    const button = document.querySelector("#confirmOrderButton");
    const datos = Object.fromEntries(new FormData(event.currentTarget));
    const carrito = obtenerCarrito();
    const subtotal = obtenerSubtotal();
    const mensaje = crearMensajeWhatsApp(datos, carrito, subtotal);
    const numero = String(CONFIG.WHATSAPP_NUMBER || "").replace(/\D/g, "");

    button.disabled = true;

    try {
        if (!numero) {
            throw new Error("WHATSAPP_NUMBER no configurado");
        }

        const url = `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensaje)}`;
        const ventana = window.open(url, "_blank", "noopener,noreferrer");
        if (!ventana) {
            throw new Error("El navegador bloqueo la ventana de WhatsApp");
        }

        bootstrap.Modal.getOrCreateInstance(
            document.querySelector("#checkoutModal")
        ).hide();
        event.currentTarget.reset();
        vaciarCarrito();
        mostrarToast("Pedido preparado en WhatsApp");
    } catch (error) {
        console.error("Error enviando pedido:", error);
        mostrarToast("No pudimos abrir WhatsApp. Intenta nuevamente.");
    } finally {
        button.disabled = false;
    }
}

function crearMensajeWhatsApp(datos, carrito, subtotal) {
    const productos = carrito.map(item =>
        `- ${item.nombre} x${item.cantidad}: ${formatearPrecio(item.precio * item.cantidad)}`
    ).join("\n");

    return [
        "Hola Maria Mia, quiero realizar este pedido:",
        "",
        `Nombre: ${datos.nombre || "No indicado"}`,
        `Telefono: ${datos.telefono || "No indicado"}`,
        `Ciudad: ${datos.ciudad || "No indicada"}`,
        `Barrio: ${datos.barrio || "No indicado"}`,
        `Direccion: ${datos.direccion || "No indicada"}`,
        `Casa o apartamento: ${datos.casaApartamento || "No indicado"}`,
        `Observaciones: ${datos.observaciones || "Ninguna"}`,
        "",
        "Productos:",
        productos,
        "",
        `Subtotal productos: ${formatearPrecio(subtotal)}`,
        "Envio: por confirmar",
        "Total final: pendiente de confirmar con el envio"
    ].join("\n");
}

function mostrarToast(mensaje) {
    document.querySelector("#toastMessage").textContent = mensaje;
    bootstrap.Toast.getOrCreateInstance(
        document.querySelector("#appToast"),
        { delay: 2600 }
    ).show();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}