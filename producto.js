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

const cacheKey = "catalogo_productos_web";
const fallbackImage =
    "https://placehold.co/900x900/fff0f1/e63946?text=Maria+Mia";


function obtenerImagenSegura(valor) {
    if (!valor) return fallbackImage;

    const enlace = String(valor).trim();

    const archivoDrive = enlace.match(
        /drive\.google\.com\/file\/d\/([^/]+)/
    );

    const parametroId = enlace.match(/[?&]id=([^&]+)/);

    const idDrive = archivoDrive?.[1] || parametroId?.[1];

    if (idDrive) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(idDrive)}&sz=w1000`;
    }

    return enlace;
}

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

    let productoCargadoDesdeCache = false;

    // Primero cargar desde localStorage
    try {
        const productosGuardados = localStorage.getItem(cacheKey);

        if (productosGuardados) {
            const productos = JSON.parse(productosGuardados);

            if (Array.isArray(productos)) {
                allProducts = productos.map(normalizeProduct);

                currentProduct = allProducts.find(product =>
                    product.id.trim().toLowerCase() ===
                    productId.trim().toLowerCase()
                );

                if (currentProduct && isAvailable(currentProduct)) {
                    renderProduct(currentProduct);
                    renderRelatedProducts(currentProduct);
                    productoCargadoDesdeCache = true;
                }
            }
        }
    } catch (error) {
        console.warn("No se pudo leer la caché:", error);
        localStorage.removeItem(cacheKey);
    }

    // Después actualizar desde la API
    try {
        const apiUrl = new URL(CONFIG.API_URL);
        apiUrl.searchParams.set("_", Date.now().toString());

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(apiUrl, {
            cache: "no-store",
            signal: controller.signal,
            headers: {
                Accept: "application/json"
            }
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        const data = await response.json();
        const products = Array.isArray(data)
            ? data
            : data.productos || data.products;

        if (!Array.isArray(products)) {
            throw new Error("Respuesta inválida");
        }

        localStorage.setItem(cacheKey, JSON.stringify(products));

        allProducts = products.map(normalizeProduct);

        currentProduct = allProducts.find(product =>
            product.id.trim().toLowerCase() ===
            productId.trim().toLowerCase()
        );

        if (!currentProduct || !isAvailable(currentProduct)) {
            if (!productoCargadoDesdeCache) showProductError();
            return;
        }

        renderProduct(currentProduct);
        renderRelatedProducts(currentProduct);

    } catch (error) {
        console.error("Error cargando producto:", error);

        // Si ya se mostró desde la caché, no ocultar el producto
        if (!productoCargadoDesdeCache) {
            showProductError();
        }
    }
}



function renderProduct(product) {
    const image = document.querySelector("#detailImage");
    const imageUrl = obtenerImagenSegura(product.imagen);

    image.src = imageUrl;
    image.alt = product.nombre;

    image.onerror = () => {
        image.src = fallbackImage;
    };


    document.querySelector("#detailCategory").textContent = product.categoria;
    document.querySelector("#detailBrand").textContent = product.marca;
    document.querySelector("#detailName").textContent = product.nombre;
    document.querySelector("#detailPrice").textContent = formatPrice(product.precio);
    document.querySelector("#detailDescription").textContent = product.descripcion;
    document.querySelector("#detailDetails").textContent =
        product.detalles || "No hay detalles adicionales.";
    document.querySelector("#detailUsage").textContent =
        product.uso || "Usar según las necesidades del producto.";
    document.querySelector("#detailRecommended").textContent =
        product.recomendaciones || "Ideal para complementar tu rutina.";

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

    const currentId = product.id.trim().toLowerCase();
    const currentCategory = product.categoria.trim().toLowerCase();

    // Productos disponibles, excluyendo el producto actual
    const availableProducts = allProducts.filter(item => {
        return (
            isAvailable(item) &&
            item.id.trim().toLowerCase() !== currentId
        );
    });

    // Primero productos de la misma categoría
    const sameCategoryProducts = availableProducts.filter(item => {
        return item.categoria.trim().toLowerCase() === currentCategory;
    });

    // Después productos de otras categorías
    const otherCategoryProducts = availableProducts.filter(item => {
        return item.categoria.trim().toLowerCase() !== currentCategory;
    });

    // Se prioriza la misma categoría y se completa con otras categorías
    const relatedProducts = [
        ...sameCategoryProducts,
        ...otherCategoryProducts
    ].slice(0, 8);

    // Si no existe ningún otro producto disponible
    if (!relatedProducts.length) {
        relatedSection.classList.add("d-none");
        return;
    }

    // Dividir los productos en grupos de 4 para el carrusel
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

    // Mostrar controles solo si hay más de una página
    const previousButton = document.querySelector(
        "#relatedProductsCarousel .carousel-control-prev"
    );

    const nextButton = document.querySelector(
        "#relatedProductsCarousel .carousel-control-next"
    );

    const hasMultipleGroups = groups.length > 1;

    previousButton?.classList.toggle("d-none", !hasMultipleGroups);
    nextButton?.classList.toggle("d-none", !hasMultipleGroups);
}

function createRelatedProductCard(product) {
    const image = obtenerImagenSegura(product.imagen);

    return `
        <article class="related-product-card">
            <a href="producto.html?id=${encodeURIComponent(product.id)}" class="related-product-link">
                <div class="related-product-image">
                    <img src="${escapeHtml(image)}"
                         alt="${escapeHtml(product.nombre)}"
                         loading="lazy"
                         onerror="this.src='https://placehold.co/700x700/fff0f1/e63946?text=Maria+Mia'">
                </div>
                <div class="related-product-content">
                    <span class="related-product-category">${escapeHtml(product.categoria)}</span>
                    <span class="related-product-brand">${escapeHtml(product.marca)}</span>
                    <h3>${escapeHtml(product.nombre)}</h3>
                    <strong class="related-product-price">
                        ${formatPrice(product.precio)}
                    </strong>
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
