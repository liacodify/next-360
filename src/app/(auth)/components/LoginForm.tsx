"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import type { Route } from "next";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { classNames } from "primereact/utils";
import { useFormik } from "formik";
import { z, ZodSchema, ZodIssue } from "zod";
import { Login } from "../validations"; // Tu esquema Zod
import { signIn } from "next-auth/react";

// Adaptador para usar Zod en Formik (corrige uso de error.issues)
const validateWithZod = (schema: ZodSchema<any>) => (values: any) => {
  const result = schema.safeParse(values);

  if (result.success) return {};

  if (!result.error || !result.error.issues) {
    console.error("Zod validation error missing", result);
    return { _error: "Error de validación inesperado" };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((e: ZodIssue) => {
    if (e.path.length > 0) {
      const key = e.path[0].toString();
      if (!errors[key]) {
        errors[key] = e.message;
      }
    }
  });

  return errors;
};

export const LoginForm = () => {
  const router = useRouter();
  const next = useSearchParams()?.get("next");

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validate: validateWithZod(Login),
    onSubmit: async (values, { setErrors, setSubmitting }) => {
      setSubmitting(true);
      const res = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
      });

      if (res?.error) {
        setErrors({ email: "Credenciales inválidas" });
        setSubmitting(false);
        return;
      }

      // Login exitoso, redirige
      router.refresh();
      router.push((next as Route) || "/");
    },
  });

  return (
    <div className="w-full h-full flex flex-col justify-center gap-5 px-4 max-w-md mx-auto">
      <div>
        <h2 className="text-3xl font-semibold text-center text-indigo-700 mb-6">
          Visor360
        </h2>
        <p className="text-center text-gray-500 mb-8">
          Inicie sesión para continuar con su cuenta
        </p>
      </div>

      <form
        onSubmit={formik.handleSubmit}
        className="w-full flex flex-col gap-5"
      >
        <div>
          <label
            htmlFor="email"
            className="block text-gray-700 font-medium mb-2"
          >
            Correo Electrónico
          </label>
          <InputText
            id="email"
            name="email"
            type="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={classNames(
              "w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400",
              { "p-invalid": formik.touched.email && formik.errors.email },
            )}
            placeholder="you@example.com"
          />
          {formik.touched.email && formik.errors.email && (
            <small className="text-red-500 text-sm mt-1 block">
              {formik.errors.email}
            </small>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-gray-700 font-medium mb-2"
          >
            Contraseña
          </label>
          <Password
            id="password"
            name="password"
            feedback={false}
            toggleMask
            className="w-full !block"
            inputClassName="w-full !w-full"
            inputStyle={{ width: "100%" }}
            value={formik.values.password}
            onChange={(e) => formik.setFieldValue("password", e.target.value)}
            onBlur={() => formik.setFieldTouched("password", true)}
            placeholder="••••••••"
          />
          {formik.touched.password && formik.errors.password && (
            <small className="text-red-500 text-sm mt-1 block">
              {formik.errors.password}
            </small>
          )}
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-indigo-600 hover:underline font-medium"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button
          label="Iniciar sesión"
          type="submit"
          className="w-full !bg-indigo-600 hover:!bg-indigo-700 !border-none !rounded-lg !shadow-md !text-white !font-medium !py-2 !transition"
          loading={formik.isSubmitting}
        />
      </form>
    </div>
  );
};
