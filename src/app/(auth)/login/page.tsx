import { AuthForm } from "../auth-form";

export const metadata = { title: "Log in · Life Ledger" };

export default function Login() {
  return <AuthForm mode="login" />;
}
