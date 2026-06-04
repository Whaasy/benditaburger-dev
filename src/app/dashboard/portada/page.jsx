"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";
import { Check, CheckCircle2, AlertCircle, Image as ImageIcon, Upload, Eye, Type, ShoppingCart, Store, Search } from "lucide-react";

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

// Converts uploaded image to lightweight WEBP format
const convertirAWebp = (fileOrBlob, filename = "image.webp") => {
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
        resolve(new File([blob], filename, { type: "image/webp" }));
      }, 'image/webp', 0.85);
    };
    img.onerror = reject;
  });
};

export default function PortadaConfigPage() {
  const router = useRouter();
  const [negocio, setNegocio] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  // Hero state fields
  const [heroTitulo, setHeroTitulo] = useState("");
  const [heroSubtitulo, setHeroSubtitulo] = useState("");
  const [heroImagenUrl, setHeroImagenUrl] = useState("");
  const [heroOpacidad, setHeroOpacidad] = useState(60);

  // Navbar branding state fields
  const [navbarType, setNavbarType] = useState("texto"); // "texto" | "logo"
  const [logoUrl, setLogoUrl] = useState("");
  const [logoSize, setLogoSize] = useState(70);

  // File Upload & Cropper state
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropType, setCropType] = useState("hero"); // "hero" | "logo"
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase
          .from("negocios")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setNegocio(data);
          setHeroTitulo(data.hero_titulo || "");
          setHeroSubtitulo(data.hero_subtitulo || "");
          setHeroImagenUrl(data.hero_imagen_url || "");
          setHeroOpacidad(data.hero_opacidad !== null && data.hero_opacidad !== undefined ? data.hero_opacidad : 60);

          // Parse navbar logo details from serialized tema_tienda column
          try {
            if (data.tema_tienda && data.tema_tienda.startsWith('{')) {
              const configObj = JSON.parse(data.tema_tienda);
              setNavbarType(configObj.navbar_type || "texto");
              setLogoUrl(configObj.logo_url || "");
              setLogoSize(configObj.logo_size || 70);
            } else {
              setNavbarType("texto");
              setLogoUrl("");
              setLogoSize(70);
            }
          } catch (e) {
            setNavbarType("texto");
            setLogoUrl("");
            setLogoSize(70);
          }
        }
      } catch (error) {
        console.error("Error loading configs:", error);
      } finally {
        setCargando(false);
      }
    }

    cargarDatos();
  }, [router]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleOpenFilePicker = (type) => {
    setCropType(type);
    const fileInput = document.getElementById(type === "hero" ? "hero-file-picker" : "logo-file-picker");
    if (fileInput) fileInput.click();
  };

  const onFileChange = async (e, type) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setCropType(type);
        setImageSrc(reader.result);
        setIsCropping(true);
      });
      reader.readAsDataURL(file);
    }
    e.target.value = null; // reset
  };

  const uploadCroppedImage = async () => {
    setSubiendoImagen(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const webpFile = await convertirAWebp(croppedImageBlob, cropType === "hero" ? "hero.webp" : "logo.webp");

      const prefix = cropType === "hero" ? "hero" : "logo";
      const fileName = `${prefix}-${Date.now()}.webp`;
      const filePath = `${negocio.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(filePath, webpFile, { contentType: 'image/webp' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('productos')
        .getPublicUrl(filePath);

      if (cropType === "hero") {
        setHeroImagenUrl(publicUrlData.publicUrl);
        setMensaje({ tipo: "exito", texto: "Fondo de portada listo para guardar." });
      } else {
        setLogoUrl(publicUrlData.publicUrl);
        setMensaje({ tipo: "exito", texto: "Logo del negocio listo para guardar." });
      }
      
      setIsCropping(false);
      setImageSrc(null);
      setTimeout(() => setMensaje({ tipo: "", texto: "" }), 3000);
    } catch (e) {
      console.error(e);
      setMensaje({ tipo: "error", texto: "Error al subir la imagen procesada." });
    } finally {
      setSubiendoImagen(false);
    }
  };

  const handleGuardarCambios = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje({ tipo: "", texto: "" });

    try {
      // Keep existing theme (light/dark) when updating tema_tienda configurations
      let currentTheme = 'light';
      try {
        if (negocio.tema_tienda && negocio.tema_tienda.startsWith('{')) {
          const configObj = JSON.parse(negocio.tema_tienda);
          currentTheme = configObj.theme || 'light';
        } else {
          currentTheme = negocio.tema_tienda === 'dark' ? 'dark' : 'light';
        }
      } catch (e) {}

      const newTemaTiendaConfig = JSON.stringify({
        theme: currentTheme,
        navbar_type: navbarType,
        logo_url: logoUrl,
        logo_size: parseInt(logoSize, 10)
      });

      const { error } = await supabase
        .from("negocios")
        .update({ 
          hero_titulo: heroTitulo,
          hero_subtitulo: heroSubtitulo,
          hero_imagen_url: heroImagenUrl,
          hero_opacidad: parseInt(heroOpacidad, 10),
          tema_tienda: newTemaTiendaConfig
        })
        .eq("id", negocio.id);

      if (error) throw error;

      setMensaje({ tipo: "exito", texto: "Portada y cabecera actualizadas correctamente." });
      
      setNegocio({ 
        ...negocio, 
        hero_titulo: heroTitulo,
        hero_subtitulo: heroSubtitulo,
        hero_imagen_url: heroImagenUrl,
        hero_opacidad: parseInt(heroOpacidad, 10),
        tema_tienda: newTemaTiendaConfig
      });

      // Dispatch event to update layout business details immediately
      window.dispatchEvent(new CustomEvent("negocio-actualizado", {
        detail: { 
          hero_titulo: heroTitulo,
          hero_subtitulo: heroSubtitulo,
          hero_imagen_url: heroImagenUrl,
          hero_opacidad: parseInt(heroOpacidad, 10),
          tema_tienda: newTemaTiendaConfig
        }
      }));

      setTimeout(() => setMensaje({ tipo: "", texto: "" }), 5000);
    } catch (error) {
      console.error(error);
      setMensaje({ tipo: "error", texto: "Hubo un error al guardar los cambios." });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return (
    <div className="flex items-center justify-center p-20">
      <div className="w-8 h-8 border-4 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // Parse theme and brand color configuration from negocio
  let isDark = false;
  try {
    if (negocio?.tema_tienda && negocio.tema_tienda.startsWith('{')) {
      const configObj = JSON.parse(negocio.tema_tienda);
      isDark = configObj.theme === 'dark';
    } else {
      isDark = negocio?.tema_tienda === 'dark';
    }
  } catch (e) {
    isDark = negocio?.tema_tienda === 'dark';
  }

  const brandColor = negocio?.color_principal || '#EAB308';
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Diseño del Catálogo</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Personaliza la cabecera (Navbar) y el banner principal (Hero) de tu tienda online.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA FORMULARIOS */}
        <form onSubmit={handleGuardarCambios} className="lg:col-span-7 space-y-6">
          
          {/* SECCIÓN 1: CABECERA / NAVBAR (LOGO O NOMBRE) */}
          <section className="bg-white dark:bg-[#0F0F11] rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-3">
              Cabecera de la Tienda (Navbar)
            </h2>
            
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Identificación de Marca en el Navbar
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNavbarType("texto")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-bold transition-all ${navbarType === "texto" ? "border-red-500 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400" : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#1A1A1E] text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
                >
                  <Type className="w-4 h-4" /> Nombre en Texto
                </button>
                <button
                  type="button"
                  onClick={() => setNavbarType("logo")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-bold transition-all ${navbarType === "logo" ? "border-red-500 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400" : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#1A1A1E] text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
                >
                  <ImageIcon className="w-4 h-4" /> Imagen de Logo
                </button>
              </div>
            </div>

            {navbarType === "logo" && (
              <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-1">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Logo del Negocio
                </label>
                
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => handleOpenFilePicker("logo")}
                    className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-xl p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-900/50 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Subir Logo (.webp, .png, .jpg)</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Se recortará en formato cuadrado</span>
                  </button>
                  
                  <input
                    id="logo-file-picker"
                    type="file"
                    accept="image/*"
                    onChange={(e) => onFileChange(e, "logo")}
                    className="hidden"
                  />
                </div>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-gray-200 dark:border-neutral-800"></div>
                  <span className="flex-shrink mx-4 text-xs font-bold text-gray-400">o pega enlace directo</span>
                  <div className="flex-grow border-t border-gray-200 dark:border-neutral-800"></div>
                </div>

                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej: https://images.unsplash.com/logo..."
                />

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <span>Tamaño del Logo (Altura)</span>
                    <span className="font-bold text-red-600">{logoSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    value={logoSize}
                    onChange={(e) => setLogoSize(parseInt(e.target.value, 10))}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </section>

          {/* SECCIÓN 2: PORTADA DE BANNER (HERO) */}
          <section className="bg-white dark:bg-[#0F0F11] rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-3">
              Banner Principal (Hero)
            </h2>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Título del Hero
              </label>
              <input
                type="text"
                value={heroTitulo}
                onChange={(e) => setHeroTitulo(e.target.value)}
                className="w-full bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ej: Bendita Burger"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Subtítulo / Eslogan del Hero
              </label>
              <textarea
                value={heroSubtitulo}
                onChange={(e) => setHeroSubtitulo(e.target.value)}
                rows={2}
                className="w-full bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                placeholder="Ej: Las mejores hamburguesas artesanales..."
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Imagen de Fondo
              </label>
              
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => handleOpenFilePicker("hero")}
                  className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-xl p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-900/50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Subir nueva foto de fondo</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">Se recortará en formato panorámico (16:9)</span>
                </button>
                
                <input
                  id="hero-file-picker"
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileChange(e, "hero")}
                  className="hidden"
                />
              </div>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-gray-200 dark:border-neutral-800"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-gray-400">o pega enlace directo</span>
                <div className="flex-grow border-t border-gray-200 dark:border-neutral-800"></div>
              </div>

              <input
                type="text"
                value={heroImagenUrl}
                onChange={(e) => setHeroImagenUrl(e.target.value)}
                className="w-full bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ej: https://images.unsplash.com/photo-..."
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300">
                <span>Opacidad del Filtro Oscuro</span>
                <span className="font-bold text-red-600">{heroOpacidad}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={heroOpacidad}
                onChange={(e) => setHeroOpacidad(e.target.value)}
                className="w-full accent-red-600 cursor-pointer"
              />
            </div>
          </section>

          <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
            {mensaje.texto && (
              <div className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md animate-in fade-in ${mensaje.tipo === "exito" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
                {mensaje.tipo === "exito" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {mensaje.texto}
              </div>
            )}
            <button
              type="submit"
              disabled={guardando}
              className="bg-gray-900 text-white dark:bg-white dark:text-black font-bold py-3 px-8 rounded-xl text-sm transition-all hover:bg-gray-800 dark:hover:bg-gray-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer font-sans"
            >
              {guardando ? (
                <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Check className="w-4 h-4" />
              )}
              {guardando ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>

        {/* COLUMNA VISTA PREVIA (DINÁMICA) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> Vista Previa en Vivo
          </h3>

          <div style={themeStyles} className="sticky top-24 rounded-2xl overflow-hidden shadow-xl border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300">
            
            {/* Simulación Navbar */}
            <div className="bg-[var(--bg-main)]/90 backdrop-blur-xl px-4 py-2.5 flex items-center justify-between border-b border-[var(--border)]">
              <div></div> {/* Espacio izquierdo para centrar el buscador */}
              
              {/* Buscador centrado */}
              <div className="flex-1 max-w-[150px] mx-auto relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-[var(--text-muted)]" />
                <div className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] text-[8px] font-medium rounded-md pl-7 pr-2 py-1 select-none">
                  Buscar producto...
                </div>
              </div>

              {/* Botón Carrito en la derecha */}
              <div className="relative flex items-center justify-center w-6 h-6 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)]">
                <ShoppingCart className="w-3 h-3" />
              </div>
            </div>

            {/* Simulación Hero Banner */}
            <div className="relative w-full min-h-[180px] py-8 bg-[var(--bg-card)] border-b border-[var(--border)] overflow-hidden shrink-0 flex flex-col items-center justify-center text-center p-4">
              {heroImagenUrl ? (
                <img
                  src={heroImagenUrl}
                  alt="Portada Preview"
                  className="absolute inset-0 w-full h-full object-cover transition-all"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-neutral-600 animate-pulse" />
                </div>
              )}
              
              <div
                className="absolute inset-0 bg-black transition-opacity duration-300"
                style={{ opacity: heroOpacidad / 100 }}
              />

              <div className="relative z-10 flex flex-col items-center justify-center w-full">
                {navbarType === "logo" && logoUrl && (
                  <img src={logoUrl} alt="Logo Preview" style={{ height: `${logoSize}px` }} className="w-auto object-contain mb-3 drop-shadow-md transition-transform hover:scale-105" />
                )}
                <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight leading-tight drop-shadow-md mb-1.5">
                  {heroTitulo || negocio?.nombre || "Bendita Burger"}
                </h2>
                {heroSubtitulo ? (
                  <p className="text-white/90 text-[10px] md:text-xs font-medium max-w-xs mx-auto drop-shadow-sm leading-relaxed mb-3">
                    {heroSubtitulo}
                  </p>
                ) : (
                  <p className="text-white/50 text-[10px] italic mb-3">
                    Sin subtítulo / eslogan
                  </p>
                )}

                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-red-500/50 bg-red-500/20 text-[8px] font-black uppercase tracking-widest text-red-400 backdrop-blur-md">
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span> Cerrado
                </div>
              </div>
            </div>
            
            {/* Simulación del Catálogo / Productos con Layout de Dos Columnas (Sidebar + Grilla) */}
            <div className="p-4 bg-[var(--bg-main)] flex gap-4 min-h-[220px]">
              
              {/* Sidebar de Categorías */}
              <aside className="w-24 shrink-0 flex flex-col gap-1.5 text-[8px] text-left select-none">
                <h3 className="text-[6px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 px-1">Menú Principal</h3>
                
                <div className="flex items-center gap-1 px-2 py-1 bg-[var(--brand)] text-[var(--brand-text)] rounded-md font-bold transition-all shadow-sm">
                  <Store className="w-2.5 h-2.5 shrink-0" />
                  <span>Todos</span>
                </div>
                
                <div className="flex items-center gap-1.5 px-2 py-0.5 text-[var(--text-muted)] font-bold">
                  <div className="w-1 h-1 rounded-full bg-[var(--brand)]"></div>
                  <span>Hamburguesas</span>
                </div>
                
                <div className="flex items-center gap-1.5 px-2 py-0.5 text-[var(--text-muted)] font-bold">
                  <div className="w-1 h-1 rounded-full bg-[var(--brand)]"></div>
                  <span>Burgers</span>
                </div>
              </aside>

              {/* Grilla de Productos */}
              <main className="flex-1">
                <div className="grid grid-cols-2 gap-3 text-left">
                  
                  {/* Producto 1 (Sin imagen) */}
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-2.5 flex flex-col justify-between h-full shadow-sm hover:shadow-md transition-all">
                    <div className="relative w-full aspect-square bg-[var(--bg-hover)] overflow-hidden rounded-xl border-b border-[var(--border)] shrink-0 flex items-center justify-center mb-2">
                      <Store className="w-5 h-5 text-[var(--text-muted)] opacity-20" />
                    </div>
                    <div className="text-[8px] font-black uppercase text-[var(--text-main)] truncate leading-tight mb-0.5">Clasica</div>
                    <div className="text-[6px] text-[var(--text-muted)] truncate leading-tight mb-2.5">Sin descripción</div>
                    
                    <button type="button" className="w-full py-1 px-1.5 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] text-[7px] font-black uppercase flex justify-between items-center border border-[var(--brand-soft)]">
                      <span>Agregar</span>
                      <span>$1</span>
                    </button>
                  </div>

                  {/* Producto 2 (Con silueta/imagen) */}
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-2.5 flex flex-col justify-between h-full shadow-sm hover:shadow-md transition-all">
                    <div className="relative w-full aspect-square bg-[var(--bg-hover)] overflow-hidden rounded-xl border-b border-[var(--border)] shrink-0 flex items-center justify-center mb-2">
                      <svg className="w-8 h-8 text-[var(--text-muted)] opacity-25" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                      </svg>
                    </div>
                    <div className="text-[8px] font-black uppercase text-[var(--text-main)] truncate leading-tight mb-0.5">Clasica</div>
                    <div className="text-[6px] text-[var(--text-muted)] truncate leading-tight mb-2.5">Cebolla, Tomate</div>
                    
                    <button type="button" className="w-full py-1 px-1.5 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] text-[7px] font-black uppercase flex justify-between items-center border border-[var(--brand-soft)]">
                      <span>Agregar</span>
                      <span>$1</span>
                    </button>
                  </div>

                </div>
              </main>

            </div>

            {/* Simulación de Footer Rojo */}
            <div className="bg-[#f5290f] py-4 px-4 flex flex-col gap-3 border-t border-white/10 text-white text-[8px] font-bold uppercase tracking-wider">
              <div className="flex justify-between items-center">
                {/* Nombre de la marca */}
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"></div>
                  <span className="font-black tracking-tight">{negocio?.nombre || "Bendita Burger"}</span>
                </div>

                {/* Contacto WhatsApp */}
                <div className="flex flex-col items-center gap-1 select-none">
                  <span className="text-[6px] text-white/70">Contacto</span>
                  <div className="bg-white/10 px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1 text-[6px] text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    <span>WhatsApp</span>
                  </div>
                </div>

                {/* Redes Sociales */}
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[6px] text-white/70 font-bold uppercase">Redes Sociales</span>
                  <div className="w-3 h-3 bg-white/10 rounded flex items-center justify-center text-[5px] border border-white/10">📸</div>
                </div>
              </div>

              <div className="text-center text-white/50 text-[6px] font-medium pt-2 border-t border-white/10">
                &copy; {new Date().getFullYear()} {negocio?.nombre || "Bendita Burger"}.
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL RECORTE DE IMAGEN GENERAL */}
      {isCropping && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 animate-fade-in">
          <div className="flex items-center justify-between px-6 py-4 bg-[#0a0a0a] border-b border-neutral-800 text-white">
            <div>
              <h3 className="font-bold text-lg">Recortar {cropType === "hero" ? "Imagen de Portada" : "Imagen de Logo"}</h3>
              <p className="text-xs text-neutral-400">Ajusta el encuadre para optimizar la visualización.</p>
            </div>
            <button
              onClick={() => { setIsCropping(false); setImageSrc(null); }}
              className="px-4 py-2 text-xs font-bold bg-neutral-800 hover:bg-neutral-700 rounded-lg"
            >
              Cancelar
            </button>
          </div>

          <div className="relative flex-1 bg-black">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={cropType === "hero" ? 16 / 9 : 1 / 1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          <div className="p-6 bg-[#0a0a0a] border-t border-neutral-800 flex flex-col gap-4 text-white">
            <div className="flex items-center gap-4 max-w-xs mx-auto w-full">
              <span className="text-xs text-neutral-400">Zoom</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-label="Zoom"
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full flex-1 accent-red-600 cursor-pointer"
              />
            </div>
            <div className="flex justify-center">
              <button
                onClick={uploadCroppedImage}
                disabled={subiendoImagen}
                className="bg-white hover:bg-gray-100 text-black font-bold py-3 px-8 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {subiendoImagen ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Procesando y Subiendo...
                  </>
                ) : (
                  "Confirmar y Guardar Foto"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
