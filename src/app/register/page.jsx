"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const handleRegister = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: "", texto: "" });

    if (password !== confirmPassword) {
      setMensaje({ tipo: "error", texto: "Las contraseñas no coinciden." });
      return;
    }

    if (password.length < 6) {
      setMensaje({ tipo: "error", texto: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }

    setCargando(true);

    try {
      // 1. Registrar usuario en Supabase Auth con rol admin
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "admin"
          }
        }
      });

      if (error) throw error;

      if (data?.user) {
        // 2. Intentar registrar en la tabla admins (por si existe y layout lo requiere)
        try {
          await supabase.from("admins").insert([{ email }]);
        } catch (dbErr) {
          console.warn("No se pudo insertar en la tabla de admins, probablemente RLS o estructura diferente. Se usará rol de metadata:", dbErr);
        }

        // 3. Crear negocio inicial por defecto para este admin si no existe
        try {
          const { data: negocioExistente } = await supabase
            .from("negocios")
            .select("id")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (!negocioExistente) {
            await supabase.from("negocios").insert([{
              user_id: data.user.id,
              nombre: "Bendita Burger",
              slug: "benditaburger-" + Math.floor(1000 + Math.random() * 9000),
              plan: "pro",
              estado_pago: "activo",
              whatsapp: "5491133334444",
              color_principal: "#EAB308",
              tema_tienda: "dark"
            }]);
          }
        } catch (negocioErr) {
          console.warn("No se pudo pre-crear el negocio por defecto:", negocioErr);
        }

        setMensaje({
          tipo: "exito",
          texto: "¡Registro exitoso! Ya puedes iniciar sesión."
        });

        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (error) {
      console.error(error);
      setMensaje({ tipo: "error", texto: error.message || "Error al registrarse." });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img
          src="/logo.webp"
          alt="Bendita Burger Logo"
          className="mx-auto h-16 w-auto object-contain dark:invert-0"
        />
        <h2 className="mt-6 text-3xl font-black tracking-tight text-white uppercase">
          Crear Cuenta Admin
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Registra un nuevo administrador para gestionar el catálogo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-neutral-900 py-8 px-4 border border-neutral-800 shadow sm:rounded-2xl sm:px-10">
          {mensaje.texto && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${mensaje.tipo === "exito" ? "bg-green-950 text-green-400 border border-green-900" : "bg-red-950 text-red-400 border border-red-900"}`}>
              {mensaje.tipo === "exito" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {mensaje.texto}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleRegister}>
            <div>
              <label htmlFor="email" className="block text-xs font-black uppercase tracking-wider text-gray-400">
                Correo Electrónico
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                  placeholder="admin@benditaburger.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-black uppercase tracking-wider text-gray-400">
                Contraseña
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-black uppercase tracking-wider text-gray-400">
                Confirmar Contraseña
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={cargando}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-black uppercase tracking-wider text-black bg-yellow-500 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? "Registrando..." : "Crear Cuenta Admin"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="font-bold text-yellow-500 hover:text-yellow-400 transition-colors">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
