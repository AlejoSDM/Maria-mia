import { CONFIG } from "./config.js";
import { formatearPrecio } from "./catalogo.js";

export function generarMensajeWhatsApp(pedido) {
    if (
        !CONFIG.WHATSAPP_NUMBER ||
        CONFIG.WHATSAPP_NUMBER === "WHATSAPP_NUMBER"
    ) {
        console.warn("WHATSAPP_NUMBER no configurado");
        return null;
    }

    const productos = pedido.productos.map(item => `
🛍️ ${item.nombre}
Cantidad: ${item.cantidad}
Precio: ${formatearPrecio(item.precio)}
Subtotal: ${formatearPrecio(item.subtotal)}
    `.trim()).join("\n\n");

    const mensaje = `
Hola, Maria Mia 👋

Quiero realizar el siguiente pedido:

${productos}

💰 Total: ${formatearPrecio(pedido.total)}

Datos del cliente:

Nombre: ${pedido.cliente.nombre}
Teléfono: ${pedido.cliente.telefono}
Dirección: ${pedido.cliente.direccion || "Por confirmar"}
Observaciones: ${pedido.cliente.observaciones || "Ninguna"}

ID del pedido: ${pedido.id_pedido}

Por favor, confirmen disponibilidad y método de pago.
    `.trim();

    return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}