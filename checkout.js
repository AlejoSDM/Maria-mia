import {
    obtenerCarrito,
    obtenerSubtotal,
    vaciarCarrito
} from "./carrito.js";
import { enviarPedidoAN8N } from "./n8n.js";
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
            <span>Total</span>
            <strong>${formatearPrecio(obtenerSubtotal())}</strong>
        </div>
    `;

    bootstrap.Modal.getOrCreateInstance(
        document.querySelector("#checkoutModal")
    ).show();
}

async function enviarPedido(event) {
    event.preventDefault();

    const button = document.querySelector("#confirmOrderButton");
    const datos = Object.fromEntries(new FormData(event.currentTarget));
    const subtotal = obtenerSubtotal();
    const pedido = {
        cliente: datos,
        productos: obtenerCarrito(),
        subtotal,
        total: subtotal,
        fecha: new Date().toISOString()
    };

    button.disabled = true;

    try {
        await enviarPedidoAN8N(pedido);
        bootstrap.Modal.getOrCreateInstance(
            document.querySelector("#checkoutModal")
        ).hide();
        event.currentTarget.reset();
        vaciarCarrito();
        mostrarToast("Pedido recibido correctamente");
    } catch (error) {
        console.error("Error enviando pedido:", error);
        mostrarToast("No pudimos enviar el pedido. Intenta nuevamente.");
    } finally {
        button.disabled = false;
    }
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