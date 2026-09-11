import { CONFIG } from "./config.js";
import { formatearPrecio } from "./catalogo.js";

let carrito = cargarCarritoGuardado();

export function configurarCarrito() {
    renderizarCarrito();

    document.querySelector("#cartItems").addEventListener("click", event => {
        const button = event.target.closest("[data-cart-action]");
        if (!button) return;

        const id = button.dataset.id;
        const action = button.dataset.cartAction;

        if (action === "increase") modificarCantidad(id, 1);
        if (action === "decrease") modificarCantidad(id, -1);
        if (action === "remove") eliminarProducto(id);
    });

    document.querySelector("#clearCartButton").addEventListener("click", vaciarCarrito);
}

export function agregarAlCarrito(producto) {
    const existente = carrito.find(item => item.id === producto.id);

    if (existente) {
        existente.cantidad += 1;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: Number(producto.precio),
            imagen: producto.imagen,
            cantidad: 1
        });
    }

    guardarCarrito();
    renderizarCarrito();
    mostrarToast(`${producto.nombre} agregado al carrito`);
}

function modificarCantidad(id, cambio) {
    const producto = carrito.find(item => item.id === id);
    if (!producto) return;

    producto.cantidad += cambio;

    if (producto.cantidad <= 0) {
        eliminarProducto(id);
        return;
    }

    guardarCarrito();
    renderizarCarrito();
}

function eliminarProducto(id) {
    const producto = carrito.find(item => item.id === id);
    carrito = carrito.filter(item => item.id !== id);

    guardarCarrito();
    renderizarCarrito();

    if (producto) mostrarToast("Producto eliminado");
}

export function vaciarCarrito() {
    if (!carrito.length) return;

    carrito = [];
    guardarCarrito();
    renderizarCarrito();
    mostrarToast("Carrito actualizado");
}

export function obtenerCarrito() {
    return carrito.map(item => ({ ...item }));
}

export function obtenerSubtotal() {
    return carrito.reduce(
        (total, item) => total + item.precio * item.cantidad,
        0
    );
}

function renderizarCarrito() {
    const cartItems = document.querySelector("#cartItems");
    const cartEmpty = document.querySelector("#cartEmpty");
    const cartSummary = document.querySelector("#cartSummary");

    const cantidadTotal = carrito.reduce((total, item) => total + item.cantidad, 0);
    const subtotal = obtenerSubtotal();

    const cartCount = document.querySelector("#cartCount");
    const cartHeaderCount = document.querySelector("#cartHeaderCount");
    const cartSubtotal = document.querySelector("#cartSubtotal");
    const cartTotal = document.querySelector("#cartTotal");

    if (cartCount) cartCount.textContent = cantidadTotal;
    if (cartHeaderCount) cartHeaderCount.textContent = `(${cantidadTotal})`;
    if (cartSubtotal) cartSubtotal.textContent = formatearPrecio(subtotal);
    if (cartTotal) cartTotal.textContent = formatearPrecio(subtotal);

    cartEmpty.classList.toggle("d-none", carrito.length > 0);
    cartSummary.classList.toggle("d-none", carrito.length === 0);

    cartItems.innerHTML = carrito.map(item => `
        <div class="cart-row">
            <img class="cart-row-image"
                 src="${item.imagen || "https://placehold.co/150x150/fff0f1/e63946?text=MM"}"
                 alt="${escapeHtml(item.nombre)}">

            <div class="cart-row-info">
                <h3>${escapeHtml(item.nombre)}</h3>
                <strong>${formatearPrecio(item.precio * item.cantidad)}</strong>

                <div class="quantity-controls">
                    <button data-cart-action="decrease" data-id="${escapeAttribute(item.id)}"
                            aria-label="Disminuir cantidad">−</button>
                    <span>${item.cantidad}</span>
                    <button data-cart-action="increase" data-id="${escapeAttribute(item.id)}"
                            aria-label="Aumentar cantidad">+</button>
                </div>
            </div>

            <button class="remove-cart-item"
                    data-cart-action="remove"
                    data-id="${escapeAttribute(item.id)}"
                    aria-label="Eliminar ${escapeAttribute(item.nombre)}">
                <i class="bi bi-trash3"></i>
            </button>
        </div>
    `).join("");

    const counter = document.querySelector("#cartCount");
    counter.classList.remove("bump");
    void counter.offsetWidth;
    counter.classList.add("bump");
}

function cargarCarritoGuardado() {
    try {
        return JSON.parse(localStorage.getItem(CONFIG.CART_STORAGE_KEY)) || [];
    } catch (error) {
        console.error("No se pudo leer el carrito:", error);
        return [];
    }
}

function guardarCarrito() {
    localStorage.setItem(CONFIG.CART_STORAGE_KEY, JSON.stringify(carrito));
}

function mostrarToast(mensaje) {
    const toastElement = document.querySelector("#appToast");
    document.querySelector("#toastMessage").textContent = mensaje;

    bootstrap.Toast.getOrCreateInstance(toastElement, {
        delay: 2600
    }).show();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}