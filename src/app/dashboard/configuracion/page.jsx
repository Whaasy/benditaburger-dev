"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, AlertCircle } from "lucide-react";

export default function ConfiguracionesPage() {
  const router = useRouter();
  const [negocio, setNegocio] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [whatsapp, setWhatsapp] = useState("");

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
          setWhatsapp(data.whatsapp || "");
        }
      } catch (error) {
        console.error("Error cargando negocio:", error);
      } finally {
        setCargando(false);
      }
    }

    cargarDatos();
  }, [router]);

  const handleGuardarCambios = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje({ tipo: "", texto: "" });

    try {
      const { error } = await supabase
        .from("negocios")
        .update({ whatsapp })
        .eq("id", negocio.id);

      if (error) throw error;

      setMensaje({ tipo: "exito", texto: "Número de WhatsApp guardado correctamente." });
      setNegocio({ ...negocio, whatsapp });

      // Dispatch event to update other client components if listening
      window.dispatchEvent(new CustomEvent("negocio-actualizado", {
        detail: { whatsapp }
      }));

      setTimeout(() => setMensaje({ tipo: "", texto: "" }), 5000);
    } catch (error) {
      console.error(error);
      setMensaje({ tipo: "error", texto: "Hubo un error al guardar el número." });
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
    <div className="max-w-2xl mx-auto space-y-8 pb-10 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Actualiza el número de contacto de tu negocio para recibir los pedidos.
        </p>
      </div>

      <form onSubmit={handleGuardarCambios} className="space-y-6">
        <section className="bg-white dark:bg-[#0F0F11] rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-neutral-800 px-6 py-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Número de WhatsApp
            </h2>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                WhatsApp de Pedidos
              </label>
              <input
                type="text"
                name="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                required
                className="w-full bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                placeholder="Ej: 5491133334444"
              />
              <p className="text-xs text-gray-500">
                Los clientes serán redirigidos a este número de WhatsApp con el detalle de su pedido. Incluye código de país y de área, sin símbolos '+' ni espacios (Ej: 5491133334444).
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
          {mensaje.texto && (
            <div className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md animate-in fade-in ${mensaje.tipo === "exito" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
              {mensaje.tipo === "exito" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {mensaje.texto}
            </div>
          )}
          <button
            type="submit"
            disabled={guardando}
            className="bg-gray-900 text-white dark:bg-white dark:text-black font-bold py-3 px-8 rounded-xl text-sm transition-all hover:bg-gray-800 dark:hover:bg-gray-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
          >
            {guardando ? (
              <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Check className="w-4 h-4" />
            )}
            {guardando ? "Guardando..." : "Guardar Número"}
          </button>
        </div>
      </form>
    </div>
  );
}