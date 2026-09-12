import { CONFIG } from "./config.js";
import { agregarAlCarrito } from "./carrito.js";

let allProducts = [];
let featuredProducts = [];
let activeCategory = "Todas";
let activeBrand = "Todas";
let searchTerm = "";
let visibleProducts = 10;

const categoryFromUrl = new URLSearchParams(window.location.search).get("categoria");
if (categoryFromUrl?.trim()) activeCategory = categoryFromUrl.trim();

const cacheKey = "catalogo_productos_web";

const desktopProductsPerPage = 10;
const mobileProductsPerPage = 6;

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
        .filter(product => product.id && product.nombre)
        .filter(isProductAvailable);
    featuredProducts = allProducts.filter(isFeaturedProduct).slice(0, 5);
    visibleProducts = getProductsPerPage();

    renderizarCategorias();
    createFilters();
    createSearchOptions();

    renderFilteredProducts();
    renderPreviewProducts(allProducts.slice(-6).reverse());
    renderFeaturedProducts(featuredProducts);
}

export async function cargarProductos() {
    mostrarCarga(true);
    ocultarError();

    let hayProductosEnPantalla = false;

    try {
        const productosGuardados = localStorage.getItem(cacheKey);
        if (productosGuardados) {
            const listaGuardada = JSON.parse(productosGuardados);
            if (Array.isArray(listaGuardada)) {
                setProducts(listaGuardada);
                mostrarCarga(false);
                hayProductosEnPantalla = allProducts.length > 0;
            }
        }
    } catch (error) {
        console.warn("No se pudo leer el catálogo guardado:", error);
        localStorage.removeItem(cacheKey);
    }

    try {
        if (!CONFIG.API_URL || CONFIG.API_URL === "GOOGLE_SHEETS_API_URL") {
            throw new Error("API_URL no configurada");
        }

        const apiUrl = new URL(CONFIG.API_URL);
        apiUrl.searchParams.set("_", Date.now().toString());

        const response = await fetch(apiUrl, {
            cache: "no-store",
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
        localStorage.setItem(cacheKey, JSON.stringify(lista));

        mostrarCarga(false);
        hayProductosEnPantalla = allProducts.length > 0;
    } catch (error) {
        console.error("Error cargando catálogo:", error);
        mostrarCarga(false);
        if (!hayProductosEnPantalla && allProducts.length === 0) {
            mostrarError();
        }
    }
}

function normalizeProduct(producto) {
    return {
        id: String(producto.id || crypto.randomUUID()).trim(),
        nombre: String(producto.nombre || "").trim(),
        categoria: String(producto.categoria || "").trim(),
        subcategoria: String(producto.subcategoria || "").trim(),
        precio: Number(
            String(producto.precio || 0)
                .replace(/\$/g, "")
                .replace(/\./g, "")
                .replace(",", ".")
        ),
        descripcion: String(producto.descripcion || "").trim(),
        imagen: String(producto.imagen || "").trim(),
        disponible: String(producto.disponible || "").trim(),
        destacado: String(producto.destacado || "").trim(),
        marca: String(producto.marca || "").trim()
    };
}

function isProductAvailable(product) {
    const value = String(product.disponible || "").trim().toLowerCase();
    return ["si", "sí", "true", "1", "disponible", "yes"].includes(value);
}

function isFeaturedProduct(product) {
    const value = String(product.destacado || "").trim().toLowerCase();
    return ["si", "sí", "true", "1", "yes"].includes(value);
}

export function configurarCatalogo() {
    document.querySelector("#searchInput")?.addEventListener("input", event => {
        searchTerm = event.target.value.toLowerCase().trim();
        visibleProducts = getProductsPerPage();
        renderFilteredProducts();
    });

    document.querySelector("#retryButton")?.addEventListener("click", cargarProductos);

    document.querySelector("#filterList")?.addEventListener("click", event => {
        const button = event.target.closest("[data-filter-type]");
        if (!button) return;

        if (button.dataset.filterType === "category") activeCategory = button.dataset.filterValue;
        if (button.dataset.filterType === "brand") activeBrand = button.dataset.filterValue;
        visibleProducts = getProductsPerPage();
        updateActiveFilterButtons();
        renderFilteredProducts();
    });

    document.querySelector("#categoryList")?.addEventListener("click", event => {
        const card = event.target.closest("[data-category]");
        if (!card) return;

        activeCategory = card.dataset.category;
        const catalogSection = document.querySelector("#catalogo");
        if (catalogSection) {
            catalogSection.scrollIntoView({ behavior: "smooth" });
        } else {
            window.location.href = `catalogo.html?categoria=${encodeURIComponent(activeCategory)}`;
            return;
        }
        visibleProducts = getProductsPerPage();
        updateActiveFilterButtons();
        renderFilteredProducts();
    });

    document.querySelector("#productGrid")?.addEventListener("click", event => {
        const button = event.target.closest("[data-add-product]");
        if (!button || button.disabled) return;

        const producto = allProducts.find(item => item.id === button.dataset.addProduct);
        if (producto) agregarAlCarrito(producto);
    });

    document.querySelectorAll("#featuredProducts, #previewProducts").forEach(contenedor => {
        contenedor.addEventListener("click", event => {
            const button = event.target.closest("[data-add-product]");
            if (!button || button.disabled) return;

            const producto = allProducts.find(item => item.id === button.dataset.addProduct);
            if (producto) agregarAlCarrito(producto);
        });
    });

    document.querySelector("#loadMoreButton")?.addEventListener("click", () => {
        visibleProducts += getProductsPerPage();
        renderFilteredProducts();
    });

    let previousMobileState = window.innerWidth <= 767;
    window.addEventListener("resize", () => {
        const currentMobileState = window.innerWidth <= 767;
        if (currentMobileState !== previousMobileState) {
            previousMobileState = currentMobileState;
            visibleProducts = getProductsPerPage();
            renderFilteredProducts();
        }
    });
}

function renderFilteredProducts() {
    const grid = document.querySelector("#productGrid");
    if (!grid) return;

    const matchingProducts = allProducts.filter(producto => {
        const coincideCategoria = activeCategory === "Todas" ||
            producto.categoria.toLowerCase() === activeCategory.toLowerCase();
        const coincideMarca = activeBrand === "Todas" ||
            producto.marca.toLowerCase() === activeBrand.toLowerCase();
        const texto = `${producto.nombre} ${producto.descripcion} ${producto.categoria} ${producto.subcategoria} ${producto.marca}`.toLowerCase();
        return coincideCategoria && coincideMarca && texto.includes(searchTerm);
    });
    const resultado = matchingProducts.slice(0, visibleProducts);

    grid.innerHTML = resultado.map(producto => crearCardProducto(producto)).join("");

    document.querySelector("#emptyState").classList.toggle("d-none", resultado.length > 0);
    updateLoadMoreButton(matchingProducts.length, resultado.length);
}

function renderFeaturedProducts(destacados) {
    const contenedor = document.querySelector("#featuredProducts");
    if (!contenedor) return;

    contenedor.innerHTML = destacados.length
        ? destacados.map(producto => crearCardProducto(producto, true)).join("")
        : `<div class="col-12 text-center text-muted">No hay productos destacados disponibles.</div>`;
}

function getProductsPerPage() {
    return window.innerWidth <= 767 ? mobileProductsPerPage : desktopProductsPerPage;
}

function updateLoadMoreButton(totalProducts, shownProducts) {
    const wrapper = document.querySelector("#loadMoreWrapper");
    const button = document.querySelector("#loadMoreButton");
    if (!wrapper || !button) return;

    const hasMoreProducts = shownProducts < totalProducts;
    wrapper.classList.toggle("d-none", !hasMoreProducts);
    if (!hasMoreProducts) return;

    const remainingProducts = totalProducts - shownProducts;
    button.innerHTML = `Cargar más productos <span class="load-more-count">${Math.min(remainingProducts, getProductsPerPage())}</span><i class="bi bi-plus-lg"></i>`;
}

function renderizarCategorias() {
    const categorias = [...new Set(allProducts.map(producto => producto.categoria))]
        .filter(Boolean)
        .sort();

    const contenedor = document.querySelector("#categoryList");
    if (!contenedor) return;

    contenedor.innerHTML = categorias.length
        ? categorias.map(categoria => {
            const icono = iconosCategoria[categoria.toLowerCase()] || "bi-bag-heart";
            return `
                <div>
                    <a class="category-card"
                       href="catalogo.html?categoria=${encodeURIComponent(categoria)}"
                       data-category="${escapeHtml(categoria)}">
                        <span class="category-icon"><i class="bi ${icono}"></i></span>
                        <span>
                            <h3>${escapeHtml(categoria)}</h3>
                            <small>Explorar</small>
                        </span>
                    </a>
                </div>
            `;
        }).join("")
        : `<div class="col-12 text-center text-muted">No hay categorías disponibles.</div>`;

}

function createFilters() {
    const contenedor = document.querySelector("#filterList");
    if (!contenedor) return;
    const categorias = [...new Set(allProducts.map(producto => producto.categoria))].filter(Boolean).sort();
    const marcas = [...new Set(allProducts.map(producto => producto.marca))].filter(Boolean).sort();
    contenedor.innerHTML = `
        <details class="filter-group">
            <summary class="filter-trigger">
                <span><i class="bi bi-grid-3x3-gap"></i> Filtrar por categoría</span>
                <i class="bi bi-chevron-down filter-chevron"></i>
            </summary>
            <span class="filter-selected" data-filter-selected="category">Todas</span>
            <div class="filter-options">
                ${["Todas", ...categorias].map(value => `<button type="button" class="filter-button" data-filter-type="category" data-filter-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("")}
            </div>
        </details>
        <details class="filter-group">
            <summary class="filter-trigger">
                <span><i class="bi bi-tags"></i> Filtrar por marca</span>
                <i class="bi bi-chevron-down filter-chevron"></i>
            </summary>
            <span class="filter-selected" data-filter-selected="brand">Todas</span>
            <div class="filter-options">
                ${["Todas", ...marcas].map(value => `<button type="button" class="filter-button" data-filter-type="brand" data-filter-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("")}
            </div>
        </details>`;
    updateActiveFilterButtons();
}

function updateActiveFilterButtons() {
    document.querySelectorAll("[data-filter-type='category']").forEach(button => {
        button.classList.toggle("active", button.dataset.filterValue === activeCategory);
    });
    document.querySelectorAll("[data-filter-type='brand']").forEach(button => {
        button.classList.toggle("active", button.dataset.filterValue === activeBrand);
    });

    const selectedCategory = document.querySelector("[data-filter-selected='category']");
    const selectedBrand = document.querySelector("[data-filter-selected='brand']");
    if (selectedCategory) selectedCategory.textContent = activeCategory;
    if (selectedBrand) selectedBrand.textContent = activeBrand;
}

function createSearchOptions() {
    const searchOptions = document.querySelector("#searchOptions");
    if (!searchOptions) return;
    const options = [...new Set(allProducts.flatMap(product => [
        product.nombre,
        product.marca,
        product.categoria,
        product.subcategoria
    ]))]
        .filter(Boolean)
        .sort();
    searchOptions.innerHTML = options.map(option => `<option value="${escapeAttribute(option)}"></option>`).join("");
}

function crearCardProducto(producto, isFeatured = false) {
    const imagen = obtenerImagenSegura(producto.imagen);
    const agotado = !producto.disponible;

    return `
        <div class="col-6 col-lg-4">
            <article class="product-card" tabindex="0">
                <div class="product-image-wrapper">
                    <a href="producto.html?id=${encodeURIComponent(producto.id)}"
                       class="product-card-link"
                       aria-label="Ver ${escapeAttribute(producto.nombre)}">
                        <img class="product-image"
                             src="${escapeAttribute(imagen)}"
                             alt="${escapeAttribute(producto.nombre)}"
                             loading="lazy"
                             onerror="this.src='https://placehold.co/700x500/fff0f1/e63946?text=Maria+Mia'">

                        <div class="product-image-shine"></div>

                        <div class="product-badges">
                            ${isFeatured ? `<span class="product-badge product-badge-featured"><i class="bi bi-stars"></i> MM Select</span>` : ""}
                            ${agotado ? `<span class="badge-soldout">AGOTADO</span>` : ""}
                        </div>

                        <div class="product-hover-info">
                            <span class="product-category">${escapeHtml(producto.categoria)}</span>
                            ${producto.marca ? `<small class="product-brand">${escapeHtml(producto.marca)}</small>` : ""}
                            <p class="product-description">${escapeHtml(producto.descripcion)}</p>
                        </div>
                    </a>

                </div>

            </article>

            <div class="product-outside-info">
                <div class="product-info">
                    <h3><a href="producto.html?id=${encodeURIComponent(producto.id)}">${escapeHtml(producto.nombre)}</a></h3>
                </div>

                <div class="product-footer">
                    <span class="product-price">${formatearPrecio(producto.precio)}</span>
                    <button type="button" class="add-to-cart-button"
                            data-add-product="${escapeAttribute(producto.id)}"
                            ${agotado ? "disabled" : ""}
                            aria-label="Agregar ${escapeAttribute(producto.nombre)} al carrito"
                            title="${agotado ? "Producto agotado" : "Agregar al carrito"}">
                        <i class="bi bi-bag-plus"></i>
                        <span>Agregar</span>
                    </button>
                </div>
            </div>
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
    const loading = document.querySelector("#catalogLoading");
    const grid = document.querySelector("#productGrid");
    const featured = document.querySelector("#featuredProducts");
    loading?.classList.toggle("d-none", !visible);
    if (visible) {
        if (grid) grid.innerHTML = "";
        if (featured) featured.innerHTML = "";
    }
}

function mostrarError() {
    document.querySelector("#catalogError")?.classList.remove("d-none");
    document.querySelector("#productGrid")?.replaceChildren();
    document.querySelector("#featuredProducts")?.replaceChildren();
}

function ocultarError() {
    document.querySelector("#catalogError")?.classList.add("d-none");
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

function obtenerImagenSegura(valor) {
    const fallback = "https://placehold.co/700x500/fff0f1/e63946?text=Maria+Mia";
    if (!valor) return fallback;

    try {
        const url = new URL(String(valor), window.location.href);
        if (["http:", "https:"].includes(url.protocol)) return url.href;
    } catch (error) {
        return fallback;
    }

    return fallback;
}

function renderPreviewProducts(destacados) {
    const contenedor = document.querySelector("#previewProducts");
    if (!contenedor) return;

    if (!destacados.length) {
        contenedor.innerHTML = `<div class="carousel-item active"><div class="row g-4"><div class="col-12 text-center text-muted">No hay productos destacados disponibles.</div></div></div>`;
        return;
    }

    const groups = [];
    for (let index = 0; index < destacados.length; index += 3) {
        groups.push(destacados.slice(index, index + 3));
    }

    contenedor.innerHTML = groups.map((group, index) => `
        <div class="carousel-item ${index === 0 ? "active" : ""}">
            <div class="row g-4">
                ${group.map(producto => crearCardProducto(producto, true)).join("")}
            </div>
        </div>
    `).join("");

    const carouselElement = document.querySelector("#previewProductsCarousel");
    if (carouselElement && window.bootstrap?.Carousel) {
        const carousel = bootstrap.Carousel.getOrCreateInstance(carouselElement, {
            interval: 3500,
            pause: false,
            ride: "carousel",
            wrap: true
        });
        carousel.cycle();
    }
}