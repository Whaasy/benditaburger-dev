"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";
import { Plus, X, Image as ImageIcon, Trash2, Search, Edit2, AlertTriangle } from "lucide-react";

// FUNCIÓN EXPERTA: Convierte cualquier imagen a formato WEBP ultraligero
const convertirAWebp = (fileOrBlob) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(fileOrBlob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        resolve(new File([blob], "image.webp", { type: "image/webp" }));
      }, 'image/webp', 0.85); // 85% de calidad
    };
    img.onerror = reject;
  });
};

export default function ProductosPage() {
  const [negocio, setNegocio] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalCategoriaOpen, setModalCategoriaOpen] = useState(false);
  const [modalProductoOpen, setModalProductoOpen] = useState(false);

  // Estados para formularios
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    categoria_id: "",
    imagen: null, // Guardará el blob original de la foto
    tipo_producto: "normal",
    variantes_hamburguesa: {
      simple: { activo: false, precio: "" },
      doble: { activo: false, precio: "" },
      triple: { activo: false, precio: "" },
      x4: { activo: false, precio: "" }
    },
    adicionales: [],
    ingredientes_removibles_raw: ""
  });

  // Cropper states
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  // Edit / Delete states
  const [productoEditandoId, setProductoEditandoId] = useState(null);
  const [productoAEliminar, setProductoAEliminar] = useState(null);

  const [croppedImagePreview, setCroppedImagePreview] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState(null);

  const cargarDatos = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: neg } = await supabase
      .from("negocios")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (neg) {
      setNegocio(neg);

      const { data: cats } = await supabase
        .from("categorias")
        .select("*")
        .eq("negocio_id", neg.id)
        .order("created_at", { ascending: true });
      setCategorias(cats || []);

      const { data: prods } = await supabase
        .from("productos")
        .select("*")
        .eq("negocio_id", neg.id)
        .order("created_at", { ascending: false });
      setProductos(prods || []);

      if (cats && cats.length > 0) {
        setNuevoProducto(prev => ({ ...prev, categoria_id: cats[0].id }));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // No plan limits for custom single restaurant admin panel
  const limiteCategoriasAlcanzado = false;
  const limiteProductosAlcanzado = false;

  const handleCrearCategoria = async (e) => {
    e.preventDefault();
    if (limiteCategoriasAlcanzado) return;
    setLoadingAction(true);
    setErrorMensaje(null);
    const { error } = await supabase
      .from("categorias")
      .insert([{ negocio_id: negocio.id, nombre: nuevaCategoria }]);
    if (error) setErrorMensaje(error.message);
    else {
      setNuevaCategoria("");
      setModalCategoriaOpen(false);
      await cargarDatos();
    }
    setLoadingAction(false);
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      let imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setIsCropping(true);
    }
    e.target.value = null; // Reset
  };

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const showCroppedImage = async () => {
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      setCroppedImagePreview(URL.createObjectURL(croppedImageBlob));
      setNuevoProducto({ ...nuevoProducto, imagen: croppedImageBlob });
      setIsCropping(false);
    } catch (e) {
      console.error(e);
    }
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setImageSrc(null);
  };

  const handleCrearProducto = async (e) => {
    e.preventDefault();
    if (limiteProductosAlcanzado) return;
    setLoadingAction(true);
    setErrorMensaje(null);
    try {
      let imagen_url = null;
      if (nuevoProducto.imagen) {

        // 1. Convertimos a WEBP en vivo!
        const webpFile = await convertirAWebp(nuevoProducto.imagen);

        // 2. Le cambiamos la extensión a .webp
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
        const filePath = `${negocio.id}/${fileName}`;

        // 3. Lo subimos a Supabase con el contentType WEBP
        const { error: uploadError } = await supabase.storage
          .from('productos')
          .upload(filePath, webpFile, { contentType: 'image/webp' });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('productos')
          .getPublicUrl(filePath);
        imagen_url = publicUrlData.publicUrl;
      }

      // Construir array de variantes si es hamburguesa
      let variantesFinales = [];
      let precioFinal = parseFloat(nuevoProducto.precio) || 0;

      if (nuevoProducto.tipo_producto === "hamburguesa") {
        const activas = Object.entries(nuevoProducto.variantes_hamburguesa)
          .filter(([_, v]) => v.activo && v.precio)
          .map(([key, v]) => ({
            id: key,
            nombre: key.charAt(0).toUpperCase() + key.slice(1),
            precio: parseFloat(v.precio)
          }));
        
        if (activas.length > 0) {
          variantesFinales = activas;
          // El precio base del producto será el de la variante más barata
          precioFinal = Math.min(...activas.map(v => v.precio));
        }
      }

      // Construir adicionales e ingredientes removibles
      let adicionalesFinales = [];
      if (nuevoProducto.adicionales && Array.isArray(nuevoProducto.adicionales)) {
        adicionalesFinales = nuevoProducto.adicionales
          .filter(a => a.nombre.trim())
          .map(a => ({
            id: a.id || `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            nombre: a.nombre.trim(),
            precio: parseFloat(a.precio) || 0
          }));
      }

      let ingredientesFinales = [];
      if (nuevoProducto.ingredientes_removibles_raw) {
        ingredientesFinales = nuevoProducto.ingredientes_removibles_raw
          .split(",")
          .map(i => i.trim())
          .filter(i => i.length > 0);
      }

      if (productoEditandoId) {
        const { error: updateError } = await supabase
          .from("productos")
          .update({
            categoria_id: nuevoProducto.categoria_id,
            nombre: nuevoProducto.nombre,
            descripcion: nuevoProducto.descripcion,
            precio: precioFinal,
            ...(imagen_url ? { imagen_url } : {}),
            tipo_producto: nuevoProducto.tipo_producto,
            variantes: variantesFinales,
            adicionales: adicionalesFinales,
            ingredientes_removibles: ingredientesFinales
          })
          .eq("id", productoEditandoId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("productos")
          .insert([{
            negocio_id: negocio.id,
            categoria_id: nuevoProducto.categoria_id,
            nombre: nuevoProducto.nombre,
            descripcion: nuevoProducto.descripcion,
            precio: precioFinal,
            imagen_url: imagen_url,
            tipo_producto: nuevoProducto.tipo_producto,
            variantes: variantesFinales,
            adicionales: adicionalesFinales,
            ingredientes_removibles: ingredientesFinales
          }]);

        if (insertError) throw insertError;
      }

      setNuevoProducto({
        nombre: "",
        descripcion: "",
        precio: "",
        categoria_id: categorias[0]?.id || "",
        imagen: null,
        tipo_producto: "normal",
        variantes_hamburguesa: {
          simple: { activo: false, precio: "" },
          doble: { activo: false, precio: "" },
          triple: { activo: false, precio: "" },
          x4: { activo: false, precio: "" }
        },
        adicionales: [],
        ingredientes_removibles_raw: ""
      });
      setCroppedImagePreview(null);
      setImageSrc(null);
      setModalProductoOpen(false);
      setProductoEditandoId(null);
      await cargarDatos();
    } catch (err) {
      setErrorMensaje(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const abrirModalEdicion = (prod) => {
    let variantes_hamburguesa = {
      simple: { activo: false, precio: "" },
      doble: { activo: false, precio: "" },
      triple: { activo: false, precio: "" },
      x4: { activo: false, precio: "" }
    };
    if (prod.tipo_producto === "hamburguesa" && prod.variantes) {
      prod.variantes.forEach(v => {
        const key = v.id.toLowerCase();
        if (variantes_hamburguesa[key] !== undefined) {
          variantes_hamburguesa[key] = { activo: true, precio: v.precio };
        }
      });
    }

    let adicionales = [];
    if (prod.adicionales && Array.isArray(prod.adicionales)) {
      adicionales = prod.adicionales;
    }

    let rawIng = "";
    if (prod.ingredientes_removibles && Array.isArray(prod.ingredientes_removibles)) {
      rawIng = prod.ingredientes_removibles.join(", ");
    }

    setNuevoProducto({
      nombre: prod.nombre,
      descripcion: prod.descripcion || "",
      precio: prod.precio,
      categoria_id: prod.categoria_id,
      imagen: null,
      tipo_producto: prod.tipo_producto || "normal",
      variantes_hamburguesa,
      adicionales,
      ingredientes_removibles_raw: rawIng
    });
    setCroppedImagePreview(prod.imagen_url);
    setProductoEditandoId(prod.id);
    setModalProductoOpen(true);
  };

  const handleEliminarProducto = (id) => {
    setProductoAEliminar(id);
  };

  const confirmarEliminarProducto = async () => {
    if (!productoAEliminar) return;
    setLoadingAction(true);
    try {
      await supabase.from("productos").delete().eq("id", productoAEliminar);
      setProductoAEliminar(null);
      await cargarDatos();
    } catch (err) {
      setErrorMensaje(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="w-8 h-8 border-4 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {errorMensaje && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-xl text-sm font-medium flex items-center gap-2">
          <X className="w-4 h-4 cursor-pointer" onClick={() => setErrorMensaje(null)} />
          {errorMensaje}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Menú y Variedades</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona tu menú. Tienes {productos.length} variedades en total.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setModalCategoriaOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-[#0F0F11] text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors text-sm border border-gray-200 dark:border-neutral-700 shadow-sm cursor-pointer"
          >
            Nueva Categoría
          </button>

          <button
            onClick={() => {
              setProductoEditandoId(null);
              setNuevoProducto({
                nombre: "",
                descripcion: "",
                precio: "",
                categoria_id: categorias[0]?.id || "",
                imagen: null,
                tipo_producto: "normal",
                variantes_hamburguesa: {
                  simple: { activo: false, precio: "" },
                  doble: { activo: false, precio: "" },
                  triple: { activo: false, precio: "" },
                  x4: { activo: false, precio: "" }
                },
                adicionales: [],
                ingredientes_removibles_raw: ""
              });
              setCroppedImagePreview(null);
              setModalProductoOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-black rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Agregar Producto
          </button>
        </div>
      </div>

      {/* LISTADO DE PRODUCTOS (TABLA SAAS) */}
      <div className="bg-white dark:bg-[#0F0F11] rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden">
        {productos.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-neutral-700">
              <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No hay variedades</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">Aún no has añadido variedades a tu menú. Crea tu primera categoría y añade una variedad para comenzar.</p>
            <button
              onClick={() => setModalProductoOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" /> Añadir el primero
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-neutral-900/50 border-b border-gray-200 dark:border-neutral-800">
                  <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Foto</th>
                  <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detalles de la Variedad</th>
                  <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoría</th>
                  <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Precio</th>
                  <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {productos.map((prod) => {
                  const catNombre = categorias.find(c => c.id === prod.categoria_id)?.nombre || "Sin categoría";
                  return (
                    <tr key={prod.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors group">
                      <td className="py-4 px-6">
                        {prod.imagen_url ? (
                          <img src={prod.imagen_url} alt={prod.nombre} className="w-10 h-10 rounded-md object-cover border border-gray-200 dark:border-neutral-700 shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-gray-400 border border-gray-200 dark:border-neutral-700 shadow-sm">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{prod.nombre}</p>
                        {prod.descripcion && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[250px] mt-0.5">{prod.descripcion}</p>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300 border border-gray-200 dark:border-neutral-700">
                          {catNombre}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">${prod.precio}</span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => abrirModalEdicion(prod)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEliminarProducto(prod.id)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL NUEVA CATEGORÍA */}
      {modalCategoriaOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F0F11] rounded-xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden transform transition-all">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-neutral-800">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Nueva Categoría</h3>
              <button onClick={() => setModalCategoriaOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md p-1 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 bg-gray-50/50 dark:bg-neutral-900/20">
              <form onSubmit={handleCrearCategoria} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de la categoría</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Hamburguesas, Bebidas..."
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1E] border border-gray-300 dark:border-neutral-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModalCategoriaOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">Cancelar</button>
                  <button type="submit" disabled={loadingAction} className="px-4 py-2 text-sm font-medium bg-gray-900 text-white dark:bg-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors shadow-sm">
                    {loadingAction ? "Guardando..." : "Crear categoría"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PRODUCTO */}
      {modalProductoOpen && !isCropping && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F0F11] rounded-xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-neutral-800">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{productoEditandoId ? "Editar Variedad" : "Añadir Variedad"}</h3>
              <button onClick={() => { setModalProductoOpen(false); setCroppedImagePreview(null); setImageSrc(null); setNuevoProducto({ ...nuevoProducto, imagen: null }); setProductoEditandoId(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto bg-gray-50/50 dark:bg-neutral-900/20">
              {categorias.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Debes crear una categoría primero para poder añadir variedades.</p>
                  <button onClick={() => { setModalProductoOpen(false); setModalCategoriaOpen(true) }} className="px-4 py-2 text-sm font-medium bg-gray-900 text-white dark:bg-white dark:text-black rounded-lg">Crear Categoría</button>
                </div>
              ) : (
                <form id="product-form" onSubmit={handleCrearProducto} className="space-y-5">
                  <div className="flex gap-5 items-start">
                    <div className="relative w-24 h-24 shrink-0 rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-700 flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-[#1A1A1E] hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group cursor-pointer">
                      {croppedImagePreview ? (
                        <>
                          <img src={croppedImagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-medium">Cambiar</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center p-2 text-center">
                          <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-[10px] text-gray-500 font-medium">Subir 1:1</span>
                        </div>
                      )}
                      <input id="imagen_producto" type="file" accept="image/*" onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                        <input type="text" required value={nuevoProducto.nombre} onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1E] border border-gray-300 dark:border-neutral-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm" placeholder="Ej: Hamburguesa Clásica" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Producto</label>
                      <select required value={nuevoProducto.tipo_producto} onChange={(e) => setNuevoProducto({ ...nuevoProducto, tipo_producto: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1E] border border-gray-300 dark:border-neutral-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm">
                        <option value="normal">Normal</option>
                        <option value="hamburguesa">Hamburguesa (con variantes)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoría</label>
                      <select required value={nuevoProducto.categoria_id} onChange={(e) => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1E] border border-gray-300 dark:border-neutral-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm">
                        {categorias.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {nuevoProducto.tipo_producto === "hamburguesa" ? (
                    <div className="space-y-3 bg-gray-50 dark:bg-[#1A1A1E] p-4 rounded-xl border border-gray-200 dark:border-neutral-700">
                      <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1">Variantes de Hamburguesa</label>
                      {['simple', 'doble', 'triple', 'x4'].map((variedad) => (
                        <div key={variedad} className="flex items-center gap-3">
                          <label className="flex items-center gap-2 flex-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={nuevoProducto.variantes_hamburguesa[variedad].activo}
                              onChange={(e) => setNuevoProducto({
                                ...nuevoProducto,
                                variantes_hamburguesa: {
                                  ...nuevoProducto.variantes_hamburguesa,
                                  [variedad]: { ...nuevoProducto.variantes_hamburguesa[variedad], activo: e.target.checked }
                                }
                              })}
                              className="w-4 h-4 rounded border-gray-300 text-black dark:text-white focus:ring-black dark:focus:ring-white"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{variedad}</span>
                          </label>
                          <div className="flex-1">
                            {nuevoProducto.variantes_hamburguesa[variedad].activo && (
                              <input
                                type="number"
                                required
                                placeholder="Precio ($)"
                                value={nuevoProducto.variantes_hamburguesa[variedad].precio}
                                onChange={(e) => setNuevoProducto({
                                  ...nuevoProducto,
                                  variantes_hamburguesa: {
                                    ...nuevoProducto.variantes_hamburguesa,
                                    [variedad]: { ...nuevoProducto.variantes_hamburguesa[variedad], precio: e.target.value }
                                  }
                                })}
                                className="w-full px-3 py-1.5 bg-white dark:bg-[#0F0F11] border border-gray-300 dark:border-neutral-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-gray-500 mt-2 italic">* El precio principal del producto se ajustará automáticamente al de la variante más barata.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Precio ($)</label>
                      <input type="number" step="0.01" required value={nuevoProducto.precio} onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1E] border border-gray-300 dark:border-neutral-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm" placeholder="0.00" />
                    </div>
                  )}


                  {/* SECCIÓN ADICIONALES */}
                  <div className="space-y-3 bg-gray-50 dark:bg-[#1A1A1E] p-4 rounded-xl border border-gray-200 dark:border-neutral-700">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-bold text-gray-900 dark:text-white">Adicionales / Extras (Suman al precio)</label>
                      <button
                        type="button"
                        onClick={() => setNuevoProducto({
                          ...nuevoProducto,
                          adicionales: [...(nuevoProducto.adicionales || []), { id: Date.now().toString(), nombre: "", precio: "" }]
                        })}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        + Agregar Extra
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(nuevoProducto.adicionales || []).map((ad, idx) => (
                        <div key={ad.id || idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            required
                            placeholder="Nombre (ej: Cheddar)"
                            value={ad.nombre}
                            onChange={(e) => {
                              const newAds = [...nuevoProducto.adicionales];
                              newAds[idx].nombre = e.target.value;
                              setNuevoProducto({ ...nuevoProducto, adicionales: newAds });
                            }}
                            className="flex-2 w-full px-3 py-1.5 bg-white dark:bg-[#0F0F11] border border-gray-300 dark:border-neutral-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm"
                          />
                          <input
                            type="number"
                            required
                            placeholder="Precio ($)"
                            value={ad.precio}
                            onChange={(e) => {
                              const newAds = [...nuevoProducto.adicionales];
                              newAds[idx].precio = e.target.value;
                              setNuevoProducto({ ...nuevoProducto, adicionales: newAds });
                            }}
                            className="flex-1 w-full px-3 py-1.5 bg-white dark:bg-[#0F0F11] border border-gray-300 dark:border-neutral-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setNuevoProducto({
                              ...nuevoProducto,
                              adicionales: nuevoProducto.adicionales.filter((_, i) => i !== idx)
                            })}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SECCIÓN INGREDIENTES REMOVIBLES */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Ingredientes que el cliente puede retirar (separados por comas)
                    </label>
                    <input
                      type="text"
                      value={nuevoProducto.ingredientes_removibles_raw || ""}
                      onChange={(e) => setNuevoProducto({ ...nuevoProducto, ingredientes_removibles_raw: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1E] border border-gray-300 dark:border-neutral-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm"
                      placeholder="Ej: Cebolla, Tomate, Lechuga, Aderezos"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                    <textarea rows="3" value={nuevoProducto.descripcion} onChange={(e) => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1E] border border-gray-300 dark:border-neutral-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm resize-none" placeholder="Ingredientes y detalles del producto..."></textarea>
                  </div>
                </form>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-neutral-800 bg-white dark:bg-[#0F0F11] flex justify-end gap-3">
              <button type="button" onClick={() => setModalProductoOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">Cancelar</button>
              <button type="submit" form="product-form" disabled={loadingAction || categorias.length === 0 || limiteProductosAlcanzado} className="px-5 py-2 text-sm font-medium bg-gray-900 text-white dark:bg-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors shadow-sm">
                {loadingAction ? "Guardando..." : "Guardar producto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CROPPER DE IMAGEN */}
      {isCropping && imageSrc && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col">
          <div className="flex justify-between items-center p-4 text-white">
            <h3 className="font-semibold">Ajustar imagen</h3>
            <button onClick={cancelCrop} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="relative flex-1">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              objectFit="contain"
            />
          </div>
          <div className="p-6 flex flex-col gap-6 w-full max-w-md mx-auto">
            <div className="flex items-center gap-4 text-white">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Zoom</span>
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(e.target.value)} className="w-full accent-white" />
            </div>
            <div className="flex gap-3">
              <button onClick={cancelCrop} className="flex-1 py-2.5 px-4 rounded-lg font-medium bg-white/10 text-white hover:bg-white/20 transition-colors text-sm">Cancelar</button>
              <button onClick={showCroppedImage} className="flex-1 py-2.5 px-4 rounded-lg font-medium bg-white text-black hover:bg-gray-200 transition-colors text-sm">Aplicar recorte</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR PRODUCTO */}
      {productoAEliminar && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F0F11] rounded-xl w-full max-w-sm shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden transform transition-all text-center p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-500 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">¿Eliminar producto?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Esta acción no se puede deshacer. El producto desaparecerá inmediatamente de tu tienda.</p>
            <div className="flex gap-3">
              <button onClick={() => setProductoAEliminar(null)} className="flex-1 py-2.5 px-4 rounded-lg font-medium bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors text-sm">Cancelar</button>
              <button onClick={confirmarEliminarProducto} disabled={loadingAction} className="flex-1 py-2.5 px-4 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors text-sm disabled:opacity-50">
                {loadingAction ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}