"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

const NEGOCIO_ID = 'dc02bdbb-e8c8-4caa-bc5a-aa373f16cb1f';
const CATEGORIA_ID = '531a222f-2d60-49d7-b4c5-906520e25e76'; // Hamburguesas

const adicionales = [
  { id: 'ext-cheddar', nombre: 'Extra Cheddar', precio: 1200 },
  { id: 'ext-panceta', nombre: 'Extra Panceta', precio: 1400 },
  { id: 'ext-medallon', nombre: 'Extra Medallón de Asado 120g', precio: 2200 },
  { id: 'ext-huevo', nombre: 'Huevo frito', precio: 900 },
  { id: 'ext-cebolla', nombre: 'Cebolla en plancha', precio: 800 }
];

const burgers = [
  {
    nombre: 'CHEESE',
    descripcion: 'Pan brioche, nuestra mayo, medallón de asado 120 gr, doble cheddar.',
    precio: 7200,
    ingredientes_removibles: ['Mayo', 'Medallón de asado', 'Doble cheddar']
  },
  {
    nombre: 'CHEESE BACON',
    descripcion: 'Pan brioche, nuestra mayo, medallón de asado 120 gr, doble cheddar, panceta crocante.',
    precio: 8400,
    ingredientes_removibles: ['Mayo', 'Medallón de asado', 'Doble cheddar', 'Panceta crocante']
  },
  {
    nombre: 'CEBOLLA',
    descripcion: 'Pan brioche, nuestra mayo, medallón de asado 120 gr, cebolla morada cocida en plancha, panceta crocante, doble cheddar.',
    precio: 8900,
    ingredientes_removibles: ['Mayo', 'Medallón de asado', 'Cebolla morada', 'Panceta crocante', 'Doble cheddar']
  },
  {
    nombre: 'HISTORICA',
    descripcion: 'Pan brioche, nuestra mayo, medallón de asado 120 gr, lechuga, tomate, jamón, queso cremoso.',
    precio: 8200,
    ingredientes_removibles: ['Mayo', 'Medallón de asado', 'Lechuga', 'Tomate', 'Jamón', 'Queso cremoso']
  },
  {
    nombre: 'PROVO',
    descripcion: 'Pan brioche, nuestra mayo, medallón de asado 120 gr, provoleta, salsa criolla.',
    precio: 9200,
    ingredientes_removibles: ['Mayo', 'Medallón de asado', 'Provoleta', 'Salsa criolla']
  },
  {
    nombre: 'SANTA',
    descripcion: 'Pan brioche, salsa bendita, panceta crocante, cebolla, lechuga, tomate, medallón de asado 120 gr, doble cheddar.',
    precio: 9800,
    ingredientes_removibles: ['Salsa bendita', 'Panceta crocante', 'Cebolla', 'Lechuga', 'Tomate', 'Medallón de asado', 'Doble cheddar']
  },
  {
    nombre: 'RUCU',
    descripcion: 'Pan brioche, nuestra mayo, medallón de asado 120 gr, salsa roquefort, rúcula, tomate.',
    precio: 8900,
    ingredientes_removibles: ['Mayo', 'Medallón de asado', 'Salsa roquefort', 'Rúcula', 'Tomate']
  }
];

export default function SeedDbPage() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("checking_auth"); // checking_auth | unauthorized | ready | loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setStatus("ready");
      } else {
        setStatus("unauthorized");
      }
    }
    checkAuth();
  }, []);

  const handleSeed = async () => {
    setStatus("loading");
    setMessage("Borrando productos antiguos...");
    try {
      // 1. Borrar productos del negocio
      const { error: deleteError } = await supabase
        .from("productos")
        .delete()
        .eq("negocio_id", NEGOCIO_ID);

      if (deleteError) throw deleteError;

      // 2. Insertar hamburguesas
      setMessage("Insertando las nuevas 7 hamburguesas con extras e ingredientes...");
      const productsToInsert = burgers.map(b => ({
        negocio_id: NEGOCIO_ID,
        categoria_id: CATEGORIA_ID,
        nombre: b.nombre,
        descripcion: b.descripcion,
        precio: b.precio,
        tipo_producto: 'normal',
        variantes: [],
        adicionales: adicionales,
        ingredientes_removibles: b.ingredientes_removibles,
        imagen_url: null
      }));

      const { error: insertError } = await supabase
        .from("productos")
        .insert(productsToInsert);

      if (insertError) throw insertError;

      setStatus("success");
      setMessage("¡El menú ha sido actualizado exitosamente con precios reales en pesos argentinos!");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Ocurrió un error inesperado al actualizar la base de datos.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
        <h1 className="text-2xl font-black uppercase tracking-tight text-yellow-500">Actualizar Menú</h1>
        
        {status === "checking_auth" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            <p className="text-sm text-gray-400">Verificando sesión de administrador...</p>
          </div>
        )}

        {status === "unauthorized" && (
          <div className="space-y-4 py-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-red-400">No has iniciado sesión</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Debes iniciar sesión en tu panel de administración antes de poder actualizar la base de datos.
            </p>
            <a 
              href="/login" 
              className="inline-block w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all"
            >
              Ir a Iniciar Sesión
            </a>
          </div>
        )}

        {status === "ready" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-300">
              Sesión activa como: <strong className="text-white">{user.email}</strong>
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Esta acción borrará los productos actuales en la categoría "Hamburguesas" y cargará las 7 variedades de hamburguesas con sus respectivos precios reales de Argentina, ingredientes que se pueden quitar y opcionales/extras con precio.
            </p>
            <button
              onClick={handleSeed}
              className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all"
            >
              Cargar Menú con Precios Reales
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            <p className="text-sm text-gray-300 font-bold animate-pulse">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 py-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto animate-bounce-in" />
            <h2 className="text-lg font-bold text-green-400">¡Menú Actualizado!</h2>
            <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
            <a 
              href="/" 
              className="inline-block w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all text-sm"
            >
              Ver Tienda
            </a>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 py-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-red-400">Error de actualización</h2>
            <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
            <button
              onClick={() => setStatus("ready")}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all text-sm"
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
