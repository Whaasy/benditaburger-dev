"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";
import { Check, CheckCircle2, AlertCircle, Image as ImageIcon, Upload, Eye } from "lucide-react";

// Converts uploaded image to lightweight WEBP format
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
        resolve(new File([blob], "hero.webp", { type: "image/webp" }));
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

  // File Upload & Cropper state
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
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
        }
      } catch (error) {
        console.error("Error loading hero configurations:", error);
      } finally {
        setCargando(false);
      }
    }

    cargarDatos();
  }, [router]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
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
      const webpFile = await convertirAWebp(croppedImageBlob);

      const fileName = `hero-${Date.now()}.webp`;
      const filePath = `${negocio.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(filePath, webpFile, { contentType: 'image/webp' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('productos')
        .getPublicUrl(filePath);

      setHeroImagenUrl(publicUrlData.publicUrl);
      setIsCropping(false);
      setImageSrc(null);
      setMensaje({ tipo: "exito", texto: "Imagen recortada y lista para guardar." });
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
      const { error } = await supabase
        .from("negocios")
        .update({ 
          hero_titulo: heroTitulo,
          hero_subtitulo: heroSubtitulo,
          hero_imagen_url: heroImagenUrl,
          hero_opacidad: parseInt(heroOpacidad, 10)
        })
        .eq("id", negocio.id);

      if (error) throw error;

      setMensaje({ tipo: "exito", texto: "Portada del catálogo actualizada correctamente." });
      setNegocio({ 
        ...negocio, 
        hero_titulo: heroTitulo,
        hero_subtitulo: heroSubtitulo,
        hero_imagen_url: heroImagenUrl,
        hero_opacidad: parseInt(heroOpacidad, 10)
      });

      // Dispatch event to update layout business header details immediately if listening
      window.dispatchEvent(new CustomEvent("negocio-actualizado", {
        detail: { 
          hero_titulo: heroTitulo,
          hero_subtitulo: heroSubtitulo,
          hero_imagen_url: heroImagenUrl,
          hero_opacidad: parseInt(heroOpacidad, 10)
        }
      }));

      setTimeout(() => setMensaje({ tipo: "", texto: "" }), 5000);
    } catch (error) {
      console.error(error);
      setMensaje({ tipo: "error", texto: "Hubo un error al guardar la portada." });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return (
    <div className="flex items-center justify-center p-20">
      <div className="w-8 h-8 border-4 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portada del Catálogo</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Personaliza el título principal, el eslogan y la imagen de fondo de la portada de tu tienda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* FORMULARIO */}
        <form onSubmit={handleGuardarCambios} className="lg:col-span-3 space-y-6">
          <section className="bg-white dark:bg-[#0F0F11] rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Título del Catálogo
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
                Subtítulo / Eslogan
              </label>
              <textarea
                value={heroSubtitulo}
                onChange={(e) => setHeroSubtitulo(e.target.value)}
                rows={2}
                className="w-full bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                placeholder="Ej: Las mejores hamburguesas artesanales de la ciudad..."
              />
            </div>

            {/* Subida de Imagen o Enlace */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Imagen de Fondo
              </label>
              
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {/* Upload Button */}
                <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-xl p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-900/50 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Subir nueva foto</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">Formatos recomendados: JPG, PNG, WEBP</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-200 dark:border-neutral-800"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-gray-400">o pega un enlace</span>
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

            {/* Slider de Opacidad */}
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
              <p className="text-[11px] text-gray-500">
                Aumenta el oscurecimiento sobre la imagen para garantizar que el texto blanco siempre se lea con total claridad.
              </p>
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

        {/* PREVIEW EN VIVO */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> Vista Previa en Vivo
          </h3>

          <div className="sticky top-24 rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-neutral-800 bg-[#1A1A1E]">
            {/* Header del Catálogo Preview */}
            <div className="relative w-full h-[220px] bg-neutral-900 overflow-hidden flex flex-col items-center justify-center text-center p-4">
              {heroImagenUrl ? (
                <img
                  src={heroImagenUrl}
                  alt="Portada del Catálogo"
                  className="absolute inset-0 w-full h-full object-cover transition-all"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-neutral-600 animate-pulse" />
                </div>
              )}
              
              {/* Overlay negro dinámico */}
              <div
                className="absolute inset-0 bg-black transition-opacity duration-300"
                style={{ opacity: heroOpacidad / 100 }}
              />

              {/* Textos del Hero */}
              <div className="relative z-10 space-y-2">
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight leading-tight drop-shadow-md">
                  {heroTitulo || negocio?.nombre || "Bendita Burger"}
                </h2>
                {heroSubtitulo ? (
                  <p className="text-white/90 text-[11px] md:text-xs font-medium max-w-xs mx-auto drop-shadow-sm leading-relaxed">
                    {heroSubtitulo}
                  </p>
                ) : (
                  <p className="text-white/60 text-[11px] italic">
                    Sin subtítulo / eslogan
                  </p>
                )}

                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-green-500/50 bg-green-500/20 text-[9px] font-black uppercase tracking-wider text-green-400">
                  <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span> Abierto ahora
                </div>
              </div>
            </div>
            
            {/* Simulación del resto del sitio */}
            <div className="p-4 bg-white dark:bg-[#0F0F11] space-y-3">
              <div className="flex gap-2">
                <div className="h-6 w-12 bg-red-100 dark:bg-red-950/40 rounded-full border border-red-500/20"></div>
                <div className="h-6 w-16 bg-neutral-100 dark:bg-neutral-800 rounded-full"></div>
                <div className="h-6 w-16 bg-neutral-100 dark:bg-neutral-800 rounded-full"></div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="border border-neutral-100 dark:border-neutral-800 rounded-xl p-2 space-y-1.5">
                  <div className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg"></div>
                  <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                  <div className="h-3 w-1/2 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                </div>
                <div className="border border-neutral-100 dark:border-neutral-800 rounded-xl p-2 space-y-1.5">
                  <div className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg"></div>
                  <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                  <div className="h-3 w-1/2 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL RECORTE DE IMAGEN */}
      {isCropping && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 animate-fade-in">
          <div className="flex items-center justify-between px-6 py-4 bg-[#0a0a0a] border-b border-neutral-800 text-white">
            <div>
              <h3 className="font-bold text-lg">Recortar Portada</h3>
              <p className="text-xs text-neutral-400">Ajusta el encuadre para la cabecera de la tienda online.</p>
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
              aspect={16 / 9}
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
                className="flex-1 accent-red-600"
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
