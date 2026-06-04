"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, X, Plus, Minus, Trash2, Search, Store, Clock, Info, CheckCircle2, ArrowLeft, Send, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Función experta para calcular el contraste dinámico (Blanco o Negro)
function getContrastColor(hexColor) {
    if (!hexColor) return '#000000';
    let hex = hexColor.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(char => char + char).join('');

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
}

// Funciones expertas para verificar y obtener descuentos individuales
const isDiscountActive = (prod) => {
    if (!prod || !prod.con_descuento || !prod.precio_descuento) return false;
    if (prod.descuento_hasta) {
        const limite = new Date(prod.descuento_hasta);
        if (new Date() >= limite) return false;
    }
    return true;
};

const obtenerPrecioActual = (prod) => {
    return isDiscountActive(prod) ? prod.precio_descuento : prod.precio;
};

// ----------------------------------------------------
// NATIVE SOCIAL ICONS
// ----------------------------------------------------
function InstagramIcon({ className }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
    );
}

function FacebookIcon({ className }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
        </svg>
    );
}

function TikTokIcon({ className }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
        </svg>
    );
}

function WhatsAppIcon({ className }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.799-4.382 9.802-9.77.001-2.61-1.01-5.063-2.846-6.898C16.383 2.1 13.93 1.083 11.32 1.083c-5.407 0-9.807 4.385-9.81 9.778-.001 1.97.512 3.896 1.483 5.587l-1.002 3.625 3.734-.979z" />
        </svg>
    );
}

