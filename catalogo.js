import { CONFIG } from "./config.js";
import { agregarAlCarrito } from "./carrito.js";

let allProducts = [];
let activeCategory = "Todas";
let activeBrand = "Todas";
let searchTerm = "";

const iconosCategoria = {
    rostro: "bi-droplet-half",
    ojos: "bi-eye",
    labios: "bi-heart",
    skincare: "bi-stars",
    accesorios: "bi-brush"
};

function setProducts(products) {
    allProducts = products
        .map(normalizeProduct)
        .filter(product => product.id && product.nombre);

    renderizarCategorias();
    createFilters();
    createSearchOptions();

    renderFilteredProducts();
    renderFeaturedProducts();
}

export async function cargarProductos() {
    mostrarCarga(true);
    ocultarError();

    try {
        if (!CONFIG.API_URL || CONFIG.API_URL === "GOOGLE_SHEETS_API_URL") {
            throw new Error("API_URL no configurada");
        }

        const response = await fetch(CONFIG.API_URL, {
            headers: { Accept: "application/json" }
        });

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        const data = await response.json();
        const lista = Array.isArray(data) ? data : data.productos || data.products;

        if (!Array.isArray(lista)) {
            throw new Error("La respuesta no contiene una lista de productos");
        }

        setProducts(lista);

        mostrarCarga(false);
    } catch (error) {
        console.error("Error cargando catálogo:", error);
        mostrarCarga(false);
        mostrarError();
    }
}

function normalizeProduct(producto) {
    return {
        id: String(producto.id ?? "").trim(),
        nombre: String(producto.nombre ?? "").trim(),
        categoria: String(producto.categoria ?? "General").trim(),
        marca: String(producto.marca ?? "").trim(),
        precio: Number(producto.precio ?? 0),
        descripcion: String(producto.descripcion ?? "").trim(),
        imagen: String(producto.imagen ?? "").trim(),
        disponible: normalizarSiNo(producto.disponible),
        destacado: normalizarSiNo(producto.destacado)
    };
}

function normalizarSiNo(valor) {
    return ["si", "sí", "yes", "true", "1"].includes(
        String(valor).toLowerCase().trim()
    );
}

export function configurarCatalogo() {
    document.querySelector("#searchInput").addEventListener("input", event => {
        searchTerm = event.target.value.toLowerCase().trim();
        renderFilteredProducts();
    });

    document.querySelector("#retryButton").addEventListener("click", cargarProductos);

    document.querySelector("#filterList").addEventListener("click", event => {
        const button = event.target.closest("[data-filter-type]");
        if (!button) return;

        if (button.dataset.filterType === "category") activeCategory = button.dataset.filterValue;
        if (button.dataset.filterType === "brand") activeBrand = button.dataset.filterValue;
        updateActiveFilterButtons();
        renderFilteredProducts();
    });

    document.querySelector("#categoryList").addEventListener("click", event => {
        const card = event.target.closest("[data-category]");
        if (!card) return;

        activeCategory = card.dataset.category;
        document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth" });
        updateActiveFilterButtons();
        renderFilteredProducts();
    });

    document.querySelector("#productGrid").addEventListener("click", event => {
        const button = event.target.closest("[data-add-product]");
        if (!button || button.disabled) return;

        const producto = allProducts.find(item => item.id === button.dataset.addProduct);
        if (producto) agregarAlCarrito(producto);
    });

    document.querySelector("#featuredProducts").addEventListener("click", event => {
        const button = event.target.closest("[data-add-product]");
        if (!button || button.disabled) return;

        const producto = allProducts.find(item => item.id === button.dataset.addProduct);
        if (producto) agregarAlCarrito(producto);
    });
}

function renderFilteredProducts() {
    const resultado = allProducts.filter(producto => {
        const coincideCategoria = activeCategory === "Todas" ||
            producto.categoria.toLowerCase() === activeCategory.toLowerCase();
        const coincideMarca = activeBrand === "Todas" ||
            producto.marca.toLowerCase() === activeBrand.toLowerCase();
        const texto = `${producto.nombre} ${producto.categoria} ${producto.marca} ${producto.descripcion}`.toLowerCase();
        return coincideCategoria && coincideMarca && texto.includes(searchTerm);
    });

    const grid = document.querySelector("#productGrid");
    grid.innerHTML = resultado.map(crearCardProducto).join("");

    document.querySelector("#emptyState").classList.toggle("d-none", resultado.length > 0);
}

function renderFeaturedProducts() {
    const destacados = allProducts.filter(producto => producto.destacado);
    const contenedor = document.querySelector("#featuredProducts");

    contenedor.innerHTML = destacados.length
        ? destacados.map(crearCardProducto).join("")
        : `<div class="col-12 text-center text-muted">No hay productos destacados disponibles.</div>`;
}

