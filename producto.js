import { CONFIG } from "./config.js";
import { agregarAlCarrito } from "./carrito.js";

const productId = new URLSearchParams(window.location.search).get("id");
const loading = document.querySelector("#productDetailLoading");
const errorBox = document.querySelector("#productDetailError");
const detail = document.querySelector("#productDetail");
const quantityElement = document.querySelector("#productQuantity");
const decreaseButton = document.querySelector("#decreaseQuantity");
const increaseButton = document.querySelector("#increaseQuantity");
const addButton = document.querySelector("#addDetailToCart");

let allProducts = [];
let currentProduct = null;
let quantity = 1;

function formatPrice(value) {
    const raw = String(value ?? "").trim();
    const number = Number(
        raw
            .replace(/\$/g, "")
            .replace(/\s/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
    );

    if (!Number.isFinite(number)) return raw;

    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(number);
}

function normalizeProduct(product) {
    return {
        id: String(product.id || "").trim(),
        nombre: String(product.nombre || "").trim(),
        categoria: String(product.categoria || "").trim(),
        precio: product.precio,
        descripcion: String(product.descripcion || "").trim(),
        imagen: String(product.imagen || "").trim(),
        disponible: String(product.disponible || "").trim(),
        marca: String(product.marca || "").trim(),
        detalles: String(product.detalles || "").trim(),
        uso: String(product.uso || "").trim(),
        recomendaciones: String(product.recomendaciones || "").trim()
    };
}

function isAvailable(product) {
    return ["si", "sí", "true", "1", "disponible", "yes"]
        .includes(product.disponible.toLowerCase());
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function loadProduct() {
    if (!productId) {
        showProductError();
        return;
    }

    try {
        const response = await fetch(CONFIG.API_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

        const data = await response.json();
        const products = Array.isArray(data) ? data : data.productos || data.products;
        if (!Array.isArray(products)) throw new Error("Respuesta inválida");

        allProducts = products
            .map(normalizeProduct)
        currentProduct = allProducts.find(product => product.id === productId);

        if (!currentProduct || !isAvailable(currentProduct)) {
            showProductError();
            return;
        }

        renderProduct(currentProduct);
        renderRelatedProducts(currentProduct);
    } catch (error) {
        console.error("Error cargando producto:", error);
        showProductError();
    }
}

function renderProduct(product) {
    const image = document.querySelector("#detailImage");
    image.src = product.imagen;
    image.alt = product.nombre;
    image.onerror = () => {
        image.src = "https://placehold.co/900x900/fff0f1/e63946?text=Maria+Mia";
    };

    document.querySelector("#detailCategory").textContent = product.categoria;
    document.querySelector("#detailBrand").textContent = product.marca;
    document.querySelector("#detailName").textContent = product.nombre;
    document.querySelector("#detailPrice").textContent = formatPrice(product.precio);
    document.querySelector("#detailDescription").textContent = product.descripcion;
    document.querySelector("#detailDetails").textContent = product.detalles || "No hay detalles adicionales.";
    document.querySelector("#detailUsage").textContent = product.uso || "Usar según las necesidades del producto.";
    document.querySelector("#detailRecommended").textContent = product.recomendaciones || "Ideal para complementar tu rutina.";

    loading?.classList.add("d-none");
    detail?.classList.remove("d-none");
}

function showProductError() {
    loading?.classList.add("d-none");
    detail?.classList.add("d-none");
    errorBox?.classList.remove("d-none");
}

function renderRelatedProducts(product) {
    const relatedSection = document.querySelector("#relatedProductsSection");
    const relatedInner = document.querySelector("#relatedProductsInner");
    if (!relatedSection || !relatedInner) return;

    const currentCategory = product.categoria.toLowerCase();
    const relatedProducts = allProducts
        .filter(item => {
            return isAvailable(item) &&
                item.categoria.toLowerCase() === currentCategory &&
                item.id !== product.id;
        })
        .slice(0, 8);

    if (!relatedProducts.length) {
        relatedSection.classList.add("d-none");
        return;
    }

    const groups = [];
    for (let index = 0; index < relatedProducts.length; index += 4) {
        groups.push(relatedProducts.slice(index, index + 4));
    }

    relatedInner.innerHTML = groups.map((group, index) => `
        <div class="carousel-item ${index === 0 ? "active" : ""}">
            <div class="related-products-grid">
                ${group.map(createRelatedProductCard).join("")}
            </div>
        </div>
    `).join("");

    relatedSection.classList.remove("d-none");
}

function createRelatedProductCard(product) {
    const image = product.imagen || "https://placehold.co/700x700/fff0f1/e63946?text=Maria+Mia";

    return `
        <article class="related-product-card">
            <a href="producto.html?id=${encodeURIComponent(product.id)}" class="related-product-link">
                <div class="related-product-image">
                    <img src="${escapeHtml(image)}" alt="${escapeHtml(product.nombre)}" loading="lazy"
                         onerror="this.src='https://placehold.co/700x700/fff0f1/e63946?text=Maria+Mia'">
                </div>
                <div class="related-product-content">
                    <span class="related-product-category">${escapeHtml(product.categoria)}</span>
                    <span class="related-product-brand">${escapeHtml(product.marca)}</span>
                    <h3>${escapeHtml(product.nombre)}</h3>
                    <strong class="related-product-price">${formatPrice(product.precio)}</strong>
                </div>
            </a>
        </article>
    `;
}

decreaseButton?.addEventListener("click", () => {
    quantity = Math.max(1, quantity - 1);
    quantityElement.textContent = quantity;
});

increaseButton?.addEventListener("click", () => {
    quantity = Math.min(99, quantity + 1);
    quantityElement.textContent = quantity;
});

addButton?.addEventListener("click", () => {
    if (!currentProduct || !isAvailable(currentProduct)) return;

    agregarAlCarrito({
        id: currentProduct.id,
        nombre: currentProduct.nombre,
        precio: Number(String(currentProduct.precio).replace(/\D/g, "")),
        imagen: currentProduct.imagen
    }, quantity);

    addButton.innerHTML = 'Agregado al carrito <i class="bi bi-check-lg"></i>';
    window.setTimeout(() => {
        addButton.innerHTML = 'Agregar al carrito <i class="bi bi-bag-plus"></i>';
    }, 1800);
});

loadProduct();