// ----------------------------------------------------
// CHECKOUT COMPONENT
// ----------------------------------------------------
function CheckoutBull({ negocio, carrito, total, onBack, brandColor, brandTextColor, isClosed }) {
    const [nombre, setNombre] = useState("");
    const [entrega, setEntrega] = useState("delivery"); // delivery | retiro
    const [direccion, setDireccion] = useState("");
    const [pago, setPago] = useState("efectivo"); // efectivo | transferencia
    const [aclaraciones, setAclaraciones] = useState("");
    const [errorNombre, setErrorNombre] = useState("");
    const [errorDireccion, setErrorDireccion] = useState("");
    const [expandedItems, setExpandedItems] = useState({});

    const toggleExpand = (idUnico) => {
        setExpandedItems(prev => ({ ...prev, [idUnico]: !prev[idUnico] }));
    };

    const enviarPedido = () => {
        let hasErrors = false;
        if (!nombre.trim()) {
            setErrorNombre("Por favor, ingresá tu nombre.");
            hasErrors = true;
        } else {
            setErrorNombre("");
        }
        if (entrega === "delivery" && !direccion.trim()) {
            setErrorDireccion("Por favor, ingresá tu dirección para el envío.");
            hasErrors = true;
        } else {
            setErrorDireccion("");
        }
        if (hasErrors) return;

        // Armar el mensaje de WhatsApp de forma profesional sin emojis
        let msg = `*PEDIDO NUEVO - BENDITA BURGER*\n\n`;
        msg += `*Cliente:* ${nombre}\n`;
        msg += `*Método de entrega:* ${entrega === "delivery" ? "Envío a domicilio" : "Retiro en local"}\n`;
        if (entrega === "delivery") {
            msg += `*Dirección:* ${direccion}\n`;
        }
        msg += `*Método de pago:* ${pago === "efectivo" ? "Efectivo" : "Transferencia"}\n`;
        if (aclaraciones.trim()) {
            msg += `*Aclaraciones generales:* "${aclaraciones}"\n`;
        }
        msg += `\n-----------------------------------\n\n`;
        msg += `*Detalle del pedido:*\n`;

        carrito.forEach((item) => {
            msg += `*${item.cantidad}x ${item.producto.nombre}*`;
            if (item.variante) {
                msg += ` (${item.variante.nombre})`;
            }
            msg += ` - $${((item.precioFinal || item.producto.precio) * item.cantidad).toFixed(0)}\n`;
            if (item.adicionales && item.adicionales.length > 0) {
                msg += `   - Extras: ${item.adicionales.map(a => a.nombre).join(", ")}\n`;
            }
            if (item.ingredientesRemovidos && item.ingredientesRemovidos.length > 0) {
                msg += `   - Sin: ${item.ingredientesRemovidos.join(", ")}\n`;
            }
            if (item.notes) {
                msg += `   - Nota: "${item.notes}"\n`;
            }
            msg += `\n`;
        });

        msg += `-----------------------------------\n`;
        msg += `*Total a pagar: $${total.toFixed(0)}*`;

        const phone = negocio.whatsapp;
        const encodedText = encodeURIComponent(msg);
        window.open(`https://wa.me/${phone}?text=${encodedText}`, "_blank");
    };

    return (
        <div className="max-w-xl mx-auto px-4 py-8 animate-fade-in text-[var(--text-main)] min-h-screen">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--brand)] transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">Finalizar Compra</h2>
                    <p className="text-xs text-[var(--text-muted)] font-medium">Completá tus datos para enviar el pedido</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Datos del Cliente */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[var(--brand)] mb-2">Tus Datos</h3>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">Nombre Completo</label>
                        <input
                            type="text"
                            placeholder="Ej: Juan Pérez"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] text-sm rounded-xl px-4 py-3 bull-input transition-all"
                        />
                        {errorNombre && <p className="text-red-500 text-xs font-bold mt-1.5">{errorNombre}</p>}
                    </div>
                </div>

                {/* Método de Entrega */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[var(--brand)] mb-2">Método de Entrega</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setEntrega("delivery")}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${entrega === "delivery" ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--border)] bg-[var(--bg-main)]'}`}
                        >
                            <Store className={`w-6 h-6 mb-2 ${entrega === "delivery" ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`} />
                            <span className="text-xs font-bold">Envío a domicilio</span>
                        </button>
                        <button
                            onClick={() => setEntrega("retiro")}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${entrega === "retiro" ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--border)] bg-[var(--bg-main)]'}`}
                        >
                            <Clock className={`w-6 h-6 mb-2 ${entrega === "retiro" ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`} />
                            <span className="text-xs font-bold">Retiro en local</span>
                        </button>
                    </div>

                    {entrega === "delivery" && (
                        <div className="animate-slide-up mt-4">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">Dirección de Entrega</label>
                            <input
                                type="text"
                                placeholder="Ej: Av. Santa Fe 1234, CABA - Depto 4B"
                                value={direccion}
                                onChange={(e) => setDireccion(e.target.value)}
                                className="w-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] text-sm rounded-xl px-4 py-3 bull-input transition-all"
                            />
                            {errorDireccion && <p className="text-red-500 text-xs font-bold mt-1.5">{errorDireccion}</p>}
                        </div>
                    )}
                </div>

                {/* Forma de Pago */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[var(--brand)] mb-2">Forma de Pago</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setPago("efectivo")}
                            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${pago === "efectivo" ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--border)] bg-[var(--bg-main)]'}`}
                        >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${pago === "efectivo" ? 'border-[var(--brand)]' : 'border-[var(--text-muted)]'}`}>
                                {pago === "efectivo" && <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]"></div>}
                            </div>
                            <span className="text-xs font-bold">Efectivo</span>
                        </button>
                        <button
                            onClick={() => setPago("transferencia")}
                            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${pago === "transferencia" ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--border)] bg-[var(--bg-main)]'}`}
                        >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${pago === "transferencia" ? 'border-[var(--brand)]' : 'border-[var(--text-muted)]'}`}>
                                {pago === "transferencia" && <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]"></div>}
                            </div>
                            <span className="text-xs font-bold">Transferencia</span>
                        </button>
                    </div>
                </div>

                {/* Aclaraciones Adicionales */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[var(--brand)] mb-2">Notas / Aclaraciones del Pedido</h3>
                    <textarea
                        rows="3"
                        placeholder="Ej: Tocar timbre en la reja, no funciona el timbre..."
                        value={aclaraciones}
                        onChange={(e) => setAclaraciones(e.target.value)}
                        className="w-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] text-sm rounded-xl px-4 py-3 bull-input transition-all resize-none"
                    />
                </div>

                {/* Resumen del Pedido (Detalles de lo que pidió) */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[var(--brand)] mb-2">Detalles del Pedido</h3>
                    <div className="divide-y divide-[var(--border)]">
                        {carrito.map((item) => {
                            const isExpanded = !!expandedItems[item.idUnico];
                            const basePrice = item.variante ? item.variante.precio : item.producto.precio;
                            const hasDiscount = isDiscountActive(item.producto) && !item.variante;

                            return (
                                <div key={item.idUnico} className="py-3 flex flex-col gap-2 text-sm font-medium">
                                    <div 
                                        onClick={() => toggleExpand(item.idUnico)}
                                        className="flex justify-between items-center cursor-pointer hover:opacity-85 transition-opacity"
                                    >
                                        <div className="flex items-center gap-2">
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--brand)] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />}
                                            <p className="font-bold text-[var(--text-main)] uppercase tracking-tight leading-tight">
                                                {item.cantidad}x {item.producto.nombre}
                                            </p>
                                        </div>
                                        <span className="font-black text-[var(--text-main)] shrink-0">
                                            ${((item.precioFinal || item.producto.precio) * item.cantidad).toFixed(0)}
                                        </span>
                                    </div>

                                    {isExpanded && (
                                        <div className="pl-6 pr-2 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border)] text-xs space-y-2 animate-slide-up text-[var(--text-muted)]">
                                            {hasDiscount ? (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span>Precio Base (Original):</span>
                                                        <span className="line-through text-gray-500">${item.producto.precio.toFixed(0)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-red-500 font-bold">
                                                        <span>Precio Base (Oferta):</span>
                                                        <span>${item.producto.precio_descuento.toFixed(0)}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex justify-between">
                                                    <span>Precio Base:</span>
                                                    <span className="font-bold text-[var(--text-main)]">${basePrice.toFixed(0)}</span>
                                                </div>
                                            )}

                                            {item.variante && (
                                                <div className="flex justify-between">
                                                    <span>Variante:</span>
                                                    <span className="font-bold text-[var(--brand)] uppercase tracking-tighter">{item.variante.nombre}</span>
                                                </div>
                                            )}

                                            {item.adicionales && item.adicionales.length > 0 && (
                                                <div className="space-y-1">
                                                    <span className="font-black uppercase tracking-wider text-[9px] text-[var(--text-muted)]">Extras Agregados:</span>
                                                    <div className="space-y-0.5 pl-2">
                                                        {item.adicionales.map(ad => (
                                                            <div key={ad.id} className="flex justify-between">
                                                                <span>+ {ad.nombre}</span>
                                                                <span className="font-bold text-[var(--text-main)]">+${ad.precio.toFixed(0)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {item.ingredientesRemovidos && item.ingredientesRemovidos.length > 0 && (
                                                <div className="space-y-1">
                                                    <span className="font-black uppercase tracking-wider text-[9px] text-red-500/70">Ingredientes Quitados:</span>
                                                    <div className="pl-2 flex flex-wrap gap-1">
                                                        {item.ingredientesRemovidos.map(ing => (
                                                            <span key={ing} className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-[10px] font-bold">Sin {ing}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {item.notes && (
                                                <div className="pt-1 border-t border-[var(--border)]">
                                                    <span className="font-black uppercase tracking-wider text-[9px] text-[var(--text-muted)]">Notas:</span>
                                                    <p className="italic text-[var(--text-main)] pl-2 font-normal">"{item.notes}"</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Resumen Final */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Subtotal pedido</span>
                        <span className="font-bold">${total.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-end font-black">
                        <span className="text-sm uppercase tracking-widest text-[var(--text-muted)]">Total Estimado</span>
                        <span className="text-3xl text-[var(--brand)]">${total.toFixed(0)}</span>
                    </div>
                    <button
                        onClick={enviarPedido}
                        disabled={isClosed}
                        style={{ backgroundColor: brandColor, color: brandTextColor }}
                        className="w-full font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-opacity hover:opacity-90 disabled:opacity-50 uppercase tracking-widest text-xs shadow-lg mt-2"
                    >
                        <Send className="w-4 h-4" /> Enviar pedido por WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------
// CLOSED OVERLAY COMPONENT
// ----------------------------------------------------
function ClosedOverlay({ negocio, brandColor, brandTextColor, onPeekMenu }) {
    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-6 backdrop-blur-md animate-fade-in text-white text-center">
            <div className="bg-[#111] w-full max-w-sm rounded-[2rem] p-8 border border-white/5 shadow-2xl animate-bounce-in flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-[var(--brand-soft)] flex items-center justify-center mb-6 border border-[var(--brand-medium)]">
                    <Clock className="w-8 h-8 text-[var(--brand)]" />
                </div>
                <h3 className="font-black text-2xl uppercase tracking-tighter leading-tight mb-3">Estamos <br /> Cerrados</h3>
                <p className="text-white/40 text-xs font-medium mb-6 leading-relaxed px-2">Nuestra tienda online no está recibiendo pedidos en este momento.</p>
                <button onClick={onPeekMenu} className="w-full bg-[var(--brand)] text-[var(--brand-text)] font-black h-12 rounded-xl transition-all uppercase tracking-wider text-xs">
                    Ver la carta
                </button>
            </div>
        </div>
    );
}

// ----------------------------------------------------
// MAIN TEMPLATE COMPONENT (PlantillaBull)
// ----------------------------------------------------
function PlantillaBull({ negocio, categorias, productos }) {
    const [vistaActual, setVistaActual] = useState("catalogo");
    const [categoriaActiva, setCategoriaActiva] = useState("TODOS");
    const [busqueda, setBusqueda] = useState("");
    const [carrito, setCarrito] = useState([]);

    // Estados para Modales
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [productoModal, setProductoModal] = useState(null);
    const [cantidadModal, setCantidadModal] = useState(1);
    const [notasModal, setNotasModal] = useState("");
    const [varianteSeleccionada, setVarianteSeleccionada] = useState(null);
    const [adicionalesSeleccionados, setAdicionalesSeleccionados] = useState([]);
    const [ingredientesRemovidos, setIngredientesRemovidos] = useState([]);

    // Estado del Negocio
    const [peekMenu, setPeekMenu] = useState(false);

    // Calcular si está cerrado leyendo directamente de las columnas
    const calcularCerrado = () => {
        const cf = negocio.campos_formulario || {};
        const horariosCf = cf.horarios || {};

        const horariosActivo = negocio.horarios_activo || horariosCf.activo || false;

        const horarioApertura = (negocio.horarios_activo && negocio.horario_apertura)
            ? negocio.horario_apertura 
            : (horariosCf.apertura || negocio.horario_apertura || "");

        const horarioCierre = (negocio.horarios_activo && negocio.horario_cierre)
            ? negocio.horario_cierre 
            : (horariosCf.cierre || negocio.horario_cierre || "");

        if (!horariosActivo) return false;
        if (!horarioApertura || !horarioCierre) return false;

        // Horario argentino local
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Argentina/Buenos_Aires",
            hour: "numeric",
            minute: "numeric",
            hour12: false
        }).formatToParts(new Date());

        const hour = parseInt(parts.find(p => p.type === "hour").value, 10);
        const minute = parseInt(parts.find(p => p.type === "minute").value, 10);
        const currentTotalMinutes = hour * 60 + minute;

        const [openH, openM] = horarioApertura.split(':').map(Number);
        const [closeH, closeM] = horarioCierre.split(':').map(Number);

        const openTotal = openH * 60 + openM;
        const closeTotal = closeH * 60 + closeM;

        if (closeTotal < openTotal) {
            return !(currentTotalMinutes >= openTotal || currentTotalMinutes <= closeTotal);
        }
        return !(currentTotalMinutes >= openTotal && currentTotalMinutes <= closeTotal);
    };

    const isClosed = calcularCerrado();

    useEffect(() => {
        if (productoModal) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [productoModal]);

    useEffect(() => {
        if (isClosed && vistaActual === "checkout") {
            setVistaActual("catalogo");
        }
    }, [isClosed, vistaActual]);

    const red_instagram = negocio.red_instagram || "";
    const red_facebook = negocio.red_facebook || "";
    const tiktokUrl = negocio.red_tiktok || "";

    // Parse theme and logo configuration from tema_tienda column
    let navbarType = 'texto';
    let logoUrl = '';
    let logoSize = 70;
    let isDark = false;
    try {
        if (negocio.tema_tienda && negocio.tema_tienda.startsWith('{')) {
            const configObj = JSON.parse(negocio.tema_tienda);
            isDark = configObj.theme === 'dark';
            navbarType = configObj.navbar_type || 'texto';
            logoUrl = configObj.logo_url || '';
            logoSize = configObj.logo_size || 70;
        } else {
            isDark = negocio.tema_tienda === 'dark';
        }
    } catch (e) {
        isDark = negocio.tema_tienda === 'dark';
    }

    // VARIABLES DE DISEÑO EXPERTO
    const brandColor = negocio.color_principal || '#EAB308';
    const brandTextColor = getContrastColor(brandColor);

    const themeStyles = {
        '--brand': brandColor,
        '--brand-text': brandTextColor,
        '--brand-soft': `${brandColor}15`,
        '--brand-medium': `${brandColor}40`,
        '--bg-main': isDark ? '#050505' : '#F8F9FA',
        '--bg-card': isDark ? '#111111' : '#FFFFFF',
        '--bg-hover': isDark ? '#1A1A1A' : '#F1F5F9',
        '--text-main': isDark ? '#FFFFFF' : '#09090B',
        '--text-muted': isDark ? '#A1A1AA' : '#71717A',
        '--border': isDark ? '#27272A' : '#E4E4E7',
        '--shadow': isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)',
    };

    const abrirModalProducto = (producto) => {
        setProductoModal(producto);
        setCantidadModal(1);
        setNotasModal("");
        setAdicionalesSeleccionados([]);
        setIngredientesRemovidos([]);
        if (producto.tipo_producto === "hamburguesa" && producto.variantes && producto.variantes.length > 0) {
            setVarianteSeleccionada(producto.variantes[0]);
        } else {
            setVarianteSeleccionada(null);
        }
    };

    const agregarAlCarritoDesdeModal = () => {
        const precioBase = varianteSeleccionada ? varianteSeleccionada.precio : obtenerPrecioActual(productoModal);
        const precioAdicionales = adicionalesSeleccionados.reduce((acc, a) => acc + (a.precio || 0), 0);
        const precioItem = precioBase + precioAdicionales;

        setCarrito((prev) => {
            const adsString = adicionalesSeleccionados.map(a => a.id).sort().join(",");
            const ingsString = ingredientesRemovidos.sort().join(",");
            const idUnico = `${productoModal.id}-${varianteSeleccionada?.id || 'base'}-${adsString}-${ingsString}-${notasModal.trim().toLowerCase()}`;
            
            const existe = prev.find((item) => item.idUnico === idUnico);
            if (existe) return prev.map((item) => item.idUnico === idUnico ? { ...item, cantidad: item.cantidad + cantidadModal } : item);
            return [...prev, { 
                producto: productoModal, 
                cantidad: cantidadModal, 
                notes: notasModal, 
                idUnico, 
                variante: varianteSeleccionada, 
                adicionales: adicionalesSeleccionados,
                ingredientesRemovidos: ingredientesRemovidos,
                precioFinal: precioItem 
            }];
        });
        setProductoModal(null);
    };

    const eliminarDelCarrito = (idUnico) => setCarrito((prev) => prev.filter(item => item.idUnico !== idUnico));
    const actualizarCantidad = (idUnico, delta) => {
        setCarrito(prev => prev.map(item => {
            if (item.idUnico === idUnico) {
                const nueva = item.cantidad + delta;
                return nueva > 0 ? { ...item, cantidad: nueva } : item;
            }
            return item;
        }));
    };

    const totalCarrito = carrito.reduce((acc, item) => acc + (item.precioFinal || obtenerPrecioActual(item.producto)) * item.cantidad, 0);
    const cantidadItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);

    const productosFiltrados = productos.filter(p => {
        const coincideCategoria = categoriaActiva === "TODOS" || p.categoria_id === categoriaActiva;
        const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
        return coincideCategoria && coincideBusqueda;
    }).sort((a, b) => {
        // 1. Descuentos activos primero
        const aDesc = isDiscountActive(a);
        const bDesc = isDiscountActive(b);
        if (aDesc && !bDesc) return -1;
        if (!aDesc && bDesc) return 1;

        // 2. Orden personalizado (orden descendente: números más altos primero)
        const aOrden = a.orden || 0;
        const bOrden = b.orden || 0;
        if (aOrden !== bOrden) {
            return bOrden - aOrden;
        }

        // 3. Últimos creados primero (created_at descendente)
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const overlayOpacity = negocio.hero_opacidad !== null ? negocio.hero_opacidad / 100 : 0.6;

    return (
        <div style={themeStyles} className="bg-[var(--bg-main)] text-[var(--text-main)] min-h-screen font-sans selection:bg-[var(--brand)] selection:text-[var(--brand-text)] relative transition-colors duration-300">

            {/* MARCA DE AGUA WHAASY (Solo plan free) */}
            {negocio.plan === 'free' && (
                <a
                    href="https://whaasy.vercel.app?ref=tienda_free"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#22c55e] text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest py-1.5 px-4 text-center block hover:bg-[#16a34a] transition-colors shadow-sm z-50 relative"
                >
                    Creá tu menú gratis con Whaasy 🚀
                </a>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .bull-input:focus { border-color: var(--brand) !important; outline: none; box-shadow: 0 0 0 1px var(--brand-soft); }
                .bull-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
                .bull-scroll::-webkit-scrollbar-track { background: transparent; }
                .bull-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
                html { scroll-behavior: smooth; }
            `}} />

            {/* A. OVERLAY DE CIERRE */}
            {isClosed && !peekMenu && (
                <ClosedOverlay negocio={negocio} brandColor={brandColor} brandTextColor={brandTextColor} onPeekMenu={() => setPeekMenu(true)} />
            )}

            {vistaActual === "catalogo" && (
                <div className="flex flex-col min-h-screen relative">

                    {/* HEADER / PORTADA MÁS COMPACTA */}
                    <header className="relative w-full min-h-[180px] md:min-h-[280px] py-8 md:py-12 bg-[var(--bg-card)] border-b border-[var(--border)] overflow-hidden shrink-0 flex flex-col items-center justify-center text-center p-4">
                        {negocio.hero_imagen_url ? (
                            <img src={negocio.hero_imagen_url} alt="Portada" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                            <div className="absolute inset-0 bg-neutral-800"></div>
                        )}
                        <div className="absolute inset-0 bg-black transition-opacity duration-300" style={{ opacity: overlayOpacity }}></div>

                        <div className="relative z-10 flex flex-col items-center justify-center w-full">
                            {navbarType === 'logo' && logoUrl && (
                                <img src={logoUrl} alt="Logo" style={{ height: `${logoSize}px` }} className="w-auto object-contain mb-3 drop-shadow-md transition-transform hover:scale-105" />
                            )}
                            <h1 className="text-xl md:text-3xl font-black text-white tracking-tight drop-shadow-md mb-1.5 uppercase">{negocio.hero_titulo || ""}</h1>
                            {negocio.hero_subtitulo && <p className="text-white/90 text-xs md:text-sm font-medium mb-3 drop-shadow-sm max-w-lg">{negocio.hero_subtitulo}</p>}

                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest backdrop-blur-md ${isClosed ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-green-500/20 border-green-500/50 text-green-400'}`}>
                                <span className={`w-1 h-1 rounded-full animate-pulse ${isClosed ? 'bg-red-500' : 'bg-green-500'}`}></span> {isClosed ? 'Cerrado' : 'Abierto ahora'}
                            </div>
                        </div>
                    </header>

                    {/* BARRA DE NAVEGACIÓN Y FILTROS COMPACTA REORGANIZADA */}
                    <div className="sticky top-0 z-40 bg-[var(--bg-main)]/90 backdrop-blur-xl border-b border-[var(--border)] shadow-sm">
                        <div className="max-w-[1400px] mx-auto px-4 py-2 md:py-0 md:h-14 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-6">

                            {/* NOMBRE DEL NEGOCIO (MÓVIL) - SOLO SE MUESTRA SI ES MODO TEXTO */}
                            {navbarType !== 'logo' && (
                                <div className="md:hidden flex items-center justify-between w-full border-b border-[var(--border)] pb-2 mb-1">
                                    <div className="flex-shrink-0 flex items-center cursor-pointer gap-2" onClick={() => { setVistaActual("catalogo"); window.scrollTo(0, 0); }}>
                                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand)] shadow-[0_0_10px_var(--brand)] shrink-0"></div>
                                        <span className="font-black text-sm uppercase tracking-tighter text-[var(--text-main)] truncate max-w-[280px]">{negocio.nombre}</span>
                                    </div>
                                </div>
                            )}

                            {/* FILA DE CATEGORÍAS Y CARRITO (MÓVIL) */}
                            <div className="md:hidden flex items-center gap-3 w-full">
                                {/* CATEGORIAS MOBILE */}
                                <div className="flex-1 overflow-x-auto bull-scroll flex items-center gap-2 py-1">
                                    <button onClick={() => setCategoriaActiva("TODOS")} className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${categoriaActiva === "TODOS" ? 'bg-[var(--brand)] text-[var(--brand-text)] shadow-md shadow-[var(--brand-soft)]' : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]'}`}>Todos</button>
                                    {categorias.map(cat => (
                                        <button key={cat.id} onClick={() => setCategoriaActiva(cat.id)} className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${categoriaActiva === cat.id ? 'bg-[var(--brand)] text-[var(--brand-text)] shadow-md shadow-[var(--brand-soft)]' : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]'}`}>{cat.nombre}</button>
                                    ))}
                                </div>

                                {/* CARRITO MOBILE (EN LA MISMA LÍNEA) */}
                                <button onClick={() => setIsCartOpen(true)} className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)] hover:border-[var(--brand)] transition-colors shrink-0">
                                    <ShoppingCart className="w-4 h-4" />
                                    {cantidadItems > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-[var(--brand)] text-[var(--brand-text)] text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-[var(--bg-main)]">
                                            {cantidadItems}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* SEARCH DESKTOP */}
                            <div className="flex-1 max-w-sm relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)] text-xs rounded-lg pl-9 pr-3 py-1.5 bull-input transition-all"
                                />
                            </div>

                            {/* CARRITO DESKTOP */}
                            <button onClick={() => setIsCartOpen(true)} className="hidden md:flex relative items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)] hover:border-[var(--brand)] transition-colors shrink-0">
                                <ShoppingCart className="w-4 h-4" />
                                {cantidadItems > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-[var(--brand)] text-[var(--brand-text)] text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-[var(--bg-main)]">
                                        {cantidadItems}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* CONTENIDO PRINCIPAL */}
                    <div className="max-w-[1400px] mx-auto w-full px-4 py-5 md:py-8 flex flex-col md:flex-row gap-6 flex-1 pb-32">

                        <aside className="hidden md:flex flex-col w-56 shrink-0 gap-1 sticky top-20 h-max">
                            <h3 className="font-black text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-3 px-3">Menú Principal</h3>
                            <button onClick={() => setCategoriaActiva("TODOS")} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold text-xs transition-all ${categoriaActiva === "TODOS" ? 'bg-[var(--brand)] text-[var(--brand-text)] shadow-md shadow-[var(--brand-soft)]' : 'hover:bg-[var(--bg-card)] text-[var(--text-muted)]'}`}>
                                <Store className="w-3.5 h-3.5" /> Todos
                            </button>
                            {categorias.map(cat => (
                                <button key={cat.id} onClick={() => setCategoriaActiva(cat.id)} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold text-xs transition-all ${categoriaActiva === cat.id ? 'bg-[var(--brand)] text-[var(--brand-text)] shadow-md shadow-[var(--brand-soft)]' : 'hover:bg-[var(--bg-card)] text-[var(--text-muted)]'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${categoriaActiva === cat.id ? 'bg-[var(--brand-text)]' : 'bg-[var(--brand)]'}`}></div>
                                    {cat.nombre}
                                </button>
                            ))}
                        </aside>

                        <main className="flex-1">
                            <div className="md:hidden mb-4">
                                <div className="relative w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                                    <input type="text" placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)] text-xs rounded-lg pl-9 py-2.5 bull-input" />
                                </div>
                            </div>

                            {productosFiltrados.length === 0 ? (
                                <div className="text-center py-16 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] px-4">
                                    <Search className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-20" />
                                    <p className="text-[var(--text-muted)] font-bold text-xs">No encontramos resultados</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                    {productosFiltrados.map(prod => (
                                        <article key={prod.id} onClick={() => abrirModalProducto(prod)} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--brand)] transition-all cursor-pointer group flex flex-col h-full shadow-sm hover:shadow-md relative">

                                            {/* IMAGEN 1:1 PERFECTA */}
                                            <div className="relative w-full aspect-square bg-[var(--bg-hover)] overflow-hidden border-b border-[var(--border)] shrink-0">
                                                {isDiscountActive(prod) && (
                                                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-md z-10">
                                                        Oferta
                                                    </div>
                                                )}
                                                {prod.imagen_url ? (
                                                    <img src={prod.imagen_url} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center opacity-10"><Store className="w-6 h-6" /></div>
                                                )}
                                            </div>

                                            {/* TEXTOS Y BOTÓN COMPACTOS */}
                                            <div className="p-2.5 md:p-3 flex flex-col flex-1">
                                                <h3 className="font-bold text-xs md:text-sm text-[var(--text-main)] mb-0.5 line-clamp-2 uppercase tracking-tight leading-tight">{prod.nombre}</h3>
                                                <p className="text-[var(--text-muted)] text-[9px] md:text-[10px] line-clamp-2 leading-tight flex-1 mb-2.5">{prod.descripcion || 'Sin descripción'}</p>

                                                <button className="mt-auto w-full py-1.5 md:py-2 px-2.5 rounded-lg md:rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] text-[10px] md:text-xs font-black uppercase tracking-wider group-hover:bg-[var(--brand)] group-hover:text-[var(--brand-text)] transition-all flex justify-between items-center border border-[var(--brand-soft)]">
                                                    <span>Agregar</span>
                                                    <span className="flex items-center gap-1.5">
                                                        {isDiscountActive(prod) ? (
                                                            <>
                                                                <span className="line-through opacity-50 text-[9px] font-normal">${prod.precio.toFixed(0)}</span>
                                                                <span>${prod.precio_descuento.toFixed(0)}</span>
                                                            </>
                                                        ) : (
                                                            <span>${prod.precio.toFixed(0)}</span>
                                                        )}
                                                    </span>
                                                </button>
                                            </div>

                                        </article>
                                    ))}
                                </div>
                            )}
                        </main>
                    </div>

                    {/* BARRA FLOTANTE MÓVIL (MÁS COMPACTA) */}
                    {carrito.length > 0 && (
                        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-[45] md:hidden">
                            <button onClick={() => setIsCartOpen(true)} className="w-full bg-[var(--brand)] text-[var(--brand-text)] h-14 rounded-2xl shadow-xl flex items-center justify-between px-2 border border-black/10">
                                <div className="flex items-center gap-2.5">
                                    <div className="bg-[var(--bg-main)] text-[var(--brand)] w-10 h-10 rounded-xl flex items-center justify-center relative shadow-sm border border-[var(--border)]">
                                        <ShoppingCart className="w-4 h-4" />
                                        <span className="absolute -top-1 -right-1 bg-[var(--text-main)] text-[var(--bg-main)] text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-[var(--border)]">{cantidadItems}</span>
                                    </div>
                                    <span className="font-black text-xs uppercase tracking-tight">Mi Pedido</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-[var(--bg-main)] text-[var(--brand)] px-3 py-1.5 rounded-lg font-black text-sm shadow-inner border border-[var(--border)]">
                                        ${totalCarrito.toFixed(0)}
                                    </div>
                                    <div className="pr-1.5"><Plus className="w-4 h-4 rotate-45" /></div>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* PIE DE PÁGINA */}
                    <footer className="mt-auto pt-10 pb-6 px-6 border-t border-white/10 text-white text-center md:text-left" style={{ backgroundColor: '#f5290f' }}>
                        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                            {/* Columna 1: Marca y Ubicación */}
                            <div className="flex flex-col items-center md:items-start gap-3">
                                <div className="flex items-center gap-2 mb-1">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" style={{ height: '55px' }} className="w-auto object-contain drop-shadow-md" />
                                    ) : (
                                        <>
                                            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                                            <h4 className="font-black text-xl uppercase tracking-tight leading-none text-white">{negocio.nombre}</h4>
                                        </>
                                    )}
                                </div>
                                <div className="text-xs font-semibold text-white/80 space-y-1">
                                    <p className="font-black text-[9px] uppercase tracking-wider text-white/50">Ubicación</p>
                                    <p>Goya, Corrientes</p>
                                </div>
                            </div>

                            {/* Columna 2: Días y Horarios */}
                            <div className="flex flex-col items-center md:items-start gap-1.5">
                                <h5 className="font-black uppercase text-[9px] tracking-widest mb-1 text-white/50">Días y Horarios</h5>
                                <div className="text-xs font-semibold text-white/90">
                                    <p>Martes a Domingo</p>
                                    <p className="font-black mt-0.5 text-white">20:00 hs a 00:30 hs</p>
                                </div>
                            </div>

                            {/* Columna 3: Contacto */}
                            <div className="flex flex-col items-center md:items-start gap-1.5">
                                <h5 className="font-black uppercase text-[9px] tracking-widest mb-1 text-white/50">Contacto</h5>
                                <a href={`https://wa.me/${negocio.whatsapp}`} target="_blank" rel="noreferrer" className="text-xs font-black flex items-center gap-2 hover:bg-white/20 transition-colors bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-white">
                                    <WhatsAppIcon className="w-4 h-4 text-green-400" /> WhatsApp
                                </a>
                            </div>

                            {/* Columna 4: Redes Sociales */}
                            {(red_instagram || red_facebook || tiktokUrl) && (
                                <div className="flex flex-col items-center md:items-end gap-1.5">
                                    <h5 className="font-black uppercase text-[9px] tracking-widest mb-1.5 text-white/50">Redes Sociales</h5>
                                    <div className="flex gap-2">
                                        {red_instagram && <a href={red_instagram} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"><InstagramIcon className="w-4.5 h-4.5" /></a>}
                                        {red_facebook && <a href={red_facebook} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"><FacebookIcon className="w-4.5 h-4.5" /></a>}
                                        {tiktokUrl && <a href={tiktokUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"><TikTokIcon className="w-4.5 h-4.5" /></a>}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="max-w-[1400px] mx-auto mt-8 pt-4 border-t border-white/10 text-center font-bold text-[10px] uppercase tracking-widest text-white/60 flex flex-col items-center gap-1.5">
                            <span>&copy; {new Date().getFullYear()} {negocio.nombre}.</span>
                            {negocio.plan === 'free' && (
                                <a href="https://whaasy.vercel.app?ref=tienda_free" target="_blank" rel="noopener noreferrer" className="text-green-300 hover:underline transition-all">
                                    Creado gratis con Whaasy
                                </a>
                            )}
                        </div>
                    </footer>
                </div>
            )}

            {vistaActual === "checkout" && (
                <CheckoutBull negocio={negocio} carrito={carrito} total={totalCarrito} onBack={() => setVistaActual("catalogo")} brandColor={brandColor} brandTextColor={brandTextColor} isClosed={isClosed} />
            )}

            {/* MODAL PRODUCTO COMPACTO */}
            {productoModal && (
                <div className="fixed inset-0 bg-black/90 z-[60] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
                    <div className="bg-[var(--bg-card)] w-full max-w-sm rounded-t-[1.5rem] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] relative border-t sm:border border-[var(--border)]">
                        <button onClick={() => setProductoModal(null)} className="absolute top-3 right-3 bg-black/50 hover:bg-black text-white w-8 h-8 rounded-full flex items-center justify-center transition-all z-20"><X className="w-4 h-4" /></button>

                        <div className="p-5 md:p-6 overflow-y-auto bull-scroll flex-1">

                            <div className="relative w-full aspect-square shrink-0 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl overflow-hidden mb-4 flex items-center justify-center">
                                {productoModal.imagen_url ? (
                                    <img src={productoModal.imagen_url} alt={productoModal.nombre} className="w-full h-full object-cover" />
                                ) : (
                                    <Store className="w-10 h-10 text-[var(--border)]" />
                                )}
                            </div>

                            <h2 className="text-xl md:text-2xl font-black mb-1 leading-tight tracking-tight uppercase text-[var(--text-main)]">{productoModal.nombre}</h2>
                            <div className="font-black text-xl text-[var(--brand)] mb-3 flex items-center gap-2">
                                {isDiscountActive(productoModal) && !varianteSeleccionada ? (
                                    <>
                                        <span className="line-through opacity-45 text-sm">${(productoModal.precio + adicionalesSeleccionados.reduce((acc, a) => acc + (a.precio || 0), 0)).toFixed(0)}</span>
                                        <span>${(productoModal.precio_descuento + adicionalesSeleccionados.reduce((acc, a) => acc + (a.precio || 0), 0)).toFixed(0)}</span>
                                    </>
                                ) : (
                                    <span>${( (varianteSeleccionada ? varianteSeleccionada.precio : productoModal.precio) + adicionalesSeleccionados.reduce((acc, a) => acc + (a.precio || 0), 0) ).toFixed(0)}</span>
                                )}
                            </div>

                            {isDiscountActive(productoModal) && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 text-[11px] font-bold flex items-center gap-2 mb-4 animate-fade-in">
                                    <Clock className="w-3.5 h-3.5 shrink-0" />
                                    <span>
                                        {productoModal.descuento_hasta ? (
                                            `Oferta válida hasta el ${new Date(productoModal.descuento_hasta).toLocaleDateString()} a las ${new Date(productoModal.descuento_hasta).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} hs`
                                        ) : (
                                            "¡Oferta especial por tiempo limitado!"
                                        )}
                                    </span>
                                </div>
                            )}

                            {productoModal.descripcion && (
                                <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border)] mb-5">
                                    <p className="text-[var(--text-muted)] text-xs leading-relaxed font-medium">{productoModal.descripcion}</p>
                                </div>
                            )}

                            {productoModal.tipo_producto === "hamburguesa" && productoModal.variantes && productoModal.variantes.length > 0 && (
                                <div className="mb-5 space-y-2">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Variantes</label>
                                    <div className="flex flex-col gap-2">
                                        {productoModal.variantes.map(variante => (
                                            <label key={variante.id} onClick={() => setVarianteSeleccionada(variante)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${varianteSeleccionada?.id === variante.id ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--border)] bg-[var(--bg-main)]'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${varianteSeleccionada?.id === variante.id ? 'border-[var(--brand)]' : 'border-[var(--text-muted)]'}`}>
                                                        {varianteSeleccionada?.id === variante.id && <div className="w-2 h-2 rounded-full bg-[var(--brand)]"></div>}
                                                    </div>
                                                    <span className={`text-sm font-bold ${varianteSeleccionada?.id === variante.id ? 'text-[var(--brand)]' : 'text-[var(--text-main)]'}`}>{variante.nombre}</span>
                                                </div>
                                                <span className={`text-xs font-bold ${varianteSeleccionada?.id === variante.id ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>${variante.precio}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SECCIÓN ADICIONALES/EXTRAS EN BULL MODAL */}
                            {productoModal.adicionales && productoModal.adicionales.length > 0 && (
                                <div className="mb-5 space-y-2">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Agregados / Extras</label>
                                    <div className="flex flex-col gap-2">
                                        {productoModal.adicionales.map(adicional => {
                                            const seleccionado = adicionalesSeleccionados.some(a => a.id === adicional.id);
                                            return (
                                                <label
                                                    key={adicional.id}
                                                    onClick={() => {
                                                        if (seleccionado) {
                                                            setAdicionalesSeleccionados(adicionalesSeleccionados.filter(a => a.id !== adicional.id));
                                                        } else {
                                                            setAdicionalesSeleccionados([...adicionalesSeleccionados, adicional]);
                                                        }
                                                    }}
                                                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${seleccionado ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--border)] bg-[var(--bg-main)]'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${seleccionado ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-text)]' : 'border-[var(--text-muted)]'}`}>
                                                            {seleccionado && <Plus className="w-2.5 h-2.5 text-white" />}
                                                        </div>
                                                        <span className={`text-sm font-bold ${seleccionado ? 'text-[var(--brand)]' : 'text-[var(--text-main)]'}`}>{adicional.nombre}</span>
                                                    </div>
                                                    <span className={`text-xs font-black ${seleccionado ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>+${adicional.precio}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* SECCIÓN INGREDIENTES A QUITAR EN BULL MODAL */}
                            {productoModal.ingredientes_removibles && productoModal.ingredientes_removibles.length > 0 && (
                                <div className="mb-5 space-y-2">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Quitar Ingredientes (Sin costo)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {productoModal.ingredientes_removibles.map(ing => {
                                            const removido = ingredientesRemovidos.includes(ing);
                                            return (
                                                <label
                                                    key={ing}
                                                    onClick={() => {
                                                        if (removido) {
                                                            setIngredientesRemovidos(ingredientesRemovidos.filter(i => i !== ing));
                                                        } else {
                                                            setIngredientesRemovidos([...ingredientesRemovidos, ing]);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${removido ? 'border-red-500/50 bg-red-500/5 text-red-500' : 'border-[var(--border)] bg-[var(--bg-main)]'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${removido ? 'border-red-500 bg-red-500 text-white' : 'border-[var(--text-muted)]'}`}>
                                                        {removido && <Minus className="w-2 h-2 text-white" />}
                                                    </div>
                                                    <span className="text-xs font-bold truncate">Sin {ing}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">¿Alguna aclaración?</label>
                                    <textarea rows="2" placeholder="Ej: Sin cebolla..." value={notasModal} onChange={(e) => setNotasModal(e.target.value)} className="bull-input w-full p-3 text-xs border rounded-xl bg-[var(--bg-main)] border-[var(--border)] text-[var(--text-main)] resize-none font-medium" />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-[var(--bg-main)] border-t border-[var(--border)] flex flex-col gap-3 shrink-0">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Cantidad</span>
                                <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-1 h-10">
                                    <button onClick={() => cantidadModal > 1 && setCantidadModal(cantidadModal - 1)} className="w-10 h-full flex items-center justify-center text-lg font-bold hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-[var(--text-main)]">-</button>
                                    <span className="font-black text-lg w-8 text-center text-[var(--text-main)]">{cantidadModal}</span>
                                    <button onClick={() => setCantidadModal(cantidadModal + 1)} className="w-10 h-full flex items-center justify-center text-lg font-bold hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-[var(--text-main)]">+</button>
                                </div>
                            </div>
                            <button onClick={agregarAlCarritoDesdeModal} className="w-full bg-[var(--brand)] text-[var(--brand-text)] font-black h-12 rounded-xl hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wide text-xs border border-transparent">
                                Agregar • ${(((varianteSeleccionada ? varianteSeleccionada.precio : obtenerPrecioActual(productoModal)) + adicionalesSeleccionados.reduce((acc, a) => acc + (a.precio || 0), 0)) * cantidadModal).toFixed(0)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CARRITO PANEL COMPACTO */}
            {isCartOpen && (
                <>
                    <div className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
                    <aside className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-[var(--bg-card)] z-[70] shadow-2xl flex flex-col border-l border-[var(--border)]">
                        <div className="p-5 flex justify-between items-center border-b border-[var(--border)] bg-[var(--bg-main)]">
                            <h2 className="font-black text-lg flex items-center gap-2 uppercase tracking-tight text-[var(--text-main)]"><ShoppingCart className="w-5 h-5 text-[var(--brand)]" /> Mi Pedido</h2>
                            <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="flex-1 p-5 overflow-y-auto bull-scroll space-y-3">
                            {carrito.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20"><ShoppingCart className="w-12 h-12 mb-2 text-[var(--text-main)]" /><p className="font-black uppercase text-[10px] tracking-widest text-[var(--text-main)]">Vacío</p></div>
                            ) : (
                                carrito.map((item) => (
                                    <div key={item.idUnico} className="bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border)] flex gap-3 relative items-center">
                                        <button onClick={() => eliminarDelCarrito(item.idUnico)} className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-red-500 transition-colors p-1 bg-[var(--bg-card)] rounded-md border border-[var(--border)]"><Trash2 className="w-3 h-3" /></button>
                                        <div className="w-12 h-12 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
                                            {item.producto.imagen_url ? <img src={item.producto.imagen_url} alt="" className="w-full h-full object-cover" /> : <Store className="w-4 h-4 opacity-30 text-[var(--text-muted)]" />}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-black text-[var(--text-main)] text-xs uppercase leading-tight pr-6">{item.producto.nombre} {item.variante && <span className="text-[var(--brand)]">({item.variante.nombre})</span>}</h4>
                                            {item.adicionales && item.adicionales.length > 0 && (
                                                <p className="text-[9px] text-green-600 dark:text-green-500 mt-0.5 font-bold">
                                                    + Extras: {item.adicionales.map(a => a.nombre).join(", ")}
                                                </p>
                                            )}
                                            {item.ingredientesRemovidos && item.ingredientesRemovidos.length > 0 && (
                                                <p className="text-[9px] text-red-500 mt-0.5 font-bold">
                                                    - Sin: {item.ingredientesRemovidos.join(", ")}
                                                </p>
                                            )}
                                            {item.notes && <p className="text-[9px] text-[var(--brand)] mt-0.5 font-bold italic line-clamp-1">"{item.notes}"</p>}
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center bg-[var(--bg-card)] rounded-md border border-[var(--border)] p-0.5">
                                                    <button onClick={() => actualizarCantidad(item.idUnico, -1)} className="w-5 h-5 flex items-center justify-center font-bold text-[10px] hover:bg-[var(--bg-hover)] text-[var(--text-main)] rounded-sm">-</button>
                                                    <span className="text-[10px] font-black w-5 text-center text-[var(--text-main)]">{item.cantidad}</span>
                                                    <button onClick={() => actualizarCantidad(item.idUnico, 1)} className="w-5 h-5 flex items-center justify-center font-bold text-[10px] hover:bg-[var(--bg-hover)] text-[var(--text-main)] rounded-sm">+</button>
                                                </div>
                                                <span className="font-black text-[var(--brand)] text-sm">${((item.precioFinal || item.producto.precio) * item.cantidad).toFixed(0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-main)] space-y-4 rounded-t-3xl shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)]">
                            <div className="flex justify-between items-end font-black text-[var(--text-main)]">
                                <span className="text-[10px] uppercase tracking-widest opacity-40">Total</span>
                                <span className="text-3xl text-[var(--brand)] tracking-tighter leading-none">${totalCarrito.toFixed(0)}</span>
                            </div>
                            {isClosed ? (
                                <button disabled className="w-full bg-red-500 text-white font-black py-3.5 rounded-xl text-xs opacity-70 cursor-not-allowed uppercase tracking-wider shadow-md">Tienda Cerrada</button>
                            ) : (
                                <button disabled={carrito.length === 0} onClick={() => { setIsCartOpen(false); setVistaActual("checkout"); window.scrollTo(0, 0); }} className="w-full bg-[var(--brand)] text-[var(--brand-text)] font-black py-3.5 rounded-xl text-xs disabled:opacity-30 hover:opacity-90 transition-all uppercase tracking-wider shadow-md">Finalizar Compra</button>
                            )}
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
}

// ----------------------------------------------------
// BENDITA BURGER MOCK DATA
// ----------------------------------------------------
const MOCK_NEGOCIO = {
    nombre: "Bendita Burger",
    color_principal: "#f5290f",
    tema_tienda: "light",
    plan: "premium",
    whatsapp: "5491133334444",
    red_instagram: "https://instagram.com/benditaburger",
    red_facebook: "https://facebook.com/benditaburger",
    red_tiktok: "https://tiktok.com/@benditaburger",
    horarios_activo: false,
    horario_apertura: "18:00",
    horario_cierre: "23:59",
    hero_imagen_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200&auto=format&fit=crop",
    hero_titulo: "Bendita Burger",
    hero_subtitulo: "Las mejores hamburguesas artesanales de la ciudad, hechas con ingredientes seleccionados.",
    hero_opacidad: 60,
    campos_formulario: {
        horarios: {
            activo: false,
            apertura: "18:00",
            cierre: "23:59"
        }
    }
};

const MOCK_CATEGORIAS = [];

const MOCK_PRODUCTOS = [];

export default function App() {
    const [negocio, setNegocio] = useState(MOCK_NEGOCIO);
    const [categorias, setCategorias] = useState(MOCK_CATEGORIAS);
    const [productos, setProductos] = useState(MOCK_PRODUCTOS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSupabaseData() {
            try {
                // Fetch negocio config
                const { data: negocioData, error: negocioError } = await supabase
                    .from('negocios')
                    .select('*')
                    .limit(1)
                    .maybeSingle();

                if (negocioData && !negocioError) {
                    setNegocio(negocioData);
                }

                // Fetch categories
                const { data: catData, error: catError } = await supabase
                    .from('categorias')
                    .select('*');

                if (catData && catData.length > 0 && !catError) {
                    setCategorias(catData);
                }

                // Fetch products
                const { data: prodData, error: prodError } = await supabase
                    .from('productos')
                    .select('*');

                if (prodData && prodData.length > 0 && !prodError) {
                    setProductos(prodData);
                }
            } catch (err) {
                console.warn("Failed fetching from Supabase database tables. Falling back to local mock data.", err);
            } finally {
                setLoading(false);
            }
        }
        fetchSupabaseData();
    }, []);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-[#050505] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#f5290f] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <PlantillaBull 
            negocio={negocio} 
            categorias={categorias} 
            productos={productos} 
        />
    );
}