function renderizarCategorias() {
    const categorias = [...new Set(allProducts.map(producto => producto.categoria))]
        .filter(Boolean)
        .sort();

    const contenedor = document.querySelector("#categoryList");

    contenedor.innerHTML = categorias.length
        ? categorias.map(categoria => {
            const icono = iconosCategoria[categoria.toLowerCase()] || "bi-bag-heart";
            return `
                <div>
                    <button class="category-card" data-category="${escapeHtml(categoria)}">
                        <span class="category-icon"><i class="bi ${icono}"></i></span>
                        <span>
                            <h3>${escapeHtml(categoria)}</h3>
                            <small>Explorar</small>
                        </span>
                    </button>
                </div>
            `;
        }).join("")
        : `<div class="col-12 text-center text-muted">No hay categorías disponibles.</div>`;

}

function createFilters() {
    const contenedor = document.querySelector("#filterList");
    const categorias = [...new Set(allProducts.map(producto => producto.categoria))].filter(Boolean).sort();
    const marcas = [...new Set(allProducts.map(producto => producto.marca))].filter(Boolean).sort();
    contenedor.innerHTML = `
        <div class="filter-group">
            <span class="filter-label">Categoría</span>
            ${["Todas", ...categorias].map(value => `<button type="button" class="filter-button" data-filter-type="category" data-filter-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("")}
        </div>
        <div class="filter-group">
            <span class="filter-label">Marca</span>
            ${["Todas", ...marcas].map(value => `<button type="button" class="filter-button" data-filter-type="brand" data-filter-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("")}
        </div>`;
    updateActiveFilterButtons();
}

function updateActiveFilterButtons() {
    document.querySelectorAll("[data-filter-type='category']").forEach(button => {
        button.classList.toggle("active", button.dataset.filterValue === activeCategory);
    });
    document.querySelectorAll("[data-filter-type='brand']").forEach(button => {
        button.classList.toggle("active", button.dataset.filterValue === activeBrand);
    });
}

function createSearchOptions() {
    const searchOptions = document.querySelector("#searchOptions");
    if (!searchOptions) return;
    const options = [...new Set(allProducts.flatMap(product => [product.nombre, product.marca, product.categoria]))]
        .filter(Boolean)
        .sort();
    searchOptions.innerHTML = options.map(option => `<option value="${escapeAttribute(option)}"></option>`).join("");
}

function crearCardProducto(producto) {
    const imagen = producto.imagen || "https://placehold.co/700x500/fff0f1/e63946?text=Maria+Mia";
    const agotado = !producto.disponible;

    return `
        <div class="col-sm-6 col-lg-4">
            <article class="product-card">
                <div class="product-image-wrapper">
                    <img class="product-image"
                         src="${escapeAttribute(imagen)}"
                         alt="${escapeAttribute(producto.nombre)}"
                         loading="lazy"
                         onerror="this.src='https://placehold.co/700x500/fff0f1/e63946?text=Maria+Mia'">

                    <div class="product-badges">
                        ${producto.destacado ? `<span class="badge-featured">FAVORITO</span>` : ""}
                        ${agotado ? `<span class="badge-soldout">AGOTADO</span>` : ""}
                    </div>
                </div>

                <div class="product-content">
                    <span class="product-category">${escapeHtml(producto.categoria)}</span>
                    ${producto.marca ? `<small class="product-brand">${escapeHtml(producto.marca)}</small>` : ""}
                    <h3>${escapeHtml(producto.nombre)}</h3>
                    <p class="product-description">${escapeHtml(producto.descripcion)}</p>

                    <div class="product-footer">
                        <span class="product-price">${formatearPrecio(producto.precio)}</span>
                        <button class="add-to-cart-button"
                                data-add-product="${escapeAttribute(producto.id)}"
                                ${agotado ? "disabled" : ""}
                                aria-label="Agregar ${escapeAttribute(producto.nombre)} al carrito"
                                title="${agotado ? "Producto agotado" : "Agregar al carrito"}">
                            <i class="bi bi-plus-lg"></i>
                        </button>
                    </div>
                </div>
            </article>
        </div>
    `;
}

export function formatearPrecio(precio) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(Number(precio) || 0);
}

function mostrarCarga(visible) {
    document.querySelector("#catalogLoading").classList.toggle("d-none", !visible);
    if (visible) {
        document.querySelector("#productGrid").innerHTML = "";
        document.querySelector("#featuredProducts").innerHTML = "";
    }
}

function mostrarError() {
    document.querySelector("#catalogError").classList.remove("d-none");
    document.querySelector("#productGrid").innerHTML = "";
    document.querySelector("#featuredProducts").innerHTML = "";
}

function ocultarError() {
    document.querySelector("#catalogError").classList.add("d-none");
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